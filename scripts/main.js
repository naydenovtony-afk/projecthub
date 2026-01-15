/**
 * Main Application Initialization
 * Initialize offline detection and global features
 */

import { initOfflineDetection } from '../utils/errorHandler.js';

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('ProjectHub initialized');
  
  // Initialize offline detection banner
  initOfflineDetection();
});
