const mongoose = require('mongoose');

const TokenSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true
    },
    tokenNumber: {
      type: Number,
      required: true
    },
    customerName: {
      type: String,
      required: true,
      trim: true
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['waiting', 'serving', 'completed', 'skipped', 'postponed'],
      default: 'waiting'
    },
    calledAt: {
      type: Date
    },
    completedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Token', TokenSchema);
