import { supabase } from '../services/supabase.js';
import { checkAuth } from './auth.js';
import { isDemoMode, demoServices, DEMO_USER, DEMO_CONTACTS } from '../utils/demoMode.js';
import { showError, showSuccess, showLoading, hideLoading, confirm } from '../utils/uiModular.js';
import { NavBar } from './components/NavBar.js';
import {
  getUserProjectRole,
  hasPermission,
  formatRole,
  getRoleBadgeClass,
  getRoleIcon,
  getAllRoles,
  renderRoleBadge,
} from '../services/projectPermissions.js';
import {
  getProjectMembers,
  addMember,
  changeMemberRole,
  removeMember,
} from '../services/memberService.js';

let projectId = null;
let currentUser = null;
let currentProject = null;
let projectMembers = [];
let allUsers = [];
let currentUserRole = null; // 'project_manager' | 'project_coordinator' | 'team_member'

// Derived helpers
const isSelf = (userId) => userId === currentUser?.id;
const canInvite = () => hasPermission(currentUserRole, 'invite_members');
const canRemove = (targetRole) => {
  if (!hasPermission(currentUserRole, 'remove_members')) return false;
  // PC cannot remove PM or another PC
  if (currentUserRole === 'project_coordinator' && targetRole !== 'team_member') return false;
  return true;
};
const canChangeRoles = () => hasPermission(currentUserRole, 'change_roles');

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

    // Resolve current user's role in this project
    if (isDemoMode()) {
      // In demo mode, grant PM only if the user is the project creator
      currentUserRole = currentProject?.user_id === currentUser?.id
        ? 'project_manager'
        : 'team_member';
    } else {
      currentUserRole = await getUserProjectRole(projectId);
      // Project owner without a membership row → PM
      if (!currentUserRole && currentProject?.user_id === currentUser?.id) {
        currentUserRole = 'project_manager';
      }
    }

    renderPageMeta();
    renderMembersTable();
    renderUsersList();
    applyPermissionUI();
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

  if (projectError) throw projectError;
  currentProject = project;

  // Use member service (handles profiles join + ordering)
  projectMembers = await getProjectMembers(projectId);

  const { data: usersData, error: usersError } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .order('full_name', { ascending: true });

  if (usersError) throw usersError;
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
    const memberRole = member.role || 'team_member';
    const memberUserId = member.user_id;

    const showRemove = canRemove(memberRole) && !isSelf(memberUserId);
    const showRoleChange = canChangeRoles() && !isSelf(memberUserId);

    // Build role change dropdown options (PM only)
    const roleOptions = getAllRoles()
      .map(r => `<option value="${r}" ${r === memberRole ? 'selected' : ''}>${formatRole(r)}</option>`)
      .join('');

    return `
      <tr>
        <td class="ps-4">
          <div class="d-flex align-items-center gap-2">
            <span class="avatar-circle bg-primary-subtle text-primary d-inline-flex align-items-center justify-content-center" style="width:32px;height:32px;">
              ${(displayName || '?').charAt(0).toUpperCase()}
            </span>
            <span class="fw-medium">${escapeHtml(displayName)}</span>
            ${isSelf(memberUserId) ? '<span class="badge bg-secondary ms-1">You</span>' : ''}
          </div>
        </td>
        <td>${escapeHtml(displayEmail)}</td>
        <td>
          ${showRoleChange
            ? `<select class="form-select form-select-sm w-auto" style="min-width:170px;"
                        data-change-role-user="${memberUserId}"
                        data-current-role="${memberRole}">
                 ${roleOptions}
               </select>`
            : renderRoleBadge(memberRole)
          }
        </td>
        <td>${assignedAt ? formatDate(assignedAt) : '-'}</td>
        <td class="pe-4 text-end">
          ${showRemove
            ? `<button class="btn btn-sm btn-outline-danger"
                        data-remove-user-id="${memberUserId}"
                        data-remove-user-name="${escapeHtml(displayName)}">
                 <i class="bi bi-person-dash"></i>
               </button>`
            : '<span class="text-muted small">—</span>'
          }
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
  const canInviteUsers = canInvite();

  // Role selector: PM can assign any role, PC can only assign team_member
  const roleSelectHtml = canChangeRoles()
    ? `<div class="mb-3">
         <label class="form-label fw-medium small">Assign role as:</label>
         <select class="form-select form-select-sm" id="addUserRoleSelect">
           <option value="team_member">${formatRole('team_member')}</option>
           <option value="project_coordinator">${formatRole('project_coordinator')}</option>
           <option value="project_manager">${formatRole('project_manager')}</option>
         </select>
       </div>`
    : `<input type="hidden" id="addUserRoleSelect" value="team_member">`;

  // Inject the role selector above the list if not already present
  const existingSelector = document.getElementById('addUserRoleSelect');
  if (!existingSelector) {
    const roleWrapper = document.createElement('div');
    roleWrapper.id = 'addUserRoleWrapper';
    roleWrapper.innerHTML = roleSelectHtml;
    usersList.parentElement.insertBefore(roleWrapper, usersList);
  }

  usersList.innerHTML = allUsers.map(user => {
    const displayName = user.full_name || user.name || user.email || 'Unknown user';
    const isAssigned = assignedUserIds.has(user.id);

    return `
      <div class="list-group-item d-flex align-items-center justify-content-between user-list-row"
           data-search="${escapeHtml((displayName + ' ' + (user.email || '')).toLowerCase())}">
        <div>
          <div class="fw-medium">${escapeHtml(displayName)}</div>
          <small class="text-muted">${escapeHtml(user.email || '-')}</small>
        </div>
        <button class="btn btn-sm ${isAssigned ? 'btn-outline-secondary' : 'btn-primary'}"
                data-add-user-id="${user.id}"
                ${isAssigned || !canInviteUsers ? 'disabled' : ''}>
          ${isAssigned ? '<i class="bi bi-check-lg me-1"></i>Assigned' : '<i class="bi bi-person-plus me-1"></i>Add'}
        </button>
      </div>
    `;
  }).join('');
}

/**
 * Apply permission-based UI rules based on current user's project role.
 * @returns {void}
 */
function applyPermissionUI() {
  const addBtn = document.getElementById('addUserBtn');
  const readOnlyAlert = document.getElementById('membersReadOnlyAlert');

  if (addBtn) {
    addBtn.disabled = !canInvite();
  }

  if (readOnlyAlert) {
    if (!canInvite()) {
      readOnlyAlert.classList.remove('d-none');
      readOnlyAlert.innerHTML = `
        <i class="bi bi-info-circle me-2"></i>
        You are a <strong>${formatRole(currentUserRole)}</strong> on this project.
        You can view the member list but cannot add or remove users.
      `;
    } else {
      readOnlyAlert.classList.add('d-none');
    }
  }
}

/**
 * Register page event listeners.
 * @returns {void}
 */
function setupEventListeners() {
  document.addEventListener('click', async (event) => {
    // Remove member
    const removeBtn = event.target.closest('[data-remove-user-id]');
    if (removeBtn) {
      const userId = removeBtn.getAttribute('data-remove-user-id');
      const userName = removeBtn.getAttribute('data-remove-user-name') || 'this user';
      await handleRemoveMember(userId, userName);
      return;
    }

    // Add member
    const addBtn = event.target.closest('[data-add-user-id]');
    if (addBtn) {
      const userId = addBtn.getAttribute('data-add-user-id');
      await handleAddMember(userId);
      return;
    }
  });

  // Role change dropdowns (event delegation)
  document.addEventListener('change', async (event) => {
    const roleSelect = event.target.closest('[data-change-role-user]');
    if (!roleSelect) return;

    const targetUserId = roleSelect.getAttribute('data-change-role-user');
    const oldRole = roleSelect.getAttribute('data-current-role');
    const newRole = roleSelect.value;

    if (newRole === oldRole) return;

    const confirmed = await confirm(
      `Change role to <strong>${formatRole(newRole)}</strong>? This affects what the user can do on this project.`,
      'Change Role'
    );

    if (!confirmed) {
      roleSelect.value = oldRole; // revert
      return;
    }

    const result = await changeMemberRole(projectId, targetUserId, newRole);

    if (result.success) {
      showSuccess(result.message);
      await refreshMembers();
    } else {
      showError(result.message);
      roleSelect.value = oldRole; // revert on error
    }
  });

  // User search filter
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

  // Focus search when modal opens
  const addUserModal = document.getElementById('addUserModal');
  if (addUserModal) {
    addUserModal.addEventListener('shown.bs.modal', () => {
      document.getElementById('userSearchInput')?.focus();
    });
  }
}

/**
 * Add user to the current project.
 * @param {string} userId - User ID.
 * @returns {Promise<void>}
 */
async function handleAddMember(userId) {
  if (!canInvite()) {
    showError('You do not have permission to add members.');
    return;
  }

  const roleSelect = document.getElementById('addUserRoleSelect');
  const role = roleSelect?.value ?? 'team_member';

  // Show loading state on the clicked button
  const addBtn = document.querySelector(`[data-add-user-id="${userId}"]`);
  const originalHtml = addBtn ? addBtn.innerHTML : null;
  if (addBtn) {
    addBtn.disabled = true;
    addBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
  }

  try {
    if (isDemoMode()) {
      const alreadyAssigned = projectMembers.some(m => m.user_id === userId);
      if (alreadyAssigned) return;
      const selectedUser = allUsers.find(u => u.id === userId);
      await demoServices.teamMembers.add({
        project_id: projectId,
        user_id: userId,
        name: selectedUser?.full_name || selectedUser?.email || 'Unknown user',
        email: selectedUser?.email || '',
        role,
      });
      await refreshMembers();
      showSuccess('User added to project.');
    } else {
      const result = await addMember(projectId, userId, role);
      if (result.success) {
        await refreshMembers();
        showSuccess(result.message);
      } else {
        showError(result.message);
      }
    }
  } catch (error) {
    console.error('Failed to add user to project:', error);
    showError('Failed to add user to project.');
  } finally {
    if (addBtn && originalHtml !== null) {
      addBtn.disabled = false;
      addBtn.innerHTML = originalHtml;
    }
  }
}

/**
 * Remove user from current project.
 * @param {string} userId   - User ID.
 * @param {string} userName - Display name for confirmation dialog.
 * @returns {Promise<void>}
 */
async function handleRemoveMember(userId, userName) {
  const approved = await confirm(
    `Remove <strong>${userName}</strong> from this project?`,
    'Remove member'
  );
  if (!approved) return;

  try {
    if (isDemoMode()) {
      const member = projectMembers.find(item => item.user_id === userId);
      if (member) await demoServices.teamMembers.remove(member.id);
      await refreshMembers();
      showSuccess('User removed from project.');
    } else {
      const result = await removeMember(projectId, userId);
      if (result.success) {
        await refreshMembers();
        showSuccess(result.message);
      } else {
        showError(result.message);
      }
    }
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
    projectMembers = await getProjectMembers(projectId);
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
