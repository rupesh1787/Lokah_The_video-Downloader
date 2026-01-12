/**
 * Job Store - In-memory job management
 * Tracks all processing jobs and their states
 */

const { v4: uuidv4 } = require('uuid');

class JobStore {
  constructor() {
    this.jobs = new Map();
  }

  /**
   * Create a new job
   * @param {string} url - Video URL
   * @param {string} clientIp - Client IP address
   * @returns {object} Job object
   */
  create(url, clientIp) {
    const jobId = uuidv4();
    const job = {
      id: jobId,
      url,
      clientIp,
      platform: null,
      status: 'pending', // pending, analyzing, processing, completed, failed, cancelled
      progress: 0,
      stage: 'initializing',
      stages: {
        validation: { status: 'pending', message: '' },
        metadata: { status: 'pending', message: '' },
        download: { status: 'pending', message: '' },
        processing: { status: 'pending', message: '' },
        ready: { status: 'pending', message: '' }
      },
      metadata: null,
      formats: [],
      selectedFormat: null,
      outputPath: null,
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: null
    };

    this.jobs.set(jobId, job);
    return job;
  }

  /**
   * Get job by ID
   * @param {string} jobId 
   * @returns {object|null}
   */
  get(jobId) {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Update job
   * @param {string} jobId 
   * @param {object} updates 
   * @returns {object|null}
   */
  update(jobId, updates) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    const updatedJob = {
      ...job,
      ...updates,
      updatedAt: new Date()
    };

    this.jobs.set(jobId, updatedJob);
    return updatedJob;
  }

  /**
   * Update job stage
   * @param {string} jobId 
   * @param {string} stageName 
   * @param {string} status 
   * @param {string} message 
   */
  updateStage(jobId, stageName, status, message = '') {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    job.stages[stageName] = { status, message };
    job.stage = stageName;
    job.updatedAt = new Date();

    // Calculate overall progress based on stages
    const stageOrder = ['validation', 'metadata', 'download', 'processing', 'ready'];
    const completedIndex = stageOrder.findIndex(s => job.stages[s].status !== 'completed');
    job.progress = completedIndex === -1 ? 100 : Math.round((completedIndex / stageOrder.length) * 100);

    this.jobs.set(jobId, job);
    return job;
  }

  /**
   * Delete job
   * @param {string} jobId 
   * @returns {boolean}
   */
  delete(jobId) {
    return this.jobs.delete(jobId);
  }

  /**
   * Get all jobs for an IP
   * @param {string} clientIp 
   * @returns {array}
   */
  getByIp(clientIp) {
    const jobs = [];
    this.jobs.forEach(job => {
      if (job.clientIp === clientIp) {
        jobs.push(job);
      }
    });
    return jobs;
  }

  /**
   * Get expired jobs
   * @param {number} expiryMinutes 
   * @returns {array}
   */
  getExpired(expiryMinutes) {
    const now = new Date();
    const expired = [];

    this.jobs.forEach(job => {
      const ageMinutes = (now - job.createdAt) / (1000 * 60);
      if (ageMinutes > expiryMinutes) {
        expired.push(job);
      }
    });

    return expired;
  }

  /**
   * Get all jobs (for debugging)
   * @returns {array}
   */
  getAll() {
    return Array.from(this.jobs.values());
  }
}

// Singleton instance
module.exports = new JobStore();
