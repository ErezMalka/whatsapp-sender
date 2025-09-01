// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

// Browser client for client-side operations
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    console.error('Missing Supabase environment variables');
    throw new Error('Supabase configuration missing');
  }
  
  return createBrowserClient(url, key);
}