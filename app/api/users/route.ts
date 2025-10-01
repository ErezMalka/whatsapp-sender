import { NextRequest, NextResponse } from 'next/server';
import { usersStore } from '@/lib/users-store';

// Middleware לבדיקת הרשאות
async function checkAdminAuth(request: NextRequest): Promise<boolean> {
  try {
    const authToken = request.cookies.get('auth-token');
    if (!authToken) return false;

    // בדיקה בסיסית של הטוקן
    const tokenData = JSON.parse(
      Buffer.from(authToken.value, 'base64').toString('utf8')
    );
    
    // בדיקה שהמשתמש הוא admin או superadmin
    return tokenData.role === 'admin' || tokenData.role === 'superadmin';
  } catch (error) {
    console.error('Auth check error:', error);
    return false;
  }
}

// GET - קבלת רשימת משתמשים
export async function GET(request: NextRequest) {
  try {
    // בדיקת הרשאות
    const isAdmin = await checkAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'אין הרשאה' },
        { status: 403 }
      );
    }

    // קבלת כל המשתמשים מה-store
    const users = usersStore.getAll();
    
    // הסרת סיסמאות מהתגובה
    const safeUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      role: user.role,
      expiryDate: user.expiryDate,
      isActive: user.isActive,
      createdAt: user.createdAt
    }));

    return NextResponse.json(safeUsers, { status: 200 });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'שגיאה בקבלת המשתמשים' },
      { status: 500 }
    );
  }
}

// POST - יצירת משתמש חדש
export async function POST(request: NextRequest) {
  try {
    // בדיקת הרשאות
    const isAdmin = await checkAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'אין הרשאה' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, password, role, expiryDate } = body;

    // וידוא שכל השדות קיימים
    if (!username || !password || !role || !expiryDate) {
      return NextResponse.json(
        { error: 'כל השדות נדרשים' },
        { status: 400 }
      );
    }

    // בדיקה אם שם המשתמש כבר קיים
    const existingUser = usersStore.findByUsername(username);
    if (existingUser) {
      return NextResponse.json(
        { error: 'שם המשתמש כבר קיים' },
        { status: 409 }
      );
    }

    // יצירת המשתמש החדש
    const newUser = usersStore.create({
      username,
      password,
      role,
      expiryDate,
      isActive: true
    });

    // החזרת המשתמש החדש ללא הסיסמה
    const safeUser = {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      expiryDate: newUser.expiryDate,
      isActive: newUser.isActive,
      createdAt: newUser.createdAt
    };

    return NextResponse.json(
      { 
        message: 'המשתמש נוצר בהצלחה',
        user: safeUser 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'שגיאה ביצירת המשתמש' },
      { status: 500 }
    );
  }
}
