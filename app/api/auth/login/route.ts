# תיקון קובץ `/app/api/auth/login/route.ts`

**החלף את הקובץ עם הגרסה המתוקנת:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { usersDB } from '@/lib/supabase';

// מגדיר את הראוט כדינמי
export const dynamic = 'force-dynamic';

// טיפוס למשתמש
interface User {
  id: string;
  username: string;
  password?: string;
  role: string;
  expiryDate: string;
  isActive: boolean;
}

// טיפוס למשתמש בתצוגה
interface UserDisplay {
  username: string;
  role: string;
  active: boolean;
  hint?: string;
  source: string;
}

// משתמשים קבועים (כגיבוי אם Supabase לא זמין)
const FALLBACK_USERS: User[] = [
  {
    id: '1',
    username: 'superadmin',
    password: 'super123',
    role: 'super-admin',
    expiryDate: '2030-12-31',
    isActive: true
  },
  {
    id: '2',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    expiryDate: '2030-12-31',
    isActive: true
  },
  {
    id: '3',
    username: 'erez',
    password: '1234',
    role: 'user',
    expiryDate: '2025-10-10',
    isActive: true
  }
];

// בדיקה אם Supabase זמין
async function isSupabaseConnected(): Promise<boolean> {
  try {
    // בדיקה אם יש מפתחות
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return false;
    }
    
    // בדיקת חיבור
    const connected = await usersDB.testConnection();
    return connected;
  } catch (error) {
    console.error('Supabase connection check failed:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;
    
    console.log('Login attempt for:', username);

    let user: User | null = null;
    let source = 'fallback';

    // נסה קודם עם Supabase
    const supabaseConnected = await isSupabaseConnected();
    
    if (supabaseConnected) {
      console.log('Trying Supabase authentication...');
      const supabaseUser = await usersDB.authenticate(username, password);
      
      if (supabaseUser) {
        user = {
          id: supabaseUser.id,
          username: supabaseUser.username,
          role: supabaseUser.role,
          expiryDate: supabaseUser.expiry_date,
          isActive: supabaseUser.is_active
        };
        source = 'supabase';
        console.log('User authenticated via Supabase');
      }
    } else {
      console.log('Supabase not connected, using fallback users');
    }

    // אם לא מצאנו ב-Supabase, נסה עם המשתמשים הקבועים
    if (!user) {
      const fallbackUser = FALLBACK_USERS.find(u => 
        u.username === username && u.password === password
      );
      
      if (fallbackUser) {
        user = fallbackUser;
        source = 'fallback';
        console.log('User authenticated via fallback list');
      }
    }

    // אם לא מצאנו בכלל
    if (!user) {
      console.log('Authentication failed for:', username);
      return NextResponse.json(
        { error: 'שם משתמש או סיסמה שגויים' },
        { status: 401 }
      );
    }

    // בדיקת תאריך תפוגה
    const expiryDate = new Date(user.expiryDate);
    const today = new Date();
    
    if (expiryDate < today) {
      return NextResponse.json(
        { error: 'המנוי פג תוקף' },
        { status: 403 }
      );
    }

    // בדיקה אם פעיל
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'החשבון אינו פעיל' },
        { status: 403 }
      );
    }

    // יצירת טוקן
    const token = Buffer.from(JSON.stringify({
      userId: user.id,
      username: user.username,
      role: user.role,
      expiryDate: user.expiryDate,
      timestamp: Date.now(),
      source: source
    })).toString('base64');

    const response = NextResponse.json({ 
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        expiryDate: user.expiryDate
      },
      source: source
    });

    // הגדרת cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    console.log(`Login successful for: ${username} (source: ${source})`);
    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'שגיאת שרת' },
      { status: 500 }
    );
  }
}

// GET endpoint לבדיקה
export async function GET() {
  try {
    const supabaseConnected = await isSupabaseConnected();
    let supabaseUsers: UserDisplay[] = [];
    
    if (supabaseConnected) {
      const users = await usersDB.getAllUsers();
      supabaseUsers = users.map(u => ({
        username: u.username,
        role: u.role,
        active: u.is_active,
        source: 'supabase'
      }));
    }

    const fallbackUsersFormatted: UserDisplay[] = FALLBACK_USERS.map(u => ({
      username: u.username,
      role: u.role,
      active: u.isActive,
      hint: `Password: ${u.password}`,
      source: 'fallback'
    }));

    return NextResponse.json({ 
      message: 'Auth API is working',
      supabase: {
        connected: supabaseConnected,
        usersCount: supabaseUsers.length,
        users: supabaseUsers
      },
      fallback: {
        available: true,
        usersCount: FALLBACK_USERS.length,
        users: fallbackUsersFormatted
      },
      summary: supabaseConnected 
        ? '✅ Using Supabase (fallback available)' 
        : '⚠️ Using fallback users (Supabase not connected)'
    });
  } catch (error) {
    console.error('GET /api/auth/login error:', error);
    return NextResponse.json({ 
      message: 'Auth API error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

## 🔧 מה תוקן:

1. **הוספתי טיפוסים מפורשים:**
   - `interface User` - למשתמש
   - `interface UserDisplay` - למשתמש בתצוגה
   - `User[]` ל-FALLBACK_USERS
   - `UserDisplay[]` ל-supabaseUsers

2. **תיקנתי את השגיאה בשורה 171:**
   ```typescript
   // לפני:
   let supabaseUsers = [];
   
   // אחרי:
   let supabaseUsers: UserDisplay[] = [];
   ```

3. **הוספתי טיפוסים לכל המקומות הרלוונטיים**

## ✅ עכשיו תנסה שוב:

```bash
npm run build
```

זה אמור לעבור! 

אם עדיין יש שגיאות - שלח לי אותן ונתקן 🚀
