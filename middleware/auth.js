// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const SuperAdmin = require('../models/SuperAdmin');

exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token and accept id/userId/_id payloads
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id || decoded._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload.'
      });
    }

    // Get user from token
    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Token is invalid.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Check if user is super admin
    if (user.role === 'super_admin') {
      const superAdmin = await SuperAdmin.findOne({ user: user._id, isActive: true });
      if (!superAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Super Admin access revoked.'
        });
      }
      req.superAdmin = superAdmin;
    }

    req.user = user;
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      });
    }

    res.status(401).json({
      success: false,
      message: 'Authentication failed.'
    });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'User role ' + req.user.role + ' is not authorized to access this route.'
      });
    }
    next();
  };
};

// Super Admin only middleware
exports.requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Super Admin access required.'
    });
  }
  next();
};

// Webmaster or Super Admin middleware
exports.requireAdmin = (req, res, next) => {
  const adminRoles = ['super_admin', 'webmaster'];
  if (!adminRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required.'
    });
  }
  next();
};
