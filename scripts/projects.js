import { isDemoMode, demoServices } from '../utils/demoMode.js';
import { getCurrentUser, logout } from './auth.js';
import { showError, showSuccess, confirmAction } from '../utils/ui.js';
import { formatDate, getRelativeTime } from '../utils/helpers.js';
import { getAllProjects, deleteProject as deleteProjectService } from '../services/projectService.js';

let currentUser = null;
let isDemo = false;
let allProjects = [];
let filteredProjects = [];
let currentFilter = 'all';
let currentSort = 'newest';
let searchQuery = '';

/**
 * Initialize projects page
 */
async function initProjectsPage() {
  try {
    // Check demo mode
    isDemo = isDemoMode();
    
    if (isDemo) {
      console.log('🎭 Running in DEMO MODE');
      currentUser = await demoServices.auth.getCurrentUser();
      showDemoBadge();
    } else {
      currentUser = await getCurrentUser();
      if (!currentUser) {
        window.location.href = './login.html';
        return;
      }
    }
    
    // Update user info
    updateUserInfo();
    
    // Load projects
    await loadProjects();
    
    // Setup event listeners
    setupEventListeners();
    
  } catch (error) {
    console.error('Projects page init error:', error);
    showError('Failed to load projects page');
  }
}

/**
 * Show demo badge
 */
function showDemoBadge() {
  const badge = document.createElement('div');
  badge.className = 'alert alert-info alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
  badge.style.zIndex = '9999';
  badge.innerHTML = `
    <i class="bi bi-info-circle me-2"></i>
    <strong>Demo Mode:</strong> Viewing sample projects. 
    <a href="./register.html" class="alert-link">Create real account</a>
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.body.appendChild(badge);
}

/**
 * Update user info
 */
function updateUserInfo() {
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const userAvatarNav = document.getElementById('userAvatarNav');
  const userNameNav = document.getElementById('userNameNav');
  
  if (userName) userName.textContent = currentUser.full_name;
  if (userEmail) userEmail.textContent = currentUser.email;
  
  if (userAvatarNav) {
    const initial = currentUser.full_name.charAt(0).toUpperCase();
    userAvatarNav.textContent = initial;
  }
  
  if (userNameNav) {
    userNameNav.textContent = currentUser.full_name;
  }
}

/**
 * Load all projects
 */
async function loadProjects() {
  try {
    if (isDemo) {
      allProjects = await demoServices.projects.getAll(currentUser.id);
    } else {
      allProjects = await getAllProjects(currentUser.id);
    }
    
    // Apply filters and render
    applyFiltersAndSort();
    
  } catch (error) {
    console.error('Failed to load projects:', error);
    showError('Failed to load projects');
  }
}

/**
 * Apply filters and sorting
 */
function applyFiltersAndSort() {
  // Start with all projects
  filteredProjects = [...allProjects];
  
  // Apply status filter
  if (currentFilter !== 'all') {
    filteredProjects = filteredProjects.filter(p => p.status === currentFilter);
  }
  
  // Apply search
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredProjects = filteredProjects.filter(p => 
      p.title.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.project_type.toLowerCase().includes(query)
    );
  }
  
  // Apply sorting
  filteredProjects.sort((a, b) => {
    switch(currentSort) {
      case 'newest':
        return new Date(b.created_at) - new Date(a.created_at);
      case 'oldest':
        return new Date(a.created_at) - new Date(b.created_at);
      case 'progress':
        return b.progress_percentage - a.progress_percentage;
      case 'name':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });
  
  // Update filter counts
  updateFilterCounts();
  
  // Render projects
  renderProjects();
}

/**
 * Update filter button counts
 */
function updateFilterCounts() {
  const counts = {
    all: allProjects.length,
    planning: allProjects.filter(p => p.status === 'planning').length,
    active: allProjects.filter(p => p.status === 'active').length,
    completed: allProjects.filter(p => p.status === 'completed').length,
    paused: allProjects.filter(p => p.status === 'paused').length
  };
  
  Object.keys(counts).forEach(status => {
    const badge = document.getElementById(`count-${status}`);
    if (badge) badge.textContent = counts[status];
  });
  
  // Update total projects count
  const totalCount = document.getElementById('totalProjectsCount');
  if (totalCount) totalCount.textContent = `${filteredProjects.length} of ${allProjects.length}`;
}

/**
 * Render projects grid
 */
function renderProjects() {
  const container = document.getElementById('projectsGrid');
  if (!container) return;
  
  // Show empty state if no projects
  if (filteredProjects.length === 0) {
    if (allProjects.length === 0) {
      // No projects at all
      container.innerHTML = `
        <div class="col-12">
          <div class="empty-state py-5">
            <div class="empty-state-icon">
              <i class="bi bi-folder-plus" style="font-size: 4rem; color: var(--text-tertiary);"></i>
            </div>
            <h3 class="empty-state-title">No Projects Yet</h3>
            <p class="empty-state-description">
              Create your first project to start organizing your work
            </p>
            <div class="empty-state-actions mt-4">
              <a href="./project-form.html${isDemo ? '?demo=true' : ''}" class="btn btn-primary btn-lg">
                <i class="bi bi-plus-circle me-2"></i>
                Create Your First Project
              </a>
            </div>
          </div>
        </div>
      `;
    } else {
      // Projects exist but filtered out
      container.innerHTML = `
        <div class="col-12">
          <div class="empty-state py-5">
            <div class="empty-state-icon">
              <i class="bi bi-search" style="font-size: 3rem; color: var(--text-tertiary);"></i>
            </div>
            <h3 class="empty-state-title">No Projects Found</h3>
            <p class="empty-state-description">
              Try adjusting your filters or search term
            </p>
            <button class="btn btn-outline-primary" onclick="window.clearFilters()">
              <i class="bi bi-x-circle me-2"></i>
              Clear Filters
            </button>
          </div>
        </div>
      `;
    }
    return;
  }
  
  // Render project cards
  container.innerHTML = filteredProjects.map(project => `
    <div class="col-lg-4 col-md-6 mb-4">
      <div class="project-card">
        <div class="project-cover" style="background: linear-gradient(135deg, #20b2aa 0%, #4169e1 100%);">
          <span class="project-cover-icon">
            <i class="bi bi-${getProjectIcon(project.project_type)}"></i>
          </span>
          <div class="project-badges">
            <span class="badge badge-status-${project.status}">${formatStatus(project.status)}</span>
            ${project.visibility === 'public' ? '<span class="badge bg-secondary"><i class="bi bi-globe"></i> Public</span>' : ''}
          </div>
        </div>
        
        <div class="project-body">
          <h5 class="project-title">${escapeHtml(project.title)}</h5>
          <p class="project-description">${escapeHtml(project.description)}</p>
          
          <div class="project-meta mb-3">
            <span class="project-meta-item">
              <i class="bi bi-tag"></i>
              ${project.project_type}
            </span>
            <span class="project-meta-item">
              <i class="bi bi-clock"></i>
              ${getRelativeTime(project.updated_at)}
            </span>
          </div>
          
          ${project.budget ? `
            <div class="project-meta mb-3">
              <span class="project-meta-item">
                <i class="bi bi-currency-euro"></i>
                ${formatCurrency(project.budget)}
              </span>
              ${project.funding_source ? `
                <span class="project-meta-item">
                  <i class="bi bi-building"></i>
                  ${escapeHtml(project.funding_source)}
                </span>
              ` : ''}
            </div>
          ` : ''}
          
          <div class="project-progress">
            <div class="project-progress-label">
              <span>Progress</span>
              <span class="project-progress-value">${project.progress_percentage}%</span>
            </div>
            <div class="progress">
              <div class="progress-bar ${getProgressColor(project.progress_percentage)}" 
                   style="width: ${project.progress_percentage}%"
                   role="progressbar"
                   aria-valuenow="${project.progress_percentage}"
                   aria-valuemin="0"
                   aria-valuemax="100">
              </div>
            </div>
          </div>
        </div>
        
        <div class="project-footer">
          <button class="btn btn-sm btn-outline-primary" onclick="window.viewProject('${project.id}')">
            <i class="bi bi-eye me-1"></i>
            View Details
          </button>
          <div class="dropdown">
            <button class="btn btn-sm btn-icon btn-outline-secondary" data-bs-toggle="dropdown">
              <i class="bi bi-three-dots-vertical"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li>
                <a class="dropdown-item" href="./project-form.html?id=${project.id}${isDemo ? '&demo=true' : ''}">
                  <i class="bi bi-pencil me-2"></i>Edit
                </a>
              </li>
              <li>
                <a class="dropdown-item" href="./project-details.html?id=${project.id}${isDemo ? '&demo=true' : ''}">
                  <i class="bi bi-eye me-2"></i>View Details
                </a>
              </li>
              <li><hr class="dropdown-divider"></li>
              <li>
                <a class="dropdown-item text-danger" href="#" onclick="window.deleteProject('${project.id}'); return false;">
                  <i class="bi bi-trash me-2"></i>Delete
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

/**
 * Get project icon based on type
 */
function getProjectIcon(type) {
  const icons = {
    'Academic & Research': 'mortarboard-fill',
    'Corporate/Business': 'building',
    'EU-Funded Project': 'flag-fill',
    'Public Initiative': 'people-fill',
    'Personal/Other': 'person-fill'
  };
  return icons[type] || 'folder-fill';
}

/**
 * Format status for display
 */
function formatStatus(status) {
  return status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');
}

/**
 * Get progress bar color
 */
function getProgressColor(percentage) {
  if (percentage < 30) return 'bg-danger';
  if (percentage < 70) return 'bg-warning';
  return 'bg-success';
}

/**
 * Format currency
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0
  }).format(amount);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * View project
 */
window.viewProject = function(projectId) {
  window.location.href = `./project-details.html?id=${projectId}${isDemo ? '&demo=true' : ''}`;
};

/**
 * Delete project
 */
window.deleteProject = async function(projectId) {
  try {
    // Show confirmation dialog
    const confirmed = confirm('Are you sure you want to delete this project? This action cannot be undone.');
    
    if (!confirmed) return;
    
    if (isDemo) {
      await demoServices.projects.delete(projectId);
      showSuccess('Project deleted (demo mode)');
    } else {
      await deleteProjectService(projectId);
      showSuccess('Project deleted successfully');
    }
    
    // Reload projects
    await loadProjects();
    
  } catch (error) {
    console.error('Failed to delete project:', error);
    showError('Failed to delete project');
  }
};

/**
 * Clear all filters
 */
window.clearFilters = function() {
  currentFilter = 'all';
  searchQuery = '';
  currentSort = 'newest';
  
  // Reset UI
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';
  
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === 'all');
  });
  
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) sortSelect.value = 'newest';
  
  applyFiltersAndSort();
};

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      applyFiltersAndSort();
    });
  }
  
  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.filter;
      
      // Update active state
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      applyFiltersAndSort();
    });
  });
  
  // Sort select
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      applyFiltersAndSort();
    });
  }
  
  // New project button
  const newProjectBtn = document.getElementById('newProjectBtn');
  if (newProjectBtn) {
    newProjectBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = `./project-form.html${isDemo ? '?demo=true' : ''}`;
    });
  }
  
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
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initProjectsPage);

export { initProjectsPage, isDemo };
