import { showError, showWarning } from './ui.js';

// ============================================================================
// ERROR HANDLERS
// ============================================================================

/**
 * Handle Supabase database errors and return user-friendly messages
 * @param {Error} error - Supabase error object
 * @returns {Object} Error details with message, code, and retryable flag
 */
export function handleSupabaseError(error) {
    console.error('Supabase Error:', error);

    let message = 'An unexpected error occurred. Please try again.';
    let code = error.code || error.status || 'UNKNOWN';
    let isRetryable = false;

    // PostgreSQL error codes
    if (error.code === '23505' || error.message?.includes('duplicate')) {
        message = 'This record already exists. Please use a different value.';
        if (error.message?.includes('email')) {
            message = 'This email is already registered.';
        }
        isRetryable = false;
    } else if (error.code === '23503') {
        message = 'Cannot delete: this item has related data that must be removed first.';
        isRetryable = false;
    } else if (error.code === '42501') {
        message = "You don't have permission to perform this action.";
        isRetryable = false;
    } else if (error.code === 'PGRST116' || error.status === 404) {
        message = 'The requested item was not found.';
        isRetryable = false;
    } else if (error.code === 'PGRST301') {
        message = 'Access denied. Please check your permissions.';
        isRetryable = false;
    } else if (error.message?.includes('JWT')) {
        message = 'Your session has expired. Please log in again.';
        isRetryable = false;
        // Redirect to login after a delay
        setTimeout(() => {
            localStorage.removeItem('auth_user');
            window.location.href = '/pages/login.html';
        }, 2000);
    } else if (isNetworkError(error)) {
        message = 'Connection lost. Please check your internet connection and try again.';
        isRetryable = true;
    } else if (error.message?.includes('timeout')) {
        message = 'Request timed out. Please try again.';
        isRetryable = true;
    } else if (error.message?.includes('rate limit')) {
        message = 'Too many requests. Please wait a moment and try again.';
        isRetryable = false;
    }

    return {
        message,
        code,
        isRetryable,
        originalError: error
    };
}

/**
 * Handle authentication-specific errors
 * @param {Error} error - Authentication error object
 * @returns {Object} Error details with user-friendly message
 */
export function handleAuthError(error) {
    console.error('Auth Error:', error);

    let message = 'Authentication failed. Please try again.';
    let code = error.code || error.status || 'AUTH_ERROR';
    let isRetryable = false;

    const errorMessage = error.message?.toLowerCase() || '';

    if (errorMessage.includes('invalid login') || 
        errorMessage.includes('invalid credentials') ||
        errorMessage.includes('email not confirmed')) {
        message = 'Email or password is incorrect. Please try again.';
    } else if (errorMessage.includes('email already') || 
               errorMessage.includes('user already registered')) {
        message = 'An account with this email already exists.';
    } else if (errorMessage.includes('password') && 
               (errorMessage.includes('weak') || errorMessage.includes('short'))) {
        message = 'Password must be at least 8 characters long and include uppercase, lowercase, and numbers.';
    } else if (errorMessage.includes('rate limit') || 
               errorMessage.includes('too many')) {
        message = 'Too many login attempts. Please wait 5 minutes and try again.';
    } else if (errorMessage.includes('network') || 
               errorMessage.includes('fetch')) {
        message = 'Connection error. Please check your internet connection.';
        isRetryable = true;
    } else if (errorMessage.includes('email not confirmed')) {
        message = 'Please verify your email address before logging in.';
    } else if (errorMessage.includes('invalid email')) {
        message = 'Please enter a valid email address.';
    } else if (errorMessage.includes('user not found')) {
        message = 'No account found with this email address.';
    }

    return {
        message,
        code,
        isRetryable,
        originalError: error
    };
}

/**
 * Handle file upload and storage errors
 * @param {Error} error - File operation error
 * @param {Object} fileInfo - Information about the file being processed
 * @returns {Object} Error details with user-friendly message
 */
export function handleFileError(error, fileInfo = {}) {
    console.error('File Error:', error, fileInfo);

    let message = 'File operation failed. Please try again.';
    let code = error.code || 'FILE_ERROR';
    let isRetryable = false;

    const errorMessage = error.message?.toLowerCase() || '';

    if (errorMessage.includes('size') || errorMessage.includes('large')) {
        const fileType = fileInfo.type?.includes('image') ? 'images' : 'documents';
        const limit = fileType === 'images' ? '5MB' : '50MB';
        message = `File exceeds size limit (${limit} for ${fileType}). Please choose a smaller file.`;
    } else if (errorMessage.includes('type') || errorMessage.includes('format')) {
        const allowedTypes = fileInfo.allowedTypes?.join(', ') || 'supported file types';
        message = `Invalid file type. Please upload ${allowedTypes}.`;
    } else if (errorMessage.includes('quota') || errorMessage.includes('storage')) {
        message = 'Storage limit reached. Please delete old files to free up space.';
    } else if (errorMessage.includes('permission') || errorMessage.includes('access')) {
        message = "You don't have permission to upload files to this location.";
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        message = 'Upload failed due to connection issues. Please try again.';
        isRetryable = true;
    } else if (errorMessage.includes('bucket')) {
        message = 'Storage configuration error. Please contact support.';
    }

    return {
        message,
        code,
        isRetryable,
        originalError: error
    };
}

/**
 * Log error to console (development) or error tracking service (production)
 * @param {Error} error - Error object to log
 * @param {Object} context - Additional context about the error
 */
export function logError(error, context = {}) {
    const timestamp = new Date().toISOString();
    const errorData = {
        timestamp,
        page: context.page || window.location.pathname,
        action: context.action || 'unknown',
        userId: context.userId || 'anonymous',
        message: error.message || 'Unknown error',
        stack: error.stack,
        context
    };

    // Console log in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.group(`[ERROR] ${timestamp} - ${errorData.page} - ${errorData.action}`);
        console.error('Message:', errorData.message);
        console.error('Error:', error);
        if (context && Object.keys(context).length > 0) {
            console.error('Context:', context);
        }
        console.groupEnd();
    }

    // In production, send to error tracking service (e.g., Sentry)
    // Example:
    // if (window.Sentry) {
    //     window.Sentry.captureException(error, {
    //         tags: {
    //             page: errorData.page,
    //             action: errorData.action
    //         },
    //         extra: context
    //     });
    // }

    // Store recent errors in localStorage for debugging
    try {
        const recentErrors = JSON.parse(localStorage.getItem('recent_errors') || '[]');
        recentErrors.unshift({
            timestamp,
            message: errorData.message,
            page: errorData.page,
            action: errorData.action
        });
        // Keep only last 10 errors
        localStorage.setItem('recent_errors', JSON.stringify(recentErrors.slice(0, 10)));
    } catch (e) {
        // Ignore localStorage errors
    }
}

/**
 * Show user-friendly error message and log the error
 * @param {Error} error - Error object
 * @param {string} fallbackMessage - Fallback message if error type can't be determined
 * @param {Object} context - Additional context for logging
 */
export function showFriendlyError(error, fallbackMessage = 'An error occurred', context = {}) {
    let errorDetails;

    // Determine error type and get appropriate handler
    if (error.message?.includes('auth') || 
        error.code?.includes('auth') ||
        context.type === 'auth') {
        errorDetails = handleAuthError(error);
    } else if (error.message?.includes('file') || 
               error.message?.includes('upload') ||
               context.type === 'file') {
        errorDetails = handleFileError(error, context.fileInfo);
    } else if (error.message?.includes('supabase') || 
               error.code?.startsWith('23') ||
               error.code?.startsWith('42') ||
               error.code?.startsWith('PGRST')) {
        errorDetails = handleSupabaseError(error);
    } else {
        errorDetails = {
            message: error.message || fallbackMessage,
            code: 'UNKNOWN',
            isRetryable: false,
            originalError: error
        };
    }

    // Log the error
    logError(error, {
        ...context,
        errorDetails
    });

    // Show user-friendly message
    showError(errorDetails.message);

    return errorDetails;
}

/**
 * Check if error is a network/connection error
 * @param {Error} error - Error to check
 * @returns {boolean} True if network error
 */
export function isNetworkError(error) {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorName = error.name?.toLowerCase() || '';

    return (
        errorMessage.includes('network') ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('offline') ||
        errorMessage.includes('timeout') ||
        errorName === 'networkerror' ||
        errorName === 'typeerror' && errorMessage.includes('failed to fetch') ||
        !navigator.onLine
    );
}

/**
 * Determine if an operation should be retried based on error type
 * @param {Error} error - Error to check
 * @returns {boolean} True if operation should be retried
 */
export function shouldRetry(error) {
    // Network errors are retryable
    if (isNetworkError(error)) {
        return true;
    }

    // Timeout errors are retryable
    if (error.message?.includes('timeout')) {
        return true;
    }

    // Rate limit errors should not be retried immediately
    if (error.message?.includes('rate limit') || error.message?.includes('too many')) {
        return false;
    }

    // Auth errors should not be retried
    if (error.message?.includes('auth') || 
        error.message?.includes('credential') ||
        error.message?.includes('permission')) {
        return false;
    }

    // Database constraint errors should not be retried
    if (error.code?.startsWith('23') || error.code?.startsWith('42')) {
        return false;
    }

    // Server errors (5xx) are sometimes retryable
    if (error.status >= 500 && error.status < 600) {
        return true;
    }

    // Default: don't retry
    return false;
}

/**
 * Retry an async operation with exponential backoff
 * @param {Function} operation - Async function to retry
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} initialDelay - Initial delay in milliseconds
 * @returns {Promise} Result of the operation
 */
export async function retryOperation(operation, maxRetries = 3, initialDelay = 1000) {
    let lastError;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Attempt the operation
            const result = await operation();
            return result;
        } catch (error) {
            lastError = error;

            // Check if we should retry
            if (attempt < maxRetries && shouldRetry(error)) {
                console.warn(`Operation failed (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay}ms...`);
                
                // Wait before retrying with exponential backoff
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Double the delay for next retry
            } else {
                // Don't retry
                break;
            }
        }
    }

    // All retries failed
    throw lastError;
}

// ============================================================================
// OFFLINE DETECTION
// ============================================================================

let isOffline = false;
let offlineBanner = null;

/**
 * Initialize offline detection and show/hide banner
 */
export function initOfflineDetection() {
    // Create offline banner
    offlineBanner = document.createElement('div');
    offlineBanner.id = 'offline-banner';
    offlineBanner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background-color: #ef4444;
        color: white;
        padding: 1rem;
        text-align: center;
        z-index: 10000;
        display: none;
        animation: slideInDown 0.3s ease;
    `;
    offlineBanner.innerHTML = `
        <i class="bi bi-wifi-off"></i>
        <strong>No internet connection</strong> - Changes will be saved when you're back online
    `;
    document.body.appendChild(offlineBanner);

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial state
    if (!navigator.onLine) {
        handleOffline();
    }
}

/**
 * Handle offline event
 */
function handleOffline() {
    isOffline = true;
    if (offlineBanner) {
        offlineBanner.style.display = 'block';
    }
    showWarning('You are offline. Changes will be saved when connection is restored.');
}

/**
 * Handle online event
 */
function handleOnline() {
    isOffline = false;
    if (offlineBanner) {
        offlineBanner.style.display = 'none';
    }
    showWarning('Connection restored. Syncing changes...');
    
    // Trigger any queued operations
    processOfflineQueue();
}

/**
 * Check if currently offline
 * @returns {boolean} True if offline
 */
export function checkOffline() {
    return isOffline || !navigator.onLine;
}

/**
 * Process queued operations when back online
 */
async function processOfflineQueue() {
    try {
        const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
        
        if (queue.length === 0) {
            return;
        }

        console.log(`Processing ${queue.length} queued operations...`);

        for (const item of queue) {
            try {
                // Process queued operation
                // This would depend on your application structure
                console.log('Processing queued operation:', item);
            } catch (error) {
                console.error('Failed to process queued operation:', error);
            }
        }

        // Clear queue
        localStorage.removeItem('offline_queue');
    } catch (error) {
        console.error('Error processing offline queue:', error);
    }
}

/**
 * Add operation to offline queue
 * @param {Object} operation - Operation to queue
 */
export function queueOfflineOperation(operation) {
    try {
        const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
        queue.push({
            ...operation,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('offline_queue', JSON.stringify(queue));
    } catch (error) {
        console.error('Failed to queue operation:', error);
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    handleSupabaseError,
    handleAuthError,
    handleFileError,
    logError,
    showFriendlyError,
    isNetworkError,
    shouldRetry,
    retryOperation,
    initOfflineDetection,
    checkOffline,
    queueOfflineOperation
};
