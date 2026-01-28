import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://demo.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo-key';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Check if Supabase is configured
export function isSupabaseConfigured() {
  return supabaseUrl !== 'https://demo.supabase.co' && 
         supabaseKey !== 'demo-key';
}

// Export supabase client
export { supabase };
export default supabase;
