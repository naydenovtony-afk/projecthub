// Demo Mode State Management
const DEMO_USER = {
  id: 'demo-user-123',
  email: 'demo@projecthub.com',
  full_name: 'Demo User',
  avatar_url: null,
  role: 'user',
  company: 'Demo Company',
  job_title: 'Project Manager',
  bio: 'Exploring ProjectHub features',
  created_at: '2025-01-01T00:00:00Z'
};

const DEMO_ADMIN = {
  id: 'demo-admin-456',
  email: 'admin@projecthub.com',
  full_name: 'Admin User',
  avatar_url: null,
  role: 'admin',
  company: 'ProjectHub',
  job_title: 'System Administrator',
  bio: 'Managing ProjectHub platform',
  created_at: '2025-01-01T00:00:00Z'
};

const DEMO_PROJECTS = [
  {
    id: 'proj-1',
    user_id: 'demo-user-123',
    title: 'AI Research Initiative',
    description: 'Comprehensive research on artificial intelligence applications in project management. This multi-year study examines how AI can optimize workflows, predict risks, and improve collaboration.',
    project_type: 'Academic & Research',
    status: 'active',
    visibility: 'public',
    start_date: '2025-10-01',
    end_date: '2026-06-30',
    budget: 85000,
    funding_source: 'National Science Foundation',
    cover_image_url: null,
    progress_percentage: 65,
    created_at: '2025-10-01T10:00:00Z',
    updated_at: '2026-01-20T15:30:00Z'
  },
  {
    id: 'proj-2',
    user_id: 'demo-user-123',
    title: 'Corporate Website Redesign',
    description: 'Complete overhaul of company website with modern design, improved UX, and responsive layout. Includes new CMS integration and performance optimization.',
    project_type: 'Corporate/Business',
    status: 'active',
    visibility: 'private',
    start_date: '2025-11-01',
    end_date: '2026-03-31',
    budget: 45000,
    funding_source: 'Internal Budget',
    cover_image_url: null,
    progress_percentage: 45,
    created_at: '2025-11-01T09:00:00Z',
    updated_at: '2026-01-21T11:20:00Z'
  },
  {
    id: 'proj-3',
    user_id: 'demo-user-123',
    title: 'EU Digital Skills Program',
    description: 'Multi-country initiative to improve digital literacy across underserved communities. Partnership with 5 EU member states to deliver comprehensive training programs.',
    project_type: 'EU-Funded Project',
    status: 'planning',
    visibility: 'public',
    start_date: '2026-02-01',
    end_date: '2027-12-31',
    budget: 250000,
    funding_source: 'Erasmus+ Programme',
    cover_image_url: null,
    progress_percentage: 15,
    created_at: '2025-12-15T14:00:00Z',
    updated_at: '2026-01-18T09:45:00Z'
  },
  {
    id: 'proj-4',
    user_id: 'demo-user-123',
    title: 'Community Health Campaign',
    description: 'Public health awareness and vaccination campaign targeting rural areas. Includes mobile clinics, educational workshops, and social media outreach.',
    project_type: 'Public Initiative',
    status: 'active',
    visibility: 'public',
    start_date: '2025-07-01',
    end_date: '2026-03-31',
    budget: 120000,
    funding_source: 'Ministry of Health',
    cover_image_url: null,
    progress_percentage: 80,
    created_at: '2025-07-01T08:00:00Z',
    updated_at: '2026-01-22T16:10:00Z'
  },
  {
    id: 'proj-5',
    user_id: 'demo-user-123',
    title: 'Personal Portfolio Website',
    description: 'Modern developer portfolio showcasing projects, blog posts, and technical articles. Built with cutting-edge web technologies.',
    project_type: 'Personal/Other',
    status: 'completed',
    visibility: 'public',
    start_date: '2024-01-01',
    end_date: '2024-06-30',
    budget: 0,
    funding_source: null,
    cover_image_url: null,
    progress_percentage: 100,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-06-30T18:00:00Z'
  }
];

// Demo tasks data
const DEMO_TASKS = [
  // Project 1 tasks
  { id: 'task-1', project_id: 'proj-1', title: 'Literature Review', description: 'Complete comprehensive review of existing research', status: 'done', priority: 'high', due_date: '2025-11-30', assigned_to: 'demo-user-123', created_at: '2025-10-05' },
  { id: 'task-2', project_id: 'proj-1', title: 'Research Methodology Design', description: 'Design and validate research approach', status: 'done', priority: 'high', due_date: '2025-12-15', assigned_to: 'demo-user-123', created_at: '2025-10-10' },
  { id: 'task-3', project_id: 'proj-1', title: 'Expert Interviews', description: 'Conduct interviews with 15+ industry experts', status: 'in_progress', priority: 'medium', due_date: '2026-02-28', assigned_to: 'demo-user-123', created_at: '2025-11-01' },
  { id: 'task-4', project_id: 'proj-1', title: 'Data Analysis', description: 'Analyze collected qualitative and quantitative data', status: 'todo', priority: 'high', due_date: '2026-04-30', assigned_to: 'demo-user-123', created_at: '2025-12-01' },
  { id: 'task-5', project_id: 'proj-1', title: 'Final Research Paper', description: 'Write and submit comprehensive research paper', status: 'todo', priority: 'high', due_date: '2026-06-15', assigned_to: 'demo-user-123', created_at: '2026-01-01' },
  
  // Project 2 tasks
  { id: 'task-6', project_id: 'proj-2', title: 'Wireframes & Mockups', description: 'Create detailed wireframes for all pages', status: 'done', priority: 'high', due_date: '2025-11-30', assigned_to: 'demo-user-123', created_at: '2025-11-05' },
  { id: 'task-7', project_id: 'proj-2', title: 'Homepage Development', description: 'Develop responsive homepage with new design', status: 'in_progress', priority: 'high', due_date: '2026-02-01', assigned_to: 'demo-user-123', created_at: '2025-12-01' },
  { id: 'task-8', project_id: 'proj-2', title: 'CMS Integration', description: 'Integrate and configure content management system', status: 'in_progress', priority: 'medium', due_date: '2026-02-15', assigned_to: 'demo-user-123', created_at: '2025-12-15' },
  { id: 'task-9', project_id: 'proj-2', title: 'Quality Assurance Testing', description: 'Comprehensive testing across browsers and devices', status: 'todo', priority: 'high', due_date: '2026-03-15', assigned_to: 'demo-user-123', created_at: '2026-01-01' },
  
  // Project 3 tasks
  { id: 'task-10', project_id: 'proj-3', title: 'Submit Project Proposal', description: 'Prepare and submit complete EU funding proposal', status: 'done', priority: 'high', due_date: '2025-12-20', assigned_to: 'demo-user-123', created_at: '2025-12-01' },
  { id: 'task-11', project_id: 'proj-3', title: 'Partner Recruitment', description: 'Recruit and sign agreements with country partners', status: 'in_progress', priority: 'high', due_date: '2026-01-31', assigned_to: 'demo-user-123', created_at: '2025-12-20' },
  { id: 'task-12', project_id: 'proj-3', title: 'Training Curriculum Development', description: 'Develop comprehensive digital skills curriculum', status: 'todo', priority: 'medium', due_date: '2026-03-15', assigned_to: 'demo-user-123', created_at: '2026-01-05' },
  
  // Project 4 tasks
  { id: 'task-13', project_id: 'proj-4', title: 'Secure Funding', description: 'Obtain government funding and approvals', status: 'done', priority: 'high', due_date: '2025-07-15', assigned_to: 'demo-user-123', created_at: '2025-07-01' },
  { id: 'task-14', project_id: 'proj-4', title: 'Mobile Clinic Schedule', description: 'Establish schedule for mobile clinic visits', status: 'done', priority: 'medium', due_date: '2025-08-01', assigned_to: 'demo-user-123', created_at: '2025-07-15' },
  { id: 'task-15', project_id: 'proj-4', title: 'Community Outreach', description: 'Conduct community registration and outreach', status: 'in_progress', priority: 'medium', due_date: '2026-02-01', assigned_to: 'demo-user-123', created_at: '2025-09-01' },
  { id: 'task-16', project_id: 'proj-4', title: 'Campaign Evaluation', description: 'Evaluate campaign effectiveness and prepare report', status: 'todo', priority: 'low', due_date: '2026-03-31', assigned_to: 'demo-user-123', created_at: '2026-01-01' },
  
  // Project 5 tasks
  { id: 'task-17', project_id: 'proj-5', title: 'Design & Layout', description: 'Create portfolio design and layout', status: 'done', priority: 'medium', due_date: '2024-03-01', assigned_to: 'demo-user-123', created_at: '2024-01-15' },
  { id: 'task-18', project_id: 'proj-5', title: 'Blog Implementation', description: 'Implement blog with markdown support', status: 'done', priority: 'medium', due_date: '2024-05-01', assigned_to: 'demo-user-123', created_at: '2024-03-01' },
  { id: 'task-19', project_id: 'proj-5', title: 'Deploy to Production', description: 'Deploy portfolio site to production hosting', status: 'done', priority: 'high', due_date: '2024-06-30', assigned_to: 'demo-user-123', created_at: '2024-06-01' }
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
const DEMO_ACTIVITY = [
  { id: 'act-1', project_id: 'proj-2', user_id: 'demo-user-123', activity_type: 'task_completed', activity_text: 'Completed task "Wireframes & Mockups"', created_at: '2026-02-14T10:30:00Z' },
  { id: 'act-2', project_id: 'proj-1', user_id: 'demo-user-123', activity_type: 'task_updated', activity_text: 'Updated task "Expert Interviews" progress', created_at: '2026-02-14T09:15:00Z' },
  { id: 'act-3', project_id: 'proj-4', user_id: 'demo-user-123', activity_type: 'project_updated', activity_text: 'Updated project progress to 80%', created_at: '2026-02-13T16:45:00Z' },
  { id: 'act-4', project_id: 'proj-2', user_id: 'demo-user-123', activity_type: 'file_uploaded', activity_text: 'Uploaded design mockup file', created_at: '2026-02-13T14:20:00Z' },
  { id: 'act-5', project_id: 'proj-3', user_id: 'demo-user-123', activity_type: 'task_created', activity_text: 'Created new task "Training Curriculum Development"', created_at: '2026-02-12T11:00:00Z' },
  { id: 'act-6', project_id: 'proj-1', user_id: 'demo-user-123', activity_type: 'milestone', activity_text: 'Reached milestone: Research methodology validated', created_at: '2026-02-11T15:30:00Z' },
  { id: 'act-7', project_id: 'proj-4', user_id: 'demo-user-123', activity_type: 'task_completed', activity_text: 'Completed task "Mobile Clinic Schedule"', created_at: '2026-02-10T13:45:00Z' },
  { id: 'act-8', project_id: 'proj-5', user_id: 'demo-user-123', activity_type: 'task_completed', activity_text: 'Completed task "Responsive Layout Implementation"', created_at: '2026-02-10T10:20:00Z' },
  { id: 'act-9', project_id: 'proj-2', user_id: 'demo-user-123', activity_type: 'comment', activity_text: 'Added comment on "Homepage Design Review"', created_at: '2026-02-09T16:00:00Z' },
  { id: 'act-10', project_id: 'proj-1', user_id: 'demo-user-123', activity_type: 'file_uploaded', activity_text: 'Uploaded research findings document', created_at: '2026-02-09T11:30:00Z' },
  { id: 'act-11', project_id: 'proj-3', user_id: 'demo-user-123', activity_type: 'task_updated', activity_text: 'Updated task "Partnership Agreements" status', created_at: '2026-02-08T14:45:00Z' },
  { id: 'act-12', project_id: 'proj-4', user_id: 'demo-user-123', activity_type: 'task_created', activity_text: 'Created new task "Social Media Campaign"', created_at: '2026-02-08T09:20:00Z' },
  { id: 'act-13', project_id: 'proj-2', user_id: 'demo-user-123', activity_type: 'task_completed', activity_text: 'Completed task "Content Migration Plan"', created_at: '2026-02-07T15:10:00Z' },
  { id: 'act-14', project_id: 'proj-5', user_id: 'demo-user-123', activity_type: 'project_updated', activity_text: 'Updated project description and goals', created_at: '2026-02-07T10:00:00Z' },
  { id: 'act-15', project_id: 'proj-1', user_id: 'demo-user-123', activity_type: 'milestone', activity_text: 'Reached milestone: Phase 1 data collection completed', created_at: '2026-02-06T16:30:00Z' }
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
  },
  getByProject: (projectId) => Promise.resolve(DEMO_ACTIVITY.filter(a => a.project_id === projectId)),
  create: (data) => Promise.resolve({ ...data, id: 'act-new', created_at: new Date().toISOString() })
};

// Export demo mode check
export function isDemoMode() {
  const urlParams = new URLSearchParams(window.location.search);
  const demoParam = urlParams.get('demo');
  const storedDemo = localStorage.getItem('demoMode');
  return demoParam === 'true' || storedDemo === 'true';
}

// Enable demo mode
export function enableDemoMode() {
  localStorage.setItem('demoMode', 'true');
  localStorage.setItem('demoUser', JSON.stringify(DEMO_USER));
}

// Disable demo mode
export function disableDemoMode() {
  localStorage.removeItem('demoMode');
  localStorage.removeItem('demoUser');
}

// Get current demo user
export function getDemoUser() {
  const stored = localStorage.getItem('demoUser');
  return stored ? JSON.parse(stored) : DEMO_USER;
}

// Export all demo services as a single object
export const demoServices = {
  auth: {
    getCurrentUser: () => Promise.resolve(getDemoUser()),
    login: (email) => {
      const user = email.includes('admin') ? DEMO_ADMIN : DEMO_USER;
      localStorage.setItem('demoUser', JSON.stringify(user));
      return Promise.resolve({ user, session: { access_token: 'demo-token' } });
    },
    logout: () => {
      disableDemoMode();
      return Promise.resolve();
    }
  },
  projects: demoProjects,
  tasks: demoTasks,
  files: demoFiles,
  updates: demoUpdates,
  contacts: demoContacts,
  activity: demoActivity,
  stats: {
    getDashboard: (userId) => {
      const userProjects = DEMO_PROJECTS;
      const userTasks = DEMO_TASKS;
      const completed = userTasks.filter(t => t.status === 'done').length;
      const total = userTasks.length;
      
      return Promise.resolve({
        totalProjects: userProjects.length,
        activeProjects: userProjects.filter(p => p.status === 'active').length,
        totalTasks: total,
        completedTasks: completed,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        totalFiles: DEMO_FILES.length,
        recentActivity: DEMO_ACTIVITY.slice(0, 5)
      });
    }
  }
};

// Export all demo data
export { DEMO_USER, DEMO_ADMIN, DEMO_PROJECTS, DEMO_TASKS, DEMO_ACTIVITY };

