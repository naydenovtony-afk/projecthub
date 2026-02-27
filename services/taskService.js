/**
 * Task Service
 * CRUD operations for project tasks with role-based status transitions.
 */

import { supabase } from './supabase.js';
import { handleSupabaseError, retryOperation, logError } from '../utils/errorHandler.js';
import { validateTaskData } from '../utils/validators.js';
import { isDemoMode, demoServices } from '../utils/demoMode.js';
import { validateTaskTransition, getUserProjectRole, hasPermission } from './projectPermissions.js';
import { notifyProjectMembers, notifyUser } from './notificationService.js';

/**
 * Get all tasks for a project grouped by status
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Tasks grouped by status { todo, in_progress, done }
 */
export async function getTasksByProject(projectId) {
  // Check demo mode first
  if (isDemoMode()) {
    return await demoServices.tasks.getByProject(projectId);
  }

  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned_user:profiles(id, full_name, avatar_url)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group tasks by status
    const grouped = {
      todo:           [],
      in_progress:    [],
      pending_review: [],
      blocked:        [],
      done:           [],
    };

    data.forEach(task => {
      const status = task.status || 'todo';
      if (grouped[status]) {
        grouped[status].push(task);
      } else {
        console.warn(`[taskService] Unknown task status: "${status}" for task ${task.id}`);
      }
    });

    return grouped;
  } catch (error) {
    console.error('Error fetching project tasks:', error);
    throw new Error('Failed to load tasks');
  }
}

/**
 * Get a single task by ID
 * @param {string} taskId - Task ID
 * @returns {Promise<Object|null>} Task object or null
 */
export async function getTaskById(taskId) {
  // Check demo mode first
  if (isDemoMode()) {
    return await demoServices.tasks.getById(taskId);
  }

  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        project:projects(id, title),
        assigned_user:profiles(id, full_name, avatar_url)
      `)
      .eq('id', taskId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching task:', error);
    return null;
  }
}

/**
 * Create a new task
 * @param {Object} taskData - Task data { project_id, title, description, status, priority, due_date, assigned_to }
 * @returns {Promise<Object>} Created task
 */
export async function createTask(taskData) {
  // Check demo mode first
  if (isDemoMode()) {
    return await demoServices.tasks.create(taskData);
  }

  try {
    // Validate task data
    const validation = validateTaskData(taskData);
    if (!validation.valid) {
      const errorMessages = validation.errors.map(e => e.message).join(', ');
      throw new Error(errorMessages);
    }

    const {
      project_id,
      title,
      description = '',
      status = 'todo',
      priority = 'medium',
      due_date = null,
      assigned_to = null
    } = taskData;

    // Insert task with retry logic
    const operation = async () => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          project_id,
          title,
          description,
          status,
          priority,
          due_date,
          assigned_to,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    };

    const data = await retryOperation(operation, 3, 1000);

    // Create project update
    if (data) {
      await createProjectUpdate(project_id, 'task_created', `Task created: ${title}`);
    }

    return data;
  } catch (error) {
    logError(error, {
      page: 'taskService',
      action: 'createTask',
      projectId: taskData.project_id
    });
    
    const errorDetails = handleSupabaseError(error);
    throw new Error(errorDetails.message);
  }
}

/**
 * Update an existing task
 * @param {string} taskId - Task ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated task
 */
export async function updateTask(taskId, updates) {
  try {
    if (!taskId) {
      throw new Error('Task ID is required');
    }

    // Get current task to check status change
    const currentTask = await getTaskById(taskId);
    if (!currentTask) {
      throw new Error('Task not found');
    }

    // Role check: only PM / PC / task creator can edit task fields
    const role = await getUserProjectRole(currentTask.project_id);
    if (!hasPermission(role, 'create_tasks')) {
      throw new Error('You do not have permission to edit tasks');
    }

    const statusChanged = updates.status && updates.status !== currentTask.status;

    // Validate any status transition through the permission layer
    if (statusChanged) {
      const { allowed, reason } = validateTaskTransition(currentTask.status, updates.status, role);
      if (!allowed) throw new Error(reason);
    }

    // Update task
    const { data, error } = await supabase
      .from('tasks')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;

    // Create project update if status changed to done
    if (statusChanged && updates.status === 'done') {
      await createProjectUpdate(
        currentTask.project_id,
        'task_completed',
        `Task completed: ${currentTask.title}`
      );

      // Recalculate project progress
      await updateProjectProgress(currentTask.project_id);
    }

    return data;
  } catch (error) {
    console.error('Error updating task:', error);
    throw new Error(error.message || 'Failed to update task');
  }
}

/**
 * Delete a task
 * @param {string} taskId - Task ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteTask(taskId) {
  // Check demo mode first
  if (isDemoMode()) {
    const result = await demoServices.tasks.delete(taskId);
    return result.success;
  }

  try {
    if (!taskId) {
      throw new Error('Task ID is required');
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting task:', error);
    throw new Error('Failed to delete task');
  }
}

/**
 * Toggle task status quickly.
 * @deprecated Use updateTaskStatus() for role-aware, validated status changes.
 * @param {string} taskId - Task ID
 * @param {string} newStatus - New status
 * @returns {Promise<Object>} Updated task
 */
export async function toggleTaskStatus(taskId, newStatus) {
  console.warn('[taskService] toggleTaskStatus() is deprecated. Use updateTaskStatus() instead.');

  if (!taskId || !newStatus) throw new Error('Task ID and status are required');

  const task = await getTaskById(taskId);
  if (!task) throw new Error('Task not found');

  const result = await updateTaskStatus(taskId, task.project_id, newStatus);
  if (!result.success) throw new Error(result.message);

  return result.task;
}

/**
 * Get task statistics for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Task stats { total, todo, in_progress, done, completionRate }
 */
export async function getTaskStats(projectId) {
  try {
    if (!projectId) {
      throw new Error('Project ID is required');
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('status')
      .eq('project_id', projectId);

    if (error) throw error;

    const stats = {
      total: data.length,
      todo: data.filter(t => t.status === 'todo').length,
      in_progress: data.filter(t => t.status === 'in_progress').length,
      pending_review: data.filter(t => t.status === 'pending_review').length,
      done: data.filter(t => t.status === 'done').length,
      blocked: data.filter(t => t.status === 'blocked').length,
      completionRate: data.length > 0 ? Math.round((data.filter(t => t.status === 'done').length / data.length) * 100) : 0
    };

    return stats;
  } catch (error) {
    console.error('Error fetching task stats:', error);
    throw new Error('Failed to load task statistics');
  }
}

/**
 * Get overdue tasks for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of overdue tasks
 */
export async function getOverdueTasks(projectId) {
  try {
    if (!projectId) {
      throw new Error('Project ID is required');
    }

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned_user:profiles(id, full_name)
      `)
      .eq('project_id', projectId)
      .neq('status', 'done')
      .lt('due_date', today)
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching overdue tasks:', error);
    throw new Error('Failed to load overdue tasks');
  }
}

/**
 * Assign task to a user
 * @param {string} taskId - Task ID
 * @param {string} userId - User ID to assign to
 * @returns {Promise<Object>} Updated task
 */
export async function assignTask(taskId, userId) {
  try {
    if (!taskId) {
      throw new Error('Task ID is required');
    }

    // Get current task
    const currentTask = await getTaskById(taskId);
    if (!currentTask) {
      throw new Error('Task not found');
    }

    // Get user name for update
    let userName = 'Team member';
    if (userId) {
      const { data: userData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      if (userData) {
        userName = userData.full_name;
      }
    }

    // Update task assignment
    const { data, error } = await supabase
      .from('tasks')
      .update({
        assigned_to: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;

    // Create project update
    await createProjectUpdate(
      currentTask.project_id,
      'task_assigned',
      `Task assigned to ${userName}: ${currentTask.title}`
    );

    return data;
  } catch (error) {
    console.error('Error assigning task:', error);
    throw new Error(error.message || 'Failed to assign task');
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Check if a date is overdue (in the past)
 * @param {string} dueDate - ISO date string
 * @returns {boolean} True if date is in the past
 */
export function isOverdue(dueDate) {
  if (!dueDate) return false;

  try {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    return due < today;
  } catch (error) {
    console.warn('Error checking if overdue:', error);
    return false;
  }
}

/**
 * Create a project update entry
 * @param {string} projectId - Project ID
 * @param {string} updateType - Type of update
 * @param {string} text - Update text
 * @private
 */
async function createProjectUpdate(projectId, updateType, text) {
  try {
    const { error } = await supabase
      .from('project_updates')
      .insert({
        project_id: projectId,
        update_type: updateType,
        text: text,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.warn('Error creating project update:', error);
    }
  } catch (error) {
    console.warn('Error in createProjectUpdate:', error);
  }
}

/**
 * Update project progress based on tasks
 * @param {string} projectId - Project ID
 * @private
 */
async function updateProjectProgress(projectId) {
  try {
    const stats = await getTaskStats(projectId);
    const progress = stats.total > 0 ? stats.completionRate : 0;

    const { error } = await supabase
      .from('projects')
      .update({
        progress: progress,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId);

    if (error) {
      console.warn('Error updating project progress:', error);
    }
  } catch (error) {
    console.warn('Error in updateProjectProgress:', error);
  }
}

// ==================== ROLE-AWARE STATUS UPDATE ====================

/**
 * Update task status with role-based validation and audit logging.
 * This is the preferred method for all status changes after the RBAC migration.
 *
 * @param {string} taskId     - Task UUID
 * @param {string} projectId  - Project UUID (needed for role lookup)
 * @param {string} newStatus  - Target status
 * @param {string} [roleHint] - Optional pre-fetched role (avoids extra DB call)
 * @returns {Promise<{ success: boolean, message: string, task?: object }>}
 */
export async function updateTaskStatus(taskId, projectId, newStatus, roleHint = null) {
  try {
    // 1. Fetch current task
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('id, status, title, project_id')
      .eq('id', taskId)
      .single();

    if (fetchError || !task) throw new Error('Task not found');

    // 2. Resolve user's role
    const role = roleHint ?? await getUserProjectRole(projectId);
    if (!role) throw new Error('You are not a member of this project');

    // 3. Validate the transition
    const { allowed, reason } = validateTaskTransition(task.status, newStatus, role);
    if (!allowed) throw new Error(reason);

    // 4. Build update payload
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      status:     newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === 'done') {
      payload.completed_at = new Date().toISOString();
      payload.completed_by = user?.id ?? null;
    } else if (task.status === 'done') {
      // Reopening – clear completion info
      payload.completed_at = null;
      payload.completed_by = null;
    }

    // 5. Persist update
    const { data: updated, error: updateError } = await supabase
      .from('tasks')
      .update(payload)
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 6. Write audit log (non-blocking)
    if (user) {
      logAuditEvent(projectId, user.id, 'task_status_changed', 'task', taskId, {
        old_value: { status: task.status },
        new_value: { status: newStatus },
      }).catch(err => console.warn('[taskService] audit log failed:', err));
    }

    // 7. Create project update activity if completed
    if (newStatus === 'done') {
      createProjectUpdate(projectId, 'task_completed', `Task completed: ${task.title}`);
      updateProjectProgress(projectId);

      // Notify assignee when PM/PC approves a pending_review task
      if (task.status === 'pending_review' && updated.assigned_to) {
        notifyUser(
          updated.assigned_to,
          {
            project_id:        projectId,
            notification_type: 'task_approved',
            title:             'Task Approved ✅',
            message:           `Your task "${task.title}" has been approved.`,
            entity_type:       'task',
            entity_id:         taskId,
          }
        ).catch(err => console.warn('[taskService] notify task_approved failed:', err));
      }
    } else if (newStatus === 'in_progress' && task.status === 'pending_review') {
      // Notify assignee when PM/PC sends a task back for revision
      if (updated.assigned_to) {
        notifyUser(
          updated.assigned_to,
          {
            project_id:        projectId,
            notification_type: 'task_rejected',
            title:             'Task Needs Revision',
            message:           `"${task.title}" was sent back for revision.`,
            entity_type:       'task',
            entity_id:         taskId,
          }
        ).catch(err => console.warn('[taskService] notify task_rejected failed:', err));
      }
    } else if (newStatus === 'pending_review') {
      createProjectUpdate(projectId, 'general', `Task ready for review: ${task.title}`);

      // Notify PM / PC that this task needs approval (non-blocking)
      notifyProjectMembers(
        projectId,
        ['project_manager', 'project_coordinator'],
        {
          notification_type: 'task_review_requested',
          title:             'Task ready for review',
          message:           `"${task.title}" needs your approval.`,
          entity_type:       'task',
          entity_id:         taskId,
        }
      ).catch(err => console.warn('[taskService] notify pending_review failed:', err));
    }

    const statusMessages = {
      pending_review: 'Task submitted for review. A PM or Coordinator will approve it.',
      done:           'Task marked as complete.',
      in_progress:    'Task moved back to In Progress.',
      todo:           'Task moved back to To Do.',
      blocked:        'Task marked as blocked.',
    };

    return {
      success: true,
      message: statusMessages[newStatus] ?? `Status updated to ${newStatus}`,
      task:    updated,
    };
  } catch (err) {
    console.error('[taskService] updateTaskStatus error:', err);
    return { success: false, message: err.message ?? 'Failed to update task status' };
  }
}

/**
 * Write an entry to project_audit_log.
 * Non-critical – errors are logged but not re-thrown.
 *
 * @param {string} projectId
 * @param {string} userId
 * @param {string} action
 * @param {string} entityType
 * @param {string} entityId
 * @param {{ old_value?: object, new_value?: object }} values
 */
export async function logAuditEvent(projectId, userId, action, entityType, entityId, values = {}) {
  try {
    await supabase.from('project_audit_log').insert({
      project_id:  projectId,
      user_id:     userId,
      action,
      entity_type: entityType,
      entity_id:   entityId,
      old_value:   values.old_value ?? null,
      new_value:   values.new_value ?? null,
    });
  } catch (err) {
    console.warn('[taskService] logAuditEvent failed:', err);
  }
}

/**
 * Fetch the audit log for a project (PM/PC only – enforced by RLS).
 *
 * @param {string} projectId
 * @param {number} [limit=50]
 * @returns {Promise<Array>}
 */
export async function getProjectAuditLog(projectId, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('project_audit_log')
      .select(`
        *,
        actor:profiles!project_audit_log_user_id_fkey(id, full_name, avatar_url)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data ?? [];
  } catch (err) {
    console.error('[taskService] getProjectAuditLog error:', err);
    return [];
  }
}

/**
 * Get pending-review tasks for a project (for PM/PC dashboard widget).
 *
 * @param {string} projectId
 * @returns {Promise<Array>}
 */
export async function getPendingReviewTasks(projectId) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned_user:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url)
      `)
      .eq('project_id', projectId)
      .eq('status', 'pending_review')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  } catch (err) {
    console.error('[taskService] getPendingReviewTasks error:', err);
    return [];
  }
}

/**
 * Bulk-approve pending-review tasks (PM / PC only).
 * Marks all provided task IDs as `done` in a single DB call.
 *
 * @param {string}   projectId - Project UUID
 * @param {string[]} taskIds   - Array of task UUIDs to approve
 * @returns {Promise<{ success: boolean, message: string, count?: number }>}
 */
export async function bulkApproveReview(projectId, taskIds) {
  if (!projectId || !taskIds?.length) {
    return { success: false, message: 'Project ID and task IDs are required' };
  }

  try {
    // Permission check
    const role = await getUserProjectRole(projectId);
    if (!hasPermission(role, 'complete_tasks')) {
      return { success: false, message: 'Permission denied: only PM or PC can bulk-approve tasks' };
    }

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('tasks')
      .update({
        status:       'done',
        completed_at: new Date().toISOString(),
        completed_by: user?.id ?? null,
        updated_at:   new Date().toISOString(),
      })
      .in('id', taskIds)
      .eq('status', 'pending_review');   // safety: only touch tasks still pending

    if (error) throw error;

    // Non-blocking audit log entries
    if (user) {
      taskIds.forEach(taskId => {
        logAuditEvent(projectId, user.id, 'task_status_changed', 'task', taskId, {
          old_value: { status: 'pending_review' },
          new_value: { status: 'done' },
        }).catch(err => console.warn('[taskService] audit log failed:', err));
      });
    }

    // Update project progress
    updateProjectProgress(projectId);
    createProjectUpdate(projectId, 'general', `${taskIds.length} task(s) bulk-approved by PM/PC`);

    return {
      success: true,
      message: `${taskIds.length} task${taskIds.length === 1 ? '' : 's'} approved`,
      count:   taskIds.length,
    };
  } catch (err) {
    console.error('[taskService] bulkApproveReview error:', err);
    return { success: false, message: err.message ?? 'Failed to bulk-approve tasks' };
  }
}

// ==================== EXPORT ALL FUNCTIONS ====================

export default {
  getTasksByProject,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskStatus,
  updateTaskStatus,
  logAuditEvent,
  getProjectAuditLog,
  getPendingReviewTasks,
  bulkApproveReview,
  getTaskStats,
  getOverdueTasks,
  assignTask,
  isOverdue,
};
