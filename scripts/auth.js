/**
 * Auth Module - Login, Register, and Demo Mode Support
 * Handles authentication for both real users (Supabase) and demo mode
 */

import { isDemoMode, enableDemoMode, demoServices } from '../utils/demoMode.js';
import { showError, showSuccess, showLoading, hideLoading } from '../utils/ui.js';
import { validateEmail, validatePassword } from '../utils/validators.js';

/**
 * Check if user is already authenticated
 * Redirects to dashboard if logged in
 */
async function checkAuthStatus() {
  const isDemo = isDemoMode();
  
  if (isDemo) {
    const user = await demoServices.auth.getCurrentUser();
    if (user) {
      window.location.href = './dashboard.html?demo=true';
      return true;
    }
  } else {
    // Check real auth
    const user = await getCurrentUser();
    if (user) {
      window.location.href = './dashboard.html';
      return true;
    }
  }
  
  return false;
}

/**
 * Initialize login page
 */
async function initLoginPage() {
  // Check if already logged in
  const isLoggedIn = await checkAuthStatus();
  if (isLoggedIn) return;
  
  // Setup form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  // Setup demo button
  const demoBtn = document.getElementById('tryDemoBtn');
  if (demoBtn) {
    demoBtn.addEventListener('click', handleDemoLogin);
  }
  
  // Setup "show password" toggle
  setupPasswordToggle();
}

/**
 * Initialize register page
 */
async function initRegisterPage() {
  // Check if already logged in
  const isLoggedIn = await checkAuthStatus();
  if (isLoggedIn) return;
  
  // Setup form
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
  
  // Setup password toggle
  setupPasswordToggle();
  
  // Setup password strength indicator
  setupPasswordStrength();
}

/**
 * Handle login form submission
 */
async function handleLogin(e) {
  e.preventDefault();
  
  const form = e.target;
  const email = form.email.value.trim();
  const password = form.password.value;
  const rememberMe = form.remember?.checked || false;
  
  // Validate
  if (!validateEmail(email)) {
    showError('Please enter a valid email address');
    return;
  }
  
  if (!password) {
    showError('Please enter your password');
    return;
  }
  
  try {
    showLoading('Signing in...');
    
    // Attempt login (this would call Supabase in real mode)
    // For now, we'll simulate
    await simulateLogin(email, password, rememberMe);
    
    hideLoading();
    showSuccess('Login successful! Redirecting...');
    
    setTimeout(() => {
      window.location.href = './dashboard.html';
    }, 1000);
    
  } catch (error) {
    hideLoading();
    console.error('Login error:', error);
    showError(error.message || 'Login failed. Please check your credentials.');
  }
}

/**
 * Handle register form submission
 */
async function handleRegister(e) {
  e.preventDefault();
  
  const form = e.target;
  const fullName = form.fullName.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value;
  const confirmPassword = form.confirmPassword.value;
  const terms = form.terms?.checked || false;
  
  // Validate
  if (!fullName) {
    showError('Please enter your full name');
    return;
  }
  
  if (!validateEmail(email)) {
    showError('Please enter a valid email address');
    return;
  }
  
  if (!validatePassword(password)) {
    showError('Password must be at least 8 characters with uppercase, lowercase, and number');
    return;
  }
  
  if (password !== confirmPassword) {
    showError('Passwords do not match');
    return;
  }
  
  if (!terms) {
    showError('Please accept the terms and conditions');
    return;
  }
  
  try {
    showLoading('Creating account...');
    
    // Attempt registration (this would call Supabase in real mode)
    await simulateRegister(fullName, email, password);
    
    hideLoading();
    showSuccess('Account created! Redirecting to login...');
    
    setTimeout(() => {
      window.location.href = './login.html';
    }, 1500);
    
  } catch (error) {
    hideLoading();
    console.error('Registration error:', error);
    showError(error.message || 'Registration failed. Please try again.');
  }
}

/**
 * Handle demo login
 */
async function handleDemoLogin(e) {
  e.preventDefault();
  
  try {
    showLoading('Starting demo mode...');
    
    // Enable demo mode
    enableDemoMode();
    
    // Login with demo user
    await demoServices.auth.login('demo@projecthub.com');
    
    hideLoading();
    showSuccess('Welcome to demo mode!');
    
    setTimeout(() => {
      window.location.href = './dashboard.html?demo=true';
    }, 1000);
    
  } catch (error) {
    hideLoading();
    console.error('Demo login error:', error);
    showError('Failed to start demo mode');
  }
}

/**
 * Simulate login (temporary - replace with real Supabase)
 */
async function simulateLogin(email, password, rememberMe) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // For now, accept any credentials
      // In real implementation, this would call Supabase
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', email);
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }
      resolve({ email });
    }, 1000);
  });
}

/**
 * Simulate register (temporary - replace with real Supabase)
 */
async function simulateRegister(fullName, email, password) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // In real implementation, this would call Supabase
      resolve({ fullName, email });
    }, 1000);
  });
}

/**
 * Get current user
 * @returns {Promise<object|null>} User object or null
 */
export async function getCurrentUser() {
  // Check demo mode
  if (isDemoMode()) {
    return await demoServices.auth.getCurrentUser();
  }
  
  // Check if logged in (temporary - replace with Supabase)
  const isLoggedIn = localStorage.getItem('isLoggedIn');
  if (isLoggedIn === 'true') {
    return {
      email: localStorage.getItem('userEmail'),
      full_name: 'Test User',
      role: 'user'
    };
  }
  
  return null;
}

/**
 * Logout current user
 */
export async function logout() {
  try {
    showLoading('Logging out...');
    
    if (isDemoMode()) {
      await demoServices.auth.logout();
    } else {
      // Clear session (temporary - replace with Supabase)
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('rememberMe');
    }
    
    hideLoading();
    showSuccess('Logged out successfully');
    
    setTimeout(() => {
      window.location.href = '../index.html';
    }, 1000);
    
  } catch (error) {
    hideLoading();
    console.error('Logout error:', error);
    showError('Failed to logout');
  }
}

/**
 * Setup password visibility toggle
 */
function setupPasswordToggle() {
  const toggleButtons = document.querySelectorAll('.toggle-password');
  
  toggleButtons.forEach(button => {
    button.addEventListener('click', () => {
      const input = button.previousElementSibling;
      const icon = button.querySelector('i');
      
      if (input && icon) {
        if (input.type === 'password') {
          input.type = 'text';
          icon.classList.remove('bi-eye');
          icon.classList.add('bi-eye-slash');
        } else {
          input.type = 'password';
          icon.classList.remove('bi-eye-slash');
          icon.classList.add('bi-eye');
        }
      }
    });
  });
}

/**
 * Setup password strength indicator
 */
function setupPasswordStrength() {
  const passwordInput = document.getElementById('password');
  const strengthBar = document.getElementById('passwordStrength');
  const strengthText = document.getElementById('passwordStrengthText');
  
  if (!passwordInput || !strengthBar) return;
  
  passwordInput.addEventListener('input', () => {
    const password = passwordInput.value;
    const strength = calculatePasswordStrength(password);
    
    // Update bar
    strengthBar.className = 'progress-bar';
    strengthBar.style.width = strength.percentage + '%';
    
    if (strength.level === 'weak') {
      strengthBar.classList.add('bg-danger');
      if (strengthText) {
        strengthText.textContent = 'Weak';
        strengthText.className = 'text-danger small';
      }
    } else if (strength.level === 'medium') {
      strengthBar.classList.add('bg-warning');
      if (strengthText) {
        strengthText.textContent = 'Medium';
        strengthText.className = 'text-warning small';
      }
    } else if (strength.level === 'strong') {
      strengthBar.classList.add('bg-success');
      if (strengthText) {
        strengthText.textContent = 'Strong';
        strengthText.className = 'text-success small';
      }
    }
  });
}

/**
 * Calculate password strength
 * @param {string} password - Password to evaluate
 * @returns {object} Strength percentage and level
 */
function calculatePasswordStrength(password) {
  let strength = 0;
  
  if (password.length >= 8) strength += 25;
  if (password.length >= 12) strength += 25;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
  if (/\d/.test(password)) strength += 15;
  if (/[^a-zA-Z0-9]/.test(password)) strength += 10;
  
  let level = 'weak';
  if (strength >= 75) level = 'strong';
  else if (strength >= 50) level = 'medium';
  
  return { percentage: strength, level };
}

/**
 * Setup logout buttons across the app
 */
document.addEventListener('DOMContentLoaded', () => {
  const logoutButtons = document.querySelectorAll('[data-logout]');
  logoutButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  });
});

// Export functions
export { 
  initLoginPage, 
  initRegisterPage, 
  handleLogin, 
  handleRegister,
  handleDemoLogin,
  checkAuthStatus
};
