/**
 * Project Details Page Script
 * Handles project data loading, task management, file uploads, and timeline updates
 */

import { checkAuth, getCurrentUser, logout, autoDemoLogin, isDemoSession } from './auth.js';
import { getProjectById, updateProject, deleteProject } from '../services/projectService.js';
import { getTasksByProject, createTask, updateTask, deleteTask, toggleTaskStatus, getTaskStats, isOverdue } from '../services/taskService.js';
import { uploadProjectFile, getFilesByProject, deleteProjectFile, formatFileSize, getFileIcon } from '../services/storageService.js';
import { supabase } from '../services/supabase.js';
import { formatDate, formatDateTime, getRelativeTime, truncateText } from '../utils/helpers.js';
import { showLoading, hideLoading, showButtonLoading, hideButtonLoading, showSuccess, showError, confirm, prompt, alert, showFieldError, clearFieldError, closeCurrentModal } from '../utils/ui.js';

// Global state
let currentUser = null;
let currentProject = null;
let projectId = null;
let currentEditingTask = null;
const loadedTabs = new Set();

// DOM Elements
const editBtn = document.getElementById('editBtn');
const deleteBtn = document.getElementById('deleteBtn');
const addTaskBtn = document.getElementById('addTaskBtn');
const uploadFileBtn = document.getElementById('uploadFileBtn');
const addUpdateBtn = document.getElementById('addUpdateBtn');
const taskModal = new bootstrap.Modal(document.getElementById('taskModal'));
const uploadModal = new bootstrap.Modal(document.getElementById('uploadModal'));
const updateModal = new bootstrap.Modal(document.getElementById('updateModal'));
const userAvatarNav = document.getElementById('userAvatarNav');
const userNameNav = document.getElementById('userNameNav');
const logoutBtn = document.getElementById('logoutBtn');

/**
 * Initialize project details page
 */
async function initProjectDetails() {
  try {
    // Handle demo mode URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('demo') === 'true' && !isDemoSession()) {
      autoDemoLogin();
      // Clean up URL - keep project id but remove demo param
      const projectParam = urlParams.get('id') ? `?id=${urlParams.get('id')}` : '';
      window.history.replaceState({}, '', window.location.pathname + projectParam);
    }

    // Show demo banner if in demo session
    showDemoBanner();

    showLoading('Loading project...');

    // Check authentication
    currentUser = await checkAuth();
    updateUserInfo(currentUser);

    // Get project ID from URL
    projectId = getProjectIdFromURL();
    if (!projectId) {
      showError('No project ID provided');
      setTimeout(() => {
        window.location.href = 'projects.html';
      }, 2000);
      return;
    }

    // Load project data
    await loadProjectData(projectId);

    // Setup event listeners
    setupEventListeners();

    // Setup tab listeners
    setupTabListeners();
    
    // Setup file event listeners
    setupFileEventListeners();

    hideLoading();
  } catch (error) {
    console.error('Error initializing project details:', error);
    hideLoading();
    showError(error.message || 'Failed to load project');
  }
}

/**
 * Load project data and populate hero section
 */
async function loadProjectData(id) {
  try {
    const project = await getProjectById(id);
    if (!project) {
      throw new Error('Project not found');
    }

    currentProject = project;

    // Update breadcrumb and title
    document.getElementById('breadcrumbTitle').textContent = project.title;
    document.getElementById('projectTitle').textContent = project.title;

    // Update cover image
    if (project.cover_image_url) {
      document.getElementById('projectCover').style.backgroundImage = `url('${project.cover_image_url}')`;
    }

    // Update badges
    document.getElementById('projectType').textContent = project.type;
    document.getElementById('projectType').className = `badge bg-primary`;
    document.getElementById('projectStatus').textContent = capitalizeText(project.status);
    document.getElementById('projectStatus').className = `badge ${getStatusBadgeColor(project.status)}`;

    // Update metadata
    document.getElementById('startDate').textContent = formatDate(project.start_date) || '-';
    document.getElementById('endDate').textContent = formatDate(project.end_date) || '-';

    // Budget and Funding
    if (project.budget) {
      document.getElementById('budget').textContent = `$${project.budget.toLocaleString()}`;
      document.getElementById('budgetSection').style.display = 'block';
    } else {
      document.getElementById('budgetSection').style.display = 'none';
    }

    if (project.funding_source) {
      document.getElementById('fundingSource').textContent = project.funding_source;
      document.getElementById('fundingSourceSection').style.display = 'block';
    } else {
      document.getElementById('fundingSourceSection').style.display = 'none';
    }

    // Update progress
    const progress = project.progress || 0;
    document.getElementById('overallProgress').style.width = `${progress}%`;
    document.getElementById('progressPercentage').textContent = `${progress}%`;

    // Check user permissions
    checkUserPermissions(project, currentUser);

    // Load overview tab by default
    await loadOverviewTab();
  } catch (error) {
    console.error('Error loading project:', error);
    throw error;
  }
}

/**
 * Load overview tab content
 */
async function loadOverviewTab() {
  try {
    // Description
    const description = currentProject.description || 'No description provided';
    document.getElementById('projectDescription').textContent = description;

    // Details
    document.getElementById('projectVisibility').textContent = currentProject.is_public ? 'Public' : 'Private';
    document.getElementById('projectCreated').textContent = formatDateTime(currentProject.created_at);
    document.getElementById('projectUpdated').textContent = formatDateTime(currentProject.updated_at);
    document.getElementById('projectOwner').textContent = currentProject.owner?.full_name || 'Unknown';

    // Task Summary
    const taskStats = await getTaskStats(projectId);
    document.getElementById('totalTasksBadge').textContent = taskStats.total;
    document.getElementById('todoCountBadge').textContent = taskStats.todo;
    document.getElementById('inProgressCountBadge').textContent = taskStats.in_progress;
    document.getElementById('doneCountBadge').textContent = taskStats.done;
    document.getElementById('taskProgressBar').style.width = `${taskStats.completionRate}%`;
    document.getElementById('taskCompletionText').textContent = `${taskStats.completionRate}% Complete`;

    // Quick Stats
    const files = await getFilesByProject(projectId);
    document.getElementById('totalFilesBadge').textContent = files.length;

    // Latest Activity
    const { data: updates } = await supabase
      .from('project_updates')
      .select('created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (updates && updates.length > 0) {
      document.getElementById('latestActivity').textContent = getRelativeTime(updates[0].created_at);
    } else {
      document.getElementById('latestActivity').textContent = 'No activity';
    }

    loadedTabs.add('overview');
  } catch (error) {
    console.error('Error loading overview tab:', error);
    showError('Failed to load overview');
  }
}

// Task board state
let allTasks = [];
let filteredTasks = [];
let currentView = 'board'; // 'board' or 'list'
let draggedTask = null;

/**
 * Load tasks tab content
 */
async function loadTasksTab() {
  try {
    showTasksLoading();
    
    const tasks = await getTasksByProject(projectId);
    allTasks = [
      ...(tasks.todo || []),
      ...(tasks.in_progress || []),
      ...(tasks.done || [])
    ];
    filteredTasks = [...allTasks];
    
    if (allTasks.length === 0) {
      hideTasksLoading();
      showTasksEmpty();
      return;
    }
    
    renderKanbanBoard(tasks);
    setupDragAndDrop();
    updateTaskCounts(tasks);
    hideTasksLoading();
    
    loadedTabs.add('tasks');
  } catch (error) {
    console.error('Error loading tasks tab:', error);
    hideTasksLoading();
    showError('Failed to load tasks');
  }
}

// Render Kanban board
function renderKanbanBoard(tasks) {
  const todoColumn = document.getElementById('todoColumn');
  const inProgressColumn = document.getElementById('inProgressColumn');
  const doneColumn = document.getElementById('doneColumn');
  
  if (!todoColumn || !inProgressColumn || !doneColumn) return;
  
  // Clear columns
  todoColumn.innerHTML = '';
  inProgressColumn.innerHTML = '';
  doneColumn.innerHTML = '';
  
  // Render tasks in each column
  renderTasksInColumn(tasks.todo || [], todoColumn, 'todo');
  renderTasksInColumn(tasks.in_progress || [], inProgressColumn, 'in_progress');
  renderTasksInColumn(tasks.done || [], doneColumn, 'done');
  
  // Show/hide empty states
  toggleEmptyState('todo', (tasks.todo || []).length === 0);
  toggleEmptyState('inProgress', (tasks.in_progress || []).length === 0);
  toggleEmptyState('done', (tasks.done || []).length === 0);
}

// Render tasks in a specific column
function renderTasksInColumn(tasks, container, status) {
  if (tasks.length === 0) {
    return;
  }
  
  tasks.forEach((task, index) => {
    const taskCard = createTaskCard(task, status);
    container.appendChild(taskCard);
    
    // Add fade-in animation
    setTimeout(() => {
      taskCard.classList.add('fade-in-up');
    }, index * 50);
  });
}

// Create task card element
function createTaskCard(task, status) {
  const card = document.createElement('div');
  card.className = `task-card ${task.status === 'done' ? 'completed' : ''}`;
  card.draggable = true;
  card.dataset.taskId = task.id;
  card.dataset.status = status;
  
  const priorityClass = task.priority || 'medium';
  const isOverdueTask = isOverdue(task.due_date) && task.status !== 'done';
  
  card.innerHTML = `
    <div class="task-card-header">
      <input type="checkbox" class="task-checkbox" ${task.status === 'done' ? 'checked' : ''} 
             data-task-id="${task.id}">
      <div class="task-actions">
        <button class="task-action-btn" data-edit-task="${task.id}" title="Edit">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="task-action-btn" data-delete-task="${task.id}" title="Delete">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    </div>
    
    <div class="task-title">${escapeHtml(task.title)}</div>
    
    ${task.description ? `<div class="task-description">${escapeHtml(truncateText(task.description, 100))}</div>` : ''}
    
    <div class="task-meta">
      <span class="task-priority ${priorityClass}">
        <i class="bi bi-flag-fill"></i>
        ${capitalizeText(priorityClass)}
      </span>
      
      ${task.due_date ? `
        <span class="task-due-date ${isOverdueTask ? 'overdue' : ''}">
          <i class="bi bi-calendar-event"></i>
          ${formatDate(task.due_date)}
        </span>
      ` : ''}
    </div>
  `;
  
  // Add event listeners
  const checkbox = card.querySelector('.task-checkbox');
  checkbox.addEventListener('change', (e) => {
    const taskId = e.target.dataset.taskId;
    const isCompleted = e.target.checked;
    handleTaskComplete(taskId, isCompleted);
  });
  
  const editBtn = card.querySelector('[data-edit-task]');
  if (editBtn) {
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const taskId = e.currentTarget.dataset.editTask;
      const task = findTaskById(taskId);
      if (task) showTaskModal(task);
    });
  }
  
  const deleteBtn = card.querySelector('[data-delete-task]');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const taskId = e.currentTarget.dataset.deleteTask;
      handleDeleteTask(taskId);
    });
  }
  
  return card;
}

// Setup drag and drop
function setupDragAndDrop() {
  const taskCards = document.querySelectorAll('.task-card');
  const columns = document.querySelectorAll('.kanban-column-body');
  
  // Task card drag events
  taskCards.forEach(card => {
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
  });
  
  // Column drop events
  columns.forEach(column => {
    column.addEventListener('dragover', handleDragOver);
    column.addEventListener('dragenter', handleDragEnter);
    column.addEventListener('dragleave', handleDragLeave);
    column.addEventListener('drop', handleDrop);
  });
}

// Drag event handlers
function handleDragStart(e) {
  draggedTask = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  
  // Remove drag-over class from all columns
  document.querySelectorAll('.kanban-column-body').forEach(col => {
    col.classList.remove('drag-over');
  });
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDragEnter(e) {
  this.classList.add('drag-over');
}

function handleDragLeave(e) {
  if (e.target === this) {
    this.classList.remove('drag-over');
  }
}

async function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  
  this.classList.remove('drag-over');
  
  if (draggedTask) {
    const taskId = draggedTask.dataset.taskId;
    const oldStatus = draggedTask.dataset.status;
    const newStatus = this.dataset.column;
    
    if (oldStatus !== newStatus) {
      try {
        // Update task status in database
        await toggleTaskStatus(taskId, newStatus);
        
        // Move card to new column
        this.appendChild(draggedTask);
        draggedTask.dataset.status = newStatus;
        
        // Update task counts
        await refreshTaskBoard();
        
        // Show success message
        showSuccess(`Task moved to ${newStatus.replace('_', ' ')}`);
        
        // Add completion effect if moved to done
        if (newStatus === 'done') {
          draggedTask.classList.add('completed');
          const checkbox = draggedTask.querySelector('.task-checkbox');
          if (checkbox) checkbox.checked = true;
          
          // Confetti effect
          celebrateTaskCompletion();
        } else {
          draggedTask.classList.remove('completed');
          const checkbox = draggedTask.querySelector('.task-checkbox');
          if (checkbox) checkbox.checked = false;
        }
        
      } catch (error) {
        console.error('Error updating task status:', error);
        showError('Failed to update task status');
      }
    }
  }
  
  return false;
}

// Handle task completion via checkbox
async function handleTaskComplete(taskId, isCompleted) {
  try {
    const newStatus = isCompleted ? 'done' : 'todo';
    await toggleTaskStatus(taskId, newStatus);
    
    // Refresh board
    await refreshTaskBoard();
    
    if (isCompleted) {
      showSuccess('Task completed! 🎉');
      celebrateTaskCompletion();
    } else {
      showSuccess('Task reopened');
    }
    
  } catch (error) {
    console.error('Error completing task:', error);
    showError('Failed to update task');
  }
}

// Celebration effect for task completion
function celebrateTaskCompletion() {
  // Simple confetti effect using emojis
  const emojis = ['🎉', '✨', '🎊', '⭐', '🌟'];
  const container = document.body;
  
  for (let i = 0; i < 20; i++) {
    const emoji = document.createElement('div');
    emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    emoji.style.position = 'fixed';
    emoji.style.left = Math.random() * window.innerWidth + 'px';
    emoji.style.top = '-50px';
    emoji.style.fontSize = '24px';
    emoji.style.zIndex = '9999';
    emoji.style.pointerEvents = 'none';
    emoji.style.animation = `fall 3s linear forwards`;
    
    container.appendChild(emoji);
    
    setTimeout(() => emoji.remove(), 3000);
  }
}

// Add CSS for confetti animation (only once)
if (!document.getElementById('confetti-style')) {
  const style = document.createElement('style');
  style.id = 'confetti-style';
  style.textContent = `
    @keyframes fall {
      to {
        top: 100vh;
        transform: translateX(${Math.random() * 200 - 100}px) rotate(${Math.random() * 360}deg);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

// Update task counts
function updateTaskCounts(tasks) {
  const todoCount = document.getElementById('todoCount');
  const inProgressCount = document.getElementById('inProgressCount');
  const doneCount = document.getElementById('doneCount');
  
  if (todoCount) todoCount.textContent = (tasks.todo || []).length;
  if (inProgressCount) inProgressCount.textContent = (tasks.in_progress || []).length;
  if (doneCount) doneCount.textContent = (tasks.done || []).length;
}

// Toggle empty state
function toggleEmptyState(column, show) {
  const emptyElement = document.getElementById(`${column}Empty`);
  if (emptyElement) {
    emptyElement.style.display = show ? 'block' : 'none';
  }
}

// Refresh task board
async function refreshTaskBoard() {
  const tasks = await getTasksByProject(projectId);
  allTasks = [
    ...(tasks.todo || []),
    ...(tasks.in_progress || []),
    ...(tasks.done || [])
  ];
  renderKanbanBoard(tasks);
  setupDragAndDrop();
  updateTaskCounts(tasks);
}

// Loading/empty state helpers
function showTasksLoading() {
  const loading = document.getElementById('tasksLoading');
  const board = document.getElementById('kanbanBoard');
  const empty = document.getElementById('tasksEmpty');
  
  if (loading) loading.style.display = 'block';
  if (board) board.style.display = 'none';
  if (empty) empty.style.display = 'none';
}

function hideTasksLoading() {
  const loading = document.getElementById('tasksLoading');
  const board = document.getElementById('kanbanBoard');
  
  if (loading) loading.style.display = 'none';
  if (board) board.style.display = 'block';
}

function showTasksEmpty() {
  const empty = document.getElementById('tasksEmpty');
  const board = document.getElementById('kanbanBoard');
  
  if (board) board.style.display = 'none';
  if (empty) empty.style.display = 'block';
}

/**
 * Render tasks in a kanban column (Legacy - kept for compatibility)
 */
function renderTasksColumn(columnId, emptyId, countId, tasks) {
  // Legacy function - now handled by renderKanbanBoard
}

/**
 * Render single task card HTML (Legacy)
 */
function renderTaskCard(task) {
  const isOverdueTask = isOverdue(task.due_date) && task.status !== 'done';
  const dueDateBadgeColor = isOverdueTask ? 'bg-danger' : 'bg-secondary';
  const priorityColor = {
    'low': 'bg-info',
    'medium': 'bg-warning',
    'high': 'bg-danger'
  }[task.priority] || 'bg-secondary';

  return `
    <div class="d-flex align-items-start gap-2 mb-2">
      <input type="checkbox" class="task-checkbox" data-task-id="${task.id}" ${task.status === 'done' ? 'checked' : ''}>
      <div style="flex: 1;">
        <div class="task-title${task.status === 'done' ? ' text-decoration-line-through text-muted' : ''}">${escapeHtml(task.title)}</div>
        ${task.description ? `<div class="task-description">${escapeHtml(truncateText(task.description, 80))}</div>` : ''}
        <div class="task-meta">
          <span class="badge ${priorityColor}" style="font-size: 0.75rem;">${capitalizeText(task.priority)}</span>
          ${task.due_date ? `<span class="badge ${dueDateBadgeColor}" style="font-size: 0.75rem;"><i class="bi bi-calendar me-1"></i>${formatDate(task.due_date)}</span>` : ''}
        </div>
        <div class="task-actions">
          <button class="btn btn-sm btn-outline-secondary edit-task" data-task-id="${task.id}" title="Edit">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger delete-task" data-task-id="${task.id}" title="Delete">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Attach event listeners to task elements (Legacy)
 */
function attachTaskEventListeners() {
  // Checkboxes for status change
  document.querySelectorAll('.task-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const taskId = e.target.dataset.taskId;
      const newStatus = e.target.checked ? 'done' : 'todo';
      handleTaskStatusChange(taskId, newStatus);
    });
  });

  // Edit buttons
  document.querySelectorAll('.edit-task').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const taskId = e.currentTarget.dataset.taskId;
      const task = findTaskById(taskId);
      if (task) {
        showTaskModal(task);
      }
    });
  });

  // Delete buttons
  document.querySelectorAll('.delete-task').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const taskId = e.currentTarget.dataset.taskId;
      handleDeleteTask(taskId);
    });
  });
}

/**
 * Handle task status change
 */
async function handleTaskStatusChange(taskId, newStatus) {
  try {
    await toggleTaskStatus(taskId, newStatus);
    showSuccess('Task updated');
    await loadTasksTab();
  } catch (error) {
    console.error('Error updating task status:', error);
    showError('Failed to update task');
  }
}

/**
 * Show task modal for creating or editing
 */
function showTaskModal(task = null) {
  currentEditingTask = task;

  const modalLabel = document.getElementById('taskModalLabel');
  const titleInput = document.getElementById('taskTitle');
  const descInput = document.getElementById('taskDescription');
  const statusSelect = document.getElementById('taskStatus');
  const prioritySelect = document.getElementById('taskPriority');
  const dueDateInput = document.getElementById('taskDueDate');

  if (task) {
    modalLabel.textContent = 'Edit Task';
    titleInput.value = task.title;
    descInput.value = task.description || '';
    statusSelect.value = task.status;
    prioritySelect.value = task.priority;
    dueDateInput.value = task.due_date ? task.due_date.split('T')[0] : '';
  } else {
    modalLabel.textContent = 'Add Task';
    titleInput.value = '';
    descInput.value = '';
    statusSelect.value = 'todo';
    prioritySelect.value = 'medium';
    dueDateInput.value = '';
    clearFieldError(titleInput);
  }

  taskModal.show();
}

/**
 * Handle task form submission
 */
async function handleTaskSubmit(event) {
  event.preventDefault();

  try {
    const titleInput = document.getElementById('taskTitle');
    const title = titleInput.value.trim();

    if (!title) {
      showFieldError(titleInput, 'Title is required');
      return;
    }

    clearFieldError(titleInput);

    const formData = {
      title: title,
      description: document.getElementById('taskDescription').value.trim(),
      status: document.getElementById('taskStatus').value,
      priority: document.getElementById('taskPriority').value,
      due_date: document.getElementById('taskDueDate').value || null
    };

    showButtonLoading(document.getElementById('taskSubmitBtn'), 'Saving...');

    if (currentEditingTask) {
      // Update existing task
      await updateTask(currentEditingTask.id, formData);
      showSuccess('Task updated');
    } else {
      // Create new task
      formData.project_id = projectId;
      await createTask(formData);
      showSuccess('Task created');
    }

    taskModal.hide();
    document.getElementById('taskForm').reset();
    await loadTasksTab();
  } catch (error) {
    console.error('Error saving task:', error);
    showError(error.message || 'Failed to save task');
  } finally {
    hideButtonLoading(document.getElementById('taskSubmitBtn'));
  }
}

/**
 * Handle task deletion
 */
async function handleDeleteTask(taskId) {
  try {
    const confirmed = await new Promise((resolve) => {
      confirm(
        'Are you sure you want to delete this task? This action cannot be undone.',
        () => resolve(true),
        () => resolve(false)
      );
    });

    if (!confirmed) return;

    await deleteTask(taskId);
    showSuccess('Task deleted');
    await loadTasksTab();
  } catch (error) {
    console.error('Error deleting task:', error);
    showError('Failed to delete task');
  }
}

// ==================== FILE MANAGEMENT ====================

// File upload state
let uploadedFiles = [];
let currentFileView = 'grid'; // 'grid' or 'table'

/**
 * Load files tab content
 */
async function loadFilesTab() {
  try {
    showFilesLoading();
    
    const files = await getFilesByProject(projectId);
    uploadedFiles = files;
    
    if (files.length === 0) {
      hideFilesLoading();
      showFilesEmpty();
      return;
    }
    
    renderFilesGrid(files);
    updateStorageUsage(files);
    hideFilesLoading();
    
    loadedTabs.add('files');
  } catch (error) {
    console.error('Error loading files:', error);
    hideFilesLoading();
    showError('Failed to load files');
  }
}

/**
 * Setup drag & drop upload
 */
function setupFileUpload() {
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');
  const browseBtn = document.getElementById('browseFiles');
  const uploadBtn = document.getElementById('uploadFileBtn');
  const uploadFirstBtn = document.getElementById('uploadFirstFile');
  
  // Show upload area when button clicked
  uploadBtn?.addEventListener('click', () => {
    uploadArea.style.display = 'block';
    uploadArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  
  uploadFirstBtn?.addEventListener('click', () => {
    uploadArea.style.display = 'block';
    uploadArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  
  // Browse files button
  browseBtn?.addEventListener('click', () => {
    fileInput.click();
  });
  
  // Click anywhere in upload area to browse
  uploadArea?.addEventListener('click', (e) => {
    if (e.target === uploadArea || e.target.closest('.upload-area-inner')) {
      fileInput.click();
    }
  });
  
  // File input change
  fileInput?.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });
  
  // Drag and drop events
  uploadArea?.addEventListener('dragenter', handleDragEnter);
  uploadArea?.addEventListener('dragover', handleDragOver);
  uploadArea?.addEventListener('dragleave', handleDragLeave);
  uploadArea?.addEventListener('drop', handleFileDrop);
  
  // Prevent default drag behavior on document
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.body.addEventListener(eventName, preventDefaults, false);
  });
}

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

function handleDragEnter(e) {
  preventDefaults(e);
  this.classList.add('drag-over');
}

function handleDragOver(e) {
  preventDefaults(e);
  this.classList.add('drag-over');
}

function handleDragLeave(e) {
  preventDefaults(e);
  if (e.target === this) {
    this.classList.remove('drag-over');
  }
}

function handleFileDrop(e) {
  preventDefaults(e);
  this.classList.remove('drag-over');
  
  const dt = e.dataTransfer;
  const files = dt.files;
  
  handleFiles(files);
}

/**
 * Handle selected files
 */
async function handleFiles(files) {
  const fileArray = Array.from(files);
  
  // Validate files
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  const validFiles = [];
  const invalidFiles = [];
  
  fileArray.forEach(file => {
    if (file.size > maxSize) {
      invalidFiles.push({ name: file.name, reason: 'File too large (max 10MB)' });
    } else if (!allowedTypes.includes(file.type)) {
      invalidFiles.push({ name: file.name, reason: 'File type not supported' });
    } else {
      validFiles.push(file);
    }
  });
  
  // Show errors for invalid files
  if (invalidFiles.length > 0) {
    const errorMsg = invalidFiles.map(f => `${f.name}: ${f.reason}`).join('\n');
    showError(`Some files were rejected:\n${errorMsg}`);
  }
  
  // Upload valid files
  if (validFiles.length > 0) {
    await uploadFiles(validFiles);
  }
}

/**
 * Upload files to server
 */
async function uploadFiles(files) {
  try {
    // Hide upload area, show progress
    document.getElementById('uploadArea').style.display = 'none';
    document.getElementById('uploadProgress').style.display = 'block';
    
    const uploadFilesList = document.getElementById('uploadFilesList');
    uploadFilesList.innerHTML = `Uploading ${files.length} file(s)...`;
    
    let totalUploaded = 0;
    const uploadedFileData = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Update progress
      const progress = Math.round(((i + 1) / files.length) * 100);
      document.getElementById('uploadProgressBar').style.width = `${progress}%`;
      document.getElementById('uploadProgressText').textContent = `${progress}%`;
      uploadFilesList.innerHTML = `Uploading ${file.name} (${i + 1}/${files.length})`;
      
      // Simulate upload delay in demo mode
      if (isDemoSession()) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Upload file
      const fileData = await uploadProjectFile(file, projectId, 'document');
      uploadedFileData.push(fileData);
      totalUploaded++;
    }
    
    // Hide progress, show success
    setTimeout(() => {
      document.getElementById('uploadProgress').style.display = 'none';
      showSuccess(`${totalUploaded} file(s) uploaded successfully!`);
      
      // Reload files
      loadFilesTab();
    }, 500);
    
  } catch (error) {
    console.error('Error uploading files:', error);
    document.getElementById('uploadProgress').style.display = 'none';
    showError('Failed to upload files');
  }
}

/**
 * Render files in grid view
 */
function renderFilesGrid(files) {
  const grid = document.getElementById('filesGrid');
  if (!grid) return;
  
  grid.innerHTML = files.map((file, index) => {
    const fileExt = getFileExtension(file.file_name);
    const fileIcon = getFileIcon(fileExt);
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt.toLowerCase());
    
    return `
      <div class="col-lg-3 col-md-4 col-sm-6 fade-in-up" style="animation-delay: ${index * 0.05}s;">
        <div class="file-card" onclick="previewFile('${file.id}')">
          <div class="file-preview">
            ${isImage && file.file_url 
              ? `<img src="${file.file_url}" alt="${escapeHtml(file.file_name)}">`
              : `<i class="bi bi-${fileIcon} file-icon ${fileExt}"></i>`
            }
            <span class="file-type-badge">${fileExt.toUpperCase()}</span>
          </div>
          <div class="file-body">
            <div class="file-name" title="${escapeHtml(file.file_name)}">${escapeHtml(file.file_name)}</div>
            <div class="file-meta">
              <span class="file-size">${formatFileSize(file.file_size)}</span>
              <span class="file-date">${formatDate(file.uploaded_at)}</span>
            </div>
            ${file.category ? `
              <div class="mt-2">
                <span class="badge badge-sm bg-secondary">${escapeHtml(file.category)}</span>
              </div>
            ` : ''}
            <div class="file-actions">
              <button class="file-action-btn" onclick="event.stopPropagation(); downloadFile('${file.id}', '${escapeHtml(file.file_name)}')">
                <i class="bi bi-download"></i> Download
              </button>
              <button class="file-action-btn danger" onclick="event.stopPropagation(); deleteFile('${file.id}', '${escapeHtml(file.file_name)}')">
                <i class="bi bi-trash"></i> Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Render files in table view
 */
function renderFilesTable(files) {
  const tbody = document.getElementById('filesTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = files.map(file => {
    const fileExt = getFileExtension(file.file_name);
    const fileIcon = getFileIcon(fileExt);
    
    return `
      <tr onclick="previewFile('${file.id}')" style="cursor: pointer;">
        <td><i class="bi bi-${fileIcon} text-primary fs-4"></i></td>
        <td>
          <div class="fw-500">${escapeHtml(file.file_name)}</div>
          ${file.category ? `<small class="text-muted">${escapeHtml(file.category)}</small>` : ''}
        </td>
        <td><span class="badge bg-secondary">${fileExt.toUpperCase()}</span></td>
        <td>${formatFileSize(file.file_size)}</td>
        <td>${formatDate(file.uploaded_at)}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" 
                  onclick="event.stopPropagation(); downloadFile('${file.id}', '${escapeHtml(file.file_name)}')">
            <i class="bi bi-download"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" 
                  onclick="event.stopPropagation(); deleteFile('${file.id}', '${escapeHtml(file.file_name)}')">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Preview file
 */
function previewFile(fileId) {
  const file = uploadedFiles.find(f => f.id === fileId);
  if (!file) return;
  
  const fileExt = getFileExtension(file.file_name);
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt.toLowerCase());
  const isPDF = fileExt.toLowerCase() === 'pdf';
  
  const modal = new bootstrap.Modal(document.getElementById('filePreviewModal'));
  const title = document.getElementById('filePreviewTitle');
  const body = document.getElementById('filePreviewBody');
  const downloadBtn = document.getElementById('downloadPreviewFile');
  
  title.textContent = file.file_name;
  
  if (isImage && file.file_url) {
    body.innerHTML = `<img src="${file.file_url}" alt="${escapeHtml(file.file_name)}" style="max-width: 100%; max-height: 70vh; border-radius: 8px;">`;
  } else if (isPDF && file.file_url) {
    body.innerHTML = `<iframe src="${file.file_url}" style="width: 100%; height: 70vh; border: none; border-radius: 8px;"></iframe>`;
  } else {
    body.innerHTML = `
      <div class="py-5">
        <i class="bi bi-file-earmark text-muted" style="font-size: 5rem; opacity: 0.3;"></i>
        <p class="text-muted mt-3">Preview not available for this file type</p>
        <p class="small text-muted">${escapeHtml(file.file_name)}</p>
      </div>
    `;
  }
  
  downloadBtn.onclick = () => downloadFile(fileId, file.file_name);
  
  modal.show();
}

/**
 * Download file
 */
async function downloadFile(fileId, fileName) {
  try {
    showSuccess(`Downloading ${fileName}...`);
    
    // In demo mode, just simulate download
    if (isDemoSession()) {
      setTimeout(() => {
        showSuccess(`${fileName} downloaded!`);
      }, 1000);
      return;
    }
    
    // Real mode: get file URL and trigger download
    const file = uploadedFiles.find(f => f.id === fileId);
    if (file && file.file_url) {
      const a = document.createElement('a');
      a.href = file.file_url;
      a.download = fileName;
      a.click();
    }
    
  } catch (error) {
    console.error('Error downloading file:', error);
    showError('Failed to download file');
  }
}

/**
 * Delete file
 */
async function deleteFile(fileId, fileName) {
  const confirmed = await confirm(`Delete "${fileName}"?`, 'This action cannot be undone.');
  
  if (confirmed) {
    try {
      await deleteProjectFile(fileId);
      showSuccess(`${fileName} deleted`);
      loadFilesTab();
    } catch (error) {
      console.error('Error deleting file:', error);
      showError('Failed to delete file');
    }
  }
}

/**
 * Update storage usage
 */
function updateStorageUsage(files) {
  const totalSize = files.reduce((sum, file) => sum + (file.file_size || 0), 0);
  const maxSize = 50 * 1024 * 1024 * 1024; // 50GB
  const percentage = (totalSize / maxSize) * 100;
  
  const storageUsedEl = document.getElementById('storageUsed');
  const storageProgressEl = document.getElementById('storageProgress');
  
  if (storageUsedEl) {
    storageUsedEl.textContent = `${formatFileSize(totalSize)} / ${formatFileSize(maxSize)}`;
  }
  
  if (storageProgressEl) {
    storageProgressEl.style.width = `${percentage}%`;
    
    // Change color based on usage
    if (percentage > 90) {
      storageProgressEl.classList.add('bg-danger');
    } else if (percentage > 70) {
      storageProgressEl.classList.add('bg-warning');
    } else {
      storageProgressEl.classList.remove('bg-danger', 'bg-warning');
    }
  }
}

/**
 * Get file extension
 */
function getFileExtension(filename) {
  return filename.split('.').pop() || '';
}

/**
 * Get file icon
 */
function getFileIcon(extension) {
  const icons = {
    pdf: 'file-earmark-pdf',
    doc: 'file-earmark-word',
    docx: 'file-earmark-word',
    xls: 'file-earmark-excel',
    xlsx: 'file-earmark-excel',
    ppt: 'file-earmark-ppt',
    pptx: 'file-earmark-ppt',
    jpg: 'file-earmark-image',
    jpeg: 'file-earmark-image',
    png: 'file-earmark-image',
    gif: 'file-earmark-image',
    webp: 'file-earmark-image',
    zip: 'file-earmark-zip',
    txt: 'file-earmark-text',
    default: 'file-earmark'
  };
  
  return icons[extension.toLowerCase()] || icons.default;
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Apply file filters
 */
function applyFileFilters() {
  const fileType = document.getElementById('filterFileType')?.value;
  const sortBy = document.getElementById('sortFiles')?.value;
  const search = document.getElementById('searchFiles')?.value.toLowerCase();
  
  let filtered = [...uploadedFiles];
  
  // Filter by type
  if (fileType) {
    filtered = filtered.filter(f => f.category === fileType);
  }
  
  // Filter by search
  if (search) {
    filtered = filtered.filter(f => 
      f.file_name.toLowerCase().includes(search)
    );
  }
  
  // Sort
  if (sortBy === 'newest') {
    filtered.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
  } else if (sortBy === 'oldest') {
    filtered.sort((a, b) => new Date(a.uploaded_at) - new Date(b.uploaded_at));
  } else if (sortBy === 'name') {
    filtered.sort((a, b) => a.file_name.localeCompare(b.file_name));
  } else if (sortBy === 'size') {
    filtered.sort((a, b) => (b.file_size || 0) - (a.file_size || 0));
  }
  
  if (currentFileView === 'grid') {
    renderFilesGrid(filtered);
  } else {
    renderFilesTable(filtered);
  }
}

/**
 * Show files loading
 */
function showFilesLoading() {
  const loading = document.getElementById('filesLoading');
  const grid = document.getElementById('filesGrid');
  const table = document.getElementById('filesTable');
  const empty = document.getElementById('filesEmpty');
  
  if (loading) loading.style.display = 'block';
  if (grid) grid.style.display = 'none';
  if (table) table.style.display = 'none';
  if (empty) empty.style.display = 'none';
}

/**
 * Hide files loading
 */
function hideFilesLoading() {
  const loading = document.getElementById('filesLoading');
  const grid = document.getElementById('filesGrid');
  
  if (loading) loading.style.display = 'none';
  if (grid) grid.style.display = 'flex';
}

/**
 * Show files empty state
 */
function showFilesEmpty() {
  const empty = document.getElementById('filesEmpty');
  const grid = document.getElementById('filesGrid');
  const table = document.getElementById('filesTable');
  
  if (grid) grid.style.display = 'none';
  if (table) table.style.display = 'none';
  if (empty) empty.style.display = 'block';
}

/**
 * Setup file event listeners
 */
function setupFileEventListeners() {
  // View toggle
  document.getElementById('viewGrid')?.addEventListener('click', function() {
    currentFileView = 'grid';
    document.getElementById('filesGrid').style.display = 'flex';
    document.getElementById('filesTable').style.display = 'none';
    this.classList.add('active');
    document.getElementById('viewTable').classList.remove('active');
  });

  document.getElementById('viewTable')?.addEventListener('click', function() {
    currentFileView = 'table';
    document.getElementById('filesGrid').style.display = 'none';
    document.getElementById('filesTable').style.display = 'block';
    this.classList.add('active');
    document.getElementById('viewGrid').classList.remove('active');
    renderFilesTable(uploadedFiles);
  });

  // Filter toggle
  document.getElementById('filterFiles')?.addEventListener('click', function() {
    const filtersCollapse = new bootstrap.Collapse(document.getElementById('fileFilters'));
    filtersCollapse.toggle();
  });
  
  // Setup filter listeners
  ['filterFileType', 'sortFiles', 'searchFiles'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', applyFileFilters);
    document.getElementById(id)?.addEventListener('keyup', applyFileFilters);
  });
  
  // Setup file upload
  setupFileUpload();
}

// ==================== TIMELINE MANAGEMENT ====================

async function loadTimelineTab() {
  try {
    const { data: updates, error } = await supabase
      .from('project_updates')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const timeline = document.getElementById('projectTimeline');
    const emptyState = document.getElementById('timelineEmpty');

    if (!updates || updates.length === 0) {
      timeline.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
    timeline.innerHTML = updates.map(update => renderTimelineItem(update)).join('');

    loadedTabs.add('timeline');
  } catch (error) {
    console.error('Error loading timeline:', error);
    showError('Failed to load timeline');
  }
}

/**
 * Render timeline item HTML
 */
function renderTimelineItem(update) {
  const iconMap = {
    'general': 'bi-chat-dots',
    'milestone': 'bi-flag',
    'task_created': 'bi-plus-circle',
    'task_completed': 'bi-check-circle',
    'task_assigned': 'bi-person-check',
    'file_shared': 'bi-file-earmark-arrow-up',
    'status_change': 'bi-arrow-repeat'
  };

  const icon = iconMap[update.update_type] || 'bi-info-circle';
  const badgeColor = {
    'general': 'bg-secondary',
    'milestone': 'bg-warning',
    'task_created': 'bg-info',
    'task_completed': 'bg-success',
    'task_assigned': 'bg-primary',
    'file_shared': 'bg-info',
    'status_change': 'bg-warning'
  }[update.update_type] || 'bg-secondary';

  return `
    <div class="timeline-item">
      <div class="timeline-icon">
        <i class="bi ${icon}"></i>
      </div>
      <div class="timeline-content">
        <div class="timeline-text">${escapeHtml(update.text)}</div>
        <div class="timeline-meta">
          <span class="badge ${badgeColor}" style="font-size: 0.75rem;">${capitalizeText(update.update_type.replace(/_/g, ' '))}</span>
          <span>${getRelativeTime(update.created_at)}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Handle update submission
 */
async function handleUpdateSubmit(event) {
  event.preventDefault();

  try {
    const text = document.getElementById('updateText').value.trim();
    const type = document.getElementById('updateType').value;

    if (!text) {
      showError('Update message is required');
      return;
    }

    showButtonLoading(document.getElementById('updateSubmitBtn'), 'Posting...');

    const { error } = await supabase
      .from('project_updates')
      .insert({
        project_id: projectId,
        update_type: type,
        text: text,
        created_at: new Date().toISOString()
      });

    if (error) throw error;

    updateModal.hide();
    document.getElementById('updateForm').reset();
    showSuccess('Update posted');
    await loadTimelineTab();
  } catch (error) {
    console.error('Error posting update:', error);
    showError('Failed to post update');
  } finally {
    hideButtonLoading(document.getElementById('updateSubmitBtn'));
  }
}

/**
 * Setup tab change listeners (lazy load)
 */
function setupTabListeners() {
  const tabs = document.querySelectorAll('#projectTabs button');
  tabs.forEach(tab => {
    tab.addEventListener('shown.bs.tab', async (e) => {
      const targetId = e.target.getAttribute('data-bs-target');

      if (targetId === '#tasks' && !loadedTabs.has('tasks')) {
        showLoading('Loading tasks...');
        await loadTasksTab();
        hideLoading();
      } else if (targetId === '#files' && !loadedTabs.has('files')) {
        showLoading('Loading files...');
        await loadFilesTab();
        hideLoading();
      } else if (targetId === '#timeline' && !loadedTabs.has('timeline')) {
        showLoading('Loading timeline...');
        await loadTimelineTab();
        hideLoading();
      }
    });
  });
}

/**
 * Check user permissions and show/hide buttons
 */
function checkUserPermissions(project, user) {
  const isOwner = project.user_id === user.id;
  const isAdmin = user.user_metadata?.role === 'admin';
  const canEdit = isOwner || isAdmin;

  if (canEdit) {
    editBtn.style.display = 'inline-block';
    deleteBtn.style.display = 'inline-block';
  } else {
    editBtn.style.display = 'none';
    deleteBtn.style.display = 'none';
  }
}

/**
 * Handle edit project
 */
function handleEditProject() {
  window.location.href = `project-form.html?id=${projectId}`;
}

/**
 * Handle delete project
 */
async function handleDeleteProject() {
  try {
    const confirmed = await new Promise((resolve) => {
      confirm(
        'Are you sure you want to delete this project? This will permanently delete the project and all related data (tasks, files, updates). This action cannot be undone.',
        () => resolve(true),
        () => resolve(false)
      );
    });

    if (!confirmed) return;

    showButtonLoading(deleteBtn, 'Deleting...');
    await deleteProject(projectId);
    showSuccess('Project deleted');
    setTimeout(() => {
      window.location.href = 'projects.html';
    }, 1500);
  } catch (error) {
    console.error('Error deleting project:', error);
    hideButtonLoading(deleteBtn);
    showError('Failed to delete project');
  }
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Project actions
  editBtn.addEventListener('click', handleEditProject);
  deleteBtn.addEventListener('click', handleDeleteProject);

  // Modal actions
  addTaskBtn.addEventListener('click', () => showTaskModal());
  uploadFileBtn.addEventListener('click', () => uploadModal.show());
  addUpdateBtn.addEventListener('click', () => updateModal.show());

  // Form submissions
  document.getElementById('taskForm').addEventListener('submit', handleTaskSubmit);
  document.getElementById('uploadForm').addEventListener('submit', handleFileUpload);
  document.getElementById('updateForm').addEventListener('submit', handleUpdateSubmit);

  // Logout
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Get project ID from URL search params
 */
function getProjectIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

/**
 * Find task by ID across all columns
 */
function findTaskById(taskId) {
  const allTasks = [
    ...document.getElementById('todoTasks').querySelectorAll('.task-card'),
    ...document.getElementById('inProgressTasks').querySelectorAll('.task-card'),
    ...document.getElementById('doneTasks').querySelectorAll('.task-card')
  ];

  // Fetch from server instead of DOM
  return supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single()
    .then(({ data }) => data);
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
 * Update user info in navbar
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
 * Get color for user initials
 */
function getColorForInitials(initials) {
  const colors = ['#20b2aa', '#4169e1', '#ff6b6b', '#ffd93d', '#6bcf7f'];
  const code = (initials.charCodeAt(0) || 0) + (initials.charCodeAt(1) || 0);
  return colors[code % colors.length];
}

/**
 * Get status badge color
 */
function getStatusBadgeColor(status) {
  const colors = {
    'planning': 'bg-secondary',
    'active': 'bg-success',
    'completed': 'bg-info',
    'paused': 'bg-warning',
    'archived': 'bg-dark'
  };
  return colors[status] || 'bg-secondary';
}

/**
 * Capitalize text
 */
function capitalizeText(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Show image in lightbox
 */
window.showImageLightbox = function(imageUrl, fileName) {
  // This would need a lightbox implementation
  // For now, just open in new tab
  window.open(imageUrl, '_blank');
};

// Expose task functions globally for inline event handlers
window.handleTaskComplete = handleTaskComplete;
window.showTaskModal = showTaskModal;
window.handleDeleteTask = handleDeleteTask;

// Expose file functions globally for inline event handlers
window.previewFile = previewFile;
window.downloadFile = downloadFile;
window.deleteFile = deleteFile;

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', initProjectDetails);
