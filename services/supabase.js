import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://demo.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo-key';

/**
 * In development, route Supabase requests through the Vite dev server proxy
 * so browser extensions cannot block direct requests to supabase.co.
 */
const isLocalDev = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const clientUrl = isLocalDev ? `${window.location.origin}/__supabase` : supabaseUrl;

// Create Supabase client
const supabase = createClient(clientUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
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
