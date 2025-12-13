// routes/events.js
const express = require('express');
const router = express.Router();
const {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  getEventRegistrations,
  getEventStats
} = require('../controllers/eventController');
const { protect, authorize } = require('../middleware/auth');
const { requireWebmaster, requireOwnershipOrWebmaster } = require('../middleware/roleCheck');

// All routes are protected
router.use(protect);

// @desc    Get all events
// @route   GET /api/events
// @access  Private
router.get('/', getEvents);

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Private
router.get('/:id', getEvent);

// @desc    Create new event
// @route   POST /api/events
// @access  Private (Webmaster/Admin only)
router.post('/', requireWebmaster, createEvent);

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (Webmaster/Admin only)
router.put('/:id', requireOwnershipOrWebmaster('Event'), updateEvent);

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (Webmaster/Admin only)
router.delete('/:id', requireOwnershipOrWebmaster('Event'), deleteEvent);

// @desc    Register for event
// @route   POST /api/events/:id/register
// @access  Private
router.post('/:id/register', registerForEvent);

// @desc    Get event registrations
// @route   GET /api/events/:id/registrations
// @access  Private (Webmaster/Admin only)
router.get('/:id/registrations', requireWebmaster, getEventRegistrations);

// @desc    Get event statistics
// @route   GET /api/events/:id/stats
// @access  Private (Webmaster/Admin only)
router.get('/:id/stats', requireWebmaster, getEventStats);

// @desc    Get user's registered events
// @route   GET /api/events/my/registered
// @access  Private
router.get('/my/registered', async (req, res) => {
  try {
    const Event = require('../models/Event');
    const { page = 1, limit = 10 } = req.query;

    const events = await Event.find({
      'registrations.user': req.user.id
    })
      .populate('createdBy', 'fullName displayName profilePhoto club district role')
      .sort({ date: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Event.countDocuments({
      'registrations.user': req.user.id
    });

    res.status(200).json({
      success: true,
      count: events.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      events
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch registered events'
    });
  }
});

module.exports = router;