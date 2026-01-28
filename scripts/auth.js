/**
 * Auth Module - Login, Register, and Demo Mode Support
 * Handles authentication for both real users (Supabase) and demo mode
 */

import { isDemoMode, enableDemoMode, disableDemoMode, demoServices } from '../utils/demoMode.js';
import { supabase } from '../services/supabase.js';

// Check if user is already authenticated
export function checkAuthStatus() {
  const currentPath = window.location.pathname;
  const isAuthPage = currentPath.includes('login.html') || currentPath.includes('register.html');
  
  if (isDemoMode()) {
    // In demo mode, allow access
    if (isAuthPage) {
      window.location.href = './dashboard.html?demo=true';
    }
    return true;
  }
  
  const user = getCurrentUser();
  
  if (!user && !isAuthPage && !currentPath.includes('index.html')) {
    // Not logged in and not on auth page - redirect to login
    window.location.href = './login.html';
    return false;
  }
  
  if (user && isAuthPage) {
    // Logged in but on auth page - redirect to dashboard
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
  
  // Get from localStorage or Supabase
  const userStr = localStorage.getItem('user');
  if (userStr) {
    return JSON.parse(userStr);
  }
  
  return null;
}

// Login function
export async function login(email, password) {
  try {
    if (isDemoMode()) {
      // Demo login
      window.location.href = './dashboard.html?demo=true';
      return { success: true };
    }
    
    // Simulate login for now (until Supabase is configured)
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

// Register function
export async function register(email, password, fullName) {
  try {
    if (isDemoMode()) {
      // Demo mode - just redirect
      window.location.href = './dashboard.html?demo=true';
      return { success: true };
    }
    
    // Simulate registration (until Supabase is configured)
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

// Logout function
export function logout() {
  if (isDemoMode()) {
    disableDemoMode();
  }
  
  // Clear any session
  localStorage.removeItem('user');
  
  // Redirect to login
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

// Enable demo mode and redirect
export function startDemoMode() {
  enableDemoMode();
  window.location.href = './dashboard.html?demo=true';
}

// Check if in demo mode
export { isDemoMode };
