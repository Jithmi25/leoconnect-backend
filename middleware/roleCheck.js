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
    
    // Define role hierarchy
    const roleHierarchy = {
      'leo_member': 1,
      'webmaster': 2,
      'admin': 3
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

// @desc    Check if user is admin
// @access  Private
exports.requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// @desc    Check if user is webmaster or admin
// @access  Private
exports.requireWebmaster = (req, res, next) => {
  if (!req.user || (req.user.role !== 'webmaster' && req.user.role !== 'admin')) {
    return res.status(403).json({
      success: false,
      message: 'Webmaster or Admin access required'
    });
  }
  next();
};

// @desc    Check if user owns the resource or is admin
// @access  Private
exports.requireOwnershipOrAdmin = (modelName) => {
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

      // Check if user is admin or owns the resource
      const isOwner = resource.author && resource.author.toString() === req.user.id;
      const isAdmin = req.user.role === 'admin';

      if (!isOwner && !isAdmin) {
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

// @desc    Check if user is in same club/district or admin
// @access  Private
exports.requireSameClubOrAdmin = (req, res, next) => {
  const userClub = req.user.club;
  const userDistrict = req.user.district;
  const targetClub = req.body.club || req.params.club;
  const targetDistrict = req.body.district || req.params.district;

  if (req.user.role === 'admin') {
    return next();
  }

  if (userClub === targetClub && userDistrict === targetDistrict) {
    return next();
  }

  res.status(403).json({
    success: false,
    message: 'Not authorized to access resources from other clubs/districts'
  });
};