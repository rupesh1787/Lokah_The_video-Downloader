/**
 * Video Routes
 * API endpoints for video operations
 */

const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');

/**
 * POST /api/analyze
 * Analyze a video URL and return metadata
 */
router.post('/analyze', (req, res) => videoController.analyze(req, res));

/**
 * POST /api/process
 * Start processing/downloading a video
 */
router.post('/process', (req, res) => videoController.process(req, res));

/**
 * GET /api/progress/:jobId
 * Get job progress and status
 */
router.get('/progress/:jobId', (req, res) => videoController.getProgress(req, res));

/**
 * GET /api/download/:jobId
 * Download the processed file
 */
router.get('/download/:jobId', (req, res) => videoController.download(req, res));

/**
 * DELETE /api/cleanup/:jobId
 * Cancel and cleanup a job
 */
router.delete('/cleanup/:jobId', (req, res) => videoController.cleanup(req, res));

module.exports = router;
