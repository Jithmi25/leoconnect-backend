// routes/posts.js
const express = require('express');
const router = express.Router();
const {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  likePost,
  addComment
} = require('../controllers/postController');
const { protect, authorize } = require('../middleware/auth');
const { requireOwnershipOrAdmin } = require('../middleware/roleCheck');

// All routes are protected
router.use(protect);

// @desc    Get all posts
// @route   GET /api/posts
// @access  Private
router.get('/', getPosts);

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Private
router.get('/:id', getPost);

// @desc    Create new post
// @route   POST /api/posts
// @access  Private
router.post('/', createPost);

// @desc    Update post
// @route   PUT /api/posts/:id
// @access  Private
router.put('/:id', requireOwnershipOrAdmin('Post'), updatePost);

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private
router.delete('/:id', requireOwnershipOrAdmin('Post'), deletePost);

// @desc    Like/unlike post
// @route   POST /api/posts/:id/like
// @access  Private
router.post('/:id/like', likePost);

// @desc    Add comment to post
// @route   POST /api/posts/:id/comment
// @access  Private
router.post('/:id/comment', addComment);

// @desc    Get posts by club
// @route   GET /api/posts/club/:clubName
// @access  Private
router.get('/club/:clubName', async (req, res) => {
  try {
    const Post = require('../models/Post');
    const { clubName } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const posts = await Post.find({ 
      club: new RegExp(clubName, 'i'),
      isPublic: true 
    })
      .populate('author', 'fullName displayName profilePhoto club district role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Post.countDocuments({ 
      club: new RegExp(clubName, 'i'),
      isPublic: true 
    });

    res.status(200).json({
      success: true,
      count: posts.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      posts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch club posts'
    });
  }
});

// @desc    Get user's posts
// @route   GET /api/posts/user/:userId
// @access  Private
router.get('/user/:userId', async (req, res) => {
  try {
    const Post = require('../models/Post');
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const posts = await Post.find({ author: userId })
      .populate('author', 'fullName displayName profilePhoto club district role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Post.countDocuments({ author: userId });

    res.status(200).json({
      success: true,
      count: posts.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      posts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user posts'
    });
  }
});

module.exports = router;