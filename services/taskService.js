/**
 * Task Service
 * CRUD operations for project tasks
 */

import { supabase } from './supabase.js';
import { handleSupabaseError, retryOperation, logError } from '../utils/errorHandler.js';
import { validateTaskData } from '../utils/validators.js';
import { isDemoMode, demoServices } from '../utils/demoMode.js';

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
      todo: [],
      in_progress: [],
      done: []
    };

    data.forEach(task => {
      const status = task.status || 'todo';
      if (grouped[status]) {
        grouped[status].push(task);
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

    const statusChanged = updates.status && updates.status !== currentTask.status;

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
 * Toggle task status quickly
 * @param {string} taskId - Task ID
 * @param {string} newStatus - New status (todo, in_progress, done)
 * @returns {Promise<Object>} Updated task
 */
export async function toggleTaskStatus(taskId, newStatus) {
  try {
    if (!taskId || !newStatus) {
      throw new Error('Task ID and status are required');
    }

    // Valid statuses
    const validStatuses = ['todo', 'in_progress', 'done'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Get current task
    const currentTask = await getTaskById(taskId);
    if (!currentTask) {
      throw new Error('Task not found');
    }

    // Update task status
    const { data, error } = await supabase
      .from('tasks')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;

    // Create project update if completed
    if (newStatus === 'done') {
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
    console.error('Error toggling task status:', error);
    throw new Error(error.message || 'Failed to update task status');
  }
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
      done: data.filter(t => t.status === 'done').length,
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

// ==================== EXPORT ALL FUNCTIONS ====================

export default {
  getTasksByProject,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskStatus,
  getTaskStats,
  getOverdueTasks,
  assignTask,
  isOverdue
};
