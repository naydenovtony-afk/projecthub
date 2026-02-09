/**
 * Auth Module - Login, Register, and Demo Mode Support
 */

import { isDemoMode, enableDemoMode, disableDemoMode, demoServices } from '../utils/demoMode.js';
import { supabase } from '../services/supabase.js';

// Check auth status
export function checkAuthStatus() {
  const currentPath = window.location.pathname;
  const isAuthPage = currentPath.includes('login.html') || currentPath.includes('register.html');
  const isLandingPage = currentPath.includes('index.html') || currentPath === '/' || currentPath.includes('demo.html');
  
  // Check if demo mode is active
  const urlParams = new URLSearchParams(window.location.search);
  const isDemoFromUrl = urlParams.get('demo') === 'true';
  
  if (isDemoFromUrl && !isDemoMode()) {
    // Enable demo mode if ?demo=true in URL
    enableDemoMode();
  }
  
  // Allow access if in demo mode
  if (isDemoMode()) {
    // If on auth page in demo mode, redirect to dashboard
    if (isAuthPage) {
      window.location.href = './dashboard.html?demo=true';
      return false;
    }
    return true; // Allow access to all pages in demo mode
  }
  
  // Allow access to landing and auth pages without login
  if (isLandingPage || isAuthPage) {
    return true;
  }
  
  // Check for real user session
  const user = getCurrentUser();
  
  if (!user) {
    // Not logged in and not in demo mode - redirect to login
    window.location.href = './login.html';
    return false;
  }
  
  return true;
}

// Add demo parameter to all internal links
export function addDemoParamToLinks() {
  if (isDemoMode()) {
    // Add ?demo=true to all internal navigation links
    document.querySelectorAll('a[href^="./"], a[href^="pages/"]').forEach(link => {
      const href = link.getAttribute('href');
      if (!href.includes('?demo=true') && !href.includes('#')) {
        const separator = href.includes('?') ? '&' : '?';
        link.setAttribute('href', href + separator + 'demo=true');
      }
    });
  }
}

// Call on page load
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', addDemoParamToLinks);
}

// Get current user
export function getCurrentUser() {
  if (isDemoMode()) {
    return demoServices.auth.getCurrentUser();
  }
  
  const userStr = localStorage.getItem('user');
  if (userStr) {
    return JSON.parse(userStr);
  }
  
  return null;
}

// Login
export async function login(email, password) {
  try {
    if (isDemoMode()) {
      window.location.href = './dashboard.html?demo=true';
      return { success: true };
    }
    
    const user = {
      id: 'user-' + Date.now(),
      email: email,
      full_name: email.split('@')[0],
      created_at: new Date().toISOString()
    };
    
    localStorage.setItem('user', JSON.stringify(user));
    window.location.href = './dashboard.html';
    
    return { success: true };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
}

// Register
export async function register(email, password, fullName) {
  try {
    if (isDemoMode()) {
      window.location.href = './dashboard.html?demo=true';
      return { success: true };
    }
    
    const user = {
      id: 'user-' + Date.now(),
      email: email,
      full_name: fullName || email.split('@')[0],
      created_at: new Date().toISOString()
    };
    
    localStorage.setItem('user', JSON.stringify(user));
    window.location.href = './dashboard.html';
    
    return { success: true };
  } catch (error) {
    console.error('Register error:', error);
    return { success: false, error: error.message };
  }
}

// Logout
export function logout() {
  if (isDemoMode()) {
    disableDemoMode();
  }
  
  localStorage.removeItem('user');
  window.location.href = './login.html';
}

// Validate email
export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Validate password
export function validatePassword(password) {
  return password.length >= 8;
}

// Start demo mode
export function startDemoMode() {
  enableDemoMode();
  window.location.href = './dashboard.html?demo=true';
}

// Auto demo login
export function autoDemoLogin() {
  enableDemoMode();
  window.location.href = './dashboard.html?demo=true';
}

// Check if demo session (alias for isDemoMode)
export function isDemoSession() {
  return isDemoMode();
}

// Check if user is admin
export function isAdmin() {
  const user = getCurrentUser();
  return user && user.role === 'admin';
}

// Alias for checkAuthStatus (for backward compatibility)
export const checkAuth = checkAuthStatus;

// Re-export isDemoMode for convenience
export { isDemoMode };
