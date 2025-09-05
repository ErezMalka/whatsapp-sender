// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

// Browser client for client-side operations
export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Export default client instance
const supabase = createBrowserClient();
export default supabase;
