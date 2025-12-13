// routes/notifications.js
const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
router.get('/', getNotifications);

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
router.put('/:id/read', markAsRead);

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
router.put('/read-all', markAllAsRead);

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
router.delete('/:id', deleteNotification);

// @desc    Get notification stats
// @route   GET /api/notifications/stats
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    
    const stats = await Notification.aggregate([
      {
        $match: { user: req.user._id }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: { $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] } },
          byType: { $push: { type: "$type", isRead: "$isRead" } }
        }
      },
      {
        $project: {
          total: 1,
          unread: 1,
          read: { $subtract: ["$total", "$unread"] }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      stats: stats[0] || { total: 0, unread: 0, read: 0 }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification stats'
    });
  }
});

module.exports = router;