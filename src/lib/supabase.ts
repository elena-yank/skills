import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const useRest = import.meta.env.VITE_USE_REST_API === 'true';

if ((!supabaseUrl || !supabaseAnonKey) && !useRest) {
  throw new Error('Missing Supabase environment variables');
}

// Create a dummy client if we are using REST to prevent crashes, 
// or the real one if we have creds.
// If useRest is true, we might not have creds, so we cast to any or create a partial mock if needed.
// But mostly we just want to export *something* that satisfies the type checker if it's imported,
// but it shouldn't be used at runtime if useRest is true.
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder') as any;
