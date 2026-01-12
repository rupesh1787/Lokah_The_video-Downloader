/**
 * Lokah Configuration
 * Centralized configuration from environment variables
 */

require('dotenv').config();
const path = require('path');

const config = {
  // App
  appName: process.env.APP_NAME || 'Lokah',
  env: process.env.APP_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,

  // Engine paths
  ytdlpPath: process.env.YTDLP_PATH || 'yt-dlp',
  ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',

  // File handling
  tempDir: path.resolve(process.env.TEMP_DIR || './temp'),
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) * 1024 * 1024 || 1024 * 1024 * 1024, // Convert MB to bytes
  jobExpiryMinutes: parseInt(process.env.JOB_EXPIRY_MINUTES, 10) || 15,

  // AI
  openaiApiKey: process.env.OPENAI_API_KEY || '',

  // Security
  maxJobsPerIp: parseInt(process.env.MAX_JOBS_PER_IP, 10) || 10,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Supported platforms
  supportedPlatforms: ['youtube', 'tiktok', 'instagram'],

  // Quality presets
  qualityPresets: {
    '4k': { height: 2160, label: '4K Ultra', fps: 60 },
    '1080p': { height: 1080, label: 'Full HD', fps: 60 },
    '720p': { height: 720, label: 'Standard', fps: 30 },
    'audio': { type: 'audio', label: 'Audio Only', format: 'mp3', bitrate: '320k' }
  }
};

module.exports = config;
