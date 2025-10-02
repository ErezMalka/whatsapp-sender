import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get session from cookie
    const cookieHeader = request.headers.get('cookie');
    
    if (!cookieHeader || !cookieHeader.includes('session=')) {
      return NextResponse.json(
        { message: 'לא מחובר' },
        { status: 401 }
      );
    }

    // Parse session from cookie
    let session;
    try {
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map(c => c.split('='))
      );
      
      if (!cookies.session) {
        return NextResponse.json(
          { message: 'לא מחובר' },
          { status: 401 }
        );
      }

      session = JSON.parse(decodeURIComponent(cookies.session));
    } catch (e) {
      return NextResponse.json(
        { message: 'סשן לא תקין' },
        { status: 401 }
      );
    }

    // Return user data
    return NextResponse.json({
      user: {
        id: session.userId,
        username: session.username,
        role: session.role
      }
    });
  } catch (error) {
    console.error('Auth check error:', error);
    
    return NextResponse.json(
      { message: 'שגיאת שרת פנימית' },
      { status: 500 }
    );
  }
}
