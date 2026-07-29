const mongoose = require('mongoose');

const AdSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    position: {
      type: String,
      required: false
    },
    positions: {
      type: [String],
      default: []
    },
    file: {
      type: String, // Stores base64 image data or URL path
      required: true
    },
    url: {
      type: String,
      required: true,
      trim: true
    },
    views: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    targeting: {
      type: {
        type: String,
        enum: ['GLOBAL', 'REGIONAL'],
        default: 'GLOBAL'
      },
      locations: [
        {
          countryCode: { type: String, required: true },
          countryName: { type: String, required: true },
          stateCode: { type: String },
          stateName: { type: String },
          cityName: { type: String },
          targetingLevel: {
            type: String,
            enum: ['COUNTRY', 'STATE', 'CITY'],
            required: true
          }
        }
      ]
    }
  },
  { timestamps: true }
);

// Indexes for query optimization
AdSchema.index({ isActive: 1 });
AdSchema.index({ positions: 1 });
AdSchema.index({ 'targeting.type': 1 });
AdSchema.index({ 'targeting.locations.countryCode': 1 });
AdSchema.index({ 'targeting.locations.stateCode': 1 });
AdSchema.index({ 'targeting.locations.cityName': 1 });

module.exports = mongoose.model('Ad', AdSchema);
