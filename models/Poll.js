// models/Poll.js
const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  votes: {
    type: Number,
    default: 0
  }
});

const voteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  optionIndex: {
    type: Number,
    required: true,
    min: 0
  },
  votedAt: {
    type: Date,
    default: Date.now
  }
});

const pollSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  options: [optionSchema],
  votes: [voteSchema],
  endDate: {
    type: Date,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  club: {
    type: String,
    required: true
  },
  district: {
    type: String,
    required: true
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  allowMultiple: {
    type: Boolean,
    default: false
  },
  showResults: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
pollSchema.index({ club: 1, district: 1 });
pollSchema.index({ endDate: 1 });
pollSchema.index({ isActive: 1, isPinned: -1, createdAt: -1 });

// Virtual for total votes
pollSchema.virtual('totalVotes').get(function() {
  return this.votes.length;
});

// Virtual to check if poll has ended
pollSchema.virtual('hasEnded').get(function() {
  return new Date() > this.endDate;
});

// Method to check if user has voted
pollSchema.methods.hasUserVoted = function(userId) {
  return this.votes.some(vote => vote.user.toString() === userId.toString());
};

// Pre-save middleware to update option votes count
pollSchema.pre('save', function(next) {
  // Reset all option votes
  this.options.forEach(option => {
    option.votes = 0;
  });

  // Count votes for each option
  this.votes.forEach(vote => {
    if (this.options[vote.optionIndex]) {
      this.options[vote.optionIndex].votes += 1;
    }
  });

  next();
});

module.exports = mongoose.model('Poll', pollSchema);