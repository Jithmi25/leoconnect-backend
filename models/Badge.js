// models/Badge.js
const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  icon: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['service', 'leadership', 'achievement', 'special', 'milestone'],
    required: true
  },
  criteria: {
    type: {
      type: String,
      enum: ['service_hours', 'events_attended', 'posts_created', 'manual', 'custom'],
      required: true
    },
    threshold: Number,
    description: String
  },
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'special'],
    default: 'bronze'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
badgeSchema.index({ code: 1 });
badgeSchema.index({ category: 1, tier: 1 });
badgeSchema.index({ isActive: 1 });

// Static method to find by category
badgeSchema.statics.findByCategory = function(category) {
  return this.find({ category, isActive: true }).sort({ tier: 1 });
};

// Static method to find by code
badgeSchema.statics.findByCode = function(code) {
  return this.findOne({ code: code.toUpperCase(), isActive: true });
};

// Method to check if badge can be awarded
badgeSchema.methods.canAward = function(userStats) {
  if (!this.isActive) return false;

  switch (this.criteria.type) {
    case 'service_hours':
      return userStats.serviceHours >= this.criteria.threshold;
    case 'events_attended':
      return userStats.eventsAttended >= this.criteria.threshold;
    case 'posts_created':
      return userStats.postsCreated >= this.criteria.threshold;
    case 'manual':
      return false; // Manual badges are awarded by admins
    case 'custom':
      return true; // Custom logic would be implemented elsewhere
    default:
      return false;
  }
};

module.exports = mongoose.model('Badge', badgeSchema);