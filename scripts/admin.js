import { checkAuth, getCurrentUser, isAdmin, autoDemoLogin, isDemoSession, logout } from './auth.js';
import { supabase } from '../services/supabase.js';
import { showLoading, hideLoading, showSuccess, showError, confirm } from '../utils/ui.js';
import { formatDate, getRelativeTime, getStatusBadgeClass, getTypeBadgeClass } from '../utils/helpers.js';
import { isDemoMode, DEMO_PROJECTS, DEMO_TASKS, DEMO_FILES, DEMO_UPDATES, DEMO_ACTIVITY } from '../utils/demoMode.js';

// ============================================================================
// STATE VARIABLES
// ============================================================================

let currentUser = null;
let loadedTabs = new Set();
let currentFilters = {
    userRole: '',
    projectType: '',
    projectStatus: '',
    taskStatus: '',
    fileCategory: '',
    activityDate: '7',
    activityType: ''
};
let currentSearches = {
    users: '',
    projects: '',
    stages: '',
    tasks: '',
    files: ''
};
let userCharts = {
    typeChart: null,
    statusChart: null
};
let roleMapCache = null;
let currentPagination = {
    users: { page: 1, pageSize: 20 },
    projects: { page: 1, pageSize: 20 },
    activity: { page: 1, pageSize: 20 }
};

// Mutable demo data caches for admin CRUD operations
let adminDemoUsers = null;
let adminDemoProjects = null;
let adminDemoTasks = null;
let adminDemoFiles = null;
let adminDemoStages = null;
let adminDemoActivity = null;

// ============================================================================
// DEMO MODE DATA
// ============================================================================

/** Demo user profiles shown in the admin Users tab */
const DEMO_ADMIN_USERS = [
    {
        id: 'demo-admin-456',
        email: 'admin@projecthub.com',
        full_name: 'Admin User',
        role: 'admin',
        avatar_color: '#dc3545',
        created_at: '2025-01-01T00:00:00Z',
        last_sign_in_at: new Date().toISOString(),
        bio: 'Managing ProjectHub platform'
    },
    {
        id: 'demo-user-123',
        email: 'demo@projecthub.com',
        full_name: 'Demo User',
        role: 'user',
        avatar_color: '#0d6efd',
        created_at: '2025-01-15T00:00:00Z',
        last_sign_in_at: '2026-02-20T08:30:00Z',
        bio: 'Exploring ProjectHub features'
    },
    {
        id: 'user-contact-1',
        email: 'sarah.johnson@company.com',
        full_name: 'Sarah Johnson',
        role: 'user',
        avatar_color: '#198754',
        created_at: '2025-11-05T10:00:00Z',
        last_sign_in_at: '2026-02-18T14:20:00Z',
        bio: 'UX Designer & Project Manager'
    },
    {
        id: 'user-contact-2',
        email: 'michael.chen@email.com',
        full_name: 'Michael Chen',
        role: 'user',
        avatar_color: '#6610f2',
        created_at: '2025-10-20T14:00:00Z',
        last_sign_in_at: '2026-02-15T11:45:00Z',
        bio: 'Senior Researcher'
    },
    {
        id: 'user-contact-3',
        email: 'emma.r@consultancy.com',
        full_name: 'Emma Rodriguez',
        role: 'user',
        avatar_color: '#d63384',
        created_at: '2025-12-01T09:00:00Z',
        last_sign_in_at: '2026-02-19T16:30:00Z',
        bio: 'Business Analyst & EU Affairs Consultant'
    },
    {
        id: 'user-contact-4',
        email: 'david.kumar@university.edu',
        full_name: 'David Kumar',
        role: 'user',
        avatar_color: '#0dcaf0',
        created_at: '2025-10-10T11:00:00Z',
        last_sign_in_at: '2026-02-10T09:15:00Z',
        bio: 'Research Assistant'
    },
    {
        id: 'user-contact-5',
        email: 'lisa.a@healthorg.com',
        full_name: 'Lisa Anderson',
        role: 'user',
        avatar_color: '#fd7e14',
        created_at: '2025-07-15T08:00:00Z',
        last_sign_in_at: '2026-02-21T13:50:00Z',
        bio: 'Program Coordinator'
    }
];

/** Demo project stages shown in the admin Stages tab */
const DEMO_STAGES_DATA = [
    { id: 'stage-1',  project_id: 'proj-1', title: 'Literature Review Phase',  status: 'completed', sort_order: 1, created_at: '2025-10-01T10:00:00Z', projects: { id: 'proj-1', title: 'AI Research Initiative' } },
    { id: 'stage-2',  project_id: 'proj-1', title: 'Data Collection Phase',     status: 'active',    sort_order: 2, created_at: '2025-11-01T10:00:00Z', projects: { id: 'proj-1', title: 'AI Research Initiative' } },
    { id: 'stage-3',  project_id: 'proj-1', title: 'Analysis & Publication',    status: 'planning',  sort_order: 3, created_at: '2025-12-01T10:00:00Z', projects: { id: 'proj-1', title: 'AI Research Initiative' } },
    { id: 'stage-4',  project_id: 'proj-2', title: 'Design Phase',              status: 'completed', sort_order: 1, created_at: '2025-11-01T10:00:00Z', projects: { id: 'proj-2', title: 'Corporate Website Redesign' } },
    { id: 'stage-5',  project_id: 'proj-2', title: 'Development Phase',         status: 'active',    sort_order: 2, created_at: '2025-12-01T10:00:00Z', projects: { id: 'proj-2', title: 'Corporate Website Redesign' } },
    { id: 'stage-6',  project_id: 'proj-2', title: 'Launch & Handover',         status: 'planning',  sort_order: 3, created_at: '2026-01-01T10:00:00Z', projects: { id: 'proj-2', title: 'Corporate Website Redesign' } },
    { id: 'stage-7',  project_id: 'proj-3', title: 'Proposal & Approval',       status: 'completed', sort_order: 1, created_at: '2025-12-15T10:00:00Z', projects: { id: 'proj-3', title: 'EU Digital Skills Program' } },
    { id: 'stage-8',  project_id: 'proj-3', title: 'Partner Recruitment',       status: 'active',    sort_order: 2, created_at: '2026-01-01T10:00:00Z', projects: { id: 'proj-3', title: 'EU Digital Skills Program' } },
    { id: 'stage-9',  project_id: 'proj-4', title: 'Campaign Launch',           status: 'completed', sort_order: 1, created_at: '2025-07-01T10:00:00Z', projects: { id: 'proj-4', title: 'Community Health Campaign' } },
    { id: 'stage-10', project_id: 'proj-4', title: 'Outreach & Delivery',       status: 'active',    sort_order: 2, created_at: '2025-08-01T10:00:00Z', projects: { id: 'proj-4', title: 'Community Health Campaign' } },
    { id: 'stage-11', project_id: 'proj-5', title: 'Design & Development',      status: 'completed', sort_order: 1, created_at: '2024-01-01T10:00:00Z', projects: { id: 'proj-5', title: 'Personal Portfolio Website' } },
    { id: 'stage-12', project_id: 'proj-5', title: 'Launch & Evaluation',       status: 'completed', sort_order: 2, created_at: '2024-04-01T10:00:00Z', projects: { id: 'proj-5', title: 'Personal Portfolio Website' } }
];

/**
 * Initialise mutable demo data caches (idempotent).
 * Enriches imported constants with relational data the render functions expect.
 */
function initDemoAdminData() {
    if (adminDemoUsers) return; // Already initialised

    adminDemoUsers = DEMO_ADMIN_USERS.map(u => ({ ...u }));

    // Build lookup maps
    const projectMap = {};
    DEMO_PROJECTS.forEach(p => { projectMap[p.id] = { id: p.id, title: p.title }; });

    const tasksByProject = {};
    DEMO_TASKS.forEach(t => {
        if (!tasksByProject[t.project_id]) tasksByProject[t.project_id] = [];
        tasksByProject[t.project_id].push({ status: t.status });
    });

    adminDemoProjects = DEMO_PROJECTS.map(p => ({
        ...p,
        profiles: { full_name: 'Demo User', email: 'demo@projecthub.com' },
        tasks: tasksByProject[p.id] || []
    }));

    adminDemoTasks = DEMO_TASKS.map(t => ({
        ...t,
        projects: projectMap[t.project_id] || { id: t.project_id, title: 'Unknown Project' }
    }));

    adminDemoFiles = DEMO_FILES.map(f => ({
        ...f,
        projects: projectMap[f.project_id] || { id: f.project_id, title: 'Unknown Project' }
    }));

    adminDemoStages = DEMO_STAGES_DATA.map(s => ({ ...s }));

    const userMap = { 'demo-user-123': { full_name: 'Demo User', email: 'demo@projecthub.com' } };
    adminDemoActivity = [...DEMO_UPDATES]
        .map(u => ({
            ...u,
            description: u.update_text,
            profiles: userMap[u.user_id] || { full_name: 'Demo User', email: 'demo@projecthub.com' },
            projects: projectMap[u.project_id] || { title: 'Unknown Project' }
        }))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

/**
 * Compute demo system statistics.
 * @returns {Object}
 */
function getDemoStats() {
    initDemoAdminData();
    const completedTasks = adminDemoTasks.filter(t => t.status === 'done').length;
    const totalStorageMB = adminDemoFiles.reduce((s, f) => s + (f.file_size || 0), 0) / (1024 * 1024);
    return {
        totalUsers: adminDemoUsers.length,
        totalProjects: adminDemoProjects.length,
        activeProjects: adminDemoProjects.filter(p => p.status === 'active').length,
        totalTasks: adminDemoTasks.length,
        completedTasks,
        completionRate: Math.round((completedTasks / adminDemoTasks.length) * 100),
        totalStorageMB
    };
}

function getUserRoleName(user) {
    if (Array.isArray(user.user_roles) && user.user_roles.length > 0) {
        const adminAssignment = user.user_roles.find((assignment) => assignment?.roles?.name === 'admin');
        if (adminAssignment) {
            return 'admin';
        }

        const firstAssignedRole = user.user_roles[0]?.roles?.name;
        if (firstAssignedRole) {
            return firstAssignedRole;
        }
    }

    return user.role || 'user';
}

function normalizeUsersForAdmin(users = []) {
    return users.map((user) => ({
        ...user,
        role: getUserRoleName(user)
    }));
}

function formatFileSize(sizeInBytes = 0) {
    if (!sizeInBytes || Number.isNaN(Number(sizeInBytes))) {
        return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    let size = Number(sizeInBytes);
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex += 1;
    }

    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function safeText(text, fallback = '') {
    if (text === null || text === undefined) {
        return fallback;
    }

    return String(text);
}

async function getRoleMap() {
    if (roleMapCache) {
        return roleMapCache;
    }

    const { data: roles, error } = await supabase
        .from('roles')
        .select('id, name');

    if (error) {
        throw error;
    }

    roleMapCache = (roles || []).reduce((acc, role) => {
        acc[role.name] = role.id;
        return acc;
    }, {});

    return roleMapCache;
}

// ============================================================================
// MAIN INITIALIZATION
// ============================================================================

/**
 * Initialize the admin panel on page load
 * Checks admin access, loads stats, sets up listeners
 */
async function initAdminPanel() {
    try {
        // Handle demo mode URL parameter – enable demo mode but stay on admin page
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('demo') === 'true' && !isDemoSession()) {
            // Use enableDemoMode directly so we don't redirect away from admin
            const { enableDemoMode } = await import('../utils/demoMode.js');
            enableDemoMode();
            // Clean up URL
            window.history.replaceState({}, '', window.location.pathname);
        }

        if (isDemoMode() || isDemoSession()) {
            console.log('🎭 Demo mode enabled - using mock data');
        }

        // Check authentication
        const user = await checkAuth();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        // Check admin access
        const hasAdminAccess = await checkAdminAccess(user);
        if (!hasAdminAccess) {
            return;
        }

        currentUser = user;

        // In demo mode show the Admin user in the navbar
        const displayUser = (isDemoMode() || isDemoSession())
            ? { full_name: 'Admin User', email: 'admin@projecthub.com', id: 'demo-admin-456' }
            : user;

        // Update navbar with real user data
        const userName = displayUser.full_name || displayUser.user_metadata?.full_name || displayUser.email.split('@')[0];
        const userEmail = displayUser.email || '';
        const initials = userName
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map(n => n[0].toUpperCase())
            .join('');

        const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setEl('navUserName', userName);
        setEl('navUserEmail', userEmail);
        setEl('navUserInitials', initials);
        setEl('navUserNameDropdown', userName);
        setEl('navUserEmailDropdown', userEmail);
        setEl('navUserInitialsLg', initials);

        // Initialise demo data if in demo mode
        if (isDemoMode() || isDemoSession()) {
            initDemoAdminData();
        }

        // Load system stats
        await loadSystemStats();

        // Load charts
        await loadCharts();

        // Load users tab by default
        await loadUsersTab();

        // Setup event listeners
        setupEventListeners();
        setupTabListeners();
        setupSearchListeners();
        setupFilterListeners();

        // Setup logout
        document.getElementById('logoutBtn').addEventListener('click', async (e) => {
            e.preventDefault();
            await logout();
        });

    } catch (error) {
        console.error('Error initializing admin panel:', error);
        showError('Failed to initialize admin panel. Please refresh the page.');
    }
}

// ============================================================================
// ADMIN ACCESS CHECK
// ============================================================================

/**
 * Check if current user has admin access
 * @returns {boolean} True if user is admin
 */
async function checkAdminAccess(user = null) {
    try {
        // In demo mode, always allow admin access
        if (isDemoMode() || isDemoSession()) {
            return true;
        }

        const authUser = user || await getCurrentUser();
        
        if (!authUser || !isAdmin(authUser)) {
            showError('You do not have permission to access the admin panel.');
            setTimeout(() => window.location.href = 'dashboard.html', 2000);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error checking admin access:', error);
        showError('Authentication error. Please log in again.');
        setTimeout(() => window.location.href = 'login.html', 2000);
        return false;
    }
}

// ============================================================================
// SYSTEM STATS
// ============================================================================

/**
 * Load system statistics from database
 */
async function loadSystemStats() {
    try {
        showLoading('Loading system statistics...');

        if (isDemoMode() || isDemoSession()) {
            const stats = getDemoStats();
            document.getElementById('totalUsers').textContent = stats.totalUsers;
            document.getElementById('usersGrowth').textContent = '+2 this week';
            document.getElementById('totalProjects').textContent = stats.totalProjects;
            document.getElementById('projectsGrowth').textContent = `${stats.activeProjects} active`;
            document.getElementById('totalTasks').textContent = stats.totalTasks;
            document.getElementById('tasksCompletion').textContent = `${stats.completedTasks} completed (${stats.completionRate}%)`;
            document.getElementById('storageUsed').textContent = stats.totalStorageMB.toFixed(2) + ' MB';
            const storagePercent = Math.min((stats.totalStorageMB / 5120) * 100, 100);
            document.getElementById('storageProgress').style.width = storagePercent + '%';
            hideLoading();
            return;
        }

        // Fetch user count
        const { count: totalUsers, error: usersError } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        // Fetch project counts
        const { data: projectsData, error: projectsError } = await supabase
            .from('projects')
            .select('status');

        // Fetch task counts
        const { data: tasksData, error: tasksError } = await supabase
            .from('tasks')
            .select('status');

        // Fetch storage used
        const { data: filesData, error: filesError } = await supabase
            .from('project_files')
            .select('file_size');

        if (usersError || projectsError || tasksError || filesError) {
            console.error('Error fetching stats:', { usersError, projectsError, tasksError, filesError });
            hideLoading();
            showError('Failed to load system statistics.');
            return;
        }

        // Calculate statistics
        const totalProjects = projectsData?.length || 0;
        const activeProjects = projectsData?.filter(p => p.status === 'active').length || 0;
        
        const totalTasks = tasksData?.length || 0;
        const completedTasks = tasksData?.filter(t => t.status === 'done').length || 0;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const totalStorageMB = (filesData?.reduce((sum, f) => sum + (f.file_size || 0), 0) || 0) / (1024 * 1024);

        // Update UI
        document.getElementById('totalUsers').textContent = totalUsers || 0;
        document.getElementById('usersGrowth').textContent = '+0 this week'; // TODO: Calculate actual growth
        
        document.getElementById('totalProjects').textContent = totalProjects;
        document.getElementById('projectsGrowth').textContent = `${activeProjects} active`;
        
        document.getElementById('totalTasks').textContent = totalTasks;
        document.getElementById('tasksCompletion').textContent = `${completedTasks} completed (${completionRate}%)`;
        
        document.getElementById('storageUsed').textContent = totalStorageMB.toFixed(2) + ' MB';
        
        // Update storage progress bar (assuming 5GB limit)
        const storageLimit = 5 * 1024; // 5GB in MB
        const storagePercent = Math.min((totalStorageMB / storageLimit) * 100, 100);
        document.getElementById('storageProgress').style.width = storagePercent + '%';

        hideLoading();

    } catch (error) {
        console.error('Error loading system stats:', error);
        hideLoading();
        showError('Failed to load system statistics.');
    }
}

// ============================================================================
// CHARTS
// ============================================================================

/**
 * Load and render charts for project distribution
 */
async function loadCharts() {
    try {
        if (isDemoMode() || isDemoSession()) {
            initDemoAdminData();
            const typeCount = {};
            const statusCount = {};
            adminDemoProjects.forEach(project => {
                const type = project.project_type || 'other';
                typeCount[type] = (typeCount[type] || 0) + 1;
                const status = project.status || 'planning';
                statusCount[status] = (statusCount[status] || 0) + 1;
            });
            const typeCtx = document.getElementById('projectTypeChart');
            if (typeCtx && !userCharts.typeChart) {
                userCharts.typeChart = new Chart(typeCtx, {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(typeCount),
                        datasets: [{ data: Object.values(typeCount), backgroundColor: ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a'] }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
                });
            }
            const statusCtx = document.getElementById('projectStatusChart');
            if (statusCtx && !userCharts.statusChart) {
                userCharts.statusChart = new Chart(statusCtx, {
                    type: 'bar',
                    data: {
                        labels: Object.keys(statusCount),
                        datasets: [{ label: 'Projects', data: Object.values(statusCount), backgroundColor: '#0d6efd' }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true } }, scales: { y: { beginAtZero: true } } }
                });
            }
            return;
        }

        // Fetch project data
        const { data: projectsData, error } = await supabase
            .from('projects')
            .select('project_type, status');

        if (error) {
            console.error('Error fetching chart data:', error);
            return;
        }

        // Prepare type distribution
        const typeCount = {};
        const statusCount = {};

        projectsData?.forEach(project => {
            // Count by type
            const type = project.project_type || 'other';
            typeCount[type] = (typeCount[type] || 0) + 1;

            // Count by status
            const status = project.status || 'planning';
            statusCount[status] = (statusCount[status] || 0) + 1;
        });

        // Create type chart
        const typeCtx = document.getElementById('projectTypeChart');
        if (typeCtx && !userCharts.typeChart) {
            userCharts.typeChart = new Chart(typeCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(typeCount),
                    datasets: [{
                        data: Object.values(typeCount),
                        backgroundColor: [
                            '#667eea',
                            '#f093fb',
                            '#4facfe',
                            '#43e97b',
                            '#fa709a'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }

        // Create status chart
        const statusCtx = document.getElementById('projectStatusChart');
        if (statusCtx && !userCharts.statusChart) {
            userCharts.statusChart = new Chart(statusCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(statusCount),
                    datasets: [{
                        label: 'Projects',
                        data: Object.values(statusCount),
                        backgroundColor: '#0d6efd'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

    } catch (error) {
        console.error('Error loading charts:', error);
    }
}

// ============================================================================
// USERS TAB
// ============================================================================

/**
 * Load and display users management tab
 */
async function loadUsersTab() {
    if (loadedTabs.has('users')) return;

    try {
        showLoading('Loading users...');

        if (isDemoMode() || isDemoSession()) {
            initDemoAdminData();
            renderUsersTable(adminDemoUsers);
            loadedTabs.add('users');
            hideLoading();
            return;
        }

        const { data: users, error } = await supabase
            .from('profiles')
            .select('*, user_roles(role_id, roles(name))')
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        renderUsersTable(normalizeUsersForAdmin(users || []));
        loadedTabs.add('users');
        hideLoading();

    } catch (error) {
        console.error('Error loading users:', error);
        hideLoading();
        showError('Failed to load users.');
    }
}

/**
 * Render users table with data
 * @param {Array} users - Array of user objects
 */
function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    const emptyState = document.getElementById('usersEmptyState');

    if (!users || users.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    tbody.innerHTML = users.map(user => {
        const avatar = createAvatar(user.full_name || user.email, user.avatar_color);
        const roleBadge = user.role === 'admin' 
            ? '<span class="badge badge-admin">Admin</span>' 
            : '<span class="badge badge-user">User</span>';

        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        ${avatar}
                        <div>
                            <div class="fw-500">${escapeHtml(user.full_name || 'No name')}</div>
                            <div class="text-muted small">${escapeHtml(user.email)}</div>
                        </div>
                    </div>
                </td>
                <td>${escapeHtml(user.email)}</td>
                <td>${roleBadge}</td>
                <td>${formatDate(user.created_at)}</td>
                <td>${user.last_sign_in_at ? getRelativeTime(user.last_sign_in_at) : 'Never'}</td>
                <td>
                    <div class="d-flex align-items-center gap-1">
                        <button class="btn btn-sm btn-outline-primary" onclick="viewUserProfile('${user.id}')" title="View profile">
                            <i class="bi bi-eye me-1"></i>View
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="editUserPrompt('${user.id}', '${escapeHtml(user.full_name || user.email)}', '${user.role}')" title="Edit user">
                            <i class="bi bi-pencil me-1"></i>Edit
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteUserPrompt('${user.id}', '${escapeHtml(user.full_name || user.email)}')" title="Delete user">
                            <i class="bi bi-trash me-1"></i>Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Show user role change modal
 * @param {string} userId - User ID
 * @param {string} userName - User name for display
 * @param {string} currentRole - Current user role
 */
async function changeUserRole(userId, userName, currentRole) {
    const modal = new bootstrap.Modal(document.getElementById('userRoleModal'));
    document.getElementById('userRoleModalName').textContent = userName;
    document.getElementById('userRoleSelect').value = currentRole;
    
    // Store user ID for save handler
    document.getElementById('saveUserRoleBtn').onclick = () => {
        handleUserRoleChange(userId, currentRole);
    };

    modal.show();
}

/**
 * Handle user role change
 * @param {string} userId - User ID
 * @param {string} oldRole - Previous role
 */
async function handleUserRoleChange(userId, oldRole) {
    try {
        const newRole = document.getElementById('userRoleSelect').value;

        if (newRole === oldRole) {
            bootstrap.Modal.getInstance(document.getElementById('userRoleModal')).hide();
            return;
        }

        if (isDemoMode() || isDemoSession()) {
            const user = adminDemoUsers.find(u => u.id === userId);
            if (user) user.role = newRole;
            bootstrap.Modal.getInstance(document.getElementById('userRoleModal')).hide();
            showSuccess(`User role updated to ${newRole} (demo – not persisted)`);
            renderUsersTable([...adminDemoUsers]);
            return;
        }

        const roleMap = await getRoleMap();
        const newRoleId = roleMap[newRole];

        if (!newRoleId) {
            throw new Error(`Role "${newRole}" not found.`);
        }

        const { error: deleteRolesError } = await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', userId);

        if (deleteRolesError) {
            throw deleteRolesError;
        }

        const { error: insertRoleError } = await supabase
            .from('user_roles')
            .insert({
                user_id: userId,
                role_id: newRoleId,
                assigned_by: currentUser?.id || null
            });

        if (insertRoleError) {
            throw insertRoleError;
        }

        const { error: profileRoleError } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId);

        if (profileRoleError) {
            throw profileRoleError;
        }

        bootstrap.Modal.getInstance(document.getElementById('userRoleModal')).hide();
        showSuccess(`User role updated to ${newRole}`);
        loadedTabs.delete('users');
        await loadUsersTab();

    } catch (error) {
        console.error('Error changing user role:', error);
        showError('Failed to update user role.');
    }
}

/**
 * Open the edit modal for a user (alias for changeUserRole)
 * @param {string} userId - User ID
 * @param {string} userName - User display name
 * @param {string} currentRole - Current role of the user
 */
function editUserPrompt(userId, userName, currentRole) {
    changeUserRole(userId, userName, currentRole);
}
window.editUserPrompt = editUserPrompt;

/**
 * Show delete confirmation for user
 * @param {string} userId - User ID
 * @param {string} userName - User name for display
 */
function deleteUserPrompt(userId, userName) {
    document.getElementById('deleteMessage').innerHTML =
        `Are you sure you want to delete <strong>${escapeHtml(userName)}</strong>?<br>
        All their projects, tasks, and files will be permanently removed.`;

    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.className = 'btn btn-danger';
    confirmBtn.textContent = 'Delete';
    const freshBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(freshBtn, confirmBtn);
    freshBtn.addEventListener('click', () => {
        bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
        handleDeleteUser(userId);
    });

    new bootstrap.Modal(document.getElementById('deleteModal')).show();
}

/**
 * Delete user from database
 * @param {string} userId - User ID to delete
 */
async function handleDeleteUser(userId) {
    try {
        showLoading('Deleting user...');

        if (isDemoMode() || isDemoSession()) {
            const idx = adminDemoUsers.findIndex(u => u.id === userId);
            if (idx !== -1) adminDemoUsers.splice(idx, 1);
            adminDemoProjects = adminDemoProjects.filter(p => p.user_id !== userId);
            hideLoading();
            showSuccess('User deleted (demo – not persisted)');
            renderUsersTable([...adminDemoUsers]);
            return;
        }

        // Delete projects (cascade should handle tasks and files)
        const { error: deleteProjectsError } = await supabase
            .from('projects')
            .delete()
            .eq('user_id', userId);

        if (deleteProjectsError) {
            throw deleteProjectsError;
        }

        // Delete user profile
        const { error: deleteProfileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (deleteProfileError) {
            throw deleteProfileError;
        }

        hideLoading();
        showSuccess('User deleted successfully');
        await loadSystemStats();
        loadedTabs.delete('users');
        await loadUsersTab();

    } catch (error) {
        console.error('Error deleting user:', error);
        hideLoading();
        showError('Failed to delete user.');
    }
}

async function viewUserProfile(userId) {
    try {
        showLoading('Loading user profile...');

        let user, ownedProjects = 0, taskCount = 0;

        if (isDemoMode() || isDemoSession()) {
            initDemoAdminData();
            user = adminDemoUsers.find(u => u.id === userId);
            if (!user) { hideLoading(); showError('User not found.'); return; }
            const owned = adminDemoProjects.filter(p => p.user_id === userId);
            ownedProjects = owned.length;
            taskCount = adminDemoTasks.filter(t => owned.map(p => p.id).includes(t.project_id)).length;
        } else {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email, role, created_at, bio, avatar_url, last_sign_in_at')
                .eq('id', userId).single();
            if (error) throw error;
            user = data;

            const { count: pc } = await supabase
                .from('projects').select('*', { count: 'exact', head: true }).eq('user_id', userId);
            ownedProjects = pc || 0;

            const { data: projIds } = await supabase.from('projects').select('id').eq('user_id', userId);
            const ids = (projIds || []).map(p => p.id);
            if (ids.length > 0) {
                const { count: tc } = await supabase
                    .from('tasks').select('*', { count: 'exact', head: true }).in('project_id', ids);
                taskCount = tc || 0;
            }
        }

        hideLoading();

        const avatar = createAvatar(user.full_name || user.email, user.avatar_color);
        const roleBadge = user.role === 'admin'
            ? '<span class="badge badge-admin">Admin</span>'
            : '<span class="badge badge-user">User</span>';

        document.getElementById('profileModalAvatar').innerHTML = avatar;
        document.getElementById('profileModalName').textContent = user.full_name || 'No name set';
        document.getElementById('profileModalEmail').textContent = user.email;
        document.getElementById('profileModalRole').innerHTML = roleBadge;
        document.getElementById('profileModalBio').textContent = user.bio || 'No bio provided.';
        document.getElementById('profileModalCreated').textContent = formatDate(user.created_at);
        document.getElementById('profileModalLastActive').textContent =
            user.last_sign_in_at ? getRelativeTime(user.last_sign_in_at) : 'Never';
        document.getElementById('profileModalProjects').textContent = ownedProjects;
        document.getElementById('profileModalTasks').textContent = taskCount;

        document.getElementById('profileModalChangeRoleBtn').onclick = () => {
            bootstrap.Modal.getInstance(document.getElementById('userProfileModal')).hide();
            changeUserRole(userId, user.full_name || user.email, user.role);
        };
        document.getElementById('profileModalResetPwBtn').onclick = () => {
            bootstrap.Modal.getInstance(document.getElementById('userProfileModal')).hide();
            resetUserPassword(userId, user.email);
        };

        new bootstrap.Modal(document.getElementById('userProfileModal')).show();

    } catch (error) {
        console.error('Error viewing user profile:', error);
        hideLoading();
        showError('Failed to load user profile.');
    }
}

/**
 * Suspend or unsuspend a user account
 */
function suspendUser(userId, userName, currentStatus) {
    const isSuspended = currentStatus === 'suspended';
    const action = isSuspended ? 'unsuspend' : 'suspend';
    const actionLabel = isSuspended ? 'Unsuspend' : 'Suspend';

    document.getElementById('deleteMessage').innerHTML =
        `Are you sure you want to <strong>${action}</strong> <strong>${escapeHtml(userName)}</strong>?<br>
        ${isSuspended ? 'They will regain access to the platform.' : 'They will lose access until unsuspended.'}`;

    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.className = isSuspended ? 'btn btn-success' : 'btn btn-warning';
    confirmBtn.textContent = actionLabel;
    const freshBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(freshBtn, confirmBtn);

    freshBtn.addEventListener('click', () => {
        bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
        freshBtn.className = 'btn btn-danger';
        freshBtn.textContent = 'Delete';
        if (isDemoMode() || isDemoSession()) {
            const u = adminDemoUsers.find(u => u.id === userId);
            if (u) u.status = isSuspended ? 'active' : 'suspended';
            showSuccess(`User ${action}ed (demo – not persisted)`);
            renderUsersTable([...adminDemoUsers]);
        } else {
            showSuccess(`User ${action}ed successfully`);
        }
    });

    new bootstrap.Modal(document.getElementById('deleteModal')).show();
}

/**
 * Send a password reset email to a user
 */
async function resetUserPassword(userId, userEmail) {
    document.getElementById('deleteMessage').innerHTML =
        `Send a password reset email to <strong>${escapeHtml(userEmail)}</strong>?<br>
        <span class="text-muted small">They will receive a link to set a new password.</span>`;

    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.className = 'btn btn-info text-white';
    confirmBtn.textContent = 'Send Reset Email';
    const freshBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(freshBtn, confirmBtn);

    freshBtn.addEventListener('click', async () => {
        bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
        freshBtn.className = 'btn btn-danger';
        freshBtn.textContent = 'Delete';
        if (isDemoMode() || isDemoSession()) {
            showSuccess(`Password reset email sent to ${userEmail} (demo – not actually sent)`);
            return;
        }
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
                redirectTo: `${window.location.origin}/pages/login.html`
            });
            if (error) throw error;
            showSuccess(`Password reset email sent to ${userEmail}`);
        } catch (err) {
            console.error('Reset password error:', err);
            showError('Failed to send reset email.');
        }
    });

    new bootstrap.Modal(document.getElementById('deleteModal')).show();
}

// ============================================================================
// PROJECTS TAB
// ============================================================================

/**
 * Load and display projects management tab
 */
async function loadProjectsTab() {
    if (loadedTabs.has('projects')) return;

    try {
        showLoading('Loading projects...');

        if (isDemoMode() || isDemoSession()) {
            initDemoAdminData();
            renderProjectsTable(adminDemoProjects);
            loadedTabs.add('projects');
            hideLoading();
            return;
        }

        let query = supabase
            .from('projects')
            .select('*, profiles(full_name, email), tasks(status)');

        const { data: projects, error } = await query
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        renderProjectsTable(projects || []);
        loadedTabs.add('projects');
        hideLoading();

    } catch (error) {
        console.error('Error loading projects:', error);
        hideLoading();
        showError('Failed to load projects.');
    }
}

/**
 * Render projects table with data
 * @param {Array} projects - Array of project objects
 */
function renderProjectsTable(projects) {
    const tbody = document.getElementById('projectsTableBody');
    const emptyState = document.getElementById('projectsEmptyState');

    if (!projects || projects.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    tbody.innerHTML = projects.map(project => {
        const owner = project.profiles?.full_name || 'Unknown';
        const typeClass = getTypeBadgeClass(project.project_type);
        const statusClass = getStatusBadgeClass(project.status);
        const taskCount = project.tasks?.length || 0;

        return `
            <tr>
                <td>
                    <a href="project-details.html?id=${project.id}" class="text-decoration-none fw-500">
                        ${escapeHtml(project.title)}
                    </a>
                </td>
                <td>${escapeHtml(owner)}</td>
                <td><span class="badge ${typeClass}">${escapeHtml(project.project_type)}</span></td>
                <td><span class="badge ${statusClass}">${escapeHtml(project.status)}</span></td>
                <td>${formatDate(project.created_at)}</td>
                <td>${taskCount} tasks</td>
                <td>
                    <div class="d-flex align-items-center gap-1">
                        <a href="project-details.html?id=${project.id}" class="btn btn-sm btn-outline-primary" title="View details">
                            <i class="bi bi-eye me-1"></i>View
                        </a>
                        <button class="btn btn-sm btn-outline-secondary" onclick="editProjectPrompt('${project.id}', '${escapeHtml(project.title)}', '${escapeHtml(project.status)}')" title="Edit project">
                            <i class="bi bi-pencil me-1"></i>Edit
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteProjectPrompt('${project.id}', '${escapeHtml(project.title)}')" title="Delete project">
                            <i class="bi bi-trash me-1"></i>Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Show delete confirmation for project
 * @param {string} projectId - Project ID
 * @param {string} projectTitle - Project title for display
 */
function deleteProjectPrompt(projectId, projectTitle) {
    document.getElementById('deleteMessage').innerHTML =
        `Are you sure you want to delete <strong>${escapeHtml(projectTitle)}</strong>?<br>
        All its tasks and files will be permanently removed.`;

    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.className = 'btn btn-danger';
    confirmBtn.textContent = 'Delete';
    const freshBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(freshBtn, confirmBtn);
    freshBtn.addEventListener('click', () => {
        bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
        handleDeleteProject(projectId);
    });

    new bootstrap.Modal(document.getElementById('deleteModal')).show();
}

/**
 * Prompt and update project basic fields.
 * @param {string} projectId - Project ID.
 * @param {string} currentTitle - Current project title.
 * @param {string} currentStatus - Current project status.
 */
async function editProjectPrompt(projectId, currentTitle, currentStatus) {
    const nextTitle = window.prompt('Project title', currentTitle);
    if (!nextTitle) {
        return;
    }

    const nextStatus = window.prompt('Project status (planning, active, completed, paused, archived)', currentStatus);
    if (!nextStatus) {
        return;
    }

    try {
        showLoading('Updating project...');

        if (isDemoMode() || isDemoSession()) {
            const project = adminDemoProjects.find(p => p.id === projectId);
            if (project) {
                project.title = nextTitle.trim();
                project.status = nextStatus.trim();
            }
            hideLoading();
            showSuccess('Project updated (demo – not persisted)');
            renderProjectsTable([...adminDemoProjects]);
            return;
        }

        const { error } = await supabase
            .from('projects')
            .update({
                title: nextTitle.trim(),
                status: nextStatus.trim()
            })
            .eq('id', projectId);

        if (error) {
            throw error;
        }

        hideLoading();
        showSuccess('Project updated successfully');
        loadedTabs.delete('projects');
        await loadProjectsTab();
    } catch (error) {
        console.error('Error updating project:', error);
        hideLoading();
        showError('Failed to update project.');
    }
}

/**
 * Delete project from database
 * @param {string} projectId - Project ID to delete
 */
async function handleDeleteProject(projectId) {
    try {
        showLoading('Deleting project...');

        if (isDemoMode() || isDemoSession()) {
            adminDemoProjects = adminDemoProjects.filter(p => p.id !== projectId);
            adminDemoTasks = adminDemoTasks.filter(t => t.project_id !== projectId);
            adminDemoFiles = adminDemoFiles.filter(f => f.project_id !== projectId);
            adminDemoStages = adminDemoStages.filter(s => s.project_id !== projectId);
            hideLoading();
            showSuccess('Project deleted (demo – not persisted)');
            renderProjectsTable([...adminDemoProjects]);
            return;
        }

        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', projectId);

        if (error) {
            throw error;
        }

        hideLoading();
        showSuccess('Project deleted successfully');
        await loadSystemStats();
        loadedTabs.delete('projects');
        await loadProjectsTab();

    } catch (error) {
        console.error('Error deleting project:', error);
        hideLoading();
        showError('Failed to delete project.');
    }
}

// ============================================================================
// STAGES TAB
// ============================================================================

async function loadStagesTab() {
    if (loadedTabs.has('stages')) return;

    try {
        showLoading('Loading stages...');

        if (isDemoMode() || isDemoSession()) {
            initDemoAdminData();
            renderStagesTable(adminDemoStages);
            loadedTabs.add('stages');
            hideLoading();
            return;
        }

        const { data: stages, error } = await supabase
            .from('project_stages')
            .select('*, projects(id, title)')
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        renderStagesTable(stages || []);
        loadedTabs.add('stages');
        hideLoading();
    } catch (error) {
        console.error('Error loading stages:', error);
        hideLoading();

        const missingStagesTable = error?.code === '42P01'
            || String(error?.message || '').toLowerCase().includes('project_stages')
            || String(error?.message || '').toLowerCase().includes('does not exist');

        if (missingStagesTable) {
            renderStagesMigrationFallback();
            return;
        }

        showError('Failed to load stages. Ensure project_stages table migration is applied.');
    }
}

/**
 * Show a friendly fallback when project_stages table is not migrated yet.
 */
function renderStagesMigrationFallback() {
    const tbody = document.getElementById('stagesTableBody');
    const emptyState = document.getElementById('stagesEmptyState');

    if (tbody) {
        tbody.innerHTML = '';
    }

    if (emptyState) {
        emptyState.style.display = 'block';
        emptyState.innerHTML = `
            <div class="empty-state-icon"><i class="bi bi-tools"></i></div>
            <div class="empty-state-text fw-semibold">Project stages are not enabled yet</div>
            <div class="text-muted small mt-2">
                Apply the migration <strong>202602200001_project_stages.sql</strong> to enable this tab.
            </div>
        `;
    }

    showError('Project stages table is missing. Apply migration 202602200001_project_stages.sql.');
}

function renderStagesTable(stages) {
    const tbody = document.getElementById('stagesTableBody');
    const emptyState = document.getElementById('stagesEmptyState');

    if (!tbody || !emptyState) return;

    if (!stages || stages.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    tbody.innerHTML = stages.map((stage) => {
        const projectTitle = stage.projects?.title || 'Unknown project';
        const statusClass = getStatusBadgeClass(stage.status || 'planning');

        return `
            <tr>
                <td class="fw-500">${escapeHtml(safeText(stage.title, 'Untitled Stage'))}</td>
                <td><a class="text-decoration-none" href="project-details.html?id=${stage.project_id}">${escapeHtml(projectTitle)}</a></td>
                <td><span class="badge ${statusClass}">${escapeHtml(safeText(stage.status, 'planning'))}</span></td>
                <td>${Number(stage.sort_order || 0)}</td>
                <td>${formatDate(stage.created_at)}</td>
                <td>
                    <div class="d-flex align-items-center gap-1">
                        <button class="btn btn-sm btn-outline-secondary" onclick="editStagePrompt('${stage.id}', '${escapeHtml(safeText(stage.title, ''))}', '${escapeHtml(safeText(stage.status, 'planning'))}', '${Number(stage.sort_order || 0)}')" title="Edit stage">
                            <i class="bi bi-pencil me-1"></i>Edit
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteStagePrompt('${stage.id}', '${escapeHtml(safeText(stage.title, 'Stage'))}')" title="Delete stage">
                            <i class="bi bi-trash me-1"></i>Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function editStagePrompt(stageId, currentTitle, currentStatus, currentSortOrder) {
    const nextTitle = window.prompt('Stage title', currentTitle);
    if (!nextTitle) return;

    const nextStatus = window.prompt('Stage status (planning, active, completed, paused)', currentStatus);
    if (!nextStatus) return;

    const sortInput = window.prompt('Stage order (number)', currentSortOrder);
    if (sortInput === null) return;

    try {
        showLoading('Updating stage...');

        if (isDemoMode() || isDemoSession()) {
            const stage = adminDemoStages.find(s => s.id === stageId);
            if (stage) {
                stage.title = nextTitle.trim();
                stage.status = nextStatus.trim();
                stage.sort_order = Number(sortInput || 0);
            }
            hideLoading();
            showSuccess('Stage updated (demo – not persisted)');
            renderStagesTable([...adminDemoStages]);
            return;
        }

        const { error } = await supabase
            .from('project_stages')
            .update({
                title: nextTitle.trim(),
                status: nextStatus.trim(),
                sort_order: Number(sortInput || 0)
            })
            .eq('id', stageId);

        if (error) throw error;

        hideLoading();
        showSuccess('Stage updated successfully');
        loadedTabs.delete('stages');
        await loadStagesTab();
    } catch (error) {
        console.error('Error updating stage:', error);
        hideLoading();
        showError('Failed to update stage.');
    }
}

function deleteStagePrompt(stageId, stageTitle) {
    document.getElementById('deleteMessage').innerHTML =
        `Are you sure you want to delete stage <strong>${escapeHtml(stageTitle)}</strong>?<br>
        This action cannot be undone.`;

    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.className = 'btn btn-danger';
    confirmBtn.textContent = 'Delete';
    const freshBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(freshBtn, confirmBtn);
    freshBtn.addEventListener('click', () => {
        bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
        handleDeleteStage(stageId);
    });

    new bootstrap.Modal(document.getElementById('deleteModal')).show();
}

async function handleDeleteStage(stageId) {
    try {
        showLoading('Deleting stage...');

        if (isDemoMode() || isDemoSession()) {
            adminDemoStages = adminDemoStages.filter(s => s.id !== stageId);
            hideLoading();
            showSuccess('Stage deleted (demo – not persisted)');
            renderStagesTable([...adminDemoStages]);
            return;
        }

        const { error } = await supabase
            .from('project_stages')
            .delete()
            .eq('id', stageId);

        if (error) throw error;

        hideLoading();
        showSuccess('Stage deleted successfully');
        loadedTabs.delete('stages');
        await loadStagesTab();
    } catch (error) {
        console.error('Error deleting stage:', error);
        hideLoading();
        showError('Failed to delete stage.');
    }
}

// ============================================================================
// TASKS TAB
// ============================================================================

async function loadTasksTab() {
    if (loadedTabs.has('tasks')) return;

    try {
        showLoading('Loading tasks...');

        if (isDemoMode() || isDemoSession()) {
            initDemoAdminData();
            renderTasksTable(adminDemoTasks);
            loadedTabs.add('tasks');
            hideLoading();
            return;
        }

        const { data: tasks, error } = await supabase
            .from('tasks')
            .select('*, projects(id, title)')
            .order('created_at', { ascending: false })
            .limit(300);

        if (error) {
            throw error;
        }

        renderTasksTable(tasks || []);
        loadedTabs.add('tasks');
        hideLoading();
    } catch (error) {
        console.error('Error loading tasks:', error);
        hideLoading();
        showError('Failed to load tasks.');
    }
}

function renderTasksTable(tasks) {
    const tbody = document.getElementById('tasksTableBody');
    const emptyState = document.getElementById('tasksEmptyState');

    if (!tbody || !emptyState) return;

    if (!tasks || tasks.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    tbody.innerHTML = tasks.map((task) => {
        const projectTitle = task.projects?.title || 'Unknown project';
        const statusClass = getStatusBadgeClass(task.status || 'todo');

        return `
            <tr>
                <td class="fw-500">${escapeHtml(safeText(task.title, 'Untitled Task'))}</td>
                <td><a class="text-decoration-none" href="project-details.html?id=${task.project_id}">${escapeHtml(projectTitle)}</a></td>
                <td><span class="badge ${statusClass}">${escapeHtml(safeText(task.status, 'todo'))}</span></td>
                <td><span class="badge bg-light text-dark border">${escapeHtml(safeText(task.priority, 'medium'))}</span></td>
                <td>${task.due_date ? formatDate(task.due_date) : '-'}</td>
                <td>
                    <div class="d-flex align-items-center gap-1">
                        <button class="btn btn-sm btn-outline-secondary" onclick="editTaskPrompt('${task.id}', '${escapeHtml(safeText(task.title, ''))}', '${escapeHtml(safeText(task.status, 'todo'))}', '${escapeHtml(safeText(task.priority, 'medium'))}')" title="Edit task">
                            <i class="bi bi-pencil me-1"></i>Edit
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteTaskPrompt('${task.id}', '${escapeHtml(safeText(task.title, 'Task'))}')" title="Delete task">
                            <i class="bi bi-trash me-1"></i>Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function editTaskPrompt(taskId, currentTitle, currentStatus, currentPriority) {
    const nextTitle = window.prompt('Task title', currentTitle);
    if (!nextTitle) return;

    const nextStatus = window.prompt('Task status (todo, in_progress, done)', currentStatus);
    if (!nextStatus) return;

    const nextPriority = window.prompt('Task priority (low, medium, high)', currentPriority);
    if (!nextPriority) return;

    try {
        showLoading('Updating task...');

        if (isDemoMode() || isDemoSession()) {
            const task = adminDemoTasks.find(t => t.id === taskId);
            if (task) {
                task.title = nextTitle.trim();
                task.status = nextStatus.trim();
                task.priority = nextPriority.trim();
            }
            hideLoading();
            showSuccess('Task updated (demo – not persisted)');
            renderTasksTable([...adminDemoTasks]);
            return;
        }

        const { error } = await supabase
            .from('tasks')
            .update({
                title: nextTitle.trim(),
                status: nextStatus.trim(),
                priority: nextPriority.trim()
            })
            .eq('id', taskId);

        if (error) throw error;

        hideLoading();
        showSuccess('Task updated successfully');
        loadedTabs.delete('tasks');
        await loadTasksTab();
    } catch (error) {
        console.error('Error updating task:', error);
        hideLoading();
        showError('Failed to update task.');
    }
}

function deleteTaskPrompt(taskId, taskTitle) {
    document.getElementById('deleteMessage').innerHTML =
        `Are you sure you want to delete task <strong>${escapeHtml(taskTitle)}</strong>?<br>
        This action cannot be undone.`;

    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.className = 'btn btn-danger';
    confirmBtn.textContent = 'Delete';
    const freshBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(freshBtn, confirmBtn);
    freshBtn.addEventListener('click', () => {
        bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
        handleDeleteTask(taskId);
    });

    new bootstrap.Modal(document.getElementById('deleteModal')).show();
}

async function handleDeleteTask(taskId) {
    try {
        showLoading('Deleting task...');

        if (isDemoMode() || isDemoSession()) {
            adminDemoTasks = adminDemoTasks.filter(t => t.id !== taskId);
            hideLoading();
            showSuccess('Task deleted (demo – not persisted)');
            renderTasksTable([...adminDemoTasks]);
            return;
        }

        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId);

        if (error) throw error;

        hideLoading();
        showSuccess('Task deleted successfully');
        loadedTabs.delete('tasks');
        await loadTasksTab();
    } catch (error) {
        console.error('Error deleting task:', error);
        hideLoading();
        showError('Failed to delete task.');
    }
}

// ============================================================================
// FILES TAB
// ============================================================================

async function loadFilesTab() {
    if (loadedTabs.has('files')) return;

    try {
        showLoading('Loading files...');

        if (isDemoMode() || isDemoSession()) {
            initDemoAdminData();
            renderFilesTable(adminDemoFiles);
            loadedTabs.add('files');
            hideLoading();
            return;
        }

        const { data: files, error } = await supabase
            .from('project_files')
            .select('*, projects(id, title)')
            .order('uploaded_at', { ascending: false })
            .limit(300);

        if (error) {
            throw error;
        }

        renderFilesTable(files || []);
        loadedTabs.add('files');
        hideLoading();
    } catch (error) {
        console.error('Error loading files:', error);
        hideLoading();
        showError('Failed to load files.');
    }
}

function renderFilesTable(files) {
    const tbody = document.getElementById('filesTableBody');
    const emptyState = document.getElementById('filesEmptyState');

    if (!tbody || !emptyState) return;

    if (!files || files.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    tbody.innerHTML = files.map((file) => {
        const projectTitle = file.projects?.title || 'Unknown project';
        const uploadedDate = file.uploaded_at || file.created_at;

        return `
            <tr>
                <td class="fw-500">${escapeHtml(safeText(file.file_name, 'Unnamed file'))}</td>
                <td><a class="text-decoration-none" href="project-details.html?id=${file.project_id}">${escapeHtml(projectTitle)}</a></td>
                <td><span class="badge bg-light text-dark border">${escapeHtml(safeText(file.category, 'other'))}</span></td>
                <td>${formatFileSize(file.file_size)}</td>
                <td>${uploadedDate ? formatDate(uploadedDate) : '-'}</td>
                <td>
                    <div class="d-flex align-items-center gap-1">
                        ${file.file_url
                            ? `<a class="btn btn-sm btn-outline-primary" href="${file.file_url}" target="_blank" rel="noopener noreferrer" title="View file"><i class="bi bi-eye me-1"></i>View</a>`
                            : '<button class="btn btn-sm btn-outline-primary" disabled title="No file URL"><i class="bi bi-eye me-1"></i>View</button>'}
                        <button class="btn btn-sm btn-outline-secondary" onclick="editFilePrompt('${file.id}', '${escapeHtml(safeText(file.file_name, ''))}', '${escapeHtml(safeText(file.category, 'other'))}')" title="Edit file metadata">
                            <i class="bi bi-pencil me-1"></i>Edit
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteFilePrompt('${file.id}', '${escapeHtml(safeText(file.file_name, 'File'))}')" title="Delete file">
                            <i class="bi bi-trash me-1"></i>Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function editFilePrompt(fileId, currentName, currentCategory) {
    const nextName = window.prompt('File name', currentName);
    if (!nextName) return;

    const nextCategory = window.prompt('File category (image, document, deliverable, report, other)', currentCategory);
    if (!nextCategory) return;

    try {
        showLoading('Updating file metadata...');

        if (isDemoMode() || isDemoSession()) {
            const file = adminDemoFiles.find(f => f.id === fileId);
            if (file) {
                file.file_name = nextName.trim();
                file.category = nextCategory.trim();
            }
            hideLoading();
            showSuccess('File updated (demo – not persisted)');
            renderFilesTable([...adminDemoFiles]);
            return;
        }

        const { error } = await supabase
            .from('project_files')
            .update({
                file_name: nextName.trim(),
                category: nextCategory.trim()
            })
            .eq('id', fileId);

        if (error) throw error;

        hideLoading();
        showSuccess('File metadata updated successfully');
        loadedTabs.delete('files');
        await loadFilesTab();
    } catch (error) {
        console.error('Error updating file:', error);
        hideLoading();
        showError('Failed to update file metadata.');
    }
}

function deleteFilePrompt(fileId, fileName) {
    document.getElementById('deleteMessage').innerHTML =
        `Are you sure you want to delete file <strong>${escapeHtml(fileName)}</strong>?<br>
        This action cannot be undone.`;

    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.className = 'btn btn-danger';
    confirmBtn.textContent = 'Delete';
    const freshBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(freshBtn, confirmBtn);
    freshBtn.addEventListener('click', () => {
        bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
        handleDeleteFile(fileId);
    });

    new bootstrap.Modal(document.getElementById('deleteModal')).show();
}

async function handleDeleteFile(fileId) {
    try {
        showLoading('Deleting file...');

        if (isDemoMode() || isDemoSession()) {
            adminDemoFiles = adminDemoFiles.filter(f => f.id !== fileId);
            hideLoading();
            showSuccess('File deleted (demo – not persisted)');
            renderFilesTable([...adminDemoFiles]);
            return;
        }

        const { error } = await supabase
            .from('project_files')
            .delete()
            .eq('id', fileId);

        if (error) throw error;

        hideLoading();
        showSuccess('File deleted successfully');
        loadedTabs.delete('files');
        await loadFilesTab();
    } catch (error) {
        console.error('Error deleting file:', error);
        hideLoading();
        showError('Failed to delete file.');
    }
}

// ============================================================================
// ACTIVITY TAB
// ============================================================================

/**
 * Load and display activity log tab
 */
async function loadActivityTab() {
    if (loadedTabs.has('activity')) return;

    try {
        showLoading('Loading activity...');

        if (isDemoMode() || isDemoSession()) {
            initDemoAdminData();
            renderActivityTable(adminDemoActivity);
            loadedTabs.add('activity');
            hideLoading();
            return;
        }

        const { data: activities, error } = await supabase
            .from('project_updates')
            .select('*, profiles(full_name, email), projects(title)')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            throw error;
        }

        renderActivityTable(activities || []);
        loadedTabs.add('activity');
        hideLoading();

    } catch (error) {
        console.error('Error loading activity:', error);
        hideLoading();
        showError('Failed to load activity log.');
    }
}

/**
 * Render activity table with data
 * @param {Array} activities - Array of activity/update objects
 */
function renderActivityTable(activities) {
    const tbody = document.getElementById('activityTableBody');
    const emptyState = document.getElementById('activityEmptyState');

    if (!activities || activities.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    tbody.innerHTML = activities.map(activity => {
        const user = activity.profiles?.full_name || 'Unknown User';
        const project = activity.projects?.title || 'Deleted Project';
        const projectId = activity.project_id;

        return `
            <tr>
                <td>${getRelativeTime(activity.created_at)}</td>
                <td>${escapeHtml(user)}</td>
                <td>${escapeHtml(activity.update_type)}</td>
                <td>
                    <a href="project-details.html?id=${projectId}" class="text-decoration-none">
                        ${escapeHtml(project)}
                    </a>
                </td>
                <td><small>${escapeHtml(activity.description || '')}</small></td>
            </tr>
        `;
    }).join('');
}

/**
 * Export activity log to CSV
 */
async function handleExportActivity() {
    try {
        let activities;

        if (isDemoMode() || isDemoSession()) {
            initDemoAdminData();
            activities = adminDemoActivity;
        } else {
            const { data, error } = await supabase
                .from('project_updates')
                .select('*, profiles(full_name), projects(title)')
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }
            activities = data || [];
        }

        // Convert to CSV
        const headers = ['Time', 'User', 'Action', 'Project', 'Details'];
        const rows = (activities || []).map(a => [
            new Date(a.created_at).toLocaleString(),
            a.profiles?.full_name || 'Unknown',
            a.update_type,
            a.projects?.title || 'Deleted',
            a.description || a.update_text || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `activity-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        showSuccess('Activity log exported successfully');

    } catch (error) {
        console.error('Error exporting activity:', error);
        showError('Failed to export activity log.');
    }
}

// ============================================================================
// TAB LISTENERS
// ============================================================================

/**
 * Setup tab change listeners for lazy loading
 */
function setupTabListeners() {
    const usersTab = document.getElementById('users-tab');
    const projectsTab = document.getElementById('projects-tab');
    const stagesTab = document.getElementById('stages-tab');
    const tasksTab = document.getElementById('tasks-tab');
    const filesTab = document.getElementById('files-tab');
    const activityTab = document.getElementById('activity-tab');

    usersTab?.addEventListener('shown.bs.tab', () => loadUsersTab());
    projectsTab?.addEventListener('shown.bs.tab', () => loadProjectsTab());
    stagesTab?.addEventListener('shown.bs.tab', () => loadStagesTab());
    tasksTab?.addEventListener('shown.bs.tab', () => loadTasksTab());
    filesTab?.addEventListener('shown.bs.tab', () => loadFilesTab());
    activityTab?.addEventListener('shown.bs.tab', () => loadActivityTab());
}

// ============================================================================
// SEARCH LISTENERS
// ============================================================================

/**
 * Setup search input listeners with debouncing
 */
function setupSearchListeners() {
    const userSearch = document.getElementById('userSearch');
    const projectSearch = document.getElementById('projectSearch');
    const stageSearch = document.getElementById('stageSearch');
    const taskSearch = document.getElementById('taskSearch');
    const fileSearch = document.getElementById('fileSearch');

    let userSearchTimeout;
    let projectSearchTimeout;
    let stageSearchTimeout;
    let taskSearchTimeout;
    let fileSearchTimeout;

    userSearch?.addEventListener('input', (e) => {
        clearTimeout(userSearchTimeout);
        currentSearches.users = e.target.value;
        userSearchTimeout = setTimeout(() => {
            filterAndRenderUsers();
        }, 300);
    });

    projectSearch?.addEventListener('input', (e) => {
        clearTimeout(projectSearchTimeout);
        currentSearches.projects = e.target.value;
        projectSearchTimeout = setTimeout(() => {
            filterAndRenderProjects();
        }, 300);
    });

    stageSearch?.addEventListener('input', (e) => {
        clearTimeout(stageSearchTimeout);
        currentSearches.stages = e.target.value;
        stageSearchTimeout = setTimeout(() => {
            filterAndRenderStages();
        }, 300);
    });

    taskSearch?.addEventListener('input', (e) => {
        clearTimeout(taskSearchTimeout);
        currentSearches.tasks = e.target.value;
        taskSearchTimeout = setTimeout(() => {
            filterAndRenderTasks();
        }, 300);
    });

    fileSearch?.addEventListener('input', (e) => {
        clearTimeout(fileSearchTimeout);
        currentSearches.files = e.target.value;
        fileSearchTimeout = setTimeout(() => {
            filterAndRenderFiles();
        }, 300);
    });
}

// ============================================================================
// FILTER LISTENERS
// ============================================================================

/**
 * Setup filter dropdown listeners
 */
function setupFilterListeners() {
    document.getElementById('userRoleFilter')?.addEventListener('change', (e) => {
        currentFilters.userRole = e.target.value;
        filterAndRenderUsers();
    });

    document.getElementById('projectTypeFilter')?.addEventListener('change', (e) => {
        currentFilters.projectType = e.target.value;
        filterAndRenderProjects();
    });

    document.getElementById('projectStatusFilter')?.addEventListener('change', (e) => {
        currentFilters.projectStatus = e.target.value;
        filterAndRenderProjects();
    });

    document.getElementById('taskStatusFilter')?.addEventListener('change', (e) => {
        currentFilters.taskStatus = e.target.value;
        filterAndRenderTasks();
    });

    document.getElementById('fileCategoryFilter')?.addEventListener('change', (e) => {
        currentFilters.fileCategory = e.target.value;
        filterAndRenderFiles();
    });

    document.getElementById('activityDateFilter')?.addEventListener('change', (e) => {
        currentFilters.activityDate = e.target.value;
        loadActivityTab();
    });

    document.getElementById('activityTypeFilter')?.addEventListener('change', (e) => {
        currentFilters.activityType = e.target.value;
        // Could implement filtering here
    });
}

/**
 * Filter and re-render users table
 */
async function filterAndRenderUsers() {
    try {
        if (isDemoMode() || isDemoSession()) {
            initDemoAdminData();
            let filtered = [...adminDemoUsers];
            if (currentFilters.userRole) {
                filtered = filtered.filter(u => u.role === currentFilters.userRole);
            }
            if (currentSearches.users) {
                const s = currentSearches.users.toLowerCase();
                filtered = filtered.filter(u =>
                    (u.full_name?.toLowerCase() || '').includes(s) ||
                    (u.email?.toLowerCase() || '').includes(s)
                );
            }
            renderUsersTable(filtered);
            return;
        }

        let query = supabase
            .from('profiles')
            .select('*, user_roles(role_id, roles(name))');

        const { data: users, error } = await query.order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        // Apply search filter
        let filtered = normalizeUsersForAdmin(users || []);

        if (currentFilters.userRole) {
            filtered = filtered.filter((u) => u.role === currentFilters.userRole);
        }

        if (currentSearches.users) {
            const searchLower = currentSearches.users.toLowerCase();
            filtered = filtered.filter(u => 
                (u.full_name?.toLowerCase() || '').includes(searchLower) ||
                (u.email?.toLowerCase() || '').includes(searchLower)
            );
        }

        renderUsersTable(filtered);

    } catch (error) {
        console.error('Error filtering users:', error);
        showError('Failed to filter users.');
    }
}

/**
 * Filter and re-render projects table
 */
async function filterAndRenderProjects() {
    try {
        if (isDemoMode() || isDemoSession()) {
            initDemoAdminData();
            let filtered = [...adminDemoProjects];
            if (currentFilters.projectType) {
                filtered = filtered.filter(p => p.project_type === currentFilters.projectType);
            }
            if (currentFilters.projectStatus) {
                filtered = filtered.filter(p => p.status === currentFilters.projectStatus);
            }
            if (currentSearches.projects) {
                const s = currentSearches.projects.toLowerCase();
                filtered = filtered.filter(p => (p.title?.toLowerCase() || '').includes(s));
            }
            renderProjectsTable(filtered);
            return;
        }

        let query = supabase
            .from('projects')
            .select('*, profiles(full_name, email), tasks(status)');

        // Apply type filter
        if (currentFilters.projectType) {
            query = query.eq('project_type', currentFilters.projectType);
        }

        // Apply status filter
        if (currentFilters.projectStatus) {
            query = query.eq('status', currentFilters.projectStatus);
        }

        const { data: projects, error } = await query.order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        // Apply search filter
        let filtered = projects || [];
        if (currentSearches.projects) {
            const searchLower = currentSearches.projects.toLowerCase();
            filtered = filtered.filter(p => 
                (p.title?.toLowerCase() || '').includes(searchLower)
            );
        }

        renderProjectsTable(filtered);

    } catch (error) {
        console.error('Error filtering projects:', error);
        showError('Failed to filter projects.');
    }
}

/**
 * Filter and re-render stages table.
 */
async function filterAndRenderStages() {
    try {
        if (isDemoMode() || isDemoSession()) {
            initDemoAdminData();
            let filtered = [...adminDemoStages];
            if (currentSearches.stages) {
                const s = currentSearches.stages.toLowerCase();
                filtered = filtered.filter(stage =>
                    (stage.title?.toLowerCase() || '').includes(s) ||
                    (stage.projects?.title?.toLowerCase() || '').includes(s)
                );
            }
            renderStagesTable(filtered);
            return;
        }

        const { data: stages, error } = await supabase
            .from('project_stages')
            .select('*, projects(id, title)')
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        let filtered = stages || [];

        if (currentSearches.stages) {
            const searchLower = currentSearches.stages.toLowerCase();
            filtered = filtered.filter((stage) =>
                (stage.title?.toLowerCase() || '').includes(searchLower)
                || (stage.projects?.title?.toLowerCase() || '').includes(searchLower)
            );
        }

        renderStagesTable(filtered);
    } catch (error) {
        console.error('Error filtering stages:', error);

        const missingStagesTable = error?.code === '42P01'
            || String(error?.message || '').toLowerCase().includes('project_stages')
            || String(error?.message || '').toLowerCase().includes('does not exist');

        if (missingStagesTable) {
            renderStagesMigrationFallback();
            return;
        }

        showError('Failed to filter stages.');
    }
}

/**
 * Filter and re-render tasks table.
 */
async function filterAndRenderTasks() {
    try {
        if (isDemoMode() || isDemoSession()) {
            initDemoAdminData();
            let filtered = [...adminDemoTasks];
            if (currentFilters.taskStatus) {
                filtered = filtered.filter(t => t.status === currentFilters.taskStatus);
            }
            if (currentSearches.tasks) {
                const s = currentSearches.tasks.toLowerCase();
                filtered = filtered.filter(t =>
                    (t.title?.toLowerCase() || '').includes(s) ||
                    (t.projects?.title?.toLowerCase() || '').includes(s)
                );
            }
            renderTasksTable(filtered);
            return;
        }

        let query = supabase
            .from('tasks')
            .select('*, projects(id, title)');

        if (currentFilters.taskStatus) {
            query = query.eq('status', currentFilters.taskStatus);
        }

        const { data: tasks, error } = await query
            .order('created_at', { ascending: false })
            .limit(300);

        if (error) {
            throw error;
        }

        let filtered = tasks || [];

        if (currentSearches.tasks) {
            const searchLower = currentSearches.tasks.toLowerCase();
            filtered = filtered.filter((task) =>
                (task.title?.toLowerCase() || '').includes(searchLower)
                || (task.projects?.title?.toLowerCase() || '').includes(searchLower)
            );
        }

        renderTasksTable(filtered);
    } catch (error) {
        console.error('Error filtering tasks:', error);
        showError('Failed to filter tasks.');
    }
}

/**
 * Filter and re-render files table.
 */
async function filterAndRenderFiles() {
    try {
        if (isDemoMode() || isDemoSession()) {
            initDemoAdminData();
            let filtered = [...adminDemoFiles];
            if (currentFilters.fileCategory) {
                filtered = filtered.filter(f => f.category === currentFilters.fileCategory);
            }
            if (currentSearches.files) {
                const s = currentSearches.files.toLowerCase();
                filtered = filtered.filter(f =>
                    (f.file_name?.toLowerCase() || '').includes(s) ||
                    (f.projects?.title?.toLowerCase() || '').includes(s)
                );
            }
            renderFilesTable(filtered);
            return;
        }

        let query = supabase
            .from('project_files')
            .select('*, projects(id, title)');

        if (currentFilters.fileCategory) {
            query = query.eq('category', currentFilters.fileCategory);
        }

        const { data: files, error } = await query
            .order('uploaded_at', { ascending: false })
            .limit(300);

        if (error) {
            throw error;
        }

        let filtered = files || [];

        if (currentSearches.files) {
            const searchLower = currentSearches.files.toLowerCase();
            filtered = filtered.filter((file) =>
                (file.file_name?.toLowerCase() || '').includes(searchLower)
                || (file.projects?.title?.toLowerCase() || '').includes(searchLower)
            );
        }

        renderFilesTable(filtered);
    } catch (error) {
        console.error('Error filtering files:', error);
        showError('Failed to filter files.');
    }
}

// ============================================================================
// EVENT LISTENERS SETUP
// ============================================================================

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Refresh button
    document.getElementById('refreshBtn')?.addEventListener('click', async () => {
        await loadSystemStats();
        await loadCharts();
        showSuccess('Data refreshed');
    });

    // Export activity button
    document.getElementById('exportActivityBtn')?.addEventListener('click', handleExportActivity);

    // Settings form
    document.getElementById('settingsForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleSaveSettings();
    });
}

/**
 * Handle settings save
 */
async function handleSaveSettings() {
    try {
        const maintenanceMode = document.getElementById('maintenanceMode').checked;
        const allowRegistrations = document.getElementById('allowRegistrations').checked;
        const maxFileSize = document.getElementById('maxFileSize').value;
        const siteAnnouncement = document.getElementById('siteAnnouncement').value;

        // Here you would save settings to a settings table
        // For now, just show success
        localStorage.setItem('adminSettings', JSON.stringify({
            maintenanceMode,
            allowRegistrations,
            maxFileSize,
            siteAnnouncement
        }));

        showSuccess('Settings saved successfully');

    } catch (error) {
        console.error('Error saving settings:', error);
        showError('Failed to save settings.');
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create an avatar element with initials
 * @param {string} name - User name
 * @param {string} color - Background color
 * @returns {string} HTML string for avatar
 */
function createAvatar(name, color = '#0d6efd') {
    const initials = name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return `
        <div class="avatar-mini" style="background-color: ${color};">
            ${initials}
        </div>
    `;
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    if (text === null || text === undefined) {
        return '';
    }

    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Expose handlers used by inline table actions
window.viewUserProfile = viewUserProfile;
window.changeUserRole = changeUserRole;
window.deleteUserPrompt = deleteUserPrompt;
window.deleteProjectPrompt = deleteProjectPrompt;
window.editProjectPrompt = editProjectPrompt;
window.editStagePrompt = editStagePrompt;
window.deleteStagePrompt = deleteStagePrompt;
window.editTaskPrompt = editTaskPrompt;
window.deleteTaskPrompt = deleteTaskPrompt;
window.editFilePrompt = editFilePrompt;
window.deleteFilePrompt = deleteFilePrompt;

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', initAdminPanel);
