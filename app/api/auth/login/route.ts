import { NextRequest, NextResponse } from 'next/server';
import { serialize } from 'cookie';
import { userStore } from '@/lib/users-store';
import { activityLogger } from '@/lib/activity-logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      // Log failed attempt due to missing credentials
      await activityLogger.logWithRequest(request, {
        username: username || 'unknown',
        action: 'login_failed',
        details: { reason: 'Missing credentials' }
      });

      return NextResponse.json(
        { message: 'נדרש שם משתמש וסיסמה' },
        { status: 400 }
      );
    }

    // Validate user credentials
    const user = await userStore.validateUser(username, password);
    
    if (!user) {
      // Log failed login attempt
      await activityLogger.logWithRequest(request, {
        username,
        action: 'login_failed',
        details: { reason: 'Invalid credentials' }
      });

      return NextResponse.json(
        { message: 'שם משתמש או סיסמה שגויים' },
        { status: 401 }
      );
    }

    // Check if user account is active
    if (!user.is_active) {
      // Log failed login due to inactive account
      await activityLogger.logWithRequest(request, {
        user_id: user.id,
        username: user.username,
        action: 'login_failed',
        details: { reason: 'Account inactive' }
      });

      return NextResponse.json(
        { message: 'החשבון אינו פעיל' },
        { status: 403 }
      );
    }

    // Check if account has expired
    if (user.expiry_date && new Date(user.expiry_date) < new Date()) {
      // Log failed login due to expired account
      await activityLogger.logWithRequest(request, {
        user_id: user.id,
        username: user.username,
        action: 'login_failed',
        details: { 
          reason: 'Account expired',
          expiry_date: user.expiry_date
        }
      });

      return NextResponse.json(
        { message: 'החשבון פג תוקף' },
        { status: 403 }
      );
    }

    // Create session data
    const sessionData = {
      userId: user.id,
      username: user.username,
      role: user.role,
      loginTime: new Date().toISOString()
    };

    // Create session cookie
    const sessionCookie = serialize('session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/'
    });

    // Log successful login
    await activityLogger.logWithRequest(request, {
      user_id: user.id,
      username: user.username,
      action: 'login',
      details: {
        role: user.role,
        login_time: sessionData.loginTime
      }
    });

    // Return success response with cookie
    const response = NextResponse.json(
      { 
        message: 'התחברות הצליחה',
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      },
      { status: 200 }
    );

    response.headers.set('Set-Cookie', sessionCookie);
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    
    // Log system error
    await activityLogger.logWithRequest(request, {
      username: 'system',
      action: 'login_failed',
      details: { 
        reason: 'System error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });

    return NextResponse.json(
      { message: 'שגיאת שרת פנימית' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get session from cookie
    const cookieHeader = request.headers.get('cookie');
    let username = 'unknown';
    let userId = null;

    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map(c => c.split('='))
      );
      
      if (cookies.session) {
        try {
          const session = JSON.parse(decodeURIComponent(cookies.session));
          username = session.username;
          userId = session.userId;
        } catch (e) {
          console.error('Failed to parse session:', e);
        }
      }
    }

    // Clear session cookie
    const clearCookie = serialize('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    // Log logout
    await activityLogger.logWithRequest(request, {
      user_id: userId,
      username,
      action: 'logout',
      details: {
        logout_time: new Date().toISOString()
      }
    });

    const response = NextResponse.json(
      { message: 'יציאה הצליחה' },
      { status: 200 }
    );

    response.headers.set('Set-Cookie', clearCookie);
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    
    return NextResponse.json(
      { message: 'שגיאת שרת פנימית' },
      { status: 500 }
    );
  }
}
