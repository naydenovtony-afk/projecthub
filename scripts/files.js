/**
 * Files Page - Manage all files across projects
 */

import { isDemoMode, demoServices } from '../utils/demoMode.js';
import { checkAuthStatus, getCurrentUser, addDemoParamToLinks } from './auth.js';
import { showNotification } from '../utils/notifications.js';
import { storageService } from '../services/storageService.js';

let allFiles = [];
let allProjects = [];
let currentView = 'grid';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
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
      allProjects = demoServices.projects.getAll();
    } else {
      const user = getCurrentUser();
      allProjects = await storageService.getProjectsList(user.id);
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
      // Get all files from all projects
      const projects = demoServices.projects.getAll();
      allFiles = [];
      
      projects.forEach(project => {
        const projectFiles = demoServices.files.getByProject(project.id);
        projectFiles.forEach(file => {
          allFiles.push({
            ...file,
            project_title: project.title
          });
        });
      });
    } else {
      const user = getCurrentUser();
      allFiles = await storageService.getAllFiles(user.id);
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
  const images = allFiles.filter(f => f.category === 'image').length;
  const documents = allFiles.filter(f => f.category === 'document').length;
  
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
    <div class="col-md-6 col-lg-4 col-xl-3">
      <div class="card h-100">
        <div class="card-body text-center">
          ${renderFileIcon(file)}
          <h6 class="card-title mt-3 mb-2">${escapeHtml(file.name)}</h6>
          <p class="text-muted small mb-2">${escapeHtml(file.project_title)}</p>
          <span class="badge bg-${getCategoryColor(file.category)} mb-2">${file.category}</span>
          <p class="text-muted small">${formatFileSize(file.size)}</p>
        </div>
        <div class="card-footer bg-white border-top-0">
          <div class="d-flex gap-2 justify-content-center">
            ${file.url ? `<a href="${file.url}" target="_blank" class="btn btn-sm btn-outline-primary" title="Download">
              <i class="bi bi-download"></i>
            </a>` : ''}
            <a href="./project-details.html?id=${file.project_id}${isDemoMode() ? '&demo=true' : ''}" class="btn btn-sm btn-outline-secondary" title="View Project">
              <i class="bi bi-folder"></i>
            </a>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteFile('${file.id}')" title="Delete">
              <i class="bi bi-trash"></i>
            </button>
          </div>
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
      <td>
        <div class="d-flex align-items-center">
          ${renderFileIconSmall(file)}
          <span class="ms-2">${escapeHtml(file.name)}</span>
        </div>
      </td>
      <td><span class="badge bg-light text-dark">${escapeHtml(file.project_title)}</span></td>
      <td><span class="badge bg-${getCategoryColor(file.category)}">${file.category}</span></td>
      <td>${formatFileSize(file.size)}</td>
      <td>${formatDate(file.created_at)}</td>
      <td>
        <div class="btn-group btn-group-sm">
          ${file.url ? `<a href="${file.url}" target="_blank" class="btn btn-outline-primary" title="Download">
            <i class="bi bi-download"></i>
          </a>` : ''}
          <a href="./project-details.html?id=${file.project_id}${isDemoMode() ? '&demo=true' : ''}" class="btn btn-outline-secondary" title="View Project">
            <i class="bi bi-folder"></i>
          </a>
          <button class="btn btn-outline-danger" onclick="deleteFile('${file.id}')" title="Delete">
            <i class="bi bi-trash"></i>
          </button>
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
      uploadedFile = demoServices.files.create({
        name: displayName,
        project_id: projectId,
        category: category,
        size: file.size,
        file_type: file.type
      });
      
      const project = allProjects.find(p => p.id === projectId);
      uploadedFile.project_title = project?.title || 'Unknown';
    } else {
      const user = getCurrentUser();
      uploadedFile = await storageService.uploadFile(file, {
        project_id: projectId,
        name: displayName,
        category: category,
        user_id: user.id
      });
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
      demoServices.files.delete(fileId);
    } else {
      await storageService.deleteFile(fileId);
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

// Utility functions
function renderFileIcon(file) {
  const iconMap = {
    'image': '<i class="bi bi-file-image text-info" style="font-size: 3rem;"></i>',
    'document': '<i class="bi bi-file-text text-primary" style="font-size: 3rem;"></i>',
    'deliverable': '<i class="bi bi-file-earmark-check text-success" style="font-size: 3rem;"></i>',
    'report': '<i class="bi bi-file-earmark-bar-graph text-warning" style="font-size: 3rem;"></i>',
    'other': '<i class="bi bi-file-earmark text-secondary" style="font-size: 3rem;"></i>'
  };
  return iconMap[file.category] || iconMap['other'];
}

function renderFileIconSmall(file) {
  const iconMap = {
    'image': '<i class="bi bi-file-image text-info"></i>',
    'document': '<i class="bi bi-file-text text-primary"></i>',
    'deliverable': '<i class="bi bi-file-earmark-check text-success"></i>',
    'report': '<i class="bi bi-file-earmark-bar-graph text-warning"></i>',
    'other': '<i class="bi bi-file-earmark text-secondary"></i>'
  };
  return iconMap[file.category] || iconMap['other'];
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
