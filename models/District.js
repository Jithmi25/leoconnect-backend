// models/District.js
const mongoose = require('mongoose');

const districtSchema = new mongoose.Schema({
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
  region: {
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
  contactEmail: String,
  contactPhone: String,
  website: String,
  socialMedia: {
    facebook: String,
    instagram: String,
    linkedin: String
  },
  stats: {
    totalClubs: {
      type: Number,
      default: 0
    },
    totalMembers: {
      type: Number,
      default: 0
    },
    totalProjects: {
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
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  logo: String,
  bannerImage: String,
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
districtSchema.index({ code: 1 });
districtSchema.index({ region: 1 });
districtSchema.index({ 'stats.engagementScore': -1 });

// Virtual for clubs in district
districtSchema.virtual('clubs', {
  ref: 'Club',
  localField: '_id',
  foreignField: 'district',
  justOne: false
});

// Static method to get leaderboard
districtSchema.statics.getLeaderboard = async function() {
  return this.aggregate([
    { $match: { isActive: true } },
    { $sort: { 'stats.engagementScore': -1 } },
    {
      $project: {
        name: 1,
        code: 1,
        region: 1,
        engagementScore: '$stats.engagementScore',
        totalClubs: '$stats.totalClubs',
        totalMembers: '$stats.totalMembers',
        serviceHours: '$stats.serviceHours',
        logo: 1
      }
    },
    { $limit: 20 }
  ]);
};

module.exports = mongoose.model('District', districtSchema);