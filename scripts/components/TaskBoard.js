/**
 * Task Board Component
 * Manages Kanban board, task cards, and drag-drop functionality
 */
import { showError, showSuccess, showLoading, hideLoading } from '../../utils/uiModular.js';
import { formatDate, getRelativeTime } from '../../utils/helpers.js';
import { isDemoMode, demoServices } from '../../utils/demoMode.js';

export class TaskBoard {
  constructor(containerId, projectId) {
    this.container = document.getElementById(containerId);
    this.projectId = projectId;
    this.tasks = [];
    this.currentView = 'board'; // 'board' or 'list'
    this.isDemo = isDemoMode();
    
    this.initEventListeners();
  }

  initEventListeners() {
    // View toggle buttons
    const viewBoardBtn = document.getElementById('viewBoard');
    const viewListBtn = document.getElementById('viewList');
    
    if (viewBoardBtn) {
      viewBoardBtn.addEventListener('click', () => {
        this.switchView('board');
      });
    }
    
    if (viewListBtn) {
      viewListBtn.addEventListener('click', () => {
        this.switchView('list');
      });
    }
    
    // Add task button
    const addTaskBtn = document.getElementById('addTaskBtn');
    if (addTaskBtn) {
      addTaskBtn.addEventListener('click', () => {
        this.showAddTaskModal();
      });
    }
    
    // Initialize drag and drop
    this.initDragAndDrop();
  }

  /**
   * Load and display tasks
   */
  async loadTasks() {
    try {
      showLoading('Loading tasks...');
      
      if (this.isDemo) {
        this.tasks = await demoServices.getProjectTasks(this.projectId);
      } else {
        // Real API call would go here
        // this.tasks = await taskService.getProjectTasks(this.projectId);
        this.tasks = [];
      }
      
      this.renderTasks();
      this.updateTaskCounts();
      
    } catch (error) {
      console.error('Error loading tasks:', error);
      showError('Failed to load tasks');
    } finally {
      hideLoading();
    }
  }

  renderTasks() {
    if (this.currentView === 'board') {
      this.renderKanbanBoard();
    } else {
      this.renderTaskList();
    }
  }

  renderKanbanBoard() {
    const columns = ['todo', 'in_progress', 'done'];
    
    columns.forEach(status => {
      const columnId = status === 'in_progress' ? 'inProgressColumn' : `${status}Column`;
      const emptyId = status === 'in_progress' ? 'inProgressEmpty' : `${status}Empty`;
      
      const column = document.getElementById(columnId);
      const emptyState = document.getElementById(emptyId);
      
      if (!column) return;
      
      // Clear existing tasks
      const existingTasks = column.querySelectorAll('.task-card');
      existingTasks.forEach(task => task.remove());
      
      // Filter tasks for this column
      const columnTasks = this.tasks.filter(task => task.status === status);
      
      if (columnTasks.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
      } else {
        if (emptyState) emptyState.style.display = 'none';
        columnTasks.forEach(task => {
          const taskCard = this.createTaskCard(task);
          column.appendChild(taskCard);
        });
      }
    });
  }

  renderTaskList() {
    const listView = document.getElementById('listView');
    const tbody = listView?.querySelector('tbody');
    
    if (!tbody) return;
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    if (this.tasks.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted py-4">
            <i class="bi bi-clipboard2-x fs-2 d-block mb-2"></i>
            No tasks found
          </td>
        </tr>
      `;
      return;
    }
    
    this.tasks.forEach(task => {
      const row = this.createTaskRow(task);
      tbody.appendChild(row);
    });
  }

  createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.draggable = true;
    card.dataset.taskId = task.id;
    
    const priorityColors = {
      high: 'danger',
      medium: 'warning', 
      low: 'secondary'
    };
    
    const dueDateDisplay = task.due_date 
      ? `<small class="text-muted">Due: ${formatDate(task.due_date)}</small>`
      : '';
    
    card.innerHTML = `
      <div class="d-flex justify-content-between align-items-start mb-2">
        <h6 class="task-title mb-1">${task.title}</h6>
        <span class="badge bg-${priorityColors[task.priority]} badge-sm">${task.priority}</span>
      </div>
      ${task.description ? `<p class="task-description">${task.description}</p>` : ''}
      ${dueDateDisplay}
      <div class="task-actions mt-2">
        <button class="btn btn-sm btn-outline-primary" onclick="editTask('${task.id}')">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteTask('${task.id}')">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `;
    
    // Add drag event listeners
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', task.id);
      card.classList.add('dragging');
    });
    
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });
    
    return card;
  }

  createTaskRow(task) {
    const row = document.createElement('tr');
    
    const priorityColors = {
      high: 'danger',
      medium: 'warning',
      low: 'secondary'
    };
    
    const statusColors = {
      todo: 'secondary',
      in_progress: 'warning',
      done: 'success'
    };
    
    const statusLabels = {
      todo: 'To Do',
      in_progress: 'In Progress',
      done: 'Done'
    };
    
    row.innerHTML = `
      <td>${task.title}</td>
      <td>
        <span class="badge bg-${statusColors[task.status]} text-white">
          ${statusLabels[task.status]}
        </span>
      </td>
      <td>
        <span class="badge bg-${priorityColors[task.priority]} text-white">
          ${task.priority}
        </span>
      </td>
      <td>${task.assignee || 'Unassigned'}</td>
      <td>${task.due_date ? formatDate(task.due_date) : '-'}</td>
      <td>
        <div class="btn-group" role="group">
          <button class="btn btn-sm btn-outline-primary" onclick="editTask('${task.id}')">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteTask('${task.id}')">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    `;
    
    return row;
  }

  initDragAndDrop() {
    const columns = document.querySelectorAll('.kanban-column-body');
    
    columns.forEach(column => {
      column.addEventListener('dragover', (e) => {
        e.preventDefault();
        column.classList.add('drag-over');
      });
      
      column.addEventListener('dragleave', () => {
        column.classList.remove('drag-over');
      });
      
      column.addEventListener('drop', async (e) => {
        e.preventDefault();
        column.classList.remove('drag-over');
        
        const taskId = e.dataTransfer.getData('text/plain');
        const newStatus = column.dataset.column;
        
        await this.updateTaskStatus(taskId, newStatus);
      });
    });
  }

  async updateTaskStatus(taskId, newStatus) {
    try {
      if (this.isDemo) {
        await demoServices.updateTask(taskId, { status: newStatus });
      } else {
        // Real API call would go here
        // await taskService.updateTask(taskId, { status: newStatus });
      }
      
      await this.loadTasks(); // Refresh the board
      showSuccess('Task status updated');
    } catch (error) {
      console.error('Error updating task status:', error);
      showError('Failed to update task status');
    }
  }

  updateTaskCounts() {
    const counts = {
      todo: this.tasks.filter(t => t.status === 'todo').length,
      in_progress: this.tasks.filter(t => t.status === 'in_progress').length,
      done: this.tasks.filter(t => t.status === 'done').length
    };
    
    const todoCount = document.getElementById('todoCount');
    const inProgressCount = document.getElementById('inProgressCount');
    const doneCount = document.getElementById('doneCount');
    const tasksCount = document.getElementById('tasksCount');
    
    if (todoCount) todoCount.textContent = counts.todo;
    if (inProgressCount) inProgressCount.textContent = counts.in_progress;
    if (doneCount) doneCount.textContent = counts.done;
    if (tasksCount) tasksCount.textContent = this.tasks.length;
  }

  switchView(view) {
    this.currentView = view;
    
    // Update button states
    const viewBoardBtn = document.getElementById('viewBoard');
    const viewListBtn = document.getElementById('viewList');
    
    if (viewBoardBtn) viewBoardBtn.classList.toggle('active', view === 'board');
    if (viewListBtn) viewListBtn.classList.toggle('active', view === 'list');
    
    // Show/hide views
    const kanbanBoard = document.getElementById('kanbanBoard');
    const listView = document.getElementById('listView');
    
    if (kanbanBoard) kanbanBoard.style.display = view === 'board' ? 'block' : 'none';
    if (listView) listView.style.display = view === 'list' ? 'block' : 'none';
    
    this.renderTasks();
  }

  showAddTaskModal() {
    const modal = document.getElementById('addTaskModal');
    if (modal) {
      const bsModal = new bootstrap.Modal(modal);
      bsModal.show();
    }
  }

  /**
   * Create a new task
   * @param {Object} taskData - Task data
   */
  async createTask(taskData) {
    try {
      if (this.isDemo) {
        await demoServices.createTask(taskData);
      } else {
        // Real API call would go here
        // await taskService.createTask(taskData);
      }
      
      await this.loadTasks(); // Refresh the board
      return true;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  /**
   * Get current tasks
   * @returns {Array} Current tasks array
   */
  getTasks() {
    return this.tasks;
  }
}