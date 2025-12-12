// routes/superAdmin.js
const express = require('express');
const router = express.Router();
const { protect, requireSuperAdmin } = require('../middleware/auth');
const {
  getDashboardOverview,
  getUserStatistics,
  getAllUsers,
  updateUserRole,
  getMarketplaceStats,
  getLeaderboard,
  getRoleHistory,
  getAnalytics,
  manageDistrict,
  manageClub
} = require('../controllers/superAdminController');

const District = require('../models/District');
const Club = require('../models/Club');

// Apply protection and super admin requirement to all routes
router.use(protect);
router.use(requireSuperAdmin);

// Dashboard
router.get('/dashboard', getDashboardOverview);

// User Management
router.get('/users', getAllUsers);
router.get('/users/stats', getUserStatistics);
router.put('/users/:id/role', updateUserRole);
router.get('/role-history', getRoleHistory);

// Marketplace
router.get('/marketplace/stats', getMarketplaceStats);

// Leaderboard
router.get('/leaderboard', getLeaderboard);

// Analytics
router.get('/analytics', getAnalytics);

// District Management - FIXED: Separate routes for create and update
router.post('/districts', (req, res) => manageDistrict(req, res)); // Create
router.put('/districts/:id', (req, res) => manageDistrict(req, res)); // Update
router.get('/districts', async (req, res) => {
  try {
    const districts = await District.find({ isActive: true })
      .sort({ name: 1 })
      .select('name code region logo');
    
    res.status(200).json({
      success: true,
      data: districts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch districts'
    });
  }
});

// Club Management - FIXED: Separate routes for create and update
router.post('/clubs', (req, res) => manageClub(req, res)); // Create
router.put('/clubs/:id', (req, res) => manageClub(req, res)); // Update

// Get clubs by district
router.get('/districts/:districtId/clubs', async (req, res) => {
  try {
    const { districtId } = req.params;
    
    const clubs = await Club.find({ 
      district: districtId,
      isActive: true 
    })
    .sort({ name: 1 })
    .select('name code logo');
    
    res.status(200).json({
      success: true,
      data: clubs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clubs'
    });
  }
});

// @desc    Get available roles
// @route   GET /api/super-admin/roles
// @access  Private (Super Admin)
router.get('/roles', (req, res) => {
  const roles = [
    { id: 'r1', name: 'Normal Member', level: 'Club' },
    { id: 'r2', name: 'Club President', level: 'Club' },
    { id: 'r3', name: 'District Secretary', level: 'District' },
    { id: 'r4', name: 'National Treasurer', level: 'National' },
    { id: 'r5', name: 'National President', level: 'National' },
    { id: 'r6', name: 'Vice President', level: 'Club' },
    { id: 'r7', name: 'Secretary', level: 'Club' },
    { id: 'r8', name: 'Treasurer', level: 'Club' },
    { id: 'r9', name: 'Webmaster', level: 'District' },
    { id: 'r10', name: 'Project Chairperson', level: 'Club' },
    { id: 'r11', name: 'super_admin', level: 'System' },
    { id: 'r12', name: 'webmaster', level: 'District' },
    { id: 'r13', name: 'leo_member', level: 'Club' }
  ];

  res.status(200).json({
    success: true,
    data: roles
  });
});

// @desc    Get system settings
// @route   GET /api/super-admin/settings
// @access  Private (Super Admin)
router.get('/settings', async (req, res) => {
  try {
    // This would typically fetch from a Settings model
    const settings = {
      platformName: 'LeoConnect',
      platformCountry: 'SRI LANKA',
      superAdminPasscode: process.env.SUPER_ADMIN_PASSCODE || '1234',
      maxProductsPerUser: 10,
      maxImagesPerProduct: 5,
      marketplaceEnabled: true,
      leaderboardEnabled: true,
      registrationEnabled: true,
      maintenanceMode: false,
      currentVersion: '1.0.0'
    };

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
});

// @desc    Get districts for filtering
// @route   GET /api/super-admin/filters/districts
// @access  Private (Super Admin)
router.get('/filters/districts', async (req, res) => {
  try {
    const districts = await District.find({ isActive: true })
      .sort({ name: 1 })
      .select('_id name code');
    
    res.status(200).json({
      success: true,
      data: districts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch districts for filters'
    });
  }
});

// @desc    Get clubs for filtering
// @route   GET /api/super-admin/filters/clubs
// @access  Private (Super Admin)
router.get('/filters/clubs', async (req, res) => {
  try {
    const clubs = await Club.find({ isActive: true })
      .sort({ name: 1 })
      .select('_id name district districtName');
    
    res.status(200).json({
      success: true,
      data: clubs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clubs for filters'
    });
  }
});

module.exports = router;