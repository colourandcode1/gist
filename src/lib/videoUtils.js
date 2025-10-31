/**
 * Utility functions for handling Google Drive video URLs
 */

/**
 * Check if a URL is a Google Drive URL
 * @param {string} url - The URL to check
 * @returns {boolean}
 */
export const isGoogleDriveUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return url.includes('drive.google.com');
};

/**
 * Extract file ID from various Google Drive URL formats
 * Supports formats like:
 * - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/file/d/FILE_ID/preview
 * - https://drive.google.com/open?id=FILE_ID
 * @param {string} url - The Google Drive URL
 * @returns {string|null} The file ID or null if not found
 */
export const extractDriveFileId = (url) => {
  if (!url || typeof url !== 'string') return null;
  
  // Standard format: /file/d/FILE_ID/
  let match = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  
  // Alternative format: /open?id=FILE_ID
  match = url.match(/\/open\?id=([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  
  // Query parameter format: ?id=FILE_ID
  match = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  
  return null;
};

/**
 * Convert timestamp from HH:MM:SS format to Google Drive's ?t=XmYs format
 * @param {string} timestamp - Timestamp in HH:MM:SS format
 * @returns {string|null} Timestamp in XmYs format (e.g., "1m25s") or null if invalid
 */
export const convertTimestampToDriveFormat = (timestamp) => {
  if (!timestamp || typeof timestamp !== 'string') return null;
  
  // Parse HH:MM:SS format
  const parts = timestamp.split(':');
  if (parts.length !== 3) return null;
  
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(parts[2], 10);
  
  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null;
  
  // Convert to total minutes and seconds
  const totalMinutes = hours * 60 + minutes;
  const totalSeconds = seconds;
  
  // Format as XmYs (e.g., "1m25s" or "0m5s")
  if (totalMinutes === 0 && totalSeconds === 0) return '0s';
  if (totalMinutes === 0) return `${totalSeconds}s`;
  if (totalSeconds === 0) return `${totalMinutes}m`;
  return `${totalMinutes}m${totalSeconds}s`;
};

/**
 * Create a timestamped URL for Google Drive
 * @param {string} baseUrl - The base Google Drive URL
 * @param {string} timestamp - Timestamp in HH:MM:SS format
 * @returns {string} URL with timestamp parameter appended
 */
export const createTimestampedUrl = (baseUrl, timestamp) => {
  if (!baseUrl || !timestamp) return baseUrl;
  
  const driveTimestamp = convertTimestampToDriveFormat(timestamp);
  if (!driveTimestamp) return baseUrl;
  
  // Remove any existing timestamp parameters
  const urlWithoutParams = baseUrl.split('?')[0].split('#')[0];
  
  // Append timestamp parameter
  return `${urlWithoutParams}?t=${driveTimestamp}`;
};

/**
 * Generate embeddable iframe URL for Google Drive
 * @param {string} url - The Google Drive share URL
 * @param {string|null} timestamp - Optional timestamp in HH:MM:SS format
 * @returns {string|null} Embed URL or null if invalid
 */
export const getEmbedUrl = (url, timestamp = null) => {
  if (!url || !isGoogleDriveUrl(url)) return null;
  
  const fileId = extractDriveFileId(url);
  if (!fileId) return null;
  
  let embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
  
  if (timestamp) {
    const driveTimestamp = convertTimestampToDriveFormat(timestamp);
    if (driveTimestamp) {
      embedUrl += `?t=${driveTimestamp}`;
    }
  }
  
  return embedUrl;
};
