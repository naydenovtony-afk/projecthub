/**
 * Notification Service
 * Create, fetch, and manage in-app notifications.
 *
 * Notification types (convention):
 *   task_review_requested – TM submitted a task for review (→ PM/PC)
 *   task_approved         – PM/PC approved a task            (→ TM)
 *   task_rejected         – PM/PC sent a task back           (→ TM)
 *   task_assigned         – A task was assigned to user      (→ assignee)
 *   member_added          – User was added to project        (→ new member)
 *   member_removed        – User was removed from project    (→ removed member)
 *   role_changed          – User's role changed              (→ affected user)
 *   project_updated       – General project update           (→ all members)
 */

import { supabase } from './supabase.js';

// ==================== WRITE ====================

/**
 * Send a notification to every project member whose role is in `roles`.
 *
 * @param {string}   projectId    - Project UUID
 * @param {string[]} roles        - e.g. ['project_manager', 'project_coordinator']
 * @param {{ notification_type: string, title: string, message?: string, entity_type?: string, entity_id?: string }} notification
 * @returns {Promise<void>}
 */
export async function notifyProjectMembers(projectId, roles, notification) {
  try {
    const { data: members, error } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', projectId)
      .in('role', roles);

    if (error) throw error;
    if (!members?.length) return;

    const rows = members.map(m => ({
      user_id:    m.user_id,
      project_id: projectId,
      ...notification,
    }));

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(rows);

    if (insertError) throw insertError;
  } catch (err) {
    console.warn('[notificationService] notifyProjectMembers failed:', err);
  }
}

/**
 * Send a notification to a single user.
 *
 * @param {string} userId
 * @param {{ notification_type: string, title: string, message?: string, project_id?: string, entity_type?: string, entity_id?: string }} notification
 * @returns {Promise<void>}
 */
export async function notifyUser(userId, notification) {
  try {
    if (!userId) return;

    const { error } = await supabase
      .from('notifications')
      .insert({ user_id: userId, ...notification });

    if (error) throw error;
  } catch (err) {
    console.warn('[notificationService] notifyUser failed:', err);
  }
}

/**
 * Send a notification to every member of a project (all roles).
 *
 * @param {string} projectId
 * @param {{ notification_type: string, title: string, message?: string, entity_type?: string, entity_id?: string }} notification
 * @param {string} [excludeUserId] - Optional user ID to exclude (e.g. the actor)
 * @returns {Promise<void>}
 */
export async function notifyAllProjectMembers(projectId, notification, excludeUserId = null) {
  try {
    let query = supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', projectId);

    if (excludeUserId) {
      query = query.neq('user_id', excludeUserId);
    }

    const { data: members, error } = await query;
    if (error) throw error;
    if (!members?.length) return;

    const rows = members.map(m => ({
      user_id:    m.user_id,
      project_id: projectId,
      ...notification,
    }));

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(rows);

    if (insertError) throw insertError;
  } catch (err) {
    console.warn('[notificationService] notifyAllProjectMembers failed:', err);
  }
}

// ==================== READ ====================

/**
 * Fetch notifications for the current user.
 *
 * @param {{ unreadOnly?: boolean, limit?: number }} [options]
 * @returns {Promise<Array>}
 */
export async function getMyNotifications({ unreadOnly = false, limit = 50 } = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)          // explicit filter — don't rely on RLS alone
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    console.error('[notificationService] getMyNotifications failed:', err);
    return [];
  }
}

/**
 * Get the count of unread notifications for the current user.
 *
 * @returns {Promise<number>}
 */
export async function getUnreadCount() {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('read', false);

    if (error) throw error;
    return count ?? 0;
  } catch (err) {
    console.warn('[notificationService] getUnreadCount failed:', err);
    return 0;
  }
}

// ==================== MARK READ ====================

/**
 * Mark a single notification as read.
 *
 * @param {string} notificationId
 * @returns {Promise<void>}
 */
export async function markAsRead(notificationId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
  } catch (err) {
    console.warn('[notificationService] markAsRead failed:', err);
  }
}

/**
 * Mark all notifications for the current user as read.
 *
 * @returns {Promise<void>}
 */
export async function markAllAsRead() {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('read', false);   // RLS limits this to the current user's rows

    if (error) throw error;
  } catch (err) {
    console.warn('[notificationService] markAllAsRead failed:', err);
  }
}

// ==================== DELETE ====================

/**
 * Delete (dismiss) a single notification.
 *
 * @param {string} notificationId
 * @returns {Promise<void>}
 */
export async function dismissNotification(notificationId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
  } catch (err) {
    console.warn('[notificationService] dismissNotification failed:', err);
  }
}

/**
 * Delete all read notifications for the current user (inbox cleanup).
 *
 * @returns {Promise<void>}
 */
export async function clearReadNotifications() {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('read', true);    // RLS limits this to the current user's rows

    if (error) throw error;
  } catch (err) {
    console.warn('[notificationService] clearReadNotifications failed:', err);
  }
}

// ==================== REALTIME ====================

/**
 * Subscribe to new notifications for the current user.
 * Returns the Supabase channel so the caller can unsubscribe when done.
 *
 * @param {(notification: object) => void} onNew - Callback for new notifications
 * @returns {import('@supabase/supabase-js').RealtimeChannel}
 *
 * @example
 * const channel = subscribeToNotifications((n) => {
 *   showToast(n.title);
 *   updateBadgeCount();
 * });
 * // Later: supabase.removeChannel(channel);
 */
export async function subscribeToNotifications(onNew) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.warn('[notificationService] subscribeToNotifications: no authenticated user.');
    return null;
  }

  const channel = supabase
    .channel(`user-notifications-${user.id}`)
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'notifications',
        filter: `user_id=eq.${user.id}`,
      },
      (payload) => {
        if (typeof onNew === 'function') onNew(payload.new);
      }
    )
    .subscribe();

  return channel;
}

// ==================== CONVENIENCE HELPERS ====================

/**
 * Notify PM and PC that a task has been submitted for review.
 *
 * @param {string} projectId
 * @param {{ id: string, title: string }} task
 * @param {string} submitterName
 */
export async function notifyTaskReviewRequested(projectId, task, submitterName) {
  await notifyProjectMembers(
    projectId,
    ['project_manager', 'project_coordinator'],
    {
      notification_type: 'task_review_requested',
      title:             'Task ready for review',
      message:           `${submitterName} submitted "${task.title}" for review.`,
      entity_type:       'task',
      entity_id:         task.id,
    }
  );
}

/**
 * Notify a task's assignee that their task was approved.
 *
 * @param {string} assigneeId
 * @param {string} projectId
 * @param {{ id: string, title: string }} task
 */
export async function notifyTaskApproved(assigneeId, projectId, task) {
  await notifyUser(assigneeId, {
    notification_type: 'task_approved',
    project_id:        projectId,
    title:             'Task approved',
    message:           `Your task "${task.title}" has been marked as complete.`,
    entity_type:       'task',
    entity_id:         task.id,
  });
}

/**
 * Notify a task's assignee that their task was sent back for revision.
 *
 * @param {string} assigneeId
 * @param {string} projectId
 * @param {{ id: string, title: string }} task
 */
export async function notifyTaskRejected(assigneeId, projectId, task) {
  await notifyUser(assigneeId, {
    notification_type: 'task_rejected',
    project_id:        projectId,
    title:             'Task sent back for revision',
    message:           `"${task.title}" has been returned. Please review and resubmit.`,
    entity_type:       'task',
    entity_id:         task.id,
  });
}

/**
 * Notify a user they were added to a project.
 *
 * @param {string} userId
 * @param {string} projectId
 * @param {string} projectTitle
 * @param {string} role   - e.g. 'project_coordinator'
 */
export async function notifyMemberAdded(userId, projectId, projectTitle, role) {
  const roleLabel = {
    project_manager:     'Project Manager',
    project_coordinator: 'Project Coordinator',
    team_member:         'Team Member',
  }[role] ?? role;

  await notifyUser(userId, {
    notification_type: 'member_added',
    project_id:        projectId,
    title:             `Added to project: ${projectTitle}`,
    message:           `You have been added as ${roleLabel}.`,
    entity_type:       'project',
    entity_id:         projectId,
  });
}

/**
 * Notify a user their role changed.
 *
 * @param {string} userId
 * @param {string} projectId
 * @param {string} projectTitle
 * @param {string} newRole
 */
export async function notifyRoleChanged(userId, projectId, projectTitle, newRole) {
  const roleLabel = {
    project_manager:     'Project Manager',
    project_coordinator: 'Project Coordinator',
    team_member:         'Team Member',
  }[newRole] ?? newRole;

  await notifyUser(userId, {
    notification_type: 'role_changed',
    project_id:        projectId,
    title:             'Your project role changed',
    message:           `Your role in "${projectTitle}" is now ${roleLabel}.`,
    entity_type:       'project',
    entity_id:         projectId,
  });
}

export default {
  notifyProjectMembers,
  notifyAllProjectMembers,
  notifyUser,
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  clearReadNotifications,
  subscribeToNotifications,
  notifyTaskReviewRequested,
  notifyTaskApproved,
  notifyTaskRejected,
  notifyMemberAdded,
  notifyRoleChanged,
};
