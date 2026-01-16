/**
 * Profile page script
 * Handles user profile management, projects, contacts, and activity
 */

import { checkAuth, getCurrentUser, logout, autoDemoLogin, isDemoSession } from './auth.js';
import { getAllProjects, deleteProject } from '../services/projectService.js';
import { getTasksByProject } from '../services/taskService.js';
import { formatDate, getRelativeTime, getStatusBadgeClass, getTypeBadgeClass } from '../utils/helpers.js';
import supabase from '../services/supabase.js';

// State
let currentUser = null;
let allProjects = [];
let allContacts = [];
let activityData = [];
let selectedProjectForShare = null;
let selectedAvatarFile = null;

/**
 * Initialize profile page
 */
async function initProfile() {
  try {
    // Handle demo mode URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('demo') === 'true' && !isDemoSession()) {
      autoDemoLogin();
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Show demo banner if in demo session
    showDemoBanner();

    // Check authentication
    currentUser = await checkAuth();
    if (!currentUser) {
      return;
    }

    // Update navbar
    updateNavbar(currentUser);

    // Load profile data
    await loadProfileData();

    // Setup event listeners
    setupEventListeners();

    // Load initial tab content
    await loadAccountInfo();
  } catch (error) {
    console.error('Profile initialization error:', error);
    showToast('Error', 'Failed to load profile', 'error');
  }
}

/**
 * Show demo mode banner
 */
function showDemoBanner() {
  try {
    if (isDemoSession()) {
      const demoBanner = document.getElementById('demoBanner');
      if (demoBanner) {
        demoBanner.style.display = 'block';
      }
    }
  } catch (error) {
    console.error('Show demo banner error:', error);
  }
}

/**
 * Update navbar with user info
 */
function updateNavbar(user) {
  const fullName = user.user_metadata?.full_name || user.email || 'User';
  const initials = fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const userAvatarNav = document.getElementById('userAvatarNav');
  const userNameNav = document.getElementById('userNameNav');

  if (userAvatarNav) {
    userAvatarNav.textContent = initials;
  }
  if (userNameNav) {
    userNameNav.textContent = fullName;
  }
}

/**
 * Load profile data
 */
async function loadProfileData() {
  try {
    // Get user profile from Supabase
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Update profile header
    const fullName = profile?.full_name || currentUser.user_metadata?.full_name || currentUser.email;
    const role = profile?.role || 'user';
    const bio = profile?.bio || 'Welcome to my profile';
    const createdAt = new Date(currentUser.created_at || profile?.created_at);

    document.getElementById('profileName').textContent = fullName;
    document.getElementById('userRoleBadge').textContent = role.charAt(0).toUpperCase() + role.slice(1);
    document.getElementById('userBio').textContent = bio;
    document.getElementById('memberSince').textContent = formatDate(createdAt, 'MMM yyyy');

    // Update avatars
    const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    document.getElementById('profileAvatarText').textContent = initials;
    document.getElementById('avatarPreviewText').textContent = initials;

    // Store profile data
    currentUser.profile = profile;
  } catch (error) {
    console.error('Load profile data error:', error);
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await logout();
    });
  }

  // Tab change listeners
  const tabs = document.querySelectorAll('[data-bs-toggle="tab"]');
  tabs.forEach(tab => {
    tab.addEventListener('shown.bs.tab', handleTabChange);
  });

  // Profile form
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', handleProfileSave);
  }

  // Bio character count
  const bioTextarea = document.getElementById('bio');
  if (bioTextarea) {
    bioTextarea.addEventListener('input', updateBioCharCount);
  }

  // Cancel edit button
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => loadAccountInfo());
  }

  // Password change
  const savePasswordBtn = document.getElementById('savePasswordBtn');
  if (savePasswordBtn) {
    savePasswordBtn.addEventListener('click', handlePasswordChange);
  }

  // Password strength indicator
  const newPasswordInput = document.getElementById('newPassword');
  if (newPasswordInput) {
    newPasswordInput.addEventListener('input', updatePasswordStrength);
  }

  // Avatar upload
  setupAvatarUpload();

  // Remove avatar
  const removeAvatarBtn = document.getElementById('removeAvatarBtn');
  if (removeAvatarBtn) {
    removeAvatarBtn.addEventListener('click', handleRemoveAvatar);
  }

  // Project filters
  const projectFilters = document.querySelectorAll('input[name="projectFilter"]');
  projectFilters.forEach(filter => {
    filter.addEventListener('change', filterProjects);
  });

  // Contact search
  const searchContacts = document.getElementById('searchContacts');
  if (searchContacts) {
    searchContacts.addEventListener('input', handleContactSearch);
  }

  // Contact filters
  const contactFilters = document.querySelectorAll('input[name="contactFilter"]');
  contactFilters.forEach(filter => {
    filter.addEventListener('change', filterContacts);
  });

  // Add contact button
  const addContactBtn = document.getElementById('addContactBtn');
  if (addContactBtn) {
    addContactBtn.addEventListener('click', handleAddContact);
  }

  // Activity filters
  const activityPeriod = document.getElementById('activityPeriod');
  const activityType = document.getElementById('activityType');
  if (activityPeriod) {
    activityPeriod.addEventListener('change', loadActivity);
  }
  if (activityType) {
    activityType.addEventListener('change', loadActivity);
  }

  // Load more activity
  const loadMoreActivity = document.getElementById('loadMoreActivity');
  if (loadMoreActivity) {
    loadMoreActivity.addEventListener('click', () => loadActivity(true));
  }

  // Share project modal
  const generateShareLink = document.getElementById('generateShareLink');
  if (generateShareLink) {
    generateShareLink.addEventListener('change', handleGenerateShareLink);
  }

  const copyShareLink = document.getElementById('copyShareLink');
  if (copyShareLink) {
    copyShareLink.addEventListener('click', handleCopyShareLink);
  }

  const shareProjectBtn = document.getElementById('shareProjectBtn');
  if (shareProjectBtn) {
    shareProjectBtn.addEventListener('click', handleShareProject);
  }
}

/**
 * Handle tab change
 */
async function handleTabChange(event) {
  const tabId = event.target.getAttribute('data-bs-target');

  switch (tabId) {
    case '#account':
      await loadAccountInfo();
      break;
    case '#projects':
      await loadProjects();
      break;
    case '#contacts':
      await loadContacts();
      break;
    case '#activity':
      await loadActivity();
      break;
  }
}

/**
 * Load account info tab
 */
async function loadAccountInfo() {
  try {
    const profile = currentUser.profile || {};

    // Populate form
    document.getElementById('fullName').value = profile.full_name || currentUser.user_metadata?.full_name || '';
    document.getElementById('email').value = currentUser.email || '';
    document.getElementById('company').value = profile.company || '';
    document.getElementById('jobTitle').value = profile.job_title || '';
    document.getElementById('bio').value = profile.bio || '';
    document.getElementById('phone').value = profile.phone || '';
    document.getElementById('location').value = profile.location || '';

    updateBioCharCount();

    // Update security info
    document.getElementById('lastLogin').textContent = formatDate(new Date());
    document.getElementById('accountCreated').textContent = formatDate(new Date(currentUser.created_at));

    // Load stats
    await loadProfileStats();
  } catch (error) {
    console.error('Load account info error:', error);
  }
}

/**
 * Load profile stats
 */
async function loadProfileStats() {
  try {
    const projects = await getAllProjects(currentUser.id);
    allProjects = projects;

    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;

    // Load tasks for all projects
    let totalTasks = 0;
    let completedTasks = 0;

    for (const project of projects) {
      const tasks = await getTasksByProject(project.id);
      totalTasks += tasks.length;
      completedTasks += tasks.filter(t => t.status === 'done').length;
    }

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Update stats
    document.getElementById('statTotalProjects').textContent = totalProjects;
    document.getElementById('statActiveProjects').textContent = activeProjects;
    document.getElementById('statCompletedProjects').textContent = completedProjects;
    document.getElementById('statTotalTasks').textContent = totalTasks;
    document.getElementById('statCompletedTasks').textContent = completedTasks;
    document.getElementById('statCompletionRate').textContent = `${completionRate}%`;
  } catch (error) {
    console.error('Load profile stats error:', error);
  }
}

/**
 * Update bio character count
 */
function updateBioCharCount() {
  const bioTextarea = document.getElementById('bio');
  const charCount = document.getElementById('bioCharCount');
  if (bioTextarea && charCount) {
    charCount.textContent = bioTextarea.value.length;
  }
}

/**
 * Handle profile save
 */
async function handleProfileSave(e) {
  e.preventDefault();

  try {
    const formData = {
      full_name: document.getElementById('fullName').value,
      company: document.getElementById('company').value,
      job_title: document.getElementById('jobTitle').value,
      bio: document.getElementById('bio').value,
      phone: document.getElementById('phone').value,
      location: document.getElementById('location').value
    };

    // Update profile in Supabase
    const { error } = await supabase
      .from('profiles')
      .update(formData)
      .eq('id', currentUser.id);

    if (error) throw error;

    // Update local state
    currentUser.profile = { ...currentUser.profile, ...formData };

    // Update UI
    document.getElementById('profileName').textContent = formData.full_name;
    document.getElementById('userBio').textContent = formData.bio || 'Welcome to my profile';
    updateNavbar({ ...currentUser, user_metadata: { full_name: formData.full_name } });

    showToast('Success', 'Profile updated successfully', 'success');
  } catch (error) {
    console.error('Save profile error:', error);
    showToast('Error', 'Failed to update profile', 'error');
  }
}

/**
 * Update password strength indicator
 */
function updatePasswordStrength() {
  const password = document.getElementById('newPassword').value;
  const strengthBar = document.getElementById('passwordStrength');
  const strengthText = document.getElementById('strengthText');

  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (/[a-z]/.test(password)) strength += 25;
  if (/[A-Z]/.test(password)) strength += 25;
  if (/[0-9]/.test(password)) strength += 25;

  strengthBar.style.width = `${strength}%`;
  
  if (strength <= 25) {
    strengthBar.className = 'progress-bar bg-danger';
    strengthText.textContent = 'Weak';
  } else if (strength <= 50) {
    strengthBar.className = 'progress-bar bg-warning';
    strengthText.textContent = 'Fair';
  } else if (strength <= 75) {
    strengthBar.className = 'progress-bar bg-info';
    strengthText.textContent = 'Good';
  } else {
    strengthBar.className = 'progress-bar bg-success';
    strengthText.textContent = 'Strong';
  }
}

/**
 * Handle password change
 */
async function handlePasswordChange() {
  try {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Error', 'Please fill in all fields', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Error', 'Passwords do not match', 'error');
      return;
    }

    if (newPassword.length < 8) {
      showToast('Error', 'Password must be at least 8 characters', 'error');
      return;
    }

    // Update password in Supabase
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;

    // Close modal and reset form
    const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
    modal.hide();
    document.getElementById('changePasswordForm').reset();

    showToast('Success', 'Password changed successfully', 'success');
  } catch (error) {
    console.error('Change password error:', error);
    showToast('Error', 'Failed to change password', 'error');
  }
}

/**
 * Setup avatar upload
 */
function setupAvatarUpload() {
  const uploadArea = document.getElementById('avatarUploadArea');
  const fileInput = document.getElementById('avatarFileInput');
  const uploadBtn = document.getElementById('uploadAvatarBtn');

  if (!uploadArea || !fileInput || !uploadBtn) return;

  // Drag and drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    handleAvatarFile(file);
  });

  // File input
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    handleAvatarFile(file);
  });

  // Upload button
  uploadBtn.addEventListener('click', handleAvatarUpload);
}

/**
 * Handle avatar file selection
 */
function handleAvatarFile(file) {
  if (!file) return;

  // Validate file
  if (!file.type.match('image/jpeg') && !file.type.match('image/png')) {
    showToast('Error', 'Please upload a JPG or PNG image', 'error');
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    showToast('Error', 'Image size must be less than 2MB', 'error');
    return;
  }

  selectedAvatarFile = file;

  // Show preview
  const reader = new FileReader();
  reader.onload = (e) => {
    const previewImg = document.getElementById('avatarPreviewImg');
    const previewContainer = document.getElementById('avatarPreviewContainer');
    
    previewImg.src = e.target.result;
    previewContainer.style.display = 'block';
    
    document.getElementById('uploadAvatarBtn').disabled = false;
  };
  reader.readAsDataURL(file);
}

/**
 * Handle avatar upload
 */
async function handleAvatarUpload() {
  if (!selectedAvatarFile) return;

  try {
    // Upload to Supabase Storage
    const fileName = `${currentUser.id}_${Date.now()}.${selectedAvatarFile.name.split('.').pop()}`;
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, selectedAvatarFile);

    if (error) throw error;

    // Update profile with avatar URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', currentUser.id);

    // Update UI
    // For now, just show success (full implementation would update avatar images)
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('avatarModal'));
    modal.hide();

    showToast('Success', 'Avatar uploaded successfully', 'success');
  } catch (error) {
    console.error('Upload avatar error:', error);
    showToast('Error', 'Failed to upload avatar', 'error');
  }
}

/**
 * Handle remove avatar
 */
async function handleRemoveAvatar() {
  try {
    // Update profile to remove avatar
    await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', currentUser.id);

    showToast('Success', 'Avatar removed successfully', 'success');
  } catch (error) {
    console.error('Remove avatar error:', error);
    showToast('Error', 'Failed to remove avatar', 'error');
  }
}

/**
 * Load projects tab
 */
async function loadProjects() {
  try {
    const projects = await getAllProjects(currentUser.id);
    allProjects = projects;

    document.getElementById('projectsCount').textContent = projects.length;
    document.getElementById('myProjectsCount').textContent = projects.length;

    renderProjects(projects);
  } catch (error) {
    console.error('Load projects error:', error);
    showToast('Error', 'Failed to load projects', 'error');
  }
}

/**
 * Render projects grid
 */
function renderProjects(projects) {
  const grid = document.getElementById('projectsGrid');
  const emptyState = document.getElementById('projectsEmptyState');

  if (projects.length === 0) {
    grid.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  grid.innerHTML = projects.map(project => `
    <div class="col-md-6 col-lg-4">
      <div class="card project-card shadow-sm">
        <div class="project-card-cover"></div>
        <div class="card-body">
          <h5 class="card-title mb-2">
            <a href="project-details.html?id=${project.id}" class="text-decoration-none text-dark">
              ${project.title}
            </a>
          </h5>
          <div class="mb-2">
            <span class="badge ${getTypeBadgeClass(project.project_type)}">${project.project_type}</span>
            <span class="badge ${getStatusBadgeClass(project.status)}">${project.status}</span>
          </div>
          <div class="progress mb-2" style="height: 8px;">
            <div class="progress-bar" role="progressbar" style="width: ${project.progress_percentage || 0}%"></div>
          </div>
          <p class="card-text text-muted small">${project.description?.substring(0, 100) || ''}...</p>
          <div class="d-flex justify-content-between align-items-center">
            <small class="text-muted">
              <i class="bi bi-list-task me-1"></i> Tasks • <i class="bi bi-paperclip me-1"></i> Files
            </small>
            <div class="dropdown">
              <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                <i class="bi bi-three-dots-vertical"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li><a class="dropdown-item" href="project-details.html?id=${project.id}"><i class="bi bi-eye me-2"></i> View Details</a></li>
                <li><a class="dropdown-item" href="project-form.html?id=${project.id}"><i class="bi bi-pencil me-2"></i> Edit Project</a></li>
                <li><a class="dropdown-item" href="#" onclick="window.openShareModal('${project.id}', '${project.title}')"><i class="bi bi-share me-2"></i> Share Project</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item text-danger" href="#" onclick="window.deleteProject('${project.id}')"><i class="bi bi-trash me-2"></i> Delete</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

/**
 * Filter projects
 */
function filterProjects() {
  const activeFilter = document.querySelector('input[name="projectFilter"]:checked').id;
  
  let filtered = allProjects;
  
  if (activeFilter === 'filterActive') {
    filtered = allProjects.filter(p => p.status === 'active');
  } else if (activeFilter === 'filterCompleted') {
    filtered = allProjects.filter(p => p.status === 'completed');
  } else if (activeFilter === 'filterArchived') {
    filtered = allProjects.filter(p => p.status === 'archived');
  }
  
  renderProjects(filtered);
}

/**
 * Open share modal
 */
window.openShareModal = function(projectId, projectTitle) {
  selectedProjectForShare = projectId;
  document.getElementById('shareProjectName').textContent = projectTitle;
  
  const modal = new bootstrap.Modal(document.getElementById('shareProjectModal'));
  modal.show();
};

/**
 * Delete project
 */
window.deleteProject = async function(projectId) {
  if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
    return;
  }

  try {
    await deleteProject(projectId);
    showToast('Success', 'Project deleted successfully', 'success');
    await loadProjects();
  } catch (error) {
    console.error('Delete project error:', error);
    showToast('Error', 'Failed to delete project', 'error');
  }
};

/**
 * Handle generate share link
 */
function handleGenerateShareLink() {
  const isChecked = document.getElementById('generateShareLink').checked;
  const linkContainer = document.getElementById('shareLinkContainer');
  const linkInput = document.getElementById('shareLink');

  if (isChecked) {
    const shareUrl = `${window.location.origin}/pages/project-details.html?id=${selectedProjectForShare}&share=true`;
    linkInput.value = shareUrl;
    linkContainer.style.display = 'block';
  } else {
    linkContainer.style.display = 'none';
  }
}

/**
 * Handle copy share link
 */
function handleCopyShareLink() {
  const linkInput = document.getElementById('shareLink');
  linkInput.select();
  document.execCommand('copy');
  showToast('Success', 'Link copied to clipboard', 'success');
}

/**
 * Handle share project
 */
function handleShareProject() {
  // This would integrate with actual sharing functionality
  showToast('Success', 'Project shared successfully', 'success');
  
  const modal = bootstrap.Modal.getInstance(document.getElementById('shareProjectModal'));
  modal.hide();
}

/**
 * Load contacts tab
 */
async function loadContacts() {
  // Demo contacts data
  allContacts = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      company: 'Tech Corp',
      projects: 3,
      lastCollaboration: new Date('2026-01-10')
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      company: 'Design Studio',
      projects: 2,
      lastCollaboration: new Date('2026-01-14')
    }
  ];

  document.getElementById('contactsCount').textContent = allContacts.length;
  renderContacts(allContacts);
}

/**
 * Render contacts grid
 */
function renderContacts(contacts) {
  const grid = document.getElementById('contactsGrid');
  const emptyState = document.getElementById('contactsEmptyState');

  if (contacts.length === 0) {
    grid.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  grid.innerHTML = contacts.map(contact => {
    const initials = contact.name.split(' ').map(n => n[0]).join('').toUpperCase();
    
    return `
      <div class="col-md-6 col-lg-4">
        <div class="card contact-card shadow-sm">
          <div class="card-body">
            <div class="d-flex align-items-start">
              <div class="contact-avatar me-3">${initials}</div>
              <div class="flex-grow-1">
                <h6 class="mb-1">${contact.name}</h6>
                <p class="text-muted small mb-1">${contact.email}</p>
                <p class="text-muted small mb-2">${contact.company || 'No company'}</p>
                <div class="small text-muted">
                  <i class="bi bi-folder me-1"></i> ${contact.projects} projects together
                  <br>
                  <i class="bi bi-clock me-1"></i> ${getRelativeTime(contact.lastCollaboration)}
                </div>
                <div class="mt-2">
                  <button class="btn btn-sm btn-outline-primary me-1" disabled>
                    <i class="bi bi-chat-dots"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-warning">
                    <i class="bi bi-star"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger" onclick="window.removeContact('${contact.id}')">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Handle contact search
 */
function handleContactSearch(e) {
  const query = e.target.value.toLowerCase();
  const filtered = allContacts.filter(contact => 
    contact.name.toLowerCase().includes(query) ||
    contact.email.toLowerCase().includes(query)
  );
  renderContacts(filtered);
}

/**
 * Filter contacts
 */
function filterContacts() {
  // Implement contact filtering logic
  renderContacts(allContacts);
}

/**
 * Handle add contact
 */
function handleAddContact() {
  const email = document.getElementById('contactEmail').value;
  const name = document.getElementById('contactName').value;

  if (!email) {
    showToast('Error', 'Please enter an email address', 'error');
    return;
  }

  // This would integrate with actual contact functionality
  showToast('Success', 'Contact invitation sent', 'success');
  
  const modal = bootstrap.Modal.getInstance(document.getElementById('addContactModal'));
  modal.hide();
  
  document.getElementById('contactEmail').value = '';
  document.getElementById('contactName').value = '';
}

/**
 * Remove contact
 */
window.removeContact = function(contactId) {
  if (!confirm('Remove this contact?')) return;
  
  allContacts = allContacts.filter(c => c.id !== contactId);
  renderContacts(allContacts);
  showToast('Success', 'Contact removed', 'success');
};

/**
 * Load activity tab
 */
async function loadActivity(append = false) {
  // Demo activity data
  const activities = [
    {
      type: 'project',
      icon: 'folder-plus',
      text: 'Created project "Corporate Website Redesign"',
      timestamp: new Date('2026-01-15T10:30:00'),
      link: 'project-details.html?id=1'
    },
    {
      type: 'task',
      icon: 'check-circle',
      text: 'Completed task "Create wireframes"',
      timestamp: new Date('2026-01-14T15:20:00'),
      link: 'project-details.html?id=1'
    },
    {
      type: 'file',
      icon: 'file-earmark-arrow-up',
      text: 'Uploaded file "Design Mockup v2.pdf"',
      timestamp: new Date('2026-01-13T09:15:00'),
      link: 'project-details.html?id=1'
    }
  ];

  const timeline = document.getElementById('activityTimeline');
  const emptyState = document.getElementById('activityEmptyState');

  if (activities.length === 0) {
    timeline.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  timeline.innerHTML = activities.map(activity => `
    <div class="activity-item">
      <div class="activity-icon">
        <i class="bi bi-${activity.icon}"></i>
      </div>
      <div>
        <p class="mb-1">${activity.text}</p>
        <small class="text-muted">${getRelativeTime(activity.timestamp)}</small>
      </div>
    </div>
  `).join('');
}

/**
 * Show toast notification
 */
function showToast(title, message, type = 'success') {
  const toast = document.getElementById('messageToast');
  const toastTitle = document.getElementById('toastTitle');
  const toastMessage = document.getElementById('toastMessage');
  const toastIcon = document.getElementById('toastIcon');

  toastTitle.textContent = title;
  toastMessage.textContent = message;

  if (type === 'error') {
    toastIcon.className = 'bi bi-x-circle-fill text-danger me-2';
  } else {
    toastIcon.className = 'bi bi-check-circle-fill text-success me-2';
  }

  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initProfile);
