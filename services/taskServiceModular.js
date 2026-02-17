/**
 * Task Service - Modular Version
 * Handles all task-related API operations
 */
import { supabase } from './supabase.js';
import { showError } from '../utils/uiModular.js';
import { isDemoMode, demoServices } from '../utils/demoMode.js';

class TaskService {
  constructor() {
    this.isDemo = isDemoMode();
  }

  /**
   * Get all tasks for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} Array of tasks
   */
  async getProjectTasks(projectId) {
    try {
      if (this.isDemo) {
        return await demoServices.tasks.getByProject(projectId);
      }

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_user:profiles(id, full_name, avatar_url)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching tasks:', error);
      showError('Failed to load tasks');
      return [];
    }
  }

  /**
   * Get tasks grouped by status
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Tasks grouped by status
   */
  async getTasksByStatus(projectId) {
    try {
      const tasks = await this.getProjectTasks(projectId);
      
      // Group tasks by status
      const grouped = {
        todo: [],
        in_progress: [],
        done: []
      };

      tasks.forEach(task => {
        const status = task.status || 'todo';
        if (grouped[status]) {
          grouped[status].push(task);
        }
      });

      return grouped;
    } catch (error) {
      console.error('Error grouping tasks:', error);
      return { todo: [], in_progress: [], done: [] };
    }
  }

  /**
   * Create a new task
   * @param {Object} taskData - Task data
   * @returns {Promise<Object>} Created task
   */
  async createTask(taskData) {
    try {
      if (this.isDemo) {
        return await demoServices.tasks.create(taskData);
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select(`
          *,
          assigned_user:profiles(id, full_name, avatar_url)
        `)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating task:', error);
      showError('Failed to create task');
      throw error;
    }
  }

  /**
   * Update a task
   * @param {string} taskId - Task ID
   * @param {Object} updates - Updated data
   * @returns {Promise<Object>} Updated task
   */
  async updateTask(taskId, updates) {
    try {
      if (this.isDemo) {
        return await demoServices.tasks.update(taskId, updates);
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select(`
          *,
          assigned_user:profiles(id, full_name, avatar_url)
        `)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating task:', error);
      showError('Failed to update task');
      throw error;
    }
  }

  /**
   * Delete a task
   * @param {string} taskId - Task ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteTask(taskId) {
    try {
      if (this.isDemo) {
        await demoServices.tasks.delete(taskId);
        return true;
      }

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      showError('Failed to delete task');
      return false;
    }
  }

  /**
   * Get task statistics for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Task statistics
   */
  async getTaskStats(projectId) {
    try {
      const tasks = await this.getProjectTasks(projectId);
      
      const stats = {
        total: tasks.length,
        todo: tasks.filter(t => t.status === 'todo').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        done: tasks.filter(t => t.status === 'done').length,
        completion_rate: 0
      };

      if (stats.total > 0) {
        stats.completion_rate = Math.round((stats.done / stats.total) * 100);
      }

      return stats;
    } catch (error) {
      console.error('Error calculating task stats:', error);
      return { total: 0, todo: 0, in_progress: 0, done: 0, completion_rate: 0 };
    }
  }

  /**
   * Bulk update task status (for drag and drop)
   * @param {Array} updates - Array of {id, status} objects
   * @returns {Promise<boolean>} Success status
   */
  async bulkUpdateTasks(updates) {
    try {
      if (this.isDemo) {
        for (const update of updates) {
          await demoServices.tasks.update(update.id, { status: update.status });
        }
        return true;
      }

      const promises = updates.map(update => 
        supabase
          .from('tasks')
          .update({ status: update.status })
          .eq('id', update.id)
      );

      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('Error bulk updating tasks:', error);
      showError('Failed to update tasks');
      return false;
    }
  }
}

// Export singleton instance
export const taskService = new TaskService();

// Export individual functions for backward compatibility
export async function getTasksByProject(projectId) {
  return await taskService.getProjectTasks(projectId);
}

export async function createTask(taskData) {
  return await taskService.createTask(taskData);
}

export async function updateTask(taskId, updates) {
  return await taskService.updateTask(taskId, updates);
}

export async function deleteTask(taskId) {
  return await taskService.deleteTask(taskId);
}