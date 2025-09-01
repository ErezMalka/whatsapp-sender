// app/lib/supabase/wrapper.ts
import { createClient } from '@supabase/supabase-js';

// פתרון לבעיית encoding ב-StackBlitz
const isStackBlitz = typeof process !== 'undefined' && process.env.STACKBLITZ === 'true';

// Polyfill עבור TextEncoder/TextDecoder אם חסר
if (typeof globalThis.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
}

// יצירת client עם error handling משופר
export function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  try {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: !isStackBlitz, // ב-StackBlitz נכבה session persistence
        autoRefreshToken: !isStackBlitz,
      },
      global: {
        headers: {
          'x-stackblitz-workaround': isStackBlitz ? 'true' : 'false'
        }
      }
    });
    
    return client;
  } catch (error) {
    console.error('Error creating Supabase client:', error);
    // fallback to mock client if needed
    return createMockClient();
  }
}

// Mock client לפיתוח מקומי כשיש בעיות
function createMockClient() {
  console.warn('Using mock Supabase client');
  
  return {
    from: (table: string) => ({
      select: () => Promise.resolve({ data: getMockData(table), error: null }),
      insert: (data: any) => Promise.resolve({ data, error: null }),
      update: (data: any) => Promise.resolve({ data, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
      eq: () => ({
        single: () => Promise.resolve({ data: getMockData(table)[0], error: null })
      })
    }),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signIn: () => Promise.resolve({ data: null, error: null }),
      signOut: () => Promise.resolve({ error: null })
    }
  };
}

// Mock data למקרה חירום
function getMockData(table: string) {
  const mockData: Record<string, any[]> = {
    tenants: [
      { id: '1', name: 'Demo Company', created_at: new Date().toISOString() }
    ],
    contacts: [
      { id: '1', name: 'John Doe', phone: '+972501234567', tenant_id: '1' },
      { id: '2', name: 'Jane Smith', phone: '+972502345678', tenant_id: '1' }
    ],
    templates: [
      { 
        id: '1', 
        name: 'ברכת יום הולדת', 
        content: 'שלום {{name}}, מאחלים לך יום הולדת שמח! 🎉',
        tenant_id: '1'
      }
    ],
    messages: []
  };
  
  return mockData[table] || [];
}

// Hook לשימוש ב-React components
import { useEffect, useState } from 'react';

export function useSupabase() {
  const [client, setClient] = useState(() => createSupabaseClient());
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    // בדיקת חיבור
    const checkConnection = async () => {
      try {
        const { error } = await client.from('tenants').select('count').limit(1);
        if (error) throw error;
        setIsReady(true);
      } catch (error) {
        console.warn('Supabase connection issue, using mock:', error);
        setClient(createMockClient() as any);
        setIsReady(true);
      }
    };
    
    checkConnection();
  }, []);
  
  return { client, isReady };
}

// Utility functions
export async function safeSupabaseCall<T>(
  operation: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  try {
    return await operation();
  } catch (error) {
    console.error('Supabase operation failed:', error);
    return { data: null, error };
  }
}