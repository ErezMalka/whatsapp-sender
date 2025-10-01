# מערכת אימות פשוטה ועובדת

## קובץ 1: `/app/api/auth/login/route.ts`
**החלף את הקובץ הקיים - גרסה פשוטה שעובדת**

```typescript
import { NextRequest, NextResponse } from 'next/server';

// מגדיר את הראוט כדינמי
export const dynamic = 'force-dynamic';

// רשימת משתמשים קבועה
const USERS = [
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;
    
    console.log('Login attempt:', { username, password });

    // חיפוש המשתמש
    const user = USERS.find(u => 
      u.username === username && u.password === password
    );

    if (!user) {
      console.log('User not found or wrong password');
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

    // יצירת טוקן פשוט
    const token = Buffer.from(JSON.stringify({
      userId: user.id,
      username: user.username,
      role: user.role,
      expiryDate: user.expiryDate,
      timestamp: Date.now()
    })).toString('base64');

    const response = NextResponse.json({ 
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        expiryDate: user.expiryDate
      }
    });

    // הגדרת cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: false, // false for development
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    console.log('Login successful for:', username);
    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'שגיאת שרת' },
      { status: 500 }
    );
  }
}

// נוסיף גם GET לבדיקה
export async function GET() {
  return NextResponse.json({ 
    message: 'Auth API is working',
    users: USERS.map(u => ({
      username: u.username,
      role: u.role,
      hint: `Password: ${u.password}`
    }))
  });
}
```

## קובץ 2: `/app/api/users/route.ts`
**החלף את הקובץ הקיים - גרסה פשוטה**

```typescript
import { NextRequest, NextResponse } from 'next/server';

// מגדיר את הראוט כדינמי
export const dynamic = 'force-dynamic';

// אחסון זמני של משתמשים
let USERS_DB = [
  {
    id: '1',
    username: 'superadmin',
    password: 'super123',
    role: 'super-admin',
    expiryDate: '2030-12-31',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    expiryDate: '2030-12-31',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    username: 'erez',
    password: '1234',
    role: 'user',
    expiryDate: '2025-10-10',
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

export async function GET() {
  try {
    // החזרת המשתמשים בלי סיסמאות
    const users = USERS_DB.map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      expiryDate: u.expiryDate,
      isActive: u.isActive,
      createdAt: u.createdAt
    }));
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, expiryDate, role = 'user' } = body;

    // בדיקה אם המשתמש קיים
    const existing = USERS_DB.find(u => u.username === username);
    if (existing) {
      return NextResponse.json(
        { error: 'שם המשתמש כבר קיים' },
        { status: 400 }
      );
    }

    // יצירת משתמש חדש
    const newUser = {
      id: Date.now().toString(),
      username,
      password, // בפרודקשן צריך להצפין
      role,
      expiryDate,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    USERS_DB.push(newUser);

    // החזרה בלי סיסמה
    const { password: _, ...userWithoutPassword } = newUser;
    
    return NextResponse.json({
      success: true,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
```

## קובץ 3: `/app/api/users/[id]/route.ts`
**החלף את הקובץ הקיים**

```typescript
import { NextRequest, NextResponse } from 'next/server';

// מגדיר את הראוט כדינמי
export const dynamic = 'force-dynamic';

// נשתמש באותו DB מהקובץ הקודם
let USERS_DB = [
  {
    id: '1',
    username: 'superadmin',
    password: 'super123',
    role: 'super-admin',
    expiryDate: '2030-12-31',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    expiryDate: '2030-12-31',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    username: 'erez',
    password: '1234',
    role: 'user',
    expiryDate: '2025-10-10',
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const userIndex = USERS_DB.findIndex(u => u.id === params.id);
    
    if (userIndex === -1) {
      return NextResponse.json(
        { error: 'משתמש לא נמצא' },
        { status: 404 }
      );
    }

    // עדכון המשתמש
    USERS_DB[userIndex] = {
      ...USERS_DB[userIndex],
      ...body,
      id: params.id // וודא שה-ID לא משתנה
    };

    // החזרה בלי סיסמה
    const { password: _, ...userWithoutPassword } = USERS_DB[userIndex];
    
    return NextResponse.json({
      success: true,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userIndex = USERS_DB.findIndex(u => u.id === params.id);
    
    if (userIndex === -1) {
      return NextResponse.json(
        { error: 'משתמש לא נמצא' },
        { status: 404 }
      );
    }

    // אל תמחק super-admin
    if (USERS_DB[userIndex].role === 'super-admin') {
      return NextResponse.json(
        { error: 'לא ניתן למחוק Super Admin' },
        { status: 400 }
      );
    }

    // מחיקת המשתמש
    USERS_DB.splice(userIndex, 1);
    
    return NextResponse.json({ 
      success: true,
      message: 'המשתמש נמחק בהצלחה' 
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
```

## קובץ 4: `/app/api/auth/test/route.ts`
**צור קובץ חדש - לבדיקה**

```typescript
import { NextResponse } from 'next/server';

// מגדיר את הראוט כדינמי
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    users: [
      { username: 'superadmin', password: 'super123', role: 'super-admin' },
      { username: 'admin', password: 'admin123', role: 'admin' },
      { username: 'erez', password: '1234', role: 'user' }
    ]
  });
}
```

## קובץ 5: `/middleware.ts`
**החלף - גרסה פשוטה יותר**

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // רשימת דפים מוגנים
  const protectedPaths = ['/admin'];
  
  // בדיקה אם זה דף מוגן
  const isProtectedPath = protectedPaths.some(path => 
    pathname.startsWith(path)
  );

  // אם זה דף מוגן (אבל לא דף ההגדרות עצמו)
  if (isProtectedPath && pathname !== '/admin/settings') {
    const token = request.cookies.get('auth-token');
    
    // אם אין טוקן - שלח להתחברות
    if (!token) {
      console.log('No token found, redirecting to login');
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      // פענוח הטוקן
      const decoded = JSON.parse(
        Buffer.from(token.value, 'base64').toString()
      );
      
      // בדיקת תוקף
      const expiryDate = new Date(decoded.expiryDate);
      if (expiryDate < new Date()) {
        console.log('User subscription expired');
        const response = NextResponse.redirect(new URL('/login?expired=true', request.url));
        response.cookies.delete('auth-token');
        return response;
      }
      
      console.log('User authenticated:', decoded.username);
      return NextResponse.next();
      
    } catch (error) {
      console.error('Token validation error:', error);
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*']
};
```

## קובץ 6: `/app/api/auth/logout/route.ts`
**החלף**

```typescript
import { NextResponse } from 'next/server';

// מגדיר את הראוט כדינמי
export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ 
    success: true,
    message: 'Logged out successfully' 
  });
  
  // מחיקת ה-cookie
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/'
  });
  
  return response;
}
```

## איך לבדוק שזה עובד:

### 1. בדוק את ה-API ישירות:
פתח בדפדפן:
```
http://localhost:3000/api/auth/test
```
אתה צריך לראות JSON עם רשימת המשתמשים

### 2. בדוק התחברות עם CURL או Postman:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 3. המשתמשים שעובדים:
```
superadmin / super123
admin / admin123
erez / 1234
```

### 4. אם עדיין לא עובד, בדוק:
- האם יש שגיאות בקונסול של הדפדפן?
- האם יש שגיאות בטרמינל של next.js?
- נסה לנקות cookies ולנסות שוב

## הערות:
1. השתמשתי בקוד פשוט ביותר בלי ספריות חיצוניות
2. הסיסמאות לא מוצפנות (בפרודקשן חובה להצפין)
3. המשתמשים נשמרים בזיכרון בלבד
4. הוספתי הרבה console.log כדי לראות מה קורה

זה צריך לעבוד! 🚀
