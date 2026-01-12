/**
 * Lokah — The Video Downloader
 * Main Server Entry Point
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./config');

// Import routes
const healthRoutes = require('./routes/health');
const videoRoutes = require('./routes/video');

// Import services
const cleanupService = require('./services/cleanupService');

const app = express();

// Ensure temp directory exists
if (!fs.existsSync(config.tempDir)) {
  fs.mkdirSync(config.tempDir, { recursive: true });
}

// CORS Configuration - Must be before all routes
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow any origin in development, or specific origins in production
    const allowedOrigins = [
      config.frontendUrl,
      'http://localhost:3000',
      'http://localhost:3001',
      // Allow all Vercel preview URLs
      /\.vercel\.app$/
    ];
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(null, true); // Allow all origins for now to debug
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  maxAge: 86400 // Cache preflight for 24 hours
};

// Apply CORS middleware FIRST - handles preflight automatically
app.use(cors(corsOptions));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy for IP detection
app.set('trust proxy', true);

// Routes
app.use('/health', healthRoutes);
app.use('/api', videoRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: config.appName,
    tagline: 'From link to usable content in seconds.',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      analyze: 'POST /api/analyze',
      process: 'POST /api/process',
      progress: 'GET /api/progress/:jobId',
      download: 'GET /api/download/:jobId',
      cleanup: 'DELETE /api/cleanup/:jobId'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(config.port, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎬 ${config.appName} — The Video Downloader              ║
║   "From link to usable content in seconds."               ║
║                                                           ║
║   Server running on http://localhost:${config.port}              ║
║   Health check: http://localhost:${config.port}/health           ║
║   Environment: ${config.env}                              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);

  // Start cleanup service
  cleanupService.start(5); // Every 5 minutes
});
