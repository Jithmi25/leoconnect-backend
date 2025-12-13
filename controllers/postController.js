// controllers/postController.js
const Post = require('../models/Post');
const User = require('../models/User');

// @desc    Get all posts
// @route   GET /api/posts
// @access  Private
exports.getPosts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      club,
      district,
      category,
      author
    } = req.query;

    // Build filter object
    const filter = { isPublic: true };
    
    if (club) filter.club = club;
    if (district) filter.district = district;
    if (category) filter.category = category;
    if (author) filter.author = author;

    const posts = await Post.find(filter)
      .populate('author', 'fullName displayName profilePhoto club district role')
      .populate('comments.user', 'fullName displayName profilePhoto')
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Post.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: posts.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      posts
    });

  } catch (error) {
    console.error('❌ Get posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch posts'
    });
  }
};

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Private
exports.getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'fullName displayName profilePhoto club district role')
      .populate('comments.user', 'fullName displayName profilePhoto')
      .populate('likes', 'fullName displayName profilePhoto');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Increment view count
    post.viewCount += 1;
    await post.save();

    res.status(200).json({
      success: true,
      post
    });

  } catch (error) {
    console.error('❌ Get post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch post'
    });
  }
};

// @desc    Create new post
// @route   POST /api/posts
// @access  Private
exports.createPost = async (req, res) => {
  try {
    const { title, content, category, tags, images, isPublic = true } = req.body;

    const post = await Post.create({
      title,
      content,
      category,
      tags,
      images,
      isPublic,
      author: req.user.id,
      club: req.user.club,
      district: req.user.district
    });

    await post.populate('author', 'fullName displayName profilePhoto club district role');

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post
    });

  } catch (error) {
    console.error('❌ Create post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create post'
    });
  }
};

// @desc    Update post
// @route   PUT /api/posts/:id
// @access  Private
exports.updatePost = async (req, res) => {
  try {
    let post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check ownership or admin role
    if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this post'
      });
    }

    post = await Post.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('author', 'fullName displayName profilePhoto club district role');

    res.status(200).json({
      success: true,
      message: 'Post updated successfully',
      post
    });

  } catch (error) {
    console.error('❌ Update post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update post'
    });
  }
};

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check ownership or admin role
    if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this post'
      });
    }

    await Post.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete post'
    });
  }
};

// @desc    Like/unlike post
// @route   POST /api/posts/:id/like
// @access  Private
exports.likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const isLiked = post.likes.includes(req.user.id);

    if (isLiked) {
      // Unlike
      post.likes = post.likes.filter(
        like => like.toString() !== req.user.id
      );
    } else {
      // Like
      post.likes.push(req.user.id);
    }

    await post.save();

    res.status(200).json({
      success: true,
      message: isLiked ? 'Post unliked' : 'Post liked',
      likesCount: post.likes.length,
      isLiked: !isLiked
    });

  } catch (error) {
    console.error('❌ Like post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to like post'
    });
  }
};

// @desc    Add comment to post
// @route   POST /api/posts/:id/comment
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required'
      });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    post.comments.push({
      user: req.user.id,
      text
    });

    await post.save();
    await post.populate('comments.user', 'fullName displayName profilePhoto');

    const newComment = post.comments[post.comments.length - 1];

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      comment: newComment
    });

  } catch (error) {
    console.error('❌ Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment'
    });
  }
};

// @desc    Share post
// @route   POST /api/posts/:id/share
// @access  Private
exports.sharePost = async (req, res) => {
  try {
    const { sharedTo, message } = req.body;

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Increment share count
    post.shares = (post.shares || 0) + 1;

    // Add to sharedBy array
    post.sharedBy = post.sharedBy || [];
    post.sharedBy.push({
      user: req.user.id,
      sharedAt: new Date(),
      sharedTo: sharedTo || 'public', // Can be 'public', 'club', 'private', etc.
      message: message || ''
    });

    await post.save();

    // If sharing creates a new post (like retweet), you can add that logic here
    // For now, we just increment the share count

    res.status(200).json({
      success: true,
      message: 'Post shared successfully',
      sharesCount: post.shares,
      shareId: post.sharedBy[post.sharedBy.length - 1]._id
    });

  } catch (error) {
    console.error('❌ Share post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to share post'
    });
  }
};