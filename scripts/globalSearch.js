import { isDemoSession } from './auth.js';
import { getAllProjects } from '../services/projectService.js';
import supabase from '../services/supabase.js';

// Search suggestions functionality
let searchTimeout;
const searchInput = document.getElementById('globalSearch');
const suggestionsContainer = document.getElementById('searchSuggestions');

if (searchInput && suggestionsContainer) {
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    if (query.length < 2) {
      suggestionsContainer.style.display = 'none';
      return;
    }
    
    searchTimeout = setTimeout(() => {
      showSearchSuggestions(query);
    }, 300);
  });
  
  searchInput.addEventListener('focus', (e) => {
    const query = e.target.value.trim();
    if (query.length >= 2) {
      showSearchSuggestions(query);
    }
  });
  
  // Close suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-input-wrapper') && !e.target.closest('#searchSuggestions')) {
      suggestionsContainer.style.display = 'none';
    }
  });
}

async function showSearchSuggestions(query) {
  const lowerQuery = query.toLowerCase();
  const suggestions = [];
  
  // Search in demo projects
  DEMO_PROJECTS.forEach(project => {
    if (project.title.toLowerCase().includes(lowerQuery) || 
        project.description.toLowerCase().includes(lowerQuery)) {
      suggestions.push({
        type: 'project',
        icon: 'bi-folder',
        title: project.title,
        meta: `${project.project_type} • ${project.status}`,
        url: `project-details.html?id=${project.id}`
      });
    }
  });
  
  // Search in demo tasks
  DEMO_TASKS.forEach(task => {
    if (task.title.toLowerCase().includes(lowerQuery) || 
        task.description.toLowerCase().includes(lowerQuery)) {
      suggestions.push({
        type: 'task',
        icon: 'bi-check-circle',
        title: task.title,
        meta: `Task • ${task.status}`,
        url: `project-details.html?id=${task.project_id}`
      });
    }
  });
  
  // Limit to 5 suggestions
  const limitedSuggestions = suggestions.slice(0, 5);
  
  if (limitedSuggestions.length > 0) {
    renderSuggestions(limitedSuggestions);
    suggestionsContainer.style.display = 'block';
  } else {
    suggestionsContainer.innerHTML = `
      <div class="p-3 text-center text-muted">
        <i class="bi bi-search mb-2" style="font-size: 2rem;"></i>
        <p class="mb-0">No results found for "${query}"</p>
      </div>
    `;
    suggestionsContainer.style.display = 'block';
  }
}

function renderSuggestions(suggestions) {
  const html = suggestions.map(item => `
    <div class="suggestion-item" onclick="window.location.href='${item.url}'">
      <div class="d-flex align-items-start">
        <i class="${item.icon} suggestion-icon"></i>
        <div class="flex-grow-1">
          <div class="suggestion-title">${item.title}</div>
          <div class="suggestion-meta">${item.meta}</div>
        </div>
      </div>
    </div>
  `).join('');
  
  suggestionsContainer.querySelector('.suggestions-list').innerHTML = html;
}

// Demo data imports (for demo mode)
const DEMO_PROJECTS = [
  {
    id: 'demo-1',
    title: 'Smart Campus Initiative',
    description: 'Digital transformation of university campus with IoT sensors, smart buildings, and data analytics platform.',
    project_type: 'Academic & Research',
    status: 'active',
    created_at: '2024-01-15',
    progress_percentage: 65
  },
  {
    id: 'demo-2',
    title: 'EU Digital Skills Training',
    description: 'Training program funded by EU to enhance digital literacy across Eastern Europe.',
    project_type: 'EU-Funded Project',
    status: 'planning',
    created_at: '2024-02-20',
    progress_percentage: 25
  },
  {
    id: 'demo-3',
    title: 'Corporate CRM Implementation',
    description: 'Enterprise CRM system deployment for multinational corporation.',
    project_type: 'Corporate/Business',
    status: 'completed',
    created_at: '2023-10-01',
    progress_percentage: 100
  }
];

const DEMO_TASKS = [
  { id: 'task-1', title: 'Design database schema', description: 'Create ERD for new system', project_id: 'demo-1', status: 'done', priority: 'high' },
  { id: 'task-2', title: 'Setup development environment', description: 'Install tools and frameworks', project_id: 'demo-1', status: 'in_progress', priority: 'medium' },
  { id: 'task-3', title: 'Prepare training materials', description: 'Create slides and handouts', project_id: 'demo-2', status: 'todo', priority: 'high' },
  { id: 'task-4', title: 'Deploy to production', description: 'Final deployment and testing', project_id: 'demo-3', status: 'done', priority: 'critical' }
];

const DEMO_FILES = [
  { id: 'file-1', file_name: 'project_proposal.pdf', caption: 'Initial project proposal document', project_id: 'demo-1', file_size: 2048576, created_at: '2024-01-20' },
  { id: 'file-2', file_name: 'architecture_diagram.png', caption: 'System architecture overview', project_id: 'demo-1', file_size: 512000, created_at: '2024-02-05' },
  { id: 'file-3', file_name: 'budget_report.xlsx', caption: 'Financial breakdown', project_id: 'demo-2', file_size: 102400, created_at: '2024-02-25' }
];

const DEMO_CONTACTS = [
  { id: 'contact-1', name: 'Dr. Maria Petrova', email: 'maria.petrova@university.edu', company: 'Sofia University', job_title: 'Project Lead' },
  { id: 'contact-2', name: 'John Smith', email: 'j.smith@euagency.eu', company: 'EU Digital Agency', job_title: 'Program Manager' },
  { id: 'contact-3', name: 'Anna Ivanova', email: 'anna@techcorp.com', company: 'TechCorp Solutions', job_title: 'CTO' }
];

// Search state
let searchQuery = '';
let searchFilters = {
  projects: true,
  tasks: true,
  files: true,
  contacts: true,
  projectType: '',
  status: '',
  dateFrom: '',
  dateTo: ''
};
let searchResults = { projects: [], tasks: [], files: [], contacts: [] };
let selectedResultIndex = -1;
let allResultsFlattened = [];

/**
 * Debounce function to limit search frequency
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Initialize global search functionality
 */
function initGlobalSearch() {
  const searchInput = document.getElementById('globalSearchInput');
  const searchFiltersBtn = document.getElementById('searchFiltersBtn');
  const clearFiltersBtn = document.getElementById('clearFilters');

  if (!searchInput) return;

  // Setup search input listener with debounce
  const debouncedSearch = debounce((query) => {
    performSearch(query);
  }, 300);

  searchInput.addEventListener('input', (e) => {
    debouncedSearch(e.target.value);
  });

  // Setup keyboard shortcuts
  setupKeyboardShortcuts();

  // Setup filter button
  if (searchFiltersBtn) {
    searchFiltersBtn.addEventListener('click', showSearchFiltersModal);
  }

  // Setup clear filters button
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', clearSearchFilters);
  }

  // Setup result navigation
  searchInput.addEventListener('keydown', handleResultNavigation);

  // Click outside to close
  document.addEventListener('click', handleClickOutside);

  // Apply filters on modal close
  const filtersModal = document.getElementById('searchFiltersModal');
  if (filtersModal) {
    filtersModal.addEventListener('hidden.bs.modal', () => {
      applySearchFilters();
      if (searchInput.value.trim().length >= 2) {
        performSearch(searchInput.value);
      }
    });
  }
}

/**
 * Perform comprehensive search across all categories
 * @param {string} query - Search query
 */
async function performSearch(query) {
  const searchResultsDiv = document.getElementById('searchResults');
  const searchLoading = document.getElementById('searchLoading');
  const searchNoResults = document.getElementById('searchNoResults');
  const searchResultsContent = document.getElementById('searchResultsContent');

  if (!searchResultsDiv) return;

  searchQuery = query.toLowerCase().trim();

  // Hide results if query too short
  if (searchQuery.length < 2) {
    searchResultsDiv.style.display = 'none';
    return;
  }

  // Show loading state
  searchResultsDiv.style.display = 'block';
  searchLoading.style.display = 'block';
  searchNoResults.style.display = 'none';
  searchResultsContent.innerHTML = '';

  try {
    // Search in enabled categories
    const searchPromises = [];

    if (searchFilters.projects) {
      searchPromises.push(searchProjects(searchQuery));
    }
    if (searchFilters.tasks) {
      searchPromises.push(searchTasks(searchQuery));
    }
    if (searchFilters.files) {
      searchPromises.push(searchFiles(searchQuery));
    }
    if (searchFilters.contacts) {
      searchPromises.push(searchContacts(searchQuery));
    }

    const results = await Promise.all(searchPromises);

    // Combine and organize results
    let resultIndex = 0;
    if (searchFilters.projects && results[resultIndex] !== undefined) {
      searchResults.projects = results[resultIndex++] || [];
    }
    if (searchFilters.tasks && results[resultIndex] !== undefined) {
      searchResults.tasks = results[resultIndex++] || [];
    }
    if (searchFilters.files && results[resultIndex] !== undefined) {
      searchResults.files = results[resultIndex++] || [];
    }
    if (searchFilters.contacts && results[resultIndex] !== undefined) {
      searchResults.contacts = results[resultIndex++] || [];
    }

    // Apply additional filters
    searchResults = applyFilters(searchResults);

    // Sort by relevance
    Object.keys(searchResults).forEach(key => {
      searchResults[key].sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
    });

    // Hide loading
    searchLoading.style.display = 'none';

    // Check if any results
    const totalResults = Object.values(searchResults).reduce((sum, arr) => sum + arr.length, 0);

    if (totalResults === 0) {
      searchNoResults.style.display = 'block';
    } else {
      renderSearchResults(searchResults);
    }
  } catch (error) {
    console.error('Search error:', error);
    searchLoading.style.display = 'none';
    searchResultsContent.innerHTML = '<div class="alert alert-danger m-3">Search failed. Please try again.</div>';
  }
}

/**
 * Search projects
 * @param {string} query - Search query
 * @returns {Promise<Array>} Matching projects
 */
async function searchProjects(query) {
  try {
    let projects;

    if (isDemoSession()) {
      projects = DEMO_PROJECTS;
    } else {
      projects = await getAllProjects();
    }

    // Search in title and description
    const matches = projects.filter(project => {
      const titleMatch = project.title.toLowerCase().includes(query);
      const descMatch = project.description?.toLowerCase().includes(query);
      return titleMatch || descMatch;
    });

    // Calculate relevance
    return matches.map(project => ({
      ...project,
      relevance: calculateRelevance(project, query)
    }));
  } catch (error) {
    console.error('Search projects error:', error);
    return [];
  }
}

/**
 * Search tasks
 * @param {string} query - Search query
 * @returns {Promise<Array>} Matching tasks
 */
async function searchTasks(query) {
  try {
    let tasks;
    let projects;

    if (isDemoSession()) {
      tasks = DEMO_TASKS;
      projects = DEMO_PROJECTS;
    } else {
      projects = await getAllProjects();
      const projectIds = projects.map(p => p.id);

      if (projectIds.length === 0) return [];

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .in('project_id', projectIds);

      if (error) throw error;
      tasks = data || [];
    }

    // Search in title and description
    const matches = tasks.filter(task => {
      const titleMatch = task.title.toLowerCase().includes(query);
      const descMatch = task.description?.toLowerCase().includes(query);
      return titleMatch || descMatch;
    });

    // Add project info
    return matches.map(task => {
      const project = projects.find(p => p.id === task.project_id);
      return {
        ...task,
        projectTitle: project?.title || 'Unknown Project',
        relevance: calculateRelevance(task, query)
      };
    });
  } catch (error) {
    console.error('Search tasks error:', error);
    return [];
  }
}

/**
 * Search files
 * @param {string} query - Search query
 * @returns {Promise<Array>} Matching files
 */
async function searchFiles(query) {
  try {
    let files;
    let projects;

    if (isDemoSession()) {
      files = DEMO_FILES;
      projects = DEMO_PROJECTS;
    } else {
      projects = await getAllProjects();
      const projectIds = projects.map(p => p.id);

      if (projectIds.length === 0) return [];

      const { data, error } = await supabase
        .from('project_files')
        .select('*')
        .in('project_id', projectIds);

      if (error) throw error;
      files = data || [];
    }

    // Search in file name and caption
    const matches = files.filter(file => {
      const nameMatch = file.file_name.toLowerCase().includes(query);
      const captionMatch = file.caption?.toLowerCase().includes(query);
      return nameMatch || captionMatch;
    });

    // Add project info
    return matches.map(file => {
      const project = projects.find(p => p.id === file.project_id);
      return {
        ...file,
        projectTitle: project?.title || 'Unknown Project',
        relevance: calculateRelevance(file, query)
      };
    });
  } catch (error) {
    console.error('Search files error:', error);
    return [];
  }
}

/**
 * Search contacts
 * @param {string} query - Search query
 * @returns {Promise<Array>} Matching contacts
 */
async function searchContacts(query) {
  try {
    let contacts;

    if (isDemoSession()) {
      contacts = DEMO_CONTACTS;
    } else {
      const { data, error } = await supabase
        .from('contacts')
        .select('*');

      if (error) throw error;
      contacts = data || [];
    }

    // Search in name, email, company, job_title
    const matches = contacts.filter(contact => {
      const nameMatch = contact.name.toLowerCase().includes(query);
      const emailMatch = contact.email?.toLowerCase().includes(query);
      const companyMatch = contact.company?.toLowerCase().includes(query);
      const jobMatch = contact.job_title?.toLowerCase().includes(query);
      return nameMatch || emailMatch || companyMatch || jobMatch;
    });

    // Calculate relevance
    return matches.map(contact => ({
      ...contact,
      relevance: calculateRelevance(contact, query)
    }));
  } catch (error) {
    console.error('Search contacts error:', error);
    return [];
  }
}

/**
 * Calculate relevance score for search result
 * @param {object} item - Search result item
 * @param {string} query - Search query
 * @returns {number} Relevance score
 */
function calculateRelevance(item, query) {
  let score = 0;
  const lowerQuery = query.toLowerCase();

  // Check title/name
  const title = (item.title || item.name || item.file_name || '').toLowerCase();
  if (title === lowerQuery) {
    score += 10; // Exact match
  } else if (title.startsWith(lowerQuery)) {
    score += 5; // Start match
  } else if (title.includes(lowerQuery)) {
    score += 2; // Partial match
  }

  // Check description/email
  const secondary = (item.description || item.email || item.caption || '').toLowerCase();
  if (secondary.includes(lowerQuery)) {
    score += 1;
  }

  // Boost recent items
  if (item.created_at) {
    const date = new Date(item.created_at);
    const now = new Date();
    const daysDiff = (now - date) / (1000 * 60 * 60 * 24);
    if (daysDiff < 7) score += 1;
  }

  return score;
}

/**
 * Apply filters to search results
 * @param {object} results - Search results by category
 * @returns {object} Filtered results
 */
function applyFilters(results) {
  const filtered = { ...results };

  // Filter projects by type and status
  if (filtered.projects && (searchFilters.projectType || searchFilters.status)) {
    filtered.projects = filtered.projects.filter(project => {
      const typeMatch = !searchFilters.projectType || project.project_type === searchFilters.projectType;
      const statusMatch = !searchFilters.status || project.status === searchFilters.status;
      return typeMatch && statusMatch;
    });
  }

  // Filter tasks by status
  if (filtered.tasks && searchFilters.status) {
    filtered.tasks = filtered.tasks.filter(task => task.status === searchFilters.status);
  }

  // Apply date range filters
  if (searchFilters.dateFrom || searchFilters.dateTo) {
    ['projects', 'tasks', 'files'].forEach(category => {
      if (filtered[category]) {
        filtered[category] = filtered[category].filter(item => {
          if (!item.created_at) return true;
          const itemDate = new Date(item.created_at);
          if (searchFilters.dateFrom) {
            const fromDate = new Date(searchFilters.dateFrom);
            if (itemDate < fromDate) return false;
          }
          if (searchFilters.dateTo) {
            const toDate = new Date(searchFilters.dateTo);
            if (itemDate > toDate) return false;
          }
          return true;
        });
      }
    });
  }

  return filtered;
}

/**
 * Render search results
 * @param {object} results - Search results by category
 */
function renderSearchResults(results) {
  const searchResultsContent = document.getElementById('searchResultsContent');
  if (!searchResultsContent) return;

  let html = '';
  let globalIndex = 0;
  allResultsFlattened = [];

  // Projects
  if (results.projects && results.projects.length > 0) {
    html += `<div class="search-category">
      <div class="search-category-header sticky-top bg-light px-3 py-2">
        <strong><i class="bi bi-folder me-2"></i>Projects</strong>
        <span class="badge bg-primary ms-2">${results.projects.length}</span>
      </div>`;

    results.projects.slice(0, 5).forEach(project => {
      html += renderProjectResult(project, globalIndex);
      allResultsFlattened.push({ type: 'project', data: project, index: globalIndex });
      globalIndex++;
    });

    if (results.projects.length > 5) {
      html += `<div class="px-3 py-2 text-muted small">+ ${results.projects.length - 5} more projects</div>`;
    }
    html += '</div>';
  }

  // Tasks
  if (results.tasks && results.tasks.length > 0) {
    html += `<div class="search-category">
      <div class="search-category-header sticky-top bg-light px-3 py-2">
        <strong><i class="bi bi-check-square me-2"></i>Tasks</strong>
        <span class="badge bg-primary ms-2">${results.tasks.length}</span>
      </div>`;

    results.tasks.slice(0, 5).forEach(task => {
      html += renderTaskResult(task, globalIndex);
      allResultsFlattened.push({ type: 'task', data: task, index: globalIndex });
      globalIndex++;
    });

    if (results.tasks.length > 5) {
      html += `<div class="px-3 py-2 text-muted small">+ ${results.tasks.length - 5} more tasks</div>`;
    }
    html += '</div>';
  }

  // Files
  if (results.files && results.files.length > 0) {
    html += `<div class="search-category">
      <div class="search-category-header sticky-top bg-light px-3 py-2">
        <strong><i class="bi bi-file-earmark me-2"></i>Files</strong>
        <span class="badge bg-primary ms-2">${results.files.length}</span>
      </div>`;

    results.files.slice(0, 5).forEach(file => {
      html += renderFileResult(file, globalIndex);
      allResultsFlattened.push({ type: 'file', data: file, index: globalIndex });
      globalIndex++;
    });

    if (results.files.length > 5) {
      html += `<div class="px-3 py-2 text-muted small">+ ${results.files.length - 5} more files</div>`;
    }
    html += '</div>';
  }

  // Contacts
  if (results.contacts && results.contacts.length > 0) {
    html += `<div class="search-category">
      <div class="search-category-header sticky-top bg-light px-3 py-2">
        <strong><i class="bi bi-person me-2"></i>Contacts</strong>
        <span class="badge bg-primary ms-2">${results.contacts.length}</span>
      </div>`;

    results.contacts.slice(0, 5).forEach(contact => {
      html += renderContactResult(contact, globalIndex);
      allResultsFlattened.push({ type: 'contact', data: contact, index: globalIndex });
      globalIndex++;
    });

    if (results.contacts.length > 5) {
      html += `<div class="px-3 py-2 text-muted small">+ ${results.contacts.length - 5} more contacts</div>`;
    }
    html += '</div>';
  }

  searchResultsContent.innerHTML = html;

  // Attach click handlers
  document.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', handleResultClick);
  });
}

/**
 * Render project search result
 * @param {object} project - Project object
 * @param {number} index - Global result index
 * @returns {string} HTML string
 */
function renderProjectResult(project, index) {
  const typeBadgeClass = getTypeBadgeClass(project.project_type);
  const statusBadgeClass = getStatusBadgeClass(project.status);
  const progress = project.progress_percentage || 0;

  return `
    <div class="search-result-item px-3 py-2" data-index="${index}" data-type="project" data-id="${project.id}">
      <div class="d-flex align-items-start">
        <i class="bi bi-folder-fill text-primary me-2 mt-1"></i>
        <div class="flex-grow-1">
          <div class="fw-semibold">${highlightMatch(project.title, searchQuery)}</div>
          <div class="small text-muted mb-1">${highlightMatch(project.description || '', searchQuery).substring(0, 100)}...</div>
          <div>
            <span class="badge ${typeBadgeClass} badge-sm me-1">${project.project_type}</span>
            <span class="badge ${statusBadgeClass} badge-sm">${project.status}</span>
            <span class="text-muted small ms-2">${progress}% complete</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render task search result
 * @param {object} task - Task object
 * @param {number} index - Global result index
 * @returns {string} HTML string
 */
function renderTaskResult(task, index) {
  const statusBadgeClass = getTaskStatusBadgeClass(task.status);
  const priorityBadgeClass = getPriorityBadgeClass(task.priority);

  return `
    <div class="search-result-item px-3 py-2" data-index="${index}" data-type="task" data-id="${task.id}" data-project-id="${task.project_id}">
      <div class="d-flex align-items-start">
        <i class="bi bi-check-square text-success me-2 mt-1"></i>
        <div class="flex-grow-1">
          <div class="fw-semibold">${highlightMatch(task.title, searchQuery)}</div>
          <div class="small text-muted mb-1">
            <i class="bi bi-folder me-1"></i>${task.projectTitle}
          </div>
          <div>
            <span class="badge ${statusBadgeClass} badge-sm me-1">${task.status}</span>
            ${task.priority ? `<span class="badge ${priorityBadgeClass} badge-sm">${task.priority}</span>` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render file search result
 * @param {object} file - File object
 * @param {number} index - Global result index
 * @returns {string} HTML string
 */
function renderFileResult(file, index) {
  const fileIcon = getFileIcon(file.file_name);
  const fileSize = formatFileSize(file.file_size);

  return `
    <div class="search-result-item px-3 py-2" data-index="${index}" data-type="file" data-id="${file.id}" data-project-id="${file.project_id}">
      <div class="d-flex align-items-start">
        <i class="bi ${fileIcon} text-info me-2 mt-1"></i>
        <div class="flex-grow-1">
          <div class="fw-semibold">${highlightMatch(file.file_name, searchQuery)}</div>
          <div class="small text-muted mb-1">
            <i class="bi bi-folder me-1"></i>${file.projectTitle} • ${fileSize}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render contact search result
 * @param {object} contact - Contact object
 * @param {number} index - Global result index
 * @returns {string} HTML string
 */
function renderContactResult(contact, index) {
  const initial = contact.name.charAt(0).toUpperCase();

  return `
    <div class="search-result-item px-3 py-2" data-index="${index}" data-type="contact" data-id="${contact.id}">
      <div class="d-flex align-items-start">
        <div class="avatar-sm bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2">
          ${initial}
        </div>
        <div class="flex-grow-1">
          <div class="fw-semibold">${highlightMatch(contact.name, searchQuery)}</div>
          <div class="small text-muted">${highlightMatch(contact.email || '', searchQuery)}</div>
          <div class="small text-muted">${contact.company || ''} ${contact.job_title ? '• ' + contact.job_title : ''}</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Highlight search query matches in text
 * @param {string} text - Text to highlight
 * @param {string} query - Search query
 * @returns {string} HTML with highlighted matches
 */
function highlightMatch(text, query) {
  if (!text || !query) return text;
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

/**
 * Handle keyboard navigation in search results
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleResultNavigation(event) {
  const searchResults = document.getElementById('searchResults');
  if (!searchResults || searchResults.style.display === 'none') return;

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    selectedResultIndex = Math.min(selectedResultIndex + 1, allResultsFlattened.length - 1);
    updateSelectedResult();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    selectedResultIndex = Math.max(selectedResultIndex - 1, -1);
    updateSelectedResult();
  } else if (event.key === 'Enter') {
    event.preventDefault();
    if (selectedResultIndex >= 0 && allResultsFlattened[selectedResultIndex]) {
      navigateToResult(allResultsFlattened[selectedResultIndex]);
    }
  } else if (event.key === 'Escape') {
    event.preventDefault();
    closeSearchResults();
  }
}

/**
 * Update visual selection of result
 */
function updateSelectedResult() {
  document.querySelectorAll('.search-result-item').forEach((item, idx) => {
    if (idx === selectedResultIndex) {
      item.classList.add('selected');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('selected');
    }
  });
}

/**
 * Handle result click
 * @param {Event} event - Click event
 */
function handleResultClick(event) {
  const item = event.currentTarget;
  const type = item.dataset.type;
  const id = item.dataset.id;
  const projectId = item.dataset.projectId;

  navigateToResult({ type, data: { id, project_id: projectId } });
}

/**
 * Navigate to selected result
 * @param {object} result - Result object
 */
function navigateToResult(result) {
  const { type, data } = result;

  switch (type) {
    case 'project':
      window.location.href = `./project-details.html?id=${data.id}`;
      break;
    case 'task':
      window.location.href = `./project-details.html?id=${data.project_id}#task-${data.id}`;
      break;
    case 'file':
      window.location.href = `./project-details.html?id=${data.project_id}#files`;
      break;
    case 'contact':
      window.location.href = `./profile.html?contact=${data.id}`;
      break;
  }

  closeSearchResults();
}

/**
 * Show search filters modal
 */
function showSearchFiltersModal() {
  const modal = new bootstrap.Modal(document.getElementById('searchFiltersModal'));
  modal.show();
}

/**
 * Apply search filters
 */
function applySearchFilters() {
  searchFilters.projects = document.getElementById('filterProjects')?.checked || false;
  searchFilters.tasks = document.getElementById('filterTasks')?.checked || false;
  searchFilters.files = document.getElementById('filterFiles')?.checked || false;
  searchFilters.contacts = document.getElementById('filterContacts')?.checked || false;
  searchFilters.projectType = document.getElementById('filterProjectType')?.value || '';
  searchFilters.status = document.getElementById('filterStatus')?.value || '';
  searchFilters.dateFrom = document.getElementById('filterDateFrom')?.value || '';
  searchFilters.dateTo = document.getElementById('filterDateTo')?.value || '';
}

/**
 * Clear all search filters
 */
function clearSearchFilters() {
  document.getElementById('filterProjects').checked = true;
  document.getElementById('filterTasks').checked = true;
  document.getElementById('filterFiles').checked = true;
  document.getElementById('filterContacts').checked = true;
  document.getElementById('filterProjectType').value = '';
  document.getElementById('filterStatus').value = '';
  document.getElementById('filterDateFrom').value = '';
  document.getElementById('filterDateTo').value = '';

  searchFilters = {
    projects: true,
    tasks: true,
    files: true,
    contacts: true,
    projectType: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  };
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl+K or Cmd+K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const searchInput = document.getElementById('globalSearchInput');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }

    // / to focus search (like GitHub)
    if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      const searchInput = document.getElementById('globalSearchInput');
      if (searchInput) {
        searchInput.focus();
      }
    }
  });
}

/**
 * Close search results dropdown
 */
function closeSearchResults() {
  const searchResults = document.getElementById('searchResults');
  const searchInput = document.getElementById('globalSearchInput');
  
  if (searchResults) {
    searchResults.style.display = 'none';
  }
  
  if (searchInput) {
    searchInput.blur();
  }
  
  selectedResultIndex = -1;
}

/**
 * Handle click outside search container
 * @param {Event} event - Click event
 */
function handleClickOutside(event) {
  const searchContainer = document.querySelector('.search-container');
  if (searchContainer && !searchContainer.contains(event.target)) {
    closeSearchResults();
  }
}

// Helper functions

function getTypeBadgeClass(type) {
  const map = {
    'Academic & Research': 'bg-info',
    'Corporate/Business': 'bg-primary',
    'EU-Funded Project': 'bg-success',
    'Public Initiative': 'bg-warning',
    'Personal/Other': 'bg-secondary'
  };
  return map[type] || 'bg-secondary';
}

function getStatusBadgeClass(status) {
  const map = {
    'planning': 'bg-secondary',
    'active': 'bg-primary',
    'completed': 'bg-success',
    'paused': 'bg-warning',
    'archived': 'bg-dark'
  };
  return map[status] || 'bg-secondary';
}

function getTaskStatusBadgeClass(status) {
  const map = {
    'todo': 'bg-secondary',
    'in_progress': 'bg-primary',
    'done': 'bg-success'
  };
  return map[status] || 'bg-secondary';
}

function getPriorityBadgeClass(priority) {
  const map = {
    'low': 'bg-info',
    'medium': 'bg-warning',
    'high': 'bg-danger',
    'critical': 'bg-dark'
  };
  return map[priority] || 'bg-secondary';
}

function getFileIcon(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  const iconMap = {
    'pdf': 'bi-file-pdf',
    'doc': 'bi-file-word',
    'docx': 'bi-file-word',
    'xls': 'bi-file-excel',
    'xlsx': 'bi-file-excel',
    'ppt': 'bi-file-ppt',
    'pptx': 'bi-file-ppt',
    'jpg': 'bi-file-image',
    'jpeg': 'bi-file-image',
    'png': 'bi-file-image',
    'gif': 'bi-file-image',
    'zip': 'bi-file-zip',
    'rar': 'bi-file-zip',
    'txt': 'bi-file-text'
  };
  return iconMap[ext] || 'bi-file-earmark';
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initGlobalSearch);

export { performSearch, closeSearchResults };
