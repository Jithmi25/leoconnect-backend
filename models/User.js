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

const roleHistorySchema = new mongoose.Schema({
  previousRole: String,
  newRole: String,
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedByName: String,
  startDate: {
    type: Date,
    default: Date.now
  },
  remark: String,
  status: {
    type: String,
    enum: ['active', 'expired', 'revoked'],
    default: 'active'
  }
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    unique: true
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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',
    trim: true
  },
  district: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'District',
    trim: true
  },
  role: {
    type: String,
    enum: ['leo_member', 'webmaster', 'super_admin'],
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
  },
  roleHistory: [roleHistorySchema],
  adminNotes: String,
  passcode: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });
userSchema.index({ club: 1, district: 1 });
userSchema.index({ role: 1 });
userSchema.index({ serviceHours: -1 });

// Virtual for profile completion status
userSchema.virtual('isProfileComplete').get(function() {
  return !!(this.club && this.district);
});

// Method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// Method to add role history
userSchema.methods.addRoleHistory = function(previousRole, newRole, assignedBy, assignedByName, remark = '') {
  this.roleHistory.push({
    previousRole,
    newRole,
    assignedBy,
    assignedByName,
    remark,
    status: 'active'
  });
  return this.save();
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find super admins
userSchema.statics.findSuperAdmins = function() {
  return this.find({ role: 'super_admin', isActive: true });
};

// Static method to find webmasters
userSchema.statics.findWebmasters = function() {
  return this.find({ role: 'webmaster', isActive: true });
};

module.exports = mongoose.model('User', userSchema);