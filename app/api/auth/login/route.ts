import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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
    
    console.log('Login attempt:', { username });

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

    const expiryDate = new Date(user.expiryDate);
    const today = new Date();
    
    if (expiryDate < today) {
      return NextResponse.json(
        { error: 'המנוי פג תוקף' },
        { status: 403 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'החשבון אינו פעיל' },
        { status: 403 }
      );
    }

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

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
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
