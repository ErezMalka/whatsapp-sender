import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { usersStore } from '@/lib/users-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // אימות המשתמש
    const user = await usersStore.authenticate(username, password);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials or account inactive/expired' },
        { status: 401 }
      );
    }

    // יצירת session
    const session = {
      userId: user.id,
      username: user.username,
      role: user.role,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };

    // שמירת session ב-cookie
    cookies().set('session', JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
