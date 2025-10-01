import { NextRequest, NextResponse } from 'next/server';
import { usersStore } from '@/lib/users-store';

// Middleware לבדיקת הרשאות - גרסה מתוקנת
async function checkAdminAuth(request: NextRequest): Promise<boolean> {
  try {
    // ננסה לקרוא מה-cookie user-info קודם (לא httpOnly)
    const userInfo = request.cookies.get('user-info');
    if (userInfo) {
      try {
        const userData = JSON.parse(userInfo.value);
        console.log('User from cookie:', userData);
        return userData.role === 'admin' || userData.role === 'superadmin';
      } catch (e) {
        console.error('Error parsing user-info cookie:', e);
      }
    }

    // אם לא הצליח, ננסה את auth-token
    const authToken = request.cookies.get('auth-token');
    if (!authToken) {
      console.log('No auth-token cookie found');
      return false;
    }

    try {
      // בדיקה בסיסית של הטוקן
      const tokenData = JSON.parse(
        Buffer.from(authToken.value, 'base64').toString('utf8')
      );
      console.log('Token data:', tokenData);
      return tokenData.role === 'admin' || tokenData.role === 'superadmin';
    } catch (error) {
      console.error('Error parsing auth token:', error);
      return false;
    }
  } catch (error) {
    console.error('Auth check error:', error);
    return false;
  }
}

// GET - קבלת רשימת משתמשים
export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/users - Checking auth...');
    
    // בדיקת הרשאות
    const isAdmin = await checkAdminAuth(request);
    console.log('Is admin?', isAdmin);
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'אין הרשאה' },
        { status: 403 }
      );
    }

    // קבלת כל המשתמשים מה-store
    const users = usersStore.getAll();
    console.log('Found users:', users.length);
    
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
    console.log('POST /api/users - Checking auth...');
    
    // בדיקת הרשאות
    const isAdmin = await checkAdminAuth(request);
    console.log('Is admin?', isAdmin);
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'אין הרשאה' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, password, role, expiryDate } = body;
    console.log('Creating user:', username);

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

    console.log('User created successfully:', newUser.id);

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
