/* ========================================
   TOAST NOTIFICATIONS SYSTEM
   ======================================== */

// Notification container
let notificationContainer = null;

// Initialize notification system
function initNotifications() {
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'notificationContainer';
    notificationContainer.className = 'notification-container';
    document.body.appendChild(notificationContainer);
  }
}

// Show notification
function showNotification(message, type = 'info', duration = 4000, options = {}) {
  initNotifications();
  
  const notification = document.createElement('div');
  notification.className = `toast-notification toast-${type} slide-in-right`;
  
  const icon = getNotificationIcon(type);
  const id = 'notification-' + Date.now();
  notification.id = id;
  
  notification.innerHTML = `
    <div class="toast-icon">
      <i class="bi bi-${icon}"></i>
    </div>
    <div class="toast-content">
      <div class="toast-message">${message}</div>
      ${options.description ? `<div class="toast-description">${options.description}</div>` : ''}
    </div>
    ${options.dismissible !== false ? `
      <button class="toast-close" onclick="dismissNotification('${id}')">
        <i class="bi bi-x"></i>
      </button>
    ` : ''}
    ${options.action ? `
      <button class="toast-action" onclick="${options.action.onClick}">
        ${options.action.text}
      </button>
    ` : ''}
  `;
  
  notificationContainer.appendChild(notification);
  
  // Auto dismiss
  if (duration > 0 && options.persistent !== true) {
    setTimeout(() => {
      dismissNotification(id);
    }, duration);
  }
  
  // Add progress bar if duration is set
  if (duration > 0 && options.showProgress !== false) {
    const progressBar = document.createElement('div');
    progressBar.className = 'toast-progress';
    progressBar.style.animation = `shrink ${duration}ms linear`;
    notification.appendChild(progressBar);
  }
  
  return id;
}

// Get icon for notification type
function getNotificationIcon(type) {
  const icons = {
    success: 'check-circle-fill',
    error: 'x-circle-fill',
    warning: 'exclamation-triangle-fill',
    info: 'info-circle-fill',
    loading: 'arrow-repeat'
  };
  return icons[type] || icons.info;
}

// Dismiss notification
function dismissNotification(id) {
  const notification = document.getElementById(id);
  if (notification) {
    notification.classList.add('slide-out-right');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }
}

// Shorthand functions
function showSuccess(message, options = {}) {
  return showNotification(message, 'success', 4000, options);
}

function showError(message, options = {}) {
  return showNotification(message, 'error', 5000, options);
}

function showWarning(message, options = {}) {
  return showNotification(message, 'warning', 4500, options);
}

function showInfo(message, options = {}) {
  return showNotification(message, 'info', 4000, options);
}

function showLoading(message, options = {}) {
  return showNotification(message, 'loading', 0, { 
    persistent: true, 
    dismissible: false,
    showProgress: false,
    ...options 
  });
}

// Update existing notification
function updateNotification(id, message, type) {
  const notification = document.getElementById(id);
  if (notification) {
    const messageEl = notification.querySelector('.toast-message');
    const iconEl = notification.querySelector('.toast-icon i');
    
    if (messageEl) messageEl.textContent = message;
    if (iconEl) iconEl.className = `bi bi-${getNotificationIcon(type)}`;
    
    notification.className = `toast-notification toast-${type}`;
    
    // Auto dismiss updated notification
    if (type !== 'loading') {
      setTimeout(() => {
        dismissNotification(id);
      }, 4000);
    }
  }
}

// Confirm dialog (returns Promise)
function confirm(title, message, options = {}) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'confirm-modal-overlay';
    modal.innerHTML = `
      <div class="confirm-modal slide-in-up">
        <div class="confirm-header">
          <h5 class="confirm-title">${title}</h5>
        </div>
        <div class="confirm-body">
          <p class="confirm-message">${message}</p>
        </div>
        <div class="confirm-footer">
          <button class="btn btn-secondary" id="confirmCancel">
            ${options.cancelText || 'Cancel'}
          </button>
          <button class="btn ${options.danger ? 'btn-danger' : 'btn-primary'}" id="confirmOk">
            ${options.confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Focus on confirm button
    setTimeout(() => {
      document.getElementById('confirmOk')?.focus();
    }, 100);
    
    const cleanup = () => {
      modal.classList.add('fade-out');
      setTimeout(() => {
        modal.remove();
        document.body.style.overflow = '';
      }, 200);
    };
    
    document.getElementById('confirmOk').onclick = () => {
      cleanup();
      resolve(true);
    };
    
    document.getElementById('confirmCancel').onclick = () => {
      cleanup();
      resolve(false);
    };
    
    // Close on overlay click
    modal.onclick = (e) => {
      if (e.target === modal) {
        cleanup();
        resolve(false);
      }
    };
    
    // Close on Escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        cleanup();
        resolve(false);
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  });
}

// Prompt dialog (returns Promise with input value)
function showPrompt(title, message, defaultValue = '', options = {}) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'confirm-modal-overlay';
    modal.innerHTML = `
      <div class="confirm-modal slide-in-up">
        <div class="confirm-header">
          <h5 class="confirm-title">${title}</h5>
        </div>
        <div class="confirm-body">
          <p class="confirm-message">${message}</p>
          <input type="${options.inputType || 'text'}" 
                 class="form-control mt-3" 
                 id="promptInput" 
                 value="${defaultValue}"
                 placeholder="${options.placeholder || ''}"
                 ${options.required ? 'required' : ''}>
        </div>
        <div class="confirm-footer">
          <button class="btn btn-secondary" id="promptCancel">Cancel</button>
          <button class="btn btn-primary" id="promptOk">OK</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    const input = document.getElementById('promptInput');
    input.focus();
    input.select();
    
    const cleanup = () => {
      modal.classList.add('fade-out');
      setTimeout(() => {
        modal.remove();
        document.body.style.overflow = '';
      }, 200);
    };
    
    const submit = () => {
      const value = input.value.trim();
      if (options.required && !value) {
        input.classList.add('is-invalid');
        return;
      }
      cleanup();
      resolve(value);
    };
    
    document.getElementById('promptOk').onclick = submit;
    document.getElementById('promptCancel').onclick = () => {
      cleanup();
      resolve(null);
    };
    
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') submit();
    });
    
    modal.onclick = (e) => {
      if (e.target === modal) {
        cleanup();
        resolve(null);
      }
    };
  });
}

// Make dismissNotification globally accessible for inline onclick handlers
window.dismissNotification = dismissNotification;

// Export functions
export {
  showNotification,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showLoading,
  updateNotification,
  dismissNotification,
  confirm,
  showPrompt
};
