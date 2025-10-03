import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { usersStore } from '@/lib/users-store';
import { activityLogger } from '@/lib/activity-logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Log login attempt
    activityLogger.log({
      action: 'login_attempt',
      details: `Login attempt for user: ${username}`,
      timestamp: new Date().toISOString()
    });

    // Validate user credentials using validateCredentials (not authenticate)
    const user = usersStore.validateCredentials(username, password);
    
    if (!user) {
      // Log failed login attempt
      activityLogger.log({
        action: 'login_failed',
        details: `Failed login attempt for user: ${username}`,
        timestamp: new Date().toISOString()
      });

      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create session token (in production, use JWT or similar)
    const sessionToken = Buffer.from(JSON.stringify({
      userId: user.id,
      username: user.username,
      role: user.role,
      timestamp: Date.now()
    })).toString('base64');

    // Set cookie
    cookies().set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    // Log successful login
    activityLogger.log({
      action: 'login_success',
      userId: user.id,
      details: `User ${username} logged in successfully`,
      timestamp: new Date().toISOString()
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
    
    // Log error
    activityLogger.log({
      action: 'login_error',
      details: `Login error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
