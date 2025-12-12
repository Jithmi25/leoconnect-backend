// models/User.js
const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    sparse: true
  },
  earnedAt: {
    type: Date,
    default: Date.now
  },
  description: String,
  icon: String
});

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    lowercase: true,
    trim: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  profilePhoto: {
    type: String,
    default: ''
  },
  club: {
    type: String,
    trim: true
  },
  district: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['leo_member', 'webmaster','superAdmin'],
    default: 'leo_member'
  },
  badges: [badgeSchema],
  serviceHours: {
    type: Number,
    default: 0
  },
  leoId: {
    type: String,
    trim: true
  },
  contactNumber: {
    type: String,
    trim: true
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Define indexes separately to avoid duplicates
// Create unique indexes here (rather than via field `unique: true`) to
// ensure a single index declaration and avoid duplicate-index warnings.
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });
userSchema.index({ club: 1, district: 1 });
userSchema.index({ role: 1 });
userSchema.index({ serviceHours: -1 });
// Remove the badges.code index if it's causing issues
// userSchema.index({ 'badges.code': 1 });

// Virtual for profile completion status
userSchema.virtual('isProfileComplete').get(function() {
  return !!(this.club && this.district);
});

// Method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

module.exports = mongoose.model('User', userSchema);