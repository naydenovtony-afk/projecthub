/**
 * Gantt Timeline Module
 * Manages Gantt chart visualization and task CRUD operations
 */

import { isDemoMode } from '../utils/demoMode.js';
import { getCurrentUser } from './auth.js';

let ganttChart = null;
let tasks = [];
let currentTask = null;

// Demo tasks data
const DEMO_TASKS = [
  {
    id: 'task-1',
    name: 'Project Planning',
    start: '2026-02-01',
    end: '2026-02-14',
    progress: 100,
    status: 'done',
    priority: 'high',
    dependencies: ''
  },
  {
    id: 'task-2',
    name: 'Research & Analysis',
    start: '2026-02-10',
    end: '2026-02-28',
    progress: 75,
    status: 'in-progress',
    priority: 'high',
    dependencies: 'task-1'
  },
  {
    id: 'task-3',
    name: 'Design Phase',
    start: '2026-02-20',
    end: '2026-03-15',
    progress: 45,
    status: 'in-progress',
    priority: 'medium',
    dependencies: 'task-2'
  },
  {
    id: 'task-4',
    name: 'Development',
    start: '2026-03-01',
    end: '2026-04-30',
    progress: 20,
    status: 'in-progress',
    priority: 'high',
    dependencies: 'task-3'
  },
  {
    id: 'task-5',
    name: 'Testing',
    start: '2026-04-15',
    end: '2026-05-15',
    progress: 0,
    status: 'todo',
    priority: 'high',
    dependencies: 'task-4'
  },
  {
    id: 'task-6',
    name: 'Documentation',
    start: '2026-04-01',
    end: '2026-05-30',
    progress: 10,
    status: 'in-progress',
    priority: 'medium',
    dependencies: 'task-4'
  },
  {
    id: 'task-7',
    name: 'Deployment',
    start: '2026-05-20',
    end: '2026-05-31',
    progress: 0,
    status: 'todo',
    priority: 'high',
    dependencies: 'task-5'
  }
];

/**
 * Initialize Gantt chart
 * @param {string} projectId - Project ID
 */
export function initGanttChart(projectId) {
  loadTasks(projectId);
  setupEventListeners();
}

/**
 * Load tasks from demo or API
 * @param {string} projectId - Project ID
 */
function loadTasks(projectId) {
  if (isDemoMode()) {
    tasks = [...DEMO_TASKS];
  } else {
    // Load from API
    tasks = [];
  }
  
  renderGanttChart();
}

/**
 * Render Gantt chart with current tasks
 */
function renderGanttChart() {
  const ganttTasks = tasks.map(task => ({
    id: task.id,
    name: task.name,
    start: task.start,
    end: task.end,
    progress: task.progress,
    dependencies: task.dependencies,
    custom_class: getTaskClass(task)
  }));

  if (ganttChart) {
    ganttChart.refresh(ganttTasks);
  } else {
    ganttChart = new Gantt("#gantt-chart", ganttTasks, {
      view_mode: 'Week',
      bar_height: 30,
      bar_corner_radius: 4,
      arrow_curve: 5,
      padding: 18,
      date_format: 'YYYY-MM-DD',
      language: 'en',
      custom_popup_html: function(task) {
        const taskData = tasks.find(t => t.id === task.id);
        return `
          <div class="gantt-popup">
            <h6>${task.name}</h6>
            <p><strong>Status:</strong> ${getStatusBadge(taskData.status)}</p>
            <p><strong>Progress:</strong> ${task.progress}%</p>
            <p><strong>Duration:</strong> ${task.start} → ${task.end}</p>
            <p><strong>Priority:</strong> ${getPriorityBadge(taskData.priority)}</p>
          </div>
        `;
      },
      on_click: function(task) {
        openTaskSidebar(task.id);
      },
      on_date_change: function(task, start, end) {
        updateTaskDates(task.id, start, end);
      },
      on_progress_change: function(task, progress) {
        updateTaskProgress(task.id, progress);
      }
    });
  }
}

/**
 * Get task CSS class based on status/priority
 * @param {Object} task - Task object
 * @returns {string} CSS classes
 */
function getTaskClass(task) {
  const classes = [];
  
  if (task.status === 'done') classes.push('task-done');
  if (task.status === 'in-progress') classes.push('task-in-progress');
  if (task.status === 'todo') classes.push('task-todo');
  
  if (task.priority === 'high') classes.push('task-priority-high');
  if (task.priority === 'medium') classes.push('task-priority-medium');
  if (task.priority === 'low') classes.push('task-priority-low');
  
  return classes.join(' ');
}

/**
 * Get status badge HTML
 * @param {string} status - Task status
 * @returns {string} Badge HTML
 */
function getStatusBadge(status) {
  const badges = {
    'todo': '<span class="badge bg-secondary">To Do</span>',
    'in-progress': '<span class="badge bg-primary">In Progress</span>',
    'done': '<span class="badge bg-success">Done</span>'
  };
  return badges[status] || status;
}

/**
 * Get priority badge HTML
 * @param {string} priority - Task priority
 * @returns {string} Badge HTML
 */
function getPriorityBadge(priority) {
  const badges = {
    'high': '<span class="badge bg-danger">High</span>',
    'medium': '<span class="badge bg-warning">Medium</span>',
    'low': '<span class="badge bg-info">Low</span>'
  };
  return badges[priority] || priority;
}

/**
 * Open task sidebar with task details
 * @param {string} taskId - Task ID
 */
function openTaskSidebar(taskId) {
  currentTask = tasks.find(t => t.id === taskId);
  if (!currentTask) return;
  
  // Populate form
  document.getElementById('taskName').value = currentTask.name;
  document.getElementById('taskStart').value = currentTask.start;
  document.getElementById('taskEnd').value = currentTask.end;
  document.getElementById('taskStatus').value = currentTask.status;
  document.getElementById('taskProgress').value = currentTask.progress;
  document.getElementById('progressValue').textContent = currentTask.progress + '%';
  document.getElementById('taskPriority').value = currentTask.priority || 'medium';
  document.getElementById('taskAssignee').value = currentTask.assignee || '';
  document.getElementById('taskDescription').value = currentTask.description || '';
  
  // Populate dependencies dropdown
  populateDependenciesDropdown();
  
  // Show sidebar
  document.getElementById('taskSidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('show');
}

/**
 * Populate dependencies dropdown
 */
function populateDependenciesDropdown() {
  const dropdown = document.getElementById('taskDependencies');
  dropdown.innerHTML = '';
  
  tasks.forEach(task => {
    if (currentTask && task.id !== currentTask.id) {
      const option = document.createElement('option');
      option.value = task.id;
      option.textContent = task.name;
      
      // Select if it's a dependency
      if (currentTask.dependencies && currentTask.dependencies.includes(task.id)) {
        option.selected = true;
      }
      
      dropdown.appendChild(option);
    }
  });
}

/**
 * Close task sidebar
 */
function closeTaskSidebar() {
  document.getElementById('taskSidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
  currentTask = null;
}

/**
 * Update task dates (drag on gantt)
 * @param {string} taskId - Task ID
 * @param {Date} start - Start date
 * @param {Date} end - End date
 */
function updateTaskDates(taskId, start, end) {
  const task = tasks.find(t => t.id === taskId);
  if (task) {
    task.start = start.toISOString().split('T')[0];
    task.end = end.toISOString().split('T')[0];
    console.log('Task dates updated:', taskId, task.start, task.end);
  }
}

/**
 * Update task progress (drag progress bar)
 * @param {string} taskId - Task ID
 * @param {number} progress - Progress percentage
 */
function updateTaskProgress(taskId, progress) {
  const task = tasks.find(t => t.id === taskId);
  if (task) {
    task.progress = progress;
    
    // Auto-update status
    if (progress === 0) task.status = 'todo';
    else if (progress === 100) task.status = 'done';
    else task.status = 'in-progress';
    
    console.log('Task progress updated:', taskId, progress);
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // View mode buttons
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      ganttChart.change_view_mode(e.target.dataset.view);
    });
  });
  
  // Add task button
  document.getElementById('addTimelineTaskBtn').addEventListener('click', addNewTask);
  
  // Save timeline button
  document.getElementById('saveTimelineBtn').addEventListener('click', saveTimeline);
  
  // Close sidebar
  document.getElementById('closeSidebar').addEventListener('click', closeTaskSidebar);
  document.getElementById('sidebarOverlay').addEventListener('click', closeTaskSidebar);
  
  // Task details form
  document.getElementById('taskDetailsForm').addEventListener('submit', saveTaskDetails);
  
  // Progress slider
  document.getElementById('taskProgress').addEventListener('input', (e) => {
    document.getElementById('progressValue').textContent = e.target.value + '%';
  });
  
  // Delete task button
  document.getElementById('deleteTaskBtn').addEventListener('click', deleteTask);
}

/**
 * Add new task
 */
function addNewTask() {
  const newTask = {
    id: 'task-' + Date.now(),
    name: 'New Task',
    start: new Date().toISOString().split('T')[0],
    end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    progress: 0,
    status: 'todo',
    priority: 'medium',
    dependencies: ''
  };
  
  tasks.push(newTask);
  renderGanttChart();
  openTaskSidebar(newTask.id);
}

/**
 * Save task details
 * @param {Event} e - Form submit event
 */
function saveTaskDetails(e) {
  e.preventDefault();
  
  if (!currentTask) return;
  
  currentTask.name = document.getElementById('taskName').value;
  currentTask.start = document.getElementById('taskStart').value;
  currentTask.end = document.getElementById('taskEnd').value;
  currentTask.status = document.getElementById('taskStatus').value;
  currentTask.progress = parseInt(document.getElementById('taskProgress').value);
  currentTask.priority = document.getElementById('taskPriority').value;
  currentTask.assignee = document.getElementById('taskAssignee').value;
  currentTask.description = document.getElementById('taskDescription').value;
  
  // Get selected dependencies
  const dependenciesSelect = document.getElementById('taskDependencies');
  const selectedDeps = Array.from(dependenciesSelect.selectedOptions).map(opt => opt.value);
  currentTask.dependencies = selectedDeps.join(',');
  
  renderGanttChart();
  closeTaskSidebar();
  
  showSuccess('Task updated successfully!');
}

/**
 * Delete task
 */
function deleteTask() {
  if (!currentTask) return;
  
  if (confirm('Are you sure you want to delete this task?')) {
    tasks = tasks.filter(t => t.id !== currentTask.id);
    renderGanttChart();
    closeTaskSidebar();
    showSuccess('Task deleted successfully!');
  }
}

/**
 * Save timeline
 */
function saveTimeline() {
  console.log('Saving timeline...', tasks);
  // Save to localStorage or API
  if (isDemoMode()) {
    localStorage.setItem('gantt-tasks', JSON.stringify(tasks));
  }
  showSuccess('Timeline saved successfully!');
}

/**
 * Show success message
 * @param {string} message - Success message
 */
function showSuccess(message) {
  // Create toast notification
  const toast = document.createElement('div');
  toast.className = 'toast align-items-center text-white bg-success border-0';
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <i class="bi bi-check-circle me-2"></i>${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  
  // Add to page
  let toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
    document.body.appendChild(toastContainer);
  }
  
  toastContainer.appendChild(toast);
  
  // Show toast
  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();
  
  // Remove after hidden
  toast.addEventListener('hidden.bs.toast', () => {
    toast.remove();
  });
}
