# Component Patterns

## 🤖 Instructions for AI Agents

**Before generating code:**
1. ✅ Read this entire document
2. ✅ Check existing code for patterns
3. ✅ Follow ALL rules and conventions
4. ✅ Ask if anything is unclear

**When making changes:**
- Follow the established patterns exactly
- Don't deviate without explicit permission
- Update related documentation
- Test on multiple devices/browsers

**Remember:**
- Consistency > Cleverness
- Readable > Compact
- Documented > Assumed

---

## 📄 Page Template

### Standard Page Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Page description for SEO">
  <title>Page Title - ProjectHub</title>
  
  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="/public/favicon.svg">
  <link rel="apple-touch-icon" href="/public/apple-touch-icon.png">
  
  <!-- Bootstrap CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  
  <!-- Bootstrap Icons -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
  
  <!-- Custom CSS -->
  <link rel="stylesheet" href="/styles/main.css">
  <link rel="stylesheet" href="/styles/themes.css">
</head>
<body>
  <!-- Skip Link for Accessibility -->
  <a href="#main-content" class="skip-link">Skip to main content</a>
  
  <!-- Navigation -->
  <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
    <!-- Navbar content -->
  </nav>
  
  <!-- Main Content -->
  <main id="main-content" class="container py-4">
    <h1>Page Heading</h1>
    <!-- Page content -->
  </main>
  
  <!-- Footer (optional) -->
  <footer class="bg-light py-4 mt-5">
    <div class="container text-center text-secondary">
      <p class="mb-0">&copy; 2026 ProjectHub. All rights reserved.</p>
    </div>
  </footer>
  
  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  
  <!-- Page Script -->
  <script type="module" src="/scripts/pageName.js"></script>
</body>
</html>
```

## 🧩 Navigation Component

### Navbar (Authenticated Users)
```html
<nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
  <div class="container-fluid">
    <!-- Logo -->
    <a class="navbar-brand d-flex align-items-center" href="/pages/dashboard.html">
      <i class="bi bi-kanban fs-4 text-primary me-2"></i>
      <span class="fw-bold">ProjectHub</span>
    </a>
    
    <!-- Mobile Toggle -->
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" 
            data-bs-target="#navbarNav" aria-controls="navbarNav" 
            aria-expanded="false" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon"></span>
    </button>
    
    <!-- Nav Items -->
    <div class="collapse navbar-collapse" id="navbarNav">
      <ul class="navbar-nav me-auto">
        <li class="nav-item">
          <a class="nav-link" href="/pages/dashboard.html">
            <i class="bi bi-grid me-1"></i> Dashboard
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="/pages/projects.html">
            <i class="bi bi-folder me-1"></i> Projects
          </a>
        </li>
      </ul>
      
      <!-- Right Side -->
      <div class="d-flex align-items-center gap-3">
        <!-- Theme Toggle -->
        <button id="themeToggle" class="btn btn-sm btn-outline-secondary" 
                aria-label="Toggle dark mode">
          <i class="bi bi-moon"></i>
        </button>
        
        <!-- User Dropdown -->
        <div class="dropdown">
          <button class="btn btn-sm btn-outline-primary dropdown-toggle" 
                  type="button" id="userDropdown" 
                  data-bs-toggle="dropdown" aria-expanded="false">
            <i class="bi bi-person-circle me-1"></i>
            <span id="userNameDisplay">User</span>
          </button>
          <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
            <li><a class="dropdown-item" href="/pages/profile.html">
              <i class="bi bi-person me-2"></i> Profile
            </a></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item" href="#" id="logoutBtn">
              <i class="bi bi-box-arrow-right me-2"></i> Logout
            </a></li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</nav>
```

## 🎴 Card Components

### Project Card
```html
<div class="card project-card h-100">
  <div class="card-body">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-start mb-3">
      <h5 class="card-title mb-0">
        <a href="/pages/project-details.html?id=PROJECT_ID" 
           class="text-decoration-none text-dark">
          Project Title
        </a>
      </h5>
      <span class="badge bg-success">Active</span>
    </div>
    
    <!-- Description -->
    <p class="card-text text-secondary small mb-3">
      Brief project description goes here...
    </p>
    
    <!-- Meta Info -->
    <div class="d-flex gap-3 text-muted small mb-3">
      <span><i class="bi bi-list-task me-1"></i> 12 Tasks</span>
      <span><i class="bi bi-people me-1"></i> 3 Members</span>
    </div>
    
    <!-- Progress Bar -->
    <div class="mb-3">
      <div class="d-flex justify-content-between align-items-center mb-1">
        <small class="text-muted">Progress</small>
        <small class="fw-semibold">65%</small>
      </div>
      <div class="progress" style="height: 6px;">
        <div class="progress-bar bg-primary" role="progressbar" 
             style="width: 65%" aria-valuenow="65" 
             aria-valuemin="0" aria-valuemax="100"></div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="d-flex justify-content-between align-items-center">
      <small class="text-muted">Updated 2 hours ago</small>
      <div class="btn-group">
        <button class="btn btn-sm btn-outline-primary" 
                data-action="edit" data-id="PROJECT_ID">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" 
                data-action="delete" data-id="PROJECT_ID">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    </div>
  </div>
</div>
```

### Task Card
```html
<div class="card task-card mb-2">
  <div class="card-body p-3">
    <div class="d-flex align-items-center">
      <!-- Checkbox -->
      <div class="form-check me-3">
        <input class="form-check-input" type="checkbox" 
               id="task-123" data-task-id="123">
      </div>
      
      <!-- Task Info -->
      <div class="flex-grow-1">
        <label class="form-check-label mb-0" for="task-123">
          <span class="fw-medium">Task title</span>
        </label>
        <div class="text-muted small">
          <i class="bi bi-calendar me-1"></i>
          Due: Jan 30, 2026
        </div>
      </div>
      
      <!-- Priority Badge -->
      <span class="badge bg-danger me-2">High</span>
      
      <!-- Actions -->
      <div class="btn-group">
        <button class="btn btn-sm btn-outline-secondary" 
                data-action="edit" data-id="123">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" 
                data-action="delete" data-id="123">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    </div>
  </div>
</div>
```

## 📋 Form Components

### Create/Edit Form
```html
<form id="projectForm" class="needs-validation" novalidate>
  <!-- Title -->
  <div class="mb-3">
    <label for="title" class="form-label">
      Project Title <span class="text-danger">*</span>
    </label>
    <input type="text" class="form-control" id="title" 
           name="title" required 
           placeholder="Enter project title"
           aria-describedby="titleHelp">
    <div class="form-text" id="titleHelp">
      Choose a clear, descriptive name
    </div>
    <div class="invalid-feedback">
      Please provide a project title
    </div>
  </div>
  
  <!-- Description -->
  <div class="mb-3">
    <label for="description" class="form-label">Description</label>
    <textarea class="form-control" id="description" 
              name="description" rows="4"
              placeholder="Describe your project..."></textarea>
  </div>
  
  <!-- Type -->
  <div class="mb-3">
    <label for="type" class="form-label">
      Project Type <span class="text-danger">*</span>
    </label>
    <select class="form-select" id="type" name="type" required>
      <option value="">Choose type...</option>
      <option value="academic">Academic & Research</option>
      <option value="corporate">Corporate/Business</option>
      <option value="eu-funded">EU-Funded Project</option>
      <option value="public">Public Initiative</option>
      <option value="personal">Personal/Other</option>
    </select>
    <div class="invalid-feedback">
      Please select a project type
    </div>
  </div>
  
  <!-- Status -->
  <div class="mb-3">
    <label for="status" class="form-label">Status</label>
    <select class="form-select" id="status" name="status">
      <option value="planning">Planning</option>
      <option value="active" selected>Active</option>
      <option value="completed">Completed</option>
      <option value="paused">Paused</option>
      <option value="archived">Archived</option>
    </select>
  </div>
  
  <!-- Dates -->
  <div class="row mb-3">
    <div class="col-md-6">
      <label for="startDate" class="form-label">Start Date</label>
      <input type="date" class="form-control" id="startDate" name="start_date">
    </div>
    <div class="col-md-6">
      <label for="endDate" class="form-label">End Date</label>
      <input type="date" class="form-control" id="endDate" name="end_date">
    </div>
  </div>
  
  <!-- Submit Buttons -->
  <div class="d-flex gap-2">
    <button type="submit" class="btn btn-primary" id="submitBtn">
      <i class="bi bi-check-lg me-2"></i>
      Save Project
    </button>
    <a href="/pages/projects.html" class="btn btn-outline-secondary">
      Cancel
    </a>
  </div>
</form>
```

## 🔔 Modal Components

### Confirmation Modal
```html
<div class="modal fade" id="confirmModal" tabindex="-1" 
     aria-labelledby="confirmModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="confirmModalLabel">Confirm Action</h5>
        <button type="button" class="btn-close" 
                data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <p id="confirmMessage">Are you sure you want to proceed?</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" 
                data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-danger" 
                id="confirmAction">Confirm</button>
      </div>
    </div>
  </div>
</div>
```

### Form Modal
```html
<div class="modal fade" id="taskModal" tabindex="-1" 
     aria-labelledby="taskModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="taskModalLabel">Add Task</h5>
        <button type="button" class="btn-close" 
                data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <form id="taskForm">
          <div class="mb-3">
            <label for="taskTitle" class="form-label">Task Title</label>
            <input type="text" class="form-control" 
                   id="taskTitle" required>
          </div>
          <div class="mb-3">
            <label for="taskDescription" class="form-label">Description</label>
            <textarea class="form-control" id="taskDescription" rows="3"></textarea>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" 
                data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-primary" id="saveTask">
          Save Task
        </button>
      </div>
    </div>
  </div>
</div>
```

## 📊 Data Display Components

### Stats Card
```html
<div class="col-md-3 mb-4">
  <div class="card text-center h-100">
    <div class="card-body">
      <div class="stat-icon text-primary mb-2">
        <i class="bi bi-folder-fill fs-1"></i>
      </div>
      <h3 class="stat-number mb-1" id="totalProjects">0</h3>
      <p class="text-muted mb-0">Total Projects</p>
    </div>
  </div>
</div>
```

### Table Component
```html
<div class="table-responsive">
  <table class="table table-hover">
    <thead>
      <tr>
        <th>Project</th>
        <th>Status</th>
        <th>Progress</th>
        <th>Due Date</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody id="projectsTable">
      <tr>
        <td>
          <a href="/pages/project-details.html?id=123" 
             class="text-decoration-none">
            Project Title
          </a>
        </td>
        <td><span class="badge bg-success">Active</span></td>
        <td>
          <div class="progress" style="height: 6px; width: 100px;">
            <div class="progress-bar bg-primary" 
                 style="width: 65%"></div>
          </div>
        </td>
        <td>Jan 30, 2026</td>
        <td>
          <div class="btn-group">
            <button class="btn btn-sm btn-outline-primary">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

### Empty State
```html
<div class="empty-state text-center py-5">
  <div class="empty-icon text-muted mb-3">
    <i class="bi bi-inbox fs-1"></i>
  </div>
  <h3 class="h5 mb-2">No projects yet</h3>
  <p class="text-secondary mb-4">
    Get started by creating your first project
  </p>
  <a href="/pages/project-form.html" class="btn btn-primary">
    <i class="bi bi-plus-lg me-2"></i>
    Create Project
  </a>
</div>
```

## 🔍 Search Component

### Search Bar
```html
<div class="search-container mb-4">
  <div class="input-group">
    <span class="input-group-text bg-white">
      <i class="bi bi-search"></i>
    </span>
    <input type="search" class="form-control" 
           id="searchInput" placeholder="Search projects..."
           aria-label="Search projects">
  </div>
</div>
```

## 🎨 Loading States

### Skeleton Loader
```html
<div class="card skeleton-loader">
  <div class="card-body">
    <div class="skeleton skeleton-title mb-3"></div>
    <div class="skeleton skeleton-text mb-2"></div>
    <div class="skeleton skeleton-text" style="width: 80%;"></div>
  </div>
</div>
```

```css
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 4px;
}

.skeleton-title {
  height: 24px;
  width: 60%;
}

.skeleton-text {
  height: 16px;
  width: 100%;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Spinner
```html
<div class="text-center py-5">
  <div class="spinner-border text-primary" role="status">
    <span class="visually-hidden">Loading...</span>
  </div>
  <p class="mt-3 text-muted">Loading projects...</p>
</div>
```

## 📱 Breadcrumbs
```html
<nav aria-label="breadcrumb" class="mb-4">
  <ol class="breadcrumb">
    <li class="breadcrumb-item">
      <a href="/pages/dashboard.html">Dashboard</a>
    </li>
    <li class="breadcrumb-item">
      <a href="/pages/projects.html">Projects</a>
    </li>
    <li class="breadcrumb-item active" aria-current="page">
      Project Details
    </li>
  </ol>
</nav>
```

## 🔧 JavaScript Patterns

### Page Initialization
```javascript
import { supabase } from '../services/supabase.js';
import { showError, showSuccess } from '../utils/notifications.js';
import { getCurrentUser } from './auth.js';

/**
 * Initialize page
 */
async function initPage() {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      window.location.href = '/pages/login.html';
      return;
    }
    
    // Load data
    await loadData();
    
    // Setup event listeners
    setupEventListeners();
    
  } catch (error) {
    console.error('Init failed:', error);
    showError('Failed to load page');
  }
}

/**
 * Load page data
 */
async function loadData() {
  // Implementation
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Implementation
}

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}
```

### Event Delegation
```javascript
// Delegate events to parent container
document.getElementById('projectList').addEventListener('click', (e) => {
  const action = e.target.closest('[data-action]')?.dataset.action;
  const id = e.target.closest('[data-id]')?.dataset.id;
  
  if (!action || !id) return;
  
  switch (action) {
    case 'edit':
      editProject(id);
      break;
    case 'delete':
      deleteProject(id);
      break;
  }
});
```

---

**Remember**: Copy these patterns exactly. Consistency across the app is crucial for maintainability!
