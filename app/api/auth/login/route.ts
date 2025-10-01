import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { usersStore } from '@/lib/users-store';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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

    // יצירת JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

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

    // הגדרת cookie עם JWT
    response.cookies.set({
      name: 'auth-token',
      value: token,
      httpOnly: true,
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
