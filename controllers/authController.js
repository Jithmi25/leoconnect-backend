// controllers/authController.js
const User = require('../models/User');
const { generateToken, isValidEmail, sanitizeInput } = require('../utils/authUtils'); 
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


// @desc    Google OAuth login
// @route   POST /api/auth/google
// @access  Public
exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Google token is required'
      });
    }

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const { sub: googleId, name, email, picture } = ticket.getPayload();
    
    console.log(`🔐 Google login attempt for: ${email}`);
    
    // Find or create user
    let user = await User.findOne({ 
      $or: [{ googleId }, { email }] 
    });

    if (!user) {
      // Create new user with minimal data
      user = await User.create({
        googleId,
        email,
        fullName: name,
        displayName: name.split(' ')[0],
        profilePhoto: picture,
        isVerified: true,
      });
      console.log(`✅ New user created: ${email}`);
    } else {
      console.log(`✅ Existing user found: ${email}`);
      // Update Google info if changed
      user.googleId = googleId;
      user.profilePhoto = picture;
      user.fullName = name;
      user.lastLogin = new Date();
      await user.save();
    }

    // Generate JWT
    const jwtToken = generateToken(user._id);
    
    // Return complete user data to frontend
    const userResponse = {
      id: user._id,
      googleId: user.googleId,
      email: user.email,
      fullName: user.fullName,
      displayName: user.displayName,
      profilePhoto: user.profilePhoto,
      club: user.club,
      district: user.district,
      role: user.role,
      badges: user.badges || [],
      serviceHours: user.serviceHours || 0,
      leoId: user.leoId,
      contactNumber: user.contactNumber,
      joinDate: user.joinDate,
      isVerified: user.isVerified,
      isProfileComplete: !!(user.club && user.district)
    };
    
    console.log(`📤 Sending user data for: ${user.email}`, {
      club: user.club,
      district: user.district,
      role: user.role,
      badges: user.badges?.length,
      serviceHours: user.serviceHours
    });
    
    res.status(200).json({
      success: true,
      token: jwtToken,
      user: userResponse,
      requiresProfileSetup: !user.club || !user.district
    });
    
  } catch (error) {
    console.error('❌ Google auth error:', error);
    
    if (error.message.includes('Token used too late')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token expired. Please try again.'
      });
    }
    
    res.status(401).json({
      success: false,
      message: 'Google authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    
    // Use validation util
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Google token is required'
      });
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const { sub: googleId, name, email, picture } = ticket.getPayload();
    
    // Use email validation util
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Use sanitization util
    const sanitizedName = sanitizeInput(name);
    
    // ... rest of your existing code
    
    // Use token generation util
    const jwtToken = generateToken(user._id);
    
    // ... rest of your existing code
    
  } catch (error) {
    // ... error handling
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-__v');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userResponse = {
      id: user._id,
      googleId: user.googleId,
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
      user: userResponse
    });

  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user data'
    });
  }
};

// @desc    Verify token
// @route   GET /api/auth/verify
// @access  Private
exports.verifyToken = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Token is valid',
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.fullName,
        role: req.user.role
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token verification failed'
    });
  }
};