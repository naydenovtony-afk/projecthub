/**
 * Profile Page Script
 * Handles user profile display, editing, and stats
 */

import { isDemoMode, demoServices } from '../utils/demoMode.js';
import { getCurrentUser } from './auth.js';
import { showError, showSuccess } from '../utils/ui.js';
import { formatDate, getRelativeTime } from '../utils/helpers.js';

let currentUser = null;
let isDemo = false;
let userProjects = [];
let userActivity = [];

/**
 * Guard profile page for admin users.
 * @param {Object|null} user
 * @returns {boolean}
 */
function redirectAdminToPanel(user) {
  if (user?.role === 'admin') {
    window.location.href = './admin.html';
    return true;
  }

  return false;
}

/**
 * Initialize profile page
 */
export async function initProfilePage() {
  try {
    // Check demo mode
    isDemo = isDemoMode();
    
    if (isDemo) {
      currentUser = await demoServices.auth.getCurrentUser();
      showDemoBadge();
    } else {
      currentUser = await getCurrentUser();
      if (!currentUser) {
        window.location.href = './login.html';
        return;
      }

      if (redirectAdminToPanel(currentUser)) {
        return;
      }
    }
    
    // Load profile data
    await loadProfileData();
    
    // Setup event listeners
    setupEventListeners();
    
  } catch (error) {
    console.error('Profile page init error:', error);
    showError('Failed to load profile');
  }
}

/**
 * Show demo mode badge
 */
function showDemoBadge() {
  const badge = document.createElement('div');
  badge.className = 'alert alert-info alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
  badge.style.zIndex = '9999';
  badge.innerHTML = `
    <i class="bi bi-info-circle me-2"></i>
    <strong>Demo Mode:</strong> Profile changes won't be saved.
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.body.appendChild(badge);
}

/**
 * Load all profile data
 */
async function loadProfileData() {
  // Update navbar
  updateNavbar();
  
  // Update profile header
  updateProfileHeader();
  
  // Load stats
  await loadProfileStats();
  
  // Load activity
  await loadActivity();
  
  // Load projects
  await loadProjects();
}

/**
 * Update navbar with user info
 */
function updateNavbar() {
  document.getElementById('navUserName').textContent = currentUser.full_name;
  document.getElementById('navUserEmail').textContent = currentUser.email;
  
  const navAvatar = document.getElementById('navUserAvatar');
  if (currentUser.avatar_url) {
    navAvatar.innerHTML = `<img src="${currentUser.avatar_url}" alt="Avatar" class="rounded-circle" width="40" height="40">`;
  } else {
    const initials = currentUser.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
    navAvatar.innerHTML = initials;
  }
}

/**
 * Update profile header section
 */
function updateProfileHeader() {
  // Avatar
  const profileAvatar = document.getElementById('profileAvatar');
  if (currentUser.avatar_url) {
    profileAvatar.innerHTML = `<img src="${currentUser.avatar_url}" alt="Avatar">`;
  } else {
    const initials = currentUser.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
    profileAvatar.innerHTML = initials;
  }
  
  // Basic info
  document.getElementById('profileName').textContent = currentUser.full_name;
  document.getElementById('profileEmail').textContent = currentUser.email;
  document.getElementById('profileRole').textContent = currentUser.role === 'admin' ? 'Administrator' : 'User';
  
  // Additional info
  document.getElementById('profileCompany').textContent = currentUser.company || '-';
  document.getElementById('profileJobTitle').textContent = currentUser.job_title || '-';
  document.getElementById('profileBio').textContent = currentUser.bio || 'No bio yet';
  document.getElementById('profileMemberSince').textContent = formatDate(currentUser.created_at);
}

/**
 * Load user statistics
 */
async function loadProfileStats() {
  try {
    if (isDemo) {
      userProjects = await demoServices.projects.getAll(currentUser.id);
      const tasks = await demoServices.tasks.getByProject('all'); // Get all tasks
      const completedTasks = tasks.filter(t => t.status === 'done');
      
      document.getElementById('userTotalProjects').textContent = userProjects.length;
      document.getElementById('userCompletedTasks').textContent = completedTasks.length;
    } else {
      // Real mode stats
      document.getElementById('userTotalProjects').textContent = '0';
      document.getElementById('userCompletedTasks').textContent = '0';
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

/**
 * Load user activity feed
 */
async function loadActivity() {
  const container = document.getElementById('profileActivity');
  
  try {
    if (isDemo) {
      userActivity = await demoServices.activity.getByUser(currentUser.id);
    } else {
      userActivity = [];
    }
    
    if (userActivity.length === 0) {
      container.innerHTML = `
        <div class="empty-state py-4">
          <i class="bi bi-clock-history" style="font-size: 2rem; color: #9ca3af;"></i>
          <p class="text-muted mb-0 mt-2" style="color: #6b7280;">No recent activity</p>
        </div>
      `;
      return;
    }
    
    // Show recent 5 activities
    const recentActivity = userActivity.slice(0, 5);
    
    container.innerHTML = recentActivity.map(activity => `
      <div class="activity-item d-flex align-items-start mb-3 pb-3 border-bottom">
        <div class="activity-icon me-3">
          <i class="bi bi-${getActivityIcon(activity.activity_type)}"></i>
        </div>
        <div class="flex-grow-1">
          <p class="mb-1 activity-text">${escapeHtml(activity.activity_text)}</p>
          <small class="text-muted">${getRelativeTime(activity.created_at)}</small>
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Failed to load activity:', error);
    container.innerHTML = `
      <div class="alert alert-danger">
        Failed to load activity
      </div>
    `;
  }
}

/**
 * Get icon for activity type
 */
function getActivityIcon(type) {
  const icons = {
    'task_completed': 'check-circle-fill text-success',
    'task_created': 'plus-circle text-primary',
    'task_updated': 'arrow-repeat text-info',
    'file_uploaded': 'file-earmark-arrow-up text-warning',
    'project_updated': 'pencil-square text-primary',
    'milestone': 'flag-fill text-success'
  };
  return icons[type] || 'circle text-secondary';
}

/**
 * Load user projects
 */
async function loadProjects() {
  const container = document.getElementById('profileProjects');
  
  try {
    if (isDemo) {
      userProjects = await demoServices.projects.getAll(currentUser.id);
    } else {
      userProjects = [];
    }
    
    if (userProjects.length === 0) {
      container.innerHTML = `
        <div class="col-12">
          <div class="empty-state py-4">
            <i class="bi bi-folder" style="font-size: 2rem; color: #9ca3af;"></i>
            <p class="text-muted mb-0 mt-2" style="color: #6b7280;">No projects yet</p>
          </div>
        </div>
      `;
      return;
    }
    
    // Show recent 3 projects
    const recentProjects = userProjects.slice(0, 3);
    
    container.innerHTML = recentProjects.map(project => `
      <div class="col-md-6 mb-3">
        <div class="card h-100 project-mini-card" onclick="window.location.href='./project-details.html?id=${project.id}${isDemo ? '&demo=true' : ''}'">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h6 class="mb-0 project-title">${escapeHtml(project.title)}</h6>
              <span class="badge badge-status-${project.status}">${formatStatus(project.status)}</span>
            </div>
            <p class="text-muted small mb-3">${escapeHtml(truncate(project.description, 80))}</p>
            <div class="d-flex justify-content-between align-items-center">
              <small class="text-muted">
                <i class="bi bi-clock"></i>
                ${getRelativeTime(project.updated_at)}
              </small>
              <span class="text-primary fw-medium">${project.progress_percentage}%</span>
            </div>
          </div>
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Failed to load projects:', error);
    container.innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger">Failed to load projects</div>
      </div>
    `;
  }
}

/**
 * Format status text
 */
function formatStatus(status) {
  return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
}

/**
 * Truncate text to max length
 */
function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text ? String(text).replace(/[&<>"']/g, m => map[m]) : '';
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Photo upload button
  const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
  const avatarInput = document.getElementById('avatarInput');
  
  if (uploadPhotoBtn && avatarInput) {
    uploadPhotoBtn.addEventListener('click', () => {
      avatarInput.click();
    });
    
    avatarInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        await handlePhotoUpload(file);
      }
    });
  }
  
  // Edit profile button
  const editBtn = document.getElementById('editProfileBtn');
  const editModal = new bootstrap.Modal(document.getElementById('editProfileModal'));
  
  editBtn.addEventListener('click', () => {
    // Pre-fill form
    document.getElementById('editFullName').value = currentUser.full_name;
    document.getElementById('editCompany').value = currentUser.company || '';
    document.getElementById('editJobTitle').value = currentUser.job_title || '';
    document.getElementById('editBio').value = currentUser.bio || '';
    
    editModal.show();
  });
  
  // Save profile button
  const saveBtn = document.getElementById('saveProfileBtn');
  saveBtn.addEventListener('click', async () => {
    const form = document.getElementById('editProfileForm');
    
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    
    const updatedData = {
      full_name: document.getElementById('editFullName').value,
      company: document.getElementById('editCompany').value,
      job_title: document.getElementById('editJobTitle').value,
      bio: document.getElementById('editBio').value
    };
    
    try {
      if (isDemo) {
        // Update local demo user
        Object.assign(currentUser, updatedData);
        localStorage.setItem('demoUser', JSON.stringify(currentUser));
      } else {
        // Update real user (Supabase call here)
      }
      
      showSuccess('Profile updated successfully');
      editModal.hide();
      
      // Reload profile data
      await loadProfileData();
      
    } catch (error) {
      console.error('Failed to update profile:', error);
      showError('Failed to update profile');
    }
  });
}

/**
 * Handle photo upload
 */
async function handlePhotoUpload(file) {
  // Validate file
  if (!file.type.startsWith('image/')) {
    showError('Please select an image file');
    return;
  }
  
  if (file.size > 5 * 1024 * 1024) {
    showError('Image size must be less than 5MB');
    return;
  }
  
  try {
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const profileAvatar = document.getElementById('profileAvatar');
      profileAvatar.innerHTML = `<img src="${e.target.result}" alt="Avatar">`;
      
      // Update navbar avatar
      const navAvatar = document.getElementById('navUserAvatar');
      navAvatar.innerHTML = `<img src="${e.target.result}" alt="Avatar" class="rounded-circle" width="40" height="40">`;
      
      if (isDemo) {
        // Store in demo mode
        currentUser.avatar_url = e.target.result;
        localStorage.setItem('demoUser', JSON.stringify(currentUser));
        showSuccess('Photo updated successfully');
      } else {
        // In real mode, upload to Supabase Storage
        showSuccess('Photo preview loaded. Real upload coming soon!');
      }
    };
    
    reader.readAsDataURL(file);
    
  } catch (error) {
    console.error('Failed to upload photo:', error);
    showError('Failed to upload photo');
  }
}

// Add profile-specific CSS
const style = document.createElement('style');
style.textContent = `
  .profile-avatar {
    width: 150px;
    height: 150px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    color: white;
    font-size: 3rem;
    font-weight: 600;
    overflow: hidden;
  }
  
  .profile-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .project-mini-card {
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  
  .project-mini-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  
  .activity-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #f3f4f6;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  .activity-item:last-child {
    border-bottom: none !important;
  }
  
  /* Light mode text colors */
  .activity-text {
    color: #1f2937;
  }
  
  .project-title {
    color: #1f2937;
  }
  
  .profile-section-title {
    color: #1f2937;
  }
  
  .profile-name {
    color: #1f2937;
  }
  
  .profile-info-text {
    color: #1f2937;
  }
  
  .stat-box {
    background-color: #f3f4f6;
  }
  
  .stat-label {
    color: #6b7280;
  }
  
  /* Dark mode support */
  body.dark-mode .activity-text,
  html[data-bs-theme="dark"] .activity-text {
    color: #f3f4f6;
  }
  
  body.dark-mode .project-title,
  html[data-bs-theme="dark"] .project-title {
    color: #f3f4f6;
  }
  
  body.dark-mode .profile-section-title,
  html[data-bs-theme="dark"] .profile-section-title {
    color: #f3f4f6;
  }
  
  body.dark-mode .profile-name,
  html[data-bs-theme="dark"] .profile-name {
    color: #f3f4f6;
  }
  
  body.dark-mode .profile-info-text,
  html[data-bs-theme="dark"] .profile-info-text {
    color: #e5e7eb;
  }
  
  body.dark-mode .stat-box,
  html[data-bs-theme="dark"] .stat-box {
    background-color: #374151;
  }
  
  body.dark-mode .stat-label,
  html[data-bs-theme="dark"] .stat-label {
    color: #9ca3af;
  }
  
  body.dark-mode .activity-icon,
  html[data-bs-theme="dark"] .activity-icon {
    background: #374151;
  }
  
  body.dark-mode .project-mini-card:hover,
  html[data-bs-theme="dark"] .project-mini-card:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  }
`;
document.head.appendChild(style);
