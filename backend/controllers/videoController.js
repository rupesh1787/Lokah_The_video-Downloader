/**
 * Video Controller
 * Handles all video-related HTTP requests
 */

const jobStore = require('../services/jobStore');
const platformDetector = require('../services/platformDetector');
const videoEngine = require('../services/videoEngine');
const cleanupService = require('../services/cleanupService');
const config = require('../config');
const path = require('path');
const fs = require('fs');

class VideoController {
  /**
   * Analyze video URL
   * POST /api/analyze
   */
  async analyze(req, res) {
    try {
      const { url } = req.body;
      const clientIp = req.ip || req.connection.remoteAddress;

      // Validate URL presence
      if (!url) {
        return res.status(400).json({
          success: false,
          error: 'URL is required'
        });
      }

      // Check rate limiting
      const existingJobs = jobStore.getByIp(clientIp);
      const activeJobs = existingJobs.filter(j => 
        ['pending', 'analyzing', 'processing'].includes(j.status)
      );
      
      if (activeJobs.length >= config.maxJobsPerIp) {
        return res.status(429).json({
          success: false,
          error: 'Too many active jobs. Please wait for current jobs to complete.'
        });
      }

      // Detect platform
      const platformResult = platformDetector.detect(url);
      if (!platformResult.isValid) {
        return res.status(400).json({
          success: false,
          error: platformResult.error
        });
      }

      // Create job
      const job = jobStore.create(url, clientIp);
      jobStore.update(job.id, {
        status: 'analyzing',
        platform: platformResult.platform
      });
      jobStore.updateStage(job.id, 'validation', 'completed', 'URL validated');

      // Fetch metadata
      try {
        const metadata = await videoEngine.getMetadata(url);
        
        jobStore.updateStage(job.id, 'metadata', 'completed', 'Metadata fetched');
        
        const updatedJob = jobStore.update(job.id, {
          status: 'ready',
          metadata,
          formats: metadata.formats,
          progress: 40
        });

        const platformInfo = platformDetector.getPlatformInfo(platformResult.platform);

        return res.json({
          success: true,
          jobId: job.id,
          platform: {
            ...platformInfo,
            id: platformResult.platform
          },
          video: {
            id: metadata.id,
            title: metadata.title,
            thumbnail: metadata.thumbnail,
            duration: metadata.durationFormatted,
            durationSeconds: metadata.duration,
            uploader: metadata.uploader,
            viewCount: metadata.viewCount,
            fileSpecs: metadata.fileSpecs
          },
          formats: metadata.formats,
          aiInsight: this.generateAIInsight(metadata)
        });

      } catch (metadataError) {
        jobStore.updateStage(job.id, 'metadata', 'failed', metadataError.message);
        jobStore.update(job.id, {
          status: 'failed',
          error: metadataError.message
        });

        return res.status(422).json({
          success: false,
          jobId: job.id,
          error: 'Failed to analyze video. The video may be private, unavailable, or region-restricted.',
          details: metadataError.message
        });
      }

    } catch (error) {
      console.error('Analyze error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Process/download video
   * POST /api/process
   */
  async process(req, res) {
    try {
      const { jobId, formatId, quality } = req.body;

      if (!jobId) {
        return res.status(400).json({
          success: false,
          error: 'Job ID is required'
        });
      }

      const job = jobStore.get(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }

      if (job.status === 'processing') {
        return res.status(409).json({
          success: false,
          error: 'Job is already processing'
        });
      }

      // Find selected format
      let selectedFormat = null;
      if (formatId) {
        selectedFormat = job.formats.find(f => f.formatId === formatId);
      } else if (quality) {
        selectedFormat = job.formats.find(f => f.preset === quality || f.quality === quality);
      }

      if (!selectedFormat && job.formats.length > 0) {
        selectedFormat = job.formats[0]; // Default to best quality
      }

      // Update job
      jobStore.update(jobId, {
        status: 'processing',
        selectedFormat,
        progress: 50
      });
      jobStore.updateStage(jobId, 'download', 'processing', 'Starting download...');

      // Start download (async)
      this.processDownload(jobId, selectedFormat);

      return res.json({
        success: true,
        jobId,
        status: 'processing',
        message: 'Download started',
        selectedFormat
      });

    } catch (error) {
      console.error('Process error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Handle download processing (background)
   * @param {string} jobId 
   * @param {object} selectedFormat 
   */
  async processDownload(jobId, selectedFormat) {
    const job = jobStore.get(jobId);
    if (!job) return;

    try {
      // Download video
      const outputPath = await videoEngine.download(job, (progress) => {
        jobStore.update(jobId, {
          progress: 50 + (progress.progress * 0.4) // 50-90%
        });
      });

      jobStore.updateStage(jobId, 'download', 'completed', 'Download complete');
      jobStore.updateStage(jobId, 'processing', 'completed', 'Processing complete');

      // Set expiry time
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + config.jobExpiryMinutes);

      jobStore.update(jobId, {
        status: 'completed',
        outputPath,
        progress: 100,
        expiresAt
      });
      jobStore.updateStage(jobId, 'ready', 'completed', 'Ready for download');

    } catch (error) {
      console.error(`Download failed for job ${jobId}:`, error);
      jobStore.updateStage(jobId, 'download', 'failed', error.message);
      jobStore.update(jobId, {
        status: 'failed',
        error: error.message
      });
    }
  }

  /**
   * Get job progress
   * GET /api/progress/:jobId
   */
  async getProgress(req, res) {
    try {
      const { jobId } = req.params;

      const job = jobStore.get(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }

      return res.json({
        success: true,
        jobId,
        status: job.status,
        progress: job.progress,
        stage: job.stage,
        stages: job.stages,
        error: job.error,
        expiresAt: job.expiresAt,
        canDownload: job.status === 'completed' && job.outputPath
      });

    } catch (error) {
      console.error('Progress error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Download completed file
   * GET /api/download/:jobId
   */
  async download(req, res) {
    try {
      const { jobId } = req.params;

      const job = jobStore.get(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }

      if (job.status !== 'completed' || !job.outputPath) {
        return res.status(400).json({
          success: false,
          error: 'File not ready for download'
        });
      }

      if (!fs.existsSync(job.outputPath)) {
        return res.status(410).json({
          success: false,
          error: 'File has expired or been deleted'
        });
      }

      // Get file info
      const stat = fs.statSync(job.outputPath);
      const filename = path.basename(job.outputPath);
      const sanitizedFilename = filename.replace(/[^\w\s.-]/gi, '_');

      res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', stat.size);

      const fileStream = fs.createReadStream(job.outputPath);
      fileStream.pipe(res);

    } catch (error) {
      console.error('Download error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Cancel/cleanup job
   * DELETE /api/cleanup/:jobId
   */
  async cleanup(req, res) {
    try {
      const { jobId } = req.params;

      const job = jobStore.get(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }

      // Cancel active download if running
      if (job.status === 'processing') {
        videoEngine.cancel(jobId);
      }

      // Cleanup files
      await cleanupService.cleanupJob(jobId);

      return res.json({
        success: true,
        message: 'Job cleaned up successfully'
      });

    } catch (error) {
      console.error('Cleanup error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Generate AI insight (mock for now)
   * @param {object} metadata 
   * @returns {object}
   */
  generateAIInsight(metadata) {
    const insights = [];
    
    // Quality recommendation
    if (metadata.fileSpecs.resolution.includes('3840') || metadata.fileSpecs.resolution.includes('2160')) {
      insights.push('4K source detected. Recommended format: 1080p MP4 for optimal balance.');
    } else if (metadata.fileSpecs.resolution.includes('1920') || metadata.fileSpecs.resolution.includes('1080')) {
      insights.push('Full HD source. Recommended format: 1080p MP4.');
    } else {
      insights.push('Standard quality source. Recommended format: 720p MP4.');
    }

    // Duration insight
    if (metadata.duration > 600) {
      insights.push('Long video detected. Consider extracting specific clips.');
    }

    return {
      model: 'AI Model v2.1',
      confidence: 96,
      recommendation: insights[0],
      insights
    };
  }
}

module.exports = new VideoController();
