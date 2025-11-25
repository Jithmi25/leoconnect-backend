// controllers/eventController.js
const Event = require('../models/Event');
const User = require('../models/User');

// @desc    Get all events
// @route   GET /api/events
// @access  Private
exports.getEvents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      club,
      district,
      status,
      upcoming = false
    } = req.query;

    // Build filter object
    const filter = { isPublic: true };
    
    if (club) filter.club = club;
    if (district) filter.district = district;
    if (status) filter.status = status;
    
    if (upcoming === 'true') {
      filter.date = { $gte: new Date() };
    }

    const events = await Event.find(filter)
      .populate('attendees.user', 'fullName displayName profilePhoto club district')
      .populate('createdBy', 'fullName displayName profilePhoto')
      .sort({ date: 1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Event.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: events.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      events
    });

  } catch (error) {
    console.error('❌ Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events'
    });
  }
};

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Private
exports.getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('attendees.user', 'fullName displayName profilePhoto club district')
      .populate('createdBy', 'fullName displayName profilePhoto');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.status(200).json({
      success: true,
      event
    });

  } catch (error) {
    console.error('❌ Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event'
    });
  }
};

// @desc    Create new event
// @route   POST /api/events
// @access  Private (Admin/Webmaster only)
exports.createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      startTime,
      endTime,
      location,
      address,
      serviceHours,
      maxAttendees,
      registrationDeadline,
      images
    } = req.body;

    const event = await Event.create({
      title,
      description,
      date,
      startTime,
      endTime,
      location,
      address,
      serviceHours,
      maxAttendees,
      registrationDeadline,
      images,
      hostClub: req.user.club,
      district: req.user.district,
      createdBy: req.user.id
    });

    await event.populate('createdBy', 'fullName displayName profilePhoto');

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event
    });

  } catch (error) {
    console.error('❌ Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create event'
    });
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (Admin/Webmaster only)
exports.updateEvent = async (req, res) => {
  try {
    let event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user is admin or event creator
    if (event.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this event'
      });
    }

    event = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('attendees.user', 'fullName displayName profilePhoto club district')
     .populate('createdBy', 'fullName displayName profilePhoto');

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      event
    });

  } catch (error) {
    console.error('❌ Update event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update event'
    });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (Admin/Webmaster only)
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user is admin or event creator
    if (event.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this event'
      });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete event'
    });
  }
};

// @desc    Register for event
// @route   POST /api/events/:id/register
// @access  Private
exports.registerForEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if event is in the future
    if (new Date(event.date) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot register for past events'
      });
    }

    // Check registration deadline
    if (event.registrationDeadline && new Date(event.registrationDeadline) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Registration deadline has passed'
      });
    }

    // Check if user is already registered
    if (event.isUserRegistered(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'Already registered for this event'
      });
    }

    // Check if event is full
    if (event.maxAttendees && event.attendees.length >= event.maxAttendees) {
      return res.status(400).json({
        success: false,
        message: 'Event is full'
      });
    }

    // Register user
    event.attendees.push({
      user: req.user.id,
      registeredAt: new Date()
    });

    await event.save();
    await event.populate('attendees.user', 'fullName displayName profilePhoto club district');

    res.status(200).json({
      success: true,
      message: 'Successfully registered for event',
      attendeesCount: event.attendees.length
    });

  } catch (error) {
    console.error('❌ Event registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register for event'
    });
  }
};

// @desc    Unregister from event
// @route   POST /api/events/:id/unregister
// @access  Private
exports.unregisterFromEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Remove user from attendees
    event.attendees = event.attendees.filter(
      attendee => attendee.user.toString() !== req.user.id
    );

    await event.save();

    res.status(200).json({
      success: true,
      message: 'Successfully unregistered from event',
      attendeesCount: event.attendees.length
    });

  } catch (error) {
    console.error('❌ Event unregistration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unregister from event'
    });
  }
};