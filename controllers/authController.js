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

// exports.googleLogin = async (req, res) => {
//   try {
//     const { token } = req.body;
    
//     // Use validation util
//     if (!token) {
//       return res.status(400).json({
//         success: false,
//         message: 'Google token is required'
//       });
//     }

//     const ticket = await client.verifyIdToken({
//       idToken: token,
//       audience: process.env.GOOGLE_CLIENT_ID,
//     });
    
//     const { sub: googleId, name, email, picture } = ticket.getPayload();
    
//     // Use email validation util
//     if (!isValidEmail(email)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid email format'
//       });
//     }

//     // Use sanitization util
//     const sanitizedName = sanitizeInput(name);
    
//     // ... rest of your existing code
    
//     // Use token generation util
//     const jwtToken = generateToken(user._id);
    
//     // ... rest of your existing code
    
//   } catch (error) {
//     // ... error handling
//   }
// };

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


// In controllers/authController.js - Update mockGoogleLogin
exports.mockGoogleLogin = async (req, res) => {
  try {
    const User = require('../models/User');
    const { email = "leo.amala@gmail.com", role = "leo_member" } = req.body;

    // Find or create user based on email and role
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

      // Add badges based on role
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

    // Generate JWT token
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

// Note: The Google login handler is defined earlier in this file.
// The duplicate implementation below was removed because it overwrote
// the correct handler and referenced an undefined `generateJwtToken`.