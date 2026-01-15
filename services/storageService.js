/**
 * Storage Service
 * Supabase Storage operations for files and uploads
 */

import { supabase } from './supabase.js';
import { handleFileError, retryOperation, logError } from '../utils/errorHandler.js';
import { validateFileData } from '../utils/validators.js';

// ==================== FILE TYPE CONSTANTS ====================

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv'
];

export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_DOCUMENT_SIZE_MB = 50;

// ==================== CORE UPLOAD FUNCTIONS ====================

/**
 * Upload file to Supabase Storage
 * @param {File} file - File to upload
 * @param {string} bucket - Storage bucket name
 * @param {string} folder - Folder path (default: '')
 * @returns {Promise<Object>} { success, fileUrl, fileName, error }
 */
export async function uploadFile(file, bucket, folder = '') {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const fileExt = file.name.split('.').pop();
    const fileName = `${timestamp}-${randomId}.${fileExt}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    // Upload file
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return {
      success: true,
      fileUrl: urlData?.publicUrl || '',
      fileName: fileName,
      filePath: filePath,
      error: null
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    return {
      success: false,
      fileUrl: '',
      fileName: '',
      error: error.message || 'Failed to upload file'
    };
  }
}

/**
 * Upload file to project files bucket
 * @param {File} file - File to upload
 * @param {string} projectId - Project ID
 * @param {string} category - File category (default: 'other')
 * @returns {Promise<Object>} { success, file, error }
 */
export async function uploadProjectFile(file, projectId, category = 'other') {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

    if (!projectId) {
      throw new Error('Project ID is required');
    }

    // Validate file data using new validator
    const validation = validateFileData({
      file: file,
      name: file.name,
      type: file.type,
      size: file.size,
      category: category
    });

    if (!validation.valid) {
      const errorMessages = validation.errors.map(e => e.message).join(', ');
      throw new Error(errorMessages);
    }

    // Upload to storage with retry
    const folder = `projects/${projectId}`;
    
    const uploadOperation = async () => {
      const uploadResult = await uploadFile(file, 'project-files', folder);
      if (!uploadResult.success) {
        throw new Error(uploadResult.error);
      }
      return uploadResult;
    };

    const uploadResult = await retryOperation(uploadOperation, 3, 1000);

    // Create metadata record
    const fileData = {
      project_id: projectId,
      file_url: uploadResult.fileUrl,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      category: category,
      uploaded_by: (await supabase.auth.getSession()).data.session?.user.id
    };

    const metadata = await createFileMetadata(fileData);

    return {
      success: true,
      file: metadata,
      error: null
    };
  } catch (error) {
    logError(error, {
      page: 'storageService',
      action: 'uploadProjectFile',
      projectId,
      fileName: file?.name
    });
    
    const errorDetails = handleFileError(error);
    return {
      success: false,
      file: null,
      error: errorDetails.message
    };
  }
}

// ==================== DELETE FUNCTIONS ====================

/**
 * Delete file from Supabase Storage
 * @param {string} bucket - Storage bucket name
 * @param {string} filePath - File path in bucket
 * @returns {Promise<Object>} { success, error }
 */
export async function deleteFile(bucket, filePath) {
  try {
    if (!bucket || !filePath) {
      throw new Error('Bucket and file path are required');
    }

    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) throw error;

    return {
      success: true,
      error: null
    };
  } catch (error) {
    console.error('Error deleting file:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete file'
    };
  }
}

/**
 * Delete project file (both from storage and database)
 * @param {string} fileId - File ID from project_files table
 * @returns {Promise<Object>} { success, error }
 */
export async function deleteProjectFile(fileId) {
  try {
    if (!fileId) {
      throw new Error('File ID is required');
    }

    // Get file record
    const { data: fileData, error: fetchError } = await supabase
      .from('project_files')
      .select('file_url')
      .eq('id', fileId)
      .single();

    if (fetchError) throw fetchError;
    if (!fileData) throw new Error('File not found');

    // Extract file path from URL
    const urlParts = fileData.file_url.split('/');
    const bucketIndex = urlParts.indexOf('project-files');
    const filePath = urlParts.slice(bucketIndex + 1).join('/');

    // Delete from storage
    const deleteResult = await deleteFile('project-files', filePath);
    if (!deleteResult.success) {
      throw new Error(deleteResult.error);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('project_files')
      .delete()
      .eq('id', fileId);

    if (dbError) throw dbError;

    return {
      success: true,
      error: null
    };
  } catch (error) {
    console.error('Error deleting project file:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete project file'
    };
  }
}

// ==================== URL FUNCTIONS ====================

/**
 * Get public URL for a file
 * @param {string} bucket - Storage bucket name
 * @param {string} filePath - File path in bucket
 * @returns {Promise<string>} Public URL
 */
export async function getPublicUrl(bucket, filePath) {
  try {
    if (!bucket || !filePath) {
      throw new Error('Bucket and file path are required');
    }

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return data?.publicUrl || '';
  } catch (error) {
    console.error('Error getting public URL:', error);
    return '';
  }
}

// ==================== QUERY FUNCTIONS ====================

/**
 * Get all files for a project
 * @param {string} projectId - Project ID
 * @param {string} category - File category filter (optional)
 * @returns {Promise<Array>} Array of file objects
 */
export async function getFilesByProject(projectId, category = null) {
  try {
    if (!projectId) {
      throw new Error('Project ID is required');
    }

    let query = supabase
      .from('project_files')
      .select('*')
      .eq('project_id', projectId);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query.order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching project files:', error);
    throw new Error('Failed to load project files');
  }
}

/**
 * Get files by MIME type pattern
 * @param {string} projectId - Project ID
 * @param {string} fileType - File type pattern (image, document, etc.)
 * @returns {Promise<Array>} Array of matching files
 */
export async function getFilesByType(projectId, fileType) {
  try {
    if (!projectId) {
      throw new Error('Project ID is required');
    }

    if (!fileType) {
      throw new Error('File type is required');
    }

    let query = supabase
      .from('project_files')
      .select('*')
      .eq('project_id', projectId);

    // Add filter based on file type pattern
    if (fileType === 'image') {
      query = query.like('file_type', 'image/%');
    } else if (fileType === 'document') {
      query = query.like('file_type', 'application/%');
    } else {
      query = query.like('file_type', `${fileType}/%`);
    }

    const { data, error } = await query.order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching files by type:', error);
    throw new Error('Failed to load files');
  }
}

// ==================== VALIDATION FUNCTIONS ====================

/**
 * Validate file type
 * @param {File} file - File to validate
 * @param {Array} allowedTypes - Array of allowed MIME types
 * @returns {Object} { valid, error }
 */
export function validateFileType(file, allowedTypes) {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (!file.type) {
    return { valid: false, error: 'File type cannot be determined' };
  }

  if (!Array.isArray(allowedTypes) || allowedTypes.length === 0) {
    return { valid: false, error: 'No allowed file types specified' };
  }

  // Check if file type is in allowed list
  const isAllowed = allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      const prefix = type.split('/')[0];
      return file.type.startsWith(prefix + '/');
    }
    return file.type === type;
  });

  if (!isAllowed) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
    };
  }

  return { valid: true, error: null };
}

/**
 * Validate file size
 * @param {File} file - File to validate
 * @param {number} maxSizeMB - Maximum size in MB
 * @returns {Object} { valid, error }
 */
export function validateFileSize(file, maxSizeMB) {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (!maxSizeMB || maxSizeMB <= 0) {
    return { valid: false, error: 'Invalid max size specified' };
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds maximum allowed (${maxSizeMB}MB)`
    };
  }

  return { valid: true, error: null };
}

// ==================== METADATA FUNCTIONS ====================

/**
 * Create file metadata record
 * @param {Object} fileData - File metadata { project_id, task_id, file_url, file_name, file_type, file_size, category, caption, uploaded_by }
 * @returns {Promise<Object>} Created file object
 */
export async function createFileMetadata(fileData) {
  try {
    const {
      project_id,
      task_id = null,
      file_url,
      file_name,
      file_type,
      file_size,
      category = 'other',
      caption = '',
      uploaded_by
    } = fileData;

    if (!project_id || !file_url || !file_name) {
      throw new Error('Project ID, file URL, and file name are required');
    }

    const { data, error } = await supabase
      .from('project_files')
      .insert({
        project_id,
        task_id,
        file_url,
        file_name,
        file_type,
        file_size,
        category,
        caption,
        uploaded_by,
        uploaded_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating file metadata:', error);
    throw new Error(error.message || 'Failed to create file metadata');
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Get Bootstrap icon class based on MIME type
 * @param {string} mimeType - MIME type
 * @returns {string} Bootstrap icon class
 */
export function getFileIcon(mimeType) {
  if (!mimeType || typeof mimeType !== 'string') {
    return 'bi-file-earmark';
  }

  if (mimeType.startsWith('image/')) {
    return 'bi-file-image';
  } else if (mimeType === 'application/pdf') {
    return 'bi-file-pdf';
  } else if (
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'bi-file-word';
  } else if (
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return 'bi-file-spreadsheet';
  } else if (mimeType.startsWith('text/')) {
    return 'bi-file-text';
  } else if (mimeType.startsWith('video/')) {
    return 'bi-file-play';
  } else if (mimeType.startsWith('audio/')) {
    return 'bi-file-music';
  } else {
    return 'bi-file-earmark';
  }
}

/**
 * Format bytes to human-readable file size
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted size (e.g., "2.5 MB")
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// ==================== EXPORT ALL ====================

export default {
  // Constants
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  MAX_IMAGE_SIZE_MB,
  MAX_DOCUMENT_SIZE_MB,
  // Upload
  uploadFile,
  uploadProjectFile,
  // Delete
  deleteFile,
  deleteProjectFile,
  // URLs
  getPublicUrl,
  // Query
  getFilesByProject,
  getFilesByType,
  // Validation
  validateFileType,
  validateFileSize,
  // Metadata
  createFileMetadata,
  // Helpers
  getFileIcon,
  formatFileSize
};
