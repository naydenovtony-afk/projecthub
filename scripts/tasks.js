/**
 * Tasks Page - Manage all tasks across projects
 */

import { isDemoMode, isAdminUser, demoServices, DEMO_USER } from '../utils/demoMode.js';
import { supabase, isSupabaseConfigured } from '../services/supabase.js';
import { checkAuthStatus, getCurrentUser, getCurrentUserFromSession, addDemoParamToLinks } from './auth.js';
import { showNotification } from '../utils/notifications.js';
import {
  hasPermission,
  getCheckboxAction,
  validateTaskTransition,
  formatRole,
  getRoleBadgeClass,
  formatStatus,
  renderRoleBadge,
} from '../services/projectPermissions.js';
import { updateTaskStatus, bulkApproveReview } from '../services/taskService.js';

let allTasks = [];
let allProjects = [];
let currentView = 'list';
// { [projectId]: role } – populated in loadProjects()
let userRoleMap = {};
let currentUserId = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('🚀 Tasks page initializing...');
    console.log('🔐 Supabase configured:', isSupabaseConfigured());
    console.log('🎭 Demo mode:', isTasksPageDemo());

    if (!checkAuthStatus()) return;

    await loadProjects();
    await loadTasks();
    setupEventListeners();
    addDemoParamToLinks();
    await updateNavbarUserInfo();

    console.log('✅ Tasks page ready!');
  } catch (error) {
    console.error('❌ Tasks page initialization failed:', error);
    // Guarantee the spinner is always cleared even on catastrophic failure
    renderEmptyState();
  }
});

/**
 * Update the navbar with the resolved user's display name and email.
 * Uses getCurrentUserFromSession() to ensure profile full_name is loaded.
 */
async function updateNavbarUserInfo() {
  try {
    // Use session-based fetch so profile full_name is included
    const user = await getCurrentUserFromSession();
    if (!user) return;

    // Priority: full_name from profiles > metadata > email username
    const displayName = user.full_name ||
                        user.user_metadata?.full_name ||
                        user.user_metadata?.name ||
                        user.email?.split('@')[0] ||
                        'User';

    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.textContent = displayName;

    const userEmailEl = document.getElementById('userEmail');
    if (userEmailEl) userEmailEl.textContent = user.email || '';

    console.log('✅ Navbar updated with user:', displayName);
  } catch (e) {
    console.warn('Could not update navbar user info:', e);
  }
}

// Determine demo mode using the same role-based logic as other pages
function isTasksPageDemo() {
  // If Supabase isn't configured at all, always fall back to demo data
  if (!isSupabaseConfigured()) {
    console.log('⚠️ Supabase not configured – falling back to demo mode');
    return true;
  }
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('demo') === 'true' ||
         (isAdminUser() && urlParams.get('demo') !== 'false') ||
         isDemoMode();
}

// Load all projects
async function loadProjects() {
  try {
    const user = getCurrentUser();

    if (isTasksPageDemo()) {
      allProjects = await demoServices.projects.getAll(DEMO_USER.id);
      // In demo mode everyone is treated as PM
      allProjects.forEach(p => { userRoleMap[p.id] = 'project_manager'; });
    } else {
      currentUserId = user.id;
      // Race against timeout so a hanging network call never blocks the page
      const queryPromise = supabase
        .from('projects')
        .select('*, project_members(user_id, role)')
        .order('created_at', { ascending: false });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Projects query timed out after 10 s')), 10000)
      );

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (error) throw error;
      allProjects = (data || [])
        .filter(project => (
          project.user_id === user.id ||
          (project.project_members || []).some(member => member.user_id === user.id)
        ))
        .map(({ project_members, ...project }) => {
          // Build role map for this user
          const membership = (project_members || []).find(m => m.user_id === user.id);
          if (membership) {
            userRoleMap[project.id] = membership.role;
          } else if (project.user_id === user.id) {
            // Creator without a membership row is treated as PM
            userRoleMap[project.id] = 'project_manager';
          } else {
            // Fallback: visible project with no membership row → safe default
            userRoleMap[project.id] = 'team_member';
          }
          return project;
        });
    }
    
    populateProjectSelects();
  } catch (error) {
    console.error('❌ Error loading projects:', error);
    // Only notify for real connection failures — empty results are normal for new users
    if (error?.message && !error.message.includes('No rows') && !error.message.includes('timed out')) {
      showNotification('Failed to load projects. Please check your connection.', 'error');
    }
    allProjects = []; // keep going — tasks can still load
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
    console.log('📦 Loading tasks, demo mode:', isTasksPageDemo());

    if (isTasksPageDemo()) {
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
      console.log(`✅ Loaded ${allTasks.length} demo tasks`);
    } else {
      // Race the Supabase query against a 10-second timeout so we never hang forever
      const queryPromise = supabase
        .from('tasks')
        .select(`
          *,
          projects (title)
        `)
        .order('created_at', { ascending: false });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Tasks query timed out after 10 s')), 10000)
      );

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (error) throw error;
      
      allTasks = (data || []).map(task => ({
        ...task,
        project_title: task.projects?.title || 'Unknown Project'
      }));
      console.log(`✅ Loaded ${allTasks.length} real tasks`);
    }
  } catch (error) {
    console.error('❌ Error loading tasks:', error);
    // Silently fall back to empty state — a new user with no projects will always get an
    // empty result set, which is normal and should NOT show an error toast.
    allTasks = [];
  } finally {
    // Always update stats and clear the spinner, regardless of success or error
    updateStats();
    renderTasks();
  }
}

// Update task statistics
function updateStats() {
  const total = allTasks.length;
  const todo = allTasks.filter(t => t.status === 'todo').length;
  const inProgress = allTasks.filter(t => t.status === 'in_progress').length;
  const pendingReview = allTasks.filter(t => t.status === 'pending_review').length;
  const done = allTasks.filter(t => t.status === 'done').length;
  
  document.getElementById('totalTasksCount').textContent = total;
  document.getElementById('todoCount').textContent = todo;
  document.getElementById('inProgressCount').textContent = inProgress;
  const pendingEl = document.getElementById('pendingReviewCount');
  if (pendingEl) pendingEl.textContent = pendingReview;
  document.getElementById('doneCount').textContent = done;
}

// Render tasks (branches on currentView)
function renderTasks() {
  if (!allTasks || allTasks.length === 0) {
    renderEmptyState();
    return;
  }

  const filteredTasks = applyFilters();

  if (currentView === 'grid') {
    renderTasksGrid(filteredTasks);
  } else {
    renderTasksList(filteredTasks);
  }
}

// Render list view
function renderTasksList(filteredTasks) {
  const tbody = document.getElementById('tasksTableBody');

  if (filteredTasks.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-5">
          <i class="bi bi-search text-muted" style="font-size: 3rem;"></i>
          <p class="text-muted mt-3">No tasks match your filters</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredTasks.map(task => {
    const userRole = userRoleMap[task.project_id] ?? 'team_member';
    const canManage = hasPermission(userRole, 'create_tasks');  // PM or PC
    const canDelete = hasPermission(userRole, 'delete_tasks');  // PM only
    const isDone = task.status === 'done';
    const isPending = task.status === 'pending_review';
    // Checkbox: TM submits for review, PM/PC completes directly
    const checkboxTitle = userRole === 'team_member'
      ? 'Submit for review'
      : isDone ? 'Mark as incomplete' : 'Mark as complete';

    return `
    <tr class="${isPending ? 'table-warning' : ''}">
      <td class="align-middle">
        <input type="checkbox" class="form-check-input task-row-select"
               data-task-id="${task.id}"
               onchange="updateBatchToolbar()"
               title="Select task">
      </td>
      <td>
        <div class="d-flex align-items-center">
          <input type="checkbox" class="form-check-input me-2"
                 title="${checkboxTitle}"
                 ${isDone ? 'checked' : ''}
                 ${isPending ? 'disabled title="Awaiting PM/PC approval"' : ''}
                 onchange="toggleTaskStatus('${task.id}', this.checked)">
          <div>
            <div class="fw-medium ${isDone ? 'text-decoration-line-through text-muted' : ''}">${escapeHtml(task.title)}</div>
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
          ${canManage ? `
            <button class="btn btn-action" onclick="openEditTask('${task.id}')" title="Edit Task">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-action" onclick="openAssignTask('${task.id}')" title="Assign Members">
              <i class="bi bi-person-plus"></i>
            </button>
          ` : ''}
          ${canDelete && isDone ? `
            <button class="btn btn-action btn-action-warning" onclick="reopenTask('${task.id}')" title="Reopen Task">
              <i class="bi bi-arrow-counterclockwise"></i>
            </button>
          ` : ''}
          ${canDelete ? `
            <button class="btn btn-action btn-action-danger" onclick="deleteTask('${task.id}')" title="Delete Task">
              <i class="bi bi-trash"></i>
            </button>
          ` : ''}
          ${!canManage && !canDelete ? '<span class="text-muted small">—</span>' : ''}
        </div>
      </td>
    </tr>
  `;
  }).join('');
}

// Render grid view
function renderTasksGrid(filteredTasks) {
  const grid = document.getElementById('tasksGrid');

  if (filteredTasks.length === 0) {
    grid.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-search text-muted" style="font-size: 3rem;"></i>
        <p class="text-muted mt-3">No tasks match your filters</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filteredTasks.map(task => {
    const userRole = userRoleMap[task.project_id] ?? 'team_member';
    const canManage = hasPermission(userRole, 'create_tasks');
    const canDelete = hasPermission(userRole, 'delete_tasks');
    const isDone = task.status === 'done';
    const isPending = task.status === 'pending_review';
    const checkboxDisabled = isPending ? 'disabled' : '';
    const checkboxTitle = isPending
      ? 'Awaiting PM/PC approval'
      : userRole === 'team_member' ? 'Submit for review' : isDone ? 'Mark incomplete' : 'Mark complete';

    return `
    <div class="task-card ${isDone ? 'done-card' : ''} ${isPending ? 'pending-review-card' : ''}">
      <div class="d-flex align-items-start justify-content-between gap-2">
        <p class="task-card-title ${isDone ? 'done-text' : ''}">${escapeHtml(task.title)}</p>
        <input type="checkbox" class="form-check-input flex-shrink-0 mt-1"
               title="${checkboxTitle}" ${isDone ? 'checked' : ''} ${checkboxDisabled}
               onchange="toggleTaskStatus('${task.id}', this.checked)">
      </div>
      ${task.description ? `<p class="task-card-desc">${escapeHtml(task.description).substring(0, 80)}…</p>` : ''}
      <div class="task-card-meta">
        ${renderPriorityBadge(task.priority)}
        ${renderStatusBadge(task.status)}
      </div>
      <span class="task-card-project">${escapeHtml(task.project_title)}</span>
      <div class="task-card-footer">
        <span class="task-card-due ${isOverdue(task.due_date, task.status) ? 'overdue' : ''}">
          ${task.due_date ? `<i class="bi bi-calendar-event"></i> ${formatDate(task.due_date)}` : 'No due date'}
        </span>
        <div class="action-btn-group">
          ${canManage ? `
            <button class="btn btn-action" onclick="openEditTask('${task.id}')" title="Edit"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-action" onclick="openAssignTask('${task.id}')" title="Assign"><i class="bi bi-person-plus"></i></button>
          ` : ''}
          ${canDelete && isDone ? `
            <button class="btn btn-action btn-action-warning" onclick="reopenTask('${task.id}')" title="Reopen"><i class="bi bi-arrow-counterclockwise"></i></button>
          ` : ''}
          ${canDelete ? `
            <button class="btn btn-action btn-action-danger" onclick="deleteTask('${task.id}')" title="Delete"><i class="bi bi-trash"></i></button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
  }).join('');
}

// Apply filters
function applyFilters() {
  const statusFilter   = document.getElementById('filterStatus').value;
  const priorityFilter = document.getElementById('filterPriority').value;
  const projectFilter  = document.getElementById('filterProject').value;
  const assignedFilter = document.getElementById('filterAssignedTo')?.value ?? '';
  const searchQuery    = document.getElementById('searchTasks').value.toLowerCase();
  
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
    if (assignedFilter === 'me' && task.assigned_to !== currentUserId) return false;
    if (assignedFilter === 'unassigned' && task.assigned_to) return false;
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
  const grid = document.getElementById('tasksGrid');
  const emptyHtml = `
    <i class="bi bi-list-check text-muted" style="font-size: 3rem;"></i>
    <p class="text-muted mt-3 mb-3">No tasks yet</p>
    <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#newTaskModal">
      <i class="bi bi-plus-lg me-2"></i>Create Your First Task
    </button>
  `;
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5">${emptyHtml}</td></tr>`;
  }
  if (grid) {
    grid.innerHTML = `<div class="col-12 text-center py-5">${emptyHtml}</div>`;
  }
}

// Setup event listeners
function setupEventListeners() {
  // Filter changes
  ['filterStatus', 'filterPriority', 'filterProject', 'filterAssignedTo'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', renderTasks);
  });

  // Select-all checkbox for batch operations
  document.getElementById('selectAllTasks')?.addEventListener('change', (e) => {
    document.querySelectorAll('.task-row-select').forEach(cb => {
      cb.checked = e.target.checked;
    });
    updateBatchToolbar();
  });

  // Delegate row-checkbox changes to sync select-all state
  document.getElementById('tasksTableBody')?.addEventListener('change', (e) => {
    if (e.target.classList.contains('task-row-select')) {
      const all     = document.querySelectorAll('.task-row-select');
      const checked = document.querySelectorAll('.task-row-select:checked');
      const selectAll = document.getElementById('selectAllTasks');
      if (selectAll) selectAll.indeterminate = checked.length > 0 && checked.length < all.length;
      if (selectAll) selectAll.checked = checked.length === all.length && all.length > 0;
      updateBatchToolbar();
    }
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

  // View toggle
  document.getElementById('listViewBtn')?.addEventListener('click', () => {
    currentView = 'list';
    document.getElementById('listViewBtn').classList.add('active');
    document.getElementById('gridViewBtn').classList.remove('active');
    document.getElementById('tasksListContainer').style.display = '';
    document.getElementById('tasksGridContainer').style.display = 'none';
    renderTasks();
  });
  document.getElementById('gridViewBtn')?.addEventListener('click', () => {
    currentView = 'grid';
    document.getElementById('gridViewBtn').classList.add('active');
    document.getElementById('listViewBtn').classList.remove('active');
    document.getElementById('tasksListContainer').style.display = 'none';
    document.getElementById('tasksGridContainer').style.display = '';
    renderTasks();
  });
  
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

  // Role check: only PM or PC may create tasks
  const userRole = userRoleMap[projectId];
  if (!isDemoMode() && !hasPermission(userRole, 'create_tasks')) {
    showNotification('Only a Project Manager or Coordinator can create tasks', 'error');
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

// Toggle task status (role-aware)
window.toggleTaskStatus = async function(taskId, isChecked) {
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return;

  const userRole = userRoleMap[task.project_id] ?? 'team_member';

  // Determine the target status based on role and checkbox state
  let newStatus;
  if (isChecked) {
    newStatus = getCheckboxAction(userRole); // 'done' for PM/PC, 'pending_review' for TM
  } else {
    newStatus = 'todo';
  }

  // Validate the transition before hitting the DB
  const { allowed, reason } = validateTaskTransition(task.status, newStatus, userRole);
  if (!allowed) {
    showNotification(reason, 'error');
    // Revert checkbox visually
    renderTasks();
    return;
  }

  try {
    if (isDemoMode()) {
      await demoServices.tasks.update(taskId, { status: newStatus });
    } else {
      const result = await updateTaskStatus(taskId, task.project_id, newStatus, userRole);
      if (!result.success) throw new Error(result.message);
    }
    
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

  // Validate status transition if status changed
  const task = allTasks.find(t => t.id === taskId);
  if (task && status !== task.status && !isDemoMode()) {
    const userRole = userRoleMap[task.project_id] ?? 'team_member';
    const { allowed, reason } = validateTaskTransition(task.status, status, userRole);
    if (!allowed) {
      showNotification(reason, 'error');
      return;
    }
  }

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

// ─── Reopen Task (PM only) ────────────────────────────────────────────────────────────────────
window.reopenTask = async function(taskId) {
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return;

  const userRole = userRoleMap[task.project_id] ?? 'team_member';
  if (userRole !== 'project_manager') {
    showNotification('Only Project Managers can reopen completed tasks', 'error');
    return;
  }

  const result = await updateTaskStatus(taskId, task.project_id, 'todo', userRole);
  if (result.success) {
    const idx = allTasks.findIndex(t => t.id === taskId);
    if (idx !== -1) Object.assign(allTasks[idx], result.task);
    updateStats();
    renderTasks();
    showNotification('Task reopened and moved back to To Do', 'success');
  } else {
    showNotification(result.message, 'error');
  }
};

// ─── Batch Operations (PM / PC) ────────────────────────────────────────────────────────────
function getSelectedTaskIds() {
  return [...document.querySelectorAll('.task-row-select:checked')].map(cb => cb.dataset.taskId);
}

function updateBatchToolbar() {
  const ids = getSelectedTaskIds();
  const toolbar = document.getElementById('batchActionsToolbar');
  if (toolbar) toolbar.style.display = ids.length > 0 ? '' : 'none';
  const countEl = document.getElementById('batchSelectedCount');
  if (countEl) countEl.textContent = ids.length;
}

window.batchApprove = async function() {
  const taskIds = getSelectedTaskIds();
  if (!taskIds.length) return;

  // Determine the project for the first selected task (all should be in same project or handle per project)
  const projectIds = [...new Set(taskIds.map(id => allTasks.find(t => t.id === id)?.project_id).filter(Boolean))];

  const btn = document.getElementById('batchApproveBtn');
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Approving...';

  try {
    let approved = 0;
    for (const projectId of projectIds) {
      const projectTaskIds = taskIds.filter(id => allTasks.find(t => t.id === id)?.project_id === projectId);
      const result = await bulkApproveReview(projectId, projectTaskIds);
      if (result.success) {
        approved += result.count ?? 0;
        // Update local state
        projectTaskIds.forEach(id => {
          const idx = allTasks.findIndex(t => t.id === id);
          if (idx !== -1 && allTasks[idx].status === 'pending_review') {
            allTasks[idx].status = 'done';
          }
        });
      } else {
        showNotification(result.message, 'error');
      }
    }
    if (approved > 0) {
      // Deselect all
      const selectAll = document.getElementById('selectAllTasks');
      if (selectAll) selectAll.checked = false;
      updateBatchToolbar();
      updateStats();
      renderTasks();
      showNotification(`${approved} task${approved === 1 ? '' : 's'} approved`, 'success');
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
};

window.batchReject = async function() {
  const taskIds = getSelectedTaskIds();
  if (!taskIds.length) return;

  const btn = document.getElementById('batchRejectBtn');
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Sending back...';

  try {
    let rejected = 0;
    for (const taskId of taskIds) {
      const task = allTasks.find(t => t.id === taskId);
      if (!task || task.status !== 'pending_review') continue;
      const userRole = userRoleMap[task.project_id] ?? 'team_member';
      const result = await updateTaskStatus(taskId, task.project_id, 'in_progress', userRole);
      if (result.success) {
        const idx = allTasks.findIndex(t => t.id === taskId);
        if (idx !== -1) Object.assign(allTasks[idx], result.task);
        rejected++;
      }
    }
    if (rejected > 0) {
      const selectAll = document.getElementById('selectAllTasks');
      if (selectAll) selectAll.checked = false;
      updateBatchToolbar();
      updateStats();
      renderTasks();
      showNotification(`${rejected} task${rejected === 1 ? '' : 's'} sent back to In Progress`, 'warning');
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
};

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
    'todo':           '<span class="badge bg-warning">To Do</span>',
    'in_progress':    '<span class="badge bg-info">In Progress</span>',
    'pending_review': '<span class="badge bg-warning text-dark"><i class="bi bi-clock-history me-1"></i>Pending Review</span>',
    'done':           '<span class="badge bg-success">Done</span>',
    'blocked':        '<span class="badge bg-danger">Blocked</span>',
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
