// routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require("jsonwebtoken");
const verifyGoogleToken = require("../config/googleAuth");
const User = require("../models/User");
const {
  googleLogin,
  getCurrentUser,
  verifyToken,
  mockGoogleLogin
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post("/google-login", async (req, res) => {
  try {
    const { idToken } = req.body;

    const googleUser = await verifyGoogleToken(idToken);

    const { email, name, picture } = googleUser;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "You are not a registered member" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        name,
        email,
        picture,
        role: user.role
      }
    });

  } catch (err) {
    res.status(500).json({ message: "Google login failed", error: err.message });
  }
});

// Apply rate limiting to auth routes
router.use(authLimiter);

// @desc    Google OAuth login
// @route   POST /api/auth/google
// @access  Public
router.post('/google', googleLogin);

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, getCurrentUser);

// @desc    Verify token validity
// @route   GET /api/auth/verify
// @access  Private
router.get('/verify', protect, verifyToken);


router.post('/mock-google-login', mockGoogleLogin);

module.exports = router;