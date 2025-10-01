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
