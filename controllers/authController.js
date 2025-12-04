// controllers/authController.js
const User = require('../models/User');
const { generateToken, verifyToken, getTokenFromHeader, hasRole, canAccessResource, generateVerificationCode, isValidEmail, validatePassword, calculatePasswordStrength, sanitizeInput, generateRandomString, needsTokenRefresh } = require('../utils/authUtils');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const jwt = require("jsonwebtoken");
const verifyGoogleToken = require("../config/googleAuth");

const client = new OAuth2Client(process.env.WEB_CLIENT_ID);

exports.googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ success: false, message: "ID Token required" });

    const googleUser = await verifyGoogleToken(idToken);
    const { email, name, picture } = googleUser;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: "You are not registered" });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({
      success: true,
      token,
      user: { name, email, picture, role: user.role }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Google login failed", error: err.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-__v');

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

// @desc    Mock login for development
// @route   POST /api/auth/mock-google-login
// @access  Public
exports.mockGoogleLogin = async (req, res) => {
  try {
    const User = require('../models/User');
    const { email = "leo.amala@gmail.com", role = "leo_member" } = req.body;

    // For mock login, always create or find user (bypass email check)
    let user = await User.findOne({ email });

    if (!user) {
      const userData = {
        googleId: `mock_${Date.now()}`,
        email: email,
        fullName: role === "webmaster" ? "Leo Webmaster Perera" : "Leo Amala Fernando",
        displayName: role === "webmaster" ? "Webmaster Leo" : "Leo Amala",
        profilePhoto: "https://example.com/profile.jpg",
        club: "Leo Club of Colombo Central",
        district: "306 D01",
        role: role,
        serviceHours: role === "webmaster" ? 120 : 45,
        leoId: role === "webmaster" ? "LEO306D01W001" : "LEO306D01A001",
        contactNumber: role === "webmaster" ? "+94771234568" : "+94771234567",
        isVerified: true
      };

      if (role === "webmaster") {
        userData.badges = [
          {
            name: "Webmaster Badge",
            code: "WEB001",
            earnedAt: new Date("2024-01-15")
          },
          {
            name: "Leadership Excellence",
            code: "LEAD001",
            earnedAt: new Date("2024-03-20")
          }
        ];
      } else {
        userData.badges = [
          {
            name: "District Officer Crest",
            code: "A150",
            earnedAt: new Date("2024-06-15")
          }
        ];
      }

      user = await User.create(userData);
      console.log(`✅ ${role} user created:`, user.email);
    }

    const jwtToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });

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
      isProfileComplete: true
    };

    res.status(200).json({
      success: true,
      token: jwtToken,
      user: userResponse,
      requiresProfileSetup: false
    });

  } catch (error) {
    console.error('❌ Mock Google login error:', error);
    res.status(500).json({
      success: false,
      message: 'Mock login failed',
      error: error.message
    });
  }
};