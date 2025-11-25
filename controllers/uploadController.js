// controllers/uploadController.js
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');

// @desc    Upload image to Cloudinary
// @route   POST /api/upload/image
// @access  Private
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    console.log(`📤 Uploading file: ${req.file.filename}`);

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.path, 'leoconnect');

    // Delete local file after upload
    fs.unlinkSync(req.file.path);

    console.log(`✅ Image uploaded successfully: ${result.secure_url}`);

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      imageUrl: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      bytes: result.bytes
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    
    // Clean up local file if exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Image upload failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Upload multiple images
// @route   POST /api/upload/images
// @access  Private
exports.uploadMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    console.log(`📤 Uploading ${req.files.length} files`);

    const uploadResults = [];

    for (const file of req.files) {
      try {
        const result = await uploadToCloudinary(file.path, 'leoconnect');
        
        // Delete local file after upload
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
      message: `${uploadResults.length} images uploaded successfully`,
      images: uploadResults
    });

  } catch (error) {
    console.error('❌ Multiple upload error:', error);
    
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
      message: 'Image upload failed'
    });
  }
};

// @desc    Delete image from Cloudinary
// @route   DELETE /api/upload/image
// @access  Private
exports.deleteImage = async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required'
      });
    }

    const result = await deleteFromCloudinary(publicId);

    if (result.result !== 'ok') {
      return res.status(400).json({
        success: false,
        message: 'Failed to delete image'
      });
    }

    console.log(`🗑️ Image deleted: ${publicId}`);

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image'
    });
  }
};

// @desc    Get upload statistics
// @route   GET /api/upload/stats
// @access  Private (Admin only)
exports.getUploadStats = async (req, res) => {
  try {
    // This would typically query your database for upload statistics
    // For now, returning basic stats
    const stats = {
      totalUploads: 0, // You'd count from your database
      storageUsed: '0 MB',
      popularFormats: ['jpg', 'png'],
      uploadsThisMonth: 0
    };

    res.status(200).json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Get upload stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get upload statistics'
    });
  }
};