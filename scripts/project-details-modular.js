/**
 * Project Details Page Controller - Modular Version
 * Coordinates all components and manages page state
 */
import { supabase } from '../services/supabase.js';
import { showError, showSuccess, showLoading, hideLoading, confirm } from '../utils/uiModular.js';
import { ProjectHeader } from './components/ProjectHeader.js';
import { TaskBoard } from './components/TaskBoard.js';
import { FileManager } from './components/FileManager.js';
import { isDemoMode, demoServices } from '../utils/demoMode.js';

class ProjectDetailsController {
  constructor() {
    this.projectId = new URLSearchParams(window.location.search).get('id');
    this.project = null;
    this.components = {};
    // Treat as demo if ?demo=true, localStorage has demoMode, or the projectId looks like a demo ID (proj-*)
    this.isDemo = isDemoMode() || (this.projectId && /^proj-/i.test(this.projectId));
    this.currentTab = 'overview';
    
    this.init();
  }

  async init() {
    if (!this.projectId) {
      showError('Project ID not found');
      window.location.href = './projects.html';
      return;
    }

    // Initialize components
    this.initComponents();
    
    // Load project data
    await this.loadProject();
    
    // Setup event listeners
    this.initEventListeners();
    
    // Load initial tab content
    this.loadInitialContent();
  }

  initComponents() {
    // Initialize header component
    this.components.header = new ProjectHeader('projectCover');
    
    // Initialize task board component
    this.components.taskBoard = new TaskBoard('kanbanBoard', this.projectId);
    
    // Initialize file manager component
    this.components.fileManager = new FileManager('filesGrid', this.projectId);
  }

  async loadProject() {
    try {
      showLoading('Loading project...');
      
      let projectData;
      if (this.isDemo) {
        projectData = await demoServices.projects.getById(this.projectId);
      } else {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', this.projectId)
          .single();
        
        if (error) throw error;
        projectData = data;
      }
      
      this.project = projectData;
      
      // Update header component
      this.components.header.updateHeader(this.project);
      
      // Update page title
      document.title = `${this.project.title} - ProjectHub`;
      
      // Dispatch custom event for other modules
      window.dispatchEvent(new CustomEvent('projectLoaded', {
        detail: { project: this.project }
      }));
      
    } catch (error) {
      console.error('Error loading project:', error);
      showError('Failed to load project');
    } finally {
      hideLoading();
    }
  }

  initEventListeners() {
    // Tab event listeners
    this.initTabHandlers();
    
    // Form event listeners
    this.initFormHandlers();
    
    // Global event listeners
    this.initGlobalHandlers();
  }

  initTabHandlers() {
    // Tasks tab
    const tasksTab = document.getElementById('tasks-tab');
    if (tasksTab) {
      tasksTab.addEventListener('shown.bs.tab', () => {
        this.currentTab = 'tasks';
        this.components.taskBoard.loadTasks();
      });
    }
    
    // Files tab  
    const filesTab = document.getElementById('files-tab');
    if (filesTab) {
      filesTab.addEventListener('shown.bs.tab', () => {
        this.currentTab = 'files';
        this.components.fileManager.loadFiles();
      });
    }
    
    // Timeline tab
    const timelineTab = document.getElementById('timeline-tab');
    if (timelineTab) {
      timelineTab.addEventListener('shown.bs.tab', () => {
        this.currentTab = 'timeline';
        this.loadTimeline();
      });
    }
    
    // Overview tab
    const overviewTab = document.getElementById('overview-tab');
    if (overviewTab) {
      overviewTab.addEventListener('shown.bs.tab', () => {
        this.currentTab = 'overview';
        this.loadOverview();
      });
    }
  }

  initFormHandlers() {
    // Add task form
    const addTaskForm = document.getElementById('addTaskForm');
    if (addTaskForm) {
      addTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleAddTask(e.target);
      });
    }
    
    // Upload file form
    const uploadForm = document.getElementById('uploadFileForm');
    if (uploadForm) {
      uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleFileUpload(e.target);
      });
    }
  }

  initGlobalHandlers() {
    // Make task and file action functions globally available
    window.editTask = (taskId) => this.handleEditTask(taskId);
    window.deleteTask = (taskId) => this.handleDeleteTask(taskId);
    window.downloadFile = (fileId) => this.handleDownloadFile(fileId);
    window.viewFile = (fileId) => this.handleViewFile(fileId);
    window.editFileInfo = (fileId) => this.handleEditFileInfo(fileId);
    window.deleteFile = (fileId) => this.handleDeleteFile(fileId);
  }

  async handleAddTask(form) {
    try {
      const formData = new FormData(form);
      const taskData = {
        project_id: this.projectId,
        title: formData.get('taskTitle'),
        description: formData.get('taskDescription') || null,
        priority: formData.get('taskPriority') || 'medium',
        status: formData.get('taskStatus') || 'todo',
        due_date: formData.get('taskDueDate') || null,
        assignee: formData.get('taskAssignee') || null
      };
      
      await this.components.taskBoard.createTask(taskData);
      
      // Hide modal and reset form
      const modal = bootstrap.Modal.getInstance(document.getElementById('addTaskModal'));
      if (modal) modal.hide();
      form.reset();
      
      showSuccess('Task created successfully');
    } catch (error) {
      console.error('Error creating task:', error);
      showError('Failed to create task');
    }
  }

  async handleFileUpload(form) {
    try {
      // File upload logic would go here
      showSuccess('File uploaded successfully');
      
      // Reload files
      await this.components.fileManager.loadFiles();
      
      // Hide modal and reset form
      const modal = bootstrap.Modal.getInstance(document.getElementById('uploadFileModal'));
      if (modal) modal.hide();
      form.reset();
    } catch (error) {
      console.error('Error uploading file:', error);
      showError('Failed to upload file');
    }
  }

  async handleEditTask(taskId) {
    console.log('Edit task:', taskId);
    // Implementation would go here
  }

  async handleDeleteTask(taskId) {
    if (await confirm('Are you sure you want to delete this task?')) {
      try {
        // Delete logic would go here based on demo/real mode
        await this.components.taskBoard.loadTasks(); // Refresh
        showSuccess('Task deleted successfully');
      } catch (error) {
        showError('Failed to delete task');
      }
    }
  }

  async handleDownloadFile(fileId) {
    console.log('Download file:', fileId);
    // Implementation would go here
  }

  async handleViewFile(fileId) {
    console.log('View file:', fileId);
    // Implementation would go here
  }

  async handleEditFileInfo(fileId) {
    console.log('Edit file info:', fileId);
    // Implementation would go here
  }

  async handleDeleteFile(fileId) {
    if (await confirm('Are you sure you want to delete this file?')) {
      try {
        // Delete logic would go here
        await this.components.fileManager.loadFiles(); // Refresh
        showSuccess('File deleted successfully');
      } catch (error) {
        showError('Failed to delete file');
      }
    }
  }

  async loadOverview() {
    try {
      const { project } = this;
      if (!project) return;

      // Helper: escape HTML
      const esc = (str) => String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

      // Helper: format date
      const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'}) : '-';

      // Helper: format currency
      const fmtCurrency = (n) => n ? new Intl.NumberFormat('en-US',{style:'currency',currency:'EUR',minimumFractionDigits:0}).format(n) : '-';

      // Load tasks & files counts
      let tasks = [];
      let files = [];
      let milestones = [];
      let teamMembers = [];

      if (this.isDemo) {
        const tasksData = await demoServices.tasks.getByProject(this.projectId);
        tasks = [...(tasksData.todo||[]), ...(tasksData.in_progress||[]), ...(tasksData.done||[])];
        files = await demoServices.files.getByProject(this.projectId);
        milestones = await demoServices.milestones.getByProject(this.projectId);
        teamMembers = await demoServices.teamMembers.getByProject(this.projectId);
      } else {
        const [{ data: t }, { data: f }] = await Promise.all([
          supabase.from('tasks').select('*').eq('project_id', this.projectId),
          supabase.from('project_files').select('*').eq('project_id', this.projectId)
        ]);
        tasks = t || [];
        files = f || [];
      }

      const totalTasks = tasks.length;
      const doneTasks = tasks.filter(t => t.status === 'done').length;
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
      const progress = project.progress_percentage ?? project.progress ?? 0;
      const projectType = project.project_type || project.type || '-';
      const statusText = project.status ? project.status.charAt(0).toUpperCase() + project.status.slice(1).replace('_', ' ') : '-';

      // Populate Overview card fields (using querySelectorAll to target only inside #overview tab)
      const overviewTab = document.getElementById('overview');
      if (overviewTab) {
        const setEl = (id, val) => {
          const el = overviewTab.querySelector(`#${id}`);
          if (el) el.textContent = val;
        };
        setEl('projectType', projectType);
        setEl('projectStatus', statusText);
        setEl('projectStartDate', fmtDate(project.start_date));
        setEl('projectEndDate', fmtDate(project.end_date));
        setEl('projectBudget', project.budget ? fmtCurrency(project.budget) : '-');
        setEl('projectProgress', `${progress}%`);
        setEl('projectDescriptionOverview', project.description || 'No description provided.');

        const progressBarEl = overviewTab.querySelector('#projectProgressBar');
        if (progressBarEl) {
          progressBarEl.style.width = `${progress}%`;
          progressBarEl.setAttribute('aria-valuenow', progress);
        }

        // Quick Stats
        setEl('totalTasks', totalTasks);
        setEl('completedTasks', doneTasks);
        setEl('inProgressTasks', inProgressTasks);
        setEl('totalFilesOverview', files.length);
        setEl('teamMembers', teamMembers.length || 1);
      }

      // Populate milestones
      const milestonesContent = document.getElementById('milestonesContent');
      if (milestonesContent) {
        if (milestones.length === 0) {
          milestonesContent.innerHTML = `<div class="text-center py-4"><i class="bi bi-flag text-muted fs-2 opacity-25"></i><p class="text-muted small mb-0 mt-2">No milestones yet</p></div>`;
        } else {
          milestonesContent.innerHTML = milestones.slice(0, 5).map(m => `
            <div class="d-flex align-items-start mb-3 pb-3 border-bottom">
              <i class="bi bi-flag-fill fs-4 me-3 ${m.status==='completed'?'text-success':m.status==='in_progress'?'text-primary':'text-secondary'}"></i>
              <div class="flex-grow-1">
                <div class="fw-semibold">${esc(m.title)}</div>
                ${m.description ? `<div class="text-muted small">${esc(m.description)}</div>` : ''}
                <div class="small text-muted mt-1"><i class="bi bi-calendar me-1"></i>Due: ${fmtDate(m.due_date)}</div>
              </div>
              <span class="badge ms-2 ${m.status==='completed'?'bg-success':m.status==='in_progress'?'bg-primary':'bg-secondary'}">${(m.status||'pending').replace('_',' ')}</span>
            </div>`).join('');
        }
      }

      // Populate team preview
      const teamPreview = document.getElementById('teamPreview');
      if (teamPreview) {
        if (teamMembers.length === 0) {
          teamPreview.innerHTML = `<div class="text-center py-4"><i class="bi bi-people text-muted fs-2 opacity-25"></i><p class="text-muted small mb-0 mt-2">No team members yet</p></div>`;
        } else {
          const shown = teamMembers.slice(0, 4);
          const extra = teamMembers.length - shown.length;
          teamPreview.innerHTML = shown.map(m => `
            <div class="d-flex align-items-center mb-3">
              <div class="avatar-circle me-2 bg-primary text-white"><i class="bi bi-person-fill"></i></div>
              <div>
                <div class="fw-semibold small">${esc(m.name || m.full_name || 'Member')}</div>
                <div class="text-muted" style="font-size:.75rem;">${esc(m.role || m.job_title || 'Team Member')}</div>
              </div>
            </div>`).join('') + (extra > 0 ? `<div class="text-center mt-1"><small class="text-muted">+${extra} more member${extra>1?'s':''}</small></div>` : '');
        }
      }

    } catch (error) {
      console.error('Error loading overview:', error);
      showError('Failed to load project overview');
    }
  }

  async loadTimeline() {
    try {
      // Load timeline/Gantt chart data
      console.log('Loading timeline for project:', this.projectId);
    } catch (error) {
      console.error('Error loading timeline:', error);
    }
  }

  loadInitialContent() {
    // Load content for the initially active tab
    const activeTab = document.querySelector('.nav-tabs .nav-link.active');
    if (activeTab) {
      const tabId = activeTab.getAttribute('id');
      
      switch (tabId) {
        case 'tasks-tab':
          this.components.taskBoard.loadTasks();
          break;
        case 'files-tab':
          this.components.fileManager.loadFiles();
          break;
        case 'timeline-tab':
          this.loadTimeline();
          break;
        case 'overview-tab':
        default:
          this.loadOverview();
      }
    } else {
      // No active tab found - default to overview
      this.loadOverview();
    }
  }

  /**
   * Get current project data
   * @returns {Object} Current project
   */
  getProject() {
    return this.project;
  }

  /**
   * Update project data
   * @param {Object} updates - Updated project data
   */
  updateProject(updates) {
    this.project = { ...this.project, ...updates };
    this.components.header.updateProject(updates);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ProjectDetailsController();
});

// Export for external use
export function initProjectDetails() {
  return new ProjectDetailsController();
}

// Export the controller class
export { ProjectDetailsController };