/**
 * Video Engine Service
 * Handles yt-dlp and ffmpeg operations
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const config = require('../config');

class VideoEngine {
  constructor() {
    this.ytdlpPath = config.ytdlpPath;
    this.ffmpegPath = config.ffmpegPath;
    this.tempDir = config.tempDir;
    this.activeProcesses = new Map();
  }

  /**
   * Check if yt-dlp is available
   * @returns {Promise<object>}
   */
  async checkYtdlp() {
    try {
      const version = execSync(`${this.ytdlpPath} --version`, { encoding: 'utf8' }).trim();
      return { available: true, version };
    } catch (error) {
      return { available: false, error: 'yt-dlp not found' };
    }
  }

  /**
   * Check if ffmpeg is available
   * @returns {Promise<object>}
   */
  async checkFfmpeg() {
    try {
      const output = execSync(`${this.ffmpegPath} -version`, { encoding: 'utf8' });
      const version = output.split('\n')[0];
      return { available: true, version };
    } catch (error) {
      return { available: false, error: 'ffmpeg not found' };
    }
  }

  /**
   * Fetch video metadata using yt-dlp
   * @param {string} url 
   * @returns {Promise<object>}
   */
  async getMetadata(url) {
    return new Promise((resolve, reject) => {
      const args = [
        '--dump-json',
        '--no-download',
        '--no-warnings',
        url
      ];

      let stdout = '';
      let stderr = '';

      const process = spawn(this.ytdlpPath, args);

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const metadata = JSON.parse(stdout);
            resolve(this.parseMetadata(metadata));
          } catch (parseError) {
            reject(new Error('Failed to parse video metadata'));
          }
        } else {
          reject(new Error(stderr || 'Failed to fetch video metadata'));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`yt-dlp error: ${error.message}`));
      });
    });
  }

  /**
   * Parse raw metadata into clean format
   * @param {object} raw 
   * @returns {object}
   */
  parseMetadata(raw) {
    const formats = this.extractFormats(raw.formats || []);

    return {
      id: raw.id,
      title: raw.title || 'Untitled',
      description: raw.description || '',
      thumbnail: raw.thumbnail || raw.thumbnails?.[0]?.url || null,
      duration: raw.duration || 0,
      durationFormatted: this.formatDuration(raw.duration),
      uploader: raw.uploader || raw.channel || 'Unknown',
      uploaderUrl: raw.uploader_url || raw.channel_url || null,
      viewCount: raw.view_count || 0,
      likeCount: raw.like_count || 0,
      uploadDate: raw.upload_date || null,
      platform: raw.extractor_key?.toLowerCase() || 'unknown',
      originalUrl: raw.webpage_url || raw.original_url,
      formats,
      bestVideo: formats.find(f => f.type === 'video') || null,
      bestAudio: formats.find(f => f.type === 'audio') || null,
      fileSpecs: {
        resolution: `${raw.width || 0} × ${raw.height || 0}`,
        frameRate: `${raw.fps || 30} FPS`,
        codec: `${raw.vcodec || 'unknown'} / ${raw.acodec || 'unknown'}`,
        originalSize: this.formatBytes(raw.filesize || raw.filesize_approx || 0)
      }
    };
  }

  /**
   * Extract available formats
   * @param {array} rawFormats 
   * @returns {array}
   */
  extractFormats(rawFormats) {
    const videoFormats = [];
    const audioFormats = [];
    const seenResolutions = new Set();

    // Sort by quality (height)
    const sorted = rawFormats
      .filter(f => f.height || f.acodec !== 'none')
      .sort((a, b) => (b.height || 0) - (a.height || 0));

    for (const format of sorted) {
      if (format.vcodec && format.vcodec !== 'none' && format.height) {
        const key = `${format.height}p`;
        if (!seenResolutions.has(key)) {
          seenResolutions.add(key);
          videoFormats.push({
            formatId: format.format_id,
            type: 'video',
            quality: key,
            height: format.height,
            width: format.width || 0,
            fps: format.fps || 30,
            ext: format.ext || 'mp4',
            filesize: format.filesize || format.filesize_approx || 0,
            filesizeFormatted: this.formatBytes(format.filesize || format.filesize_approx || 0),
            codec: format.vcodec,
            label: this.getQualityLabel(format.height)
          });
        }
      } else if (format.acodec && format.acodec !== 'none' && !format.vcodec) {
        if (audioFormats.length === 0) {
          audioFormats.push({
            formatId: format.format_id,
            type: 'audio',
            quality: 'audio',
            ext: format.ext || 'mp3',
            filesize: format.filesize || format.filesize_approx || 0,
            filesizeFormatted: this.formatBytes(format.filesize || format.filesize_approx || 0),
            codec: format.acodec,
            bitrate: format.abr || 128,
            label: 'Audio Only'
          });
        }
      }
    }

    // Add standard quality presets
    const presets = [];
    
    const has4k = videoFormats.find(f => f.height >= 2160);
    const has1080 = videoFormats.find(f => f.height >= 1080);
    const has720 = videoFormats.find(f => f.height >= 720);

    if (has4k) {
      presets.push({
        ...has4k,
        preset: '4k',
        label: '4K Ultra',
        badge: 'BEST QUALITY'
      });
    }

    if (has1080) {
      presets.push({
        ...has1080,
        preset: '1080p',
        label: 'Full HD',
        badge: 'MOST POPULAR'
      });
    }

    if (has720) {
      presets.push({
        ...has720,
        preset: '720p',
        label: 'Standard',
        badge: 'SMALLEST SIZE'
      });
    }

    if (audioFormats.length > 0) {
      presets.push({
        ...audioFormats[0],
        preset: 'audio',
        label: 'Extract Audio Only',
        badge: null
      });
    }

    return presets.length > 0 ? presets : videoFormats.slice(0, 3);
  }

  /**
   * Get quality label
   * @param {number} height 
   * @returns {string}
   */
  getQualityLabel(height) {
    if (height >= 2160) return '4K Ultra';
    if (height >= 1440) return '2K';
    if (height >= 1080) return 'Full HD';
    if (height >= 720) return 'HD';
    if (height >= 480) return 'SD';
    return 'Low';
  }

  /**
   * Download video with progress tracking
   * @param {object} job 
   * @param {function} onProgress 
   * @returns {Promise<string>}
   */
  async download(job, onProgress) {
    const { url, id: jobId, selectedFormat } = job;
    const jobDir = path.join(this.tempDir, jobId);

    // Ensure job directory exists
    if (!fs.existsSync(jobDir)) {
      fs.mkdirSync(jobDir, { recursive: true });
    }

    const outputTemplate = path.join(jobDir, '%(title)s.%(ext)s');
    
    const args = [
      '-f', selectedFormat?.formatId || 'best',
      '--merge-output-format', 'mp4',
      '-o', outputTemplate,
      '--no-playlist',
      '--progress',
      '--newline',
      url
    ];

    // Add ffmpeg location if specified
    if (this.ffmpegPath !== 'ffmpeg') {
      args.unshift('--ffmpeg-location', this.ffmpegPath);
    }

    return new Promise((resolve, reject) => {
      const process = spawn(this.ytdlpPath, args);
      this.activeProcesses.set(jobId, process);

      let outputPath = null;

      process.stdout.on('data', (data) => {
        const line = data.toString();
        
        // Parse progress
        const progressMatch = line.match(/(\d+\.?\d*)%/);
        if (progressMatch) {
          const percent = parseFloat(progressMatch[1]);
          onProgress?.({ stage: 'download', progress: percent });
        }

        // Capture output filename
        const destMatch = line.match(/\[download\] Destination: (.+)/);
        if (destMatch) {
          outputPath = destMatch[1].trim();
        }

        const mergerMatch = line.match(/\[Merger\] Merging formats into "(.+)"/);
        if (mergerMatch) {
          outputPath = mergerMatch[1].trim();
        }
      });

      process.stderr.on('data', (data) => {
        console.error(`yt-dlp stderr: ${data}`);
      });

      process.on('close', (code) => {
        this.activeProcesses.delete(jobId);

        if (code === 0) {
          // Find the output file if not captured
          if (!outputPath) {
            const files = fs.readdirSync(jobDir);
            const videoFile = files.find(f => /\.(mp4|webm|mkv|mp3|m4a)$/i.test(f));
            if (videoFile) {
              outputPath = path.join(jobDir, videoFile);
            }
          }
          
          if (outputPath && fs.existsSync(outputPath)) {
            resolve(outputPath);
          } else {
            reject(new Error('Download completed but output file not found'));
          }
        } else {
          reject(new Error('Download failed'));
        }
      });

      process.on('error', (error) => {
        this.activeProcesses.delete(jobId);
        reject(new Error(`Download error: ${error.message}`));
      });
    });
  }

  /**
   * Extract audio from video
   * @param {string} inputPath 
   * @param {string} outputPath 
   * @param {function} onProgress 
   * @returns {Promise<string>}
   */
  async extractAudio(inputPath, outputPath, onProgress) {
    const args = [
      '-i', inputPath,
      '-vn',
      '-acodec', 'libmp3lame',
      '-ab', '320k',
      '-y',
      outputPath
    ];

    return this.runFfmpeg(args, onProgress);
  }

  /**
   * Convert video format
   * @param {string} inputPath 
   * @param {string} outputPath 
   * @param {object} options 
   * @param {function} onProgress 
   * @returns {Promise<string>}
   */
  async convertVideo(inputPath, outputPath, options = {}, onProgress) {
    const args = [
      '-i', inputPath,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-y',
      outputPath
    ];

    if (options.height) {
      args.splice(2, 0, '-vf', `scale=-2:${options.height}`);
    }

    return this.runFfmpeg(args, onProgress);
  }

  /**
   * Run ffmpeg command
   * @param {array} args 
   * @param {function} onProgress 
   * @returns {Promise<string>}
   */
  async runFfmpeg(args, onProgress) {
    return new Promise((resolve, reject) => {
      const process = spawn(this.ffmpegPath, args);

      process.stderr.on('data', (data) => {
        const line = data.toString();
        // Parse ffmpeg progress (time-based)
        const timeMatch = line.match(/time=(\d{2}):(\d{2}):(\d{2})/);
        if (timeMatch) {
          onProgress?.({ stage: 'processing', message: `Processing: ${timeMatch[0]}` });
        }
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(args[args.length - 1]); // Output path is last arg
        } else {
          reject(new Error('FFmpeg processing failed'));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`FFmpeg error: ${error.message}`));
      });
    });
  }

  /**
   * Cancel active download
   * @param {string} jobId 
   * @returns {boolean}
   */
  cancel(jobId) {
    const process = this.activeProcesses.get(jobId);
    if (process) {
      process.kill('SIGTERM');
      this.activeProcesses.delete(jobId);
      return true;
    }
    return false;
  }

  /**
   * Format duration in HH:MM:SS
   * @param {number} seconds 
   * @returns {string}
   */
  formatDuration(seconds) {
    if (!seconds) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  /**
   * Format bytes to human readable
   * @param {number} bytes 
   * @returns {string}
   */
  formatBytes(bytes) {
    if (!bytes || bytes === 0) return '~ MB';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `~${(bytes / Math.pow(1024, i)).toFixed(0)} ${sizes[i]}`;
  }
}

module.exports = new VideoEngine();
