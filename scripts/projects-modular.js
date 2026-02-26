/**
 * Projects Page Controller - Modular Version
 * Manages projects listing with filtering, search, and CRUD operations
 */
import { supabase, isSupabaseConfigured } from '../services/supabase.js';
import { showError, showSuccess, showLoading, hideLoading, confirm } from '../utils/uiModular.js';
import { NavBar } from './components/NavBar.js';
import { ProjectCard } from './components/ProjectCard.js';
import { isDemoMode, isAdminUser, demoServices, DEMO_USER } from '../utils/demoMode.js';

class ProjectsController {
  constructor() {
    // CHECK DEMO MODE FIRST - before anything else!
    const urlParams = new URLSearchParams(window.location.search);
    const forceDemo = urlParams.get('demo') === 'true';

    this.projects = [];
    this.filteredProjects = [];

    // Set demo mode BEFORE checking authentication:
    // - ?demo=true → always demo
    // - admin user (without ?demo=false) → demo
    // - regular authenticated user → real Supabase data
    this.isDemo = forceDemo || (isAdminUser() && urlParams.get('demo') !== 'false');

    // Log which mode we're in
    console.log(`🎯 ProjectsController Mode: ${this.isDemo ? 'DEMO' : 'REAL'}`);
    console.log(`👤 Is Admin: ${isAdminUser()}`);
    console.log(`🔐 Supabase configured: ${isSupabaseConfigured()}`);
    console.log(`🔗 URL: ${window.location.href}`);

    this.currentUser = null;
    this.components = {};
    this.currentView = 'list'; // 'grid' or 'list'
    this.filters = {
      search: '',
      type: '',
      status: '',
      sortBy: 'updated_at',
      sortOrder: 'desc'
    };

    this.init();
  }

  async init() {
    try {
      console.log('🚀 Initializing projects page...');

      // Handle demo mode vs real mode
      if (this.isDemo) {
        console.log('🎭 DEMO MODE - Skipping authentication');
        this.currentUser = DEMO_USER;

        // Show demo banner
        const demoBanner = document.getElementById('demoBanner');
        if (demoBanner) {
          demoBanner.style.display = 'block';
          console.log('✅ Demo banner shown');
        }
      } else {
        console.log('🔐 REAL MODE - Authenticating with Supabase...');

        if (!isSupabaseConfigured()) {
          console.error('❌ Supabase not configured - check .env file');
          hideLoading();
          showError('App not configured. Please check your environment settings.');
          return;
        }

        try {
          await this.resolveCurrentUser();
          console.log('✅ User authenticated:', this.currentUser.email);
        } catch (authError) {
          console.error('❌ Authentication failed:', authError);
          hideLoading();
          showError('Please log in to view your projects');

          setTimeout(() => {
            console.log('🔄 Redirecting to login page...');
            window.location.href = '../pages/login.html';
          }, 2000);

          return; // Stop execution
        }
      }

      // Initialize navbar (now using static HTML in projects.html)
      // console.log('📱 Initializing navbar...');
      // this.initNavBar();

      // Load projects data
      console.log('📦 Loading projects...');
      await this.loadProjects();

      // Setup event listeners
      console.log('🎧 Setting up event listeners...');
      this.initEventListeners();

      // Render initial view
      console.log('🎨 Rendering projects...');
      this.renderProjects();

      // Update statistics
      console.log('📊 Updating statistics...');
      this.updateStats();

      console.log('✅ Projects page initialized successfully!');
      console.log(`📊 Total projects loaded: ${this.projects.length}`);

    } catch (error) {
      console.error('❌ CRITICAL ERROR in init():', error);
      console.error('Error stack:', error.stack);
      hideLoading();
      showError('Failed to load projects page. Please refresh and try again.');
    }
  }

  async resolveCurrentUser() {
    console.log('🔍 Resolving current user...');

    // This method should ONLY be called in real mode
    if (this.isDemo) {
      console.warn('⚠️ resolveCurrentUser called in demo mode - this should not happen');
      return;
    }

    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.error('❌ Supabase auth error:', error);
      throw new Error('User not authenticated');
    }

    if (!data?.user) {
      console.warn('❌ No user data returned from Supabase');
      throw new Error('User not authenticated');
    }

    this.currentUser = data.user;
    console.log('✅ User resolved:', {
      id: data.user.id,
      email: data.user.email
    });
  }

  initNavBar() {
    const navbarContainer = document.getElementById('navbarContainer');
    if (navbarContainer) {
      this.components.navbar = new NavBar('navbarContainer', {
        menuItems: [
          { text: 'Dashboard', href: './dashboard.html', icon: 'bi-speedometer2', active: false },
          { text: 'Projects', href: './projects.html', icon: 'bi-folder', active: true },
          { text: 'Tasks', href: './tasks.html', icon: 'bi-check-square', active: false },
          { text: 'Files', href: './files.html', icon: 'bi-file-earmark', active: false }
        ]
      });
    }
  }

  async loadProjects() {
    try {
      showLoading('Loading projects...');
      console.log('📦 loadProjects() called in mode:', this.isDemo ? 'DEMO' : 'REAL');

      if (this.isDemo) {
        console.log('🎭 Fetching DEMO projects...');
        this.projects = await demoServices.projects.getAll(DEMO_USER.id);
        console.log(`✅ Loaded ${this.projects.length} demo projects:`, this.projects.map(p => p.title));
      } else {
        console.log('🔐 Fetching REAL projects from Supabase...');
        console.log('Current user ID:', this.currentUser?.id);

        const { data, error } = await supabase
          .from('projects')
          .select(`
            *,
            team_members:project_members(
              user:profiles(id, full_name, avatar_url)
            ),
            memberships:project_members(user_id)
          `)
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('❌ Supabase query error:', error);
          throw error;
        }

        console.log(`📊 Received ${data?.length || 0} projects from Supabase`);

        this.projects = (data || [])
          .filter(project => (
            project.user_id === this.currentUser.id ||
            (project.memberships || []).some(member => member.user_id === this.currentUser.id)
          ))
          .map(({ memberships, ...project }) => project);

        console.log(`✅ Filtered to ${this.projects.length} projects for user`);
      }

      this.filteredProjects = [...this.projects];
      console.log('✅ Projects loaded successfully');

    } catch (error) {
      console.error('❌ Error in loadProjects():', error);
      showError('Failed to load projects');
      this.projects = [];
      this.filteredProjects = [];
    } finally {
      hideLoading();
    }
  }

  initEventListeners() {
    // View toggle buttons
    const gridViewBtn = document.getElementById('gridViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    
    if (gridViewBtn) {
      gridViewBtn.addEventListener('click', () => this.switchView('grid'));
    }
    
    if (listViewBtn) {
      listViewBtn.addEventListener('click', () => this.switchView('list'));
    }
    
    // Filter controls
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value;
        this.applyFilters();
      });
    }

    // Status chips (All, Active, Completed, Planning)
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const filter = chip.getAttribute('data-filter');
        this.filters.status = filter === 'all' ? '' : filter;

        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        this.applyFilters();
      });
    });
    
    const typeFilter = document.getElementById('typeFilter');
    if (typeFilter) {
      typeFilter.addEventListener('change', (e) => {
        this.filters.type = e.target.value;
        this.applyFilters();
      });
    }
    
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.filters.status = e.target.value;
        this.applyFilters();
      });
    }
    
    const sortSelect = document.getElementById('sortProjects');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        const [sortBy, sortOrder] = e.target.value.split('-');
        this.filters.sortBy = sortBy;
        this.filters.sortOrder = sortOrder;
        this.applyFilters();
      });
    }
    
    // Create project button
    const createBtn = document.getElementById('newProjectBarBtn');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.handleCreateProject());
    }
    
    // Global search listener
    window.addEventListener('globalSearch', (event) => {
      this.filters.search = event.detail.query;
      this.applyFilters();
    });
  }

  switchView(view) {
    this.currentView = view;
    
    // Update button states
    const gridViewBtn = document.getElementById('gridViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    
    if (gridViewBtn) gridViewBtn.classList.toggle('active', view === 'grid');
    if (listViewBtn) listViewBtn.classList.toggle('active', view === 'list');
    
    // Re-render projects with new view
    this.renderProjects();
  }

  applyFilters() {
    let filtered = [...this.projects];
    
    // Apply search filter
    if (this.filters.search) {
      const searchTerm = this.filters.search.toLowerCase();
      filtered = filtered.filter(project =>
        (project.title || '').toLowerCase().includes(searchTerm) ||
        (project.description || '').toLowerCase().includes(searchTerm) ||
        (project.type || project.project_type || '').toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply type filter
    if (this.filters.type) {
      filtered = filtered.filter(project => (project.type || project.project_type) === this.filters.type);
    }
    
    // Apply status filter
    if (this.filters.status) {
      filtered = filtered.filter(project => project.status === this.filters.status);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let valueA = a[this.filters.sortBy];
      let valueB = b[this.filters.sortBy];
      
      // Handle date strings
      if (this.filters.sortBy.includes('_at') || this.filters.sortBy.includes('_date')) {
        valueA = new Date(valueA || 0);
        valueB = new Date(valueB || 0);
      }
      
      // Handle numeric values
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return this.filters.sortOrder === 'desc' ? valueB - valueA : valueA - valueB;
      }
      
      // Handle string values
      const comparison = String(valueA || '').localeCompare(String(valueB || ''));
      return this.filters.sortOrder === 'desc' ? -comparison : comparison;
    });
    
    this.filteredProjects = filtered;
    this.renderProjects();
    this.updateStats();
  }

  renderProjects() {
    const tableContainer = document.getElementById('projectsTableContainer');
    const gridContainer = document.getElementById('projectsGridContainer');
    const grid = document.getElementById('projectsGrid');
    const tableBody = document.getElementById('projectsTableBody');
    const emptyState = document.getElementById('emptyState');

    if (!tableContainer || !gridContainer || !grid || !tableBody) return;

    if (this.filteredProjects.length === 0) {
      tableContainer.style.display = 'none';
      gridContainer.style.display = 'none';
      if (emptyState) emptyState.style.display = '';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    
    if (this.currentView === 'grid') {
      tableContainer.style.display = 'none';
      gridContainer.style.display = '';
      this.renderGridView(grid);
    } else {
      gridContainer.style.display = 'none';
      tableContainer.style.display = '';
      this.renderListView(tableBody);
    }
  }

  renderEmptyState(container) {
    const hasFilters = this.filters.search || this.filters.type || this.filters.status;
    
    container.innerHTML = `
      <div class="col-12">
        <div class="text-center py-5">
          <i class="bi bi-folder2-open fs-1 text-muted mb-3 d-block"></i>
          <h5 class="text-muted">${hasFilters ? 'No projects match your filters' : 'No projects yet'}</h5>
          <p class="text-muted">
            ${hasFilters 
              ? 'Try adjusting your search criteria or filters' 
              : 'Create your first project to get started'
            }
          </p>
          ${!hasFilters ? `
            <button class="btn btn-primary" onclick="window.location.href='./project-form.html'">
              <i class="bi bi-plus-circle me-2"></i>
              Create Project
            </button>
          ` : `
            <button class="btn btn-outline-secondary" onclick="projectsController.clearFilters()">
              <i class="bi bi-x-circle me-2"></i>
              Clear Filters
            </button>
          `}
        </div>
      </div>
    `;
  }

  renderGridView(container) {
    container.className = 'row g-4';
    container.innerHTML = '';
    
    this.filteredProjects.forEach(project => {
      const projectCard = new ProjectCard(project, {
        showActions: true,
        showProgress: true,
        showTeam: true,
        showDates: false,
        cardSize: 'normal',
        onClick: (project) => this.handleViewProject(project),
        onEdit: (project) => this.handleEditProject(project),
        onDelete: (project) => this.handleDeleteProject(project),
        onShare: (project) => this.handleManageMembers(project)
      });
      
      container.appendChild(projectCard.render());
    });
  }

  renderListView(tbody) {
    tbody.innerHTML = '';
    this.filteredProjects.forEach(project => {
      const row = this.createProjectRow(project);
      tbody.appendChild(row);
    });
  }

  createProjectRow(project) {
    const row = document.createElement('tr');
    row.className = 'project-row';
    row.dataset.projectId = project.id;
    
    const progress = project.progress ?? project.progress_percentage ?? 0;
    const teamSize = project.team_members ? project.team_members.length : 0;
    const budget = Number(project.budget || 0);
    const deadline = project.end_date || project.deadline || null;
    
    row.innerHTML = `
      <td>
        <div class="d-flex align-items-center">
          <i class="bi ${this.getTypeIcon(project.type || project.project_type)} text-primary me-2"></i>
          <div>
            <div class="fw-medium">${project.title}</div>
            <small class="text-muted">${project.description ? project.description.substring(0, 50) + '...' : ''}</small>
          </div>
        </div>
      </td>
      <td><span class="badge bg-secondary">${project.type || project.project_type || 'Other'}</span></td>
      <td><span class="badge ${this.getStatusBadgeClass(project.status)}">${this.formatStatus(project.status)}</span></td>
      <td>
        <small class="text-muted">
          <i class="bi bi-people me-1"></i>
          ${teamSize} member${teamSize !== 1 ? 's' : ''}
        </small>
      </td>
      <td>
        <small class="text-muted">
          ${budget > 0 ? `€ ${budget.toLocaleString()}` : '-'}
        </small>
      </td>
      <td>
        <small class="text-muted">
          ${deadline ? this.formatDate(deadline) : '-'}
        </small>
      </td>
      <td>
        <div class="d-flex align-items-center">
          <div class="progress me-2" style="width: 60px; height: 6px;">
            <div class="progress-bar bg-${this.getProgressColor(progress)}" style="width: ${progress}%"></div>
          </div>
          <small>${progress}%</small>
        </div>
      </td>
      <td>
        <div class="btn-group" role="group">
          <button class="btn btn-sm btn-outline-primary" onclick="projectsController.handleViewProject(${JSON.stringify(project).replace(/"/g, '&quot;')})" title="View">
            <i class="bi bi-eye"></i>
          </button>
          <button class="btn btn-sm btn-outline-primary" onclick="projectsController.handleEditProject(${JSON.stringify(project).replace(/"/g, '&quot;')})" title="Edit">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-primary" onclick="projectsController.handleManageMembers(${JSON.stringify(project).replace(/"/g, '&quot;')})" title="Manage Members">
            <i class="bi bi-people"></i>
          </button>
          <button class="btn btn-sm btn-outline-primary" onclick="projectsController.handleDeleteProject(${JSON.stringify(project).replace(/"/g, '&quot;')})" title="Delete">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    `;
    
    return row;
  }

  updateStats() {
    // Update filter chip counts
    const allBtn = document.querySelector('[data-filter="all"] .chip-count');
    const activeBtn = document.querySelector('[data-filter="active"] .chip-count');
    const completedBtn = document.querySelector('[data-filter="completed"] .chip-count');
    const planningBtn = document.querySelector('[data-filter="planning"] .chip-count');
    
    if (allBtn) allBtn.textContent = this.projects.length;
    
    if (activeBtn) {
      const active = this.projects.filter(p => p.status === 'active').length;
      activeBtn.textContent = active;
    }
    
    if (completedBtn) {
      const completed = this.projects.filter(p => p.status === 'completed').length;
      completedBtn.textContent = completed;
    }
    
    if (planningBtn) {
      const planning = this.projects.filter(p => p.status === 'planning').length;
      planningBtn.textContent = planning;
    }
  }

  // Event handlers
  handleViewProject(project) {
    window.location.href = `./project-details.html?id=${project.id}`;
  }

  handleEditProject(project) {
    window.location.href = `./project-form.html?id=${project.id}`;
  }

  handleManageMembers(project) {
    window.location.href = this.getMembersPageUrl(project.id);
  }

  async handleDeleteProject(project) {
    if (await confirm(`Are you sure you want to delete "${project.title}"?`)) {
      try {
        showLoading('Deleting project...');
        
        if (this.isDemo) {
          await demoServices.deleteProject(project.id);
        } else {
          const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', project.id);
          
          if (error) throw error;
        }
        
        // Remove from local arrays
        this.projects = this.projects.filter(p => p.id !== project.id);
        this.filteredProjects = this.filteredProjects.filter(p => p.id !== project.id);
        
        // Re-render
        this.renderProjects();
        this.updateStats();
        
        showSuccess('Project deleted successfully');
      } catch (error) {
        console.error('Error deleting project:', error);
        showError('Failed to delete project');
      } finally {
        hideLoading();
      }
    }
  }

  handleShareProject(project) {
    // Simple URL sharing for now
    const url = `${window.location.origin}/pages/project-details.html?id=${project.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: project.title,
        text: project.description,
        url: url
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url).then(() => {
        showSuccess('Project link copied to clipboard');
      });
    }
  }

  getMembersPageUrl(projectId) {
    const demoSuffix = this.isDemo ? '?demo=true' : '';

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `./project-users.html?id=${encodeURIComponent(projectId)}${this.isDemo ? '&demo=true' : ''}`;
    }

    return `/projects/${encodeURIComponent(projectId)}/users${demoSuffix}`;
  }

  handleCreateProject() {
    const modalEl = document.getElementById('newProjectModal');
    if (modalEl && window.bootstrap?.Modal) {
      window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
      return;
    }
    window.location.href = './project-form.html';
  }

  clearFilters() {
    // Reset all filters
    this.filters = {
      search: '',
      type: '',
      status: '',
      sortBy: 'updated_at',
      sortOrder: 'desc'
    };
    
    // Reset form controls
    const searchInput = document.getElementById('searchInput');
    const typeFilter = document.getElementById('typeFilter');
    const statusFilter = document.getElementById('statusFilter');
    const sortSelect = document.getElementById('sortProjects');
    
    if (searchInput) searchInput.value = '';
    if (typeFilter) typeFilter.value = '';
    if (statusFilter) statusFilter.value = '';
    if (sortSelect) sortSelect.value = 'updated_at-desc';

    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.classList.toggle('active', chip.getAttribute('data-filter') === 'all');
    });
    
    // Apply filters (which will show all projects)
    this.applyFilters();
  }

  // Helper methods (same as ProjectCard)
  getTypeIcon(type) {
    const icons = {
      'Academic & Research': 'bi-book',
      'Corporate/Business': 'bi-building',
      'EU-Funded Project': 'bi-flag',
      'Public Initiative': 'bi-people',
      'Personal/Other': 'bi-person'
    };
    return icons[type] || 'bi-folder';
  }

  getStatusBadgeClass(status) {
    const classes = {
      planning: 'bg-secondary',
      active: 'bg-primary',
      completed: 'bg-success',
      paused: 'bg-warning text-dark',
      archived: 'bg-dark'
    };
    return classes[status] || 'bg-secondary';
  }

  formatStatus(status) {
    const labels = {
      planning: 'Planning',
      active: 'Active',
      completed: 'Completed',
      paused: 'Paused',
      archived: 'Archived'
    };
    return labels[status] || status;
  }

  getProgressColor(progress) {
    if (progress >= 80) return 'success';
    if (progress >= 50) return 'primary';
    if (progress >= 25) return 'warning';
    return 'danger';
  }

  formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  }
}

// Export for external use
export function initProjects() {
  if (!window.projectsController) {
    window.projectsController = new ProjectsController();
  }
  return window.projectsController;
}