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
  const typeEl = document.getElementById('projectType');
  const statusEl = document.getElementById('projectStatus');
  const progressBar = document.getElementById('projectProgressBar');
  const progressText = document.getElementById('projectProgressText');
  const startDateEl = document.getElementById('projectStartDate');
  const endDateEl = document.getElementById('projectEndDate');
  const budgetEl = document.getElementById('projectBudget');
  const fundingEl = document.getElementById('projectFunding');
  
  if (titleEl) titleEl.textContent = currentProject.title;
  
  if (typeEl) {
    typeEl.innerHTML = `<span class="badge badge-primary">${currentProject.project_type}</span>`;
  }
  
  if (statusEl) {
    statusEl.innerHTML = `<span class="badge badge-status-${currentProject.status}">${formatStatus(currentProject.status)}</span>`;
  }
  
  if (progressBar && progressText) {
    progressBar.style.width = currentProject.progress_percentage + '%';
    progressText.textContent = currentProject.progress_percentage + '%';
  }
  
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
    projectTasks = await demoServices.tasks.getByProject(currentProject.id);
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
  const container = document.getElementById('tasksContent');
  if (!container) return;
  
  if (isDemo) {
    projectTasks = await demoServices.tasks.getByProject(currentProject.id);
  } else {
    projectTasks = await fetchRealTasks(currentProject.id);
  }
  
  const todoTasks = projectTasks.filter(t => t.status === 'todo');
  const inProgressTasks = projectTasks.filter(t => t.status === 'in_progress');
  const doneTasks = projectTasks.filter(t => t.status === 'done');
  
  container.innerHTML = `
    <div class="mb-4 d-flex justify-content-between align-items-center">
      <h5 class="mb-0">Task Board</h5>
      <button class="btn btn-primary" onclick="showAddTaskModal()">
        <i class="bi bi-plus-circle me-2"></i>Add Task
      </button>
    </div>
    
    <div class="row g-4">
      <!-- To Do Column -->
      <div class="col-lg-4">
        <div class="kanban-column">
          <div class="kanban-header bg-secondary">
            <h6 class="mb-0 text-white">
              <i class="bi bi-circle me-2"></i>To Do
              <span class="badge bg-white text-secondary ms-2">${todoTasks.length}</span>
            </h6>
          </div>
          <div class="kanban-body">
            ${todoTasks.length === 0 ? '<p class="text-muted text-center py-4">No tasks</p>' : ''}
            ${todoTasks.map(task => renderTaskCard(task)).join('')}
          </div>
        </div>
      </div>
      
      <!-- In Progress Column -->
      <div class="col-lg-4">
        <div class="kanban-column">
          <div class="kanban-header bg-warning">
            <h6 class="mb-0 text-dark">
              <i class="bi bi-arrow-repeat me-2"></i>In Progress
              <span class="badge bg-dark ms-2">${inProgressTasks.length}</span>
            </h6>
          </div>
          <div class="kanban-body">
            ${inProgressTasks.length === 0 ? '<p class="text-muted text-center py-4">No tasks</p>' : ''}
            ${inProgressTasks.map(task => renderTaskCard(task)).join('')}
          </div>
        </div>
      </div>
      
      <!-- Done Column -->
      <div class="col-lg-4">
        <div class="kanban-column">
          <div class="kanban-header bg-success">
            <h6 class="mb-0 text-white">
              <i class="bi bi-check-circle me-2"></i>Done
              <span class="badge bg-white text-success ms-2">${doneTasks.length}</span>
            </h6>
          </div>
          <div class="kanban-body">
            ${doneTasks.length === 0 ? '<p class="text-muted text-center py-4">No tasks</p>' : ''}
            ${doneTasks.map(task => renderTaskCard(task)).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render individual task card for Kanban board
 */
function renderTaskCard(task) {
  const priorityColors = {
    low: 'success',
    medium: 'warning',
    high: 'danger'
  };
  
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  
  return `
    <div class="task-card mb-3" data-task-id="${task.id}">
      <div class="d-flex justify-content-between align-items-start mb-2">
        <h6 class="mb-0">${escapeHtml(task.title)}</h6>
        <span class="badge badge-priority-${task.priority}">${task.priority}</span>
      </div>
      ${task.description ? `<p class="text-muted small mb-2">${escapeHtml(task.description)}</p>` : ''}
      ${task.due_date ? `
        <div class="small ${isOverdue ? 'text-danger' : 'text-muted'}">
          <i class="bi bi-calendar me-1"></i>
          ${formatDate(task.due_date)}
          ${isOverdue ? '<span class="badge badge-danger ms-2">Overdue</span>' : ''}
        </div>
      ` : ''}
      <div class="mt-2">
        <button class="btn btn-sm btn-outline-primary" onclick="changeTaskStatus('${task.id}', '${getNextStatus(task.status)}')">
          <i class="bi bi-arrow-right"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteTask('${task.id}')">
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
      await demoServices.tasks.updateStatus(taskId, newStatus);
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
  const container = document.getElementById('filesContent');
  if (!container) return;
  
  container.innerHTML = `
    <div class="mb-4 d-flex justify-content-between align-items-center">
      <h5 class="mb-0">Project Files</h5>
      <button class="btn btn-primary" onclick="alert('File upload in demo mode')">
        <i class="bi bi-upload me-2"></i>Upload File
      </button>
    </div>
    
    <div class="empty-state py-5">
      <div class="empty-state-icon">
        <i class="bi bi-file-earmark" style="font-size: 3rem; color: var(--text-tertiary);"></i>
      </div>
      <h5 class="empty-state-title">No Files Yet</h5>
      <p class="empty-state-description">Upload documents, images, or other files related to this project</p>
    </div>
  `;
}

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
}

/**
 * Show add task modal (placeholder for demo)
 */
window.showAddTaskModal = function() {
  alert('Add task functionality - Demo Mode');
};

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
