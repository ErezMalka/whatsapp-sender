# עדכון קובץ `/lib/supabase.ts`

**החלף את הקובץ הקיים עם הגרסה המורחבת הזו:**

```typescript
import { createClient } from '@supabase/supabase-js';

// הדפס לקונסול לצורך דיבוג (תמחק בפרודקשן)
if (typeof window !== 'undefined') {
  console.log('Supabase URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Supabase Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!');
  console.error('URL:', supabaseUrl);
  console.error('Key exists:', !!supabaseAnonKey);
}

// יצירת הלקוח - גם אם אין מפתחות (למניעת שגיאות build)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// ייצוא טיפוסים
export type { User as SupabaseUser, Session } from '@supabase/supabase-js';

// טיפוס למשתמש במערכת שלנו
export interface AppUser {
  id: string;
  username: string;
  password?: string;
  role: 'super-admin' | 'admin' | 'user';
  expiry_date: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// פונקציות ניהול משתמשים
export const usersDB = {
  // מביא את כל המשתמשים
  async getAllUsers(): Promise<AppUser[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching users:', error);
        return [];
      }
      
      // מחזיר בלי סיסמאות
      return (data || []).map(u => ({ ...u, password: undefined }));
    } catch (error) {
      console.error('getAllUsers error:', error);
      return [];
    }
  },

  // מוצא משתמש לפי username
  async findByUsername(username: string): Promise<AppUser | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();
      
      if (error) {
        console.error('Error finding user:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('findByUsername error:', error);
      return null;
    }
  },

  // אימות משתמש
  async authenticate(username: string, password: string): Promise<AppUser | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();
      
      if (error || !data) {
        console.log('Authentication failed for:', username);
        return null;
      }
      
      // בדיקות נוספות
      if (!data.is_active) {
        console.log('User is not active:', username);
        return null;
      }
      
      const expiryDate = new Date(data.expiry_date);
      if (expiryDate < new Date()) {
        console.log('User subscription expired:', username);
        return null;
      }
      
      console.log('Authentication successful for:', username);
      return { ...data, password: undefined };
    } catch (error) {
      console.error('authenticate error:', error);
      return null;
    }
  },

  // יצירת משתמש חדש
  async createUser(userData: {
    username: string;
    password: string;
    role: string;
    expiry_date: string;
    is_active: boolean;
  }): Promise<AppUser | null> {
    try {
      // בדיקה אם המשתמש קיים
      const existing = await this.findByUsername(userData.username);
      if (existing) {
        console.error('User already exists:', userData.username);
        return null;
      }

      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating user:', error);
        return null;
      }
      
      console.log('User created successfully:', userData.username);
      return { ...data, password: undefined };
    } catch (error) {
      console.error('createUser error:', error);
      return null;
    }
  },

  // עדכון משתמש
  async updateUser(id: string, updates: Partial<AppUser>): Promise<AppUser | null> {
    try {
      // המרת שדות אם צריך
      const dbUpdates: any = {};
      if (updates.username !== undefined) dbUpdates.username = updates.username;
      if (updates.password !== undefined) dbUpdates.password = updates.password;
      if (updates.role !== undefined) dbUpdates.role = updates.role;
      if (updates.expiry_date !== undefined) dbUpdates.expiry_date = updates.expiry_date;
      if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;

      const { data, error } = await supabase
        .from('users')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating user:', error);
        return null;
      }
      
      console.log('User updated successfully:', id);
      return { ...data, password: undefined };
    } catch (error) {
      console.error('updateUser error:', error);
      return null;
    }
  },

  // מחיקת משתמש
  async deleteUser(id: string): Promise<boolean> {
    try {
      // בדיקה שלא מוחקים super-admin
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', id)
        .single();
      
      if (user?.role === 'super-admin') {
        console.error('Cannot delete super-admin');
        return false;
      }
      
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting user:', error);
        return false;
      }
      
      console.log('User deleted successfully:', id);
      return true;
    } catch (error) {
      console.error('deleteUser error:', error);
      return false;
    }
  },

  // בדיקת חיבור ל-Supabase
  async testConnection(): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error('Supabase connection test failed:', error);
        return false;
      }
      
      console.log('Supabase connected! Users count:', count);
      return true;
    } catch (error) {
      console.error('testConnection error:', error);
      return false;
    }
  }
};
```

## שאר הקבצים נשארים כמו שהגדרתי למעלה:

### קבצים לעדכון/יצירה:
1. ✅ `/lib/supabase.ts` - **עדכון עם הקוד למעלה**
2. `/app/api/auth/login/route.ts` - מהארטיפקט הקודם
3. `/app/api/users/route.ts` - מהארטיפקט הקודם
4. `/app/api/users/[id]/route.ts` - מהארטיפקט הקודם

## בדיקה שהחיבור עובד:

### צור קובץ בדיקה: `/app/api/test-db/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { usersDB } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  // בדיקת חיבור
  const connected = await usersDB.testConnection();
  
  if (!connected) {
    return NextResponse.json({ 
      error: 'Failed to connect to Supabase',
      hint: 'Check your environment variables'
    }, { status: 500 });
  }
  
  // מביא משתמשים
  const users = await usersDB.getAllUsers();
  
  return NextResponse.json({
    status: 'Connected to Supabase!',
    usersCount: users.length,
    users: users.map(u => ({
      username: u.username,
      role: u.role,
      active: u.is_active,
      expiryDate: u.expiry_date
    }))
  });
}
```

## איך לבדוק:

1. **פתח בדפדפן:**
   ```
   http://localhost:3000/api/test-db
   ```

2. **אתה צריך לראות:**
   ```json
   {
     "status": "Connected to Supabase!",
     "usersCount": 3,
     "users": [...]
   }
   ```

3. **אם יש שגיאה:**
   - בדוק את ה-`.env.local`
   - בדוק שהרצת את ה-SQL ב-Supabase
   - בדוק את המפתחות

זהו! עכשיו יש לך מערכת משתמשים מלאה עם Supabase! 🚀
