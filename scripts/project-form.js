import { checkAuth, getCurrentUser, autoDemoLogin, isDemoSession, logout } from './auth.js';
import { getProjectById, createProject, updateProject } from '../services/projectService.js';
import { uploadFile } from '../services/storageService.js';
import { showLoading, hideLoading, showSuccess, showError, showButtonLoading, hideButtonLoading } from '../utils/ui.js';
import { formatDate } from '../utils/helpers.js';

// ============================================================================
// STATE VARIABLES
// ============================================================================

let isEditMode = false;
let currentProject = null;
let selectedImageFile = null;
let originalFormData = null;

// ============================================================================
// MAIN INITIALIZATION
// ============================================================================

/**
 * Initialize the project form on page load
 * Checks authentication, detects create/edit mode, loads data, sets up listeners
 */
async function initForm() {
    try {
        // Handle demo mode URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('demo') === 'true' && !isDemoSession()) {
            autoDemoLogin();
            // Clean up URL - keep id if editing but remove demo param
            const projectParam = urlParams.get('id') ? `?id=${urlParams.get('id')}` : '';
            window.history.replaceState({}, '', window.location.pathname + projectParam);
        }

        // Show demo banner if in demo session
        showDemoBanner();

        // Check authentication
        const user = await checkAuth();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        // Update navbar with user name
        const userName = user.user_metadata?.full_name || user.email.split('@')[0];
        document.getElementById('userNameNav').textContent = userName;

        // Detect mode and get project ID if editing
        const { mode, projectId } = detectMode();
        isEditMode = mode === 'edit';

        // Load project data if in edit mode
        if (isEditMode && projectId) {
            await loadProjectData(projectId);
        }

        // Setup form UI based on mode
        updatePageForMode();

        // Setup event listeners
        setupEventListeners();

        // Setup form validation
        setupFormValidation();

        // Setup date validation
        setupDateValidation();

        // Setup character counter
        setupCharacterCounter();

        // Store original form data for dirty checking
        originalFormData = getFormData();

        // Setup logout
        document.getElementById('logoutBtn').addEventListener('click', async (e) => {
            e.preventDefault();
            await logout();
        });

    } catch (error) {
        console.error('Error initializing form:', error);
        showError('Failed to initialize form. Please try again.');
    }
}

// ============================================================================
// MODE DETECTION
// ============================================================================

/**
 * Detect whether form is in create or edit mode from URL parameters
 * @returns {Object} Object with mode ('create' or 'edit') and projectId
 */
function detectMode() {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('id');

    return {
        mode: projectId ? 'edit' : 'create',
        projectId: projectId
    };
}

// ============================================================================
// PAGE UPDATES
// ============================================================================

/**
 * Update page title, button text, and breadcrumb based on mode
 */
function updatePageForMode() {
    if (isEditMode) {
        document.getElementById('pageTitle').textContent = 'Edit Project';
        document.getElementById('breadcrumbAction').textContent = 'Edit Project';
        document.getElementById('saveBtnText').textContent = 'Save Changes';
    } else {
        document.getElementById('pageTitle').textContent = 'Create New Project';
        document.getElementById('breadcrumbAction').textContent = 'Create Project';
        document.getElementById('saveBtnText').textContent = 'Create Project';
    }
}

// ============================================================================
// DATA LOADING
// ============================================================================

/**
 * Load existing project data from database for edit mode
 * @param {string} projectId - Project ID to load
 */
async function loadProjectData(projectId) {
    try {
        showLoading('Loading project...');

        const project = await getProjectById(projectId);

        if (!project) {
            showError('Project not found.');
            setTimeout(() => window.location.href = 'projects.html', 2000);
            return;
        }

        // Check if user owns the project
        const currentUser = await getCurrentUser();
        if (project.user_id !== currentUser.id && currentUser.role !== 'admin') {
            showError('You do not have permission to edit this project.');
            setTimeout(() => window.location.href = 'projects.html', 2000);
            return;
        }

        currentProject = project;
        populateForm(project);

        hideLoading();
    } catch (error) {
        console.error('Error loading project:', error);
        hideLoading();
        showError('Failed to load project. Please try again.');
        setTimeout(() => window.location.href = 'projects.html', 2000);
    }
}

/**
 * Populate form fields with existing project data
 * @param {Object} project - Project object from database
 */
function populateForm(project) {
    // Basic information
    document.getElementById('projectTitle').value = project.title || '';
    document.getElementById('projectDescription').value = project.description || '';

    // Classification
    document.getElementById('projectType').value = project.project_type || '';
    document.getElementById('projectStatus').value = project.status || 'planning';

    // Visibility
    if (project.is_public) {
        document.getElementById('visibilityPublic').checked = true;
    } else {
        document.getElementById('visibilityPrivate').checked = true;
    }

    // Timeline
    if (project.start_date) {
        document.getElementById('startDate').value = formatDateForInput(project.start_date);
    }
    if (project.end_date) {
        document.getElementById('endDate').value = formatDateForInput(project.end_date);
    }

    // Budget
    if (project.budget) {
        document.getElementById('budget').value = project.budget;
    }
    document.getElementById('fundingSource').value = project.funding_source || '';

    // Cover image
    if (project.cover_image_url) {
        document.getElementById('currentImage').style.display = 'flex';
    }

    // Update character counter
    updateCharacterCounter();
}

/**
 * Format ISO date string to YYYY-MM-DD format for HTML date input
 * @param {string} isoDate - ISO date string
 * @returns {string} Formatted date string
 */
function formatDateForInput(isoDate) {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    return date.toISOString().split('T')[0];
}

// ============================================================================
// FORM DATA EXTRACTION
// ============================================================================

/**
 * Extract form values and build project data object
 * @returns {Object} Project data object
 */
function getFormData() {
    return {
        title: document.getElementById('projectTitle').value.trim(),
        description: document.getElementById('projectDescription').value.trim(),
        project_type: document.getElementById('projectType').value,
        status: document.getElementById('projectStatus').value,
        is_public: document.getElementById('visibilityPublic').checked,
        start_date: document.getElementById('startDate').value,
        end_date: document.getElementById('endDate').value || null,
        budget: document.getElementById('budget').value ? parseFloat(document.getElementById('budget').value) : null,
        funding_source: document.getElementById('fundingSource').value.trim()
    };
}

// ============================================================================
// FORM SUBMISSION
// ============================================================================

/**
 * Handle form submission
 * @param {Event} event - Form submit event
 */
async function handleFormSubmit(event) {
    event.preventDefault();

    try {
        // Validate form
        if (!validateForm()) {
            return;
        }

        // Show button loading state
        showButtonLoading('saveBtn', isEditMode ? 'Saving Changes...' : 'Creating Project...');

        // Get form data
        const formData = getFormData();

        let coverImageUrl = null;

        // Handle image upload if a new image is selected
        if (selectedImageFile) {
            try {
                const uploadedFile = await uploadFile(selectedImageFile, 'project-covers');
                if (uploadedFile) {
                    coverImageUrl = uploadedFile.publicUrl || uploadedFile.url;
                }
            } catch (error) {
                console.error('Error uploading image:', error);
                hideButtonLoading('saveBtn', isEditMode ? 'Save Changes' : 'Create Project');
                showError('Failed to upload cover image. Please try again.');
                return;
            }
        }

        // Add cover image URL if uploaded
        if (coverImageUrl) {
            formData.cover_image_url = coverImageUrl;
        }

        let result;

        // Save project
        if (isEditMode) {
            // Update existing project
            result = await updateProject(currentProject.id, formData);
        } else {
            // Create new project
            result = await createProject(formData);
        }

        hideButtonLoading('saveBtn', isEditMode ? 'Save Changes' : 'Create Project');

        if (result) {
            showSuccess(isEditMode ? 'Project updated successfully!' : 'Project created successfully!');

            // Redirect after success
            setTimeout(() => {
                if (isEditMode) {
                    window.location.href = `project-details.html?id=${result.id || currentProject.id}`;
                } else {
                    window.location.href = 'projects.html';
                }
            }, 1500);
        } else {
            showError('Failed to save project. Please try again.');
        }

    } catch (error) {
        console.error('Error submitting form:', error);
        hideButtonLoading('saveBtn', isEditMode ? 'Save Changes' : 'Create Project');
        showError(error.message || 'Failed to save project. Please try again.');
    }
}

// ============================================================================
// FORM VALIDATION
// ============================================================================

/**
 * Validate form and mark invalid fields
 * @returns {boolean} True if form is valid
 */
function validateForm() {
    clearValidationErrors();

    const formData = getFormData();
    let isValid = true;

    // Check required fields
    if (!formData.title) {
        showValidationError('projectTitle', 'Please provide a project title');
        isValid = false;
    }

    if (!formData.project_type) {
        showValidationError('projectType', 'Please select a project type');
        isValid = false;
    }

    if (!formData.start_date) {
        showValidationError('startDate', 'Please select a start date');
        isValid = false;
    }

    // Validate date range
    if (formData.start_date && formData.end_date) {
        const startDate = new Date(formData.start_date);
        const endDate = new Date(formData.end_date);

        if (endDate < startDate) {
            showValidationError('endDate', 'End date must be after start date');
            isValid = false;
        }
    }

    // Validate budget if provided
    if (formData.budget !== null && formData.budget < 0) {
        showValidationError('budget', 'Budget must be a positive number');
        isValid = false;
    }

    // Add Bootstrap validation class
    const form = document.getElementById('projectForm');
    if (isValid) {
        form.classList.add('was-validated');
    }

    return isValid;
}

/**
 * Show validation error for a specific field
 * @param {string} fieldId - Field element ID
 * @param {string} message - Error message
 */
function showValidationError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.classList.add('is-invalid');

    // Find and update invalid-feedback element
    const feedback = field.parentElement.querySelector('.invalid-feedback');
    if (feedback) {
        feedback.textContent = message;
        feedback.style.display = 'block';
    }

    // Scroll to field if it's out of view
    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Clear all validation errors from form
 */
function clearValidationErrors() {
    document.querySelectorAll('.is-invalid').forEach(field => {
        field.classList.remove('is-invalid');
    });

    document.querySelectorAll('.invalid-feedback').forEach(feedback => {
        feedback.style.display = 'none';
    });
}

// ============================================================================
// IMAGE HANDLING
// ============================================================================

/**
 * Handle image file selection
 * @param {Event} event - File input change event
 */
function handleImageSelect(event) {
    const file = event.target.files[0];

    if (!file) {
        clearImagePreview();
        return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
        showError('Please select a valid image file (JPG, PNG, WebP, SVG)');
        event.target.value = '';
        return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        showError('Image size must be less than 5MB');
        event.target.value = '';
        return;
    }

    // Store selected file
    selectedImageFile = file;

    // Show preview
    showImagePreview(file);
}

/**
 * Display image preview from file
 * @param {File} file - Image file to preview
 */
function showImagePreview(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
        const previewContainer = document.getElementById('imagePreview');
        const previewImage = document.getElementById('previewImage');

        previewImage.src = e.target.result;
        previewContainer.style.display = 'block';
    };

    reader.readAsDataURL(file);
}

/**
 * Clear image preview and reset file input
 */
function clearImagePreview() {
    selectedImageFile = null;
    document.getElementById('coverImageInput').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('previewImage').src = '';
}

// ============================================================================
// CHARACTER COUNTER
// ============================================================================

/**
 * Update character counter for description textarea
 */
function updateCharacterCounter() {
    const textarea = document.getElementById('projectDescription');
    const counter = document.getElementById('descriptionCount');
    const length = textarea.value.length;
    const maxLength = 2000;

    counter.textContent = length;

    // Change color at 90% capacity
    const counterElement = counter.parentElement;
    if (length > maxLength * 0.9) {
        counterElement.classList.add('error');
        counterElement.classList.remove('warning');
    } else if (length > maxLength * 0.7) {
        counterElement.classList.add('warning');
        counterElement.classList.remove('error');
    } else {
        counterElement.classList.remove('warning', 'error');
    }
}

/**
 * Setup character counter listener
 */
function setupCharacterCounter() {
    const textarea = document.getElementById('projectDescription');
    textarea.addEventListener('input', updateCharacterCounter);
}

// ============================================================================
// DATE VALIDATION
// ============================================================================

/**
 * Validate date range when dates change
 */
function setupDateValidation() {
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');

    const validateDates = () => {
        if (startDate.value && endDate.value) {
            const start = new Date(startDate.value);
            const end = new Date(endDate.value);

            if (end < start) {
                endDate.classList.add('is-invalid');
                const feedback = endDate.parentElement.querySelector('.invalid-feedback');
                if (feedback) feedback.style.display = 'block';
            } else {
                endDate.classList.remove('is-invalid');
                const feedback = endDate.parentElement.querySelector('.invalid-feedback');
                if (feedback) feedback.style.display = 'none';
            }
        }
    };

    startDate.addEventListener('change', validateDates);
    endDate.addEventListener('change', validateDates);
}

// ============================================================================
// NAVIGATION & DIRTY FORM HANDLING
// ============================================================================

/**
 * Check if form has unsaved changes
 * @returns {boolean} True if form is dirty
 */
function checkFormDirty() {
    const currentData = getFormData();

    // Compare with original data
    return JSON.stringify(currentData) !== JSON.stringify(originalFormData) || 
           selectedImageFile !== null;
}

/**
 * Handle cancel button click
 */
function handleCancel() {
    if (checkFormDirty()) {
        if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
            navigateBack();
        }
    } else {
        navigateBack();
    }
}

/**
 * Navigate back to previous page or projects list
 */
function navigateBack() {
    if (isEditMode && currentProject) {
        window.location.href = `project-details.html?id=${currentProject.id}`;
    } else {
        window.location.href = 'projects.html';
    }
}

/**
 * Warn user before leaving if form is dirty
 */
function setupBeforeUnloadWarning() {
    window.addEventListener('beforeunload', (e) => {
        if (checkFormDirty()) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

// ============================================================================
// EVENT LISTENERS SETUP
// ============================================================================

/**
 * Show demo mode indicator banner if in demo session
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
 * Setup all event listeners for form
 */
function setupEventListeners() {
    // Form submission
    document.getElementById('projectForm').addEventListener('submit', handleFormSubmit);

    // Cancel button
    document.getElementById('cancelBtn').addEventListener('click', (e) => {
        e.preventDefault();
        handleCancel();
    });

    // Image input
    document.getElementById('coverImageInput').addEventListener('change', handleImageSelect);

    // Remove image button
    document.getElementById('removeImageBtn').addEventListener('click', (e) => {
        e.preventDefault();
        clearImagePreview();
    });

    // Before unload warning
    setupBeforeUnloadWarning();
}

// ============================================================================
// FORM VALIDATION SETUP
// ============================================================================

/**
 * Setup Bootstrap form validation
 */
function setupFormValidation() {
    const form = document.getElementById('projectForm');

    // Validate on blur for text inputs
    form.querySelectorAll('input[type="text"], input[type="number"], textarea, select').forEach(field => {
        field.addEventListener('blur', function() {
            if (form.classList.contains('was-validated')) {
                // Re-validate on blur if form has been submitted
                validateForm();
            }
        });
    });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', initForm);
