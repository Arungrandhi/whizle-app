const mongoose = require('mongoose');

const RingtoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    file: {
      type: String, // Stores base64 audio data or URL path
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    duration: {
      type: String,
      default: '0:15 sec'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ringtone', RingtoneSchema);
