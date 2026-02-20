import { supabase } from '../services/supabase.js';
import { checkAuth } from './auth.js';
import { isDemoMode, demoServices, DEMO_USER, DEMO_CONTACTS } from '../utils/demoMode.js';
import { showError, showSuccess, showLoading, hideLoading, confirm } from '../utils/uiModular.js';
import { NavBar } from './components/NavBar.js';

let projectId = null;
let currentUser = null;
let currentProject = null;
let projectMembers = [];
let allUsers = [];
let isOwner = false;

/**
 * Initialize project members page.
 * @returns {Promise<void>}
 */
export async function initProjectUsersPage() {
  try {
    projectId = getProjectIdFromUrl();

    if (!projectId) {
      showError('Missing project ID in URL.');
      return;
    }

    currentUser = await resolveCurrentUser();
    initNavBar();

    await loadData();
    setupEventListeners();
  } catch (error) {
    console.error('Failed to initialize project members page:', error);
    showError('Failed to initialize members page.');
  }
}

/**
 * Resolve current user from auth/demo mode.
 * @returns {Promise<object|null>} Current user object.
 */
async function resolveCurrentUser() {
  if (isDemoMode()) {
    return demoServices.auth.getCurrentUser();
  }

  return checkAuth();
}

/**
 * Initialize modular navbar.
 * @returns {void}
 */
function initNavBar() {
  new NavBar('navbarContainer', {
    menuItems: [
      { text: 'Dashboard', href: './dashboard.html', icon: 'bi-speedometer2', active: false },
      { text: 'Projects', href: './projects.html', icon: 'bi-folder', active: true },
      { text: 'Tasks', href: './tasks.html', icon: 'bi-check-square', active: false },
      { text: 'Files', href: './files.html', icon: 'bi-file-earmark', active: false }
    ]
  });
}

/**
 * Load project, members and users data.
 * @returns {Promise<void>}
 */
async function loadData() {
  showLoading('Loading project members...');

  try {
    if (isDemoMode()) {
      await loadDemoData();
    } else {
      await loadSupabaseData();
    }

    isOwner = currentProject?.user_id === currentUser?.id;

    renderPageMeta();
    renderMembersTable();
    renderUsersList();
    applyOwnerPermissions();
  } finally {
    hideLoading();
  }
}

/**
 * Load data in demo mode.
 * @returns {Promise<void>}
 */
async function loadDemoData() {
  currentProject = await demoServices.projects.getById(projectId);
  if (!currentProject) {
    throw new Error('Project not found');
  }

  projectMembers = await demoServices.teamMembers.getByProject(projectId);

  const contactUsers = DEMO_CONTACTS.map(contact => ({
    id: contact.contact_user_id || contact.id,
    full_name: contact.name,
    email: contact.email,
    avatar_url: contact.avatar_url || null
  }));

  allUsers = [
    {
      id: DEMO_USER.id,
      full_name: DEMO_USER.full_name,
      email: DEMO_USER.email,
      avatar_url: DEMO_USER.avatar_url
    },
    ...contactUsers
  ];
}

/**
 * Load data from Supabase.
 * @returns {Promise<void>}
 */
async function loadSupabaseData() {
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, title, user_id')
    .eq('id', projectId)
    .single();

  if (projectError) {
    throw projectError;
  }

  currentProject = project;

  const { data: membersData, error: membersError } = await supabase
    .from('project_members')
    .select('id, project_id, user_id, role, created_at, profiles(id, full_name, email, avatar_url)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (membersError) {
    throw membersError;
  }

  projectMembers = membersData || [];

  const { data: usersData, error: usersError } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .order('full_name', { ascending: true });

  if (usersError) {
    throw usersError;
  }

  allUsers = usersData || [];
}

/**
 * Render page title and back links.
 * @returns {void}
 */
function renderPageMeta() {
  const subtitleEl = document.getElementById('projectUsersSubtitle');
  const backBtn = document.getElementById('backToDetailsBtn');

  if (subtitleEl && currentProject) {
    subtitleEl.textContent = `Project: ${currentProject.title}`;
  }

  if (backBtn) {
    backBtn.href = `./project-details.html?id=${encodeURIComponent(projectId)}${isDemoMode() ? '&demo=true' : ''}`;
  }
}

/**
 * Render assigned members table.
 * @returns {void}
 */
function renderMembersTable() {
  const tbody = document.getElementById('projectMembersBody');
  if (!tbody) return;

  if (!projectMembers.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-4 text-muted">No users assigned yet.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = projectMembers.map(member => {
    const profile = member.profiles || member;
    const displayName = profile.full_name || profile.name || profile.email || 'Unknown user';
    const displayEmail = profile.email || '-';
    const assignedAt = member.created_at || member.joined_at;

    const canRemove = isOwner && member.user_id !== currentProject.user_id;

    return `
      <tr>
        <td class="ps-4">
          <div class="d-flex align-items-center gap-2">
            <span class="avatar-circle bg-primary-subtle text-primary d-inline-flex align-items-center justify-content-center" style="width: 32px; height: 32px;">
              ${(displayName || '?').charAt(0).toUpperCase()}
            </span>
            <span class="fw-medium">${escapeHtml(displayName)}</span>
          </div>
        </td>
        <td>${escapeHtml(displayEmail)}</td>
        <td><span class="badge text-bg-light border">${member.role || 'member'}</span></td>
        <td>${assignedAt ? formatDate(assignedAt) : '-'}</td>
        <td class="pe-4 text-end">
          ${canRemove ? `
            <button class="btn btn-sm btn-outline-danger" data-remove-user-id="${member.user_id}" data-remove-user-name="${escapeHtml(displayName)}">
              <i class="bi bi-person-dash"></i>
            </button>
          ` : '<span class="text-muted small">-</span>'}
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Render selectable users in Add User modal.
 * @returns {void}
 */
function renderUsersList() {
  const usersList = document.getElementById('usersList');
  if (!usersList) return;

  const assignedUserIds = new Set(projectMembers.map(member => member.user_id));

  usersList.innerHTML = allUsers.map(user => {
    const displayName = user.full_name || user.name || user.email || 'Unknown user';
    const isAssigned = assignedUserIds.has(user.id);

    return `
      <div class="list-group-item d-flex align-items-center justify-content-between user-list-row" data-search="${escapeHtml((displayName + ' ' + (user.email || '')).toLowerCase())}">
        <div>
          <div class="fw-medium">${escapeHtml(displayName)}</div>
          <small class="text-muted">${escapeHtml(user.email || '-')}</small>
        </div>
        <button class="btn btn-sm ${isAssigned ? 'btn-outline-secondary' : 'btn-primary'}" data-add-user-id="${user.id}" ${isAssigned || !isOwner ? 'disabled' : ''}>
          ${isAssigned ? 'Assigned' : 'Add'}
        </button>
      </div>
    `;
  }).join('');
}

/**
 * Apply owner-only UI rules.
 * @returns {void}
 */
function applyOwnerPermissions() {
  const addBtn = document.getElementById('addUserBtn');
  const readOnlyAlert = document.getElementById('membersReadOnlyAlert');

  if (addBtn) {
    addBtn.disabled = !isOwner;
  }

  if (readOnlyAlert) {
    readOnlyAlert.classList.toggle('d-none', isOwner);
  }
}

/**
 * Register page event listeners.
 * @returns {void}
 */
function setupEventListeners() {
  document.addEventListener('click', async (event) => {
    const removeBtn = event.target.closest('[data-remove-user-id]');
    if (removeBtn) {
      const userId = removeBtn.getAttribute('data-remove-user-id');
      const userName = removeBtn.getAttribute('data-remove-user-name') || 'this user';
      await removeUserFromProject(userId, userName);
      return;
    }

    const addBtn = event.target.closest('[data-add-user-id]');
    if (addBtn) {
      const userId = addBtn.getAttribute('data-add-user-id');
      await addUserToProject(userId);
    }
  });

  const searchInput = document.getElementById('userSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const term = searchInput.value.trim().toLowerCase();
      document.querySelectorAll('.user-list-row').forEach(row => {
        const haystack = row.getAttribute('data-search') || '';
        row.classList.toggle('d-none', !haystack.includes(term));
      });
    });
  }

  const addUserModal = document.getElementById('addUserModal');
  if (addUserModal) {
    addUserModal.addEventListener('shown.bs.modal', () => {
      const input = document.getElementById('userSearchInput');
      input?.focus();
    });
  }
}

/**
 * Add user to the current project.
 * @param {string} userId - User ID.
 * @returns {Promise<void>}
 */
async function addUserToProject(userId) {
  if (!isOwner) {
    showError('Only the project owner can add users.');
    return;
  }

  try {
    if (isDemoMode()) {
      const alreadyAssigned = projectMembers.some(member => member.user_id === userId);
      if (alreadyAssigned) return;

      const selectedUser = allUsers.find(user => user.id === userId);
      await demoServices.teamMembers.add({
        project_id: projectId,
        user_id: userId,
        name: selectedUser?.full_name || selectedUser?.email || 'Unknown user',
        email: selectedUser?.email || '',
        role: 'member'
      });
    } else {
      const { error } = await supabase
        .from('project_members')
        .insert([{ project_id: projectId, user_id: userId, role: 'member' }]);

      if (error) {
        throw error;
      }
    }

    await refreshMembers();
    showSuccess('User added to project.');
  } catch (error) {
    console.error('Failed to add user to project:', error);
    showError(error?.message?.includes('duplicate')
      ? 'This user is already assigned.'
      : 'Failed to add user to project.');
  }
}

/**
 * Remove user from current project.
 * @param {string} userId - User ID.
 * @param {string} userName - User display name.
 * @returns {Promise<void>}
 */
async function removeUserFromProject(userId, userName) {
  if (!isOwner) {
    showError('Only the project owner can remove users.');
    return;
  }

  const approved = await confirm(`Remove <strong>${userName}</strong> from this project?`, 'Remove user');
  if (!approved) return;

  try {
    if (isDemoMode()) {
      const member = projectMembers.find(item => item.user_id === userId);
      if (member) {
        await demoServices.teamMembers.remove(member.id);
      }
    } else {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    }

    await refreshMembers();
    showSuccess('User removed from project.');
  } catch (error) {
    console.error('Failed to remove user:', error);
    showError('Failed to remove user from project.');
  }
}

/**
 * Refresh assigned members and list UI.
 * @returns {Promise<void>}
 */
async function refreshMembers() {
  if (isDemoMode()) {
    projectMembers = await demoServices.teamMembers.getByProject(projectId);
  } else {
    const { data, error } = await supabase
      .from('project_members')
      .select('id, project_id, user_id, role, created_at, profiles(id, full_name, email, avatar_url)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    projectMembers = data || [];
  }

  renderMembersTable();
  renderUsersList();
}

/**
 * Extract project ID from query string or route-like URL.
 * @returns {string|null}
 */
function getProjectIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const idFromQuery = params.get('id');

  if (idFromQuery) {
    return idFromQuery;
  }

  const match = window.location.pathname.match(/\/projects\/([^/]+)\/users\/?$/i);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/**
 * Safely format date string.
 * @param {string} dateValue - Date value.
 * @returns {string} Formatted date string.
 */
function formatDate(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

/**
 * Escape potentially unsafe HTML.
 * @param {string} value - Input text.
 * @returns {string} Escaped text.
 */
function escapeHtml(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
