// Utility helper functions

/**
 * Sanitize filename for safe file system usage
 */
function sanitizeFilename(filename) {
  return filename.replace(/[^a-z0-9_\-\.]/gi, '_');
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Generate unique ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

module.exports = {
  sanitizeFilename,
  formatBytes,
  generateId
};
