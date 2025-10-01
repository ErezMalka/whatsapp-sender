import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { usersStore } from '@/lib/users-store';

// פונקציה פשוטה ליצירת טוקן
function generateToken(userId: string, username: string, role: string): string {
  const payload = {
    userId,
    username,
    role,
    timestamp: Date.now(),
    random: crypto.randomBytes(16).toString('hex')
  };
  
  // יצירת טוקן פשוט - בפרודקשן כדאי להשתמש ב-JWT אמיתי
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'שם משתמש וסיסמה נדרשים' },
        { status: 400 }
      );
    }

    // שימוש ב-usersStore לאימות
    const user = usersStore.authenticate(username, password);

    if (!user) {
      return NextResponse.json(
        { error: 'שם משתמש או סיסמה שגויים' },
        { status: 401 }
      );
    }

    // בדיקה אם המשתמש פעיל
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'החשבון אינו פעיל' },
        { status: 403 }
      );
    }

    // בדיקת תוקף החשבון
    const expiryDate = new Date(user.expiryDate);
    if (expiryDate < new Date()) {
      return NextResponse.json(
        { error: 'תוקף החשבון פג' },
        { status: 403 }
      );
    }

    // יצירת token פשוט
    const token = generateToken(user.id, user.username, user.role);

    // יצירת response עם cookie
    const response = NextResponse.json(
      { 
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          expiryDate: user.expiryDate
        }
      },
      { status: 200 }
    );

    // הגדרת cookie עם הטוקן
    response.cookies.set({
      name: 'auth-token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400, // 24 hours
      path: '/'
    });

    // שמירת פרטי המשתמש ב-cookie נוסף לשימוש בצד הלקוח
    response.cookies.set({
      name: 'user-info',
      value: JSON.stringify({
        id: user.id,
        username: user.username,
        role: user.role
      }),
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400, // 24 hours
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'שגיאה בתהליך ההתחברות' },
      { status: 500 }
    );
  }
}
