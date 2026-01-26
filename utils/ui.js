/**
 * UI Feedback and State Management
 * Handles loading states, notifications, dialogs, and form feedback
 */

// Import notification system
import {
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showLoading as notifyLoading,
  updateNotification,
  dismissNotification,
  confirm,
  prompt
} from './notifications.js';

// Re-export notification functions
export { showSuccess, showError, showWarning, showInfo, confirm, prompt, updateNotification, dismissNotification };

// Store references for cleanup
let currentLoadingOverlay = null;

// ==================== LOADING STATES ====================

/**
 * Show full-page loading overlay
 * @param {string} message - Loading message (default: 'Loading...')
 */
export function showLoading(message = 'Loading...') {
  // Remove existing overlay if present
  hideLoading();

  currentLoadingOverlay = document.createElement('div');
  currentLoadingOverlay.className = 'fixed-top w-100 h-100 d-flex align-items-center justify-content-center';
  currentLoadingOverlay.style.cssText = `
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 9999;
    backdrop-filter: blur(2px);
  `;
  currentLoadingOverlay.setAttribute('role', 'status');
  currentLoadingOverlay.setAttribute('aria-live', 'polite');
  currentLoadingOverlay.setAttribute('aria-label', message);

  const spinnerDiv = document.createElement('div');
  spinnerDiv.className = 'text-center text-white';
  spinnerDiv.innerHTML = `
    <div class="spinner-border mb-3" style="width: 3rem; height: 3rem;" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>
    <p class="fs-5">${sanitizeText(message)}</p>
  `;

  currentLoadingOverlay.appendChild(spinnerDiv);
  document.body.appendChild(currentLoadingOverlay);
}

/**
 * Hide loading overlay
 */
export function hideLoading() {
  if (currentLoadingOverlay) {
    currentLoadingOverlay.remove();
    currentLoadingOverlay = null;
  }
}

/**
 * Show button loading state
 * @param {HTMLElement} buttonElement - Button to show loading state
 * @param {string} text - Loading text (default: 'Loading...')
 */
export function showButtonLoading(buttonElement, text = 'Loading...') {
  if (!buttonElement || !(buttonElement instanceof HTMLElement)) return;

  // Store original state
  buttonElement.dataset.originalHTML = buttonElement.innerHTML;
  buttonElement.dataset.originalDisabled = buttonElement.disabled;

  // Update button state
  buttonElement.disabled = true;
  buttonElement.innerHTML = `
    <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
    ${sanitizeText(text)}
  `;
}

/**
 * Hide button loading state
 * @param {HTMLElement} buttonElement - Button to restore
 */
export function hideButtonLoading(buttonElement) {
  if (!buttonElement || !(buttonElement instanceof HTMLElement)) return;

  // Restore original state
  if (buttonElement.dataset.originalHTML) {
    buttonElement.innerHTML = buttonElement.dataset.originalHTML;
  }

  const wasDisabled = buttonElement.dataset.originalDisabled === 'true';
  buttonElement.disabled = wasDisabled;

  // Clean up data attributes
  delete buttonElement.dataset.originalHTML;
  delete buttonElement.dataset.originalDisabled;
}

// ==================== TOAST CONTAINER (Helper) ====================
export const prompt = notifyPrompt;

// ==================== LEGACY FUNCTIONS (KEPT FOR COMPATIBILITY) ====================

/**
 * Create toast container if it doesn't exist
 */
function ensureToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
    toastContainer.style.zIndex = '9999';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

/**
 * Create toast element
 * @param {string} message - Toast message
 * @param {string} type - Type (success, error, info, warning)
 * @returns {HTMLElement} Toast element
 */
function createToast(message, type) {
  const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const bgClass = {
    'success': 'bg-success',
    'error': 'bg-danger',
    'info': 'bg-info',
    'warning': 'bg-warning'
  }[type] || 'bg-secondary';

  const iconClass = {
    'success': 'bi-check-circle',
    'error': 'bi-exclamation-circle',
    'info': 'bi-info-circle',
    'warning': 'bi-exclamation-triangle'
  }[type] || 'bi-info-circle';

  const toastDiv = document.createElement('div');
  toastDiv.id = toastId;
  toastDiv.className = `toast align-items-center text-white border-0 ${bgClass}`;
  toastDiv.setAttribute('role', 'alert');
  toastDiv.setAttribute('aria-live', 'assertive');
  toastDiv.setAttribute('aria-atomic', 'true');
  toastDiv.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <i class="bi ${iconClass} me-2"></i>${sanitizeText(message)}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

  return toastDiv;
}

// Toast functions are now imported and re-exported from notifications.js
// (See top of file for imports)

// ==================== DIALOGS (MODALS) ====================

// confirm() and prompt() are imported and re-exported from notifications.js
// (See top of file for imports)

/**
 * Create and show alert dialog
 * @param {string} message - Alert message
 * @param {string} title - Modal title (default: 'Alert')
 */
export function alert(message, title = 'Alert') {
  const modalId = `alert-modal-${Date.now()}`;

  const modalDiv = document.createElement('div');
  modalDiv.id = modalId;
  modalDiv.className = 'modal fade';
  modalDiv.tabIndex = '-1';
  modalDiv.setAttribute('aria-labelledby', `${modalId}-label`);
  modalDiv.setAttribute('aria-hidden', 'true');
  modalDiv.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header border-0">
          <h5 class="modal-title" id="${modalId}-label">${sanitizeText(title)}</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          ${sanitizeText(message)}
        </div>
        <div class="modal-footer border-0">
          <button type="button" class="btn btn-primary" data-bs-dismiss="modal">OK</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modalDiv);

  const modal = new window.bootstrap.Modal(modalDiv, {
    backdrop: 'static',
    keyboard: true
  });

  modalDiv.addEventListener('hidden.bs.modal', () => {
    modalDiv.remove();
  }, { once: true });

  modal.show();
  currentModal = modal;
}

// ==================== FORM FEEDBACK ====================

/**
 * Show field error
 * @param {HTMLElement} inputElement - Input element
 * @param {string} message - Error message
 */
export function showFieldError(inputElement, message) {
  if (!inputElement || !(inputElement instanceof HTMLElement)) return;

  // Add invalid class
  inputElement.classList.add('is-invalid');

  // Find or create feedback div
  let feedbackDiv = inputElement.parentElement.querySelector('.invalid-feedback');
  if (!feedbackDiv) {
    feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'invalid-feedback d-block';
    inputElement.parentElement.appendChild(feedbackDiv);
  }

  feedbackDiv.textContent = message;
  feedbackDiv.style.display = 'block';
}

/**
 * Clear field error
 * @param {HTMLElement} inputElement - Input element
 */
export function clearFieldError(inputElement) {
  if (!inputElement || !(inputElement instanceof HTMLElement)) return;

  // Remove invalid class
  inputElement.classList.remove('is-invalid');

  // Hide feedback div
  const feedbackDiv = inputElement.parentElement.querySelector('.invalid-feedback');
  if (feedbackDiv) {
    feedbackDiv.style.display = 'none';
  }
}

/**
 * Clear all field errors in form
 * @param {HTMLElement} formElement - Form element
 */
export function clearAllFieldErrors(formElement) {
  if (!formElement || !(formElement instanceof HTMLElement)) return;

  // Clear all invalid inputs
  formElement.querySelectorAll('.is-invalid').forEach(input => {
    clearFieldError(input);
  });
}

/**
 * Show form success message
 * @param {HTMLElement} formElement - Form element
 * @param {string} message - Success message
 */
export function showFormSuccess(formElement, message) {
  if (!formElement || !(formElement instanceof HTMLElement)) return;

  // Create alert if it doesn't exist
  let alertDiv = formElement.querySelector('.form-alert');
  if (!alertDiv) {
    alertDiv = document.createElement('div');
    alertDiv.className = 'form-alert';
    formElement.insertBefore(alertDiv, formElement.firstChild);
  }

  alertDiv.className = 'alert alert-success alert-dismissible fade show form-alert';
  alertDiv.setAttribute('role', 'alert');
  alertDiv.innerHTML = `
    <i class="bi bi-check-circle me-2"></i>${sanitizeText(message)}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;

  // Scroll to form
  formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Show form error message
 * @param {HTMLElement} formElement - Form element
 * @param {string} message - Error message
 */
export function showFormError(formElement, message) {
  if (!formElement || !(formElement instanceof HTMLElement)) return;

  // Create alert if it doesn't exist
  let alertDiv = formElement.querySelector('.form-alert');
  if (!alertDiv) {
    alertDiv = document.createElement('div');
    alertDiv.className = 'form-alert';
    formElement.insertBefore(alertDiv, formElement.firstChild);
  }

  alertDiv.className = 'alert alert-danger alert-dismissible fade show form-alert';
  alertDiv.setAttribute('role', 'alert');
  alertDiv.innerHTML = `
    <i class="bi bi-exclamation-circle me-2"></i>${sanitizeText(message)}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;

  // Scroll to form
  formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Sanitize text to prevent XSS
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Sanitize attribute value
 * @param {string} value - Value to sanitize
 * @returns {string} Sanitized value
 */
function sanitizeAttr(value) {
  if (!value || typeof value !== 'string') return '';
  return value.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Close current modal
 */
export function closeCurrentModal() {
  if (currentModal) {
    currentModal.hide();
    currentModal = null;
  }
}

/**
 * Cleanup all UI elements
 */
export function cleanup() {
  hideLoading();
  closeCurrentModal();
  
  // Remove all toasts
  if (toastContainer) {
    const toasts = toastContainer.querySelectorAll('.toast');
    toasts.forEach(toast => toast.remove());
  }
}

// ==================== EXPORT ALL FUNCTIONS ====================

export default {
  // Loading states
  showLoading,
  hideLoading,
  showButtonLoading,
  hideButtonLoading,
  // Notifications
  showSuccess,
  showError,
  showInfo,
  showWarning,
  // Dialogs
  confirm,
  prompt,
  alert,
  // Form feedback
  showFieldError,
  clearFieldError,
  clearAllFieldErrors,
  showFormSuccess,
  showFormError,
  // Utilities
  closeCurrentModal,
  cleanup
};

// ==================== ENHANCED LOADING UTILITIES ====================

/**
 * Show global loading overlay
 * @param {string} message - Loading message (default: 'Loading...')
 */
export function showGlobalLoading(message = 'Loading...') {
  const loader = document.getElementById('globalLoader');
  if (loader) {
    const text = loader.querySelector('.loading-text');
    if (text) text.textContent = message;
    loader.style.display = 'flex';
  }
}

/**
 * Hide global loading overlay
 */
export function hideGlobalLoading() {
  const loader = document.getElementById('globalLoader');
  if (loader) {
    loader.style.display = 'none';
  }
}

/**
 * Add loading state to button
 * @param {string} buttonId - Button ID
 * @param {boolean} loading - Loading state (default: true)
 */
export function setButtonLoading(buttonId, loading = true) {
  const button = document.getElementById(buttonId);
  if (!button) return;
  
  if (loading) {
    button.classList.add('loading');
    button.disabled = true;
  } else {
    button.classList.remove('loading');
    button.disabled = false;
  }
}

/**
 * Show progress bar
 */
export function showProgressBar() {
  let bar = document.getElementById('progressBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'progressBar';
    bar.className = 'progress-loading';
    bar.innerHTML = '<div class="progress-loading-bar"></div>';
    document.body.appendChild(bar);
  }
  bar.style.display = 'block';
}

/**
 * Hide progress bar
 */
export function hideProgressBar() {
  const bar = document.getElementById('progressBar');
  if (bar) {
    setTimeout(() => {
      bar.style.display = 'none';
    }, 300);
  }
}
