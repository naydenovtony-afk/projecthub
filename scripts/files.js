/**
 * Files Page - Manage all files across projects
 */

import { isDemoMode, demoServices, enableDemoMode } from '../utils/demoMode.js';
import { checkAuthStatus, getCurrentUser, addDemoParamToLinks } from './auth.js';
import { showNotification } from '../utils/notifications.js';
import storageService from '../services/storageService.js';
import { getAllProjects } from '../services/projectService.js';

let allFiles = [];
let allProjects = [];
let currentView = 'grid';
let selectedFileForShare = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Auto-enable demo mode if no real session exists
  if (!isDemoMode()) {
    const user = getCurrentUser();
    if (!user) {
      enableDemoMode();
    }
  }

  if (!checkAuthStatus()) return;
  
  await loadProjects();
  await loadFiles();
  setupEventListeners();
  addDemoParamToLinks();
});

// Load all projects
async function loadProjects() {
  try {
    if (isDemoMode()) {
      allProjects = await demoServices.projects.getAll();
    } else {
      const user = getCurrentUser();
      allProjects = await getAllProjects(user.id);
    }
    
    populateProjectSelects();
  } catch (error) {
    console.error('Error loading projects:', error);
    showNotification('Failed to load projects', 'error');
  }
}

// Populate project select dropdowns
function populateProjectSelects() {
  const selects = ['filterProject', 'fileProject'];
  
  selects.forEach(selectId => {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    const firstOption = select.options[0];
    select.innerHTML = '';
    select.appendChild(firstOption);
    
    allProjects.forEach(project => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.title;
      select.appendChild(option);
    });
  });
}

// Load all files
async function loadFiles() {
  try {
    if (isDemoMode()) {
      // Build a quick id→title map from already-loaded projects
      const projectMap = {};
      allProjects.forEach(p => { projectMap[p.id] = p.title; });

      const rawFiles = await demoServices.files.getAll();
      allFiles = rawFiles.map(file => ({
        ...file,
        name: file.file_name,
        size: file.file_size,
        url: file.file_url,
        created_at: file.uploaded_at,
        project_title: projectMap[file.project_id] || 'Unknown Project'
      }));
    } else {
      allFiles = [];

      for (const project of allProjects) {
        const projectFiles = await storageService.getFilesByProject(project.id);

        projectFiles.forEach(file => {
          allFiles.push({
            ...file,
            name: file.file_name,
            size: file.file_size,
            url: file.file_url,
            created_at: file.uploaded_at,
            project_title: project.title
          });
        });
      }
    }
    
    updateStats();
    renderFiles();
  } catch (error) {
    console.error('Error loading files:', error);
    showNotification('Failed to load files', 'error');
    renderEmptyState();
  }
}

// Update file statistics
function updateStats() {
  const total = allFiles.length;
  const images = allFiles.filter(f => f.category === 'image' || (f.file_type || '').startsWith('image/')).length;
  const documents = allFiles.filter(f => ['document', 'deliverable', 'report'].includes(f.category)).length;
  
  // Calculate total storage (mock calculation for demo)
  const totalSize = allFiles.reduce((sum, file) => sum + (file.size || 0), 0);
  const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
  
  document.getElementById('totalFilesCount').textContent = total;
  document.getElementById('imagesCount').textContent = images;
  document.getElementById('documentsCount').textContent = documents;
  document.getElementById('storageUsed').textContent = `${sizeMB} MB`;
}

// Render files
function renderFiles() {
  const filteredFiles = applyFilters();
  
  if (filteredFiles.length === 0) {
    renderEmptyState();
    return;
  }
  
  if (currentView === 'grid') {
    renderGridView(filteredFiles);
  } else {
    renderListView(filteredFiles);
  }
}

// Render grid view
function renderGridView(files) {
  const gridView = document.getElementById('filesGridView');
  const listView = document.getElementById('filesListView');
  
  gridView.style.display = 'flex';
  listView.style.display = 'none';
  
  gridView.innerHTML = files.map(file => `
    <div class="col-sm-6 col-lg-4 col-xl-3">
      <div class="card h-100 shadow-sm">
        <div class="card-body text-center pb-2">
          ${renderFileIcon(file)}
          <h6 class="card-title mt-3 mb-1 text-truncate" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</h6>
          ${file.caption ? `<p class="text-muted small mb-1" style="font-size:0.78rem;">${escapeHtml(file.caption)}</p>` : ''}
          <p class="text-muted small mb-2">
            <i class="bi bi-folder2 me-1"></i>${escapeHtml(file.project_title)}
          </p>
          <div class="d-flex gap-1 justify-content-center flex-wrap">
            <span class="badge bg-${getCategoryColor(file.category)}">${file.category}</span>
            <span class="badge bg-light text-dark border">${formatFileSize(file.size)}</span>
          </div>
        </div>
        <div class="card-footer border-top-0 pt-0">
          <div class="action-btn-group justify-content-center">
            <button class="btn btn-action" onclick="downloadFile('${file.id}')" title="Download File">
              <i class="bi bi-download"></i>
            </button>
            <button class="btn btn-action" onclick="viewFileProject('${file.project_id}')" title="Open Project">
              <i class="bi bi-folder"></i>
            </button>
            <button class="btn btn-action" onclick="openShareFileModal('${file.id}')" title="Share / Transfer File">
              <i class="bi bi-share"></i>
            </button>
            <button class="btn btn-action btn-action-danger" onclick="deleteFile('${file.id}')" title="Delete File">
              <i class="bi bi-trash"></i>
            </button>
          </div>
          <p class="text-muted text-center mb-0 mt-1" style="font-size:0.72rem;">${formatDate(file.created_at)}</p>
        </div>
      </div>
    </div>
  `).join('');
}

// Render list view
function renderListView(files) {
  const gridView = document.getElementById('filesGridView');
  const listView = document.getElementById('filesListView');
  const tbody = document.getElementById('filesTableBody');
  
  gridView.style.display = 'none';
  listView.style.display = 'block';
  
  tbody.innerHTML = files.map(file => `
    <tr>
      <td style="max-width:260px;">
        <div class="d-flex align-items-center gap-2">
          ${renderFileIconSmall(file)}
          <div>
            <div class="fw-medium text-truncate" style="max-width:220px;" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
            ${file.caption ? `<div class="text-muted" style="font-size:0.75rem;">${escapeHtml(file.caption)}</div>` : ''}
          </div>
        </div>
      </td>
      <td><span class="badge bg-light text-dark border">${escapeHtml(file.project_title)}</span></td>
      <td><span class="badge bg-${getCategoryColor(file.category)}">${file.category}</span></td>
      <td class="text-nowrap">${formatFileSize(file.size)}</td>
      <td class="text-nowrap">${formatDate(file.created_at)}</td>
      <td>
        <div class="action-btn-group">
          <button class="btn btn-action" onclick="downloadFile('${file.id}')" title="Download File"><i class="bi bi-download"></i></button>
          <button class="btn btn-action" onclick="viewFileProject('${file.project_id}')" title="Open Project"><i class="bi bi-folder"></i></button>
          <button class="btn btn-action" onclick="openShareFileModal('${file.id}')" title="Share / Transfer File"><i class="bi bi-share"></i></button>
          <button class="btn btn-action btn-action-danger" onclick="deleteFile('${file.id}')" title="Delete File"><i class="bi bi-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Apply filters
function applyFilters() {
  const categoryFilter = document.getElementById('filterCategory').value;
  const projectFilter = document.getElementById('filterProject').value;
  const searchQuery = document.getElementById('searchFiles').value.toLowerCase();
  
  return allFiles.filter(file => {
    if (categoryFilter && file.category !== categoryFilter) return false;
    if (projectFilter && file.project_id !== projectFilter) return false;
    if (searchQuery && !file.name.toLowerCase().includes(searchQuery)) return false;
    return true;
  });
}

// Render empty state
function renderEmptyState() {
  const gridView = document.getElementById('filesGridView');
  gridView.style.display = 'flex';
  document.getElementById('filesListView').style.display = 'none';
  
  gridView.innerHTML = `
    <div class="col-12 text-center py-5">
      <i class="bi bi-file-earmark text-muted" style="font-size: 3rem;"></i>
      <p class="text-muted mt-3 mb-3">No files yet</p>
      <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#uploadFileModal">
        <i class="bi bi-cloud-upload me-2"></i>Upload Your First File
      </button>
    </div>
  `;
}

// Setup event listeners
function setupEventListeners() {
  // Filter changes
  ['filterCategory', 'filterProject'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', renderFiles);
  });
  
  document.getElementById('searchFiles')?.addEventListener('input', renderFiles);
  
  // View mode toggle
  document.getElementById('viewGrid')?.addEventListener('change', () => {
    currentView = 'grid';
    renderFiles();
  });
  
  document.getElementById('viewList')?.addEventListener('change', () => {
    currentView = 'list';
    renderFiles();
  });
  
  // Upload file
  document.getElementById('uploadFileBtn')?.addEventListener('click', uploadFile);

  // Share / transfer file
  document.getElementById('confirmShareFileBtn')?.addEventListener('click', submitShareFile);

  document.getElementById('shareRecipient')?.addEventListener('change', (e) => {
    const selectedOption = e.target.selectedOptions?.[0];
    const emailInput = document.getElementById('shareRecipientEmail');
    if (!emailInput || !selectedOption) return;

    const email = selectedOption.dataset.email || '';
    if (email) {
      emailInput.value = email;
    }
  });
  
  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = './login.html';
  });
}

// Upload file
async function uploadFile() {
  const fileInput = document.getElementById('fileInput');
  const fileName = document.getElementById('fileName').value.trim();
  const projectId = document.getElementById('fileProject').value;
  const category = document.getElementById('fileCategory').value;
  
  if (!fileInput.files[0] || !projectId) {
    showNotification('Please select a file and project', 'error');
    return;
  }
  
  try {
    const file = fileInput.files[0];
    const displayName = fileName || file.name;
    
    showNotification('Uploading file...', 'info');
    
    let uploadedFile;
    if (isDemoMode()) {
      const raw = await demoServices.files.upload(file, projectId, category);
      const project = allProjects.find(p => p.id === projectId);
      uploadedFile = {
        ...raw.file,
        // Provide normalised keys expected by the render helpers
        name: displayName || file.name,
        size: file.size,
        url: '#',
        created_at: new Date().toISOString(),
        project_title: project?.title || 'Unknown'
      };
    } else {
      const uploadResult = await storageService.uploadProjectFile(file, projectId, category);
      if (!uploadResult?.success) {
        throw new Error(uploadResult?.error || 'Upload failed');
      }

      const project = allProjects.find(p => p.id === projectId);
      const dbFile = uploadResult.file;
      uploadedFile = {
        ...dbFile,
        name: dbFile.file_name,
        size: dbFile.file_size,
        url: dbFile.file_url,
        created_at: dbFile.uploaded_at,
        project_title: project?.title || 'Unknown'
      };
    }
    
    allFiles.unshift(uploadedFile);
    
    showNotification('File uploaded successfully!', 'success');
    
    // Reset form and close modal
    document.getElementById('uploadFileForm').reset();
    bootstrap.Modal.getInstance(document.getElementById('uploadFileModal')).hide();
    
    updateStats();
    renderFiles();
  } catch (error) {
    console.error('Error uploading file:', error);
    showNotification('Failed to upload file', 'error');
  }
}

// Delete file
window.deleteFile = async function(fileId) {
  if (!confirm('Are you sure you want to delete this file?')) return;
  
  try {
    if (isDemoMode()) {
      await demoServices.files.delete(fileId);
    } else {
      const deleteResult = await storageService.deleteProjectFile(fileId);
      if (!deleteResult?.success) {
        throw new Error(deleteResult?.error || 'Delete failed');
      }
    }
    
    allFiles = allFiles.filter(f => f.id !== fileId);
    
    updateStats();
    renderFiles();
    showNotification('File deleted', 'success');
  } catch (error) {
    console.error('Error deleting file:', error);
    showNotification('Failed to delete file', 'error');
  }
};

// Open project details from file action button
window.viewFileProject = function(projectId) {
  if (!projectId) return;
  window.location.href = `./project-details.html?id=${projectId}${isDemoMode() ? '&demo=true' : ''}`;
};

// Download file or generate demo placeholder file when URL is unavailable
window.downloadFile = function(fileId) {
  const file = allFiles.find(f => f.id === fileId);
  if (!file) {
    showNotification('File not found', 'error');
    return;
  }

  // Real URL available
  if (file.url && file.url !== '#') {
    window.open(file.url, '_blank', 'noopener,noreferrer');
    return;
  }

  // Demo placeholder download
  const placeholderContent = buildDemoFilePlaceholder(file);
  const blob = new Blob([placeholderContent], { type: 'text/plain;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = objectUrl;
  link.download = file.name || file.file_name || 'sample-file.txt';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);

  showNotification('Sample file downloaded', 'success');
};

// Open share modal for a file
window.openShareFileModal = async function(fileId) {
  const file = allFiles.find(f => f.id === fileId);
  if (!file) {
    showNotification('File not found', 'error');
    return;
  }

  selectedFileForShare = file;

  const fileNameEl = document.getElementById('shareFileName');
  const hiddenIdEl = document.getElementById('shareFileId');
  const emailInput = document.getElementById('shareRecipientEmail');

  if (fileNameEl) fileNameEl.textContent = file.name || file.file_name || 'Unknown file';
  if (hiddenIdEl) hiddenIdEl.value = file.id;
  if (emailInput) emailInput.value = '';

  await populateShareRecipients(file.project_id);

  const modalEl = document.getElementById('shareFileModal');
  if (modalEl && window.bootstrap?.Modal) {
    window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
  }
};

/**
 * Populate team members/recipients for sharing.
 * @param {string} projectId - Project ID
 */
async function populateShareRecipients(projectId) {
  const select = document.getElementById('shareRecipient');
  if (!select) return;

  select.innerHTML = '<option value="">Select member...</option>';

  try {
    let recipients = [];

    if (isDemoMode()) {
      recipients = await demoServices.teamMembers.getByProject(projectId);
    }

    const unique = new Map();
    recipients.forEach(member => {
      const key = member.user_id || member.email;
      if (!key || unique.has(key)) return;
      unique.set(key, member);
    });

    unique.forEach(member => {
      const option = document.createElement('option');
      option.value = member.user_id || member.email;
      option.textContent = `${member.name || member.email}${member.role ? ` (${member.role})` : ''}`;
      option.dataset.email = member.email || '';
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Failed to load share recipients:', error);
    showNotification('Could not load members list', 'error');
  }
}

// Share / transfer submit handler
async function submitShareFile() {
  if (!selectedFileForShare) {
    showNotification('No file selected', 'error');
    return;
  }

  const recipientSelect = document.getElementById('shareRecipient');
  const recipientEmailInput = document.getElementById('shareRecipientEmail');
  const actionType = document.getElementById('shareActionType')?.value || 'share';

  const recipientId = recipientSelect?.value || '';
  const recipientEmail = recipientEmailInput?.value.trim() || '';

  if (!recipientId && !recipientEmail) {
    showNotification('Please choose a member or enter an email', 'error');
    return;
  }

  const recipientLabel = recipientSelect?.selectedOptions?.[0]?.textContent || recipientEmail;

  try {
    // Demo/local state update (UI-level sharing metadata)
    if (actionType === 'transfer') {
      selectedFileForShare.transferred_to = recipientId || recipientEmail;
      selectedFileForShare.uploaded_by = recipientId || selectedFileForShare.uploaded_by;
    } else {
      if (!Array.isArray(selectedFileForShare.shared_with)) {
        selectedFileForShare.shared_with = [];
      }
      const key = recipientId || recipientEmail;
      if (!selectedFileForShare.shared_with.includes(key)) {
        selectedFileForShare.shared_with.push(key);
      }
    }

    showNotification(
      actionType === 'transfer'
        ? `File transferred to ${recipientLabel}`
        : `File shared with ${recipientLabel}`,
      'success'
    );

    const modalEl = document.getElementById('shareFileModal');
    if (modalEl && window.bootstrap?.Modal) {
      window.bootstrap.Modal.getOrCreateInstance(modalEl).hide();
    }

    document.getElementById('shareFileForm')?.reset();
    selectedFileForShare = null;
    renderFiles();
  } catch (error) {
    console.error('Error sharing file:', error);
    showNotification('Failed to share file', 'error');
  }
}

/**
 * Build text placeholder content for demo downloads.
 * @param {Object} file - File metadata
 * @returns {string}
 */
function buildDemoFilePlaceholder(file) {
  return [
    'ProjectHub Demo File',
    '====================',
    `Name: ${file.name || file.file_name || 'Untitled'}`,
    `Project: ${file.project_title || 'Unknown Project'}`,
    `Category: ${file.category || 'other'}`,
    `Type: ${file.file_type || 'unknown'}`,
    `Size: ${formatFileSize(file.size || file.file_size || 0)}`,
    `Created: ${formatDate(file.created_at || file.uploaded_at || new Date().toISOString())}`,
    '',
    'This is a sample placeholder generated in demo mode.',
    'Supported types on this page: PDF, Word, Excel, PowerPoint, JPG, PNG.'
  ].join('\n');
}

// Utility functions
/**
 * Return the Bootstrap icon class + colour class for a given file,
 * detected from the MIME type (or extension fallback).
 */
function getFileIconInfo(file) {
  const mime = (file.file_type || '').toLowerCase();
  const name = (file.file_name || file.name || '').toLowerCase();

  if (mime === 'application/pdf' || name.endsWith('.pdf'))
    return { icon: 'bi-file-earmark-pdf', color: 'text-danger' };

  if (mime.includes('wordprocessingml') || mime.includes('msword') || name.match(/\.docx?$/))
    return { icon: 'bi-file-earmark-word', color: 'text-primary' };

  if (mime.includes('spreadsheetml') || mime.includes('ms-excel') || name.match(/\.xlsx?$/))
    return { icon: 'bi-file-earmark-excel', color: 'text-success' };

  if (mime.includes('presentationml') || mime.includes('ms-powerpoint') || name.match(/\.pptx?$/))
    return { icon: 'bi-file-earmark-ppt', color: 'text-warning' };

  if (mime === 'image/png' || name.endsWith('.png'))
    return { icon: 'bi-file-image', color: 'text-info' };

  if (mime === 'image/jpeg' || name.match(/\.jpe?g$/))
    return { icon: 'bi-file-image', color: 'text-info' };

  if (mime.startsWith('image/'))
    return { icon: 'bi-file-image', color: 'text-info' };

  return { icon: 'bi-file-earmark', color: 'text-secondary' };
}

function renderFileIcon(file) {
  const { icon, color } = getFileIconInfo(file);
  return `<i class="bi ${icon} ${color}" style="font-size: 3rem;"></i>`;
}

function renderFileIconSmall(file) {
  const { icon, color } = getFileIconInfo(file);
  return `<i class="bi ${icon} ${color}"></i>`;
}

function getCategoryColor(category) {
  const colors = {
    'image': 'info',
    'document': 'primary',
    'deliverable': 'success',
    'report': 'warning',
    'other': 'secondary'
  };
  return colors[category] || 'secondary';
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
