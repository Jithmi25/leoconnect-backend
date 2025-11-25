// models/Event.js
const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: String,
  endTime: String,
  location: {
    type: String,
    required: true
  },
  address: String,
  hostClub: {
    type: String,
    required: true
  },
  district: {
    type: String,
    required: true
  },
  images: [{
    url: String,
    publicId: String
  }],
  attendees: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    attended: {
      type: Boolean,
      default: false
    }
  }],
  serviceHours: {
    type: Number,
    default: 0
  },
  maxAttendees: Number,
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  registrationDeadline: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
eventSchema.index({ date: 1 });
eventSchema.index({ hostClub: 1, district: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ registrationDeadline: 1 });

// Virtual for attendees count
eventSchema.virtual('attendeesCount').get(function() {
  return this.attendees.length;
});

// Virtual for available spots
eventSchema.virtual('availableSpots').get(function() {
  if (!this.maxAttendees) return null;
  return Math.max(0, this.maxAttendees - this.attendees.length);
});

// Method to check if user is registered
eventSchema.methods.isUserRegistered = function(userId) {
  return this.attendees.some(attendee => 
    attendee.user.toString() === userId.toString()
  );
};

module.exports = mongoose.model('Event', eventSchema);