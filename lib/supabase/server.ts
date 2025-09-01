// lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js';

// Service role client for admin operations
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE;
  
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Regular client (simplified version)
export async function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  return createClient(url, anonKey);
}