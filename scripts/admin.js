import { checkAuth, getCurrentUser, isAdmin } from './auth.js';
import { supabase } from '../services/supabase.js';
import { showLoading, hideLoading, showSuccess, showError, confirm } from '../utils/ui.js';
import { formatDate, getRelativeTime, getStatusBadgeClass, getTypeBadgeClass } from '../utils/helpers.js';

// ============================================================================
// STATE VARIABLES
// ============================================================================

let currentUser = null;
let loadedTabs = new Set();
let currentFilters = {
    userRole: '',
    projectType: '',
    projectStatus: '',
    activityDate: '7',
    activityType: ''
};
let currentSearches = {
    users: '',
    projects: ''
};
let userCharts = {
    typeChart: null,
    statusChart: null
};
let currentPagination = {
    users: { page: 1, pageSize: 20 },
    projects: { page: 1, pageSize: 20 },
    activity: { page: 1, pageSize: 20 }
};

// ============================================================================
// MAIN INITIALIZATION
// ============================================================================

/**
 * Initialize the admin panel on page load
 * Checks admin access, loads stats, sets up listeners
 */
async function initAdminPanel() {
    try {
        // Check authentication
        const user = await checkAuth();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        // Check admin access
        const hasAdminAccess = await checkAdminAccess();
        if (!hasAdminAccess) {
            return;
        }

        currentUser = user;

        // Update navbar
        const userName = user.user_metadata?.full_name || user.email.split('@')[0];
        document.getElementById('userNameNav').textContent = userName;

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
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('auth_user');
            window.location.href = 'login.html';
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
async function checkAdminAccess() {
    try {
        const user = await getCurrentUser();
        
        if (!user || !isAdmin(user)) {
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

        const { data: users, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        renderUsersTable(users || []);
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
        const roleBadge = user.user_role === 'admin' 
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
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-primary btn-sm" onclick="viewUserProfile('${user.id}')" title="View profile">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-outline-warning btn-sm" onclick="changeUserRole('${user.id}', '${escapeHtml(user.full_name || user.email)}', '${user.user_role}')" title="Change role">
                            <i class="bi bi-shield-lock"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="deleteUserPrompt('${user.id}', '${escapeHtml(user.full_name || user.email)}')" title="Delete user">
                            <i class="bi bi-trash"></i>
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

        const { error } = await supabase
            .from('profiles')
            .update({ user_role: newRole })
            .eq('id', userId);

        if (error) {
            throw error;
        }

        bootstrap.Modal.getInstance(document.getElementById('userRoleModal')).hide();
        showSuccess(`User role updated to ${newRole}`);
        await loadUsersTab();

    } catch (error) {
        console.error('Error changing user role:', error);
        showError('Failed to update user role.');
    }
}

/**
 * Show delete confirmation for user
 * @param {string} userId - User ID
 * @param {string} userName - User name for display
 */
function deleteUserPrompt(userId, userName) {
    const result = confirm(
        `Are you sure you want to delete ${userName}? All their projects and data will be deleted. This cannot be undone.`,
        'Delete User',
        true
    );

    if (result) {
        handleDeleteUser(userId);
    }
}

/**
 * Delete user from database
 * @param {string} userId - User ID to delete
 */
async function handleDeleteUser(userId) {
    try {
        showLoading('Deleting user...');

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
        await loadUsersTab();

    } catch (error) {
        console.error('Error deleting user:', error);
        hideLoading();
        showError('Failed to delete user.');
    }
}

/**
 * View user profile (navigate to user details)
 * @param {string} userId - User ID
 */
function viewUserProfile(userId) {
    // Could implement a user detail modal or page
    showError('User profile view not yet implemented.');
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
                    <div class="btn-group btn-group-sm" role="group">
                        <a href="project-details.html?id=${project.id}" class="btn btn-outline-primary btn-sm" title="View details">
                            <i class="bi bi-eye"></i>
                        </a>
                        <button class="btn btn-outline-danger btn-sm" onclick="deleteProjectPrompt('${project.id}', '${escapeHtml(project.title)}')" title="Delete project">
                            <i class="bi bi-trash"></i>
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
    const result = confirm(
        `Are you sure you want to delete "${projectTitle}" and all its tasks and files? This cannot be undone.`,
        'Delete Project',
        true
    );

    if (result) {
        handleDeleteProject(projectId);
    }
}

/**
 * Delete project from database
 * @param {string} projectId - Project ID to delete
 */
async function handleDeleteProject(projectId) {
    try {
        showLoading('Deleting project...');

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
        await loadProjectsTab();

    } catch (error) {
        console.error('Error deleting project:', error);
        hideLoading();
        showError('Failed to delete project.');
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
        const { data: activities, error } = await supabase
            .from('project_updates')
            .select('*, profiles(full_name), projects(title)')
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        // Convert to CSV
        const headers = ['Time', 'User', 'Action', 'Project', 'Details'];
        const rows = (activities || []).map(a => [
            new Date(a.created_at).toLocaleString(),
            a.profiles?.full_name || 'Unknown',
            a.update_type,
            a.projects?.title || 'Deleted',
            a.description || ''
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
    const activityTab = document.getElementById('activity-tab');

    usersTab?.addEventListener('shown.bs.tab', () => loadUsersTab());
    projectsTab?.addEventListener('shown.bs.tab', () => loadProjectsTab());
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

    let userSearchTimeout;
    let projectSearchTimeout;

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
        let query = supabase
            .from('profiles')
            .select('*');

        // Apply role filter
        if (currentFilters.userRole) {
            query = query.eq('user_role', currentFilters.userRole);
        }

        const { data: users, error } = await query.order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        // Apply search filter
        let filtered = users || [];
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
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', initAdminPanel);
