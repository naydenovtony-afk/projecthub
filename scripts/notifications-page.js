/**
 * Notifications Page - View and manage all notifications
 */

import { isDemoMode } from '../utils/demoMode.js';
import { checkAuthStatus, getCurrentUser, addDemoParamToLinks } from './auth.js';
import { showNotification } from '../utils/notifications.js';

let allNotifications = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  if (!checkAuthStatus()) return;
  
  await loadNotifications();
  setupEventListeners();
  addDemoParamToLinks();
});

// Load notifications
async function loadNotifications() {
  try {
    // Generate demo notifications
    allNotifications = generateDemoNotifications();
    
    renderNotifications();
  } catch (error) {
    console.error('Error loading notifications:', error);
    showNotification('Failed to load notifications', 'error');
    renderEmptyState();
  }
}

// Generate demo notifications
function generateDemoNotifications() {
  const now = new Date();
  const types = ['project', 'task', 'message', 'system'];
  
  return [
    {
      id: '1',
      type: 'project',
      title: 'New project created',
      message: 'Website Redesign project has been created',
      read: false,
      created_at: new Date(now - 1000 * 60 * 30).toISOString(), // 30 mins ago
      link: './projects.html'
    },
    {
      id: '2',
      type: 'task',
      title: 'Task completed',
      message: 'Design mockups task has been marked as complete',
      read: false,
      created_at: new Date(now - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      link: './tasks.html'
    },
    {
      id: '3',
      type: 'message',
      title: 'New message',
      message: 'You have a new message from John Doe',
      read: false,
      created_at: new Date(now - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
      link: './messages.html'
    },
    {
      id: '4',
      type: 'task',
      title: 'Task overdue',
      message: 'Database setup task is overdue',
      read: true,
      created_at: new Date(now - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      link: './tasks.html'
    },
    {
      id: '5',
      type: 'project',
      title: 'Project status updated',
      message: 'Mobile App project status changed to Active',
      read: true,
      created_at: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
      link: './projects.html'
    },
    {
      id: '6',
      type: 'system',
      title: 'Welcome to ProjectHub!',
      message: 'Thank you for using ProjectHub. Get started by creating your first project.',
      read: true,
      created_at: new Date(now - 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days ago
      link: './dashboard.html'
    }
  ];
}

// Render notifications
function renderNotifications() {
  const container = document.getElementById('notificationsList');
  
  const filteredNotifications = applyFilters();
  
  if (filteredNotifications.length === 0) {
    renderEmptyState();
    return;
  }
  
  container.innerHTML = filteredNotifications.map(notification => `
    <div class="list-group-item list-group-item-action ${notification.read ? '' : 'bg-light'}" 
         data-notification-id="${notification.id}">
      <div class="d-flex w-100 justify-content-between align-items-start">
        <div class="flex-grow-1">
          <div class="d-flex align-items-center mb-2">
            ${getNotificationIcon(notification.type)}
            <h6 class="mb-0 ms-2 ${notification.read ? '' : 'fw-bold'}">${escapeHtml(notification.title)}</h6>
            ${!notification.read ? '<span class="badge bg-primary ms-2">New</span>' : ''}
          </div>
          <p class="mb-2 text-muted">${escapeHtml(notification.message)}</p>
          <small class="text-muted">
            <i class="bi bi-clock me-1"></i>${formatTimeAgo(notification.created_at)}
          </small>
        </div>
        <div class="ms-3">
          <div class="btn-group-vertical btn-group-sm">
            ${!notification.read ? `
              <button class="btn btn-outline-secondary" onclick="markAsRead('${notification.id}')" title="Mark as read">
                <i class="bi bi-check"></i>
              </button>
            ` : ''}
            <a href="${notification.link}" class="btn btn-outline-primary" title="View">
              <i class="bi bi-arrow-right"></i>
            </a>
            <button class="btn btn-outline-danger" onclick="deleteNotification('${notification.id}')" title="Delete">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

// Apply filters
function applyFilters() {
  const typeFilter = document.getElementById('filterType').value;
  const statusFilter = document.getElementById('filterStatus').value;
  const searchQuery = document.getElementById('searchNotifications').value.toLowerCase();
  
  return allNotifications.filter(notification => {
    if (typeFilter && notification.type !== typeFilter) return false;
    if (statusFilter === 'unread' && notification.read) return false;
    if (statusFilter === 'read' && !notification.read) return false;
    if (searchQuery) {
      const searchableText = `${notification.title} ${notification.message}`.toLowerCase();
      if (!searchableText.includes(searchQuery)) return false;
    }
    return true;
  });
}

// Render empty state
function renderEmptyState() {
  const container = document.getElementById('notificationsList');
  container.innerHTML = `
    <div class="list-group-item text-center py-5">
      <i class="bi bi-bell-slash text-muted" style="font-size: 3rem;"></i>
      <p class="text-muted mt-3 mb-0">No notifications to display</p>
    </div>
  `;
}

// Setup event listeners
function setupEventListeners() {
  // Filter changes
  ['filterType', 'filterStatus'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', renderNotifications);
  });
  
  document.getElementById('searchNotifications')?.addEventListener('input', renderNotifications);
  
  // Mark all as read
  document.getElementById('markAllReadBtn')?.addEventListener('click', markAllAsRead);
  
  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = './login.html';
  });
}

// Mark notification as read
window.markAsRead = function(notificationId) {
  const notification = allNotifications.find(n => n.id === notificationId);
  if (notification) {
    notification.read = true;
    renderNotifications();
    showNotification('Marked as read', 'success');
  }
};

// Mark all as read
function markAllAsRead() {
  allNotifications.forEach(n => n.read = true);
  renderNotifications();
  showNotification('All notifications marked as read', 'success');
}

// Delete notification
window.deleteNotification = function(notificationId) {
  if (!confirm('Delete this notification?')) return;
  
  allNotifications = allNotifications.filter(n => n.id !== notificationId);
  renderNotifications();
  showNotification('Notification deleted', 'success');
};

// Get notification icon
function getNotificationIcon(type) {
  const icons = {
    'project': '<i class="bi bi-folder-fill text-primary"></i>',
    'task': '<i class="bi bi-check-circle-fill text-success"></i>',
    'message': '<i class="bi bi-chat-fill text-info"></i>',
    'system': '<i class="bi bi-info-circle-fill text-secondary"></i>'
  };
  return icons[type] || icons['system'];
}

// Format time ago
function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
    }
  }
  
  return 'Just now';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
