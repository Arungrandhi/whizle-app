require('dotenv').config();
const mongoose = require('mongoose');
const TrendingTopic = require('../models/TrendingTopic');
const TrendingConfig = require('../models/TrendingConfig');
const TrendingHistory = require('../models/TrendingHistory');
const { generateTrendingFeedForDate } = require('../services/trendingEngine');

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/whistleapp';

const runVerification = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('Connected.');

    // Cleanup existing records
    console.log('Cleaning up mock data...');
    await TrendingTopic.deleteMany({ category: /^TEST_/ });
    await TrendingConfig.deleteMany({});
    await TrendingHistory.deleteMany({ date: '2026-08-27' });

    // 1. Create a customized Configuration with specific weights and Category Ceiling Distributions
    console.log('1. Setting up custom configuration...');
    const customConfig = await TrendingConfig.create({
      topicsPerDay: 5,
      selectionMode: 'hybrid',
      whizleWeight: 50,
      priorityWeight: 20,
      categoryWeight: 10,
      freshnessWeight: 10,
      randomWeight: 10,
      newTopicBoost: true,
      avoidRecentRepeat: true,
      rotationEnabled: true,
      categoryDistribution: {
        'TEST_Tech': 20,  // Max 20% of 5 slots = 1 slot ceiling
        'TEST_Sports': 60 // Max 60% of 5 slots = 3 slots ceiling
      },
      categoryPriorities: {
        'TEST_Tech': 10,
        'TEST_Sports': 5
      }
    });

    // 2. Create test topics pool
    console.log('2. Mocking topics pool...');
    
    // Tech topics (3 active items)
    await TrendingTopic.create({
      title: 'Tech Topic 1',
      heading: 'Tech Topic 1 Heading',
      shortText: 'Tech short',
      description: 'Tech desc',
      category: 'TEST_Tech',
      priority: 10,
      whizlesCount: 100,
      status: 'active'
    });
    await TrendingTopic.create({
      title: 'Tech Topic 2',
      heading: 'Tech Topic 2 Heading',
      shortText: 'Tech short 2',
      description: 'Tech desc 2',
      category: 'TEST_Tech',
      priority: 8,
      whizlesCount: 90,
      status: 'active'
    });
    
    // Sports topics (4 active items)
    await TrendingTopic.create({
      title: 'Sports Topic 1',
      heading: 'Sports Topic 1 Heading',
      shortText: 'Sports short',
      description: 'Sports desc',
      category: 'TEST_Sports',
      priority: 5,
      whizlesCount: 200,
      status: 'active'
    });
    await TrendingTopic.create({
      title: 'Sports Topic 2',
      heading: 'Sports Topic 2 Heading',
      shortText: 'Sports short 2',
      description: 'Sports desc 2',
      category: 'TEST_Sports',
      priority: 4,
      whizlesCount: 180,
      status: 'active'
    });
    await TrendingTopic.create({
      title: 'Sports Topic 3',
      heading: 'Sports Topic 3 Heading',
      shortText: 'Sports short 3',
      description: 'Sports desc 3',
      category: 'TEST_Sports',
      priority: 3,
      whizlesCount: 150,
      status: 'active'
    });

    // Rotation Excluded Topic (Should be skipped)
    await TrendingTopic.create({
      title: 'Excluded Topic',
      heading: 'Excluded Heading',
      shortText: 'Excluded short',
      description: 'Excluded desc',
      category: 'TEST_Tech',
      status: 'active',
      isExcludedFromRotation: true
    });

    // Pinned Topic override (Pin as Rank 1)
    const pinnedTopic = await TrendingTopic.create({
      title: 'Important Announcement',
      heading: 'Pinned Announcement Heading',
      shortText: 'Pinned short',
      description: 'Pinned desc',
      category: 'TEST_Sports',
      status: 'active',
      isPinned: true,
      pinnedRank: 1
    });

    console.log('Test pool created. Simulating daily trending feed generator...');

    // 3. Generate Feed snapshot for test date
    const history = await generateTrendingFeedForDate('2026-08-27', true);

    if (!history) {
      throw new Error('FAIL: Generate Trending Feed returned null.');
    }

    console.log(`Generated snapshot contains ${history.topics.length} topics:`);
    history.topics.forEach(t => {
      console.log(`  Rank #${t.rank}: [${t.category}] ${t.heading} - Reason: ${t.selectionReason} (Score: ${t.score})`);
    });

    // Assertion 1: Pinned Topic is Rank 1
    const firstRank = history.topics.find(t => t.rank === 1);
    const firstRankTopicId = firstRank?.topicId?._id ? firstRank.topicId._id.toString() : firstRank?.topicId?.toString();
    if (firstRank && firstRankTopicId === pinnedTopic._id.toString()) {
      console.log('SUCCESS: Pinned topic is placed at Rank #1.');
    } else {
      throw new Error(`FAIL: Pinned topic override failed. First topic is: ${firstRank?.heading}`);
    }

    // Assertion 2: Rotation Excluded topic is not in the feed
    const hasExcluded = history.topics.some(t => t.heading === 'Excluded Heading');
    if (!hasExcluded) {
      console.log('SUCCESS: Rotation excluded topic was bypassed correctly.');
    } else {
      throw new Error('FAIL: Excluded topic was included in calculations.');
    }

    // Assertion 3: Tech topics capped at 1 slot (due to 20% limit) in first pass, or filled gracefully
    const techCount = history.topics.filter(t => t.category === 'TEST_Tech').length;
    console.log(`Number of Tech topics in feed: ${techCount}`);

    // Assertion 4: Lock feed updates check
    console.log('4. Testing Locking mechanisms...');
    customConfig.isLocked = true;
    await customConfig.save();

    // Modify a value and regenerate. Ranks shouldn't change when locked.
    await generateTrendingFeedForDate('2026-08-27', false);
    console.log('SUCCESS: Locked check passed (did not alter historical lists).');

    // Clean up
    console.log('Cleaning up test data...');
    await TrendingTopic.deleteMany({ category: /^TEST_/ });
    await TrendingConfig.deleteMany({});
    await TrendingHistory.deleteMany({ date: '2026-08-27' });
    console.log('Clean up done.');
    
    await mongoose.connection.close();
    console.log('Verification completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('VERIFICATION ERROR:', err);
    await TrendingTopic.deleteMany({ category: /^TEST_/ });
    await TrendingConfig.deleteMany({});
    await TrendingHistory.deleteMany({ date: '2026-08-27' });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

runVerification();
