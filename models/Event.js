// models/Event.js
const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  organization: {
    type: String,
    required: [true, 'Please add an organization'],
    trim: true
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  club: {
    type: String,
    required: [true, 'Please add a club'],
    trim: true
  },
  district: {
    type: String,
    trim: true
  },
  eventType: {
    type: String,
    enum: ['workshop', 'seminar', 'conference', 'social', 'service', 'fundraiser', 'sports', 'other'],
    default: 'other'
  },
  date: {
    type: Date,
    required: [true, 'Please add an event date']
  },
  time: {
    type: String,
    required: [true, 'Please add an event time']
  },
  endDate: {
    type: Date
  },
  endTime: {
    type: String
  },
  location: {
    type: String,
    required: [true, 'Please add a location']
  },
  address: {
    type: String
  },
  city: {
    type: String
  },
  coordinates: {
    lat: Number,
    lng: Number
  },
  imageUrl: {
    type: String,
    default: 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg'
  },
  badge: {
    type: String,
    enum: ['featured', 'popular', 'new', 'exclusive', null],
    default: null
  },
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  maxAttendees: {
    type: Number,
    default: 0 // 0 means unlimited
  },
  currentAttendees: {
    type: Number,
    default: 0
  },
  registeredUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  attendees: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    attended: {
      type: Boolean,
      default: false
    },
    checkInTime: Date,
    certificateIssued: {
      type: Boolean,
      default: false
    },
    certificateId: String
  }],
  gallery: [{
    url: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    caption: String
  }],
  certificates: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    certificateUrl: String,
    issuedAt: {
      type: Date,
      default: Date.now
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  category: {
    type: String,
    enum: ['national', 'district', 'club', 'zone', 'multi-district'],
    default: 'club'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  registrationOpen: {
    type: Boolean,
    default: true
  },
  registrationDeadline: Date,
  fee: {
    amount: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'LKR'
    }
  },
  tags: [String],
  shareCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt on save
EventSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Event', EventSchema);