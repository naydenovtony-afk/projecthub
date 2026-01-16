/**
 * Demo Mode System - Provides mock data for demonstration
 * Toggle DEMO_MODE to switch between demo and production
 */

// Configuration
export const DEMO_MODE = true; // Set to false for production with real Supabase

// Demo user data
export const DEMO_USER = {
  id: 'demo-user-123',
  email: 'demo@projecthub.com',
  full_name: 'Demo User',
  avatar_url: null,
  bio: 'Exploring ProjectHub features',
  role: 'user',
  created_at: '2025-01-01T00:00:00Z'
};

export const ADMIN_USER = {
  id: 'admin-user-456',
  email: 'admin@projecthub.com',
  full_name: 'Admin User',
  avatar_url: null,
  bio: 'System Administrator',
  role: 'admin',
  created_at: '2025-01-01T00:00:00Z'
};

// Demo projects data
export const DEMO_PROJECTS = [
  {
    id: 'proj-1',
    user_id: 'demo-user-123',
    title: 'Research Project Alpha',
    description: 'Comprehensive research on AI applications in project management. This multi-year study examines how artificial intelligence can optimize project workflows, predict risks, and improve team collaboration across diverse project environments.',
    project_type: 'Academic & Research',
    status: 'active',
    visibility: 'public',
    start_date: '2025-10-01',
    end_date: '2026-06-30',
    budget: 85000,
    funding_source: 'National Science Foundation',
    cover_image_url: null,
    progress_percentage: 65,
    created_at: '2025-10-01T08:00:00Z',
    updated_at: '2026-01-15T14:30:00Z'
  },
  {
    id: 'proj-2',
    user_id: 'demo-user-123',
    title: 'Corporate Website Redesign',
    description: 'Complete overhaul of company website with modern design, improved UX, and responsive layout. Includes new CMS integration, performance optimization, and accessibility improvements for better user engagement.',
    project_type: 'Corporate/Business',
    status: 'active',
    visibility: 'private',
    start_date: '2025-11-01',
    end_date: null,
    budget: 45000,
    funding_source: null,
    cover_image_url: null,
    progress_percentage: 45,
    created_at: '2025-11-01T09:00:00Z',
    updated_at: '2026-01-14T16:45:00Z'
  },
  {
    id: 'proj-3',
    user_id: 'demo-user-123',
    title: 'EU Digital Skills Initiative',
    description: 'Multi-country initiative to improve digital literacy across underserved communities. Partnership with 5 EU member states to deliver comprehensive training programs, workshops, and certification courses.',
    project_type: 'EU-Funded Project',
    status: 'planning',
    visibility: 'public',
    start_date: '2026-02-01',
    end_date: '2027-12-31',
    budget: 250000,
    funding_source: 'Erasmus+ Programme',
    cover_image_url: null,
    progress_percentage: 15,
    created_at: '2026-01-01T10:00:00Z',
    updated_at: '2026-01-10T11:20:00Z'
  },
  {
    id: 'proj-4',
    user_id: 'demo-user-123',
    title: 'Public Health Campaign',
    description: 'Community health awareness and vaccination campaign targeting rural areas. Includes mobile clinics, educational workshops, social media outreach, and partnership with local healthcare providers.',
    project_type: 'Public Initiative',
    status: 'active',
    visibility: 'public',
    start_date: '2025-07-01',
    end_date: '2026-03-31',
    budget: 120000,
    funding_source: 'Ministry of Health',
    cover_image_url: null,
    progress_percentage: 80,
    created_at: '2025-07-01T08:30:00Z',
    updated_at: '2026-01-13T15:10:00Z'
  },
  {
    id: 'proj-5',
    user_id: 'demo-user-123',
    title: 'Personal Portfolio Website',
    description: 'Personal developer portfolio showcasing projects, blog posts, and technical articles. Built with modern web technologies including responsive design, dark mode, and optimized performance.',
    project_type: 'Personal/Other',
    status: 'completed',
    visibility: 'public',
    start_date: '2024-01-01',
    end_date: '2024-06-30',
    budget: null,
    funding_source: null,
    cover_image_url: null,
    progress_percentage: 100,
    created_at: '2024-01-01T12:00:00Z',
    updated_at: '2024-06-30T18:00:00Z'
  }
];

// Demo tasks data
export const DEMO_TASKS = [
  // Project 1 tasks
  { id: 'task-1', project_id: 'proj-1', title: 'Literature review and background research', description: 'Comprehensive review of existing research on AI in project management, covering 50+ academic papers and industry reports', status: 'done', priority: 'high', due_date: null, assigned_to: 'demo-user-123', created_at: '2025-10-05T09:00:00Z', updated_at: '2025-11-10T16:30:00Z' },
  { id: 'task-2', project_id: 'proj-1', title: 'Design research methodology', description: 'Create detailed research methodology including data collection methods, sample selection, and analysis framework', status: 'done', priority: 'high', due_date: null, assigned_to: 'demo-user-123', created_at: '2025-10-10T10:00:00Z', updated_at: '2025-11-20T14:00:00Z' },
  { id: 'task-3', project_id: 'proj-1', title: 'Conduct interviews with industry experts', description: 'Schedule and conduct 15-20 structured interviews with project management professionals from various industries', status: 'in_progress', priority: 'medium', due_date: '2026-02-28', assigned_to: 'demo-user-123', created_at: '2025-11-01T11:00:00Z', updated_at: '2026-01-15T13:20:00Z' },
  { id: 'task-4', project_id: 'proj-1', title: 'Analyze collected data', description: 'Statistical analysis of interview data and pattern identification using qualitative and quantitative methods', status: 'todo', priority: 'high', due_date: '2026-04-30', assigned_to: null, created_at: '2025-11-15T12:00:00Z', updated_at: '2025-11-15T12:00:00Z' },
  { id: 'task-5', project_id: 'proj-1', title: 'Prepare final research paper', description: 'Write, format, and prepare research findings for academic publication in peer-reviewed journal', status: 'todo', priority: 'medium', due_date: '2026-06-15', assigned_to: null, created_at: '2025-12-01T13:00:00Z', updated_at: '2025-12-01T13:00:00Z' },
  
  // Project 2 tasks
  { id: 'task-6', project_id: 'proj-2', title: 'Create wireframes and mockups', description: 'Design comprehensive wireframes for all major pages and user flows', status: 'done', priority: 'high', due_date: null, assigned_to: 'demo-user-123', created_at: '2025-11-05T09:30:00Z', updated_at: '2025-11-25T17:00:00Z' },
  { id: 'task-7', project_id: 'proj-2', title: 'Develop homepage and main sections', description: 'Frontend development of homepage, about, services, and contact sections with responsive design', status: 'in_progress', priority: 'high', due_date: '2026-02-01', assigned_to: 'demo-user-123', created_at: '2025-11-20T10:00:00Z', updated_at: '2026-01-14T15:30:00Z' },
  { id: 'task-8', project_id: 'proj-2', title: 'Implement CMS integration', description: 'Integrate headless CMS for easy content management and updates by non-technical team members', status: 'in_progress', priority: 'medium', due_date: '2026-02-15', assigned_to: 'demo-user-123', created_at: '2025-12-01T11:00:00Z', updated_at: '2026-01-12T14:20:00Z' },
  { id: 'task-9', project_id: 'proj-2', title: 'Testing and quality assurance', description: 'Comprehensive testing including functionality, performance, accessibility, and cross-browser compatibility', status: 'todo', priority: 'high', due_date: '2026-03-01', assigned_to: null, created_at: '2025-12-10T12:00:00Z', updated_at: '2025-12-10T12:00:00Z' },
  
  // Project 3 tasks
  { id: 'task-10', project_id: 'proj-3', title: 'Submit project proposal to EU commission', description: 'Prepare and submit comprehensive project proposal including budget, timeline, and expected outcomes', status: 'done', priority: 'high', due_date: null, assigned_to: 'demo-user-123', created_at: '2025-11-01T08:00:00Z', updated_at: '2025-12-15T16:00:00Z' },
  { id: 'task-11', project_id: 'proj-3', title: 'Partner recruitment and agreements', description: 'Recruit partner organizations from 5 EU countries and finalize collaboration agreements', status: 'in_progress', priority: 'high', due_date: '2026-01-31', assigned_to: 'demo-user-123', created_at: '2025-12-15T09:00:00Z', updated_at: '2026-01-10T11:15:00Z' },
  { id: 'task-12', project_id: 'proj-3', title: 'Develop training curriculum', description: 'Create comprehensive digital skills curriculum covering basic to advanced topics', status: 'todo', priority: 'medium', due_date: '2026-03-15', assigned_to: null, created_at: '2026-01-05T10:00:00Z', updated_at: '2026-01-05T10:00:00Z' },
  
  // Project 4 tasks
  { id: 'task-13', project_id: 'proj-4', title: 'Secure funding and government approvals', description: 'Obtain necessary funding and regulatory approvals from health ministry', status: 'done', priority: 'high', due_date: null, assigned_to: 'demo-user-123', created_at: '2025-07-05T08:00:00Z', updated_at: '2025-08-01T17:00:00Z' },
  { id: 'task-14', project_id: 'proj-4', title: 'Establish mobile clinic schedule', description: 'Create detailed schedule for mobile clinic visits across 20 rural communities', status: 'done', priority: 'medium', due_date: null, assigned_to: 'demo-user-123', created_at: '2025-08-01T09:00:00Z', updated_at: '2025-09-15T16:00:00Z' },
  { id: 'task-15', project_id: 'proj-4', title: 'Community outreach and registration', description: 'Conduct community outreach, register participants, and schedule vaccination appointments', status: 'in_progress', priority: 'medium', due_date: '2026-02-01', assigned_to: 'demo-user-123', created_at: '2025-09-01T10:00:00Z', updated_at: '2026-01-13T14:50:00Z' },
  { id: 'task-16', project_id: 'proj-4', title: 'Campaign evaluation and final reporting', description: 'Evaluate campaign effectiveness and prepare comprehensive report for health ministry', status: 'todo', priority: 'low', due_date: '2026-03-31', assigned_to: null, created_at: '2025-10-01T11:00:00Z', updated_at: '2025-10-01T11:00:00Z' },
  
  // Project 5 tasks
  { id: 'task-17', project_id: 'proj-5', title: 'Design responsive layout and UI', description: 'Create modern, responsive design with dark mode support', status: 'done', priority: 'medium', due_date: null, assigned_to: 'demo-user-123', created_at: '2024-01-15T10:00:00Z', updated_at: '2024-02-28T15:00:00Z' },
  { id: 'task-18', project_id: 'proj-5', title: 'Implement blog with Markdown support', description: 'Build blog functionality with Markdown support and syntax highlighting', status: 'done', priority: 'medium', due_date: null, assigned_to: 'demo-user-123', created_at: '2024-03-01T11:00:00Z', updated_at: '2024-05-15T16:00:00Z' },
  { id: 'task-19', project_id: 'proj-5', title: 'Deploy to production with CI/CD', description: 'Set up continuous deployment pipeline and deploy to production', status: 'done', priority: 'high', due_date: null, assigned_to: 'demo-user-123', created_at: '2024-06-15T12:00:00Z', updated_at: '2024-06-30T18:00:00Z' }
];

// Demo project updates
export const DEMO_UPDATES = [
  { id: 'upd-1', project_id: 'proj-1', user_id: 'demo-user-123', update_type: 'milestone', update_text: 'Project kickoff meeting completed successfully with all stakeholders', metadata: {}, created_at: '2025-10-01T14:00:00Z' },
  { id: 'upd-2', project_id: 'proj-1', user_id: 'demo-user-123', update_type: 'task_completed', update_text: 'Completed comprehensive literature review phase - analyzed 52 research papers', metadata: {}, created_at: '2025-11-15T16:30:00Z' },
  { id: 'upd-3', project_id: 'proj-1', user_id: 'demo-user-123', update_type: 'general', update_text: 'Monthly progress update: 65% complete, on track for June 2026 delivery. Interview phase progressing well.', metadata: {}, created_at: '2026-01-10T10:00:00Z' },
  
  { id: 'upd-4', project_id: 'proj-2', user_id: 'demo-user-123', update_type: 'milestone', update_text: 'Design phase completed - all wireframes and mockups approved by stakeholders', metadata: {}, created_at: '2025-12-01T15:00:00Z' },
  { id: 'upd-5', project_id: 'proj-2', user_id: 'demo-user-123', update_type: 'general', update_text: 'Homepage development 70% complete - implementing responsive design and animations', metadata: {}, created_at: '2026-01-12T14:20:00Z' },
  
  { id: 'upd-6', project_id: 'proj-3', user_id: 'demo-user-123', update_type: 'status_changed', update_text: 'Project status changed from Draft to Planning after EU commission approval', metadata: {}, created_at: '2026-01-02T09:00:00Z' },
  { id: 'upd-7', project_id: 'proj-3', user_id: 'demo-user-123', update_type: 'milestone', update_text: 'Received official approval from EU commission - funding confirmed at €250,000', metadata: {}, created_at: '2026-01-08T11:00:00Z' },
  
  { id: 'upd-8', project_id: 'proj-4', user_id: 'demo-user-123', update_type: 'milestone', update_text: 'Successfully conducted 50+ vaccination sessions across rural communities', metadata: {}, created_at: '2026-01-05T13:00:00Z' },
  { id: 'upd-9', project_id: 'proj-4', user_id: 'demo-user-123', update_type: 'general', update_text: 'Major milestone: Reached 5,000 community members through outreach programs', metadata: {}, created_at: '2026-01-13T15:10:00Z' },
  
  { id: 'upd-10', project_id: 'proj-5', user_id: 'demo-user-123', update_type: 'status_changed', update_text: 'Project marked as completed - portfolio live and fully functional', metadata: {}, created_at: '2024-06-30T18:00:00Z' }
];

// Demo files metadata
export const DEMO_FILES = [
  { id: 'file-1', project_id: 'proj-1', task_id: null, file_url: '#', file_name: 'research-methodology.pdf', file_type: 'application/pdf', file_size: 2456789, category: 'document', caption: 'Detailed research methodology document', uploaded_by: 'demo-user-123', uploaded_at: '2025-10-15T10:30:00Z' },
  { id: 'file-2', project_id: 'proj-1', task_id: 'task-3', file_url: '#', file_name: 'interview-template.docx', file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', file_size: 156789, category: 'document', caption: 'Standardized interview questions template', uploaded_by: 'demo-user-123', uploaded_at: '2025-11-05T14:00:00Z' },
  { id: 'file-3', project_id: 'proj-2', task_id: 'task-6', file_url: '#', file_name: 'homepage-mockup.png', file_type: 'image/png', file_size: 3456789, category: 'image', caption: 'Final homepage design mockup', uploaded_by: 'demo-user-123', uploaded_at: '2025-11-25T16:45:00Z' },
  { id: 'file-4', project_id: 'proj-2', task_id: 'task-6', file_url: '#', file_name: 'wireframes.pdf', file_type: 'application/pdf', file_size: 5678901, category: 'document', caption: 'Complete wireframes for all pages', uploaded_by: 'demo-user-123', uploaded_at: '2025-11-10T11:20:00Z' },
  { id: 'file-5', project_id: 'proj-3', task_id: 'task-10', file_url: '#', file_name: 'eu-project-proposal.pdf', file_type: 'application/pdf', file_size: 8901234, category: 'deliverable', caption: 'Official EU funding proposal submission', uploaded_by: 'demo-user-123', uploaded_at: '2025-11-20T09:15:00Z' },
  { id: 'file-6', project_id: 'proj-4', task_id: null, file_url: '#', file_name: 'campaign-poster.jpg', file_type: 'image/jpeg', file_size: 2345678, category: 'image', caption: 'Health campaign promotional poster', uploaded_by: 'demo-user-123', uploaded_at: '2025-08-15T13:30:00Z' },
  { id: 'file-7', project_id: 'proj-4', task_id: null, file_url: '#', file_name: 'progress-report-q4-2025.pdf', file_type: 'application/pdf', file_size: 4567890, category: 'report', caption: 'Quarterly progress report for Q4 2025', uploaded_by: 'demo-user-123', uploaded_at: '2026-01-05T10:00:00Z' }
];

// Demo service functions
export const demoAuth = {
  getCurrentUser: () => Promise.resolve({ ...DEMO_USER }),
  isAuthenticated: () => Promise.resolve(true),
  isAdmin: () => Promise.resolve(false),
  login: (email, password) => {
    // Simulate login
    if (email === 'admin@projecthub.com') {
      return Promise.resolve({ success: true, user: ADMIN_USER });
    }
    return Promise.resolve({ success: true, user: DEMO_USER });
  },
  logout: () => {
    window.location.href = '/index.html';
    return Promise.resolve({ success: true });
  }
};

export const demoProjects = {
  getAll: (userId, filters = {}) => {
    let projects = [...DEMO_PROJECTS];
    
    // Apply type filter
    if (filters.type && filters.type !== 'all') {
      projects = projects.filter(p => p.project_type === filters.type);
    }
    
    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      projects = projects.filter(p => p.status === filters.status);
    }
    
    // Apply search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      projects = projects.filter(p => 
        p.title.toLowerCase().includes(search) || 
        (p.description && p.description.toLowerCase().includes(search))
      );
    }
    
    // Apply sorting
    if (filters.sort === 'oldest') {
      projects.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (filters.sort === 'name-asc') {
      projects.sort((a, b) => a.title.localeCompare(b.title));
    } else if (filters.sort === 'progress-desc') {
      projects.sort((a, b) => b.progress_percentage - a.progress_percentage);
    } else {
      // Default: newest first
      projects.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    
    return Promise.resolve(projects);
  },
  
  getById: (id) => {
    const project = DEMO_PROJECTS.find(p => p.id === id);
    return Promise.resolve(project || null);
  },
  
  getStats: (userId) => {
    const projects = DEMO_PROJECTS;
    const tasks = DEMO_TASKS;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const totalTasks = tasks.length;
    
    return Promise.resolve({
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'active').length,
      completedProjects: projects.filter(p => p.status === 'completed').length,
      totalTasks: totalTasks,
      activeTasks: tasks.filter(t => t.status === 'in_progress').length,
      completedTasks: completedTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      totalFiles: DEMO_FILES.length
    });
  },
  
  create: (projectData) => {
    // Simulate creation
    const newProject = {
      id: 'proj-new-' + Date.now(),
      ...projectData,
      user_id: DEMO_USER.id,
      progress_percentage: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    DEMO_PROJECTS.push(newProject);
    return Promise.resolve(newProject);
  },
  
  update: (id, updates) => {
    const index = DEMO_PROJECTS.findIndex(p => p.id === id);
    if (index !== -1) {
      DEMO_PROJECTS[index] = {
        ...DEMO_PROJECTS[index],
        ...updates,
        updated_at: new Date().toISOString()
      };
      return Promise.resolve(DEMO_PROJECTS[index]);
    }
    return Promise.resolve(null);
  },
  
  delete: (id) => {
    const index = DEMO_PROJECTS.findIndex(p => p.id === id);
    if (index !== -1) {
      DEMO_PROJECTS.splice(index, 1);
      return Promise.resolve({ success: true });
    }
    return Promise.resolve({ success: false });
  }
};

export const demoTasks = {
  getByProject: (projectId) => {
    const tasks = DEMO_TASKS.filter(t => t.project_id === projectId);
    return Promise.resolve({
      todo: tasks.filter(t => t.status === 'todo'),
      in_progress: tasks.filter(t => t.status === 'in_progress'),
      done: tasks.filter(t => t.status === 'done')
    });
  },
  
  getById: (taskId) => {
    const task = DEMO_TASKS.find(t => t.id === taskId);
    return Promise.resolve(task || null);
  },
  
  create: (taskData) => {
    const newTask = {
      id: 'task-new-' + Date.now(),
      ...taskData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    DEMO_TASKS.push(newTask);
    return Promise.resolve(newTask);
  },
  
  update: (taskId, updates) => {
    const index = DEMO_TASKS.findIndex(t => t.id === taskId);
    if (index !== -1) {
      DEMO_TASKS[index] = {
        ...DEMO_TASKS[index],
        ...updates,
        updated_at: new Date().toISOString()
      };
      return Promise.resolve(DEMO_TASKS[index]);
    }
    return Promise.resolve(null);
  },
  
  delete: (taskId) => {
    const index = DEMO_TASKS.findIndex(t => t.id === taskId);
    if (index !== -1) {
      DEMO_TASKS.splice(index, 1);
      return Promise.resolve({ success: true });
    }
    return Promise.resolve({ success: false });
  },
  
  toggleStatus: (taskId, newStatus) => {
    return demoTasks.update(taskId, { status: newStatus });
  }
};

export const demoFiles = {
  getByProject: (projectId, category = null) => {
    let files = DEMO_FILES.filter(f => f.project_id === projectId);
    if (category) {
      files = files.filter(f => f.category === category);
    }
    return Promise.resolve(files);
  },
  
  upload: (file, projectId, category) => {
    const newFile = {
      id: 'file-new-' + Date.now(),
      project_id: projectId,
      task_id: null,
      file_url: '#',
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      category: category,
      caption: '',
      uploaded_by: DEMO_USER.id,
      uploaded_at: new Date().toISOString()
    };
    DEMO_FILES.push(newFile);
    return Promise.resolve({ success: true, file: newFile });
  },
  
  delete: (fileId) => {
    const index = DEMO_FILES.findIndex(f => f.id === fileId);
    if (index !== -1) {
      DEMO_FILES.splice(index, 1);
      return Promise.resolve({ success: true });
    }
    return Promise.resolve({ success: false });
  }
};

export const demoUpdates = {
  getByProject: (projectId) => {
    const updates = DEMO_UPDATES.filter(u => u.project_id === projectId);
    return Promise.resolve(updates);
  },
  
  create: (updateData) => {
    const newUpdate = {
      id: 'upd-new-' + Date.now(),
      ...updateData,
      user_id: DEMO_USER.id,
      metadata: {},
      created_at: new Date().toISOString()
    };
    DEMO_UPDATES.push(newUpdate);
    return Promise.resolve(newUpdate);
  }
};

// Demo contacts data
export const DEMO_CONTACTS = [
  {
    id: 'contact-1',
    user_id: 'demo-user-123',
    contact_user_id: 'user-contact-1', // If they have account
    name: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    company: 'Tech Solutions Inc',
    job_title: 'Project Manager',
    avatar_url: null,
    is_favorite: true,
    projects_together: ['proj-1', 'proj-2'], // Array of shared project IDs
    added_at: '2025-11-15T10:00:00Z',
    last_collaboration: '2026-01-14T16:30:00Z'
  },
  {
    id: 'contact-2',
    user_id: 'demo-user-123',
    contact_user_id: null, // Not registered yet
    name: 'Michael Chen',
    email: 'michael.chen@email.com',
    company: 'Research Institute',
    job_title: 'Senior Researcher',
    avatar_url: null,
    is_favorite: false,
    projects_together: ['proj-1'],
    added_at: '2025-10-20T14:00:00Z',
    last_collaboration: '2026-01-10T11:20:00Z'
  },
  {
    id: 'contact-3',
    user_id: 'demo-user-123',
    contact_user_id: 'user-contact-3',
    name: 'Emma Rodriguez',
    email: 'emma.r@consultancy.com',
    company: 'Global Consultancy',
    job_title: 'Business Analyst',
    avatar_url: null,
    is_favorite: false,
    projects_together: ['proj-2', 'proj-3'],
    added_at: '2025-12-01T09:00:00Z',
    last_collaboration: '2026-01-12T15:45:00Z'
  },
  {
    id: 'contact-4',
    user_id: 'demo-user-123',
    contact_user_id: null,
    name: 'David Kumar',
    email: 'david.kumar@university.edu',
    company: 'National University',
    job_title: 'Research Assistant',
    avatar_url: null,
    is_favorite: true,
    projects_together: ['proj-1'],
    added_at: '2025-10-10T11:00:00Z',
    last_collaboration: '2025-12-20T10:15:00Z'
  },
  {
    id: 'contact-5',
    user_id: 'demo-user-123',
    contact_user_id: 'user-contact-5',
    name: 'Lisa Anderson',
    email: 'lisa.a@healthorg.com',
    company: 'Health Organization',
    job_title: 'Program Coordinator',
    avatar_url: null,
    is_favorite: false,
    projects_together: ['proj-4'],
    added_at: '2025-07-15T08:00:00Z',
    last_collaboration: '2026-01-13T14:50:00Z'
  }
];

// Demo project shares
export const DEMO_PROJECT_SHARES = [
  {
    id: 'share-1',
    project_id: 'proj-1',
    shared_with_contact_id: 'contact-1',
    permission_level: 'editor', // viewer, contributor, editor
    shared_by: 'demo-user-123',
    shared_at: '2025-11-15T10:30:00Z'
  },
  {
    id: 'share-2',
    project_id: 'proj-1',
    shared_with_contact_id: 'contact-2',
    permission_level: 'contributor',
    shared_by: 'demo-user-123',
    shared_at: '2025-10-20T14:15:00Z'
  },
  {
    id: 'share-3',
    project_id: 'proj-2',
    shared_with_contact_id: 'contact-1',
    permission_level: 'contributor',
    shared_by: 'demo-user-123',
    shared_at: '2025-11-20T11:00:00Z'
  }
];

// Demo activity data
export const DEMO_ACTIVITY = [
  { id: 'act-1', user_id: 'demo-user-123', activity_type: 'project_created', activity_text: 'Created project "Research Project Alpha"', related_id: 'proj-1', created_at: '2025-10-01T08:00:00Z' },
  { id: 'act-2', user_id: 'demo-user-123', activity_type: 'task_completed', activity_text: 'Completed task "Literature review and background research"', related_id: 'task-1', created_at: '2025-11-10T16:30:00Z' },
  { id: 'act-3', user_id: 'demo-user-123', activity_type: 'contact_added', activity_text: 'Added Sarah Johnson as a contact', related_id: 'contact-1', created_at: '2025-11-15T10:00:00Z' },
  { id: 'act-4', user_id: 'demo-user-123', activity_type: 'project_shared', activity_text: 'Shared "Research Project Alpha" with Michael Chen', related_id: 'proj-1', created_at: '2025-10-20T14:15:00Z' },
  { id: 'act-5', user_id: 'demo-user-123', activity_type: 'file_uploaded', activity_text: 'Uploaded file "research-methodology.pdf" to Research Project Alpha', related_id: 'file-1', created_at: '2025-10-15T10:30:00Z' },
  { id: 'act-6', user_id: 'demo-user-123', activity_type: 'project_created', activity_text: 'Created project "Corporate Website Redesign"', related_id: 'proj-2', created_at: '2025-11-01T09:00:00Z' },
  { id: 'act-7', user_id: 'demo-user-123', activity_type: 'task_created', activity_text: 'Created task "Develop homepage and main sections"', related_id: 'task-7', created_at: '2025-11-20T10:00:00Z' },
  { id: 'act-8', user_id: 'demo-user-123', activity_type: 'contact_added', activity_text: 'Added Emma Rodriguez as a contact', related_id: 'contact-3', created_at: '2025-12-01T09:00:00Z' },
  { id: 'act-9', user_id: 'demo-user-123', activity_type: 'project_updated', activity_text: 'Updated progress on "Public Health Campaign" to 80%', related_id: 'proj-4', created_at: '2026-01-13T15:10:00Z' },
  { id: 'act-10', user_id: 'demo-user-123', activity_type: 'task_status_changed', activity_text: 'Changed task "Conduct interviews" status to In Progress', related_id: 'task-3', created_at: '2026-01-15T13:20:00Z' }
];

// Demo contacts service
export const demoContacts = {
  getAll: (userId) => {
    const contacts = DEMO_CONTACTS.filter(c => c.user_id === userId);
    return Promise.resolve(contacts);
  },
  
  getById: (contactId) => {
    const contact = DEMO_CONTACTS.find(c => c.id === contactId);
    return Promise.resolve(contact || null);
  },
  
  add: (contactData) => {
    const newContact = {
      id: 'contact-new-' + Date.now(),
      ...contactData,
      added_at: new Date().toISOString(),
      last_collaboration: null
    };
    DEMO_CONTACTS.push(newContact);
    return Promise.resolve(newContact);
  },
  
  update: (contactId, updates) => {
    const index = DEMO_CONTACTS.findIndex(c => c.id === contactId);
    if (index !== -1) {
      DEMO_CONTACTS[index] = { ...DEMO_CONTACTS[index], ...updates };
      return Promise.resolve(DEMO_CONTACTS[index]);
    }
    return Promise.resolve(null);
  },
  
  delete: (contactId) => {
    const index = DEMO_CONTACTS.findIndex(c => c.id === contactId);
    if (index !== -1) {
      DEMO_CONTACTS.splice(index, 1);
      return Promise.resolve({ success: true });
    }
    return Promise.resolve({ success: false });
  },
  
  toggleFavorite: (contactId) => {
    const contact = DEMO_CONTACTS.find(c => c.id === contactId);
    if (contact) {
      contact.is_favorite = !contact.is_favorite;
      return Promise.resolve(contact);
    }
    return Promise.resolve(null);
  },
  
  getSharedProjects: (contactId) => {
    const contact = DEMO_CONTACTS.find(c => c.id === contactId);
    if (contact && contact.projects_together) {
      const projects = DEMO_PROJECTS.filter(p => contact.projects_together.includes(p.id));
      return Promise.resolve(projects);
    }
    return Promise.resolve([]);
  }
};

// Demo activity service
export const demoActivity = {
  getByUser: (userId, filters = {}) => {
    let activities = DEMO_ACTIVITY.filter(a => a.user_id === userId);
    
    // Apply filters
    if (filters.type && filters.type !== 'all') {
      activities = activities.filter(a => a.activity_type === filters.type);
    }
    
    if (filters.days) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - filters.days);
      activities = activities.filter(a => new Date(a.created_at) >= cutoff);
    }
    
    // Sort by date descending
    activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    return Promise.resolve(activities);
  }
};

// Helper function
export const isDemoMode = () => DEMO_MODE;

// Export all demo services as a single object
export const demoServices = {
  auth: demoAuth,
  projects: demoProjects,
  tasks: demoTasks,
  files: demoFiles,
  updates: demoUpdates,
  contacts: demoContacts,
  activity: demoActivity
};
