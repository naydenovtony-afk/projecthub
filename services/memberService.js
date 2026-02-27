/**
 * Member Service
 * Manages project membership and role assignments.
 *
 * All write operations check the current user's project role before
 * proceeding so the business rules are enforced in one place.
 */

import { supabase } from './supabase.js';
import { getUserProjectRole, hasPermission, formatRole } from './projectPermissions.js';
import { logAuditEvent } from './taskService.js';

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Fetch all members of a project with their profiles.
 *
 * @param {string} projectId - Project UUID
 * @returns {Promise<Array>} Array of member objects with nested profile
 */
export async function getProjectMembers(projectId) {
  try {
    const { data, error } = await supabase
      .from('project_members')
      .select(`
        id,
        project_id,
        user_id,
        role,
        joined_at:created_at,
        delegated_pm_until,
        invited_by,
        profiles:profiles(id, full_name, email, avatar_url)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data ?? [];
  } catch (err) {
    console.error('[memberService] getProjectMembers error:', err);
    return [];
  }
}

/**
 * Fetch every user profile (for the "add member" user-picker).
 *
 * @returns {Promise<Array>}
 */
export async function getAllUsers() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .order('full_name', { ascending: true });

    if (error) throw error;
    return data ?? [];
  } catch (err) {
    console.error('[memberService] getAllUsers error:', err);
    return [];
  }
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Add a user to a project with the given role.
 * - PM can assign any role.
 * - PC can only assign team_member.
 *
 * @param {string} projectId - Project UUID
 * @param {string} userId    - Target user UUID
 * @param {string} role      - 'project_manager' | 'project_coordinator' | 'team_member'
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function addMember(projectId, userId, role = 'team_member') {
  try {
    const { data: { user: actor } } = await supabase.auth.getUser();
    if (!actor) throw new Error('Not authenticated');

    const actorRole = await getUserProjectRole(projectId);

    // Verify the target user actually exists
    const { data: userExists, error: userCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (userCheckError) throw userCheckError;
    if (!userExists) throw new Error('User does not exist in the system');

    // Permission gate
    if (!hasPermission(actorRole, 'invite_members')) {
      throw new Error('You do not have permission to add members');
    }

    // PC can only add team_members
    if (actorRole === 'project_coordinator' && role !== 'team_member') {
      throw new Error('Project Coordinators can only invite Team Members');
    }

    const { error } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id:    userId,
        role,
        invited_by: actor.id,
      });

    if (error) {
      if (error.code === '23505') throw new Error('This user is already a member');
      throw error;
    }

    // Audit
    await logAuditEvent(projectId, actor.id, 'member_added', 'member', userId, {
      new_value: { role },
    });

    return { success: true, message: `User added as ${formatRole(role)}` };
  } catch (err) {
    console.error('[memberService] addMember error:', err);
    return { success: false, message: err.message ?? 'Failed to add member' };
  }
}

/**
 * Change a member's role within a project.
 * Only PM can change roles. Cannot demote the last PM.
 *
 * @param {string} projectId    - Project UUID
 * @param {string} targetUserId - User whose role is being changed
 * @param {string} newRole      - New role value
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function changeMemberRole(projectId, targetUserId, newRole) {
  try {
    const { data: { user: actor } } = await supabase.auth.getUser();
    if (!actor) throw new Error('Not authenticated');

    const actorRole = await getUserProjectRole(projectId);

    if (!hasPermission(actorRole, 'change_roles')) {
      throw new Error('Only Project Managers can change roles');
    }

    // Get the target's current role
    const { data: target, error: targetErr } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', targetUserId)
      .single();

    if (targetErr || !target) throw new Error('Member not found');

    // Prevent removing the last PM
    if (target.role === 'project_manager' && newRole !== 'project_manager') {
      const { count } = await supabase
        .from('project_members')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('role', 'project_manager');

      if (count <= 1) {
        throw new Error('Cannot change role: the project must have at least one Project Manager');
      }
    }

    const { error } = await supabase
      .from('project_members')
      .update({ role: newRole })
      .eq('project_id', projectId)
      .eq('user_id', targetUserId);

    if (error) throw error;

    // Audit
    await logAuditEvent(projectId, actor.id, 'role_changed', 'member', targetUserId, {
      old_value: { role: target.role },
      new_value: { role: newRole },
    });

    return {
      success: true,
      message: `Role changed to ${formatRole(newRole)}`,
    };
  } catch (err) {
    console.error('[memberService] changeMemberRole error:', err);
    return { success: false, message: err.message ?? 'Failed to change role' };
  }
}

/**
 * Remove a user from a project.
 * - PM can remove anyone (except the last PM).
 * - PC can remove team_members only.
 * - Users can remove themselves.
 *
 * @param {string} projectId    - Project UUID
 * @param {string} targetUserId - User to remove
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function removeMember(projectId, targetUserId) {
  try {
    const { data: { user: actor } } = await supabase.auth.getUser();
    if (!actor) throw new Error('Not authenticated');

    const actorRole = await getUserProjectRole(projectId);
    const isSelf = actor.id === targetUserId;

    if (!isSelf && !hasPermission(actorRole, 'remove_members')) {
      throw new Error('You do not have permission to remove members');
    }

    // Get target's current role
    const { data: target, error: targetErr } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', targetUserId)
      .single();

    if (targetErr || !target) throw new Error('Member not found');

    // PC cannot remove a PM
    if (actorRole === 'project_coordinator' && target.role === 'project_manager') {
      throw new Error('Project Coordinators cannot remove a Project Manager');
    }

    // Prevent removing the last PM
    if (target.role === 'project_manager') {
      const { count } = await supabase
        .from('project_members')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('role', 'project_manager');

      if (count <= 1) {
        throw new Error('Cannot remove the last Project Manager from a project');
      }
    }

    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', targetUserId);

    if (error) throw error;

    // Audit
    await logAuditEvent(projectId, actor.id, 'member_removed', 'member', targetUserId, {
      old_value: { role: target.role },
    });

    return { success: true, message: 'Member removed from project' };
  } catch (err) {
    console.error('[memberService] removeMember error:', err);
    return { success: false, message: err.message ?? 'Failed to remove member' };
  }
}

/**
 * Grant temporary PM rights to a project_coordinator.
 * Only PM can delegate.
 *
 * @param {string} projectId       - Project UUID
 * @param {string} coordinatorId   - PC's user UUID
 * @param {Date|string} expiresAt  - Expiry date/time
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function delegatePmRights(projectId, coordinatorId, expiresAt) {
  try {
    const { data: { user: actor } } = await supabase.auth.getUser();
    if (!actor) throw new Error('Not authenticated');

    const actorRole = await getUserProjectRole(projectId);
    if (!hasPermission(actorRole, 'delegate_pm')) {
      throw new Error('Only a Project Manager can delegate PM rights');
    }

    const { error } = await supabase
      .from('project_members')
      .update({ delegated_pm_until: new Date(expiresAt).toISOString() })
      .eq('project_id', projectId)
      .eq('user_id', coordinatorId)
      .eq('role', 'project_coordinator');

    if (error) throw error;

    await logAuditEvent(projectId, actor.id, 'pm_delegation', 'member', coordinatorId, {
      new_value: { delegated_pm_until: new Date(expiresAt).toISOString() },
    });

    return { success: true, message: 'PM rights delegated successfully' };
  } catch (err) {
    console.error('[memberService] delegatePmRights error:', err);
    return { success: false, message: err.message ?? 'Failed to delegate PM rights' };
  }
}

/**
 * Revoke any active PM delegation for a coordinator.
 *
 * @param {string} projectId      - Project UUID
 * @param {string} coordinatorId  - PC's user UUID
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function revokePmDelegation(projectId, coordinatorId) {
  try {
    const { data: { user: actor } } = await supabase.auth.getUser();
    if (!actor) throw new Error('Not authenticated');

    const actorRole = await getUserProjectRole(projectId);
    if (!hasPermission(actorRole, 'delegate_pm')) {
      throw new Error('Only a Project Manager can revoke delegation');
    }

    const { error } = await supabase
      .from('project_members')
      .update({ delegated_pm_until: null })
      .eq('project_id', projectId)
      .eq('user_id', coordinatorId);

    if (error) throw error;

    await logAuditEvent(projectId, actor.id, 'pm_delegation_revoked', 'member', coordinatorId);

    return { success: true, message: 'PM delegation revoked' };
  } catch (err) {
    console.error('[memberService] revokePmDelegation error:', err);
    return { success: false, message: err.message ?? 'Failed to revoke delegation' };
  }
}
