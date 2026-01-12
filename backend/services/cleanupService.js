/**
 * Cleanup Service
 * Handles automatic cleanup of expired jobs and temp files
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');
const jobStore = require('./jobStore');

class CleanupService {
  constructor() {
    this.tempDir = config.tempDir;
    this.expiryMinutes = config.jobExpiryMinutes;
    this.intervalId = null;
  }

  /**
   * Start the cleanup scheduler
   * @param {number} intervalMinutes - How often to run cleanup (default: 5 min)
   */
  start(intervalMinutes = 5) {
    console.log(`🧹 Cleanup service started (every ${intervalMinutes} minutes)`);
    
    // Run immediately
    this.cleanup();
    
    // Schedule recurring cleanup
    this.intervalId = setInterval(() => {
      this.cleanup();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop the cleanup scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🧹 Cleanup service stopped');
    }
  }

  /**
   * Run cleanup process
   */
  async cleanup() {
    console.log('🧹 Running cleanup...');
    
    const expiredJobs = jobStore.getExpired(this.expiryMinutes);
    let cleanedCount = 0;

    for (const job of expiredJobs) {
      try {
        await this.cleanupJob(job.id);
        cleanedCount++;
      } catch (error) {
        console.error(`Failed to cleanup job ${job.id}:`, error.message);
      }
    }

    // Also clean orphaned directories
    await this.cleanOrphanedDirs();

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned ${cleanedCount} expired jobs`);
    }
  }

  /**
   * Cleanup a specific job
   * @param {string} jobId 
   */
  async cleanupJob(jobId) {
    // Delete job directory
    const jobDir = path.join(this.tempDir, jobId);
    if (fs.existsSync(jobDir)) {
      await this.deleteDirectory(jobDir);
    }

    // Remove from job store
    jobStore.delete(jobId);
  }

  /**
   * Delete directory recursively
   * @param {string} dirPath 
   */
  async deleteDirectory(dirPath) {
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          await this.deleteDirectory(filePath);
        } else {
          fs.unlinkSync(filePath);
        }
      }
      
      fs.rmdirSync(dirPath);
    }
  }

  /**
   * Clean directories that don't have associated jobs
   */
  async cleanOrphanedDirs() {
    if (!fs.existsSync(this.tempDir)) return;

    const dirs = fs.readdirSync(this.tempDir);
    const activeJobIds = new Set(jobStore.getAll().map(j => j.id));

    for (const dir of dirs) {
      // Skip if it's an active job
      if (activeJobIds.has(dir)) continue;

      const dirPath = path.join(this.tempDir, dir);
      const stat = fs.statSync(dirPath);

      // Only clean directories older than expiry time
      const ageMinutes = (Date.now() - stat.mtimeMs) / (1000 * 60);
      if (stat.isDirectory() && ageMinutes > this.expiryMinutes) {
        try {
          await this.deleteDirectory(dirPath);
          console.log(`🧹 Cleaned orphaned directory: ${dir}`);
        } catch (error) {
          console.error(`Failed to clean orphaned dir ${dir}:`, error.message);
        }
      }
    }
  }

  /**
   * Get temp directory stats
   * @returns {object}
   */
  getStats() {
    if (!fs.existsSync(this.tempDir)) {
      return { totalSize: 0, fileCount: 0, dirCount: 0 };
    }

    let totalSize = 0;
    let fileCount = 0;
    let dirCount = 0;

    const dirs = fs.readdirSync(this.tempDir);
    
    for (const dir of dirs) {
      const dirPath = path.join(this.tempDir, dir);
      if (fs.statSync(dirPath).isDirectory()) {
        dirCount++;
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const stat = fs.statSync(filePath);
          if (stat.isFile()) {
            totalSize += stat.size;
            fileCount++;
          }
        }
      }
    }

    return {
      totalSize,
      totalSizeFormatted: this.formatBytes(totalSize),
      fileCount,
      dirCount
    };
  }

  /**
   * Format bytes to human readable
   * @param {number} bytes 
   * @returns {string}
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }
}

module.exports = new CleanupService();
