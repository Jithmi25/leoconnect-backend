// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Import database connection
const connectDB = require('./config/database.js');

// Import rate limiters
const { apiLimiter, authLimiter, uploadLimiter } = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const eventRoutes = require('./routes/events');
const pollRoutes = require('./routes/polls');
const uploadRoutes = require('./routes/upload');

// Connect to database
connectDB();

const app = express();

// ========================
// Security Middleware
// ========================
app.use(helmet());

// ========================
// CORS Configuration
// ========================
app.use(cors({
  origin: [
    process.env.CLIENT_BASE_URL,
    'http://localhost:3000',
    'http://localhost:19006',
    'exp://localhost:19000'
  ].filter(Boolean),
  credentials: true
}));

// ========================
// Logging Middleware
// ========================
app.use(morgan('dev'));

// ========================
// Body Parsing Middleware
// ========================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ========================
// Rate Limiting
// ========================
app.use('/api/', apiLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/upload', uploadLimiter);

// ========================
// Static Files
// ========================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========================
// Health Check & API Info
// ========================
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🚀 LeoConnect Backend API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// API documentation route
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to LeoConnect API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users', 
      posts: '/api/posts',
      events: '/api/events',
      polls: '/api/polls',
      upload: '/api/upload'
    }
  });
});

// ========================
// API Routes
// ========================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/upload', uploadRoutes);

// ========================
// 404 Handler for ALL routes - FIXED (no asterisk)
// ========================
app.use((req, res) => {
  if (req.originalUrl.startsWith('/api/')) {
    res.status(404).json({
      success: false,
      message: `API endpoint ${req.originalUrl} not found`
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'Route not found. Use /api for API endpoints.'
    });
  }
});

// ========================
// Global Error Handling Middleware
// ========================
app.use((err, req, res, next) => {
  console.error('🚨 Global Error Handler:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: messages
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
  🚀 LeoConnect Backend Server Started!
  ======================================
  📡 Environment: ${process.env.NODE_ENV || 'development'}
  🌐 Server URL: http://localhost:${PORT}
  📊 API Health: http://localhost:${PORT}/api/health
  ⏰ Started at: ${new Date().toLocaleString()}
  ======================================
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

module.exports = app;