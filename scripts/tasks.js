/**
 * Tasks Page - Manage all tasks across projects
 */

import { isDemoMode, demoServices, DEMO_USER } from '../utils/demoMode.js';
import { supabase } from '../services/supabase.js';
import { checkAuthStatus, getCurrentUser, addDemoParamToLinks } from './auth.js';
import { showNotification } from '../utils/notifications.js';

let allTasks = [];
let allProjects = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  if (!checkAuthStatus()) return;
  
  await loadProjects();
  await loadTasks();
  setupEventListeners();
  addDemoParamToLinks();
});

// Load all projects
async function loadProjects() {
  try {
    const user = getCurrentUser();
    
    if (isDemoMode()) {
      allProjects = await demoServices.projects.getAll(DEMO_USER.id);
    } else {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      allProjects = data || [];
    }
    
    populateProjectSelects();
  } catch (error) {
    console.error('Error loading projects:', error);
    showNotification('Failed to load projects', 'error');
  }
}

// Populate project select dropdowns
function populateProjectSelects() {
  const selects = ['filterProject', 'taskProject'];
  
  selects.forEach(selectId => {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    // Keep first option (All Projects or Select project)
    const firstOption = select.options[0];
    select.innerHTML = '';
    select.appendChild(firstOption);
    
    allProjects.forEach(project => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.title;
      select.appendChild(option);
    });
  });
}

// Load all tasks
async function loadTasks() {
  try {
    const user = getCurrentUser();
    
    if (isDemoMode()) {
      // Get all tasks from all projects
      const projects = await demoServices.projects.getAll(DEMO_USER.id);
      allTasks = [];
      
      for (const project of projects) {
        const projectTasks = await demoServices.tasks.getByProject(project.id);
        projectTasks.forEach(task => {
          allTasks.push({
            ...task,
            project_title: project.title
          });
        });
      }
    } else {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          projects (title)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      allTasks = (data || []).map(task => ({
        ...task,
        project_title: task.projects?.title || 'Unknown Project'
      }));
    }
    
    updateStats();
    renderTasks();
  } catch (error) {
    console.error('Error loading tasks:', error);
    showNotification('Failed to load tasks', 'error');
    renderEmptyState();
  }
}

// Update task statistics
function updateStats() {
  const total = allTasks.length;
  const todo = allTasks.filter(t => t.status === 'todo').length;
  const inProgress = allTasks.filter(t => t.status === 'in_progress').length;
  const done = allTasks.filter(t => t.status === 'done').length;
  
  document.getElementById('totalTasksCount').textContent = total;
  document.getElementById('todoCount').textContent = todo;
  document.getElementById('inProgressCount').textContent = inProgress;
  document.getElementById('doneCount').textContent = done;
}

// Render tasks
function renderTasks() {
  const tbody = document.getElementById('tasksTableBody');
  
  if (!allTasks || allTasks.length === 0) {
    renderEmptyState();
    return;
  }
  
  // Apply filters
  const filteredTasks = applyFilters();
  
  if (filteredTasks.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-5">
          <i class="bi bi-search text-muted" style="font-size: 3rem;"></i>
          <p class="text-muted mt-3">No tasks match your filters</p>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = filteredTasks.map(task => `
    <tr>
      <td>
        <div class="d-flex align-items-center">
          <input type="checkbox" class="form-check-input me-2" ${task.status === 'done' ? 'checked' : ''} 
                 onchange="toggleTaskStatus('${task.id}', this.checked)">
          <div>
            <div class="fw-medium ${task.status === 'done' ? 'text-decoration-line-through text-muted' : ''}">${escapeHtml(task.title)}</div>
            ${task.description ? `<small class="text-muted">${escapeHtml(task.description).substring(0, 60)}...</small>` : ''}
          </div>
        </div>
      </td>
      <td>
        <span class="badge bg-light text-dark">${escapeHtml(task.project_title)}</span>
      </td>
      <td>${renderPriorityBadge(task.priority)}</td>
      <td>${renderStatusBadge(task.status)}</td>
      <td>
        ${task.due_date ? `
          <span class="${isOverdue(task.due_date, task.status) ? 'text-danger' : 'text-muted'}">
            <i class="bi bi-calendar-event me-1"></i>${formatDate(task.due_date)}
          </span>
        ` : '<span class="text-muted">No due date</span>'}
      </td>
      <td>
        <div class="btn-group btn-group-sm">
          <a href="./project-details.html?id=${task.project_id}${isDemoMode() ? '&demo=true' : ''}" class="btn btn-outline-primary" title="View Project">
            <i class="bi bi-eye"></i>
          </a>
          <button class="btn btn-outline-danger" onclick="deleteTask('${task.id}')" title="Delete">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Apply filters
function applyFilters() {
  const statusFilter = document.getElementById('filterStatus').value;
  const priorityFilter = document.getElementById('filterPriority').value;
  const projectFilter = document.getElementById('filterProject').value;
  const searchQuery = document.getElementById('searchTasks').value.toLowerCase();
  
  return allTasks.filter(task => {
    if (statusFilter && task.status !== statusFilter) return false;
    if (priorityFilter && task.priority !== parseInt(priorityFilter)) return false;
    if (projectFilter && task.project_id !== projectFilter) return false;
    if (searchQuery) {
      const searchableText = `${task.title} ${task.description || ''}`.toLowerCase();
      if (!searchableText.includes(searchQuery)) return false;
    }
    return true;
  });
}

// Render empty state
function renderEmptyState() {
  const tbody = document.getElementById('tasksTableBody');
  tbody.innerHTML = `
    <tr>
      <td colspan="6" class="text-center py-5">
        <i class="bi bi-list-check text-muted" style="font-size: 3rem;"></i>
        <p class="text-muted mt-3 mb-3">No tasks yet</p>
        <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#newTaskModal">
          <i class="bi bi-plus-lg me-2"></i>Create Your First Task
        </button>
      </td>
    </tr>
  `;
}

// Setup event listeners
function setupEventListeners() {
  // Filter changes
  ['filterStatus', 'filterPriority', 'filterProject'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', renderTasks);
  });
  
  document.getElementById('searchTasks')?.addEventListener('input', renderTasks);
  
  // Save new task
  document.getElementById('saveTaskBtn')?.addEventListener('click', saveNewTask);
  
  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = './login.html';
  });
}

// Save new task
async function saveNewTask() {
  const title = document.getElementById('taskTitle').value.trim();
  const description = document.getElementById('taskDescription').value.trim();
  const projectId = document.getElementById('taskProject').value;
  const priority = parseInt(document.getElementById('taskPriority').value);
  const dueDate = document.getElementById('taskDueDate').value;
  
  if (!title || !projectId) {
    showNotification('Please fill in required fields', 'error');
    return;
  }
  
  try {
    const taskData = {
      title,
      description,
      project_id: projectId,
      priority,
      due_date: dueDate || null,
      status: 'todo'
    };
    
    if (isDemoMode()) {
      const newTask = demoServices.tasks.create(taskData);
      allTasks.unshift({
        ...newTask,
        project_title: allProjects.find(p => p.id === projectId)?.title || 'Unknown'
      });
    } else {
      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select(`*, projects (title)`)
        .single();
      
      if (error) throw error;
      
      allTasks.unshift({
        ...data,
        project_title: data.projects?.title || 'Unknown'
      });
    }
    
    showNotification('Task created successfully!', 'success');
    
    // Reset form and close modal
    document.getElementById('newTaskForm').reset();
    bootstrap.Modal.getInstance(document.getElementById('newTaskModal')).hide();
    
    updateStats();
    renderTasks();
  } catch (error) {
    console.error('Error creating task:', error);
    showNotification('Failed to create task', 'error');
  }
}

// Toggle task status
window.toggleTaskStatus = async function(taskId, isChecked) {
  const newStatus = isChecked ? 'done' : 'todo';
  
  try {
    if (isDemoMode()) {
      demoServices.tasks.update(taskId, { status: newStatus });
    } else {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);
      
      if (error) throw error;
    }
    
    const task = allTasks.find(t => t.id === taskId);
    if (task) {
      task.status = newStatus;
    }
    
    updateStats();
    renderTasks();
    showNotification('Task updated!', 'success');
  } catch (error) {
    console.error('Error updating task:', error);
    showNotification('Failed to update task', 'error');
  }
};

// Delete task
window.deleteTask = async function(taskId) {
  if (!confirm('Are you sure you want to delete this task?')) return;
  
  try {
    if (isDemoMode()) {
      demoServices.tasks.delete(taskId);
    } else {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
    }
    
    allTasks = allTasks.filter(t => t.id !== taskId);
    
    updateStats();
    renderTasks();
    showNotification('Task deleted', 'success');
  } catch (error) {
    console.error('Error deleting task:', error);
    showNotification('Failed to delete task', 'error');
  }
};

// Utility functions
function renderPriorityBadge(priority) {
  const badges = {
    1: '<span class="badge bg-secondary">Minimal</span>',
    2: '<span class="badge bg-info">Low</span>',
    3: '<span class="badge bg-primary">Medium</span>',
    4: '<span class="badge bg-warning">High</span>',
    5: '<span class="badge bg-danger">Critical</span>'
  };
  return badges[priority] || badges[3];
}

function renderStatusBadge(status) {
  const badges = {
    'todo': '<span class="badge bg-warning">To Do</span>',
    'in_progress': '<span class="badge bg-info">In Progress</span>',
    'done': '<span class="badge bg-success">Done</span>'
  };
  return badges[status] || badges['todo'];
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(dueDate, status) {
  if (status === 'done') return false;
  return new Date(dueDate) < new Date();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
