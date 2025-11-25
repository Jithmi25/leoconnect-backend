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
  unregisterFromEvent
} = require('../controllers/eventController');
const { protect, authorize } = require('../middleware/auth');
const { requireWebmaster, requireOwnershipOrAdmin } = require('../middleware/roleCheck');

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
router.put('/:id', requireOwnershipOrAdmin('Event'), updateEvent);

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (Webmaster/Admin only)
router.delete('/:id', requireOwnershipOrAdmin('Event'), deleteEvent);

// @desc    Register for event
// @route   POST /api/events/:id/register
// @access  Private
router.post('/:id/register', registerForEvent);

// @desc    Unregister from event
// @route   POST /api/events/:id/unregister
// @access  Private
router.post('/:id/unregister', unregisterFromEvent);

// @desc    Get user's registered events
// @route   GET /api/events/my/registered
// @access  Private
router.get('/my/registered', async (req, res) => {
  try {
    const Event = require('../models/Event');
    const { page = 1, limit = 10 } = req.query;

    const events = await Event.find({
      'attendees.user': req.user.id
    })
      .populate('createdBy', 'fullName displayName profilePhoto')
      .sort({ date: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Event.countDocuments({
      'attendees.user': req.user.id
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

// @desc    Get upcoming events
// @route   GET /api/events/upcoming/all
// @access  Private
router.get('/upcoming/all', async (req, res) => {
  try {
    const Event = require('../models/Event');
    const { limit = 5 } = req.query;

    const events = await Event.find({
      date: { $gte: new Date() },
      isPublic: true
    })
      .populate('createdBy', 'fullName displayName profilePhoto')
      .sort({ date: 1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: events.length,
      events
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming events'
    });
  }
});

// @desc    Get events by club
// @route   GET /api/events/club/:clubName
// @access  Private
router.get('/club/:clubName', async (req, res) => {
  try {
    const Event = require('../models/Event');
    const { clubName } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const events = await Event.find({
      hostClub: new RegExp(clubName, 'i'),
      isPublic: true
    })
      .populate('createdBy', 'fullName displayName profilePhoto')
      .sort({ date: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Event.countDocuments({
      hostClub: new RegExp(clubName, 'i'),
      isPublic: true
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
      message: 'Failed to fetch club events'
    });
  }
});

module.exports = router;