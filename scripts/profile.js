/**
 * Profile Page Module
 * Handles user profile management, project sharing, contacts, and activity tracking
 */

import { getCurrentUser, updateProfile, changePassword } from './auth.js';
import { isDemoMode, demoServices, DEMO_CONTACTS, DEMO_PROJECT_SHARES } from '../utils/demoMode.js';
import { showSuccess, showError, showLoading, hideLoading, confirm as showConfirm } from '../utils/ui.js';
import { formatDate, getRelativeTime } from '../utils/helpers.js';
import { supabase } from '../services/supabase.js';
import { getProjects, updateProject, deleteProject, getProjectById } from '../services/projectService.js';
import { getTasks } from '../services/taskService.js';

// ==================== STATE VARIABLES ====================

let currentUser = null;
let isEditMode = false;
let selectedProjectToShare = null;
let userContacts = [];
let userActivity = [];
let userProjects = [];

// ==================== MAIN FUNCTIONS ====================

/**
 * Initialize profile page
 * Checks authentication, loads user data, and sets up event listeners
 */
async function initProfilePage() {
  try {
    // Check if user is authenticated
    currentUser = await getCurrentUser();
    
    if (!currentUser) {
      window.location.href = 'login.html';
      return;
    }

    // Load all profile data
    await loadProfileData();
    await loadProfileStats();
    await setupTabListeners();
    setupEventListeners();

    // Show demo banner if in demo mode
    if (isDemoMode()) {
      showDemoBanner();
    }
  } catch (error) {
    console.error('Error initializing profile:', error);
    showError('Failed to load profile. Please refresh the page.');
  }
}

/**
 * Display demo mode banner
 */
function showDemoBanner() {
  const banner = document.getElementById('demoBanner');
  if (banner) {
    banner.style.display = 'block';
  }
}

/**
 * Load user profile data
 * Populates form with user information and avatar
 */
async function loadProfileData() {
  try {
    showLoading();

    // Get user data
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    currentUser = user;

    // Populate form fields
    document.getElementById('fullName').value = user.full_name || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('company').value = user.company || '';
    document.getElementById('jobTitle').value = user.job_title || '';
    document.getElementById('bio').value = user.bio || '';
    document.getElementById('phone').value = user.phone || '';
    document.getElementById('location').value = user.location || '';

    // Disable email field
    document.getElementById('email').disabled = true;

    // Display avatar
    displayAvatar(user);

    // Display member since date
    const memberSinceElement = document.getElementById('memberSince');
    if (memberSinceElement && user.created_at) {
      memberSinceElement.textContent = `Member since ${formatDate(new Date(user.created_at))}`;
    }

    // Display last login
    const lastLoginElement = document.getElementById('lastLogin');
    if (lastLoginElement && user.last_login) {
      lastLoginElement.textContent = `Last login: ${getRelativeTime(new Date(user.last_login))}`;
    }

    hideLoading();
  } catch (error) {
    console.error('Error loading profile data:', error);
    showError('Failed to load profile information');
    hideLoading();
  }
}

/**
 * Load and display user profile statistics
 */
async function loadProfileStats() {
  try {
    let projects = [];
    let tasks = [];

    if (isDemoMode()) {
      // Get demo data
      projects = await demoServices.projects.getAll(currentUser.id);
      tasks = await demoServices.tasks.getAll(currentUser.id);
      userContacts = await demoServices.contacts.getAll(currentUser.id);
    } else {
      // Get real data from Supabase
      const projectsData = await getProjects();
      projects = projectsData || [];
      
      const tasksData = await getTasks();
      tasks = tasksData || [];

      // Get contacts
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', currentUser.id);
      
      if (error) throw error;
      userContacts = data || [];
    }

    // Calculate statistics
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const totalCollaborators = userContacts.length;

    // Update UI
    document.getElementById('totalProjects').textContent = totalProjects;
    document.getElementById('activeProjects').textContent = activeProjects;
    document.getElementById('completedProjects').textContent = completedProjects;
    document.getElementById('totalTasks').textContent = totalTasks;
    document.getElementById('completedTasks').textContent = completedTasks;
    document.getElementById('completionRate').textContent = `${completionRate}%`;
    document.getElementById('totalCollaborators').textContent = totalCollaborators;

    // Update progress bar
    const progressBar = document.getElementById('completionProgressBar');
    if (progressBar) {
      progressBar.style.width = `${completionRate}%`;
    }
  } catch (error) {
    console.error('Error loading profile stats:', error);
    // Set defaults on error
    document.getElementById('totalProjects').textContent = '0';
    document.getElementById('activeProjects').textContent = '0';
    document.getElementById('completedProjects').textContent = '0';
    document.getElementById('totalTasks').textContent = '0';
    document.getElementById('completedTasks').textContent = '0';
    document.getElementById('completionRate').textContent = '0%';
    document.getElementById('totalCollaborators').textContent = '0';
  }
}

/**
 * Toggle between view and edit mode
 */
function toggleEditMode() {
  isEditMode = !isEditMode;

  const formInputs = document.querySelectorAll('#profileForm input:not(#email), #profileForm textarea');
  const editBtn = document.getElementById('editProfileBtn');
  const saveBtn = document.getElementById('saveProfileBtn');
  const cancelBtn = document.getElementById('cancelEditBtn');

  if (isEditMode) {
    // Enable inputs
    formInputs.forEach(input => input.disabled = false);
    editBtn.style.display = 'none';
    saveBtn.style.display = 'inline-block';
    cancelBtn.style.display = 'inline-block';
  } else {
    // Disable inputs
    formInputs.forEach(input => input.disabled = true);
    editBtn.style.display = 'inline-block';
    saveBtn.style.display = 'none';
    cancelBtn.style.display = 'none';
  }
}

/**
 * Handle profile form submission
 */
async function handleProfileUpdate(event) {
  event.preventDefault();

  try {
    // Get form data
    const formData = {
      full_name: document.getElementById('fullName').value.trim(),
      company: document.getElementById('company').value.trim(),
      job_title: document.getElementById('jobTitle').value.trim(),
      bio: document.getElementById('bio').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      location: document.getElementById('location').value.trim()
    };

    // Validate
    const validation = validateProfileForm(formData);
    if (!validation.valid) {
      showError(validation.errors.join(', '));
      return;
    }

    showLoading();

    if (isDemoMode()) {
      // Update demo user
      await demoServices.auth.updateProfile(currentUser.id, formData);
    } else {
      // Update real profile
      await updateProfile(formData);
    }

    showSuccess('Profile updated successfully!');
    isEditMode = false;
    await loadProfileData();
    toggleEditMode();
    hideLoading();
  } catch (error) {
    console.error('Error updating profile:', error);
    showError('Failed to update profile. Please try again.');
    hideLoading();
  }
}

/**
 * Load user projects
 */
async function loadUserProjects() {
  try {
    showLoading();

    if (isDemoMode()) {
      userProjects = await demoServices.projects.getAll(currentUser.id);
    } else {
      const data = await getProjects();
      userProjects = data || [];
    }

    renderProjects(userProjects);
    hideLoading();
  } catch (error) {
    console.error('Error loading projects:', error);
    showError('Failed to load projects');
    hideLoading();
  }
}

/**
 * Render projects grid
 */
function renderProjects(projects) {
  const container = document.getElementById('projectsGrid');
  if (!container) return;

  if (projects.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-inbox fs-1 text-muted"></i>
        <p class="text-muted mt-3">No projects yet. <a href="project-form.html">Create one</a></p>
      </div>
    `;
    return;
  }

  container.innerHTML = projects.map(project => renderProjectCard(project)).join('');

  // Add event listeners to share buttons
  document.querySelectorAll('.share-project-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showShareModal(btn.dataset.projectId);
    });
  });

  // Add event listeners to delete buttons
  document.querySelectorAll('.delete-project-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      handleDeleteProject(btn.dataset.projectId);
    });
  });
}

/**
 * Render individual project card
 */
function renderProjectCard(project) {
  const statusColors = {
    planning: 'warning',
    active: 'success',
    completed: 'info',
    paused: 'secondary',
    archived: 'dark'
  };

  const statusColor = statusColors[project.status] || 'secondary';
  const coverImage = project.cover_image_url || 'https://via.placeholder.com/300x150?text=' + encodeURIComponent(project.name);

  return `
    <div class="col-md-6 col-lg-4 mb-4">
      <div class="card h-100 shadow-sm hover-shadow">
        <div class="card-img-top position-relative" style="background-image: url('${coverImage}'); background-size: cover; background-position: center; height: 150px;">
          <span class="badge bg-${statusColor} position-absolute top-2 end-2">${project.status}</span>
        </div>
        <div class="card-body">
          <h5 class="card-title">${project.name}</h5>
          <p class="card-text small text-muted">${project.description || 'No description'}</p>
          
          <div class="mb-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <small class="text-muted">Progress</small>
              <small class="fw-bold">${project.progress || 0}%</small>
            </div>
            <div class="progress" style="height: 6px;">
              <div class="progress-bar" style="width: ${project.progress || 0}%"></div>
            </div>
          </div>

          <div class="mb-3 d-flex justify-content-between align-items-center">
            <small class="text-muted">
              <i class="bi bi-people"></i> ${project.team_members || 1} members
            </small>
            <small class="text-muted">
              <i class="bi bi-calendar"></i> Due ${formatDate(new Date(project.end_date))}
            </small>
          </div>
        </div>
        <div class="card-footer bg-light border-top-0 d-flex gap-2">
          <a href="project-details.html?id=${project.id}" class="btn btn-sm btn-outline-primary flex-grow-1">
            <i class="bi bi-eye"></i> View
          </a>
          <button class="btn btn-sm btn-outline-secondary share-project-btn" data-project-id="${project.id}">
            <i class="bi bi-share"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger delete-project-btn" data-project-id="${project.id}">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Show project share modal
 */
async function showShareModal(projectId) {
  try {
    selectedProjectToShare = projectId;
    
    let project;
    if (isDemoMode()) {
      project = await demoServices.projects.getById(projectId);
    } else {
      project = await getProjectById(projectId);
    }

    if (!project) {
      showError('Project not found');
      return;
    }

    // Set project name in modal
    document.getElementById('shareProjectName').textContent = project.name;

    // Load contacts for sharing
    await loadContactsForShare();

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('shareProjectModal'));
    modal.show();
  } catch (error) {
    console.error('Error showing share modal:', error);
    showError('Failed to open share dialog');
  }
}

/**
 * Load contacts for share modal
 */
async function loadContactsForShare() {
  try {
    if (isDemoMode()) {
      userContacts = await demoServices.contacts.getAll(currentUser.id);
    } else {
      // Get contacts from Supabase
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', currentUser.id);
      
      if (error) throw error;
      userContacts = data || [];
    }

    // Get existing shares for this project
    let existingShares = [];
    if (isDemoMode()) {
      existingShares = DEMO_PROJECT_SHARES.filter(s => s.project_id === selectedProjectToShare);
    } else {
      const { data, error } = await supabase
        .from('project_shares')
        .select('*')
        .eq('project_id', selectedProjectToShare);
      
      if (error) throw error;
      existingShares = data || [];
    }

    // Render contacts in modal
    const contactsList = document.getElementById('shareContactsList');
    contactsList.innerHTML = userContacts.map(contact => {
      const isShared = existingShares.some(s => s.shared_with_contact_id === contact.id);
      const share = existingShares.find(s => s.shared_with_contact_id === contact.id);
      
      return `
        <div class="form-check mb-3 p-3 border rounded">
          <input class="form-check-input" type="checkbox" id="contact-${contact.id}" 
                 data-contact-id="${contact.id}" ${isShared ? 'checked' : ''}>
          <label class="form-check-label ms-2" for="contact-${contact.id}">
            <div class="fw-bold">${contact.name}</div>
            <small class="text-muted">${contact.email}</small>
            ${isShared ? `<br><small class="badge bg-info">Already shared (${share.permission_level})</small>` : ''}
          </label>
        </div>
      `;
    }).join('');

    if (userContacts.length === 0) {
      contactsList.innerHTML = '<p class="text-muted">No contacts yet. <button type="button" class="btn btn-sm btn-link">Add one</button></p>';
    }
  } catch (error) {
    console.error('Error loading contacts for share:', error);
    showError('Failed to load contacts');
  }
}

/**
 * Handle project sharing
 */
async function handleShareProject() {
  try {
    const selectedContacts = Array.from(
      document.querySelectorAll('#shareContactsList input[type="checkbox"]:checked')
    ).map(cb => cb.dataset.contactId);

    if (selectedContacts.length === 0) {
      showError('Please select at least one contact');
      return;
    }

    const permissionLevel = document.getElementById('permissionLevel').value || 'viewer';

    showLoading();

    for (const contactId of selectedContacts) {
      if (isDemoMode()) {
        await demoServices.projects.shareProject(selectedProjectToShare, contactId, permissionLevel);
      } else {
        const { error } = await supabase
          .from('project_shares')
          .insert({
            project_id: selectedProjectToShare,
            shared_with_contact_id: contactId,
            permission_level: permissionLevel,
            shared_by: currentUser.id,
            shared_at: new Date().toISOString()
          });
        
        if (error) throw error;
      }
    }

    showSuccess(`Project shared with ${selectedContacts.length} contact(s)!`);
    
    // Close modal
    bootstrap.Modal.getInstance(document.getElementById('shareProjectModal')).hide();
    
    hideLoading();
  } catch (error) {
    console.error('Error sharing project:', error);
    showError('Failed to share project');
    hideLoading();
  }
}

/**
 * Load user contacts
 */
async function loadContacts() {
  try {
    showLoading();

    if (isDemoMode()) {
      userContacts = await demoServices.contacts.getAll(currentUser.id);
    } else {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('is_favorite', { ascending: false });
      
      if (error) throw error;
      userContacts = data || [];
    }

    renderContacts(userContacts);
    hideLoading();
  } catch (error) {
    console.error('Error loading contacts:', error);
    showError('Failed to load contacts');
    hideLoading();
  }
}

/**
 * Render contacts grid
 */
function renderContacts(contacts) {
  const container = document.getElementById('contactsGrid');
  if (!container) return;

  if (contacts.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-person-plus fs-1 text-muted"></i>
        <p class="text-muted mt-3">No contacts yet. <button type="button" class="btn btn-sm btn-primary" data-bs-toggle="modal" data-bs-target="#addContactModal">Add one</button></p>
      </div>
    `;
    return;
  }

  container.innerHTML = contacts.map(contact => renderContactCard(contact)).join('');

  // Add event listeners
  document.querySelectorAll('.remove-contact-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      handleRemoveContact(btn.dataset.contactId);
    });
  });

  document.querySelectorAll('.toggle-favorite-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      handleToggleFavorite(btn.dataset.contactId);
    });
  });
}

/**
 * Render individual contact card
 */
function renderContactCard(contact) {
  const initials = getInitials(contact.name);
  const lastCollab = contact.last_collaboration 
    ? getRelativeTime(new Date(contact.last_collaboration))
    : 'Never';

  return `
    <div class="col-md-6 col-lg-4 mb-4">
      <div class="card h-100 shadow-sm">
        <div class="card-body text-center">
          <div class="mb-3">
            <div class="avatar-circle mx-auto mb-2" style="width: 60px; height: 60px; background: #e9ecef; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #495057;">
              ${initials}
            </div>
          </div>
          
          <h5 class="card-title">${contact.name}</h5>
          <p class="card-text small text-muted mb-1">${contact.email}</p>
          <p class="card-text small text-muted mb-3">${contact.company || 'No company'}</p>
          
          ${contact.job_title ? `<p class="small text-secondary mb-2">${contact.job_title}</p>` : ''}
          
          <div class="mb-3 d-flex justify-content-center gap-2">
            <span class="badge bg-light text-dark">
              <i class="bi bi-folder"></i> ${contact.projects_together?.length || 0} projects
            </span>
          </div>

          <small class="text-muted d-block mb-3">
            Last collaboration: ${lastCollab}
          </small>
        </div>
        <div class="card-footer bg-light border-top-0 d-flex gap-2">
          <button class="btn btn-sm btn-outline-warning toggle-favorite-btn flex-grow-1" data-contact-id="${contact.id}">
            <i class="bi bi-star${contact.is_favorite ? '-fill' : ''}"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger remove-contact-btn" data-contact-id="${contact.id}">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Handle add contact
 */
async function handleAddContact(event) {
  event.preventDefault();

  try {
    const name = document.getElementById('addContactName').value.trim();
    const email = document.getElementById('addContactEmail').value.trim();

    if (!name || !email) {
      showError('Please fill in all fields');
      return;
    }

    // Validate email
    if (!validateEmail(email)) {
      showError('Please enter a valid email address');
      return;
    }

    // Check if contact already exists
    const exists = userContacts.some(c => c.email === email);
    if (exists) {
      showError('This contact already exists');
      return;
    }

    showLoading();

    const contactData = {
      user_id: currentUser.id,
      name,
      email,
      company: document.getElementById('addContactCompany').value.trim() || null,
      job_title: document.getElementById('addContactJobTitle').value.trim() || null,
      is_favorite: false,
      projects_together: [],
      added_at: new Date().toISOString()
    };

    if (isDemoMode()) {
      await demoServices.contacts.add(contactData);
    } else {
      const { error } = await supabase
        .from('contacts')
        .insert(contactData);
      
      if (error) throw error;
    }

    showSuccess('Contact added successfully!');
    
    // Clear form
    document.getElementById('addContactForm').reset();
    
    // Close modal
    bootstrap.Modal.getInstance(document.getElementById('addContactModal')).hide();
    
    // Reload contacts
    await loadContacts();
    
    hideLoading();
  } catch (error) {
    console.error('Error adding contact:', error);
    showError('Failed to add contact');
    hideLoading();
  }
}

/**
 * Handle remove contact
 */
async function handleRemoveContact(contactId) {
  try {
    const contact = userContacts.find(c => c.id === contactId);
    if (!contact) return;

    const confirmed = await showConfirm(
      `Remove "${contact.name}" from your contacts? This won't affect shared projects.`
    );

    if (!confirmed) return;

    showLoading();

    if (isDemoMode()) {
      await demoServices.contacts.delete(contactId);
    } else {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);
      
      if (error) throw error;
    }

    showSuccess('Contact removed');
    await loadContacts();
    hideLoading();
  } catch (error) {
    console.error('Error removing contact:', error);
    showError('Failed to remove contact');
    hideLoading();
  }
}

/**
 * Toggle contact as favorite
 */
async function handleToggleFavorite(contactId) {
  try {
    showLoading();

    if (isDemoMode()) {
      await demoServices.contacts.toggleFavorite(contactId);
    } else {
      const contact = userContacts.find(c => c.id === contactId);
      if (contact) {
        const { error } = await supabase
          .from('contacts')
          .update({ is_favorite: !contact.is_favorite })
          .eq('id', contactId);
        
        if (error) throw error;
      }
    }

    await loadContacts();
    hideLoading();
  } catch (error) {
    console.error('Error toggling favorite:', error);
    hideLoading();
  }
}

/**
 * Load user activity
 */
async function loadActivity(filters = {}) {
  try {
    showLoading();

    if (isDemoMode()) {
      userActivity = await demoServices.activity.getByUser(currentUser.id, filters);
    } else {
      let query = supabase
        .from('activity')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (filters.type && filters.type !== 'all') {
        query = query.eq('activity_type', filters.type);
      }

      if (filters.days) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - filters.days);
        query = query.gte('created_at', cutoff.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      userActivity = data || [];
    }

    renderActivity(userActivity);
    hideLoading();
  } catch (error) {
    console.error('Error loading activity:', error);
    showError('Failed to load activity');
    hideLoading();
  }
}

/**
 * Render activity timeline
 */
function renderActivity(activities) {
  const container = document.getElementById('activityTimeline');
  if (!container) return;

  if (activities.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-clock-history fs-1 text-muted"></i>
        <p class="text-muted mt-3">No activity yet</p>
      </div>
    `;
    return;
  }

  container.innerHTML = activities.map(activity => renderActivityItem(activity)).join('');
}

/**
 * Render individual activity item
 */
function renderActivityItem(activity) {
  const iconMap = {
    project_created: { icon: 'folder-plus', color: 'primary' },
    task_completed: { icon: 'check-circle', color: 'success' },
    file_uploaded: { icon: 'file-earmark-arrow-up', color: 'info' },
    contact_added: { icon: 'person-plus', color: 'secondary' },
    project_shared: { icon: 'share', color: 'warning' },
    task_status_changed: { icon: 'arrow-repeat', color: 'info' },
    project_updated: { icon: 'pencil-square', color: 'primary' }
  };

  const activityIcon = iconMap[activity.activity_type] || { icon: 'dot', color: 'secondary' };
  const timestamp = getRelativeTime(new Date(activity.created_at));

  return `
    <div class="d-flex gap-3 mb-4">
      <div class="flex-shrink-0">
        <div class="avatar-circle" style="width: 40px; height: 40px; background: #e3f2fd; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
          <i class="bi bi-${activityIcon.icon} text-${activityIcon.color}"></i>
        </div>
      </div>
      <div class="flex-grow-1">
        <p class="mb-1">${activity.activity_text}</p>
        <small class="text-muted">${timestamp}</small>
      </div>
    </div>
  `;
}

/**
 * Display user avatar
 */
function displayAvatar(user) {
  const avatarContainer = document.getElementById('avatarDisplay');
  if (!avatarContainer) return;

  if (user.avatar_url) {
    avatarContainer.innerHTML = `<img src="${user.avatar_url}" alt="Avatar" class="img-fluid rounded-circle" style="width: 120px; height: 120px; object-fit: cover;">`;
  } else {
    const initials = getInitials(user.full_name || user.email);
    avatarContainer.innerHTML = `
      <div class="rounded-circle d-flex align-items-center justify-content-center" 
           style="width: 120px; height: 120px; background: #e9ecef; font-size: 48px; font-weight: bold; color: #495057;">
        ${initials}
      </div>
    `;
  }
}

/**
 * Handle avatar upload
 */
async function handleAvatarUpload(event) {
  const files = event.target.files;
  if (!files.length) return;

  const file = files[0];

  // Validate file type
  if (!file.type.startsWith('image/')) {
    showError('Please select an image file');
    return;
  }

  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    showError('Image must be smaller than 2MB');
    return;
  }

  // Show preview
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('avatarPreview').innerHTML = 
      `<img src="${e.target.result}" alt="Preview" style="max-width: 100%; max-height: 300px;">`;
  };
  reader.readAsDataURL(file);

  // Show upload modal
  const modal = new bootstrap.Modal(document.getElementById('avatarUploadModal'));
  modal.show();

  // Store file for upload
  window.pendingAvatarFile = file;
}

/**
 * Confirm avatar upload
 */
async function confirmAvatarUpload() {
  if (!window.pendingAvatarFile) return;

  try {
    showLoading();

    let avatarUrl = null;

    if (!isDemoMode()) {
      // Upload to Supabase
      const fileName = `avatars/${currentUser.id}-${Date.now()}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, window.pendingAvatarFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      avatarUrl = data.publicUrl;

      // Update profile with avatar URL
      await updateProfile({ avatar_url: avatarUrl });
    }

    showSuccess('Avatar updated successfully!');
    
    // Close modal
    bootstrap.Modal.getInstance(document.getElementById('avatarUploadModal')).hide();
    
    // Reload profile
    currentUser.avatar_url = avatarUrl;
    displayAvatar(currentUser);
    
    // Clear file
    window.pendingAvatarFile = null;
    document.getElementById('avatarUpload').value = '';
    
    hideLoading();
  } catch (error) {
    console.error('Error uploading avatar:', error);
    showError('Failed to upload avatar');
    hideLoading();
  }
}

/**
 * Handle remove avatar
 */
async function handleRemoveAvatar() {
  try {
    const confirmed = await showConfirm('Remove your avatar?');
    if (!confirmed) return;

    showLoading();

    if (!isDemoMode()) {
      await updateProfile({ avatar_url: null });
    }

    currentUser.avatar_url = null;
    displayAvatar(currentUser);
    showSuccess('Avatar removed successfully');
    hideLoading();
  } catch (error) {
    console.error('Error removing avatar:', error);
    showError('Failed to remove avatar');
    hideLoading();
  }
}

/**
 * Show change password modal
 */
function showChangePasswordModal() {
  const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
  modal.show();
}

/**
 * Handle password change
 */
async function handleChangePassword(event) {
  event.preventDefault();

  try {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showError('Please fill in all fields');
      return;
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      showError(passwordValidation.message);
      return;
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      showError('New passwords do not match');
      return;
    }

    showLoading();

    if (isDemoMode()) {
      // Demo mode: just show success
      showSuccess('Password changed successfully!');
    } else {
      // Real mode: change password in Supabase
      await changePassword(newPassword);
      showSuccess('Password changed successfully!');
    }

    // Close modal
    bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();
    
    // Clear form
    document.getElementById('changePasswordForm').reset();
    
    hideLoading();
  } catch (error) {
    console.error('Error changing password:', error);
    showError('Failed to change password');
    hideLoading();
  }
}

/**
 * Handle project deletion
 */
async function handleDeleteProject(projectId) {
  try {
    const project = userProjects.find(p => p.id === projectId);
    if (!project) return;

    const confirmed = await showConfirm(
      `Are you sure you want to delete "${project.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    showLoading();

    if (isDemoMode()) {
      await demoServices.projects.delete(projectId);
    } else {
      await deleteProject(projectId);
    }

    showSuccess('Project deleted');
    await loadUserProjects();
    hideLoading();
  } catch (error) {
    console.error('Error deleting project:', error);
    showError('Failed to delete project');
    hideLoading();
  }
}

/**
 * Setup tab navigation with lazy loading
 */
async function setupTabListeners() {
  const tabButtons = document.querySelectorAll('button[data-bs-toggle="tab"]');

  tabButtons.forEach(button => {
    button.addEventListener('shown.bs.tab', async (event) => {
      const targetTab = event.target.getAttribute('data-bs-target');

      if (targetTab === '#myProjects') {
        await loadUserProjects();
      } else if (targetTab === '#contacts') {
        await loadContacts();
      } else if (targetTab === '#activity') {
        await loadActivity();
      }
    });
  });
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Profile edit
  document.getElementById('editProfileBtn')?.addEventListener('click', toggleEditMode);
  document.getElementById('saveProfileBtn')?.addEventListener('click', handleProfileUpdate);
  document.getElementById('cancelEditBtn')?.addEventListener('click', () => {
    isEditMode = false;
    toggleEditMode();
    loadProfileData();
  });

  // Avatar
  document.getElementById('avatarUpload')?.addEventListener('change', handleAvatarUpload);
  document.getElementById('confirmAvatarUploadBtn')?.addEventListener('click', confirmAvatarUpload);
  document.getElementById('removeAvatarBtn')?.addEventListener('click', handleRemoveAvatar);

  // Password
  document.getElementById('changePasswordBtn')?.addEventListener('click', showChangePasswordModal);
  document.getElementById('changePasswordForm')?.addEventListener('submit', handleChangePassword);

  // Share project
  document.getElementById('shareProjectForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleShareProject();
  });

  // Add contact
  document.getElementById('addContactForm')?.addEventListener('submit', handleAddContact);

  // Contacts search
  document.getElementById('contactsSearch')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = userContacts.filter(c => 
      c.name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query)
    );
    renderContacts(filtered);
  });

  // Activity filters
  document.getElementById('activityTypeFilter')?.addEventListener('change', () => {
    const type = document.getElementById('activityTypeFilter').value;
    const days = document.getElementById('activityDaysFilter').value;
    loadActivity({ type, days: days ? parseInt(days) : null });
  });

  document.getElementById('activityDaysFilter')?.addEventListener('change', () => {
    const type = document.getElementById('activityTypeFilter').value;
    const days = document.getElementById('activityDaysFilter').value;
    loadActivity({ type, days: days ? parseInt(days) : null });
  });

  // Project filters
  document.querySelectorAll('.filter-projects-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      filterProjects(filter);
    });
  });
}

/**
 * Filter projects by status
 */
function filterProjects(filterType) {
  let filtered = userProjects;
  
  if (filterType === 'active') {
    filtered = userProjects.filter(p => p.status === 'active');
  } else if (filterType === 'completed') {
    filtered = userProjects.filter(p => p.status === 'completed');
  } else if (filterType === 'archived') {
    filtered = userProjects.filter(p => p.status === 'archived');
  }
  
  renderProjects(filtered);
}

/**
 * Search contacts by query
 */
function searchContacts(query) {
  const filtered = userContacts.filter(c => 
    c.name.toLowerCase().includes(query.toLowerCase()) || 
    c.email.toLowerCase().includes(query.toLowerCase())
  );
  renderContacts(filtered);
}

// ==================== VALIDATION FUNCTIONS ====================

/**
 * Validate profile form
 */
function validateProfileForm(formData) {
  const errors = [];

  if (!formData.full_name || formData.full_name.length < 2) {
    errors.push('Full name is required and must be at least 2 characters');
  }

  if (formData.bio && formData.bio.length > 500) {
    errors.push('Bio must be 500 characters or less');
  }

  if (formData.phone && !validatePhone(formData.phone)) {
    errors.push('Phone number format is invalid');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate password requirements
 */
function validatePassword(password) {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password)
  };

  const allMet = Object.values(requirements).every(v => v);

  if (!allMet) {
    const missing = [];
    if (!requirements.length) missing.push('8+ characters');
    if (!requirements.uppercase) missing.push('uppercase letter');
    if (!requirements.lowercase) missing.push('lowercase letter');
    if (!requirements.number) missing.push('number');

    return {
      valid: false,
      message: `Password must contain: ${missing.join(', ')}`
    };
  }

  return { valid: true, message: '' };
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Get initials from name
 */
function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Validate email format
 */
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validate phone format
 */
function validatePhone(phone) {
  const re = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
  return re.test(phone.replace(/\s/g, ''));
}

/**
 * Generate shareable link for project
 */
function generateShareLink(projectId) {
  return `${window.location.origin}/project-details.html?id=${projectId}&share=true`;
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', initProfilePage);
