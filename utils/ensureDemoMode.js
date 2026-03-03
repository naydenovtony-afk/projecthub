/**
 * Auto-enable demo mode for demo@projecthub.com
 * Ensures clean separation between demo (localStorage) and real (Supabase) data
 */

import { enableDemoMode, isDemoMode, disableDemoMode } from './demoMode.js';
import { getCurrentUser } from '../scripts/auth.js';

const DEMO_EMAIL = 'demo@projecthub.com';

/**
 * Check current user and enforce correct demo mode state.
 * - demo@projecthub.com → force demo mode ON (localStorage only)
 * - Real user with stale demo flag → force demo mode OFF (Supabase only)
 * @returns {boolean} Whether demo mode is now active
 */
export function ensureDemoMode() {
  const user = getCurrentUser();

  // Demo user → force ON
  if (user?.email === DEMO_EMAIL) {
    if (!isDemoMode()) {
      console.log('🎭 Auto-enabling demo mode for demo user');
      enableDemoMode();
    }
    return true;
  }

  // Real user → clear any stale demo mode flag
  if (user?.email && isDemoMode()) {
    console.log('🚫 Real user detected — disabling stale demo mode');
    disableDemoMode();
    return false;
  }

  // No authenticated user — return current state (handles ?demo=true URL param case)
  return isDemoMode();
}

/**
 * Check if current user is the demo account
 * @returns {boolean}
 */
export function isDemoUser() {
  const user = getCurrentUser();
  return user?.email === DEMO_EMAIL;
}

/**
 * Get the demo email constant
 * @returns {string}
 */
export function getDemoEmail() {
  return DEMO_EMAIL;
}
