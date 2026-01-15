/**
 * Projects page script
 * Handles project listing, filtering, searching, sorting, and view toggling
 */

import { checkAuth, getCurrentUser, logout } from './auth.js';
import { getAllProjects, deleteProject as deleteProjectService, searchProjects } from '../services/projectService.js';

// DOM Elements
const projectsContainer = document.getElementById('projectsContainer');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const typeFilter = document.getElementById('typeFilter');
const statusFilter = document.getElementById('statusFilter');
const sortSelect = document.getElementById('sortSelect');
const gridViewBtn = document.getElementById('gridViewBtn');
const listViewBtn = document.getElementById('listViewBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userAvatarNav = document.getElementById('userAvatarNav');
const userNameNav = document.getElementById('userNameNav');
const pagination = document.getElementById('pagination');
const newProjectBtn = document.querySelector('[href="project-form.html"]');

// State
let allProjects = [];
let currentUser = null;
let currentView = localStorage.getItem('projectsViewPreference') || 'grid';
let filteredProjects = [];
const PROJECTS_PER_PAGE = 12;
let currentPage = 1;
let searchTimeout = null;

/**
 * Initialize projects page
 * Checks authentication, loads user data, and sets up UI
 */
async function initProjectsPage() {
  try {
    // Check authentication
    currentUser = await checkAuth();
    updateUserInfo(currentUser);

    // Load all projects
    await loadProjects();

    // Setup event listeners
    setupEventListeners();

    // Restore view preference
    if (currentView === 'list') {
      toggleView('list');
    }
  } catch (error) {
    console.error('Error initializing projects page:', error);
    showError('Failed to initialize projects page');
  }
}

/**
 * Load all projects with optional filters
 * @param {Object} filters - Filter options { type, status, search, sort }
 */
async function loadProjects(filters = {}) {
  try {
    showLoading();

    // Fetch all projects
    const data = await getAllProjects();
    allProjects = data || [];

    // Apply filters and sorting
    applyFiltersAndSort();
  } catch (error) {
    console.error('Error loading projects:', error);
    showError('Failed to load projects');
    projectsContainer.innerHTML = '';
  } finally {
    hideLoading();
  }
}

/**
 * Apply filters and sorting to projects
 */
function applyFiltersAndSort() {
  let filtered = [...allProjects];

  // Apply search filter
  const searchTerm = searchInput.value.toLowerCase();
  if (searchTerm) {
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(searchTerm) ||
      (p.description && p.description.toLowerCase().includes(searchTerm))
    );
  }

  // Apply type filter
  const typeValue = typeFilter.value;
  if (typeValue) {
    filtered = filtered.filter(p => p.type === typeValue);
  }

  // Apply status filter
  const statusValue = statusFilter.value;
  if (statusValue) {
    filtered = filtered.filter(p => p.status === statusValue);
  }

  // Apply sorting
  const sortValue = sortSelect.value;
  filtered = applySorting(filtered, sortValue);

  filteredProjects = filtered;
  currentPage = 1;
  renderProjects();
}

/**
 * Apply sorting to projects array
 * @param {Array} projects - Projects array
 * @param {string} sortType - Sort type (newest, oldest, name, progress)
 * @returns {Array} Sorted projects
 */
function applySorting(projects, sortType) {
  const sorted = [...projects];

  switch (sortType) {
    case 'oldest':
      sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      break;
    case 'name':
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'progress':
      sorted.sort((a, b) => (b.progress || 0) - (a.progress || 0));
      break;
    case 'newest':
    default:
      sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  return sorted;
}

/**
 * Render projects in current view (grid or list)
 */
function renderProjects() {
  if (filteredProjects.length === 0) {
    projectsContainer.innerHTML = '';
    emptyState.classList.remove('d-none');
    pagination.classList.add('d-none');
    return;
  }

  emptyState.classList.add('d-none');

  // Handle pagination
  const totalPages = Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE);
  const startIdx = (currentPage - 1) * PROJECTS_PER_PAGE;
  const endIdx = startIdx + PROJECTS_PER_PAGE;
  const pageProjects = filteredProjects.slice(startIdx, endIdx);

  // Render based on view
  if (currentView === 'grid') {
    renderProjectsGrid(pageProjects);
  } else {
    renderProjectsList(pageProjects);
  }

  // Handle pagination display
  if (totalPages > 1) {
    updatePagination(totalPages);
    pagination.classList.remove('d-none');
  } else {
    pagination.classList.add('d-none');
  }
}

/**
 * Render projects in grid view
 * @param {Array} projects - Projects to render
 */
function renderProjectsGrid(projects) {
  projectsContainer.className = 'row g-4';
  projectsContainer.innerHTML = projects.map(project => renderProjectCard(project, false)).join('');
  attachActionListeners();
}

/**
 * Render projects in list view
 * @param {Array} projects - Projects to render
 */
function renderProjectsList(projects) {
  projectsContainer.className = 'row';
  projectsContainer.innerHTML = projects.map(project => renderProjectCard(project, true)).join('');
  attachActionListeners();
}

/**
 * Render single project card
 * @param {Object} project - Project data
 * @param {boolean} isListView - Whether rendering in list view
 * @returns {string} HTML string
 */
function renderProjectCard(project, isListView = false) {
  const typeColor = getTypeBadgeClass(project.type);
  const statusColor = getStatusBadgeClass(project.status);
  const progress = project.progress || 0;
  const startDate = formatDate(project.start_date);
  const endDate = project.end_date ? formatDate(project.end_date) : null;
  const description = truncateText(project.description || 'No description', isListView ? 150 : 100);

  if (isListView) {
    return `
      <div class="col-12">
        <div class="project-list-item">
          <div class="project-list-image" style="background: linear-gradient(135deg, ${typeColor} 0%, #4169e1 100%);">
            ${project.cover_image_url ? `<img src="${escapeHtml(project.cover_image_url)}" alt="${escapeHtml(project.title)}">` : ''}
          </div>
          <div class="project-list-content">
            <div class="project-list-header">
              <div>
                <div class="project-list-title">
                  <a href="project-details.html?id=${project.id}">${escapeHtml(project.title)}</a>
                </div>
                <small class="text-muted d-block mt-1">${description}</small>
              </div>
              <div class="project-list-badges">
                <span class="badge" style="background-color: ${typeColor}">${escapeHtml(project.type)}</span>
                <span class="badge" style="background-color: ${statusColor}">${capitalizeText(project.status)}</span>
              </div>
            </div>
            <div class="project-list-footer">
              <div style="flex: 1;">
                <small class="text-muted me-3">
                  <i class="bi bi-calendar me-1"></i>${startDate}
                  ${endDate ? ` - ${endDate}` : ''}
                </small>
                <div class="mt-2" style="max-width: 300px;">
                  <small class="text-muted d-block">${progress}% Complete</small>
                  <div class="progress" style="height: 4px;">
                    <div class="progress-bar" role="progressbar" style="width: ${progress}%" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"></div>
                  </div>
                </div>
              </div>
              <div class="d-flex gap-2">
                <button type="button" class="btn btn-sm btn-primary view-project" data-id="${project.id}">View</button>
                <button type="button" class="btn btn-sm btn-outline-secondary edit-project" data-id="${project.id}" title="Edit">
                  <i class="bi bi-pencil"></i>
                </button>
                <button type="button" class="btn btn-sm btn-outline-danger delete-project" data-id="${project.id}" title="Delete">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    return `
      <div class="col-md-6 col-lg-4">
        <div class="project-card">
          <div class="project-cover" style="background: linear-gradient(135deg, ${typeColor} 0%, #4169e1 100%);">
            ${project.cover_image_url ? `<img src="${escapeHtml(project.cover_image_url)}" alt="${escapeHtml(project.title)}">` : ''}
            <span class="badge project-badge" style="background-color: ${statusColor};">
              ${capitalizeText(project.status)}
            </span>
          </div>
          <div class="project-body">
            <div class="project-title">
              <a href="project-details.html?id=${project.id}">${escapeHtml(project.title)}</a>
            </div>
            <div class="project-description">${description}</div>
            <div class="project-meta">
              <span>
                <i class="bi bi-tag me-1"></i>
                <span style="background-color: ${typeColor}" class="badge">${escapeHtml(project.type)}</span>
              </span>
              ${startDate ? `<span><i class="bi bi-calendar me-1"></i>${startDate}</span>` : ''}
              ${endDate ? `<span><i class="bi bi-calendar-event me-1"></i>${endDate}</span>` : ''}
            </div>
            <div class="project-progress">
              <label>${progress}% Complete</label>
              <div class="progress">
                <div class="progress-bar" role="progressbar" style="width: ${progress}%" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"></div>
              </div>
            </div>
            <div class="project-actions">
              <button type="button" class="btn btn-sm btn-primary view-project" data-id="${project.id}">
                <i class="bi bi-eye me-1"></i> View
              </button>
              <button type="button" class="btn btn-sm btn-outline-secondary btn-icon edit-project" data-id="${project.id}" title="Edit">
                <i class="bi bi-pencil"></i>
              </button>
              <button type="button" class="btn btn-sm btn-outline-danger btn-icon delete-project" data-id="${project.id}" title="Delete">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

/**
 * Attach event listeners to action buttons
 */
function attachActionListeners() {
  // View buttons
  document.querySelectorAll('.view-project').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const projectId = e.currentTarget.dataset.id;
      navigateToDetails(projectId);
    });
  });

  // Edit buttons
  document.querySelectorAll('.edit-project').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const projectId = e.currentTarget.dataset.id;
      navigateToEdit(projectId);
    });
  });

  // Delete buttons
  document.querySelectorAll('.delete-project').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const projectId = e.currentTarget.dataset.id;
      handleDeleteProject(projectId);
    });
  });
}

/**
 * Handle search input
 */
function handleSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    applyFiltersAndSort();
  }, 300);
}

/**
 * Handle filter changes
 */
function handleFilterChange() {
  applyFiltersAndSort();
}

/**
 * Handle sort change
 */
function handleSortChange() {
  applyFiltersAndSort();
}

/**
 * Toggle between grid and list view
 * @param {string} viewType - View type ('grid' or 'list')
 */
function toggleView(viewType) {
  currentView = viewType;
  localStorage.setItem('projectsViewPreference', viewType);

  if (viewType === 'grid') {
    gridViewBtn.classList.add('active');
    listViewBtn.classList.remove('active');
  } else {
    listViewBtn.classList.add('active');
    gridViewBtn.classList.remove('active');
  }

  currentPage = 1;
  renderProjects();
}

/**
 * Handle delete project action
 * @param {string} projectId - Project ID to delete
 */
async function handleDeleteProject(projectId) {
  const confirmed = confirm('Are you sure you want to delete this project? This action cannot be undone.');
  if (!confirmed) return;

  try {
    // Delete from database
    await deleteProjectService(projectId);

    // Remove from local array
    allProjects = allProjects.filter(p => p.id !== projectId);
    applyFiltersAndSort();

    showSuccess('Project deleted successfully');
  } catch (error) {
    console.error('Error deleting project:', error);
    showError('Failed to delete project');
  }
}

/**
 * Navigate to project details page
 * @param {string} projectId - Project ID
 */
function navigateToDetails(projectId) {
  window.location.href = `project-details.html?id=${projectId}`;
}

/**
 * Navigate to project edit page
 * @param {string} projectId - Project ID
 */
function navigateToEdit(projectId) {
  window.location.href = `project-form.html?id=${projectId}`;
}

/**
 * Navigate to create project page
 */
function navigateToCreate() {
  window.location.href = 'project-form.html';
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Search input with debounce
  searchInput.addEventListener('input', handleSearch);

  // Filter dropdowns
  typeFilter.addEventListener('change', handleFilterChange);
  statusFilter.addEventListener('change', handleFilterChange);
  sortSelect.addEventListener('change', handleSortChange);

  // View toggle buttons
  gridViewBtn.addEventListener('click', () => toggleView('grid'));
  listViewBtn.addEventListener('click', () => toggleView('list'));

  // New project button
  if (newProjectBtn) {
    newProjectBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateToCreate();
    });
  }

  // Logout button
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });
}

/**
 * Update user info in navbar
 * @param {Object} user - User object
 */
function updateUserInfo(user) {
  if (user) {
    const fullName = user.user_metadata?.full_name || user.email || 'User';
    const initials = fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

    userAvatarNav.textContent = initials;
    userAvatarNav.style.backgroundColor = getColorForInitials(initials);
    userNameNav.textContent = fullName;
  }
}

/**
 * Update pagination controls
 * @param {number} totalPages - Total number of pages
 */
function updatePagination(totalPages) {
  const paginationList = pagination.querySelector('.pagination');
  let html = `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" id="prevPage">Previous</a></li>`;

  for (let i = 1; i <= totalPages; i++) {
    html += `<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
  }

  html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" id="nextPage">Next</a></li>`;
  paginationList.innerHTML = html;

  // Attach pagination listeners
  document.querySelectorAll('.pagination a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const pageNum = parseInt(link.dataset.page || 0);
      if (pageNum) {
        currentPage = pageNum;
      } else if (link.id === 'prevPage' && currentPage > 1) {
        currentPage--;
      } else if (link.id === 'nextPage' && currentPage < totalPages) {
        currentPage++;
      }
      renderProjects();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Show loading skeleton state
 */
function showLoading() {
  let html = '';
  for (let i = 0; i < 6; i++) {
    html += `<div class="col-md-6 col-lg-4"><div class="card skeleton" style="height: 400px;"></div></div>`;
  }
  projectsContainer.className = 'row g-4';
  projectsContainer.innerHTML = html;
}

/**
 * Hide loading skeleton state
 */
function hideLoading() {
  // Loading is hidden when content is rendered
}

/**
 * Truncate text to max length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Max length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return escapeHtml(text);
  return escapeHtml(text.substring(0, maxLength)) + '...';
}

/**
 * Format date to readable format
 * @param {string} dateString - Date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Get status badge color
 * @param {string} status - Project status
 * @returns {string} Color hex code
 */
function getStatusBadgeClass(status) {
  const colors = {
    'planning': '#ffc107',
    'active': '#28a745',
    'completed': '#17a2b8',
    'paused': '#6c757d',
    'archived': '#343a40'
  };
  return colors[status] || '#999';
}

/**
 * Get type badge color
 * @param {string} type - Project type
 * @returns {string} Color hex code
 */
function getTypeBadgeClass(type) {
  const colors = {
    'Academic & Research': '#20b2aa',
    'Corporate/Business': '#4169e1',
    'EU-Funded Project': '#ff6b6b',
    'Public Initiative': '#ffd93d',
    'Personal/Other': '#6bcf7f'
  };
  return colors[type] || '#999';
}

/**
 * Get color for user initials
 * @param {string} initials - User initials
 * @returns {string} Color hex code
 */
function getColorForInitials(initials) {
  const colors = ['#20b2aa', '#4169e1', '#ff6b6b', '#ffd93d', '#6bcf7f'];
  const code = (initials.charCodeAt(0) || 0) + (initials.charCodeAt(1) || 0);
  return colors[code % colors.length];
}

/**
 * Capitalize text
 * @param {string} text - Text to capitalize
 * @returns {string} Capitalized text
 */
function capitalizeText(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Show error notification
 * @param {string} message - Error message
 */
function showError(message) {
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed top-0 start-0 m-3';
  alertDiv.style.zIndex = '9999';
  alertDiv.setAttribute('role', 'alert');
  alertDiv.innerHTML = `
    <i class="bi bi-exclamation-circle me-2"></i>
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  document.body.appendChild(alertDiv);

  setTimeout(() => alertDiv.remove(), 5000);
}

/**
 * Show success notification
 * @param {string} message - Success message
 */
function showSuccess(message) {
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-0 m-3';
  alertDiv.style.zIndex = '9999';
  alertDiv.setAttribute('role', 'alert');
  alertDiv.innerHTML = `
    <i class="bi bi-check-circle me-2"></i>
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  document.body.appendChild(alertDiv);

  setTimeout(() => alertDiv.remove(), 5000);
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', initProjectsPage);
