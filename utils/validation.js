// utils/validation.js
const mongoose = require('mongoose');

/**
 * Validate MongoDB ObjectId
 * @param {string} id - ID to validate
 * @returns {boolean} Is valid ObjectId
 */
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Validate required fields in request body
 * @param {Object} body - Request body
 * @param {Array} requiredFields - Required field names
 * @returns {Object} Validation result
 */
const validateRequiredFields = (body, requiredFields) => {
  const missingFields = [];
  const errors = [];

  requiredFields.forEach(field => {
    if (!body[field] && body[field] !== 0) {
      missingFields.push(field);
      errors.push(`${field} is required`);
    }
  });

  return {
    isValid: missingFields.length === 0,
    missingFields,
    errors
  };
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {Object} Validation result
 */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);
  
  return {
    isValid,
    error: isValid ? null : 'Invalid email format'
  };
};

/**
 * Validate phone number (Sri Lankan format)
 * @param {string} phone - Phone number to validate
 * @returns {Object} Validation result
 */
const validatePhone = (phone) => {
  // Sri Lankan phone number format: +94 XX XXX XXXX or 0XX XXX XXXX
  const phoneRegex = /^(?:\+94|0)?(7[0-9]|70|71|72|74|75|76|77|78|79|11|21|23|24|25|26|27|31|32|33|34|35|36|37|38|41|45|47|51|52|54|55|57|63|65|66|67|81|91)[0-9]{7}$/;
  const cleanPhone = phone.replace(/\s+/g, '');
  const isValid = phoneRegex.test(cleanPhone);
  
  return {
    isValid,
    error: isValid ? null : 'Invalid Sri Lankan phone number format',
    formatted: isValid ? cleanPhone.replace(/^0/, '+94') : null
  };
};

/**
 * Validate date string
 * @param {string} dateString - Date string to validate
 * @param {boolean} futureOnly - Only allow future dates
 * @returns {Object} Validation result
 */
const validateDate = (dateString, futureOnly = false) => {
  const date = new Date(dateString);
  const isValid = !isNaN(date.getTime());
  
  let error = null;
  if (!isValid) {
    error = 'Invalid date format';
  } else if (futureOnly && date < new Date()) {
    error = 'Date must be in the future';
  }

  return {
    isValid: isValid && (!futureOnly || date >= new Date()),
    error,
    date: isValid ? date : null
  };
};

/**
 * Validate time string (HH:MM format)
 * @param {string} timeString - Time string to validate
 * @returns {Object} Validation result
 */
const validateTime = (timeString) => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  const isValid = timeRegex.test(timeString);
  
  return {
    isValid,
    error: isValid ? null : 'Invalid time format (HH:MM)'
  };
};

/**
 * Validate file upload
 * @param {Object} file - File object
 * @param {Array} allowedTypes - Allowed MIME types
 * @param {number} maxSize - Maximum file size in bytes
 * @returns {Object} Validation result
 */
const validateFile = (file, allowedTypes = [], maxSize = 5 * 1024 * 1024) => {
  const errors = [];

  if (!file) {
    return {
      isValid: false,
      errors: ['No file provided']
    };
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    errors.push(`File size must be less than ${maxSizeMB}MB`);
  }

  // Check file type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
    errors.push(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
const validatePassword = (password) => {
  const minLength = 8;
  const requirements = {
    length: password.length >= minLength,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };

  const errors = [];
  if (!requirements.length) errors.push(`At least ${minLength} characters`);
  if (!requirements.uppercase) errors.push('At least one uppercase letter');
  if (!requirements.lowercase) errors.push('At least one lowercase letter');
  if (!requirements.number) errors.push('At least one number');
  if (!requirements.special) errors.push('At least one special character');

  const strength = Object.values(requirements).filter(Boolean).length;
  const strengthPercentage = (strength / Object.keys(requirements).length) * 100;

  return {
    isValid: errors.length === 0,
    errors,
    strength: strengthPercentage,
    requirements
  };
};

/**
 * Validate club name format
 * @param {string} clubName - Club name to validate
 * @returns {Object} Validation result
 */
const validateClubName = (clubName) => {
  const clubRegex = /^[A-Za-z0-9\s\-&.'()]{2,50}$/;
  const isValid = clubRegex.test(clubName);
  
  return {
    isValid,
    error: isValid ? null : 'Club name can only contain letters, numbers, spaces, and basic punctuation (2-50 characters)'
  };
};

/**
 * Validate district code format (e.g., "306 D01")
 * @param {string} district - District code to validate
 * @returns {Object} Validation result
 */
const validateDistrict = (district) => {
  const districtRegex = /^[0-9]{3}\s?[A-Z]?[0-9]{1,2}$/i;
  const isValid = districtRegex.test(district);
  
  return {
    isValid,
    error: isValid ? null : 'District must be in format like "306 D01" or "306A2"'
  };
};

/**
 * Validate service hours (positive number, reasonable maximum)
 * @param {number} hours - Service hours to validate
 * @returns {Object} Validation result
 */
const validateServiceHours = (hours) => {
  const numHours = Number(hours);
  const isValid = !isNaN(numHours) && numHours > 0 && numHours <= 1000;
  
  return {
    isValid,
    error: isValid ? null : 'Service hours must be a positive number between 0.5 and 1000'
  };
};

/**
 * Validate poll options
 * @param {Array} options - Poll options array
 * @returns {Object} Validation result
 */
const validatePollOptions = (options) => {
  const errors = [];

  if (!Array.isArray(options) || options.length < 2) {
    errors.push('At least two options are required');
  }

  if (options.length > 10) {
    errors.push('Maximum 10 options allowed');
  }

  options.forEach((option, index) => {
    if (typeof option !== 'string' || option.trim().length === 0) {
      errors.push(`Option ${index + 1} cannot be empty`);
    }
    if (option.length > 200) {
      errors.push(`Option ${index + 1} is too long (max 200 characters)`);
    }
  });

  // Check for duplicate options
  const uniqueOptions = [...new Set(options.map(opt => opt.toLowerCase().trim()))];
  if (uniqueOptions.length !== options.length) {
    errors.push('Duplicate options are not allowed');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Sanitize and validate user input for XSS protection
 * @param {string} input - Input to sanitize
 * @param {Object} options - Sanitization options
 * @returns {Object} Sanitization result
 */
const sanitizeAndValidateInput = (input, options = {}) => {
  const {
    maxLength = 1000,
    allowHtml = false,
    fieldName = 'Field'
  } = options;

  if (typeof input !== 'string') {
    return {
      isValid: false,
      error: `${fieldName} must be a string`,
      sanitized: ''
    };
  }

  let sanitized = input.trim();

  // Check length
  if (sanitized.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} must not exceed ${maxLength} characters`,
      sanitized: sanitized.substring(0, maxLength)
    };
  }

  // Basic XSS protection (if HTML not allowed)
  if (!allowHtml) {
    sanitized = sanitized
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  return {
    isValid: true,
    sanitized,
    error: null
  };
};

/**
 * Validate event registration data
 * @param {Object} data - Registration data
 * @returns {Object} Validation result
 */
const validateEventRegistration = (data) => {
  const errors = [];
  const requiredFields = ['fullName', 'contactNumber', 'email'];

  // Check required fields
  requiredFields.forEach(field => {
    if (!data[field]) {
      errors.push(`${field} is required`);
    }
  });

  // Validate email
  if (data.email) {
    const emailValidation = validateEmail(data.email);
    if (!emailValidation.isValid) {
      errors.push(emailValidation.error);
    }
  }

  // Validate phone
  if (data.contactNumber) {
    const phoneValidation = validatePhone(data.contactNumber);
    if (!phoneValidation.isValid) {
      errors.push(phoneValidation.error);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Generic validation middleware creator
 * @param {Object} validationRules - Validation rules
 * @returns {Function} Express middleware
 */
const createValidator = (validationRules) => {
  return (req, res, next) => {
    const errors = [];

    Object.keys(validationRules).forEach(field => {
      const rules = validationRules[field];
      const value = req.body[field];

      // Required check
      if (rules.required && (!value && value !== 0)) {
        errors.push(`${field} is required`);
        return;
      }

      // Skip further validation if field is empty and not required
      if (!value && !rules.required) {
        return;
      }

      // Type check
      if (rules.type && typeof value !== rules.type) {
        errors.push(`${field} must be a ${rules.type}`);
        return;
      }

      // Custom validation function
      if (rules.validate && typeof rules.validate === 'function') {
        const customValidation = rules.validate(value);
        if (!customValidation.isValid) {
          errors.push(`${field}: ${customValidation.error}`);
        }
      }

      // Min length check
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${field} must be at least ${rules.minLength} characters`);
      }

      // Max length check
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${field} must not exceed ${rules.maxLength} characters`);
      }

      // Pattern match
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${field} format is invalid`);
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    next();
  };
};

module.exports = {
  isValidObjectId,
  validateRequiredFields,
  validateEmail,
  validatePhone,
  validateDate,
  validateTime,
  validateFile,
  validatePassword,
  validateClubName,
  validateDistrict,
  validateServiceHours,
  validatePollOptions,
  sanitizeAndValidateInput,
  validateEventRegistration,
  createValidator
};