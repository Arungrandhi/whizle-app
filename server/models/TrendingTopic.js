const mongoose = require('mongoose');

const TrendingTopicSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    heading: {
      type: String,
      required: true,
      trim: true
    },
    shortText: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    image: {
      type: String, // Cloudinary secure URL
      default: ''
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'active', 'paused', 'expired', 'inactive'],
      default: 'active'
    },
    priority: {
      type: Number,
      default: 0
    },
    categoryPriority: {
      type: Number,
      default: 1
    },
    isPinned: {
      type: Boolean,
      default: false
    },
    manualPosition: {
      type: Number,
      default: null
    },
    rankingType: {
      type: String,
      enum: ['auto', 'manual', 'random'],
      default: 'auto'
    },
    isExcludedFromRotation: {
      type: Boolean,
      default: false
    },
    whizlesCount: {
      type: Number,
      default: 0
    },
    whizleHistory: {
      type: [Date],
      default: []
    },
    lastShownAt: {
      type: Date,
      default: null
    },
    lastRank: {
      type: Number,
      default: null
    },
    score: {
      type: Number,
      default: 0
    },
    rank: {
      type: Number,
      default: 999999
    },
    startAt: {
      type: Date,
      default: null
    },
    endAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Optimize queries on common lookups
TrendingTopicSchema.index({ status: 1 });
TrendingTopicSchema.index({ rank: 1 });
TrendingTopicSchema.index({ category: 1 });

module.exports = mongoose.model('TrendingTopic', TrendingTopicSchema);
