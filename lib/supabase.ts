import { createClient } from '@supabase/supabase-js';

// הגדרת משתני הסביבה
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// בדיקה בסיסית שהמשתנים קיימים
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Warning: Supabase environment variables are not configured');
}

// יצירת הלקוח של Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ייצוא טיפוסים נוספים אם נדרש
export type { User, Session } from '@supabase/supabase-js';
