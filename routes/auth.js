// routes/auth.js
const express = require('express');
const router = express.Router();
const {
  googleLogin,
  getCurrentUser,
  verifyToken,
  mockGoogleLogin
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

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