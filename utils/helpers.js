/**
 * Utility Helper Functions
 * Common functions for date/time formatting, validation, UI helpers, and storage utilities
 */

// ==================== DATE & TIME FUNCTIONS ====================

/**
 * Format ISO date string to readable format
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date (e.g., "Jan 15, 2026")
 */
export function formatDate(dateString) {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.warn('Error formatting date:', error);
    return '';
  }
}

/**
 * Format ISO date string to readable format with time
 * @param {string} dateTimeString - ISO datetime string
 * @returns {string} Formatted datetime (e.g., "Jan 15, 2026 at 2:30 PM")
 */
export function formatDateTime(dateTimeString) {
  if (!dateTimeString) return '';

  try {
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return '';

    const dateStr = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    return `${dateStr} at ${timeStr}`;
  } catch (error) {
    console.warn('Error formatting datetime:', error);
    return '';
  }
}

/**
 * Get relative time string (e.g., "2 hours ago", "yesterday")
 * @param {string} dateString - ISO date string
 * @returns {string} Relative time string
 */
export function getRelativeTime(dateString) {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSecs < 60) {
      return 'just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      return 'yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else if (diffWeeks < 4) {
      return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
    } else if (diffMonths < 12) {
      return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
    } else {
      return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
    }
  } catch (error) {
    console.warn('Error calculating relative time:', error);
    return '';
  }
}

/**
 * Check if a date is overdue (past today)
 * @param {string} dueDate - ISO date string
 * @returns {boolean} True if date is in the past
 */
export function isOverdue(dueDate) {
  if (!dueDate) return false;

  try {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    return due < today;
  } catch (error) {
    console.warn('Error checking if overdue:', error);
    return false;
  }
}

// ==================== PROGRESS FUNCTIONS ====================

/**
 * Calculate completion percentage from task array
 * @param {Array} tasks - Array of tasks with status property
 * @returns {number} Completion percentage (0-100)
 */
export function calculateProgress(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) return 0;

  const completed = tasks.filter(task => task.status === 'done' || task.status === 'completed').length;
  return Math.round((completed / tasks.length) * 100);
}

/**
 * Get color hex code based on progress percentage
 * @param {number} percentage - Progress percentage (0-100)
 * @returns {string} Hex color code
 */
export function getProgressColor(percentage) {
  if (percentage <= 30) {
    return '#dc3545'; // Red
  } else if (percentage <= 70) {
    return '#ffc107'; // Yellow
  } else {
    return '#28a745'; // Green
  }
}

/**
 * Get Bootstrap progress bar color class
 * @param {number} percentage - Progress percentage (0-100)
 * @returns {string} Bootstrap class name
 */
export function getProgressBarClass(percentage) {
  if (percentage <= 30) {
    return 'bg-danger';
  } else if (percentage <= 70) {
    return 'bg-warning';
  } else {
    return 'bg-success';
  }
}

// ==================== UI BADGE FUNCTIONS ====================

/**
 * Get Bootstrap badge class for status
 * @param {string} status - Status value
 * @returns {string} Bootstrap badge class
 */
export function getStatusBadgeClass(status) {
  const statusMap = {
    // Project statuses
    'planning': 'badge bg-secondary',
    'active': 'badge bg-primary',
    'completed': 'badge bg-success',
    'paused': 'badge bg-warning',
    'archived': 'badge bg-dark',
    // Task statuses
    'todo': 'badge bg-secondary',
    'in_progress': 'badge bg-info',
    'done': 'badge bg-success'
  };

  return statusMap[status] || 'badge bg-secondary';
}

/**
 * Get Bootstrap badge class for project type
 * @param {string} type - Project type
 * @returns {string} Bootstrap badge class
 */
export function getTypeBadgeClass(type) {
  const typeMap = {
    'Academic & Research': 'badge bg-primary',
    'Corporate/Business': 'badge bg-info',
    'EU-Funded Project': 'badge bg-warning',
    'Public Initiative': 'badge bg-success',
    'Personal/Other': 'badge bg-secondary'
  };

  return typeMap[type] || 'badge bg-primary';
}

// ==================== TEXT FUNCTIONS ====================

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length (default: 100)
 * @returns {string} Truncated text with ellipsis
 */
export function truncateText(text, maxLength = 100) {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Sanitize HTML to prevent XSS attacks
 * Escapes dangerous characters
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML string
 */
export function sanitizeHTML(html) {
  if (!html || typeof html !== 'string') return '';

  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

// ==================== VALIDATION FUNCTIONS ====================

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email format
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL format
 */
export function validateURL(url) {
  if (!url || typeof url !== 'string') return false;

  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validate file MIME type
 * @param {File} file - File object
 * @param {Array} allowedTypes - Array of allowed MIME types
 * @returns {boolean} True if file type is allowed
 */
export function validateFileType(file, allowedTypes = []) {
  if (!file || !file.type || !Array.isArray(allowedTypes) || allowedTypes.length === 0) {
    return false;
  }

  return allowedTypes.some(type => {
    // Support wildcard matching (e.g., 'image/*')
    if (type.endsWith('/*')) {
      const prefix = type.split('/')[0];
      return file.type.startsWith(prefix + '/');
    }
    return file.type === type;
  });
}

/**
 * Validate file size in MB
 * @param {File} file - File object
 * @param {number} maxSizeMB - Maximum file size in MB (default: 5)
 * @returns {boolean} True if file size is within limit
 */
export function validateFileSize(file, maxSizeMB = 5) {
  if (!file || !file.size) return false;

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

// ==================== STORAGE FUNCTIONS ====================

/**
 * Format bytes to human-readable file size
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted file size (e.g., "2.5 MB")
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get Bootstrap icon class based on file MIME type
 * @param {string} fileType - File MIME type
 * @returns {string} Bootstrap icon class name
 */
export function getFileIcon(fileType) {
  if (!fileType || typeof fileType !== 'string') {
    return 'bi-file-earmark';
  }

  if (fileType.startsWith('image/')) {
    return 'bi-file-image';
  } else if (fileType === 'application/pdf') {
    return 'bi-file-pdf';
  } else if (fileType.includes('word') || fileType.includes('document')) {
    return 'bi-file-word';
  } else if (fileType.includes('sheet') || fileType.includes('excel')) {
    return 'bi-file-spreadsheet';
  } else if (fileType.includes('presentation') || fileType.includes('powerpoint')) {
    return 'bi-file-slides';
  } else if (fileType.startsWith('video/')) {
    return 'bi-file-play';
  } else if (fileType.startsWith('audio/')) {
    return 'bi-file-music';
  } else if (fileType.includes('zip') || fileType.includes('compressed')) {
    return 'bi-file-zip';
  } else {
    return 'bi-file-earmark';
  }
}

// ==================== OTHER UTILITIES ====================

/**
 * Debounce function to limit function execution frequency
 * Useful for search inputs and other frequent events
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds (default: 300)
 * @returns {Function} Debounced function
 */
export function debounce(func, delay = 300) {
  if (typeof func !== 'function') {
    throw new Error('First argument must be a function');
  }

  let timeoutId = null;

  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

/**
 * Generate unique ID using timestamp and random number
 * @returns {string} Unique ID string
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Promise that resolves to true on success
 */
export async function copyToClipboard(text) {
  if (!text || typeof text !== 'string') {
    return Promise.reject(new Error('Invalid text provided'));
  }

  try {
    // Try modern API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
}

// ==================== EXPORT ALL FUNCTIONS ====================

export default {
  // Date & Time
  formatDate,
  formatDateTime,
  getRelativeTime,
  isOverdue,
  // Progress
  calculateProgress,
  getProgressColor,
  getProgressBarClass,
  // Badges
  getStatusBadgeClass,
  getTypeBadgeClass,
  // Text
  truncateText,
  sanitizeHTML,
  // Validation
  validateEmail,
  validateURL,
  validateFileType,
  validateFileSize,
  // Storage
  formatFileSize,
  getFileIcon,
  // Other
  debounce,
  generateId,
  copyToClipboard
};
