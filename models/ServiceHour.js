// models/ServiceHour.js
const mongoose = require('mongoose');

const serviceHourSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  },
  projectName: {
    type: String,
    required: true
  },
  hours: {
    type: Number,
    required: true,
    min: 0.5
  },
  date: {
    type: Date,
    required: true
  },
  description: String,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  club: String,
  district: String,
  evidence: [{
    type: String // URLs to evidence images
  }]
}, {
  timestamps: true
});

// Indexes
serviceHourSchema.index({ user: 1, date: -1 });
serviceHourSchema.index({ status: 1 });
serviceHourSchema.index({ club: 1, district: 1 });
serviceHourSchema.index({ verifiedBy: 1 });

module.exports = mongoose.model('ServiceHour', serviceHourSchema);