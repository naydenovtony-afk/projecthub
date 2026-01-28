/**
 * Auth Module - Login, Register, and Demo Mode Support
 */

import { isDemoMode, enableDemoMode, disableDemoMode, demoServices } from '../utils/demoMode.js';
import { supabase } from '../services/supabase.js';

// Check auth status
export function checkAuthStatus() {
  const currentPath = window.location.pathname;
  const isAuthPage = currentPath.includes('login.html') || currentPath.includes('register.html');
  
  if (isDemoMode()) {
    if (isAuthPage) {
      window.location.href = './dashboard.html?demo=true';
    }
    return true;
  }
  
  const user = getCurrentUser();
  
  if (!user && !isAuthPage && !currentPath.includes('index.html')) {
    window.location.href = './login.html';
    return false;
  }
  
  if (user && isAuthPage) {
    window.location.href = './dashboard.html';
    return false;
  }
  
  return true;
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

// Re-export isDemoMode for convenience
export { isDemoMode };
