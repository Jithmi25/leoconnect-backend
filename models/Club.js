// models/Club.js
const mongoose = require('mongoose');

const clubSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    unique: true
  },
  district: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'District',
    required: true
  },
  districtName: {
    type: String,
    required: true
  },
  description: String,
  establishedDate: Date,
  president: {
    name: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  secretary: {
    name: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  treasurer: {
    name: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  contactEmail: String,
  contactPhone: String,
  website: String,
  socialMedia: {
    facebook: String,
    instagram: String,
    linkedin: String
  },
  stats: {
    totalMembers: {
      type: Number,
      default: 0
    },
    activeMembers: {
      type: Number,
      default: 0
    },
    totalPosts: {
      type: Number,
      default: 0
    },
    totalEvents: {
      type: Number,
      default: 0
    },
    serviceHours: {
      type: Number,
      default: 0
    },
    engagementScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    monthlyGrowth: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  logo: String,
  bannerImage: String,
  meetingSchedule: String,
  meetingLocation: String,
  achievements: [{
    title: String,
    description: String,
    date: Date,
    awardType: String
  }],
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
clubSchema.index({ name: 'text', description: 'text' });
clubSchema.index({ district: 1 });
clubSchema.index({ 'stats.engagementScore': -1 });
clubSchema.index({ 'stats.totalMembers': -1 });
clubSchema.index({ isActive: 1 });

// Virtual for members in club
clubSchema.virtual('members', {
  ref: 'User',
  localField: '_id',
  foreignField: 'club',
  justOne: false
});

// Static method to get club leaderboard
clubSchema.statics.getLeaderboard = async function(limit = 20, districtId = null) {
  const matchStage = { isActive: true };
  if (districtId) {
    matchStage.district = districtId;
  }

  return this.aggregate([
    { $match: matchStage },
    { $sort: { 'stats.engagementScore': -1 } },
    {
      $project: {
        name: 1,
        code: 1,
        district: 1,
        districtName: 1,
        engagementScore: '$stats.engagementScore',
        totalMembers: '$stats.totalMembers',
        totalPosts: '$stats.totalPosts',
        serviceHours: '$stats.serviceHours',
        monthlyGrowth: '$stats.monthlyGrowth',
        logo: 1,
        president: 1
      }
    },
    { $limit: limit }
  ]);
};

// Update club stats
clubSchema.methods.updateStats = async function() {
  const User = mongoose.model('User');
  
  // Count members
  const memberCount = await User.countDocuments({ 
    club: this._id.toString(),
    isActive: true 
  });
  
  // Count active members (with recent activity)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const activeMemberCount = await User.countDocuments({
    club: this._id.toString(),
    isActive: true,
    lastLogin: { $gte: thirtyDaysAgo }
  });

  this.stats.totalMembers = memberCount;
  this.stats.activeMembers = activeMemberCount;
  
  // Calculate engagement score
  const activityRate = memberCount > 0 ? (activeMemberCount / memberCount) * 100 : 0;
  this.stats.engagementScore = Math.round(activityRate);
  
  await this.save();
};

module.exports = mongoose.model('Club', clubSchema);