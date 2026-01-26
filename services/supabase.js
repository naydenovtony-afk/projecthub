import { createClient } from '@supabase/supabase-js';

/**
 * Initialize Supabase client
 * Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from environment variables
 * Returns a dummy client in demo mode to prevent errors
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if we have valid credentials
const hasValidCredentials = supabaseUrl && 
                            supabaseAnonKey && 
                            supabaseUrl !== 'your_supabase_url_here' &&
                            supabaseUrl.startsWith('http');

let supabase;

if (hasValidCredentials) {
  /**
   * Supabase client instance for database and authentication operations
   * @type {import('@supabase/supabase-js').SupabaseClient}
   */
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  // Create a dummy client for demo mode
  console.warn('⚠️ Supabase not configured. Running in demo mode.');
  supabase = {
    auth: {
      signInWithPassword: async () => ({ data: null, error: new Error('Demo mode - no authentication') }),
      signUp: async () => ({ data: null, error: new Error('Demo mode - no authentication') }),
      signOut: async () => ({ error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: () => ({
      select: () => ({ data: [], error: new Error('Demo mode - use demo data') }),
      insert: () => ({ data: null, error: new Error('Demo mode - no database writes') }),
      update: () => ({ data: null, error: new Error('Demo mode - no database writes') }),
      delete: () => ({ data: null, error: new Error('Demo mode - no database writes') })
    })
  };
}

export default supabase;
