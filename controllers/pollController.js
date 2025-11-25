// controllers/pollController.js
const Poll = require('../models/Poll');

// @desc    Get all polls
// @route   GET /api/polls
// @access  Private
exports.getPolls = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      club,
      district,
      status = 'active'
    } = req.query;

    // Build filter object
    const filter = { isActive: true };
    
    if (club) filter.club = club;
    if (district) filter.district = district;
    
    if (status === 'active') {
      filter.endDate = { $gte: new Date() };
    } else if (status === 'ended') {
      filter.endDate = { $lt: new Date() };
    }

    const polls = await Poll.find(filter)
      .populate('createdBy', 'fullName displayName profilePhoto club district role')
      .populate('votes.user', 'fullName displayName profilePhoto')
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Poll.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: polls.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      polls
    });

  } catch (error) {
    console.error('❌ Get polls error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch polls'
    });
  }
};

// @desc    Get single poll
// @route   GET /api/polls/:id
// @access  Private
exports.getPoll = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id)
      .populate('createdBy', 'fullName displayName profilePhoto club district role')
      .populate('votes.user', 'fullName displayName profilePhoto');

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found'
      });
    }

    res.status(200).json({
      success: true,
      poll
    });

  } catch (error) {
    console.error('❌ Get poll error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch poll'
    });
  }
};

// @desc    Create new poll
// @route   POST /api/polls
// @access  Private (Admin/Webmaster only)
exports.createPoll = async (req, res) => {
  try {
    const {
      question,
      description,
      options,
      endDate,
      isPublic = true,
      allowMultiple = false,
      isPinned = false
    } = req.body;

    if (!options || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least two options are required'
      });
    }

    const poll = await Poll.create({
      question,
      description,
      options: options.map(opt => ({ text: opt })),
      endDate,
      isPublic,
      allowMultiple,
      isPinned,
      createdBy: req.user.id,
      club: req.user.club,
      district: req.user.district
    });

    await poll.populate('createdBy', 'fullName displayName profilePhoto club district role');

    res.status(201).json({
      success: true,
      message: 'Poll created successfully',
      poll
    });

  } catch (error) {
    console.error('❌ Create poll error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create poll'
    });
  }
};

// @desc    Vote on poll
// @route   POST /api/polls/:id/vote
// @access  Private
exports.voteOnPoll = async (req, res) => {
  try {
    const { optionIndex } = req.body;

    const poll = await Poll.findById(req.params.id);

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found'
      });
    }

    // Check if poll is still active
    if (new Date(poll.endDate) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Poll has ended'
      });
    }

    // Check if option index is valid
    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid option'
      });
    }

    // Check if user has already voted
    const existingVote = poll.votes.find(
      vote => vote.user.toString() === req.user.id
    );

    if (existingVote && !poll.allowMultiple) {
      return res.status(400).json({
        success: false,
        message: 'You have already voted on this poll'
      });
    }

    if (existingVote && poll.allowMultiple) {
      // Update existing vote
      existingVote.optionIndex = optionIndex;
    } else {
      // Add new vote
      poll.votes.push({
        user: req.user.id,
        optionIndex
      });
    }

    // Update option votes count
    poll.options[optionIndex].votes += 1;

    await poll.save();
    await poll.populate('votes.user', 'fullName displayName profilePhoto');

    res.status(200).json({
      success: true,
      message: 'Vote submitted successfully',
      totalVotes: poll.votes.length
    });

  } catch (error) {
    console.error('❌ Vote error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit vote'
    });
  }
};

// @desc    Get poll results
// @route   GET /api/polls/:id/results
// @access  Private
exports.getPollResults = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id)
      .select('question options votes endDate totalVotes');

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found'
      });
    }

    // Calculate results
    const results = poll.options.map(option => ({
      text: option.text,
      votes: option.votes,
      percentage: poll.totalVotes > 0 ? (option.votes / poll.totalVotes) * 100 : 0
    }));

    res.status(200).json({
      success: true,
      question: poll.question,
      totalVotes: poll.totalVotes,
      results,
      hasEnded: new Date(poll.endDate) < new Date()
    });

  } catch (error) {
    console.error('❌ Get poll results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch poll results'
    });
  }
};