const mongoose = require('mongoose');

const TrendingHistorySchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      index: true
    },
    topics: [
      {
        topicId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'TrendingTopic'
        },
        rank: {
          type: Number,
          required: true
        },
        score: {
          type: Number,
          default: 0
        },
        selectionReason: {
          type: String,
          default: ''
        },
        whizlesCount: {
          type: Number,
          default: 0
        },
        category: {
          type: String,
          required: true
        },
        heading: {
          type: String,
          required: true
        }
      }
    ],
    selectionMode: {
      type: String,
      required: true
    },
    generatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('TrendingHistory', TrendingHistorySchema);
