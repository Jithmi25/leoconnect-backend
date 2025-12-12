// controllers/superAdminController.js
const User = require('../models/User');
const Product = require('../models/Product');
const District = require('../models/District');
const Club = require('../models/Club');
const SuperAdmin = require('../models/SuperAdmin');
const mongoose = require('mongoose');

// @desc    Get dashboard overview
// @route   GET /api/super-admin/dashboard
// @access  Private (Super Admin)
exports.getDashboardOverview = async (req, res) => {
  try {
    const [
      totalUsers,
      totalProducts,
      totalDistricts,
      totalClubs,
      activeUsers,
      listedProducts,
      pendingEvents,
      registrations,
      userGrowth,
      productGrowth,
      recentActivities
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Product.countDocuments(),
      District.countDocuments({ isActive: true }),
      Club.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true, role: { $ne: 'super_admin' } }),
      Product.countDocuments({ status: 'listed' }),
      // Mock data for now - integrate with Events model later
      12,
      89,
      calculateUserGrowth(),
      calculateProductGrowth(),
      getRecentActivities()
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          activeUsers,
          totalProducts,
          pendingEvents,
          registrations,
          listedProducts,
          totalClubs,
          totalDistricts,
          totalUsers
        },
        growth: {
          users: userGrowth,
          products: productGrowth
        },
        recentActivities
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
};

// @desc    Get user statistics
// @route   GET /api/super-admin/users/stats
// @access  Private (Super Admin)
exports.getUserStatistics = async (req, res) => {
  try {
    const stats = await User.aggregate([
      { $match: { isActive: true } },
      {
        $facet: {
          totalUsers: [{ $count: "count" }],
          usersByRole: [
            { $group: { _id: "$role", count: { $sum: 1 } } }
          ],
          usersByDistrict: [
            { $match: { district: { $ne: null, $ne: "" } } },
            { $group: { _id: "$district", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          usersByClub: [
            { $match: { club: { $ne: null, $ne: "" } } },
            { $group: { _id: "$club", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          serviceHoursStats: [
            { $group: { 
                _id: null, 
                totalHours: { $sum: "$serviceHours" },
                averageHours: { $avg: "$serviceHours" },
                maxHours: { $max: "$serviceHours" }
              } 
            }
          ],
          recentRegistrations: [
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
            { $project: { 
                fullName: 1, 
                email: 1, 
                club: 1, 
                district: 1, 
                role: 1,
                createdAt: 1 
              } 
            }
          ],
          monthlyGrowth: [
            {
              $group: {
                _id: {
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { "_id.year": -1, "_id.month": -1 } },
            { $limit: 12 }
          ]
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics'
    });
  }
};

// @desc    Get all users with filters
// @route   GET /api/super-admin/users
// @access  Private (Super Admin)
exports.getAllUsers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      role, 
      district, 
      club, 
      search,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = { isActive: isActive !== 'false' };
    
    if (role && role !== 'all') {
      filter.role = role;
    }
    
    if (district && district !== 'all') {
      filter.district = district;
    }
    
    if (club && club !== 'all') {
      filter.club = club;
    }
    
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate skip
    const skip = (page - 1) * limit;

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute queries
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-__v -googleId')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

// @desc    Update user role
// @route   PUT /api/super-admin/users/:id/role
// @access  Private (Super Admin)
exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { newRole, startDate, remark, passcode } = req.body;

    // Validation
    if (!newRole) {
      return res.status(400).json({
        success: false,
        message: 'New role is required'
      });
    }

    if (!passcode || passcode.length !== 4) {
      return res.status(400).json({
        success: false,
        message: 'Valid 4-digit passcode is required'
      });
    }

    // Verify passcode (in real app, validate against stored passcode)
    if (passcode !== process.env.SUPER_ADMIN_PASSCODE || passcode !== '1234') {
      return res.status(401).json({
        success: false,
        message: 'Invalid passcode'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent modifying super admin
    if (user.role === 'super_admin' && req.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify another Super Admin'
      });
    }

    const previousRole = user.role;
    
    // Update user role
    user.role = newRole;
    await user.addRoleHistory(
      previousRole,
      newRole,
      req.user._id,
      req.user.fullName,
      remark || ''
    );
    
    await user.save();

    // Log activity
    if (req.superAdmin) {
      await req.superAdmin.logActivity(
        'ROLE_UPDATE',
        `Changed role for ${user.fullName} from ${previousRole} to ${newRole}`,
        req.ip
      );
    }

    res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      data: {
        userId: user._id,
        fullName: user.fullName,
        previousRole,
        newRole,
        updatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role'
    });
  }
};

// @desc    Get marketplace statistics
// @route   GET /api/super-admin/marketplace/stats
// @access  Private (Super Admin)
exports.getMarketplaceStats = async (req, res) => {
  try {
    const stats = await Product.getMarketplaceStats();
    
    // Get recent transactions (mock for now)
    const recentTransactions = await Product.find({ status: 'sold' })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('title price sellerName updatedAt');

    res.status(200).json({
      success: true,
      data: {
        ...stats,
        recentTransactions
      }
    });
  } catch (error) {
    console.error('Get marketplace stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch marketplace statistics'
    });
  }
};

// @desc    Get leaderboard data
// @route   GET /api/super-admin/leaderboard
// @access  Private (Super Admin)
exports.getLeaderboard = async (req, res) => {
  try {
    const { type = 'clubs', districtId, limit = 20 } = req.query;

    let leaderboardData;
    
    if (type === 'districts') {
      leaderboardData = await District.getLeaderboard();
    } else if (type === 'clubs') {
      leaderboardData = await Club.getLeaderboard(parseInt(limit), districtId);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid leaderboard type'
      });
    }

    // Add ranks and trends
    leaderboardData.forEach((item, index) => {
      item.rank = index + 1;
      item.trend = Math.random() > 0.5 ? 'up' : 'down';
      item.trendValue = Math.random() * 5 - 2.5;
    });

    res.status(200).json({
      success: true,
      data: leaderboardData
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard data'
    });
  }
};

// @desc    Get role assignment history
// @route   GET /api/super-admin/role-history
// @access  Private (Super Admin)
exports.getRoleHistory = async (req, res) => {
  try {
    const { userId, assignedBy, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (userId) {
      filter.userId = userId;
    }
    if (assignedBy) {
      filter.assignedBy = assignedBy;
    }

    const skip = (page - 1) * limit;

    // Get users with role history
    const users = await User.find({
      'roleHistory.0': { $exists: true }
    })
    .select('fullName email role roleHistory')
    .skip(skip)
    .limit(parseInt(limit));

    // Format response
    const formattedHistory = [];
    users.forEach(user => {
      user.roleHistory.forEach(history => {
        formattedHistory.push({
          userId: user._id,
          userName: user.fullName,
          userEmail: user.email,
          previousRole: history.previousRole,
          newRole: history.newRole,
          assignedBy: history.assignedBy,
          assignedByName: history.assignedByName,
          startDate: history.startDate,
          remark: history.remark,
          createdAt: history.createdAt
        });
      });
    });

    // Sort by created date
    formattedHistory.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      data: formattedHistory
    });
  } catch (error) {
    console.error('Get role history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch role history'
    });
  }
};

// @desc    Get platform analytics
// @route   GET /api/super-admin/analytics
// @access  Private (Super Admin)
exports.getAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Get user growth
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.date": 1 } }
    ]);

    // Get product growth
    const productGrowth = await Product.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'listed'
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
          },
          count: { $sum: 1 },
          totalValue: { $sum: { $multiply: ["$price", "$stock"] } }
        }
      },
      { $sort: { "_id.date": 1 } }
    ]);

    // Get active users by day
    const activeUsers = await User.aggregate([
      {
        $match: {
          lastLogin: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$lastLogin" } }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.date": 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        userGrowth,
        productGrowth,
        activeUsers,
        period,
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data'
    });
  }
};

// @desc    Create/update district
// @route   POST /api/super-admin/districts (create)
// @route   PUT /api/super-admin/districts/:id (update)
// @access  Private (Super Admin)
exports.manageDistrict = async (req, res) => {
  try {
    const { id } = req.params;
    const districtData = req.body;

    let district;
    let message;

    if (id) {
      // Update existing district
      district = await District.findByIdAndUpdate(
        id,
        { ...districtData, updatedBy: req.user._id },
        { new: true, runValidators: true }
      );
      
      if (!district) {
        return res.status(404).json({
          success: false,
          message: 'District not found'
        });
      }
      
      message = 'District updated successfully';
    } else {
      // Create new district
      districtData.updatedBy = req.user._id;
      district = await District.create(districtData);
      message = 'District created successfully';
    }

    // Log activity
    if (req.superAdmin) {
      await req.superAdmin.logActivity(
        id ? 'DISTRICT_UPDATE' : 'DISTRICT_CREATE',
        `${id ? 'Updated' : 'Created'} district: ${district.name}`,
        req.ip
      );
    }

    res.status(id ? 200 : 201).json({
      success: true,
      message,
      data: district
    });
  } catch (error) {
    console.error('Manage district error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }
    
    res.status(500).json({
      success: false,
      message: `Failed to ${req.params.id ? 'update' : 'create'} district`
    });
  }
};

// @desc    Create/update club
// @route   POST /api/super-admin/clubs (create)
// @route   PUT /api/super-admin/clubs/:id (update)
// @access  Private (Super Admin)
exports.manageClub = async (req, res) => {
  try {
    const { id } = req.params;
    const clubData = req.body;

    // Validate district exists for create operation
    if (!id && !clubData.district) {
      return res.status(400).json({
        success: false,
        message: 'District is required'
      });
    }

    // If district is provided, validate it exists
    if (clubData.district) {
      const district = await District.findById(clubData.district);
      if (!district) {
        return res.status(400).json({
          success: false,
          message: 'District not found'
        });
      }
      clubData.districtName = district.name;
    }

    let club;
    let message;

    if (id) {
      // Update existing club
      club = await Club.findByIdAndUpdate(
        id,
        { ...clubData, updatedBy: req.user._id },
        { new: true, runValidators: true }
      );
      
      if (!club) {
        return res.status(404).json({
          success: false,
          message: 'Club not found'
        });
      }
      
      message = 'Club updated successfully';
    } else {
      // Create new club
      clubData.updatedBy = req.user._id;
      club = await Club.create(clubData);
      message = 'Club created successfully';
    }

    // Update club stats
    if (club) {
      await club.updateStats();
      
      // Update district stats
      if (club.district) {
        const district = await District.findById(club.district);
        if (district) {
          // Count clubs in district
          const clubCount = await Club.countDocuments({ 
            district: district._id, 
            isActive: true 
          });
          district.stats.totalClubs = clubCount;
          await district.save();
        }
      }
    }

    // Log activity
    if (req.superAdmin) {
      await req.superAdmin.logActivity(
        id ? 'CLUB_UPDATE' : 'CLUB_CREATE',
        `${id ? 'Updated' : 'Created'} club: ${club.name}`,
        req.ip
      );
    }

    res.status(id ? 200 : 201).json({
      success: true,
      message,
      data: club
    });
  } catch (error) {
    console.error('Manage club error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }
    
    res.status(500).json({
      success: false,
      message: `Failed to ${req.params.id ? 'update' : 'create'} club`
    });
  }
};

// Helper functions
async function calculateUserGrowth() {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  const [currentMonthCount, previousMonthCount] = await Promise.all([
    User.countDocuments({
      createdAt: { $gte: lastMonth, $lt: now }
    }),
    User.countDocuments({
      createdAt: { $gte: twoMonthsAgo, $lt: lastMonth }
    })
  ]);

  const growth = previousMonthCount > 0 
    ? ((currentMonthCount - previousMonthCount) / previousMonthCount) * 100 
    : currentMonthCount > 0 ? 100 : 0;

  return {
    currentMonth: currentMonthCount,
    previousMonth: previousMonthCount,
    growth: parseFloat(growth.toFixed(2))
  };
}

async function calculateProductGrowth() {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  const [currentMonthCount, previousMonthCount] = await Promise.all([
    Product.countDocuments({
      createdAt: { $gte: lastMonth, $lt: now },
      status: 'listed'
    }),
    Product.countDocuments({
      createdAt: { $gte: twoMonthsAgo, $lt: lastMonth },
      status: 'listed'
    })
  ]);

  const growth = previousMonthCount > 0 
    ? ((currentMonthCount - previousMonthCount) / previousMonthCount) * 100 
    : currentMonthCount > 0 ? 100 : 0;

  return {
    currentMonth: currentMonthCount,
    previousMonth: previousMonthCount,
    growth: parseFloat(growth.toFixed(2))
  };
}

async function getRecentActivities() {
  // Get recent role changes
  const recentRoleChanges = await User.aggregate([
    { $match: { 'roleHistory.0': { $exists: true } } },
    { $unwind: '$roleHistory' },
    { $sort: { 'roleHistory.createdAt': -1 } },
    { $limit: 5 },
    {
      $project: {
        type: 'role_change',
        user: '$fullName',
        action: 'Role Updated',
        details: {
          $concat: [
            'Changed from ',
            '$roleHistory.previousRole',
            ' to ',
            '$roleHistory.newRole'
          ]
        },
        timestamp: '$roleHistory.createdAt',
        performedBy: '$roleHistory.assignedByName'
      }
    }
  ]);

  // Get recent product listings
  const recentProducts = await Product.find({ status: 'listed' })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('title price sellerName createdAt')
    .then(products => products.map(product => ({
      type: 'product_listing',
      user: product.sellerName,
      action: 'Product Listed',
      details: `${product.title} for Rs. ${product.price}`,
      timestamp: product.createdAt
    })));

  return [...recentRoleChanges, ...recentProducts]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);
}