// utils/authUtils.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Generate JWT token
 * @param {string} userId - User ID
 * @returns {string} JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

/**
 * Extract token from request header
 * @param {Object} req - Express request object
 * @returns {string|null} Token or null
 */
const getTokenFromHeader = (req) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
};

/**
 * Check if user has required role
 * @param {Object} user - User object
 * @param {string|Array} requiredRoles - Required role(s)
 * @returns {boolean} Has permission
 */
const hasRole = (user, requiredRoles) => {
  if (!user || !user.role) return false;
  
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  return roles.includes(user.role);
};

/**
 * Check if user can access resource (same club/district or admin)
 * @param {Object} user - User object
 * @param {string} resourceClub - Resource club
 * @param {string} resourceDistrict - Resource district
 * @returns {boolean} Can access
 */
const canAccessResource = (user, resourceClub, resourceDistrict) => {
  if (!user) return false;
  
  // Admin can access everything
  if (user.role === 'admin') return true;
  
  // Webmasters and members can access their club/district resources
  return user.club === resourceClub && user.district === resourceDistrict;
};

/**
 * Generate random verification code
 * @param {number} length - Code length
 * @returns {string} Verification code
 */
const generateVerificationCode = (length = 6) => {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return code;
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid email
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const isValid = password.length >= minLength &&
                  hasUpperCase &&
                  hasLowerCase &&
                  hasNumbers &&
                  hasSpecialChar;

  const issues = [];
  if (password.length < minLength) issues.push(`At least ${minLength} characters`);
  if (!hasUpperCase) issues.push('At least one uppercase letter');
  if (!hasLowerCase) issues.push('At least one lowercase letter');
  if (!hasNumbers) issues.push('At least one number');
  if (!hasSpecialChar) issues.push('At least one special character');

  return {
    isValid,
    issues,
    score: calculatePasswordStrength(password)
  };
};

/**
 * Calculate password strength score (0-100)
 * @param {string} password - Password to score
 * @returns {number} Strength score
 */
const calculatePasswordStrength = (password) => {
  let score = 0;
  
  // Length score
  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 15;
  
  // Character variety score
  if (/[A-Z]/.test(password)) score += 15;
  if (/[a-z]/.test(password)) score += 15;
  if (/\d/.test(password)) score += 15;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 15;
  
  return Math.min(score, 100);
};

/**
 * Sanitize user input for security
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Generate secure random string
 * @param {number} length - String length
 * @returns {string} Random string
 */
const generateRandomString = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const crypto = require('crypto');
  const randomBytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  
  return result;
};

/**
 * Check if token is about to expire (within 7 days)
 * @param {string} token - JWT token
 * @returns {boolean} Needs refresh
 */
const needsTokenRefresh = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return false;
    
    const expirationTime = decoded.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    
    return (expirationTime - currentTime) < sevenDays;
  } catch (error) {
    return false;
  }
};

module.exports = {
  generateToken,
  verifyToken,
  getTokenFromHeader,
  hasRole,
  canAccessResource,
  generateVerificationCode,
  isValidEmail,
  validatePassword,
  calculatePasswordStrength,
  sanitizeInput,
  generateRandomString,
  needsTokenRefresh
};