const mongoose = require('mongoose');
const crypto = require('crypto');

const TokenSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => crypto.randomUUID()
    },
    userId: {
      type: String,
      default: null
    },
    customerName: {
      type: String,
      default: ''
    },
    customerPhone: {
      type: String,
      default: ''
    },
    providerId: {
      type: String,
      required: true,
      index: true
    },
    providerName: {
      type: String,
      default: ''
    },
    area: {
      type: String,
      default: ''
    },
    queueId: {
      type: String,
      default: ''
    },
    queueName: {
      type: String,
      default: ''
    },
    tokenNumber: {
      type: String,
      required: true
    },
    nowServing: {
      type: String,
      default: ''
    },
    peopleAhead: {
      type: Number,
      default: 0
    },
    etaMins: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['waiting', 'serving', 'completed', 'cancelled', 'skipped', 'postponed'],
      default: 'waiting'
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedText: {
      type: String,
      default: null
    },
    savedText: {
      type: String,
      default: null
    },
    calledAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    postponedDate: {
      type: String,
      default: null
    },
    issuedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    collection: 'token' // Explicitly binds to the existing 'token' collection in MongoDB
  }
);

module.exports = mongoose.model('Token', TokenSchema, 'token');
