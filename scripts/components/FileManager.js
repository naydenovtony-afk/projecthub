/**
 * File Manager Component
 * Handles file display, upload, and management
 */
import { showError, showSuccess, showLoading, hideLoading } from '../../utils/uiModular.js';
import { formatDate, formatFileSize } from '../../utils/helpers.js';
import { isDemoMode, demoServices } from '../../utils/demoMode.js';

export class FileManager {
  constructor(containerId, projectId) {
    this.container = document.getElementById(containerId);
    this.projectId = projectId;
    this.files = [];
    this.viewMode = 'grid'; // 'grid' or 'list'
    this.isDemo = isDemoMode();
    this.filterState = {
      category: '',
      sort: 'newest',
      search: ''
    };
    
    this.initEventListeners();
  }

  initEventListeners() {
    // View toggle buttons
    const gridViewBtn = document.getElementById('gridView');
    const listViewBtn = document.getElementById('listView');
    
    if (gridViewBtn) {
      gridViewBtn.addEventListener('click', () => {
        this.switchView('grid');
      });
    }
    
    if (listViewBtn) {
      listViewBtn.addEventListener('click', () => {
        this.switchView('list');
      });
    }
    
    // Upload button
    const uploadBtn = document.getElementById('uploadFileBtn');
    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => {
        this.showUploadModal();
      });
    }
    
    // Filter controls
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        this.filterState.category = e.target.value;
        this.applyFilters();
      });
    }
    
    const sortSelect = document.getElementById('sortFiles');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.filterState.sort = e.target.value;
        this.applyFilters();
      });
    }
    
    const searchInput = document.getElementById('searchFiles');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterState.search = e.target.value;
        this.applyFilters();
      });
    }
  }

  /**
   * Load and display files
   */
  async loadFiles() {
    try {
      showLoading('Loading files...');
      
      if (this.isDemo) {
        this.files = await demoServices.getProjectFiles(this.projectId);
      } else {
        // Real API call would go here
        // this.files = await fileService.getProjectFiles(this.projectId);
        this.files = [];
      }
      
      this.renderFiles();
      this.updateFileCounts();
      
    } catch (error) {
      console.error('Error loading files:', error);
      showError('Failed to load files');
    } finally {
      hideLoading();
    }
  }

  renderFiles() {
    const filteredFiles = this.getFilteredFiles();
    
    if (this.viewMode === 'grid') {
      this.renderGridView(filteredFiles);
    } else {
      this.renderListView(filteredFiles);
    }
  }

  renderGridView(files) {
    const container = document.getElementById('filesGrid');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (files.length === 0) {
      container.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-folder2-open fs-1 text-muted mb-3 d-block"></i>
          <h5 class="text-muted">No files found</h5>
          <p class="text-muted">Upload files to get started</p>
          <button class="btn btn-primary" onclick="document.getElementById('uploadFileBtn').click()">
            <i class="bi bi-upload"></i> Upload Files
          </button>
        </div>
      `;
      return;
    }
    
    files.forEach(file => {
      const fileCard = this.createFileCard(file);
      container.appendChild(fileCard);
    });
  }

  renderListView(files) {
    const container = document.getElementById('filesTableBody');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (files.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-4 text-muted">
            <i class="bi bi-folder2-open fs-2 d-block mb-2"></i>
            No files found
          </td>
        </tr>
      `;
      return;
    }
    
    files.forEach(file => {
      const fileRow = this.createFileRow(file);
      container.appendChild(fileRow);
    });
  }

  createFileCard(file) {
    const card = document.createElement('div');
    card.className = 'col-md-6 col-lg-4 mb-4';
    
    const fileIcon = this.getFileIcon(file.file_type);
    const fileExtension = file.file_name.split('.').pop().toLowerCase();
    
    card.innerHTML = `
      <div class="card h-100 file-card">
        <div class="card-body">
          <div class="d-flex align-items-center mb-3">
            <div class="file-icon me-3">
              <i class="bi ${fileIcon} fs-1 text-primary"></i>
            </div>
            <div class="flex-grow-1">
              <h6 class="card-title mb-1" title="${file.file_name}">${this.truncateFileName(file.file_name, 20)}</h6>
              <small class="text-muted">${formatFileSize(file.file_size)}</small>
            </div>
            <div class="dropdown">
              <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="dropdown">
                <i class="bi bi-three-dots-vertical"></i>
              </button>
              <ul class="dropdown-menu">
                <li><a class="dropdown-item" href="#" onclick="downloadFile('${file.id}')"><i class="bi bi-download me-2"></i>Download</a></li>
                <li><a class="dropdown-item" href="#" onclick="viewFile('${file.id}')"><i class="bi bi-eye me-2"></i>View</a></li>
                <li><a class="dropdown-item" href="#" onclick="editFileInfo('${file.id}')"><i class="bi bi-pencil me-2"></i>Edit Info</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item text-danger" href="#" onclick="deleteFile('${file.id}')"><i class="bi bi-trash me-2"></i>Delete</a></li>
              </ul>
            </div>
          </div>
          
          ${file.caption ? `<p class="card-text small text-muted">${file.caption}</p>` : ''}
          
          <div class="file-meta">
            <span class="badge bg-secondary me-2">${file.category || 'other'}</span>
            <small class="text-muted">
              <i class="bi bi-calendar3 me-1"></i>
              ${formatDate(file.uploaded_at)}
            </small>
          </div>
        </div>
      </div>
    `;
    
    return card;
  }

  createFileRow(file) {
    const row = document.createElement('tr');
    
    const fileIcon = this.getFileIcon(file.file_type);
    
    row.innerHTML = `
      <td>
        <div class="d-flex align-items-center">
          <i class="bi ${fileIcon} text-primary me-2"></i>
          <div>
            <div class="fw-medium">${file.file_name}</div>
            ${file.caption ? `<small class="text-muted">${file.caption}</small>` : ''}
          </div>
        </div>
      </td>
      <td><span class="badge bg-secondary">${file.category || 'other'}</span></td>
      <td>${formatFileSize(file.file_size)}</td>
      <td>${formatDate(file.uploaded_at)}</td>
      <td>
        <div class="btn-group" role="group">
          <button class="btn btn-sm btn-outline-primary" onclick="downloadFile('${file.id}')" title="Download">
            <i class="bi bi-download"></i>
          </button>
          <button class="btn btn-sm btn-outline-secondary" onclick="viewFile('${file.id}')" title="View">
            <i class="bi bi-eye"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteFile('${file.id}')" title="Delete">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    `;
    
    return row;
  }

  getFileIcon(fileType) {
    if (!fileType) return 'bi-file-earmark';
    
    if (fileType.includes('image')) return 'bi-file-earmark-image';
    if (fileType.includes('pdf')) return 'bi-file-earmark-pdf';
    if (fileType.includes('word') || fileType.includes('document')) return 'bi-file-earmark-word';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'bi-file-earmark-excel';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return 'bi-file-earmark-ppt';
    if (fileType.includes('text')) return 'bi-file-earmark-text';
    if (fileType.includes('zip') || fileType.includes('archive')) return 'bi-file-earmark-zip';
    if (fileType.includes('video')) return 'bi-file-earmark-play';
    if (fileType.includes('audio')) return 'bi-file-earmark-music';
    
    return 'bi-file-earmark';
  }

  truncateFileName(fileName, maxLength) {
    if (fileName.length <= maxLength) return fileName;
    
    const extension = fileName.split('.').pop();
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    const truncated = nameWithoutExt.substring(0, maxLength - extension.length - 3) + '...';
    
    return `${truncated}.${extension}`;
  }

  getFilteredFiles() {
    let filtered = [...this.files];
    
    // Apply category filter
    if (this.filterState.category) {
      filtered = filtered.filter(file => 
        file.category === this.filterState.category
      );
    }
    
    // Apply search filter
    if (this.filterState.search) {
      const searchTerm = this.filterState.search.toLowerCase();
      filtered = filtered.filter(file =>
        file.file_name.toLowerCase().includes(searchTerm) ||
        (file.caption && file.caption.toLowerCase().includes(searchTerm))
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (this.filterState.sort) {
        case 'newest':
          return new Date(b.uploaded_at) - new Date(a.uploaded_at);
        case 'oldest':
          return new Date(a.uploaded_at) - new Date(b.uploaded_at);
        case 'name-asc':
          return a.file_name.localeCompare(b.file_name);
        case 'name-desc':
          return b.file_name.localeCompare(a.file_name);
        case 'size-desc':
          return b.file_size - a.file_size;
        case 'size-asc':
          return a.file_size - b.file_size;
        default:
          return 0;
      }
    });
    
    return filtered;
  }

  switchView(view) {
    this.viewMode = view;
    
    // Update button states
    const gridViewBtn = document.getElementById('gridView');
    const listViewBtn = document.getElementById('listView');
    
    if (gridViewBtn) gridViewBtn.classList.toggle('active', view === 'grid');
    if (listViewBtn) listViewBtn.classList.toggle('active', view === 'list');
    
    // Show/hide views
    const gridContainer = document.getElementById('filesGridContainer');
    const listContainer = document.getElementById('filesListContainer');
    
    if (gridContainer) gridContainer.style.display = view === 'grid' ? 'block' : 'none';
    if (listContainer) listContainer.style.display = view === 'list' ? 'block' : 'none';
    
    this.renderFiles();
  }

  applyFilters() {
    this.renderFiles();
    this.updateFileCounts();
  }

  updateFileCounts() {
    const totalCount = document.getElementById('filesCount');
    if (totalCount) {
      totalCount.textContent = this.files.length;
    }
  }

  showUploadModal() {
    const modal = document.getElementById('uploadFileModal');
    if (modal) {
      const bsModal = new bootstrap.Modal(modal);
      bsModal.show();
    }
  }

  /**
   * Get current files
   * @returns {Array} Current files array
   */
  getFiles() {
    return this.files;
  }
}