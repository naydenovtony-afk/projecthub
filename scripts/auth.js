/**
 * Auth Module - Login, Register, and Demo Mode Support
 */

import { isDemoMode, enableDemoMode, disableDemoMode, demoServices, DEMO_USER } from '../utils/demoMode.js';
import { supabase } from '../services/supabase.js';

const AUTH_CACHE_KEY = 'auth_user';
const LEGACY_AUTH_KEY = 'user';

/**
 * Cache normalized user object for synchronous consumers.
 * @param {Object|null} user
 */
function setCachedUser(user) {
  if (!user) {
    localStorage.removeItem(AUTH_CACHE_KEY);
    localStorage.removeItem(LEGACY_AUTH_KEY);
    return;
  }

  localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(user));
  // Keep legacy key for backward compatibility with old consumers
  localStorage.setItem(LEGACY_AUTH_KEY, JSON.stringify(user));
}

/**
 * Get cached user from localStorage.
 * @returns {Object|null}
 */
function getCachedUser() {
  const raw = localStorage.getItem(AUTH_CACHE_KEY) || localStorage.getItem(LEGACY_AUTH_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Build normalized app user object from auth user + profile.
 * @param {Object|null} authUser
 * @param {Object|null} profile
 * @returns {Object|null}
 */
function normalizeUser(authUser, profile = null) {
  if (!authUser) {
    return null;
  }

  return {
    id: authUser.id,
    email: authUser.email,
    full_name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
    avatar_url: profile?.avatar_url || authUser.user_metadata?.avatar_url || null,
    bio: profile?.bio || null,
    role: profile?.role || 'user',
    created_at: authUser.created_at,
    user_metadata: {
      ...(authUser.user_metadata || {}),
      full_name: profile?.full_name || authUser.user_metadata?.full_name || null,
      role: profile?.role || 'user'
    }
  };
}

/**
 * Best-effort user extraction from Supabase local auth storage for sync guards.
 * @returns {Object|null}
 */
function getUserFromSupabaseLocalToken() {
  try {
    const keys = Object.keys(localStorage);
    const authTokenKey = keys.find((key) => key.startsWith('sb-') && key.endsWith('-auth-token'));

    if (!authTokenKey) {
      return null;
    }

    const raw = localStorage.getItem(authTokenKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    // Supabase client can store either direct session object or wrapped state.
    const session = parsed?.currentSession || parsed?.session || parsed;
    const authUser = session?.user || parsed?.user || null;

    return normalizeUser(authUser);
  } catch {
    return null;
  }
}

/**
 * Upsert profile row for authenticated user.
 * @param {Object} authUser
 * @param {string|null} fullName
 */
async function upsertProfile(authUser, fullName = null) {
  if (!authUser?.id || !authUser?.email) {
    return;
  }

  const profilePayload = {
    id: authUser.id,
    email: authUser.email,
    full_name: fullName || authUser.user_metadata?.full_name || authUser.email.split('@')[0]
  };

  await supabase
    .from('profiles')
    .upsert(profilePayload, { onConflict: 'id' });
}

/**
 * Fetch profile for user id.
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
async function getProfile(userId) {
  if (!userId) {
    return null;
  }

  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url, bio, role')
    .eq('id', userId)
    .maybeSingle();

  return data || null;
}

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
  
  // Check for real user session (cached or inferred from Supabase auth storage)
  const user = getCurrentUser() || getUserFromSupabaseLocalToken();

  if (user && !getCachedUser()) {
    setCachedUser(user);
  }
  
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
    const storedDemoUser = localStorage.getItem('demoUser');
    if (storedDemoUser) {
      try {
        return JSON.parse(storedDemoUser);
      } catch {
        return { ...DEMO_USER };
      }
    }

    return { ...DEMO_USER };
  }

  return getCachedUser();
}

/**
 * Async current user retrieval from active Supabase session + profile.
 * @returns {Promise<Object|null>}
 */
export async function getCurrentUserFromSession() {
  if (isDemoMode()) {
    return demoServices.auth.getCurrentUser();
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    setCachedUser(null);
    return null;
  }

  await upsertProfile(data.user);
  const profile = await getProfile(data.user.id);
  const normalized = normalizeUser(data.user, profile);
  setCachedUser(normalized);

  return normalized;
}

/**
 * Async auth guard for pages that need full validated user object.
 * @returns {Promise<Object|null>}
 */
export async function checkAuth() {
  if (isDemoMode()) {
    return demoServices.auth.getCurrentUser();
  }

  const user = await getCurrentUserFromSession();
  if (!user) {
    window.location.href = './login.html';
    return null;
  }

  return user;
}

// Login
export async function login(email, password) {
  try {
    if (isDemoMode()) {
      return { success: true, isDemo: true };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }

    if (!data?.user) {
      throw new Error('Authentication failed. Please try again.');
    }

    await upsertProfile(data.user);
    const profile = await getProfile(data.user.id);
    const normalized = normalizeUser(data.user, profile);
    setCachedUser(normalized);

    return { success: true, user: normalized };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
}

// Register
export async function register(arg1, arg2, arg3) {
  try {
    if (isDemoMode()) {
      return { success: true, isDemo: true };
    }

    // Support both signatures:
    // register(fullName, email, password) and register(email, password, fullName)
    const firstLooksLikeEmail = typeof arg1 === 'string' && arg1.includes('@');
    const email = firstLooksLikeEmail ? arg1 : arg2;
    const password = firstLooksLikeEmail ? arg2 : arg3;
    const fullName = firstLooksLikeEmail ? arg3 : arg1;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (error) {
      throw error;
    }

    if (data?.user) {
      await upsertProfile(data.user, fullName);

      if (data.session) {
        const profile = await getProfile(data.user.id);
        const normalized = normalizeUser(data.user, profile);
        setCachedUser(normalized);
      }
    }

    return {
      success: true,
      needsEmailVerification: !data?.session
    };
  } catch (error) {
    console.error('Register error:', error);
    return { success: false, error: error.message };
  }
}

// Logout
export async function logout() {
  if (isDemoMode()) {
    disableDemoMode();
    setCachedUser(null);
    window.location.href = './login.html';
    return;
  }

  await supabase.auth.signOut();
  setCachedUser(null);
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
  const user = arguments.length > 0 ? arguments[0] : getCurrentUser();
  return user && user.role === 'admin';
}

// Keep cache in sync with Supabase auth state changes
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (!session?.user) {
      setCachedUser(null);
      return;
    }

    await upsertProfile(session.user);
    const profile = await getProfile(session.user.id);
    setCachedUser(normalizeUser(session.user, profile));
  });
}

// Re-export isDemoMode for convenience
export { isDemoMode };
