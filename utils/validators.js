// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate project data before saving
 * @param {Object} data - Project data to validate
 * @returns {Object} Validation result with valid flag and errors array
 */
export function validateProjectData(data) {
    const errors = [];

    // Title validation
    if (!data.title || data.title.trim().length === 0) {
        errors.push({ field: 'title', message: 'Project title is required' });
    } else if (data.title.length > 200) {
        errors.push({ field: 'title', message: 'Project title must be 200 characters or less' });
    }

    // Description validation
    if (data.description && data.description.length > 2000) {
        errors.push({ field: 'description', message: 'Description must be 2000 characters or less' });
    }

    // Project type validation
    const validTypes = ['academic', 'corporate', 'eu_funded', 'public_initiative', 'personal'];
    if (!data.project_type) {
        errors.push({ field: 'project_type', message: 'Project type is required' });
    } else if (!validTypes.includes(data.project_type)) {
        errors.push({ field: 'project_type', message: 'Invalid project type' });
    }

    // Status validation
    const validStatuses = ['planning', 'active', 'completed', 'paused', 'archived'];
    if (data.status && !validStatuses.includes(data.status)) {
        errors.push({ field: 'status', message: 'Invalid project status' });
    }

    // Date validation
    if (!data.start_date) {
        errors.push({ field: 'start_date', message: 'Start date is required' });
    } else if (isNaN(new Date(data.start_date).getTime())) {
        errors.push({ field: 'start_date', message: 'Invalid start date' });
    }

    if (data.end_date) {
        if (isNaN(new Date(data.end_date).getTime())) {
            errors.push({ field: 'end_date', message: 'Invalid end date' });
        } else if (data.start_date && new Date(data.end_date) < new Date(data.start_date)) {
            errors.push({ field: 'end_date', message: 'End date must be after start date' });
        }
    }

    // Budget validation
    if (data.budget !== null && data.budget !== undefined) {
        const budget = parseFloat(data.budget);
        if (isNaN(budget) || budget < 0) {
            errors.push({ field: 'budget', message: 'Budget must be a positive number' });
        }
    }

    // Funding source validation
    if (data.funding_source && data.funding_source.length > 200) {
        errors.push({ field: 'funding_source', message: 'Funding source must be 200 characters or less' });
    }

    // Cover image URL validation
    if (data.cover_image_url && !isValidUrl(data.cover_image_url)) {
        errors.push({ field: 'cover_image_url', message: 'Invalid cover image URL' });
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validate task data before saving
 * @param {Object} data - Task data to validate
 * @returns {Object} Validation result with valid flag and errors array
 */
export function validateTaskData(data) {
    const errors = [];

    // Title validation
    if (!data.title || data.title.trim().length === 0) {
        errors.push({ field: 'title', message: 'Task title is required' });
    } else if (data.title.length > 200) {
        errors.push({ field: 'title', message: 'Task title must be 200 characters or less' });
    }

    // Description validation
    if (data.description && data.description.length > 1000) {
        errors.push({ field: 'description', message: 'Description must be 1000 characters or less' });
    }

    // Status validation
    const validStatuses = ['todo', 'in_progress', 'done'];
    if (!data.status) {
        errors.push({ field: 'status', message: 'Task status is required' });
    } else if (!validStatuses.includes(data.status)) {
        errors.push({ field: 'status', message: 'Invalid task status' });
    }

    // Project ID validation
    if (!data.project_id || data.project_id.trim().length === 0) {
        errors.push({ field: 'project_id', message: 'Project ID is required' });
    }

    // Due date validation
    if (data.due_date) {
        if (isNaN(new Date(data.due_date).getTime())) {
            errors.push({ field: 'due_date', message: 'Invalid due date' });
        }
    }

    // Priority validation
    if (data.priority !== null && data.priority !== undefined) {
        const priority = parseInt(data.priority);
        if (isNaN(priority) || priority < 1 || priority > 5) {
            errors.push({ field: 'priority', message: 'Priority must be between 1 and 5' });
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validate user profile data before saving
 * @param {Object} data - User data to validate
 * @returns {Object} Validation result with valid flag and errors array
 */
export function validateUserData(data) {
    const errors = [];

    // Email validation
    if (!data.email || data.email.trim().length === 0) {
        errors.push({ field: 'email', message: 'Email is required' });
    } else if (!isValidEmail(data.email)) {
        errors.push({ field: 'email', message: 'Invalid email address' });
    }

    // Full name validation
    if (data.full_name) {
        if (data.full_name.length > 100) {
            errors.push({ field: 'full_name', message: 'Full name must be 100 characters or less' });
        }
        if (data.full_name.length < 2) {
            errors.push({ field: 'full_name', message: 'Full name must be at least 2 characters' });
        }
    }

    // Password validation (for registration/change)
    if (data.password) {
        if (data.password.length < 8) {
            errors.push({ field: 'password', message: 'Password must be at least 8 characters long' });
        }
        if (!/[a-z]/.test(data.password)) {
            errors.push({ field: 'password', message: 'Password must include lowercase letters' });
        }
        if (!/[A-Z]/.test(data.password)) {
            errors.push({ field: 'password', message: 'Password must include uppercase letters' });
        }
        if (!/[0-9]/.test(data.password)) {
            errors.push({ field: 'password', message: 'Password must include numbers' });
        }
    }

    // Confirm password validation
    if (data.password && data.confirmPassword) {
        if (data.password !== data.confirmPassword) {
            errors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
        }
    }

    // Bio validation
    if (data.bio && data.bio.length > 500) {
        errors.push({ field: 'bio', message: 'Bio must be 500 characters or less' });
    }

    // Avatar URL validation
    if (data.avatar_url && !isValidUrl(data.avatar_url)) {
        errors.push({ field: 'avatar_url', message: 'Invalid avatar URL' });
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validate file data before upload
 * @param {File} file - File object to validate
 * @param {Object} options - Validation options (maxSize, allowedTypes, etc.)
 * @returns {Object} Validation result with valid flag and errors array
 */
export function validateFileData(file, options = {}) {
    const errors = [];

    if (!file) {
        errors.push({ field: 'file', message: 'No file provided' });
        return { valid: false, errors };
    }

    // File size validation
    const maxSize = options.maxSize || (5 * 1024 * 1024); // Default 5MB
    if (file.size > maxSize) {
        const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
        errors.push({ 
            field: 'file', 
            message: `File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds maximum allowed size (${maxSizeMB}MB)` 
        });
    }

    // File type validation
    if (options.allowedTypes && options.allowedTypes.length > 0) {
        const fileType = file.type;
        const fileExtension = file.name.split('.').pop().toLowerCase();
        
        const isValidType = options.allowedTypes.some(type => {
            // Check MIME type
            if (type.includes('/')) {
                return fileType === type || fileType.match(new RegExp(type.replace('*', '.*')));
            }
            // Check extension
            return fileExtension === type.replace('.', '');
        });

        if (!isValidType) {
            errors.push({ 
                field: 'file', 
                message: `Invalid file type. Allowed types: ${options.allowedTypes.join(', ')}` 
            });
        }
    }

    // File name validation
    if (file.name.length > 255) {
        errors.push({ field: 'file', message: 'File name must be 255 characters or less' });
    }

    // Check for invalid characters in filename
    if (/[<>:"/\\|?*\x00-\x1F]/.test(file.name)) {
        errors.push({ field: 'file', message: 'File name contains invalid characters' });
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validate form data with custom rules
 * @param {Object} data - Form data to validate
 * @param {Object} rules - Validation rules
 * @returns {Object} Validation result
 */
export function validateFormData(data, rules) {
    const errors = [];

    for (const [field, fieldRules] of Object.entries(rules)) {
        const value = data[field];

        // Required validation
        if (fieldRules.required && (!value || value.toString().trim().length === 0)) {
            errors.push({ 
                field, 
                message: fieldRules.requiredMessage || `${field} is required` 
            });
            continue;
        }

        // Skip other validations if field is empty and not required
        if (!value && !fieldRules.required) {
            continue;
        }

        // Min length validation
        if (fieldRules.minLength && value.length < fieldRules.minLength) {
            errors.push({ 
                field, 
                message: `${field} must be at least ${fieldRules.minLength} characters` 
            });
        }

        // Max length validation
        if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
            errors.push({ 
                field, 
                message: `${field} must be ${fieldRules.maxLength} characters or less` 
            });
        }

        // Pattern validation
        if (fieldRules.pattern && !fieldRules.pattern.test(value)) {
            errors.push({ 
                field, 
                message: fieldRules.patternMessage || `${field} format is invalid` 
            });
        }

        // Custom validation function
        if (fieldRules.validate && typeof fieldRules.validate === 'function') {
            const customError = fieldRules.validate(value, data);
            if (customError) {
                errors.push({ field, message: customError });
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if string is a valid email address
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Check if string is a valid URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
export function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Check if string is a valid UUID
 * @param {string} uuid - UUID to validate
 * @returns {boolean} True if valid UUID
 */
export function isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

/**
 * Sanitize string input to prevent XSS
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeInput(str) {
    if (typeof str !== 'string') return str;
    
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;'
    };
    
    return str.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Check if date is in the past
 * @param {string|Date} date - Date to check
 * @returns {boolean} True if date is in the past
 */
export function isPastDate(date) {
    const checkDate = new Date(date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return checkDate < now;
}

/**
 * Check if date is in the future
 * @param {string|Date} date - Date to check
 * @returns {boolean} True if date is in the future
 */
export function isFutureDate(date) {
    const checkDate = new Date(date);
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    return checkDate > now;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    validateProjectData,
    validateTaskData,
    validateUserData,
    validateFileData,
    validateFormData,
    isValidEmail,
    isValidUrl,
    isValidUUID,
    sanitizeInput,
    isPastDate,
    isFutureDate
};
