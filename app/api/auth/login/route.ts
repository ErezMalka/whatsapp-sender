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
