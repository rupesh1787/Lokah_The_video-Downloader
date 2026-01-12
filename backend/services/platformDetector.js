/**
 * Platform Detector Service
 * Detects and validates video platform from URL
 */

class PlatformDetector {
  constructor() {
    this.patterns = {
      youtube: [
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
      ],
      tiktok: [
        /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
        /(?:https?:\/\/)?(?:vm\.)?tiktok\.com\/[\w]+/,
        /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/t\/[\w]+/
      ],
      instagram: [
        /(?:https?:\/\/)?(?:www\.)?instagram\.com\/p\/([a-zA-Z0-9_-]+)/,
        /(?:https?:\/\/)?(?:www\.)?instagram\.com\/reel\/([a-zA-Z0-9_-]+)/,
        /(?:https?:\/\/)?(?:www\.)?instagram\.com\/tv\/([a-zA-Z0-9_-]+)/
      ]
    };
  }

  /**
   * Detect platform from URL
   * @param {string} url 
   * @returns {object} { platform, videoId, isValid }
   */
  detect(url) {
    if (!url || typeof url !== 'string') {
      return { platform: null, videoId: null, isValid: false, error: 'Invalid URL' };
    }

    const normalizedUrl = url.trim();

    for (const [platform, patterns] of Object.entries(this.patterns)) {
      for (const pattern of patterns) {
        const match = normalizedUrl.match(pattern);
        if (match) {
          return {
            platform,
            videoId: match[1] || null,
            isValid: true,
            originalUrl: normalizedUrl
          };
        }
      }
    }

    return {
      platform: null,
      videoId: null,
      isValid: false,
      error: 'Unsupported platform. We support YouTube, TikTok, and Instagram.'
    };
  }

  /**
   * Validate URL format
   * @param {string} url 
   * @returns {boolean}
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get platform display info
   * @param {string} platform 
   * @returns {object}
   */
  getPlatformInfo(platform) {
    const info = {
      youtube: {
        name: 'YouTube',
        icon: '🎬',
        color: '#FF0000',
        maxQuality: '4K'
      },
      tiktok: {
        name: 'TikTok',
        icon: '🎵',
        color: '#000000',
        maxQuality: '1080p'
      },
      instagram: {
        name: 'Instagram',
        icon: '📸',
        color: '#E4405F',
        maxQuality: '1080p'
      }
    };

    return info[platform] || { name: 'Unknown', icon: '🎥', color: '#666666' };
  }
}

module.exports = new PlatformDetector();
