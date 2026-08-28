const TrendingTopic = require('../models/TrendingTopic');
const TrendingConfig = require('../models/TrendingConfig');
const TrendingHistory = require('../models/TrendingHistory');
const { uploadToCloudinary } = require('../config/cloudinary');
const { getOrCreateConfig, generateTrendingFeedForDate } = require('../services/trendingEngine');

// Safe integer parsing helper functions to prevent NaN values throwing ValidationError in Mongoose
const parseSafeInt = (val, defaultVal = 0) => {
  if (val === undefined || val === null || val === '') return defaultVal;
  const parsed = parseInt(val);
  return isNaN(parsed) ? defaultVal : parsed;
};

const parseSafeNullableInt = (val) => {
  if (val === undefined || val === null || val === '') return null;
  const parsed = parseInt(val);
  return isNaN(parsed) ? null : parsed;
};

// Helper to get today's date string in YYYY-MM-DD format
const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 1. Get Trending Topics (Admin View with extensive filters, search, and sorting)
const getTrendingTopicsAdmin = async (req, res) => {
  try {
    const { search, category, status, priority, rankingType, date, sort, page = 1, limit = 10 } = req.query;

    const query = {};

    // Search Category, Heading, Title
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { heading: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    // Filters
    if (category && category !== 'all') {
      query.category = category;
    }
    if (status && status !== 'all') {
      query.status = status;
    }
    if (rankingType && rankingType !== 'all') {
      query.rankingType = rankingType;
    }
    if (priority && priority !== 'all') {
      query.priority = parseSafeInt(priority, 0);
    }
    if (date) {
      const selectedDate = new Date(date);
      const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));
      query.$or = [
        { startAt: { $gte: startOfDay, $lte: endOfDay } },
        { endAt: { $gte: startOfDay, $lte: endOfDay } }
      ];
    }

    // Sort mappings
    let sortOption = { rank: 1 };
    if (sort) {
      if (sort === 'whizles') sortOption = { whizlesCount: -1 };
      else if (sort === 'priority') sortOption = { priority: -1 };
      else if (sort === 'newest') sortOption = { createdAt: -1 };
      else if (sort === 'rank') sortOption = { rank: 1 };
    }

    const skipIndex = (page - 1) * limit;

    const topics = await TrendingTopic.find(query)
      .sort(sortOption)
      .skip(skipIndex)
      .limit(parseInt(limit));

    const total = await TrendingTopic.countDocuments(query);

    res.json({
      success: true,
      topics,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error retrieving admin topics list' });
  }
};

// 2. Create Trending Topic
const createTrendingTopic = async (req, res) => {
  try {
    const {
      title,
      heading,
      shortText,
      description,
      category,
      image,
      priority,
      status,
      startAt,
      endAt,
      isPinned,
      manualPosition,
      rankingType,
      isExcludedFromRotation
    } = req.body;

    if (!title || !heading || !shortText || !description || !category) {
      return res.status(400).json({ success: false, message: 'Please enter all required fields' });
    }

    let imageUrl = '';
    if (image && image.startsWith('data:image/')) {
      imageUrl = await uploadToCloudinary(image, 'trending');
    } else if (image) {
      imageUrl = image;
    }

    // Default category priority check
    const existing = await TrendingTopic.findOne({ category: new RegExp('^' + category.trim() + '$', 'i') });
    const defaultCatPriority = existing ? existing.categoryPriority : 1;

    const newTopic = new TrendingTopic({
      title,
      heading,
      shortText,
      description,
      category,
      image: imageUrl,
      priority: parseSafeInt(priority, 0),
      categoryPriority: defaultCatPriority,
      status: status || 'active',
      startAt: startAt || null,
      endAt: endAt || null,
      isPinned: isPinned || false,
      manualPosition: parseSafeNullableInt(manualPosition),
      rankingType: rankingType || 'auto',
      isExcludedFromRotation: isExcludedFromRotation || false,
      whizleHistory: []
    });

    await newTopic.save();

    // Regenerate trending ranks automatically
    const todayStr = getTodayDateString();
    await generateTrendingFeedForDate(todayStr, true);

    const io = req.app.get('io');
    if (io) io.emit('trendingUpdated');

    res.status(201).json({ success: true, topic: newTopic });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error creating trending topic' });
  }
};

// 3. Update Trending Topic
const updateTrendingTopic = async (req, res) => {
  try {
    const {
      title,
      heading,
      shortText,
      description,
      category,
      image,
      priority,
      categoryPriority,
      status,
      startAt,
      endAt,
      isPinned,
      manualPosition,
      rankingType,
      isExcludedFromRotation
    } = req.body;

    let topic = await TrendingTopic.findById(req.params.id);
    if (!topic) {
      return res.status(404).json({ success: false, message: 'Trending topic not found' });
    }

    if (title) topic.title = title;
    if (heading) topic.heading = heading;
    if (shortText) topic.shortText = shortText;
    if (description) topic.description = description;
    
    if (category && category !== topic.category) {
      topic.category = category;
      const existing = await TrendingTopic.findOne({ category: new RegExp('^' + category.trim() + '$', 'i'), _id: { $ne: topic._id } });
      if (existing) {
        topic.categoryPriority = existing.categoryPriority;
      }
    }

    if (priority !== undefined) topic.priority = parseSafeInt(priority, 0);
    if (status) topic.status = status;
    if (startAt !== undefined) topic.startAt = startAt || null;
    if (endAt !== undefined) topic.endAt = endAt || null;
    if (isPinned !== undefined) topic.isPinned = isPinned;
    if (manualPosition !== undefined) topic.manualPosition = parseSafeNullableInt(manualPosition);
    if (rankingType) topic.rankingType = rankingType;
    if (isExcludedFromRotation !== undefined) topic.isExcludedFromRotation = isExcludedFromRotation;

    if (categoryPriority !== undefined) {
      const parsedCatPri = parseSafeInt(categoryPriority, 1);
      await TrendingTopic.updateMany(
        { category: new RegExp('^' + topic.category.trim() + '$', 'i') },
        { categoryPriority: parsedCatPri }
      );
      topic.categoryPriority = parsedCatPri;
    }

    if (image && image.startsWith('data:image/')) {
      topic.image = await uploadToCloudinary(image, 'trending');
    } else if (image !== undefined) {
      topic.image = image;
    }

    await topic.save();

    // Regenerate trending ranks
    const todayStr = getTodayDateString();
    await generateTrendingFeedForDate(todayStr, true);

    const io = req.app.get('io');
    if (io) io.emit('trendingUpdated');

    res.json({ success: true, topic });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error updating trending topic' });
  }
};

// 4. Duplicate Trending Topic
const duplicateTrendingTopic = async (req, res) => {
  try {
    const topic = await TrendingTopic.findById(req.params.id);
    if (!topic) {
      return res.status(404).json({ success: false, message: 'Source topic not found' });
    }

    const duplicatedTopic = new TrendingTopic({
      title: `Copy of ${topic.title}`,
      heading: topic.heading,
      shortText: topic.shortText,
      description: topic.description,
      category: topic.category,
      image: topic.image,
      priority: topic.priority,
      categoryPriority: topic.categoryPriority,
      status: 'draft', // default to draft for duplication review
      startAt: topic.startAt,
      endAt: topic.endAt,
      isPinned: false,
      manualPosition: null,
      rankingType: topic.rankingType,
      isExcludedFromRotation: topic.isExcludedFromRotation
    });

    await duplicatedTopic.save();

    res.status(201).json({ success: true, topic: duplicatedTopic });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error duplicating topic' });
  }
};

// 5. Delete Trending Topic
const deleteTrendingTopic = async (req, res) => {
  try {
    const topic = await TrendingTopic.findById(req.params.id);
    if (!topic) {
      return res.status(404).json({ success: false, message: 'Trending topic not found' });
    }

    await TrendingTopic.findByIdAndDelete(req.params.id);

    // Regenerate daily feed rankings
    const todayStr = getTodayDateString();
    await generateTrendingFeedForDate(todayStr, true);

    const io = req.app.get('io');
    if (io) io.emit('trendingUpdated');

    res.json({ success: true, message: 'Trending topic deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error deleting trending topic' });
  }
};

// 6. Bulk Update Operations
const bulkUpdateTopics = async (req, res) => {
  try {
    const { ids, action, value } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select topics for bulk updates' });
    }

    if (action === 'delete') {
      await TrendingTopic.deleteMany({ _id: { $in: ids } });
    } else {
      const updates = {};
      if (action === 'status') updates.status = value;
      else if (action === 'category') updates.category = value;
      else if (action === 'priority') updates.priority = parseSafeInt(value, 0);
      else if (action === 'isPinned') updates.isPinned = value === 'true' || value === true;
      else if (action === 'isExcluded') updates.isExcludedFromRotation = value === 'true' || value === true;

      await TrendingTopic.updateMany({ _id: { $in: ids } }, { $set: updates });
    }

    // Force regenerate ranks
    const todayStr = getTodayDateString();
    await generateTrendingFeedForDate(todayStr, true);

    const io = req.app.get('io');
    if (io) io.emit('trendingUpdated');

    res.json({ success: true, message: 'Bulk action applied successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error during bulk updates' });
  }
};

// 7. Get Trending Config
const getTrendingConfig = async (req, res) => {
  try {
    const config = await getOrCreateConfig();
    res.json({ success: true, config });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error retrieving configuration' });
  }
};

// 8. Update Trending Config (Weights & Category distribution parameters)
const updateTrendingConfig = async (req, res) => {
  try {
    const {
      enabled,
      topicsPerDay,
      selectionMode,
      whizleWeight,
      priorityWeight,
      categoryWeight,
      freshnessWeight,
      randomWeight,
      newTopicBoost,
      avoidRecentRepeat,
      categoryDistribution,
      categoryPriorities,
      rotationEnabled
    } = req.body;

    const config = await getOrCreateConfig();

    if (enabled !== undefined) config.enabled = enabled;
    if (topicsPerDay !== undefined) config.topicsPerDay = parseSafeInt(topicsPerDay, 50);
    if (selectionMode) config.selectionMode = selectionMode;
    
    if (whizleWeight !== undefined) config.whizleWeight = parseSafeInt(whizleWeight, 40);
    if (priorityWeight !== undefined) config.priorityWeight = parseSafeInt(priorityWeight, 20);
    if (categoryWeight !== undefined) config.categoryWeight = parseSafeInt(categoryWeight, 15);
    if (freshnessWeight !== undefined) config.freshnessWeight = parseSafeInt(freshnessWeight, 15);
    if (randomWeight !== undefined) config.randomWeight = parseSafeInt(randomWeight, 10);

    if (newTopicBoost !== undefined) config.newTopicBoost = newTopicBoost;
    if (avoidRecentRepeat !== undefined) config.avoidRecentRepeat = avoidRecentRepeat;
    if (rotationEnabled !== undefined) config.rotationEnabled = rotationEnabled;

    if (categoryDistribution) config.categoryDistribution = categoryDistribution;
    if (categoryPriorities) config.categoryPriorities = categoryPriorities;

    await config.save();

    // Sync categories priority back to individual topics
    if (categoryPriorities) {
      for (let [cat, pri] of Object.entries(categoryPriorities)) {
        const parsedCatPri = parseSafeInt(pri, 1);
        await TrendingTopic.updateMany(
          { category: new RegExp('^' + cat.trim() + '$', 'i') },
          { $set: { categoryPriority: parsedCatPri } }
        );
      }
    }

    // Force regenerate ranking feed
    const todayStr = getTodayDateString();
    await generateTrendingFeedForDate(todayStr, true);

    const io = req.app.get('io');
    if (io) io.emit('trendingConfigUpdated');

    res.json({ success: true, config });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error saving configuration' });
  }
};

// 9. Manual Regenerate Today's Ranking
const regenerateTrendingFeedManual = async (req, res) => {
  try {
    const { date } = req.body;
    const dateStr = date || getTodayDateString();

    const history = await generateTrendingFeedForDate(dateStr, true, req.app.get('io'));

    res.json({ success: true, message: 'Trending feed regenerated successfully', history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error regenerating feed' });
  }
};

// 10. Lock/Unlock Today's Ranking
const lockTrendingFeed = async (req, res) => {
  try {
    const { isLocked } = req.body;
    const config = await getOrCreateConfig();

    config.isLocked = isLocked;
    config.lockedAt = isLocked ? new Date() : null;
    await config.save();

    res.json({ success: true, message: isLocked ? 'Trending rankings locked successfully' : 'Trending rankings unlocked' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error updating locks' });
  }
};

// 11. Get Daily History Outcomes
const getTrendingHistoryByDate = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date parameter is required' });
    }

    const history = await TrendingHistory.findOne({ date }).populate('topics.topicId');
    res.json({ success: true, history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error retrieving history feed' });
  }
};

// 12. Get Historical Summary logs
const getTrendingHistorySummary = async (req, res) => {
  try {
    const historyList = await TrendingHistory.find()
      .select('date selectionMode generatedAt topics')
      .sort({ date: -1 })
      .limit(30);

    res.json({ success: true, historyList });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error retrieving history summary list' });
  }
};

// 13. Get Trending Topics (Public Endpoint)
const getTrendingTopics = async (req, res) => {
  try {
    const todayStr = getTodayDateString();
    let history = await TrendingHistory.findOne({ date: todayStr }).populate('topics.topicId');

    // Auto-generate today's list if it does not exist yet
    if (!history) {
      history = await generateTrendingFeedForDate(todayStr, false);
    }

    if (!history || !history.topics || history.topics.length === 0) {
      return res.json({ success: true, currentlyTrending: null, topics: [] });
    }

    // Map populated topic documents preserving generated rank sequence
    const topics = history.topics
      .map(item => item.topicId)
      .filter(t => t !== null && t !== undefined);

    const currentlyTrending = topics.find(t => t.rank === 1) || topics[0] || null;

    res.json({
      success: true,
      currentlyTrending,
      topics
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error getting public trending feed' });
  }
};

// 14. Increment Likes / Whizles (Public User Interaction)
const incrementWhizle = async (req, res) => {
  try {
    const topic = await TrendingTopic.findById(req.params.id);
    if (!topic) {
      return res.status(404).json({ success: false, message: 'Trending topic not found' });
    }

    topic.whizlesCount += 1;
    if (!topic.whizleHistory) topic.whizleHistory = [];
    topic.whizleHistory.push(new Date());
    await topic.save();

    // Check if configuration is locked for today. If not, auto-recalculate lists
    const config = await getOrCreateConfig();
    if (!config.isLocked) {
      const todayStr = getTodayDateString();
      await generateTrendingFeedForDate(todayStr, true);
    }

    const io = req.app.get('io');
    if (io) io.emit('trendingWhizled', { topicId: topic._id, whizlesCount: topic.whizlesCount });

    res.json({ success: true, topicId: topic._id, whizlesCount: topic.whizlesCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error updating whizle count' });
  }
};

module.exports = {
  getTrendingTopicsAdmin,
  createTrendingTopic,
  updateTrendingTopic,
  deleteTrendingTopic,
  duplicateTrendingTopic,
  bulkUpdateTopics,
  getTrendingConfig,
  updateTrendingConfig,
  regenerateTrendingFeedManual,
  lockTrendingFeed,
  getTrendingHistoryByDate,
  getTrendingHistorySummary,
  getTrendingTopics,
  incrementWhizle
};
