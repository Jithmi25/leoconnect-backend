// routes/users.js
const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  updateProfile,
  searchUsers,
  getLeaderboard
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { requireWebmaster } = require('../middleware/roleCheck');

// All routes are protected
router.use(protect);

// @desc    Get all users (with filtering)
// @route   GET /api/users
// @access  Private
router.get('/', getUsers);

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', getUser);

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', updateProfile);

// @desc    Search users by name or club
// @route   GET /api/users/search
// @access  Private
router.get('/search/all', searchUsers);

// @desc    Get leaderboard
// @route   GET /api/users/leaderboard
// @access  Private
router.get('/leaderboard/all', getLeaderboard);

// Admin only routes
// @desc    Get user statistics (Admin only)
// @route   GET /api/users/stats/overview
// @access  Private (Admin)
router.get('/stats/overview', requireWebmaster, async (req, res) => {
  try {
    const User = require('../models/User');
    
    const stats = await User.aggregate([
      {
        $facet: {
          totalUsers: [{ $count: "count" }],
          usersByRole: [
            { $group: { _id: "$role", count: { $sum: 1 } } }
          ],
          usersByDistrict: [
            { $group: { _id: "$district", count: { $sum: 1 } } }
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
            { $limit: 5 },
            { $project: { fullName: 1, email: 1, club: 1, district: 1, createdAt: 1 } }
          ]
        }
      }
    ]);

    res.status(200).json({
      success: true,
      stats: stats[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics'
    });
  }
});

module.exports = router;