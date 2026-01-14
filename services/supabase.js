import { createClient } from '@supabase/supabase-js';

/**
 * Initialize Supabase client
 * Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from environment variables
 * @throws {Error} If required environment variables are missing
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  );
}

/**
 * Supabase client instance for database and authentication operations
 * @type {import('@supabase/supabase-js').SupabaseClient}
 */
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
