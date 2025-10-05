import { NextRequest, NextResponse } from 'next/server';

// משתמשים קבועים - אפשר לשנות לפי הצורך
const FIXED_USERS = [
  {
    id: '1',
    email: 'admin@test.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin'
  },
  {
    id: '2',
    email: 'test@test.com', 
    password: 'test123',
    name: 'Test User',
    role: 'user'
  },
  {
    id: '3',
    email: 'user@test.com',
    password: '1234',
    name: 'Regular User',
    role: 'user'
  }
];

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    // בדיקת שדות חובה
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // חיפוש המשתמש לפי אימייל וסיסמה
    const user = FIXED_USERS.find(
      u => u.email === email && u.password === password
    );

    if (!user) {
      console.log('Login attempt failed for:', email);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // הסרת הסיסמה מהאובייקט שנחזיר
    const { password: _, ...userWithoutPassword } = user;

    // יצירת אובייקט session פשוט
    const session = {
      user: userWithoutPassword,
      access_token: Buffer.from(`${user.id}:${Date.now()}`).toString('base64'),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 ימים
    };

    // הצלחה - החזרת המשתמש והסשן
    const response = NextResponse.json({
      user: userWithoutPassword,
      session: session,
      message: 'Login successful'
    });

    // הוספת cookie לאימות
    response.cookies.set({
      name: 'auth-token',
      value: session.access_token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 ימים
      path: '/'
    });

    console.log('Login successful for:', email);
    return response;

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// פונקציה לבדיקת סטטוס התחברות
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token');
    
    if (!token) {
      return NextResponse.json(
        { authenticated: false, message: 'No token found' },
        { status: 401 }
      );
    }

    // פענוח הטוקן
    try {
      const decoded = Buffer.from(token.value, 'base64').toString();
      const [userId, timestamp] = decoded.split(':');
      
      // בדיקה אם הטוקן עדיין תקף (7 ימים)
      const tokenAge = Date.now() - parseInt(timestamp);
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
      
      if (tokenAge > sevenDaysInMs) {
        return NextResponse.json(
          { authenticated: false, message: 'Token expired' },
          { status: 401 }
        );
      }

      // מציאת המשתמש
      const user = FIXED_USERS.find(u => u.id === userId);
      if (!user) {
        return NextResponse.json(
          { authenticated: false, message: 'User not found' },
          { status: 401 }
        );
      }

      const { password: _, ...userWithoutPassword } = user;
      
      return NextResponse.json({
        authenticated: true,
        user: userWithoutPassword
      });
      
    } catch (error) {
      return NextResponse.json(
        { authenticated: false, message: 'Invalid token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { authenticated: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
