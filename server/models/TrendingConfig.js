const mongoose = require('mongoose');

const TrendingConfigSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: true
    },
    topicsPerDay: {
      type: Number,
      default: 50
    },
    selectionMode: {
      type: String,
      enum: ['auto', 'whizle', 'priority', 'new_topics', 'random', 'category_weighted', 'hybrid'],
      default: 'hybrid'
    },
    whizleWeight: {
      type: Number,
      default: 40
    },
    priorityWeight: {
      type: Number,
      default: 20
    },
    categoryWeight: {
      type: Number,
      default: 15
    },
    freshnessWeight: {
      type: Number,
      default: 15
    },
    randomWeight: {
      type: Number,
      default: 10
    },
    newTopicBoost: {
      type: Boolean,
      default: true
    },
    avoidRecentRepeat: {
      type: Boolean,
      default: true
    },
    categoryDistribution: {
      type: Map,
      of: Number,
      default: {}
    },
    categoryPriorities: {
      type: Map,
      of: Number,
      default: {}
    },
    rotationEnabled: {
      type: Boolean,
      default: true
    },
    isLocked: {
      type: Boolean,
      default: false
    },
    lockedAt: {
      type: Date,
      default: null
    },
    generatedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('TrendingConfig', TrendingConfigSchema);
