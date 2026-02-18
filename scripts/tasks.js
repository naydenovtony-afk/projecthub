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
        // demoServices.tasks.getByProject returns { todo, in_progress, done }
        const grouped = await demoServices.tasks.getByProject(project.id);
        const projectTasks = [
          ...(grouped.todo || []),
          ...(grouped.in_progress || []),
          ...(grouped.done || [])
        ];
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
        <div class="action-btn-group">
          <button class="btn btn-action" onclick="openEditTask('${task.id}')" title="Edit Task">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-action" onclick="openAssignTask('${task.id}')" title="Assign Members">
            <i class="bi bi-person-plus"></i>
          </button>
          <button class="btn btn-action btn-action-danger" onclick="deleteTask('${task.id}')" title="Delete Task">
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
  
  // Normalize a priority value (string or number) to a number 1-5
  const normalizePriority = (p) => {
    if (typeof p === 'number') return p;
    const map = { minimal: 1, low: 2, medium: 3, high: 4, critical: 5 };
    return map[String(p).toLowerCase()] || 3;
  };

  return allTasks.filter(task => {
    if (statusFilter && task.status !== statusFilter) return false;
    if (priorityFilter && normalizePriority(task.priority) !== parseInt(priorityFilter)) return false;
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
  
  // Create new task
  document.getElementById('saveTaskBtn')?.addEventListener('click', saveNewTask);

  // Edit task
  document.getElementById('saveEditTaskBtn')?.addEventListener('click', saveEditTask);

  // Assign task
  document.getElementById('saveAssignBtn')?.addEventListener('click', saveAssignTask);

  // Delete confirmation
  document.getElementById('confirmDeleteBtn')?.addEventListener('click', confirmDelete);
  
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
      const newTask = await demoServices.tasks.create(taskData);
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
      await demoServices.tasks.update(taskId, { status: newStatus });
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

// ─── Edit Task ───────────────────────────────────────────────────────────────

window.openEditTask = function(taskId) {
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return;

  const normPriority = (() => {
    if (typeof task.priority === 'number') return task.priority;
    const map = { minimal: 1, low: 2, medium: 3, high: 4, critical: 5 };
    return map[String(task.priority).toLowerCase()] || 3;
  })();

  document.getElementById('editTaskId').value = task.id;
  document.getElementById('editTaskTitle').value = task.title;
  document.getElementById('editTaskDescription').value = task.description || '';
  document.getElementById('editTaskStatus').value = task.status || 'todo';
  document.getElementById('editTaskPriority').value = normPriority;
  document.getElementById('editTaskDueDate').value = task.due_date ? task.due_date.substring(0, 10) : '';

  bootstrap.Modal.getOrCreateInstance(document.getElementById('editTaskModal')).show();
};

async function saveEditTask() {
  const btn = document.getElementById('saveEditTaskBtn');
  const taskId = document.getElementById('editTaskId').value;
  const title = document.getElementById('editTaskTitle').value.trim();
  const description = document.getElementById('editTaskDescription').value.trim();
  const status = document.getElementById('editTaskStatus').value;
  const priority = parseInt(document.getElementById('editTaskPriority').value);
  const dueDate = document.getElementById('editTaskDueDate').value;

  if (!title) { showNotification('Task title is required', 'error'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving…';

  try {
    const updates = { title, description, status, priority, due_date: dueDate || null };

    if (isDemoMode()) {
      await demoServices.tasks.update(taskId, updates);
    } else {
      const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);
      if (error) throw error;
    }

    const task = allTasks.find(t => t.id === taskId);
    if (task) Object.assign(task, updates);

    bootstrap.Modal.getInstance(document.getElementById('editTaskModal')).hide();
    updateStats();
    renderTasks();
    showNotification('Task updated successfully!', 'success');
  } catch (error) {
    console.error('Error updating task:', error);
    showNotification('Failed to update task', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-check2 me-1"></i>Save Changes';
  }
}

// ─── Assign Task ─────────────────────────────────────────────────────────────

window.openAssignTask = async function(taskId) {
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return;

  document.getElementById('assignTaskId').value = taskId;
  document.getElementById('assignTaskName').textContent = `Task: ${task.title}`;

  const listEl = document.getElementById('assignMembersList');
  const noneEl = document.getElementById('assignNoMembers');
  listEl.innerHTML = '<div class="text-center py-3"><span class="spinner-border spinner-border-sm text-primary"></span></div>';
  noneEl.classList.add('d-none');

  bootstrap.Modal.getOrCreateInstance(document.getElementById('assignTaskModal')).show();

  try {
    let members = [];
    if (isDemoMode()) {
      const grouped = await demoServices.teamMembers.getByProject(task.project_id);
      members = grouped;
    } else {
      const { data, error } = await supabase
        .from('project_members')
        .select('id, user_id, role, profiles(full_name, email, avatar_url)')
        .eq('project_id', task.project_id);
      if (error) throw error;
      members = (data || []).map(m => ({
        id: m.user_id,
        name: m.profiles?.full_name || m.profiles?.email || 'Unknown',
        role: m.role,
        email: m.profiles?.email || '',
        avatar_url: m.profiles?.avatar_url || null
      }));
    }

    const currentAssignees = task.assigned_members || (task.assigned_to ? [task.assigned_to] : []);

    if (!members.length) {
      listEl.innerHTML = '';
      noneEl.classList.remove('d-none');
      return;
    }

    listEl.innerHTML = members.map(m => {
      const initials = (m.name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
      const isSelected = currentAssignees.includes(m.user_id || m.id);
      return `
        <label class="assign-member-card ${isSelected ? 'selected' : ''}" data-user-id="${m.user_id || m.id}">
          <input type="checkbox" class="d-none" ${isSelected ? 'checked' : ''}>
          <div class="assign-member-avatar">${initials}</div>
          <div class="flex-grow-1">
            <div class="fw-medium">${escapeHtml(m.name)}</div>
            <div class="text-muted small">${escapeHtml(m.role || m.email || '')}</div>
          </div>
          <i class="bi ${isSelected ? 'bi-check-circle-fill text-success' : 'bi-circle text-muted'} fs-5"></i>
        </label>`;
    }).join('');

    // Toggle selection on click
    listEl.querySelectorAll('.assign-member-card').forEach(card => {
      card.addEventListener('click', () => {
        const cb = card.querySelector('input[type=checkbox]');
        cb.checked = !cb.checked;
        card.classList.toggle('selected', cb.checked);
        const icon = card.querySelector('.bi:last-child');
        icon.className = `bi ${cb.checked ? 'bi-check-circle-fill text-success' : 'bi-circle text-muted'} fs-5`;
      });
    });
  } catch (err) {
    console.error('Error loading team members:', err);
    listEl.innerHTML = '<p class="text-danger small">Failed to load team members.</p>';
  }
};

async function saveAssignTask() {
  const btn = document.getElementById('saveAssignBtn');
  const taskId = document.getElementById('assignTaskId').value;
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return;

  const selected = [...document.querySelectorAll('#assignMembersList .assign-member-card input:checked')]
    .map(cb => cb.closest('.assign-member-card').dataset.userId);

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving…';

  try {
    const updates = { assigned_members: selected, assigned_to: selected[0] || null };

    if (isDemoMode()) {
      await demoServices.tasks.update(taskId, updates);
    } else {
      const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);
      if (error) throw error;
    }

    Object.assign(task, updates);
    bootstrap.Modal.getInstance(document.getElementById('assignTaskModal')).hide();
    renderTasks();
    showNotification(`Assigned ${selected.length} member(s) to task`, 'success');
  } catch (error) {
    console.error('Error assigning task:', error);
    showNotification('Failed to save assignment', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-check2 me-1"></i>Save Assignment';
  }
}

// ─── Delete Task ──────────────────────────────────────────────────────────────

let _pendingDeleteId = null;

window.deleteTask = function(taskId) {
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return;
  _pendingDeleteId = taskId;
  document.getElementById('deleteTaskName').textContent = task.title;
  bootstrap.Modal.getOrCreateInstance(document.getElementById('deleteTaskModal')).show();
};

async function confirmDelete() {
  const taskId = _pendingDeleteId;
  if (!taskId) return;

  const btn = document.getElementById('confirmDeleteBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Deleting…';

  try {
    if (isDemoMode()) {
      await demoServices.tasks.delete(taskId);
    } else {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
    }

    allTasks = allTasks.filter(t => t.id !== taskId);
    bootstrap.Modal.getInstance(document.getElementById('deleteTaskModal')).hide();
    updateStats();
    renderTasks();
    showNotification('Task deleted', 'success');
  } catch (error) {
    console.error('Error deleting task:', error);
    showNotification('Failed to delete task', 'error');
  } finally {
    _pendingDeleteId = null;
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-trash me-1"></i>Delete';
  }
}

// Utility functions
function renderPriorityBadge(priority) {
  // Support both numeric (1-5) and string ('low', 'medium', 'high') priorities
  const numericMap = { 'minimal': 1, 'low': 2, 'medium': 3, 'high': 4, 'critical': 5 };
  const normalized = typeof priority === 'string'
    ? numericMap[priority.toLowerCase()] || 3
    : priority;
  const badges = {
    1: '<span class="badge bg-secondary">Minimal</span>',
    2: '<span class="badge bg-info text-white">Low</span>',
    3: '<span class="badge bg-primary">Medium</span>',
    4: '<span class="badge bg-warning text-dark">High</span>',
    5: '<span class="badge bg-danger">Critical</span>'
  };
  return badges[normalized] || badges[3];
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
