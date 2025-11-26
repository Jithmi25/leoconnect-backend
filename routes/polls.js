// routes/polls.js
const express = require('express');
const router = express.Router();
const {
  getPolls,
  getPoll,
  createPoll,
  voteOnPoll,
  getPollResults
} = require('../controllers/pollController');
const { protect, authorize } = require('../middleware/auth');
const { requireWebmaster, requireOwnershipOrWebmaster } = require('../middleware/roleCheck');

// All routes are protected
router.use(protect);

// @desc    Get all polls
// @route   GET /api/polls
// @access  Private
router.get('/', getPolls);

// @desc    Get single poll
// @route   GET /api/polls/:id
// @access  Private
router.get('/:id', getPoll);

// @desc    Create new poll
// @route   POST /api/polls
// @access  Private (Webmaster/Admin only)
router.post('/', requireWebmaster, createPoll);

// @desc    Vote on poll
// @route   POST /api/polls/:id/vote
// @access  Private
router.post('/:id/vote', voteOnPoll);

// @desc    Get poll results
// @route   GET /api/polls/:id/results
// @access  Private
router.get('/:id/results', getPollResults);

// @desc    Get active polls
// @route   GET /api/polls/active/all
// @access  Private
router.get('/active/all', async (req, res) => {
  try {
    const Poll = require('../models/Poll');
    const { limit = 10 } = req.query;

    const polls = await Poll.find({
      endDate: { $gte: new Date() },
      isActive: true,
      isPublic: true
    })
      .populate('createdBy', 'fullName displayName profilePhoto club district role')
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: polls.length,
      polls
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active polls'
    });
  }
});

// @desc    Get user's voted polls
// @route   GET /api/polls/my/voted
// @access  Private
router.get('/my/voted', async (req, res) => {
  try {
    const Poll = require('../models/Poll');
    const { page = 1, limit = 10 } = req.query;

    const polls = await Poll.find({
      'votes.user': req.user.id
    })
      .populate('createdBy', 'fullName displayName profilePhoto club district role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Poll.countDocuments({
      'votes.user': req.user.id
    });

    res.status(200).json({
      success: true,
      count: polls.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      polls
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch voted polls'
    });
  }
});

// @desc    Update poll (Admin/Webmaster only)
// @route   PUT /api/polls/:id
// @access  Private (Webmaster/Admin only)
router.put('/:id', requireOwnershipOrWebmaster('Poll'), async (req, res) => {
  try {
    const Poll = require('../models/Poll');
    
    const poll = await Poll.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'fullName displayName profilePhoto club district role');

    res.status(200).json({
      success: true,
      message: 'Poll updated successfully',
      poll
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update poll'
    });
  }
});

// @desc    Delete poll (Admin/Webmaster only)
// @route   DELETE /api/polls/:id
// @access  Private (Webmaster/Admin only)
router.delete('/:id', requireOwnershipOrWebmaster('Poll'), async (req, res) => {
  try {
    const Poll = require('../models/Poll');
    
    await Poll.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Poll deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete poll'
    });
  }
});

module.exports = router;