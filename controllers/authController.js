// controllers/authController.js
const User = require('../models/User');
const { generateToken } = require('../utils/authUtils');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @desc    Google OAuth login with email verification
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

    let googleUser;
    
    // Method 1: Verify using Google OAuth2Client
    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      googleUser = ticket.getPayload();
    } catch (verifyError) {
      console.log('OAuth2Client verification failed, trying axios method...');
      
      // Method 2: Verify using axios call to Google API
      try {
        const response = await axios({
          method: 'get',
          url: 'https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=' + token,
          withCredentials: true
        });
        
        if (response.data && response.data.email) {
          googleUser = {
            sub: response.data.kid,
            name: response.data.name,
            email: response.data.email,
            picture: response.data.picture
          };
        } else {
          throw new Error('Invalid token response from Google');
        }
      } catch (axiosError) {
        console.error('Both verification methods failed:', axiosError);
        return res.status(401).json({
          success: false,
          message: 'Google token verification failed'
        });
      }
    }

    const { sub: googleId, name, email, picture } = googleUser;
    
    console.log(`🔐 Google login attempt for: ${email}`);
    
    // Check if user exists in database
    const existingUser = await User.findOne({ email });
    
    if (!existingUser) {
      console.log(`❌ User not found in database: ${email}`);
      return res.status(404).json({
        success: false,
        message: 'User not found. Please contact administrator to register.',
        requiresRegistration: true
      });
    }

    // Update user's Google info and last login
    existingUser.googleId = googleId;
    existingUser.profilePhoto = picture;
    existingUser.fullName = name;
    existingUser.lastLogin = new Date();
    await existingUser.save();

    // Generate JWT
    const jwtToken = generateToken(existingUser._id);
    
    // Return user data
    const userResponse = {
      id: existingUser._id,
      googleId: existingUser.googleId,
      email: existingUser.email,
      fullName: existingUser.fullName,
      displayName: existingUser.displayName,
      profilePhoto: existingUser.profilePhoto,
      club: existingUser.club,
      district: existingUser.district,
      role: existingUser.role,
      badges: existingUser.badges || [],
      serviceHours: existingUser.serviceHours || 0,
      leoId: existingUser.leoId,
      contactNumber: existingUser.contactNumber,
      joinDate: existingUser.joinDate,
      isVerified: existingUser.isVerified,
      isProfileComplete: !!(existingUser.club && existingUser.district)
    };
    
    console.log(`✅ Login successful for: ${existingUser.email}`);
    
    res.status(200).json({
      success: true,
      token: jwtToken,
      user: userResponse,
      requiresProfileSetup: !existingUser.club || !existingUser.district
    });
    
  } catch (error) {
    console.error('❌ Google auth error:', error);
    
    if (error.message.includes('Token used too late')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token expired. Please try again.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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