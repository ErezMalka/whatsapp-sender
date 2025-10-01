import { NextRequest, NextResponse } from 'next/server';
import { usersDB, hashPassword } from '@/lib/users-db';

// מגדיר את הראוט כדינמי
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const users = await usersDB.findAll();
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
    const { username, password, expiryDate, role = 'user' } = await req.json();

    if (!username || !password || !expiryDate) {
      return NextResponse.json(
        { error: 'חסרים נתונים נדרשים' },
        { status: 400 }
      );
    }

    // בדיקה אם המשתמש קיים
    const existing = await usersDB.findByUsername(username);
    if (existing) {
      return NextResponse.json(
        { error: 'שם המשתמש כבר קיים במערכת' },
        { status: 400 }
      );
    }

    // הצפנת סיסמה
    const hashedPassword = await hashPassword(password);

    // יצירת משתמש חדש
    const user = await usersDB.create({
      username,
      password: hashedPassword,
      expiryDate,
      role: role as 'admin' | 'user',
      isActive: true
    });

    return NextResponse.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'שגיאה ביצירת משתמש' },
      { status: 500 }
    );
  }
}
