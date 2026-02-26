import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://demo.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo-key';

// Create Supabase client using the real URL directly
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Check if Supabase is configured
export function isSupabaseConfigured() {
  return supabaseUrl !== 'https://demo.supabase.co' && 
         supabaseKey !== 'demo-key';
}

/**
 * Get raw Supabase auth config.
 * @returns {{url: string, anonKey: string}}
 */
export function getSupabaseAuthConfig() {
  return {
    url: supabaseUrl,
    anonKey: supabaseKey
  };
}

// Export supabase client
export { supabase };
export default supabase;
