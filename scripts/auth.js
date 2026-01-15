import supabase from '../services/supabase.js';

/**
 * Register a new user with Supabase Auth and create profile
 * @param {string} fullName - User's full name
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<{success: boolean, message: string, user?: object, error?: string}>}
 */
export async function register(fullName, email, password) {
  try {
    // Validate inputs
    if (!fullName || !email || !password) {
      return {
        success: false,
        error: 'All fields are required'
      };
    }

    if (!validateEmail(email).isValid) {
      return {
        success: false,
        error: 'Please provide a valid email address'
      };
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        error: passwordValidation.message
      };
    }

    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (authError) {
      console.error('Auth signup error:', authError);
      
      if (authError.message.includes('already registered')) {
        return {
          success: false,
          error: 'Email already registered. Please login instead.'
        };
      }
      
      return {
        success: false,
        error: authError.message || 'Failed to register. Please try again.'
      };
    }

    // Create user profile
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            email: email,
            full_name: fullName,
            role: 'user'
          }
        ]);

      if (profileError) {
        console.error('Profile creation error:', profileError);
        return {
          success: false,
          error: 'Failed to create profile. Please try again.'
        };
      }
    }

    return {
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      user: authData.user
    };
  } catch (error) {
    console.error('Register error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.'
    };
  }
}

/**
 * Login user with email and password
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<{success: boolean, message?: string, user?: object, error?: string}>}
 */
export async function login(email, password) {
  try {
    // Validate inputs
    if (!email || !password) {
      return {
        success: false,
        error: 'Email and password are required'
      };
    }

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.error('Auth login error:', authError);
      
      if (authError.message.includes('Invalid login credentials')) {
        return {
          success: false,
          error: 'Invalid email or password. Please try again.'
        };
      }

      return {
        success: false,
        error: authError.message || 'Failed to login. Please try again.'
      };
    }

    if (authData.user && authData.session) {
      // Store user data in localStorage
      localStorage.setItem('projecthub_user', JSON.stringify({
        id: authData.user.id,
        email: authData.user.email,
        accessToken: authData.session.access_token,
        expiresAt: authData.session.expires_at
      }));

      return {
        success: true,
        message: 'Login successful!',
        user: authData.user
      };
    }

    return {
      success: false,
      error: 'Login failed. Please try again.'
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.'
    };
  }
}

/**
 * Logout current user
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
export async function logout() {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        error: 'Failed to logout. Please try again.'
      };
    }

    // Clear localStorage
    localStorage.removeItem('projecthub_user');
    sessionStorage.clear();

    // Redirect to login
    window.location.href = '../pages/login.html';

    return {
      success: true,
      message: 'Logout successful!'
    };
  } catch (error) {
    console.error('Logout error:', error);
    // Force clear data even if logout fails
    localStorage.removeItem('projecthub_user');
    sessionStorage.clear();
    window.location.href = '../pages/login.html';

    return {
      success: false,
      error: 'An error occurred during logout.'
    };
  }
}

/**
 * Get current authenticated user
 * @returns {Promise<object|null>} User object if authenticated, null otherwise
 */
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.warn('No authenticated user');
      return null;
    }

    return user;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

/**
 * Check if user is authenticated, redirect if not
 * @returns {Promise<object|null>} User object if authenticated
 */
export async function checkAuth() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      console.warn('Not authenticated');
      // Redirect to login if not in login/register page
      const currentPage = window.location.pathname;
      if (!currentPage.includes('login') && !currentPage.includes('register')) {
        window.location.href = '../pages/login.html';
      }
      return null;
    }

    return session.user;
  } catch (error) {
    console.error('Check auth error:', error);
    window.location.href = '../pages/login.html';
    return null;
  }
}

/**
 * Check if current user is admin
 * @returns {Promise<boolean>} True if user is admin, false otherwise
 */
export async function isAdmin() {
  try {
    const user = await getCurrentUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }

    return data?.role === 'admin';
  } catch (error) {
    console.error('Is admin check error:', error);
    return false;
  }
}

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {{isValid: boolean}} Validation result
 */
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return {
    isValid: emailRegex.test(email)
  };
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {{isValid: boolean, message: string}} Validation result with message
 */
export function validatePassword(password) {
  const errors = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letters');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    message: errors.length > 0 ? errors.join('. ') : 'Password is strong'
  };
}

/**
 * Display error message in UI
 * @param {string} message - Error message to display
 * @param {string} containerId - ID of container element (optional)
 */
export function showError(message, containerId = 'errorMessage') {
  const errorContainer = document.getElementById(containerId);
  if (errorContainer) {
    const errorText = document.getElementById(containerId.replace('Message', 'Text'));
    if (errorText) {
      errorText.textContent = message;
    }
    errorContainer.classList.remove('d-none');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorContainer.classList.add('d-none');
    }, 5000);
  } else {
    console.error(message);
  }
}

/**
 * Display success message in UI
 * @param {string} message - Success message to display
 * @param {string} containerId - ID of container element (optional)
 */
export function showSuccess(message, containerId = 'successMessage') {
  const successContainer = document.getElementById(containerId);
  if (successContainer) {
    const successText = document.getElementById(containerId.replace('Message', 'Text'));
    if (successText) {
      successText.textContent = message;
    }
    successContainer.classList.remove('d-none');
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      successContainer.classList.add('d-none');
    }, 3000);
  } else {
    console.log(message);
  }
}

/**
 * Toggle loading state on button or form
 * @param {boolean} show - Whether to show loading state
 * @param {string} elementId - ID of button element to toggle
 * @param {string} originalText - Original button text
 */
export function showLoading(show, elementId = 'loginBtn', originalText = 'Login') {
  const element = document.getElementById(elementId);
  if (element) {
    if (show) {
      element.disabled = true;
      element.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        Loading...
      `;
    } else {
      element.disabled = false;
      element.textContent = originalText;
    }
  }
}

/**
 * Initialize authentication on page load
 * Attaches form handlers to login/register forms
 */
export function initializeAuth() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      showLoading(true, 'loginBtn', 'Login');

      const result = await login(email, password);

      if (result.success) {
        showSuccess('Login successful! Redirecting...');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1500);
      } else {
        showError(result.error);
        showLoading(false, 'loginBtn', 'Login');
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Bootstrap form validation
      if (!registerForm.checkValidity()) {
        e.stopPropagation();
        registerForm.classList.add('was-validated');
        return;
      }

      const fullName = document.getElementById('fullName').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      // Check password match
      if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
      }

      showLoading(true, 'registerBtn', 'Create Account');

      const result = await register(fullName, email, password);

      if (result.success) {
        showSuccess('Registration successful! Please check your email to verify your account.');
        registerForm.reset();
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 2000);
      } else {
        showError(result.error);
        showLoading(false, 'registerBtn', 'Create Account');
      }
    });
  }
}

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', initializeAuth);

export default {
  register,
  login,
  logout,
  getCurrentUser,
  checkAuth,
  isAdmin,
  validateEmail,
  validatePassword,
  showError,
  showSuccess,
  showLoading
};
