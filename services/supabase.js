import { createClient } from '@supabase/supabase-js';

// Supabase configuration - NO FALLBACKS to demo values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ CRITICAL: Supabase credentials missing!');
  console.error('Please create .env file with:');
  console.error('VITE_SUPABASE_URL=your-url');
  console.error('VITE_SUPABASE_ANON_KEY=your-key');
}

// Check if Supabase is properly configured
export function isSupabaseConfigured() {
  return Boolean(
    supabaseUrl &&
    supabaseKey &&
    supabaseUrl.includes('.supabase.co')
  );
}

// Create Supabase client
const supabase = createClient(supabaseUrl || '', supabaseKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

console.log('🔐 Supabase initialized:', isSupabaseConfigured() ? '✅ configured' : '❌ missing credentials');

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
