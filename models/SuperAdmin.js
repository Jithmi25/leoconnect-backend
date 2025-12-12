// models/SuperAdmin.js
const mongoose = require('mongoose');

const superAdminSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  permissions: {
    manageUsers: {
      type: Boolean,
      default: true
    },
    manageRoles: {
      type: Boolean,
      default: true
    },
    manageDistricts: {
      type: Boolean,
      default: true
    },
    manageClubs: {
      type: Boolean,
      default: true
    },
    manageMarketplace: {
      type: Boolean,
      default: true
    },
    manageLeaderboard: {
      type: Boolean,
      default: true
    },
    manageSettings: {
      type: Boolean,
      default: true
    },
    viewAnalytics: {
      type: Boolean,
      default: true
    },
    systemAccess: {
      type: Boolean,
      default: true
    }
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  activityLog: [{
    action: String,
    details: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  notes: String
}, {
  timestamps: true
});

// Indexes
superAdminSchema.index({ user: 1 });
superAdminSchema.index({ isActive: 1 });

// Method to log activity
superAdminSchema.methods.logActivity = function(action, details, ipAddress = '') {
  this.activityLog.push({
    action,
    details,
    ipAddress,
    timestamp: new Date()
  });
  
  // Keep only last 100 activities
  if (this.activityLog.length > 100) {
    this.activityLog = this.activityLog.slice(-100);
  }
  
  this.lastActive = new Date();
  return this.save();
};

// Static method to get super admin dashboard stats
superAdminSchema.statics.getDashboardStats = async function() {
  const User = mongoose.model('User');
  const Product = mongoose.model('Product');
  const District = mongoose.model('District');
  const Club = mongoose.model('Club');
  
  const [
    totalUsers,
    totalProducts,
    totalDistricts,
    totalClubs,
    userStats,
    productStats,
    recentActivity
  ] = await Promise.all([
    User.countDocuments({ isActive: true }),
    Product.countDocuments({ status: 'listed' }),
    District.countDocuments({ isActive: true }),
    Club.countDocuments({ isActive: true }),
    User.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]),
    Product.aggregate([
      { $match: { status: 'listed' } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalValue: { $sum: { $multiply: ['$price', '$stock'] } }
        }
      }
    ]),
    this.aggregate([
      {
        $unwind: '$activityLog'
      },
      {
        $sort: { 'activityLog.timestamp': -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          _id: 0,
          action: '$activityLog.action',
          details: '$activityLog.details',
          timestamp: '$activityLog.timestamp',
          admin: '$user'
        }
      }
    ])
  ]);

  return {
    totalUsers,
    totalProducts,
    totalDistricts,
    totalClubs,
    userStats,
    productStats,
    recentActivity
  };
};

module.exports = mongoose.model('SuperAdmin', superAdminSchema);