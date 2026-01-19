import { checkAuth, getCurrentUser, logout, autoDemoLogin, isDemoSession } from './auth.js';
import { getAllProjects, getProjectStats } from '../services/projectService.js';
import supabase from '../services/supabase.js';

// Chart instances for cleanup and updates
let projectTypeChartInstance = null;
let projectStatusChartInstance = null;
let taskTrendChartInstance = null;
let progressChartInstance = null;

/**
 * Initialize dashboard on page load
 * Checks authentication, loads user data, and sets up event listeners
 */
async function initDashboard() {
  try {
    // Handle demo mode URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('demo') === 'true' && !isDemoSession()) {
      autoDemoLogin();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Show demo banner if in demo session
    showDemoBanner();

    // Check authentication
    const user = await checkAuth();
    if (!user) {
      return; // Redirect handled by checkAuth
    }

    // Update welcome greeting and avatar
    updateUserInfo(user);

    // Set current date
    updateCurrentDate();

    // Load all dashboard data
    await Promise.all([
      loadUserStats(user.id),
      loadRecentProjects(user.id, 5),
      loadActivityFeed(user.id, 5)
    ]);

    // Load charts
    await Promise.all([
      createProjectTypeChart(user.id),
      createProjectStatusChart(user.id),
      createTaskTrendChart(user.id, 7),
      createProgressChart(user.id)
    ]);

    // Setup event listeners
    setupEventListeners();

    // Real-time subscription for project updates
    subscribeToProjectUpdates(user.id);
  } catch (error) {
    console.error('Dashboard initialization error:', error);
    showError('Failed to load dashboard. Please refresh the page.');
  }
}

/**
 * Show demo mode indicator banner if in demo session
 */
function showDemoBanner() {
  try {
    if (isDemoSession()) {
      const demoBanner = document.getElementById('demoBanner');
      if (demoBanner) {
        demoBanner.style.display = 'block';
      }
    }
  } catch (error) {
    console.error('Show demo banner error:', error);
  }
}

/**
 * Update user info in navbar and greeting
 * @param {object} user - User object from Supabase Auth
 */
function updateUserInfo(user) {
  try {
    const userEmail = user.email || 'User';
    const userInitial = userEmail.charAt(0).toUpperCase();
    
    // Update greeting
    const greeting = document.getElementById('userGreeting');
    if (greeting) {
      greeting.textContent = `Welcome back, ${user.email?.split('@')[0] || 'User'}!`;
    }

    // Update navbar avatar and name
    const userAvatarNav = document.getElementById('userAvatarNav');
    if (userAvatarNav) {
      userAvatarNav.textContent = userInitial;
    }

    const userNameNav = document.getElementById('userNameNav');
    if (userNameNav) {
      userNameNav.textContent = user.email?.split('@')[0] || 'User';
    }
  } catch (error) {
    console.error('Update user info error:', error);
  }
}

/**
 * Update current date display
 */
function updateCurrentDate() {
  try {
    const currentDate = document.getElementById('currentDate');
    if (currentDate) {
      const today = new Date();
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      currentDate.textContent = today.toLocaleDateString('en-US', options);
    }
  } catch (error) {
    console.error('Update current date error:', error);
  }
}

/**
 * Load and display user statistics
 * @param {string} userId - User ID
 */
async function loadUserStats(userId) {
  try {
    showLoading('totalProjects');
    showLoading('activeTasks');
    showLoading('completionRate');
    showLoading('totalFiles');

    const projects = await getAllProjects(userId);

    // Count total projects
    const totalProjects = projects.length;
    document.getElementById('totalProjects').textContent = totalProjects;
    hideLoading('totalProjects');

    // Count tasks and calculate overall progress
    let totalTasks = 0;
    let completedTasks = 0;
    let totalFiles = 0;

    // Fetch tasks for each project
    for (const project of projects) {
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, status')
        .eq('project_id', project.id);

      if (!tasksError && tasks) {
        totalTasks += tasks.length;
        completedTasks += tasks.filter(t => t.status === 'done').length;
      }

      // Count files for this project
      const { count: fileCount } = await supabase
        .from('project_files')
        .select('id', { count: 'exact' })
        .eq('project_id', project.id);

      if (fileCount) {
        totalFiles += fileCount;
      }
    }

    // Active tasks (in progress)
    const activeTasks = totalTasks - completedTasks;
    document.getElementById('activeTasks').textContent = activeTasks;
    hideLoading('activeTasks');

    // Completion rate
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    document.getElementById('completionRate').textContent = `${completionRate}%`;
    
    // Update circular progress
    const circleElement = document.getElementById('completionRateCircle');
    if (circleElement) {
      circleElement.style.setProperty('--progress', `${completionRate * 3.6}deg`);
    }
    hideLoading('completionRate');

    // Total files
    document.getElementById('totalFiles').textContent = totalFiles;
    hideLoading('totalFiles');
  } catch (error) {
    console.error('Load user stats error:', error);
    showError('Failed to load statistics.');
    hideLoading('totalProjects');
    hideLoading('activeTasks');
    hideLoading('completionRate');
    hideLoading('totalFiles');
  }
}

/**
 * Load and display recent projects
 * @param {string} userId - User ID
 * @param {number} limit - Number of projects to fetch
 */
async function loadRecentProjects(userId, limit = 5) {
  try {
    const projectsList = document.getElementById('recentProjectsList');
    if (!projectsList) return;

    // Show loading state
    projectsList.innerHTML = '<div class="text-center py-5"><div class="spinner-border"></div></div>';

    const projects = await getAllProjects(userId);
    const recentProjects = projects.slice(0, limit);

    if (recentProjects.length === 0) {
      projectsList.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-inbox" style="font-size: 2rem; opacity: 0.5;"></i>
          <p class="text-muted mt-2">No projects yet. <a href="./project-form.html">Create your first project!</a></p>
        </div>
      `;
      return;
    }

    // Render projects
    projectsList.innerHTML = recentProjects.map(project => renderProjectCard(project)).join('');

    // Add click handlers
    projectsList.querySelectorAll('[data-project-id]').forEach(card => {
      card.addEventListener('click', () => {
        const projectId = card.dataset.projectId;
        window.location.href = `./project-details.html?id=${projectId}`;
      });
    });

    // Add view button handlers
    projectsList.querySelectorAll('[data-view-btn]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const projectId = btn.dataset.projectId;
        window.location.href = `./project-details.html?id=${projectId}`;
      });
    });
  } catch (error) {
    console.error('Load recent projects error:', error);
    const projectsList = document.getElementById('recentProjectsList');
    if (projectsList) {
      projectsList.innerHTML = '<div class="alert alert-danger">Failed to load projects.</div>';
    }
  }
}

/**
 * Render a project card as HTML
 * @param {object} project - Project object
 * @returns {string} HTML string
 */
function renderProjectCard(project) {
  const typeBadgeClass = getTypeBadgeClass(project.project_type);
  const statusBadgeClass = getStatusBadgeClass(project.status);
  const progress = project.progress_percentage || 0;

  return `
    <div class="project-item" data-project-id="${project.id}" style="cursor: pointer;">
      <div class="project-title mb-2">
        <a href="./project-details.html?id=${project.id}" class="text-dark text-decoration-none">
          ${escapeHtml(project.title)}
        </a>
      </div>
      <div class="mb-2">
        <span class="badge ${typeBadgeClass} me-2">${escapeHtml(project.project_type)}</span>
        <span class="badge ${statusBadgeClass}">${project.status}</span>
      </div>
      <div class="mb-3">
        <small class="text-muted d-block mb-1">Progress: ${progress}%</small>
        <div class="progress" style="height: 6px;">
          <div class="progress-bar" role="progressbar" style="width: ${progress}%" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
      </div>
      <button class="btn btn-sm btn-outline-primary w-100" data-view-btn data-project-id="${project.id}">
        View Details
      </button>
    </div>
  `;
}

/**
 * Load and display activity feed
 * @param {string} userId - User ID
 * @param {number} limit - Number of activities to fetch
 */
async function loadActivityFeed(userId, limit = 5) {
  try {
    const activityFeed = document.getElementById('activityFeed');
    if (!activityFeed) return;

    // Show loading state
    activityFeed.innerHTML = '<div class="text-center py-5"><div class="spinner-border spinner-border-sm"></div></div>';

    // Get user's projects
    const projects = await getAllProjects(userId);
    const projectIds = projects.map(p => p.id);

    if (projectIds.length === 0) {
      activityFeed.innerHTML = '<p class="text-muted text-center py-4">No recent activity</p>';
      return;
    }

    // Fetch updates for user's projects
    let query = supabase
      .from('project_updates')
      .select('id, project_id, user_id, update_type, update_text, created_at, profiles:user_id(full_name)')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data: updates, error } = await query;

    if (error) {
      throw error;
    }

    if (!updates || updates.length === 0) {
      activityFeed.innerHTML = '<p class="text-muted text-center py-4">No recent activity</p>';
      return;
    }

    // Render activities
    activityFeed.innerHTML = updates.map(update => renderActivityItem(update)).join('');
  } catch (error) {
    console.error('Load activity feed error:', error);
    const activityFeed = document.getElementById('activityFeed');
    if (activityFeed) {
      activityFeed.innerHTML = '<p class="text-danger text-center py-4">Failed to load activity</p>';
    }
  }
}

/**
 * Render an activity item as HTML
 * @param {object} update - Project update object
 * @returns {string} HTML string
 */
function renderActivityItem(update) {
  const icon = getActivityIcon(update.update_type);
  const relativeTime = getRelativeTime(update.created_at);
  const userName = update.profiles?.full_name || 'User';

  return `
    <div class="activity-item">
      <div class="activity-text">
        <strong>${escapeHtml(userName)}</strong> ${escapeHtml(update.update_text)}
      </div>
      <div class="activity-time">${relativeTime}</div>
    </div>
  `;
}

/**
 * Setup event listeners for dashboard interactions
 */
function setupEventListeners() {
  // New Project button
  const newProjectBtn = document.querySelector('[href="./project-form.html"]');
  if (newProjectBtn) {
    newProjectBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = './project-form.html';
    });
  }

  // View All Projects buttons
  const viewAllBtns = document.querySelectorAll('[href="./projects.html"]');
  viewAllBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = './projects.html';
    });
  });

  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await logout();
      } catch (error) {
        console.error('Logout error:', error);
        showError('Failed to logout. Please try again.');
      }
    });
  }

  // Period filter buttons for task trend chart
  const periodButtons = document.querySelectorAll('[data-period]');
  periodButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      
      // Update active state
      periodButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Get period value
      const period = parseInt(btn.dataset.period);
      
      // Reload task trend chart with new period
      const user = await getCurrentUser();
      if (user) {
        await createTaskTrendChart(user.id, period);
      }
    });
  });
}

/**
 * Subscribe to real-time project updates
 * @param {string} userId - User ID
 */
function subscribeToProjectUpdates(userId) {
  try {
    // Subscribe to new project updates
    const subscription = supabase
      .channel(`user-${userId}-updates`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_updates'
        },
        () => {
          // Reload activity feed on changes
          loadActivityFeed(userId, 5);
        }
      )
      .subscribe();
  } catch (error) {
    console.error('Subscribe to updates error:', error);
  }
}

/**
 * Show loading skeleton in element
 * @param {string} elementId - Element ID
 */
function showLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = '<div class="skeleton" style="height: 2rem; border-radius: 4px;"></div>';
  }
}

/**
 * Hide loading skeleton and show content
 * @param {string} elementId - Element ID
 */
function hideLoading(elementId) {
  // Content is replaced by actual data, no need to explicitly hide
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
  const alert = document.createElement('div');
  alert.className = 'alert alert-danger alert-dismissible fade show';
  alert.role = 'alert';
  alert.innerHTML = `
    <i class="bi bi-exclamation-triangle-fill me-2"></i>
    ${escapeHtml(message)}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;

  const container = document.querySelector('main');
  if (container) {
    container.insertAdjacentElement('afterbegin', alert);
    setTimeout(() => alert.remove(), 5000);
  }
}

/**
 * Format date to readable string
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Get relative time string (e.g., "2 hours ago")
 * @param {string} dateString - ISO date string
 * @returns {string} Relative time
 */
function getRelativeTime(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

  return formatDate(dateString);
}

/**
 * Get Bootstrap badge class for project status
 * @param {string} status - Project status
 * @returns {string} Badge class
 */
function getStatusBadgeClass(status) {
  const statusMap = {
    'planning': 'bg-secondary',
    'active': 'bg-success',
    'completed': 'bg-primary',
    'paused': 'bg-warning',
    'archived': 'bg-dark'
  };
  return statusMap[status] || 'bg-secondary';
}

/**
 * Get Bootstrap badge class for project type
 * @param {string} type - Project type
 * @returns {string} Badge class
 */
function getTypeBadgeClass(type) {
  const typeMap = {
    'Academic & Research': 'bg-info',
    'Corporate/Business': 'bg-primary',
    'EU-Funded Project': 'bg-success',
    'Public Initiative': 'bg-warning',
    'Personal/Other': 'bg-secondary'
  };
  return typeMap[type] || 'bg-secondary';
}

/**
 * Get icon for activity type
 * @param {string} updateType - Type of update
 * @returns {string} Icon HTML
 */
function getActivityIcon(updateType) {
  const iconMap = {
    'general': 'bi-chat-dots',
    'milestone': 'bi-flag-fill',
    'task_completed': 'bi-check-circle-fill',
    'file_uploaded': 'bi-file-earmark-arrow-up-fill',
    'status_changed': 'bi-arrow-repeat'
  };
  const iconClass = iconMap[updateType] || 'bi-chat-dots';
  return `<i class="bi ${iconClass}"></i>`;
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Setup chart theme based on current theme (light/dark)
 * @returns {object} Theme configuration for Chart.js
 */
function setupChartTheme() {
  const isDarkMode = document.body.classList.contains('dark-mode');
  
  return {
    fontColor: isDarkMode ? '#cbd5e1' : '#495057',
    gridColor: isDarkMode ? '#334155' : 'rgba(0, 0, 0, 0.1)',
    backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
    colors: {
      primary: isDarkMode ? '#14b8a6' : '#0d6efd',
      success: isDarkMode ? '#34d399' : '#198754',
      warning: isDarkMode ? '#fbbf24' : '#ffc107',
      danger: isDarkMode ? '#f87171' : '#dc3545',
      info: isDarkMode ? '#38bdf8' : '#0dcaf0',
      secondary: isDarkMode ? '#9ca3af' : '#6c757d',
      light: isDarkMode ? '#334155' : '#f8f9fa',
      dark: isDarkMode ? '#94a3b8' : '#212529'
    }
  };
}

/**
 * Get chart colors based on current theme
 * @returns {object} Chart color configuration
 */
function getChartColors() {
  const isDark = document.body.classList.contains('dark-mode');
  
  return {
    textColor: isDark ? '#cbd5e1' : '#64748b',
    gridColor: isDark ? '#334155' : '#e2e8f0',
    borderColor: isDark ? '#475569' : '#cbd5e1',
    backgroundColor: isDark ? 'rgba(20, 184, 166, 0.1)' : 'rgba(32, 178, 170, 0.1)',
    colors: {
      primary: isDark ? '#14b8a6' : '#20b2aa',
      secondary: isDark ? '#60a5fa' : '#4169e1',
      success: isDark ? '#34d399' : '#059669',
      warning: isDark ? '#fbbf24' : '#f59e0b',
      danger: isDark ? '#f87171' : '#dc2626',
      info: isDark ? '#38bdf8' : '#0ea5e9',
      dark: isDark ? '#94a3b8' : '#6b7280'
    }
  };
}

/**
 * Create Projects by Type Pie Chart
 * @param {string} userId - User ID
 */
async function createProjectTypeChart(userId) {
  try {
    const canvas = document.getElementById('projectTypeChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const theme = setupChartTheme();

    // Get projects data
    const projects = await getAllProjects(userId);
    
    // Count by type
    const typeCounts = {
      'Academic & Research': 0,
      'Corporate/Business': 0,
      'EU-Funded Project': 0,
      'Public Initiative': 0,
      'Personal/Other': 0
    };

    projects.forEach(project => {
      if (typeCounts.hasOwnProperty(project.project_type)) {
        typeCounts[project.project_type]++;
      }
    });

    // Filter out types with zero count
    const labels = Object.keys(typeCounts).filter(key => typeCounts[key] > 0);
    const data = labels.map(key => typeCounts[key]);

    // If no data, show message
    if (data.length === 0 || data.every(val => val === 0)) {
      canvas.parentElement.innerHTML = '<p class="text-muted text-center py-5">No data to display</p>';
      return;
    }

    // Destroy existing chart if it exists
    if (projectTypeChartInstance) {
      projectTypeChartInstance.destroy();
    }

    // Create chart
    projectTypeChartInstance = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [
            theme.colors.info,
            theme.colors.primary,
            theme.colors.success,
            theme.colors.warning,
            theme.colors.secondary
          ],
          borderWidth: 2,
          borderColor: theme.backgroundColor
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: theme.fontColor,
              padding: 15,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error creating project type chart:', error);
  }
}

/**
 * Create Projects by Status Doughnut Chart
 * @param {string} userId - User ID
 */
async function createProjectStatusChart(userId) {
  try {
    const canvas = document.getElementById('projectStatusChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const theme = setupChartTheme();

    // Get projects data
    const projects = await getAllProjects(userId);
    
    // Count by status
    const statusCounts = {
      'planning': 0,
      'active': 0,
      'completed': 0,
      'paused': 0,
      'archived': 0
    };

    projects.forEach(project => {
      if (statusCounts.hasOwnProperty(project.status)) {
        statusCounts[project.status]++;
      }
    });

    // Prepare data
    const labels = ['Planning', 'Active', 'Completed', 'Paused', 'Archived'];
    const data = [
      statusCounts['planning'],
      statusCounts['active'],
      statusCounts['completed'],
      statusCounts['paused'],
      statusCounts['archived']
    ];

    const totalProjects = data.reduce((a, b) => a + b, 0);

    // If no data, show message
    if (totalProjects === 0) {
      canvas.parentElement.innerHTML = '<p class="text-muted text-center py-5">No data to display</p>';
      return;
    }

    // Destroy existing chart if it exists
    if (projectStatusChartInstance) {
      projectStatusChartInstance.destroy();
    }

    // Create chart with center text plugin
    const centerTextPlugin = {
      id: 'centerText',
      beforeDraw: function(chart) {
        if (chart.config.type === 'doughnut') {
          const width = chart.width;
          const height = chart.height;
          const ctx = chart.ctx;
          ctx.restore();
          const fontSize = (height / 114).toFixed(2);
          ctx.font = fontSize + "em sans-serif";
          ctx.textBaseline = "middle";
          ctx.fillStyle = theme.fontColor;

          const text = totalProjects.toString();
          const textX = Math.round((width - ctx.measureText(text).width) / 2);
          const textY = height / 2;

          ctx.fillText(text, textX, textY - 10);
          
          ctx.font = (fontSize * 0.5) + "em sans-serif";
          const subText = "Projects";
          const subTextX = Math.round((width - ctx.measureText(subText).width) / 2);
          ctx.fillText(subText, subTextX, textY + 20);
          ctx.save();
        }
      }
    };

    // Create chart
    projectStatusChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [
            theme.colors.secondary,  // Planning - gray
            theme.colors.primary,    // Active - blue
            theme.colors.success,    // Completed - green
            theme.colors.warning,    // Paused - yellow
            theme.colors.dark        // Archived - dark gray
          ],
          borderWidth: 2,
          borderColor: theme.backgroundColor
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: theme.fontColor,
              padding: 15,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      },
      plugins: [centerTextPlugin]
    });
  } catch (error) {
    console.error('Error creating project status chart:', error);
  }
}

/**
 * Create Task Completion Trend Line Chart
 * @param {string} userId - User ID
 * @param {number} period - Number of days to show (7, 30, 90)
 */
async function createTaskTrendChart(userId, period = 7) {
  try {
    const canvas = document.getElementById('taskTrendChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const theme = setupChartTheme();

    // Generate dates for the period
    const dates = [];
    const completedCounts = [];
    const createdCounts = [];

    for (let i = period - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      
      // In demo mode or for now, generate mock data
      // In real implementation, query tasks by created_at and completed_at dates
      const randomCompleted = Math.floor(Math.random() * 10) + 1;
      const randomCreated = Math.floor(Math.random() * 12) + 1;
      completedCounts.push(randomCompleted);
      createdCounts.push(randomCreated);
    }

    // Destroy existing chart if it exists
    if (taskTrendChartInstance) {
      taskTrendChartInstance.destroy();
    }

    // Create chart
    taskTrendChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [
          {
            label: 'Tasks Completed',
            data: completedCounts,
            borderColor: theme.colors.success,
            backgroundColor: theme.colors.success + '33',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: theme.colors.success,
            pointBorderColor: theme.backgroundColor,
            pointBorderWidth: 2
          },
          {
            label: 'Tasks Created',
            data: createdCounts,
            borderColor: theme.colors.primary,
            backgroundColor: theme.colors.primary + '33',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: theme.colors.primary,
            pointBorderColor: theme.backgroundColor,
            pointBorderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: theme.fontColor,
              padding: 15,
              usePointStyle: true,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            backgroundColor: theme.backgroundColor,
            titleColor: theme.fontColor,
            bodyColor: theme.fontColor,
            borderColor: theme.gridColor,
            borderWidth: 1
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: theme.fontColor,
              stepSize: 2
            },
            grid: {
              color: theme.gridColor,
              drawBorder: false
            }
          },
          x: {
            ticks: {
              color: theme.fontColor
            },
            grid: {
              color: theme.gridColor,
              drawBorder: false
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error creating task trend chart:', error);
  }
}

/**
 * Create Progress Overview Bar Chart
 * @param {string} userId - User ID
 */
async function createProgressChart(userId) {
  try {
    const canvas = document.getElementById('progressChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const theme = setupChartTheme();

    // Get projects data
    const projects = await getAllProjects(userId);
    
    // Sort by progress and get top 5
    const topProjects = projects
      .sort((a, b) => (b.progress_percentage || 0) - (a.progress_percentage || 0))
      .slice(0, 5);

    if (topProjects.length === 0) {
      canvas.parentElement.innerHTML = '<p class="text-muted text-center py-5">No data to display</p>';
      return;
    }

    // Prepare data
    const labels = topProjects.map(p => p.title.substring(0, 20) + (p.title.length > 20 ? '...' : ''));
    const data = topProjects.map(p => p.progress_percentage || 0);

    // Determine colors based on percentage
    const backgroundColors = data.map(value => {
      if (value <= 30) return theme.colors.danger;
      if (value <= 70) return theme.colors.warning;
      return theme.colors.success;
    });

    // Destroy existing chart if it exists
    if (progressChartInstance) {
      progressChartInstance.destroy();
    }

    // Create chart
    progressChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Progress %',
          data: data,
          backgroundColor: backgroundColors,
          borderWidth: 0,
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `Progress: ${context.parsed.x}%`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            ticks: {
              color: theme.fontColor,
              callback: function(value) {
                return value + '%';
              }
            },
            grid: {
              color: theme.gridColor,
              drawBorder: false
            }
          },
          y: {
            ticks: {
              color: theme.fontColor,
              font: {
                size: 11
              }
            },
            grid: {
              display: false
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error creating progress chart:', error);
  }
}

/**
 * Update charts when theme changes
 */
function updateChartsOnThemeChange() {
  const user = getCurrentUser();
  if (user) {
    // Update Chart.js defaults
    if (typeof Chart !== 'undefined') {
      const colors = getChartColors();
      Chart.defaults.color = colors.textColor;
      Chart.defaults.borderColor = colors.gridColor;
    }
    
    // Recreate all charts with new theme
    createProjectTypeChart(user.id);
    createProjectStatusChart(user.id);
    
    // Get current period from active button
    const activePeriodBtn = document.querySelector('[data-period].active');
    const period = activePeriodBtn ? parseInt(activePeriodBtn.dataset.period) : 7;
    createTaskTrendChart(user.id, period);
    
    createProgressChart(user.id);
  }
}

/**
 * Update charts theme - exposed for external use
 */
function updateChartsTheme() {
  updateChartsOnThemeChange();
}

// Make updateChartsTheme available globally
if (typeof window !== 'undefined') {
  window.updateChartsTheme = updateChartsTheme;
}

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', initDashboard);

export {
  initDashboard,
  loadUserStats,
  loadRecentProjects,
  loadActivityFeed,
  setupEventListeners
};
