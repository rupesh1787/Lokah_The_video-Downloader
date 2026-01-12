const express = require('express');
const router = express.Router();
const videoEngine = require('../services/videoEngine');
const cleanupService = require('../services/cleanupService');
const config = require('../config');

// GET /health - Health check endpoint
router.get('/', async (req, res) => {
  const ytdlp = await videoEngine.checkYtdlp();
  const ffmpeg = await videoEngine.checkFfmpeg();
  const tempStats = cleanupService.getStats();

  res.status(200).json({
    status: 'healthy',
    app: config.appName,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
    engines: {
      ytdlp,
      ffmpeg
    },
    storage: tempStats
  });
});

module.exports = router;
