import { NextRequest, NextResponse } from 'next/server';
import { usersDB } from '@/lib/users-db';

// מגדיר את הראוט כדינמי
export const dynamic = 'force-dynamic';

function generateToken(payload: any): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify({
    ...payload,
    iat: Date.now(),
    exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
  }));
  
  const signature = btoa('signature-' + encodedHeader + '.' + encodedPayload);
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'נא למלא את כל השדות' },
        { status: 400 }
      );
    }

    // אימות המשתמש
    const user = await usersDB.verifyPassword(username, password);

    if (!user) {
      return NextResponse.json(
        { error: 'שם משתמש או סיסמה שגויים' },
        { status: 401 }
      );
    }

    // בדיקת תאריך תפוגה
    const expiryDate = new Date(user.expiryDate);
    if (expiryDate < new Date()) {
      return NextResponse.json(
        { error: 'המנוי שלך פג תוקף. אנא צור קשר עם המנהל' },
        { status: 403 }
      );
    }

    // בדיקה אם המשתמש פעיל
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'החשבון שלך אינו פעיל. אנא צור קשר עם המנהל' },
        { status: 403 }
      );
    }

    // יצירת טוקן
    const token = generateToken({ 
      userId: user.id,
      username: user.username,
      role: user.role,
      expiryDate: user.expiryDate
    });

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
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'שגיאת שרת פנימית' },
      { status: 500 }
    );
  }
}
