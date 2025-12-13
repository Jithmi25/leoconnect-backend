// controllers/eventController.js
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');

// @desc    Get all events
// @route   GET /api/events
// @access  Private
exports.getEvents = async (req, res) => {
  try {
    const { 
      status, 
      category, 
      club, 
      district, 
      eventType,
      page = 1,
      limit = 10
    } = req.query;

    const filter = { isPublic: true };
    
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (club) filter.club = club;
    if (district) filter.district = district;
    if (eventType) filter.eventType = eventType;

    const events = await Event.find(filter)
      .populate('organizer', 'fullName displayName profilePhoto')
      .sort({ date: 1 })
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
    console.error('Get events error:', error);
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
      .populate('organizer', 'fullName displayName profilePhoto club district role')
      .populate('registeredUsers', 'fullName displayName profilePhoto')
      .populate('attendees.user', 'fullName displayName profilePhoto')
      .populate('gallery.uploadedBy', 'fullName displayName profilePhoto');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Increment view count
    event.viewCount += 1;
    await event.save();

    res.status(200).json({
      success: true,
      event
    });

  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event'
    });
  }
};

// @desc    Create new event
// @route   POST /api/events
// @access  Private
exports.createEvent = async (req, res) => {
  try {
    const event = await Event.create({
      ...req.body,
      organizer: req.user.id,
      club: req.user.club,
      district: req.user.district
    });

    await event.populate('organizer', 'fullName displayName profilePhoto club district role');

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event
    });

  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create event'
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

    // Check if registration is open
    if (!event.registrationOpen) {
      return res.status(400).json({
        success: false,
        message: 'Registration is closed for this event'
      });
    }

    // Check if registration deadline has passed
    if (event.registrationDeadline && new Date() > event.registrationDeadline) {
      return res.status(400).json({
        success: false,
        message: 'Registration deadline has passed'
      });
    }

    // Check if event is full
    if (event.maxAttendees > 0 && event.currentAttendees >= event.maxAttendees) {
      return res.status(400).json({
        success: false,
        message: 'Event is full'
      });
    }

    // Check if already registered
    const existingRegistration = await EventRegistration.findOne({
      event: event._id,
      user: req.user.id
    });

    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: 'Already registered for this event'
      });
    }

    // Create registration
    const registration = await EventRegistration.create({
      event: event._id,
      user: req.user.id,
      status: 'registered',
      paymentStatus: event.fee.amount > 0 ? 'pending' : 'free'
    });

    // Update event attendee count
    event.currentAttendees += 1;
    event.registeredUsers.push(req.user.id);
    await event.save();

    res.status(201).json({
      success: true,
      message: 'Registered for event successfully',
      registration
    });

  } catch (error) {
    console.error('Event registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register for event'
    });
  }
};

// @desc    Share event
// @route   POST /api/events/:id/share
// @access  Private
exports.shareEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Increment share count
    event.shareCount += 1;
    await event.save();

    res.status(200).json({
      success: true,
      message: 'Event shared successfully',
      shareCount: event.shareCount
    });

  } catch (error) {
    console.error('Share event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to share event'
    });
  }
};

// @desc    Get user's registered events
// @route   GET /api/events/user/registered
// @access  Private
exports.getUserRegisteredEvents = async (req, res) => {
  try {
    const registrations = await EventRegistration.find({ 
      user: req.user.id 
    })
    .populate({
      path: 'event',
      populate: {
        path: 'organizer',
        select: 'fullName displayName profilePhoto'
      }
    })
    .sort({ registrationDate: -1 });

    res.status(200).json({
      success: true,
      count: registrations.length,
      registrations
    });

  } catch (error) {
    console.error('Get user events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user events'
    });
  }
};