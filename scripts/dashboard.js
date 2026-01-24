import { isDemoMode, demoServices } from '../utils/demoMode.js';
import { getCurrentUser, logout } from './auth.js';
import { showError, showSuccess } from '../utils/ui.js';
import { formatDate, getRelativeTime } from '../utils/helpers.js';
import { getAllProjects } from '../services/projectService.js';
import supabase from '../services/supabase.js';

let currentUser = null;
let isDemo = false;

// Chart instances
let projectTypeChartInstance = null;
let projectStatusChartInstance = null;

/**
 * Initialize dashboard
 */
async function initDashboard() {
  try {
    // Check if demo mode
    isDemo = isDemoMode();
    
    if (isDemo) {
      console.log('🎭 Running in DEMO MODE');
      currentUser = await demoServices.auth.getCurrentUser();
    } else {
      currentUser = await getCurrentUser();
      if (!currentUser) {
        window.location.href = './login.html';
        return;
      }
    }
    
    // Show demo badge if in demo mode
    if (isDemo) {
      showDemoBadge();
    }
    
    // Update user info in navbar
    updateUserInfo();
    
    // Load all dashboard data
    await Promise.all([
      loadStats(),
      loadRecentProjects(),
      loadActivityFeed(),
      loadCharts()
    ]);
    
    // Setup event listeners
    setupEventListeners();
    
  } catch (error) {
    console.error('Dashboard init error:', error);
    showError('Failed to load dashboard');
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
    <strong>Demo Mode:</strong> Exploring with sample data. 
    <a href="./register.html" class="alert-link">Create real account</a>
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.body.appendChild(badge);
}

/**
 * Update user info in navbar
 */
function updateUserInfo() {
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const userAvatar = document.getElementById('userAvatar');
  
  if (userName) userName.textContent = currentUser.full_name;
  if (userEmail) userEmail.textContent = currentUser.email;
  
  if (userAvatar) {
    if (currentUser.avatar_url) {
      userAvatar.innerHTML = `<img src="${currentUser.avatar_url}" alt="Avatar" class="rounded-circle" width="40" height="40">`;
    } else {
      const initials = currentUser.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
      userAvatar.innerHTML = `<div class="avatar-circle">${initials}</div>`;
    }
  }
}

/**
 * Load dashboard stats
 */
async function loadStats() {
  try {
    let stats;
    
    if (isDemo) {
      stats = await demoServices.stats.getDashboard(currentUser.id);
    } else {
      stats = await fetchRealStats();
    }
    
    // Update stats cards
    document.getElementById('totalProjects').textContent = stats.totalProjects;
    document.getElementById('activeProjects').textContent = stats.activeProjects;
    document.getElementById('totalTasks').textContent = stats.totalTasks;
    document.getElementById('completedTasks').textContent = stats.completedTasks;
    document.getElementById('completionRate').textContent = stats.completionRate + '%';
    
    // Update progress bar
    const progressBar = document.getElementById('completionProgressBar');
    if (progressBar) {
      progressBar.style.width = stats.completionRate + '%';
      progressBar.setAttribute('aria-valuenow', stats.completionRate);
    }
    
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

/**
 * Fetch real stats from Supabase
 */
async function fetchRealStats() {
  const projects = await getAllProjects(currentUser.id);
  let totalTasks = 0;
  let completedTasks = 0;
  
  for (const project of projects) {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('project_id', project.id);
    
    if (tasks) {
      totalTasks += tasks.length;
      completedTasks += tasks.filter(t => t.status === 'done').length;
    }
  }
  
  return {
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.status === 'active').length,
    totalTasks,
    completedTasks,
    completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  };
}

/**
 * Load recent projects
 */
async function loadRecentProjects() {
  try {
    let projects;
    
    if (isDemo) {
      projects = await demoServices.projects.getAll(currentUser.id);
    } else {
      projects = await getAllProjects(currentUser.id);
    }
    
    // Sort by updated_at, take top 5
    projects = projects
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 5);
    
    const container = document.getElementById('recentProjects');
    if (!container) return;
    
    if (projects.length === 0) {
      container.innerHTML = `
        <div class="empty-state py-5">
          <i class="bi bi-folder-x empty-state-icon"></i>
          <h3 class="empty-state-title">No Projects Yet</h3>
          <p class="empty-state-description">Create your first project to get started</p>
          <a href="./project-form.html" class="btn btn-primary">
            <i class="bi bi-plus-circle me-2"></i>Create Project
          </a>
        </div>
      `;
      return;
    }
    
    container.innerHTML = projects.map(project => `
      <div class="col-md-6 col-lg-4 mb-4">
        <div class="project-card" onclick="window.location.href='./project-details.html?id=${project.id}${isDemo ? '&demo=true' : ''}'">
          <div class="project-cover" style="background: linear-gradient(135deg, #20b2aa 0%, #4169e1 100%);">
            <span class="project-cover-icon"><i class="bi bi-kanban-fill"></i></span>
          </div>
          <div class="project-badges">
            <span class="badge badge-status-${project.status}">${project.status}</span>
          </div>
          <div class="project-body">
            <h5 class="project-title">${escapeHtml(project.title)}</h5>
            <p class="project-description">${escapeHtml(project.description)}</p>
            <div class="project-meta">
              <span class="project-meta-item">
                <i class="bi bi-tag"></i>
                ${project.project_type}
              </span>
              <span class="project-meta-item">
                <i class="bi bi-clock"></i>
                ${getRelativeTime(project.updated_at)}
              </span>
            </div>
            <div class="project-progress">
              <div class="project-progress-label">
                <span>Progress</span>
                <span class="project-progress-value">${project.progress_percentage}%</span>
              </div>
              <div class="progress">
                <div class="progress-bar" style="width: ${project.progress_percentage}%"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Failed to load projects:', error);
  }
}

/**
 * Load activity feed
 */
async function loadActivityFeed() {
  try {
    let activities;
    
    if (isDemo) {
      activities = await demoServices.activity.getByUser(currentUser.id);
    } else {
      activities = await fetchRealActivity();
    }
    
    // Sort by created_at descending, take top 10
    activities = activities
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);
    
    const container = document.getElementById('activityFeed');
    if (!container) return;
    
    if (activities.length === 0) {
      container.innerHTML = `
        <div class="empty-state py-4">
          <i class="bi bi-clock-history empty-state-icon" style="font-size: 2rem;"></i>
          <p class="text-muted mb-0">No recent activity</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = activities.map(activity => {
      const icon = getActivityIcon(activity.activity_type);
      return `
        <div class="activity-item d-flex align-items-start mb-3">
          <div class="activity-icon me-3">
            <i class="bi bi-${icon}"></i>
          </div>
          <div class="activity-content flex-grow-1">
            <p class="activity-text mb-1">${escapeHtml(activity.activity_text)}</p>
            <small class="activity-time text-muted">${getRelativeTime(activity.created_at)}</small>
          </div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Failed to load activity:', error);
  }
}

/**
 * Fetch real activity from Supabase
 */
async function fetchRealActivity() {
  const projects = await getAllProjects(currentUser.id);
  const projectIds = projects.map(p => p.id);
  
  if (projectIds.length === 0) return [];
  
  const { data } = await supabase
    .from('project_updates')
    .select('*')
    .in('project_id', projectIds)
    .order('created_at', { ascending: false })
    .limit(10);
  
  return data || [];
}

/**
 * Get activity icon based on type
 */
function getActivityIcon(type) {
  const icons = {
    'task_completed': 'check-circle-fill text-success',
    'task_created': 'plus-circle text-primary',
    'task_updated': 'arrow-repeat text-info',
    'file_uploaded': 'file-earmark-arrow-up text-warning',
    'project_updated': 'pencil-square text-primary',
    'milestone': 'flag-fill text-success',
    'comment': 'chat-dots text-info'
  };
  return icons[type] || 'circle text-secondary';
}

/**
 * Load charts
 */
async function loadCharts() {
  try {
    let projects;
    
    if (isDemo) {
      projects = await demoServices.projects.getAll(currentUser.id);
    } else {
      projects = await getAllProjects(currentUser.id);
    }
    
    // Project type distribution
    renderProjectTypeChart(projects);
    
    // Project status distribution
    renderProjectStatusChart(projects);
    
  } catch (error) {
    console.error('Failed to load charts:', error);
  }
}

/**
 * Render project type chart
 */
function renderProjectTypeChart(projects) {
  const canvas = document.getElementById('projectTypeChart');
  if (!canvas) return;
  
  const types = {};
  projects.forEach(p => {
    types[p.project_type] = (types[p.project_type] || 0) + 1;
  });
  
  if (projectTypeChartInstance) {
    projectTypeChartInstance.destroy();
  }
  
  projectTypeChartInstance = new Chart(canvas, {
    type: 'pie',
    data: {
      labels: Object.keys(types),
      datasets: [{
        data: Object.values(types),
        backgroundColor: ['#20b2aa', '#4169e1', '#059669', '#f59e0b', '#dc2626']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

/**
 * Render project status chart
 */
function renderProjectStatusChart(projects) {
  const canvas = document.getElementById('projectStatusChart');
  if (!canvas) return;
  
  const statuses = {};
  projects.forEach(p => {
    statuses[p.status] = (statuses[p.status] || 0) + 1;
  });
  
  if (projectStatusChartInstance) {
    projectStatusChartInstance.destroy();
  }
  
  projectStatusChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: Object.keys(statuses),
      datasets: [{
        data: Object.values(statuses),
        backgroundColor: ['#f59e0b', '#059669', '#20b2aa', '#6b7280', '#dc2626']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        if (isDemo) {
          await demoServices.auth.logout();
          window.location.href = '../index.html';
        } else {
          await logout();
        }
      } catch (error) {
        console.error('Logout error:', error);
        showError('Failed to logout');
      }
    });
  }
  
  // New Project button
  const newProjectBtn = document.querySelector('[href="./project-form.html"]');
  if (newProjectBtn) {
    newProjectBtn.addEventListener('click', (e) => {
      if (isDemo) {
        e.preventDefault();
        window.location.href = './project-form.html?demo=true';
      }
    });
  }
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
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initDashboard);

// Export for use in other modules
export { initDashboard, isDemo };
