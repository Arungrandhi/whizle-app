const TrendingTopic = require('../models/TrendingTopic');
const TrendingConfig = require('../models/TrendingConfig');
const TrendingHistory = require('../models/TrendingHistory');

// Retrieve or create global trending configurations
const getOrCreateConfig = async () => {
  let config = await TrendingConfig.findOne();
  if (!config) {
    config = await TrendingConfig.create({
      enabled: true,
      topicsPerDay: 50,
      selectionMode: 'hybrid',
      whizleWeight: 40,
      priorityWeight: 20,
      categoryWeight: 15,
      freshnessWeight: 15,
      randomWeight: 10,
      newTopicBoost: true,
      avoidRecentRepeat: true,
      rotationEnabled: true,
      categoryDistribution: {},
      categoryPriorities: {}
    });
  }
  return config;
};

// Generates or retrieves the trending feed snapshot for a specific date (YYYY-MM-DD)
const generateTrendingFeedForDate = async (dateStr, forceRegenerate = false, io = null) => {
  try {
    const config = await getOrCreateConfig();
    const existingHistory = await TrendingHistory.findOne({ date: dateStr });

    // If locked and not forced, return cached snapshot
    if (existingHistory && config.isLocked && !forceRegenerate) {
      console.log(`Trending feed for ${dateStr} is LOCKED. Returning cached results.`);
      return existingHistory;
    }

    // If not locked but we already have it and aren't forcing, return it
    if (existingHistory && !forceRegenerate) {
      return existingHistory;
    }

    const now = new Date();

    // 1. Self-healing: Update schedules status based on time boundaries
    // End date has passed
    await TrendingTopic.updateMany(
      { endAt: { $ne: null, $lt: now }, status: { $in: ['active', 'scheduled'] } },
      { status: 'expired' }
    );
    // Start date has arrived
    await TrendingTopic.updateMany(
      { 
        startAt: { $ne: null, $lte: now }, 
        status: 'scheduled',
        $or: [
          { endAt: null },
          { endAt: { $gte: now } }
        ]
      },
      { status: 'active' }
    );

    // 2. Fetch eligible topics (status active, not excluded from rotation)
    // Pinned topics ignore rotation exclusion checks for editorial override
    const eligibleTopics = await TrendingTopic.find({
      status: 'active',
      $or: [{ isPinned: true }, { isExcludedFromRotation: { $ne: true } }]
    });

    if (eligibleTopics.length === 0) {
      console.warn('No active trending topics found in database.');
      return null;
    }

    const scoredTopics = [];
    const pinnedTopics = [];

    // 3. Compute score and selection reason for each topic
    for (let topic of eligibleTopics) {
      if (topic.isPinned || (topic.pinnedRank !== null && topic.pinnedRank > 0)) {
        pinnedTopics.push({
          topic,
          pinnedRank: topic.pinnedRank || topic.manualPosition || 1,
          selectionReason: 'Admin Pinned'
        });
      } else {
        let score = 0;
        let reason = 'Hybrid Score';

        const velocity = topic.whizleHistory ? topic.whizleHistory.filter(d => new Date(d) >= new Date(now.getTime() - 24*60*60*1000)).length : 0;
        const catPri = config.categoryPriorities.get(topic.category) || topic.categoryPriority || 1;
        
        const baseDate = topic.startAt || topic.createdAt || now;
        const ageHours = Math.max(0, (now.getTime() - new Date(baseDate).getTime()) / (1000 * 60 * 60));
        const freshness = 100 / (ageHours + 1);

        switch (config.selectionMode) {
          case 'auto':
            score = (topic.whizlesCount || 0) + ((topic.priority || 0) * 100);
            reason = 'Auto Ranking';
            break;
          case 'whizle':
            score = topic.whizlesCount || 0;
            reason = 'High Whizles';
            break;
          case 'priority':
            score = (topic.priority || 0) + (catPri * 10);
            reason = 'High Topic Priority';
            break;
          case 'new_topics':
            score = freshness;
            reason = 'New Topic';
            break;
          case 'random':
            score = Math.random() * 100;
            reason = 'Random Selection';
            break;
          case 'category_weighted':
            score = catPri;
            reason = 'High Category Priority';
            break;
          case 'hybrid':
          default:
            const wScore = (topic.whizlesCount || 0) * (config.whizleWeight / 100) * 5;
            const vScore = velocity * 10;
            const pScore = (topic.priority || 0) * (config.priorityWeight / 100) * 10;
            const cScore = catPri * (config.categoryWeight / 100) * 50;
            const fScore = freshness * (config.freshnessWeight / 100) * 2;
            const rScore = Math.random() * 100 * (config.randomWeight / 100);

            score = wScore + vScore + pScore + cScore + fScore + rScore;

            // Apply new topic boost
            if (config.newTopicBoost && ageHours <= 24) {
              score *= 1.2;
              reason = 'New Topic Boost';
            }
            // Apply repeat penalty
            if (config.avoidRecentRepeat && topic.lastShownAt) {
              const daysSinceShown = (now.getTime() - new Date(topic.lastShownAt).getTime()) / (1000 * 60 * 60 * 24);
              if (daysSinceShown <= 3) {
                score *= 0.5;
              }
            }
            break;
        }

        topic.score = Math.round(score * 100) / 100;
        scoredTopics.push({ topic, score: topic.score, selectionReason: reason });
      }
    }

    // 4. Sort unpinned topics descending by score
    scoredTopics.sort((a, b) => b.score - a.score);

    // 5. Apply Category Distribution Cap if configured
    const finalSelection = [];
    const categoryCount = {};
    const capPerDay = config.topicsPerDay || 50;

    // Convert category distribution percentage config into absolute caps
    const categoryCaps = {};
    if (config.categoryDistribution) {
      config.categoryDistribution.forEach((percent, cat) => {
        categoryCaps[cat] = Math.ceil(capPerDay * (percent / 100));
      });
    }

    // First pass: Fill slot capacity respecting caps
    for (let item of scoredTopics) {
      const cat = item.topic.category;
      const catCap = categoryCaps[cat];
      const currentCount = categoryCount[cat] || 0;

      if (catCap === undefined || currentCount < catCap) {
        finalSelection.push(item);
        categoryCount[cat] = currentCount + 1;
      }
      if (finalSelection.length >= capPerDay) break;
    }

    // Second pass: If slots are remaining (due to strict caps), fill them with skipped topics in score order
    if (finalSelection.length < capPerDay && finalSelection.length < scoredTopics.length) {
      for (let item of scoredTopics) {
        if (!finalSelection.some(x => x.topic._id.toString() === item.topic._id.toString())) {
          finalSelection.push(item);
        }
        if (finalSelection.length >= capPerDay) break;
      }
    }

    // 6. Merge Pinned topics at their exact positions
    // Sort pinned topics ascending by requested rank
    pinnedTopics.sort((a, b) => a.pinnedRank - b.pinnedRank);

    const mergedList = [];
    let unpinnedIdx = 0;

    for (let r = 1; r <= capPerDay; r++) {
      const pin = pinnedTopics.find(p => p.pinnedRank === r);
      if (pin) {
        mergedList.push(pin);
      } else {
        if (unpinnedIdx < finalSelection.length) {
          mergedList.push(finalSelection[unpinnedIdx]);
          unpinnedIdx++;
        }
      }
    }

    // Append pinned topics that requested rank out of bounds
    pinnedTopics.forEach(pin => {
      if (!mergedList.some(x => x.topic._id.toString() === pin.topic._id.toString())) {
        mergedList.push(pin);
      }
    });

    // Trim list to configured daily limit
    const dailyFeed = mergedList.slice(0, capPerDay);

    // 7. Write results: Update last shown date and rank for selected topics
    const historyTopics = [];
    for (let i = 0; i < dailyFeed.length; i++) {
      const item = dailyFeed[i];
      const topicObj = item.topic;
      
      topicObj.rank = i + 1;
      topicObj.lastRank = i + 1;
      topicObj.lastShownAt = now;
      await topicObj.save();

      historyTopics.push({
        topicId: topicObj._id,
        rank: i + 1,
        score: topicObj.score || 0,
        selectionReason: item.selectionReason,
        whizlesCount: topicObj.whizlesCount || 0,
        category: topicObj.category,
        heading: topicObj.heading
      });
    }

    // Update rank of non-selected active topics to 999999
    const activeIds = dailyFeed.map(item => item.topic._id);
    await TrendingTopic.updateMany(
      { _id: { $nin: activeIds } },
      { rank: 999999 }
    );

    // 8. Save snapshot in TrendingHistory
    if (existingHistory) {
      existingHistory.topics = historyTopics;
      existingHistory.selectionMode = config.selectionMode;
      existingHistory.generatedAt = now;
      await existingHistory.save();
    } else {
      await TrendingHistory.create({
        date: dateStr,
        topics: historyTopics,
        selectionMode: config.selectionMode,
        generatedAt: now
      });
    }

    config.generatedAt = now;
    await config.save();

    console.log(`Generated trending history snapshot for ${dateStr}. Daily count: ${dailyFeed.length}`);

    if (io) {
      io.emit('trendingRegenerated', { date: dateStr });
    }

    return await TrendingHistory.findOne({ date: dateStr }).populate('topics.topicId');
  } catch (err) {
    console.error('Error generating trending feed snapshot:', err);
    return null;
  }
};

module.exports = {
  getOrCreateConfig,
  generateTrendingFeedForDate
};
