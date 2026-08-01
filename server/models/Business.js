const mongoose = require('mongoose');

const BusinessSchema = new mongoose.Schema(
  {
    domain: {
      type: String,
      required: true,
      enum: ['Salon', 'Clinic', 'Restaurant', 'Retail', 'Education', 'Bank', 'Others', 'Health Care', 'Banking', 'Eating', 'Services', 'Beauty', 'Diagnostics', 'Other']
    },
    name: {
      type: String,
      required: true
    },
    category: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    address: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    zipCode: {
      type: String,
      required: true
    },
    logo: {
      type: String,
      default: ''
    },
    backgroundImage: {
      type: String,
      default: ''
    },
    primaryColor: {
      type: String,
      default: '#007bff'
    },
    website: {
      type: String,
      default: ''
    },
    maxCapacity: {
      type: Number,
      default: 100
    },
    queueConfig: {
      name: { type: String, required: true },
      startTime: { type: String, required: true }, // e.g. "09:00"
      endTime: { type: String, required: true }, // e.g. "17:00"
      serviceTime: { type: Number, required: true, default: 15 } // in minutes
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Business', BusinessSchema);
