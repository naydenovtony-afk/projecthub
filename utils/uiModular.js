/**
 * Enhanced UI Utilities - Modular Version
 * Centralized UI interaction and notification system
 */

let toastContainer;
let loadingOverlay;

/**
 * Ensure toast container exists
 */
function ensureToastContainer() {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }
    return toastContainer;
}

/**
 * Show success notification
 * @param {string} message - Success message to display
 */
export function showSuccess(message) {
    ensureToastContainer();
    const toast = createToast(message, 'success');
    showToast(toast);
}

/**
 * Show error notification
 * @param {string} message - Error message to display
 */
export function showError(message) {
    ensureToastContainer();
    const toast = createToast(message, 'error');
    showToast(toast);
}

/**
 * Show info notification
 * @param {string} message - Info message to display
 */
export function showInfo(message) {
    ensureToastContainer();
    const toast = createToast(message, 'info');
    showToast(toast);
}

/**
 * Create a toast element
 * @param {string} message - Toast message
 * @param {string} type - Toast type (success, error, info)
 * @returns {HTMLElement} Toast element
 */
function createToast(message, type) {
    const toastId = 'toast-' + Date.now();
    const iconClass = type === 'success' ? 'bi-check-circle-fill text-success' :
                     type === 'error' ? 'bi-exclamation-triangle-fill text-danger' :
                     'bi-info-circle-fill text-primary';
    
    const toastHtml = `
        <div class="toast align-items-center text-bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'primary'} border-0" 
             id="${toastId}" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi ${iconClass} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                        data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = toastHtml;
    return tempDiv.firstElementChild;
}

/**
 * Show toast notification
 * @param {HTMLElement} toastElement - Toast element to show
 */
function showToast(toastElement) {
    ensureToastContainer().appendChild(toastElement);
    
    const bsToast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: 4000
    });
    
    bsToast.show();
    
    // Remove element after it's hidden
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

/**
 * Show confirmation dialog
 * @param {string} message - Confirmation message
 * @param {string} title - Dialog title
 * @returns {Promise<boolean>} Promise that resolves to true if confirmed
 */
export function confirm(message, title = 'Confirm Action') {
    return new Promise((resolve) => {
        const modalId = 'confirmModal-' + Date.now();
        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${message}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary confirm-btn">Confirm</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = modalHtml;
        const modalElement = tempDiv.firstElementChild;
        document.body.appendChild(modalElement);
        
        const modal = new bootstrap.Modal(modalElement);
        
        modalElement.querySelector('.confirm-btn').addEventListener('click', () => {
            modal.hide();
            resolve(true);
        });
        
        modalElement.addEventListener('hidden.bs.modal', () => {
            modalElement.remove();
            resolve(false);
        });
        
        modal.show();
    });
}

/**
 * Show loading overlay
 * @param {string} message - Loading message
 */
export function showLoading(message = 'Loading...') {
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
        loadingOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        loadingOverlay.style.zIndex = '9998';
        loadingOverlay.innerHTML = `
            <div class="text-center text-white">
                <div class="spinner-border mb-3" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <div class="loading-message">${message}</div>
            </div>
        `;
    }
    
    loadingOverlay.querySelector('.loading-message').textContent = message;
    document.body.appendChild(loadingOverlay);
}

/**
 * Hide loading overlay
 */
export function hideLoading() {
    if (loadingOverlay && loadingOverlay.parentNode) {
        loadingOverlay.parentNode.removeChild(loadingOverlay);
    }
}

/**
 * Show modal with custom content
 * @param {string} title - Modal title
 * @param {string} content - Modal content HTML
 * @param {Object} options - Modal options
 * @returns {Promise<HTMLElement>} Promise that resolves to modal element
 */
export function showModal(title, content, options = {}) {
    const modalId = 'customModal-' + Date.now();
    const modalSize = options.size ? `modal-${options.size}` : '';
    
    const modalHtml = `
        <div class="modal fade" id="${modalId}" tabindex="-1">
            <div class="modal-dialog ${modalSize} modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                    ${options.showFooter !== false ? `
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = modalHtml;
    const modalElement = tempDiv.firstElementChild;
    document.body.appendChild(modalElement);
    
    const modal = new bootstrap.Modal(modalElement);
    
    modalElement.addEventListener('hidden.bs.modal', () => {
        modalElement.remove();
    });
    
    modal.show();
    
    return Promise.resolve(modalElement);
}

/**
 * Update button loading state
 * @param {HTMLElement} button - Button element
 * @param {boolean} loading - Loading state
 * @param {string} loadingText - Loading text
 */
export function updateButtonLoading(button, loading, loadingText = 'Loading...') {
    if (!button) return;
    
    if (loading) {
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${loadingText}`;
    } else {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText || 'Submit';
        delete button.dataset.originalText;
    }
}