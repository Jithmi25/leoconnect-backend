// routes/upload.js
const express = require('express');
const router = express.Router();
const {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  getUploadStats
} = require('../controllers/uploadController');
const { protect, authorize } = require('../middleware/auth');
const { upload, handleUploadErrors } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimiter');
const{ requireWebmaster } = require('../middleware/roleCheck.js');

// Apply rate limiting to upload routes
router.use(uploadLimiter);

// All routes are protected
router.use(protect);

// @desc    Upload single image
// @route   POST /api/upload/image
// @access  Private
router.post('/image', upload.single('image'), handleUploadErrors, uploadImage);

// @desc    Upload multiple images
// @route   POST /api/upload/images
// @access  Private
router.post('/images', upload.array('images', 5), handleUploadErrors, uploadMultipleImages);

// @desc    Delete image
// @route   DELETE /api/upload/image
// @access  Private
router.delete('/image', deleteImage);

// @desc    Get upload statistics (Admin only)
// @route   GET /api/upload/stats
// @access  Private (Admin only)
router.get('/stats', requireWebmaster, getUploadStats);

// @desc    Update user profile picture
// @route   POST /api/upload/profile-picture
// @access  Private
router.post('/profile-picture', upload.single('image'), handleUploadErrors, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Upload to Cloudinary
    const { uploadToCloudinary } = require('../config/cloudinary');
    const result = await uploadToCloudinary(req.file.path, 'leoconnect/profiles');

    // Delete local file
    const fs = require('fs');
    fs.unlinkSync(req.file.path);

    // Update user profile in database
    const User = require('../models/User');
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePhoto: result.secure_url },
      { new: true }
    ).select('-googleId -__v');

    const userResponse = {
      id: user._id,
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
      message: 'Profile picture updated successfully',
      imageUrl: result.secure_url,
      publicId: result.public_id,
      user: userResponse
    });

  } catch (error) {
    console.error('❌ Profile picture upload error:', error);
    
    // Clean up local file if exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update profile picture'
    });
  }
});

// @desc    Upload event images
// @route   POST /api/upload/event-images
// @access  Private (Webmaster/Admin only)
router.post('/event-images', requireWebmaster, upload.array('images', 10), handleUploadErrors, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided'
      });
    }

    const { uploadToCloudinary } = require('../config/cloudinary');
    const uploadResults = [];

    for (const file of req.files) {
      try {
        const result = await uploadToCloudinary(file.path, 'leoconnect/events');
        
        // Delete local file after upload
        const fs = require('fs');
        fs.unlinkSync(file.path);

        uploadResults.push({
          imageUrl: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          bytes: result.bytes,
          originalName: file.originalname
        });

      } catch (fileError) {
        console.error(`❌ Failed to upload ${file.originalname}:`, fileError);
        // Clean up local file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }

    if (uploadResults.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'All uploads failed'
      });
    }

    res.status(200).json({
      success: true,
      message: `${uploadResults.length} event images uploaded successfully`,
      images: uploadResults
    });

  } catch (error) {
    console.error('❌ Event images upload error:', error);
    
    // Clean up all local files
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload event images'
    });
  }
});

module.exports = router;