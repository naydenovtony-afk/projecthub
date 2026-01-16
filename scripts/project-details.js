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

/**
 * Load tasks tab content
 */
async function loadTasksTab() {
  try {
    const tasks = await getTasksByProject(projectId);

    // Render tasks in columns
    renderTasksColumn('todoTasks', 'todoEmpty', 'todoCount', tasks.todo);
    renderTasksColumn('inProgressTasks', 'inProgressEmpty', 'inProgressCount', tasks.in_progress);
    renderTasksColumn('doneTasks', 'doneEmpty', 'doneCount', tasks.done);

    loadedTabs.add('tasks');
  } catch (error) {
    console.error('Error loading tasks tab:', error);
    showError('Failed to load tasks');
  }
}

/**
 * Render tasks in a kanban column
 */
function renderTasksColumn(columnId, emptyId, countId, tasks) {
  const column = document.getElementById(columnId);
  const emptyState = document.getElementById(emptyId);
  const countBadge = document.getElementById(countId);

  // Update count
  countBadge.textContent = tasks.length;

  // Clear column
  column.innerHTML = '';

  if (tasks.length === 0) {
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  // Render task cards
  tasks.forEach(task => {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.id = `task-${task.id}`;
    card.innerHTML = renderTaskCard(task);
    column.appendChild(card);
  });

  // Attach event listeners
  attachTaskEventListeners();
}

/**
 * Render single task card HTML
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
 * Attach event listeners to task elements
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

/**
 * Load files tab content
 */
async function loadFilesTab() {
  try {
    const files = await getFilesByProject(projectId);

    // Separate images and documents
    const images = files.filter(f => f.file_type.startsWith('image/'));
    const documents = files.filter(f => !f.file_type.startsWith('image/'));

    // Render galleries
    if (images.length > 0) {
      document.getElementById('imageGallerySection').style.display = 'block';
      renderImageGallery(images);
    } else {
      document.getElementById('imageGallerySection').style.display = 'none';
    }

    if (documents.length > 0) {
      document.getElementById('filesListSection').style.display = 'block';
      renderFilesList(documents);
    } else {
      document.getElementById('filesListSection').style.display = 'none';
    }

    // Show empty state if no files
    if (files.length === 0) {
      document.getElementById('filesEmpty').style.display = 'block';
    } else {
      document.getElementById('filesEmpty').style.display = 'none';
    }

    // Setup filter listeners
    setupFileFilterListeners();

    loadedTabs.add('files');
  } catch (error) {
    console.error('Error loading files tab:', error);
    showError('Failed to load files');
  }
}

/**
 * Render image gallery
 */
function renderImageGallery(images) {
  const gallery = document.getElementById('imageGallery');
  gallery.innerHTML = '';

  images.forEach(file => {
    const col = document.createElement('div');
    col.className = 'col-md-4 col-lg-3';
    col.innerHTML = `
      <div class="image-thumbnail">
        <img src="${escapeHtml(file.file_url)}" alt="${escapeHtml(file.file_name)}" style="cursor: pointer;" data-bs-toggle="modal" data-bs-target="#lightboxModal" onclick="showImageLightbox('${escapeHtml(file.file_url)}', '${escapeHtml(file.file_name)}')">
        <button class="btn btn-sm btn-danger image-delete-btn" data-file-id="${file.id}" title="Delete">
          <i class="bi bi-trash" style="font-size: 0.75rem;"></i>
        </button>
      </div>
    `;
    gallery.appendChild(col);
  });

  // Attach delete listeners
  document.querySelectorAll('.image-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const fileId = e.currentTarget.dataset.fileId;
      handleDeleteFile(fileId);
    });
  });
}

/**
 * Render files list table
 */
function renderFilesList(documents) {
  const tbody = document.getElementById('filesTableBody');
  tbody.innerHTML = '';

  documents.forEach(file => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <i class="bi ${getFileIcon(file.file_type)} file-icon me-2"></i>
        ${escapeHtml(file.file_name)}
      </td>
      <td>${formatFileSize(file.file_size)}</td>
      <td>${formatDate(file.uploaded_at)}</td>
      <td>
        <a href="${escapeHtml(file.file_url)}" class="btn btn-sm btn-outline-primary" download title="Download">
          <i class="bi bi-download"></i>
        </a>
        <button class="btn btn-sm btn-outline-danger delete-file-btn" data-file-id="${file.id}" title="Delete">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });

  // Attach delete listeners
  document.querySelectorAll('.delete-file-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const fileId = e.currentTarget.dataset.fileId;
      handleDeleteFile(fileId);
    });
  });
}

/**
 * Setup file filter listeners
 */
function setupFileFilterListeners() {
  document.querySelectorAll('.file-filter').forEach(radio => {
    radio.addEventListener('change', async (e) => {
      const filterValue = e.target.value;
      const files = await getFilesByProject(projectId);

      let filtered = files;
      if (filterValue !== 'all') {
        filtered = files.filter(f => f.category === filterValue);
      }

      const images = filtered.filter(f => f.file_type.startsWith('image/'));
      const documents = filtered.filter(f => !f.file_type.startsWith('image/'));

      if (images.length > 0) {
        document.getElementById('imageGallerySection').style.display = 'block';
        renderImageGallery(images);
      } else {
        document.getElementById('imageGallerySection').style.display = 'none';
      }

      if (documents.length > 0) {
        document.getElementById('filesListSection').style.display = 'block';
        renderFilesList(documents);
      } else {
        document.getElementById('filesListSection').style.display = 'none';
      }
    });
  });
}

/**
 * Handle file upload
 */
async function handleFileUpload(event) {
  event.preventDefault();

  try {
    const files = document.getElementById('fileInput').files;
    if (files.length === 0) {
      showError('No files selected');
      return;
    }

    const category = document.getElementById('fileCategory').value;
    const caption = document.getElementById('fileCaption').value;

    showButtonLoading(document.getElementById('uploadSubmitBtn'), 'Uploading...');
    document.querySelector('.upload-progress').classList.add('show');

    let successCount = 0;
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const progress = Math.round(((i + 1) / totalFiles) * 100);
      document.getElementById('uploadProgressBar').style.width = `${progress}%`;
      document.getElementById('uploadStatus').textContent = `Uploading ${i + 1} of ${totalFiles}...`;

      const result = await uploadProjectFile(file, projectId, category);
      if (result.success) {
        successCount++;
      } else {
        console.warn(`Failed to upload ${file.name}: ${result.error}`);
      }
    }

    uploadModal.hide();
    document.getElementById('uploadForm').reset();
    document.querySelector('.upload-progress').classList.remove('show');

    showSuccess(`${successCount} file(s) uploaded successfully`);
    await loadFilesTab();
  } catch (error) {
    console.error('Error uploading files:', error);
    showError('Failed to upload files');
  } finally {
    hideButtonLoading(document.getElementById('uploadSubmitBtn'));
    document.querySelector('.upload-progress').classList.remove('show');
  }
}

/**
 * Handle file deletion
 */
async function handleDeleteFile(fileId) {
  try {
    const confirmed = await new Promise((resolve) => {
      confirm(
        'Are you sure you want to delete this file?',
        () => resolve(true),
        () => resolve(false)
      );
    });

    if (!confirmed) return;

    const result = await deleteProjectFile(fileId);
    if (result.success) {
      showSuccess('File deleted');
      await loadFilesTab();
    } else {
      showError(result.error);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    showError('Failed to delete file');
  }
}

/**
 * Load timeline tab content
 */
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

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', initProjectDetails);
