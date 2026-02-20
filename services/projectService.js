import supabase from './supabase.js';
import { handleSupabaseError, showFriendlyError, retryOperation, logError } from '../utils/errorHandler.js';
import { validateProjectData } from '../utils/validators.js';
import { isDemoMode, demoServices } from '../utils/demoMode.js';

/**
 * Get all projects for a user with optional filters
 * @param {string} userId - User's ID
 * @param {object} filters - Optional filters: { type, status, search }
 * @returns {Promise<Array>} Array of projects
 */
export async function getAllProjects(userId, filters = {}) {
  // Check demo mode first
  if (isDemoMode()) {
    return await demoServices.projects.getAll(userId, filters);
  }

  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Retry this operation in case of network errors
    const operation = async () => {
      let query = supabase
        .from('projects')
        .select(`
          *,
          project_members(user_id)
        `)
        .order('created_at', { ascending: false });

      // Apply type filter
      if (filters.type) {
        query = query.eq('project_type', filters.type);
      }

      // Apply status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Apply search filter
      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const scopedProjects = (data || []).filter(project => (
        project.user_id === userId ||
        (project.project_members || []).some(member => member.user_id === userId)
      ));

      return scopedProjects.map(({ project_members, ...project }) => project);
    };

    return await retryOperation(operation, 3, 1000);
  } catch (error) {
    logError(error, {
      page: 'projectService',
      action: 'getAllProjects',
      userId
    });
    
    const errorDetails = handleSupabaseError(error);
    throw new Error(errorDetails.message);
  }
}

/**
 * Get a single project by ID with related data
 * @param {string} projectId - Project ID
 * @returns {Promise<object|null>} Project object with stats or null
 */
export async function getProjectById(projectId) {
  // Check demo mode first
  if (isDemoMode()) {
    return await demoServices.projects.getById(projectId);
  }

  try {
    if (!projectId) {
      throw new Error('Project ID is required');
    }

    // Get project data
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        profiles:user_id(id, full_name, avatar_url, email)
      `)
      .eq('id', projectId)
      .single();

    if (projectError) {
      if (projectError.code === 'PGRST116') {
        return null; // Project not found
      }
      throw projectError;
    }

    // Get task counts
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('project_id', projectId);

    if (!tasksError && tasks) {
      project.task_counts = {
        total: tasks.length,
        done: tasks.filter(t => t.status === 'done').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        todo: tasks.filter(t => t.status === 'todo').length
      };
      project.completion_percentage = calculateProgress(tasks);
    }

    // Get file count
    const { count: fileCount, error: filesError } = await supabase
      .from('project_files')
      .select('id', { count: 'exact' })
      .eq('project_id', projectId);

    if (!filesError) {
      project.file_count = fileCount || 0;
    }

    return project;
  } catch (error) {
    console.error('Get project by ID error:', error);
    throw new Error('Failed to fetch project. Please try again.');
  }
}

/**
 * Create a new project
 * @param {object} projectData - Project data: { title, description, project_type, visibility, start_date, end_date, budget, funding_source, cover_image_url }
 * @returns {Promise<object>} Created project object
 */
export async function createProject(projectData) {
  // Check demo mode first
  if (isDemoMode()) {
    return await demoServices.projects.create(projectData);
  }

  try {
    // Validate required fields
    if (!projectData.title || !projectData.project_type) {
      throw new Error('Title and project type are required');
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Validate project data
    const validation = validateProjectData(projectData);
    if (!validation.valid) {
      const errorMessages = validation.errors.map(e => e.message).join(', ');
      throw new Error(errorMessages);
    }

    // Prepare project data
    const newProject = {
      ...projectData,
      user_id: user.id,
      status: projectData.status || 'planning',
      visibility: projectData.visibility || 'private',
      progress_percentage: 0
    };

    // Insert project with retry
    const operation = async () => {
      const { data: project, error } = await supabase
        .from('projects')
        .insert([newProject])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return project;
    };

    return await retryOperation(operation, 3, 1000);
  } catch (error) {
    logError(error, {
      page: 'projectService',
      action: 'createProject'
    });

    if (error.message.includes('validation')) {
      throw error; // Re-throw validation errors as-is
    }

    const errorDetails = handleSupabaseError(error);
    throw new Error(errorDetails.message);
  }
}

/**
 * Update an existing project
 * @param {string} projectId - Project ID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} Updated project
 */
export async function updateProject(projectId, updates) {
  // Check demo mode first
  if (isDemoMode()) {
    return await demoServices.projects.update(projectId, updates);
  }

  try {
    if (!projectId) {
      throw new Error('Project ID is required');
    }

    // Validate updates
    const validation = validateProjectData(updates);
    if (!validation.valid) {
      const errorMessages = validation.errors.map(e => e.message).join(', ');
      throw new Error(errorMessages);
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Check ownership (RLS will also enforce this)
    const { data: project, error: checkError } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', projectId)
      .single();

    if (checkError || !project) {
      throw new Error('Project not found');
    }

    if (project.user_id !== user.id) {
      throw new Error('You do not have permission to update this project');
    }

    // Update project
    const { data: updatedProject, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      console.error('Project update error:', error);
      throw error;
    }

    return updatedProject;
  } catch (error) {
    console.error('Update project error:', error);
    throw new Error(error.message || 'Failed to update project. Please try again.');
  }
}

/**
 * Delete a project
 * @param {string} projectId - Project ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteProject(projectId) {
  // Check demo mode first
  if (isDemoMode()) {
    const result = await demoServices.projects.delete(projectId);
    return result.success;
  }

  try {
    if (!projectId) {
      throw new Error('Project ID is required');
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Check ownership
    const { data: project, error: checkError } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', projectId)
      .single();

    if (checkError || !project) {
      throw new Error('Project not found');
    }

    if (project.user_id !== user.id) {
      throw new Error('You do not have permission to delete this project');
    }

    // Delete project (cascade will handle related records)
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      console.error('Project deletion error:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Delete project error:', error);
    throw new Error(error.message || 'Failed to delete project. Please try again.');
  }
}

/**
 * Upload cover image for project
 * @param {File} file - Image file to upload
 * @param {string} projectId - Project ID
 * @returns {Promise<string|null>} Public URL of uploaded image or null
 */
export async function uploadCoverImage(file, projectId) {
  try {
    if (!file || !projectId) {
      throw new Error('File and project ID are required');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('File size must be less than 5MB');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${projectId}-${timestamp}.${fileExt}`;

    // Upload file
    const { data, error } = await supabase.storage
      .from('project-covers')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('File upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('project-covers')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Upload cover image error:', error);
    throw new Error(error.message || 'Failed to upload image. Please try again.');
  }
}

/**
 * Get project statistics
 * @param {string} projectId - Project ID
 * @returns {Promise<object>} Project statistics
 */
export async function getProjectStats(projectId) {
  // Check demo mode first
  if (isDemoMode()) {
    const userId = 'demo-user-123'; // Demo user ID
    return await demoServices.projects.getStats(userId);
  }

  try {
    if (!projectId) {
      throw new Error('Project ID is required');
    }

    // Get tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('project_id', projectId);

    if (tasksError) {
      throw tasksError;
    }

    const taskStats = {
      total: tasks?.length || 0,
      done: tasks?.filter(t => t.status === 'done').length || 0,
      in_progress: tasks?.filter(t => t.status === 'in_progress').length || 0,
      todo: tasks?.filter(t => t.status === 'todo').length || 0,
      completion_percentage: calculateProgress(tasks || [])
    };

    // Get files
    const { count: fileCount, error: filesError } = await supabase
      .from('project_files')
      .select('id', { count: 'exact' })
      .eq('project_id', projectId);

    if (filesError) {
      throw filesError;
    }

    // Get last update
    const { data: updates, error: updatesError } = await supabase
      .from('project_updates')
      .select('created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (updatesError) {
      throw updatesError;
    }

    return {
      tasks: taskStats,
      file_count: fileCount || 0,
      last_update: updates?.[0]?.created_at || null
    };
  } catch (error) {
    console.error('Get project stats error:', error);
    throw new Error('Failed to fetch project statistics. Please try again.');
  }
}

/**
 * Search projects by title or description
 * @param {string} userId - User ID
 * @param {string} query - Search query
 * @returns {Promise<Array>} Matching projects
 */
export async function searchProjects(userId, query) {
  try {
    if (!userId || !query) {
      throw new Error('User ID and search query are required');
    }

    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_members(user_id)
      `)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Search projects error:', error);
      throw error;
    }

    const scopedProjects = (data || []).filter(project => (
      project.user_id === userId ||
      (project.project_members || []).some(member => member.user_id === userId)
    ));

    return scopedProjects.map(({ project_members, ...project }) => project);
  } catch (error) {
    console.error('Search projects error:', error);
    throw new Error('Failed to search projects. Please try again.');
  }
}

/**
 * Calculate project progress percentage from tasks
 * @param {Array} tasks - Array of task objects with status
 * @returns {number} Completion percentage (0-100)
 */
export function calculateProgress(tasks) {
  if (!tasks || tasks.length === 0) {
    return 0;
  }

  const completedTasks = tasks.filter(t => t.status === 'done').length;
  return Math.round((completedTasks / tasks.length) * 100);
}

/**
 * Get projects by visibility (public projects)
 * @param {number} limit - Number of projects to fetch
 * @returns {Promise<Array>} Public projects
 */
export async function getPublicProjects(limit = 10) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        id,
        title,
        description,
        project_type,
        status,
        cover_image_url,
        progress_percentage,
        created_at,
        profiles:user_id(full_name, avatar_url)
      `)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Get public projects error:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Get public projects error:', error);
    throw new Error('Failed to fetch public projects. Please try again.');
  }
}

export default {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  uploadCoverImage,
  getProjectStats,
  searchProjects,
  calculateProgress,
  getPublicProjects
};
