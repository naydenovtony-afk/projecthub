/**
 * Project Details Page Script
 * Handles project overview, tasks (Kanban), files, and activity timeline
 * Fully supports demo mode
 */

import { isDemoMode, demoServices } from '../utils/demoMode.js';
import { getCurrentUser } from './auth.js';
import { showError, showSuccess, confirm, showLoading, hideLoading } from '../utils/ui.js';
import { formatDate, getRelativeTime, calculateProgress } from '../utils/helpers.js';

// Global state
let currentUser = null;
let isDemo = false;
let currentProject = null;
let projectTasks = [];
let projectFiles = [];
let projectActivity = [];
let currentTab = 'overview';
let filesViewMode = 'grid';
let filesListenersInitialized = false;
const filesFilterState = {
  category: '',
  sort: 'newest',
  search: ''
};

const DEMO_FALLBACK_FILES = [
  {
    id: 'demo-fallback-1',
    file_name: 'project-charter.pdf',
    file_type: 'application/pdf',
    file_size: 1824000,
    category: 'document',
    caption: 'Project charter and objectives',
    uploaded_at: '2026-01-10T10:30:00Z',
    file_url: '#'
  },
  {
    id: 'demo-fallback-2',
    file_name: 'work-breakdown-structure.xlsx',
    file_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    file_size: 734003,
    category: 'report',
    caption: 'Task structure and dependencies',
    uploaded_at: '2026-01-14T09:20:00Z',
    file_url: '#'
  },
  {
    id: 'demo-fallback-3',
    file_name: 'kickoff-presentation.pptx',
    file_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    file_size: 2873098,
    category: 'deliverable',
    caption: 'Kickoff presentation for partners',
    uploaded_at: '2026-01-18T15:45:00Z',
    file_url: '#'
  }
];

/**
 * Initialize project details page
 */
async function initProjectDetails() {
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
    }
    
    // Get project ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');
    
    if (!projectId) {
      showError('Project not found');
      setTimeout(() => window.location.href = './projects.html', 2000);
      return;
    }
    
    // Load project data
    await loadProject(projectId);
    
    // Setup tabs
    setupTabs();
    
    // Setup event listeners
    setupEventListeners();
    
  } catch (error) {
    console.error('Project details init error:', error);
    showError('Failed to load project details');
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
    <strong>Demo Mode:</strong> Viewing sample project. 
    <a href="./register.html" class="alert-link">Create real account</a>
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.body.appendChild(badge);
}

/**
 * Load project data
 */
async function loadProject(projectId) {
  try {
    showLoading('Loading project...');
    
    if (isDemo) {
      currentProject = await demoServices.projects.getById(projectId);
    } else {
      currentProject = await fetchRealProject(projectId);
    }
    
    if (!currentProject) {
      throw new Error('Project not found');
    }
    
    // Render project header
    renderProjectHeader();
    
    // Load overview tab (default)
    await loadOverviewTab();
    
    // Emit event that project loaded (for AI assistant)
    window.dispatchEvent(new CustomEvent('projectLoaded', { 
      detail: { project: currentProject } 
    }));
    
    hideLoading();
    
  } catch (error) {
    hideLoading();
    throw error;
  }
}

/**
 * Fetch real project from Supabase
 */
async function fetchRealProject(projectId) {
  const { getProjectById } = await import('../services/projectService.js');
  return await getProjectById(projectId);
}

/**
 * Fetch real tasks from Supabase
 */
async function fetchRealTasks(projectId) {
  const { getTasksByProject } = await import('../services/taskService.js');
  return await getTasksByProject(projectId);
}

/**
 * Fetch real files from Supabase
 */
async function fetchRealFiles(projectId) {
  const { getFilesByProject } = await import('../services/storageService.js');
  return await getFilesByProject(projectId);
}

/**
 * Fetch real activity from Supabase
 */
async function fetchRealActivity(projectId) {
  const { supabase } = await import('../services/supabase.js');
  const { data } = await supabase
    .from('activity')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(20);
  return data || [];
}

/**
 * Update real task status
 */
async function updateRealTaskStatus(taskId, newStatus) {
  const { updateTask } = await import('../services/taskService.js');
  return await updateTask(taskId, { status: newStatus });
}

/**
 * Delete real task
 */
async function deleteRealTask(taskId) {
  const { deleteTask } = await import('../services/taskService.js');
  return await deleteTask(taskId);
}

/**
 * Delete real project
 */
async function deleteRealProject(projectId) {
  const { deleteProject } = await import('../services/projectService.js');
  return await deleteProject(projectId);
}

/**
 * Render project header with metadata
 */
function renderProjectHeader() {
  const titleEl = document.getElementById('projectTitle');
  
  // Hero section badge IDs
  const heroTypeEl = document.getElementById('projectType');
  const heroStatusEl = document.getElementById('projectStatus');
  
  // Top metrics bar IDs
  const startDateEl = document.getElementById('startDate');
  const endDateEl = document.getElementById('endDate');
  const budgetEl = document.getElementById('budget');
  const fundingEl = document.getElementById('fundingSource');
  const overallProgressBar = document.getElementById('overallProgress');
  const progressPercentage = document.getElementById('progressPercentage');
  
  // Project Details box IDs (in overview tab)
  const detailsTypeEl = document.querySelector('#overview .card-body #projectType');
  const detailsStatusEl = document.querySelector('#overview .card-body #projectStatus');
  const projectStartDateEl = document.getElementById('projectStartDate');
  const projectEndDateEl = document.getElementById('projectEndDate');
  const projectBudgetEl = document.getElementById('projectBudget');
  const projectProgressEl = document.getElementById('projectProgress');
  const projectProgressBar = document.getElementById('projectProgressBar');
  const projectDescriptionEl = document.getElementById('projectDescriptionOverview');
  
  if (titleEl) titleEl.textContent = currentProject.title;
  
  // Populate hero badges
  if (heroTypeEl) {
    heroTypeEl.className = 'badge badge-primary';
    heroTypeEl.textContent = currentProject.project_type;
  }
  
  if (heroStatusEl) {
    heroStatusEl.className = `badge badge-status-${currentProject.status}`;
    heroStatusEl.textContent = formatStatus(currentProject.status);
  }
  
  // Populate top metrics bar
  if (startDateEl && currentProject.start_date) {
    startDateEl.textContent = formatDate(currentProject.start_date);
  }
  
  if (endDateEl && currentProject.end_date) {
    endDateEl.textContent = formatDate(currentProject.end_date);
  }
  
  if (budgetEl && currentProject.budget) {
    budgetEl.textContent = formatCurrency(currentProject.budget);
  }
  
  if (fundingEl && currentProject.funding_source) {
    fundingEl.textContent = currentProject.funding_source;
  }
  
  if (overallProgressBar && progressPercentage) {
    const progress = currentProject.progress_percentage || 0;
    overallProgressBar.style.width = progress + '%';
    progressPercentage.textContent = progress + '%';
  }
  
  // Populate Project Details box (plain text, no badges)
  if (detailsTypeEl) {
    detailsTypeEl.textContent = currentProject.project_type || '-';
  }
  
  if (detailsStatusEl) {
    detailsStatusEl.textContent = formatStatus(currentProject.status);
  }
  
  if (projectStartDateEl && currentProject.start_date) {
    projectStartDateEl.textContent = formatDate(currentProject.start_date);
  }
  
  if (projectEndDateEl && currentProject.end_date) {
    projectEndDateEl.textContent = formatDate(currentProject.end_date);
  }
  
  if (projectBudgetEl && currentProject.budget) {
    projectBudgetEl.textContent = formatCurrency(currentProject.budget);
  }
  
  if (projectProgressEl && projectProgressBar) {
    const progress = currentProject.progress_percentage || 0;
    projectProgressEl.textContent = progress + '%';
    projectProgressBar.style.width = progress + '%';
  }
  
  if (projectDescriptionEl) {
    projectDescriptionEl.textContent = currentProject.description || 'No description provided.';
  }
  
  // Populate quick stats and team preview after header
  populateQuickStats();
  populateMilestonesPreview();
  populateTeamPreview();
}

/**
 * Populate quick stats in overview section
 */
async function populateQuickStats() {
  // Load tasks if not already loaded
  if (projectTasks.length === 0) {
    if (isDemo) {
      const tasksData = await demoServices.tasks.getByProject(currentProject.id);
      // Convert object format to flat array
      projectTasks = [...tasksData.todo, ...tasksData.in_progress, ...tasksData.done];
    } else {
      projectTasks = await fetchRealTasks(currentProject.id);
    }
  }
  
  // Load files
  if (isDemo) {
    projectFiles = await demoServices.files.getByProject(currentProject.id);
  }
  
  // Get team members count
  let teamCount = 1; // At least the owner
  if (isDemo) {
    const teamMembers = await demoServices.teamMembers.getByProject(currentProject.id);
    teamCount = teamMembers.length;
  }
  
  const totalTasksEl = document.getElementById('totalTasks');
  const completedTasksEl = document.getElementById('completedTasks');
  const inProgressTasksEl = document.getElementById('inProgressTasks');
  const totalFilesEl = document.getElementById('totalFilesOverview');
  const teamMembersEl = document.getElementById('teamMembers');
  
  if (totalTasksEl) totalTasksEl.textContent = projectTasks.length;
  if (completedTasksEl) completedTasksEl.textContent = projectTasks.filter(t => t.status === 'done').length;
  if (inProgressTasksEl) inProgressTasksEl.textContent = projectTasks.filter(t => t.status === 'in_progress').length;
  if (totalFilesEl) totalFilesEl.textContent = projectFiles.length;
  if (teamMembersEl) teamMembersEl.textContent = teamCount;
}

/**
 * Populate milestones preview in overview section
 */
async function populateMilestonesPreview() {
  const container = document.getElementById('milestonesContent');
  if (!container) return;
  
  let milestones = [];
  if (isDemo) {
    milestones = await demoServices.milestones.getByProject(currentProject.id);
  }
  
  if (milestones.length === 0) {
    container.innerHTML = `
      <div class="empty-state-sm text-center py-4">
        <i class="bi bi-flag text-muted fs-2 opacity-25"></i>
        <p class="text-muted small mb-0 mt-2">No milestones yet</p>
      </div>
    `;
    return;
  }
  
  // Show only upcoming or in-progress milestones (max 3)
  const activeMilestones = milestones
    .filter(m => m.status !== 'completed')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 3);
  
  container.innerHTML = activeMilestones.map(milestone => `
    <div class="d-flex align-items-start mb-3 pb-3 border-bottom">
      <div class="flex-shrink-0 me-3">
        <i class="bi bi-flag-fill fs-4 ${milestone.status === 'completed' ? 'text-success' : milestone.status === 'in_progress' ? 'text-primary' : 'text-secondary'}"></i>
      </div>
      <div class="flex-grow-1">
        <div class="fw-600 mb-1">${escapeHtml(milestone.title)}</div>
        <div class="text-muted small mb-1">${escapeHtml(milestone.description)}</div>
        <div class="small">
          <i class="bi bi-calendar me-1"></i>
          <span class="${new Date(milestone.due_date) < new Date() ? 'text-danger' : 'text-muted'}">
            Due: ${formatDate(milestone.due_date)}
          </span>
        </div>
      </div>
    </div>
  `).join('');
}

/**
 * Populate team preview in overview section
 */
async function populateTeamPreview() {
  const container = document.getElementById('teamPreview');
  if (!container) return;
  
  let teamMembers = [];
  if (isDemo) {
    teamMembers = await demoServices.teamMembers.getByProject(currentProject.id);
  }
  
  if (teamMembers.length === 0) {
    container.innerHTML = `
      <div class="empty-state-sm text-center py-4">
        <i class="bi bi-people text-muted fs-2 opacity-25"></i>
        <p class="text-muted small mb-0 mt-2">No team members yet</p>
      </div>
    `;
    return;
  }
  
  // Show max 4 team members in preview
  const previewMembers = teamMembers.slice(0, 4);
  const remainingCount = Math.max(0, teamMembers.length - 4);
  
  container.innerHTML = `
    ${previewMembers.map(member => `
      <div class="d-flex align-items-center mb-3">
        <div class="avatar-circle me-2 bg-primary text-white">
          ${member.avatar_url ? `<img src="${member.avatar_url}" alt="${member.name}" class="w-100 h-100 rounded-circle">` : `<i class="bi bi-person-fill"></i>`}
        </div>
        <div class="flex-grow-1">
          <div class="fw-500 small">${escapeHtml(member.name)}</div>
          <div class="text-muted" style="font-size: 0.75rem;">${escapeHtml(member.role)}</div>
        </div>
      </div>
    `).join('')}
    ${remainingCount > 0 ? `
      <div class="text-center mt-2">
        <small class="text-muted">+${remainingCount} more member${remainingCount > 1 ? 's' : ''}</small>
      </div>
    ` : ''}
  `;
}

/**
 * Format status text
 */
function formatStatus(status) {
  return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
}

/**
 * Format currency amount
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0
  }).format(amount);
}

/**
 * Setup tab navigation
 */
function setupTabs() {
  const tabButtons = document.querySelectorAll('[data-bs-toggle="tab"]');
  tabButtons.forEach(button => {
    button.addEventListener('shown.bs.tab', async (e) => {
      const targetTab = e.target.getAttribute('data-bs-target').replace('#', '').replace('-tab', '');
      currentTab = targetTab;
      await loadTabContent(targetTab);
    });
  });
}

/**
 * Load content for specific tab
 */
async function loadTabContent(tab) {
  switch(tab) {
    case 'overview':
      await loadOverviewTab();
      break;
    case 'tasks':
      await loadTasksTab();
      break;
    case 'files':
      await loadFilesTab();
      break;
    case 'timeline':
      renderGanttChart();
      break;
    case 'activity':
      await loadActivityTab();
      break;
  }
}

/**
 * Load Overview Tab - Project description and task summary
 */
async function loadOverviewTab() {
  const container = document.getElementById('overviewContent');
  if (!container) return;
  
  // Load tasks for stats
  if (isDemo) {
    const tasksData = await demoServices.tasks.getByProject(currentProject.id);
    // Convert object format to flat array
    projectTasks = [...tasksData.todo, ...tasksData.in_progress, ...tasksData.done];
  } else {
    projectTasks = await fetchRealTasks(currentProject.id);
  }
  
  const taskStats = {
    total: projectTasks.length,
    todo: projectTasks.filter(t => t.status === 'todo').length,
    inProgress: projectTasks.filter(t => t.status === 'in_progress').length,
    done: projectTasks.filter(t => t.status === 'done').length
  };
  
  container.innerHTML = `
    <div class="row">
      <div class="col-lg-8">
        <div class="card mb-4">
          <div class="card-header">
            <h5 class="mb-0"><i class="bi bi-info-circle me-2"></i>Project Description</h5>
          </div>
          <div class="card-body">
            <p class="mb-0">${escapeHtml(currentProject.description)}</p>
          </div>
        </div>
        
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0"><i class="bi bi-list-task me-2"></i>Task Summary</h5>
          </div>
          <div class="card-body">
            <div class="row g-3">
              <div class="col-6 col-md-3">
                <div class="text-center p-3 bg-light rounded">
                  <div class="fs-2 fw-bold text-primary">${taskStats.total}</div>
                  <div class="text-muted small">Total Tasks</div>
                </div>
              </div>
              <div class="col-6 col-md-3">
                <div class="text-center p-3 bg-light rounded">
                  <div class="fs-2 fw-bold text-secondary">${taskStats.todo}</div>
                  <div class="text-muted small">To Do</div>
                </div>
              </div>
              <div class="col-6 col-md-3">
                <div class="text-center p-3 bg-light rounded">
                  <div class="fs-2 fw-bold text-warning">${taskStats.inProgress}</div>
                  <div class="text-muted small">In Progress</div>
                </div>
              </div>
              <div class="col-6 col-md-3">
                <div class="text-center p-3 bg-light rounded">
                  <div class="fs-2 fw-bold text-success">${taskStats.done}</div>
                  <div class="text-muted small">Completed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-lg-4">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0"><i class="bi bi-info-square me-2"></i>Project Details</h5>
          </div>
          <div class="card-body">
            <div class="mb-3">
              <small class="text-muted d-block mb-1">Project Type</small>
              <span class="badge badge-primary">${escapeHtml(currentProject.project_type)}</span>
            </div>
            <div class="mb-3">
              <small class="text-muted d-block mb-1">Status</small>
              <span class="badge badge-status-${currentProject.status}">${formatStatus(currentProject.status)}</span>
            </div>
            <div class="mb-3">
              <small class="text-muted d-block mb-1">Visibility</small>
              <span class="badge badge-secondary">
                <i class="bi bi-${currentProject.visibility === 'public' ? 'globe' : 'lock'}"></i>
                ${currentProject.visibility === 'public' ? 'Public' : 'Private'}
              </span>
            </div>
            ${currentProject.budget ? `
              <div class="mb-3">
                <small class="text-muted d-block mb-1">Budget</small>
                <strong>${formatCurrency(currentProject.budget)}</strong>
              </div>
            ` : ''}
            ${currentProject.funding_source ? `
              <div class="mb-3">
                <small class="text-muted d-block mb-1">Funding Source</small>
                <div>${escapeHtml(currentProject.funding_source)}</div>
              </div>
            ` : ''}
            <div class="mb-3">
              <small class="text-muted d-block mb-1">Created</small>
              <div>${formatDate(currentProject.created_at)}</div>
            </div>
            <div class="mb-0">
              <small class="text-muted d-block mb-1">Last Updated</small>
              <div>${getRelativeTime(currentProject.updated_at)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Load Tasks Tab - Kanban Board view
 */
async function loadTasksTab() {
  try {
    // Load tasks data
    if (isDemo) {
      const tasksData = await demoServices.tasks.getByProject(currentProject.id);
      // Convert object format {todo: [], in_progress: [], done: []} to flat array
      projectTasks = [...tasksData.todo, ...tasksData.in_progress, ...tasksData.done];
    } else {
      projectTasks = await fetchRealTasks(currentProject.id);
    }
    
    // Render initial kanban board
    renderKanbanBoard();
    
    // Update count badges in the tab
    updateTaskCounts();
    
    // Setup toggle buttons
    setupTaskViewToggle();
    
  } catch (error) {
    console.error('Failed to load tasks:', error);
    showError('Failed to load tasks');
  }
}

/**
 * Render Kanban Board
 */
function renderKanbanBoard() {
  const todoTasks = projectTasks.filter(t => t.status === 'todo');
  const inProgressTasks = projectTasks.filter(t => t.status === 'in_progress');
  const doneTasks = projectTasks.filter(t => t.status === 'done');
  
  // Update column counts
  const todoCountEl = document.getElementById('todoCount');
  const inProgressCountEl = document.getElementById('inProgressCount');
  const doneCountEl = document.getElementById('doneCount');
  
  if (todoCountEl) todoCountEl.textContent = todoTasks.length;
  if (inProgressCountEl) inProgressCountEl.textContent = inProgressTasks.length;
  if (doneCountEl) doneCountEl.textContent = doneTasks.length;
  
  // Render task cards
  renderTaskColumn('todoColumn', 'todoEmpty', todoTasks);
  renderTaskColumn('inProgressColumn', 'inProgressEmpty', inProgressTasks);
  renderTaskColumn('doneColumn', 'doneEmpty', doneTasks);
}

/**
 * Render task cards in a column
 */
function renderTaskColumn(columnId, emptyId, tasks) {
  const column = document.getElementById(columnId);
  const emptyState = document.getElementById(emptyId);
  
  if (!column) return;
  
  if (tasks.length === 0) {
    column.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
  } else {
    if (emptyState) emptyState.style.display = 'none';
    column.innerHTML = tasks.map(task => renderTaskCard(task)).join('');
  }
}

/**
 * Render List View
 */
function renderListView() {
  const tableBody = document.getElementById('tasksTableBody');
  if (!tableBody) return;
  
  if (projectTasks.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted py-4">
          <i class="bi bi-inbox fs-2 opacity-25 d-block mb-2"></i>
          No tasks yet
        </td>
      </tr>
    `;
    return;
  }
  
  // Sample team member names to assign
  const teamMembers = [
    'Demo User',
    'Sarah Johnson',
    'Michael Chen',
    'Emma Rodriguez',
    'David Kumar',
    'Lisa Anderson'
  ];
  
  tableBody.innerHTML = projectTasks.map((task, index) => {
    const priorityBadge = getPriorityBadge(task.priority);
    const statusBadge = getStatusBadge(task.status);
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
    
    // Assign a team member based on task index
    const assignedMember = teamMembers[index % teamMembers.length];
    
    return `
      <tr>
        <td>
          <input type="checkbox" class="form-check-input" ${task.status === 'done' ? 'checked' : ''}>
        </td>
        <td>
          <div class="task-title">${escapeHtml(task.title)}</div>
          ${task.description ? `<small class="text-muted">${escapeHtml(task.description)}</small>` : ''}
        </td>
        <td>${priorityBadge}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="d-flex align-items-center">
            <div class="avatar-circle avatar-sm bg-primary text-white me-2" style="width: 28px; height: 28px; font-size: 0.7rem;">
              <i class="bi bi-person-fill"></i>
            </div>
            <span>${assignedMember}</span>
          </div>
        </td>
        <td>
          ${task.due_date ? `
            <span class="${isOverdue ? 'text-danger' : 'text-muted'}">
              ${formatDate(task.due_date)}
              ${isOverdue ? '<i class="bi bi-exclamation-circle ms-1"></i>' : ''}
            </span>
          ` : '<span class="text-muted">-</span>'}
        </td>
        <td>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" onclick="changeTaskStatus('${task.id}', '${getNextStatus(task.status)}')" title="Move to ${getNextStatus(task.status)}">
              <i class="bi bi-arrow-right"></i>
            </button>
            <button class="btn btn-outline-danger" onclick="deleteTask('${task.id}')" title="Delete task">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Setup task view toggle (Board vs List)
 */
function setupTaskViewToggle() {
  const viewBoardBtn = document.getElementById('viewBoard');
  const viewListBtn = document.getElementById('viewList');
  const kanbanBoard = document.getElementById('kanbanBoard');
  const listView = document.getElementById('listView');
  
  if (!viewBoardBtn || !viewListBtn || !kanbanBoard || !listView) return;
  
  viewBoardBtn.addEventListener('click', () => {
    // Show board, hide list
    kanbanBoard.style.display = 'block';
    listView.style.display = 'none';
    
    // Update button states
    viewBoardBtn.classList.add('active');
    viewListBtn.classList.remove('active');
    
    // Render board
    renderKanbanBoard();
  });
  
  viewListBtn.addEventListener('click', () => {
    // Show list, hide board
    kanbanBoard.style.display = 'none';
    listView.style.display = 'block';
    
    // Update button states
    viewListBtn.classList.add('active');
    viewBoardBtn.classList.remove('active');
    
    // Render list
    renderListView();
  });
}

/**
 * Update task count badges
 */
function updateTaskCounts() {
  const tasksCountEl = document.getElementById('tasksCount');
  if (tasksCountEl) {
    tasksCountEl.textContent = projectTasks.length;
  }
}

/**
 * Render individual task card for Kanban board
 */
function renderTaskCard(task) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  
  return `
    <div class="task-card" data-task-id="${task.id}">
      <div class="d-flex justify-content-between align-items-start mb-2">
        <h6 class="mb-0 flex-grow-1">${escapeHtml(task.title)}</h6>
        <span class="badge-priority-${task.priority} ms-2">${task.priority}</span>
      </div>
      ${task.description ? `<p class="task-description mb-2">${escapeHtml(task.description)}</p>` : ''}
      ${task.due_date ? `
        <div class="task-meta mb-0">
          <i class="bi bi-calendar3"></i>
          <span class="${isOverdue ? 'text-danger fw-600' : ''}">
            ${formatDate(task.due_date)}
          </span>
          ${isOverdue ? '<span class="badge-danger ms-2">Overdue</span>' : ''}
        </div>
      ` : ''}
      <div class="task-actions">
        <button class="btn btn-sm btn-outline-primary" onclick="changeTaskStatus('${task.id}', '${getNextStatus(task.status)}')" title="Move to next status">
          <i class="bi bi-arrow-right"></i> Move
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteTask('${task.id}')" title="Delete task">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    </div>
  `;
}

/**
 * Get next status in task workflow
 */
function getNextStatus(currentStatus) {
  const flow = { todo: 'in_progress', in_progress: 'done', done: 'todo' };
  return flow[currentStatus];
}

/**
 * Change task status (move to next column)
 */
window.changeTaskStatus = async function(taskId, newStatus) {
  try {
    if (isDemo) {
      await demoServices.tasks.update(taskId, { status: newStatus });
    } else {
      await updateRealTaskStatus(taskId, newStatus);
    }
    
    showSuccess('Task status updated');
    await loadTasksTab();
    
  } catch (error) {
    console.error('Failed to update task:', error);
    showError('Failed to update task status');
  }
};

/**
 * Delete task with confirmation
 */
window.deleteTask = async function(taskId) {
  const confirmed = await confirm('Delete this task?', 'This cannot be undone');
  if (!confirmed) return;
  
  try {
    if (isDemo) {
      await demoServices.tasks.delete(taskId);
    } else {
      await deleteRealTask(taskId);
    }
    
    showSuccess('Task deleted');
    await loadTasksTab();
    
  } catch (error) {
    console.error('Failed to delete task:', error);
    showError('Failed to delete task');
  }
};

/**
 * Load Files Tab - Project file management
 */
async function loadFilesTab() {
  const loadingEl = document.getElementById('filesLoading');
  const emptyEl = document.getElementById('filesEmpty');

  try {
    if (loadingEl) loadingEl.style.display = 'block';
    if (emptyEl) emptyEl.style.display = 'none';

    if (isDemo) {
      projectFiles = await demoServices.files.getByProject(currentProject.id);
      projectFiles = ensureDemoSampleFiles(projectFiles);
    } else {
      projectFiles = await fetchRealFiles(currentProject.id);
    }

    renderFilesTab();
    updateFilesCount();
    updateStorageUsage();
  } catch (error) {
    console.error('Failed to load files:', error);
    showError('Failed to load files');
  } finally {
    if (loadingEl) loadingEl.style.display = 'none';
  }
}

function ensureDemoSampleFiles(files) {
  if (!isDemo) return files;
  if (files && files.length >= 3) return files;

  const existing = files || [];
  const existingNames = new Set(existing.map(f => (f.file_name || '').toLowerCase()));
  const fallback = DEMO_FALLBACK_FILES
    .filter(f => !existingNames.has((f.file_name || '').toLowerCase()))
    .map(f => ({
      ...f,
      project_id: currentProject.id,
      uploaded_by: currentUser?.id || 'demo-user-123'
    }));

  return [...existing, ...fallback];
}

function updateFilesCount() {
  const filesCountEl = document.getElementById('filesCount');
  if (filesCountEl) {
    filesCountEl.textContent = projectFiles.length;
  }
}

function updateStorageUsage() {
  const totalBytes = projectFiles.reduce((sum, file) => sum + (Number(file.file_size) || 0), 0);
  const maxBytes = 50 * 1024 * 1024 * 1024; // 50 GB
  const usedMB = (totalBytes / (1024 * 1024)).toFixed(1);
  const rawPercent = Math.min(100, (totalBytes / maxBytes) * 100);
  const visualPercent = rawPercent > 0 ? Math.max(rawPercent, 2) : 0;

  const storageUsedEl = document.getElementById('storageUsed');
  const storageProgressEl = document.getElementById('storageProgress');

  if (storageUsedEl) storageUsedEl.textContent = `${usedMB} MB / 50 GB`;
  if (storageProgressEl) {
    storageProgressEl.style.width = `${visualPercent}%`;
    storageProgressEl.setAttribute('aria-valuenow', rawPercent.toFixed(2));
    storageProgressEl.setAttribute('title', `${rawPercent.toFixed(2)}% used`);
  }
}

function getFilteredFiles() {
  let filtered = [...projectFiles];

  if (filesFilterState.category) {
    filtered = filtered.filter(file => file.category === filesFilterState.category);
  }

  if (filesFilterState.search) {
    const q = filesFilterState.search.toLowerCase();
    filtered = filtered.filter(file =>
      (file.file_name || '').toLowerCase().includes(q) ||
      (file.caption || '').toLowerCase().includes(q)
    );
  }

  switch (filesFilterState.sort) {
    case 'oldest':
      filtered.sort((a, b) => new Date(a.uploaded_at) - new Date(b.uploaded_at));
      break;
    case 'name':
      filtered.sort((a, b) => (a.file_name || '').localeCompare(b.file_name || ''));
      break;
    case 'size':
      filtered.sort((a, b) => (b.file_size || 0) - (a.file_size || 0));
      break;
    case 'newest':
    default:
      filtered.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
      break;
  }

  return filtered;
}

function renderFilesTab() {
  const files = getFilteredFiles();
  const gridEl = document.getElementById('filesGrid');
  const tableWrapEl = document.getElementById('filesTable');
  const tableBodyEl = document.getElementById('filesTableBody');
  const emptyEl = document.getElementById('filesEmpty');

  if (!gridEl || !tableWrapEl || !tableBodyEl || !emptyEl) return;

  if (files.length === 0) {
    emptyEl.style.display = 'block';
    gridEl.innerHTML = '';
    tableBodyEl.innerHTML = '';
  } else {
    emptyEl.style.display = 'none';
    gridEl.innerHTML = files.map(file => renderFileCard(file)).join('');
    tableBodyEl.innerHTML = files.map(file => renderFileTableRow(file)).join('');
  }

  if (filesViewMode === 'grid') {
    gridEl.style.display = 'flex';
    tableWrapEl.style.display = 'none';
  } else {
    gridEl.style.display = 'none';
    tableWrapEl.style.display = 'block';
  }
}

function renderFileCard(file) {
  const icon = getFileIcon(file.file_type, file.category);
  const uploaded = file.uploaded_at ? formatDate(file.uploaded_at) : '-';

  return `
    <div class="col-md-6 col-lg-4">
      <div class="card h-100">
        <div class="card-body d-flex flex-column">
          <div class="d-flex align-items-start justify-content-between mb-2">
            <div class="d-flex align-items-center gap-2">
              <i class="bi ${icon} fs-4 text-primary"></i>
              <div class="fw-600 text-break">${escapeHtml(file.file_name || 'Untitled')}</div>
            </div>
          </div>
          <div class="small text-muted mb-2">${escapeHtml(file.caption || 'No description')}</div>
          <div class="small text-muted mb-3">${formatFileSize(file.file_size)} • ${uploaded}</div>
          <div class="mt-auto d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary" onclick="downloadProjectFile('${file.id}')">
              <i class="bi bi-download me-1"></i>Download
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteProjectFileAction('${file.id}')">
              <i class="bi bi-trash me-1"></i>Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderFileTableRow(file) {
  return `
    <tr>
      <td><i class="bi ${getFileIcon(file.file_type, file.category)} fs-5 text-primary"></i></td>
      <td class="fw-500">${escapeHtml(file.file_name || 'Untitled')}</td>
      <td>${escapeHtml(file.category || 'other')}</td>
      <td>${formatFileSize(file.file_size)}</td>
      <td>${file.uploaded_at ? formatDate(file.uploaded_at) : '-'}</td>
      <td>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-primary" onclick="downloadProjectFile('${file.id}')" title="Download">
            <i class="bi bi-download"></i>
          </button>
          <button class="btn btn-outline-danger" onclick="deleteProjectFileAction('${file.id}')" title="Delete">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `;
}

function getFileIcon(fileType = '', category = '') {
  if (category === 'image' || fileType.startsWith('image/')) return 'bi-file-earmark-image';
  if (fileType.includes('pdf')) return 'bi-file-earmark-pdf';
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return 'bi-file-earmark-spreadsheet';
  if (fileType.includes('word') || fileType.includes('document')) return 'bi-file-earmark-word';
  if (category === 'report') return 'bi-file-earmark-bar-graph';
  if (category === 'deliverable') return 'bi-file-earmark-check';
  return 'bi-file-earmark';
}

function formatFileSize(bytes = 0) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = Number(bytes) || 0;
  let unitIdx = 0;
  while (size >= 1024 && unitIdx < units.length - 1) {
    size /= 1024;
    unitIdx += 1;
  }
  return `${size.toFixed(size >= 10 || unitIdx === 0 ? 0 : 1)} ${units[unitIdx]}`;
}

function inferCategory(file) {
  if (!file) return 'other';
  const type = file.type || '';
  const name = (file.name || '').toLowerCase();
  if (type.startsWith('image/')) return 'image';
  if (name.includes('report')) return 'report';
  if (name.includes('deliverable') || name.includes('proposal')) return 'deliverable';
  if (type.includes('pdf') || type.includes('word') || type.includes('document') || type.includes('text')) return 'document';
  return 'other';
}

async function uploadFilesFromList(fileList) {
  if (!fileList || fileList.length === 0) return;

  const progressWrap = document.getElementById('filesUploadProgress');
  const progressBar = document.getElementById('filesUploadProgressBar');
  const progressText = document.getElementById('uploadProgressText');
  const filesListText = document.getElementById('uploadFilesList');

  if (progressWrap) progressWrap.style.display = 'block';

  let successCount = 0;
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const percent = Math.round(((i + 1) / fileList.length) * 100);
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (progressText) progressText.textContent = `${percent}%`;
    if (filesListText) filesListText.textContent = `Uploading: ${file.name}`;

    try {
      const category = inferCategory(file);
      if (isDemo) {
        await demoServices.files.upload(file, currentProject.id, category);
      } else {
        const { uploadProjectFile } = await import('../services/storageService.js');
        const result = await uploadProjectFile(file, currentProject.id, category);
        if (!result.success) {
          throw new Error(result.error || 'Upload failed');
        }
      }
      successCount += 1;
    } catch (error) {
      console.error('File upload failed:', error);
    }
  }

  if (progressWrap) {
    setTimeout(() => {
      progressWrap.style.display = 'none';
      if (progressBar) progressBar.style.width = '0%';
      if (progressText) progressText.textContent = '0%';
      if (filesListText) filesListText.textContent = '';
    }, 400);
  }

  await loadFilesTab();
  if (successCount > 0) {
    showSuccess(`${successCount} file${successCount > 1 ? 's' : ''} uploaded successfully`);
  } else {
    showError('No files were uploaded');
  }
}

function setupFilesEventListeners() {
  if (filesListenersInitialized) return;
  filesListenersInitialized = true;

  const viewGridBtn = document.getElementById('viewGrid');
  const viewTableBtn = document.getElementById('viewTable');
  const filterBtn = document.getElementById('filterFiles');
  const uploadBtn = document.getElementById('uploadFileBtn');
  const uploadFirstBtn = document.getElementById('uploadFirstFile');
  const uploadArea = document.getElementById('uploadArea');
  const browseBtn = document.getElementById('browseFiles');
  const fileInput = document.getElementById('filesTabInput');
  const filterType = document.getElementById('filterFileType');
  const sortSelect = document.getElementById('sortFiles');
  const searchInput = document.getElementById('searchFiles');
  const filtersCollapseEl = document.getElementById('fileFilters');

  viewGridBtn?.addEventListener('click', () => {
    filesViewMode = 'grid';
    viewGridBtn.classList.add('active');
    viewTableBtn?.classList.remove('active');
    renderFilesTab();
  });

  viewTableBtn?.addEventListener('click', () => {
    filesViewMode = 'table';
    viewTableBtn.classList.add('active');
    viewGridBtn?.classList.remove('active');
    renderFilesTab();
  });

  filterBtn?.addEventListener('click', () => {
    if (!filtersCollapseEl) return;
    const collapse = bootstrap.Collapse.getOrCreateInstance(filtersCollapseEl);
    collapse.toggle();
  });

  uploadBtn?.addEventListener('click', () => {
    if (!uploadArea) return;
    uploadArea.style.display = uploadArea.style.display === 'none' ? 'block' : 'none';
  });

  uploadFirstBtn?.addEventListener('click', () => {
    if (uploadArea) uploadArea.style.display = 'block';
    fileInput?.click();
  });

  browseBtn?.addEventListener('click', () => fileInput?.click());

  fileInput?.addEventListener('change', async (e) => {
    const files = e.target.files;
    await uploadFilesFromList(files);
    e.target.value = '';
  });

  filterType?.addEventListener('change', (e) => {
    filesFilterState.category = e.target.value;
    renderFilesTab();
  });

  sortSelect?.addEventListener('change', (e) => {
    filesFilterState.sort = e.target.value;
    renderFilesTab();
  });

  searchInput?.addEventListener('input', (e) => {
    filesFilterState.search = e.target.value.trim();
    renderFilesTab();
  });

  if (uploadArea) {
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', async (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      const files = e.dataTransfer?.files;
      await uploadFilesFromList(files);
    });
  }
}

window.downloadProjectFile = function(fileId) {
  const file = projectFiles.find(f => f.id === fileId);
  if (!file) return;

  if (file.file_url && file.file_url !== '#') {
    window.open(file.file_url, '_blank', 'noopener');
    return;
  }

  // Demo fallback download
  const content = `Sample file: ${file.file_name}\n\n${file.caption || 'Project file preview for demo mode.'}`;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.file_name || 'sample-file.txt';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

window.deleteProjectFileAction = async function(fileId) {
  const confirmed = await confirm('Delete this file?', 'This action cannot be undone.');
  if (!confirmed) return;

  try {
    if (isDemo) {
      const result = await demoServices.files.delete(fileId);
      if (!result.success) throw new Error('Delete failed');
    } else {
      const { deleteProjectFile } = await import('../services/storageService.js');
      const result = await deleteProjectFile(fileId);
      if (!result.success) throw new Error(result.error || 'Delete failed');
    }

    showSuccess('File deleted successfully');
    await loadFilesTab();
  } catch (error) {
    console.error('Delete file error:', error);
    showError('Failed to delete file');
  }
};

/**
 * Load Activity Tab - Project activity timeline
 */
async function loadActivityTab() {
  const container = document.getElementById('activityContent');
  if (!container) return;
  
  if (isDemo) {
    projectActivity = await demoServices.activity.getByProject(currentProject.id);
  } else {
    projectActivity = await fetchRealActivity(currentProject.id);
  }
  
  if (projectActivity.length === 0) {
    container.innerHTML = `
      <div class="empty-state py-5">
        <i class="bi bi-clock-history empty-state-icon"></i>
        <h5 class="empty-state-title">No Activity Yet</h5>
        <p class="empty-state-description">Project activity will appear here</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="activity-timeline">
      ${projectActivity.map(activity => `
        <div class="activity-item">
          <div class="activity-icon">
            <i class="bi bi-${getActivityIcon(activity.activity_type)}"></i>
          </div>
          <div class="activity-content">
            <p class="mb-1">${escapeHtml(activity.activity_text)}</p>
            <small class="text-muted">${getRelativeTime(activity.created_at)}</small>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Get icon for activity type
 */
function getActivityIcon(type) {
  const icons = {
    task_completed: 'check-circle-fill text-success',
    task_created: 'plus-circle text-primary',
    task_updated: 'arrow-repeat text-info',
    file_uploaded: 'file-earmark-arrow-up text-warning',
    project_updated: 'pencil-square text-primary',
    milestone: 'flag-fill text-success'
  };
  return icons[type] || 'circle';
}

/**
 * Setup event listeners for buttons
 */
function setupEventListeners() {
  // Edit button
  const editBtn = document.getElementById('editProjectBtn');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      window.location.href = `./project-form.html?id=${currentProject.id}${isDemo ? '&demo=true' : ''}`;
    });
  }
  
  // Delete button
  const deleteBtn = document.getElementById('deleteProjectBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      const confirmed = await confirm(
        'Delete this project?',
        'This will delete all tasks, files, and activity. This cannot be undone.'
      );
      
      if (confirmed) {
        try {
          if (isDemo) {
            await demoServices.projects.delete(currentProject.id);
          } else {
            await deleteRealProject(currentProject.id);
          }
          
          showSuccess('Project deleted');
          setTimeout(() => {
            window.location.href = `./projects.html${isDemo ? '?demo=true' : ''}`;
          }, 1500);
          
        } catch (error) {
          console.error('Failed to delete project:', error);
          showError('Failed to delete project');
        }
      }
    });
  }
  
  // Add Task button
  const addTaskBtn = document.getElementById('addTaskBtn');
  if (addTaskBtn) {
    addTaskBtn.addEventListener('click', () => {
      showAddTaskModal();
    });
  }
  
  // Add Task form submission
  const addTaskForm = document.getElementById('addTaskForm');
  if (addTaskForm) {
    addTaskForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleAddTask();
    });
  }

  // Files tab controls
  setupFilesEventListeners();
}

/**
 * Show add task modal
 */
function showAddTaskModal() {
  const modal = new bootstrap.Modal(document.getElementById('addTaskModal'));
  
  // Reset form
  const form = document.getElementById('addTaskForm');
  if (form) {
    form.reset();
    form.classList.remove('was-validated');
  }
  
  // Set default due date to one week from now
  const dueDateInput = document.getElementById('taskDueDate');
  if (dueDateInput) {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    dueDateInput.value = nextWeek.toISOString().split('T')[0];
  }
  
  modal.show();
}

/**
 * Handle add task form submission
 */
async function handleAddTask() {
  const form = document.getElementById('addTaskForm');
  
  // Validate form
  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    return;
  }
  
  // Get form values
  const title = document.getElementById('taskTitle').value.trim();
  const description = document.getElementById('taskDescription').value.trim();
  const priority = document.getElementById('taskPriority').value;
  const status = document.getElementById('taskStatus').value;
  const dueDate = document.getElementById('taskDueDate').value;
  
  // Create task object
  const newTask = {
    id: 'task-new-' + Date.now(),
    project_id: currentProject.id,
    title,
    description,
    status,
    priority,
    due_date: dueDate || null,
    assigned_to: currentUser.id,
    created_at: new Date().toISOString()
  };
  
  try {
    showLoading('Adding task...');
    
    if (isDemo) {
      // Add to demo data
      projectTasks.push(newTask);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
    } else {
      // Add to real database
      const { createTask } = await import('../services/taskService.js');
      await createTask(newTask);
      projectTasks.push(newTask);
    }
    
    hideLoading();
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('addTaskModal'));
    modal.hide();
    
    // Show success message
    showSuccess('Task added successfully!');
    
    // Refresh task board
    await loadTasksTab();
    
  } catch (error) {
    hideLoading();
    console.error('Failed to add task:', error);
    showError('Failed to add task. Please try again.');
  }
}

/**
 * Show add task modal (legacy function for backward compatibility)
 */
window.showAddTaskModal = showAddTaskModal;

/**
 * Render Gantt Chart
 */
function renderGanttChart() {
  const container = document.getElementById('ganttChart');
  const emptyState = document.getElementById('ganttEmpty');
  
  if (!container) return;
  
  // Filter tasks with due dates
  const tasksWithDates = projectTasks.filter(task => task.due_date);
  
  if (tasksWithDates.length === 0) {
    container.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  
  // Sort tasks by due date
  tasksWithDates.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  
  // Calculate date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dates = tasksWithDates.map(t => new Date(t.due_date));
  const minDate = new Date(Math.min(today, ...dates));
  const maxDate = new Date(Math.max(...dates));
  
  // Add minimal padding to date range
  minDate.setDate(minDate.getDate() - 1);
  maxDate.setDate(maxDate.getDate() + 1);
  
  // Limit to maximum 30 days to prevent horizontal scroll
  const daysDiff = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
  if (daysDiff > 30) {
    // Show only 30 days from today
    const limitedMinDate = new Date(today);
    limitedMinDate.setDate(today.getDate() - 2);
    const limitedMaxDate = new Date(today);
    limitedMaxDate.setDate(today.getDate() + 28);
    minDate.setTime(limitedMinDate.getTime());
    maxDate.setTime(limitedMaxDate.getTime());
  }
  
  // Generate date array
  const dateArray = [];
  const currentDate = new Date(minDate);
  while (currentDate <= maxDate) {
    dateArray.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Build Gantt chart HTML
  let html = `
    <div class="gantt-header">
      <div class="gantt-task-labels">Task</div>
      <div class="gantt-timeline-header">
        ${dateArray.map(date => {
          const isToday = date.toDateString() === today.toDateString();
          return `
            <div class="gantt-day ${isToday ? 'today' : ''}">
              <span class="gantt-day-label">${date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
              <span class="gantt-date-label">${date.getDate()}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
  
  // Build task rows
  tasksWithDates.forEach(task => {
    const dueDate = new Date(task.due_date);
    dueDate.setHours(0, 0, 0, 0);
    
    // Skip tasks outside the visible range
    if (dueDate < minDate || dueDate > maxDate) {
      return;
    }
    
    // Calculate position and width
    const startIndex = Math.max(0, Math.floor((dueDate - minDate) / (1000 * 60 * 60 * 24)));
    const barWidthPercent = (100 / dateArray.length);
    const leftPercent = startIndex * barWidthPercent;
    
    const statusBadge = getStatusBadge(task.status);
    const priorityBadge = getPriorityBadge(task.priority);
    
    html += `
      <div class="gantt-row">
        <div class="gantt-task-label">
          <div class="gantt-task-title">${escapeHtml(task.title)}</div>
          <div class="gantt-task-status">${statusBadge} ${priorityBadge}</div>
        </div>
        <div class="gantt-timeline">
          ${dateArray.map((date, index) => {
            const isToday = date.toDateString() === today.toDateString();
            return `<div class="gantt-day-cell ${isToday ? 'today' : ''}"></div>`;
          }).join('')}
          <div class="gantt-bar status-${task.status} priority-${task.priority}" 
               style="left: ${leftPercent}%; width: ${barWidthPercent - 0.5}%;"
               title="${escapeHtml(task.title)} - Due: ${formatDate(task.due_date)}">
            ${task.title.length > 10 ? task.title.substring(0, 8) + '...' : task.title}
          </div>
        </div>
      </div>
    `;
  });
  
  // Add legend
  html += `
    <div class="gantt-legend">
      <div class="gantt-legend-item">
        <span class="gantt-legend-color" style="background: linear-gradient(135deg, #6c757d 0%, #495057 100%);"></span>
        <span>To Do</span>
      </div>
      <div class="gantt-legend-item">
        <span class="gantt-legend-color" style="background: linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%);"></span>
        <span>In Progress</span>
      </div>
      <div class="gantt-legend-item">
        <span class="gantt-legend-color" style="background: linear-gradient(135deg, #198754 0%, #146c43 100%);"></span>
        <span>Done</span>
      </div>
      <div class="gantt-legend-item" style="margin-left: 20px;">
        <span style="color: #dc3545; font-weight: 600;">▌</span>
        <span>High Priority</span>
      </div>
      <div class="gantt-legend-item">
        <span style="color: #ffc107; font-weight: 600;">▌</span>
        <span>Medium Priority</span>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

/**
 * Get status badge HTML
 */
function getStatusBadge(status) {
  const statusMap = {
    'todo': '<span class="badge bg-secondary">To Do</span>',
    'in_progress': '<span class="badge bg-primary">In Progress</span>',
    'done': '<span class="badge bg-success">Done</span>'
  };
  return statusMap[status] || status;
}

/**
 * Get priority badge HTML
 */
function getPriorityBadge(priority) {
  const priorityMap = {
    'low': '<span class="badge bg-secondary">Low</span>',
    'medium': '<span class="badge bg-warning text-dark">Medium</span>',
    'high': '<span class="badge bg-danger">High</span>'
  };
  return priorityMap[priority] || priority;
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', initProjectDetails);

export { initProjectDetails };
