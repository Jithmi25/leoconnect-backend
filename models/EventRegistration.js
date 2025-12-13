// models/EventRegistration.js
const mongoose = require('mongoose');

const EventRegistrationSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['registered', 'attended', 'cancelled', 'no-show'],
    default: 'registered'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'free', 'cancelled'],
    default: 'pending'
  },
  paymentId: String,
  amountPaid: Number,
  checkInTime: Date,
  certificateIssued: {
    type: Boolean,
    default: false
  },
  certificateUrl: String,
  reminderSent: {
    type: Boolean,
    default: false
  },
  reminderTime: Date,
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure one user can register only once per event
EventRegistrationSchema.index({ event: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('EventRegistration', EventRegistrationSchema);