// middleware/roleCheck.js
const User = require('../models/User');

// @desc    Check if user has specific role
// @access  Private
exports.requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role;
    
    // Updated role hierarchy - webmaster has admin privileges
    const roleHierarchy = {
      'leo_member': 1,
      'webmaster': 2,
    };

    if (roleHierarchy[userRole] < roleHierarchy[requiredRole]) {
      return res.status(403).json({
        success: false,
        message: `Insufficient permissions. Required role: ${requiredRole}`
      });
    }

    next();
  };
};

// @desc    Check if user is admin OR webmaster
// @access  Private
exports.requireAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'webmaster')) {
    return res.status(403).json({
      success: false,
      message: 'Admin or Webmaster access required'
    });
  }
  next();
};

// @desc    Check if user is webmaster (with admin privileges)
// @access  Private
exports.requireWebmaster = (req, res, next) => {
  if (!req.user || req.user.role !== 'webmaster') {
    return res.status(403).json({
      success: false,
      message: 'Webmaster access required'
    });
  }
  next();
};

// @desc    Check if user owns the resource or is webmaster
// @access  Private
exports.requireOwnershipOrWebmaster = (modelName) => {
  return async (req, res, next) => {
    try {
      const model = require(`../models/${modelName}`);
      const resource = await model.findById(req.params.id);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Check if user is webmaster or owns the resource
      const isOwner = resource.author && resource.author.toString() === req.user.id;
      const isWebmaster = req.user.role === 'webmaster';

      if (!isOwner && !isWebmaster) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this resource'
        });
      }

      req.resource = resource;
      next();

    } catch (error) {
      console.error('❌ Ownership check error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization check failed'
      });
    }
  };
};