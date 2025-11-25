// controllers/userController.js
const User = require('../models/User');
const { validateEmail, validatePhone,sanitizeAndValidateInput} = require('../utils/validation'); 

// @desc    Get all users (with filtering and pagination)
// @route   GET /api/users
// @access  Private
exports.getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      club,
      district,
      role,
      search
    } = req.query;

    // Build filter object
    const filter = { isActive: true };
    
    if (club) filter.club = new RegExp(club, 'i');
    if (district) filter.district = new RegExp(district, 'i');
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { fullName: new RegExp(search, 'i') },
        { displayName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }

    const users = await User.find(filter)
      .select('-googleId -__v')
      .sort({ serviceHours: -1, fullName: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      users
    });

  } catch (error) {
    console.error('❌ Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-googleId -__v');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user
    });

  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const {
      displayName,
      club,
      district,
      contactNumber,
      leoId,
      email
    } = req.body;

    if (email) {
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: emailValidation.error
        });
      }
    }

    if (contactNumber) {
      const phoneValidation = validatePhone(contactNumber);
      if (!phoneValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: phoneValidation.error
        });
      }
    }

    const updateData = {};
    if (displayName) updateData.displayName = sanitizeAndValidateInput(displayName);
    if (club) updateData.club = sanitizeAndValidateInput(club);
    if (district) updateData.district = sanitizeAndValidateInput(district);
    if (contactNumber) updateData.contactNumber = phoneValidation.formatted;
    if (leoId) updateData.leoId = sanitizeAndValidateInput(leoId);

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-googleId -__v');

    const userResponse = {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      displayName: user.displayName,
      profilePhoto: user.profilePhoto,
      club: user.club,
      district: user.district,
      role: user.role,
      badges: user.badges,
      serviceHours: user.serviceHours,
      leoId: user.leoId,
      contactNumber: user.contactNumber,
      joinDate: user.joinDate,
      isVerified: user.isVerified,
      isProfileComplete: !!(user.club && user.district)
    };

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: userResponse
    });

  } catch (error) {
    console.error('❌ Update profile error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Display name already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

// @desc    Search users by name or club
// @route   GET /api/users/search
// @access  Private
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const users = await User.find({
      isActive: true,
      $or: [
        { fullName: new RegExp(q, 'i') },
        { displayName: new RegExp(q, 'i') },
        { club: new RegExp(q, 'i') }
      ]
    })
    .select('fullName displayName profilePhoto club district role serviceHours')
    .limit(20);

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });

  } catch (error) {
    console.error('❌ Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed'
    });
  }
};

// @desc    Get leaderboard
// @route   GET /api/users/leaderboard
// @access  Private
exports.getLeaderboard = async (req, res) => {
  try {
    const { type = 'members', period = 'all' } = req.query;

    let leaderboard;
    
    if (type === 'members') {
      // Individual member leaderboard
      leaderboard = await User.find({ isActive: true })
        .select('fullName displayName profilePhoto club district serviceHours badges')
        .sort({ serviceHours: -1 })
        .limit(50);
    } else if (type === 'clubs') {
      // Club leaderboard (aggregate service hours by club)
      leaderboard = await User.aggregate([
        { $match: { isActive: true, club: { $exists: true, $ne: '' } } },
        {
          $group: {
            _id: '$club',
            totalServiceHours: { $sum: '$serviceHours' },
            memberCount: { $sum: 1 },
            district: { $first: '$district' }
          }
        },
        { $sort: { totalServiceHours: -1 } },
        { $limit: 20 }
      ]);
    }

    res.status(200).json({
      success: true,
      type,
      period,
      leaderboard
    });

  } catch (error) {
    console.error('❌ Leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard'
    });
  }
};