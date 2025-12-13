// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Import database connection
const connectDB = require('./config/database.js');

// Import rate limiters - FIXED PATH
const { apiLimiter, authLimiter, uploadLimiter } = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const eventRoutes = require('./routes/events');
const pollRoutes = require('./routes/polls');
const uploadRoutes = require('./routes/upload');
const superAdminRoutes = require('./routes/superAdmin');

// Connect to database
connectDB();

const app = express();

// ========================
// CORS Configuration
// ========================
const allowedOrigins = [
  'http://localhost:8081', // React Native Metro bundler
  'http://localhost:19006', // Expo Web
  'exp://localhost:19000', // Expo
  'exp://192.168.1.100:19000', // Expo on local network
  'http://localhost:3000', // React web app
  process.env.CLIENT_BASE_URL // From env
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ]
};

// Apply CORS middleware to all routes
app.use(cors(corsOptions));

// ========================
// Security Middleware
// ========================
app.use(helmet());

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
// app.use('/api/', apiLimiter);
// app.use('/api/auth', authLimiter);
// app.use('/api/upload', uploadLimiter);

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
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      superAdmin: '/api/super-admin',
      posts: '/api/posts',
      events: '/api/events',
      polls: '/api/polls',
      upload: '/api/upload'
    },
    cors: {
      allowedOrigins: allowedOrigins
    }
  });
});

// CORS Test Endpoint
app.get('/api/cors-test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CORS test successful',
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
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
      superAdmin: '/api/super-admin',
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
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/upload', uploadRoutes);

// ========================
// 404 Handler
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

  // CORS Error
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS Error: Origin not allowed',
      origin: req.headers.origin,
      allowedOrigins: allowedOrigins
    });
  }

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
  🧪 CORS Test: http://localhost:${PORT}/api/cors-test
  👑 Super Admin API: /api/super-admin
  🔒 CORS Enabled for:
      ${allowedOrigins.map(origin => `      - ${origin}`).join('\n')}
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