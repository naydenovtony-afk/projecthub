/**
 * Project Permissions Service
 * Central authority for role-based access control inside a project.
 *
 * Roles (stored in project_members.role):
 *   project_manager     – Full control over the project
 *   project_coordinator – Tasks + member management (no files/budget/project settings)
 *   team_member         – View + move own tasks to "pending_review"
 *
 * Task status workflow:
 *   todo → in_progress → pending_review → done
 *                ↑___________|   (PM/PC can send back to in_progress)
 *   PM can also reopen: done → in_progress
 */

import { supabase } from './supabase.js';

// ─── Permission map ───────────────────────────────────────────────────────────

/**
 * Static map of what each role is allowed to do.
 * Use canUserDo() or hasPermission() to check at runtime.
 */
const ROLE_PERMISSIONS = {
  project_manager: [
    // Project-level
    'view_project',
    'edit_project',
    'delete_project',
    'manage_budget',
    'manage_timetable',
    'view_audit_log',
    'delegate_pm',
    // Files
    'upload_files',
    'delete_files',
    // Tasks
    'create_tasks',
    'edit_tasks',
    'assign_tasks',
    'delete_tasks',
    'complete_tasks',      // mark pending_review → done
    'submit_for_review',   // mark in_progress → pending_review
    'reopen_tasks',        // move done → in_progress
    // Members
    'invite_members',
    'remove_members',
    'change_roles',
    // Communication
    'add_comments',
  ],
  project_coordinator: [
    'view_project',
    // Tasks
    'create_tasks',
    'edit_tasks',
    'assign_tasks',
    'complete_tasks',
    'submit_for_review',
    // Members
    'invite_members',
    'remove_members',      // can remove team_members only (enforced in JS)
    // Communication
    'add_comments',
  ],
  team_member: [
    'view_project',
    'submit_for_review',   // move in_progress → pending_review
    'add_comments',
  ],
};

// ─── Task state machine ───────────────────────────────────────────────────────

/**
 * Allowed status transitions per role.
 * Structure: { fromStatus: { toStatus: allowedRoles[] } }
 */
const TASK_TRANSITIONS = {
  todo: {
    in_progress:     ['project_manager', 'project_coordinator', 'team_member'],
  },
  in_progress: {
    pending_review:  ['project_manager', 'project_coordinator', 'team_member'],
    todo:            ['project_manager', 'project_coordinator'],
  },
  pending_review: {
    done:            ['project_manager', 'project_coordinator'],
    in_progress:     ['project_manager', 'project_coordinator'], // reject → back to work
  },
  done: {
    in_progress:     ['project_manager'],                        // PM can reopen
  },
  blocked: {
    todo:            ['project_manager', 'project_coordinator'],
    in_progress:     ['project_manager', 'project_coordinator'],
  },
};

// ─── Role metadata ────────────────────────────────────────────────────────────

const ROLE_META = {
  project_manager: {
    label:      'Project Manager',
    badgeClass: 'bg-danger',
    icon:       'bi-star-fill',
    shortLabel: 'PM',
  },
  project_coordinator: {
    label:      'Project Coordinator',
    badgeClass: 'bg-warning text-dark',
    icon:       'bi-person-gear',
    shortLabel: 'PC',
  },
  team_member: {
    label:      'Team Member',
    badgeClass: 'bg-primary',
    icon:       'bi-person',
    shortLabel: 'TM',
  },
};

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Fetch the current user's role in a project from Supabase.
 * Accounts for active PM delegation on project_coordinator rows.
 *
 * @param {string} projectId - Project UUID
 * @returns {Promise<string|null>} role key or null if not a member
 */
export async function getUserProjectRole(projectId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('project_members')
      .select('role, delegated_pm_until')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) return null;

    // Treat coordinator with active delegation as PM
    if (
      data.role === 'project_coordinator' &&
      data.delegated_pm_until &&
      new Date(data.delegated_pm_until) > new Date()
    ) {
      return 'project_manager';
    }

    return data.role;
  } catch (err) {
    console.error('[projectPermissions] getUserProjectRole error:', err);
    return null;
  }
}

/**
 * Synchronously check whether a given role has a permission.
 *
 * @param {string} role       - One of the project role keys
 * @param {string} permission - Permission key from ROLE_PERMISSIONS
 * @returns {boolean}
 */
export function hasPermission(role, permission) {
  if (!role || !ROLE_PERMISSIONS[role]) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Convenience check: is the role a Project Manager or Project Coordinator?
 * Useful for quick guards without specifying a full permission key.
 *
 * @param {string} role
 * @returns {boolean}
 */
export function isPmOrPc(role) {
  return role === 'project_manager' || role === 'project_coordinator';
}

/**
 * Async: fetch the current user's role, then check a permission.
 *
 * @param {string} projectId  - Project UUID
 * @param {string} permission - Permission key
 * @returns {Promise<boolean>}
 */
export async function canUserDo(projectId, permission) {
  const role = await getUserProjectRole(projectId);
  return hasPermission(role, permission);
}

/**
 * Validate whether a task status transition is permitted for a given role.
 *
 * @param {string} currentStatus - Current task status
 * @param {string} newStatus     - Requested new status
 * @param {string} role          - Current user's project role
 * @returns {{ allowed: boolean, reason: string|null }}
 */
export function validateTaskTransition(currentStatus, newStatus, role) {
  const toMap = TASK_TRANSITIONS[currentStatus];

  if (!toMap) {
    return { allowed: false, reason: `Unknown source status: "${currentStatus}"` };
  }

  const allowedRoles = toMap[newStatus];

  if (!allowedRoles) {
    return {
      allowed: false,
      reason: `Cannot transition a task from "${formatStatus(currentStatus)}" to "${formatStatus(newStatus)}"`,
    };
  }

  if (!allowedRoles.includes(role)) {
    const needLabel = allowedRoles.map(formatRole).join(' or ');
    return {
      allowed: false,
      reason: `Your role (${formatRole(role)}) cannot perform this action. Required: ${needLabel}`,
    };
  }

  return { allowed: true, reason: null };
}

/**
 * Get all available next statuses for a role given a current status.
 *
 * @param {string} currentStatus
 * @param {string} role
 * @returns {string[]} Array of reachable status keys
 */
export function getAvailableTransitions(currentStatus, role) {
  const toMap = TASK_TRANSITIONS[currentStatus] || {};
  return Object.entries(toMap)
    .filter(([, roles]) => roles.includes(role))
    .map(([status]) => status);
}

/**
 * Decide what a checkbox click should do for a given role.
 * Team members submit for review; PM/PC directly complete.
 *
 * @param {string} role - User's project role
 * @returns {'done'|'pending_review'} Target status on "check"
 */
export function getCheckboxAction(role) {
  if (role === 'project_manager' || role === 'project_coordinator') {
    return 'done';
  }
  return 'pending_review';
}

// ─── Role display helpers ─────────────────────────────────────────────────────

/**
 * Human-readable role label.
 * @param {string} role
 * @returns {string}
 */
export function formatRole(role) {
  return ROLE_META[role]?.label ?? role ?? 'Unknown';
}

/**
 * Bootstrap badge CSS class for a role.
 * @param {string} role
 * @returns {string}
 */
export function getRoleBadgeClass(role) {
  return ROLE_META[role]?.badgeClass ?? 'bg-secondary';
}

/**
 * Bootstrap icon class for a role.
 * @param {string} role
 * @returns {string}
 */
export function getRoleIcon(role) {
  return ROLE_META[role]?.icon ?? 'bi-person';
}

/**
 * Short role abbreviation (PM / PC / TM).
 * @param {string} role
 * @returns {string}
 */
export function getRoleShort(role) {
  return ROLE_META[role]?.shortLabel ?? '?';
}

/**
 * All available role keys (useful for building dropdowns).
 * @returns {string[]}
 */
export function getAllRoles() {
  return Object.keys(ROLE_META);
}

/**
 * Human-readable task status label.
 * @param {string} status
 * @returns {string}
 */
export function formatStatus(status) {
  const map = {
    todo:           'To Do',
    in_progress:    'In Progress',
    pending_review: 'Pending Review',
    done:           'Done',
    blocked:        'Blocked',
  };
  return map[status] ?? status;
}

/**
 * Render a full role badge HTML string (includes icon + label).
 * @param {string} role
 * @returns {string} HTML snippet
 */
export function renderRoleBadge(role) {
  const meta = ROLE_META[role] ?? { label: role, badgeClass: 'bg-secondary', icon: 'bi-person' };
  return `<span class="badge ${meta.badgeClass}"><i class="bi ${meta.icon} me-1"></i>${meta.label}</span>`;
}
