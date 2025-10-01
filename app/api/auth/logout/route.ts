import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    console.log('User logging out');
    
    const response = NextResponse.json({ 
      success: true,
      message: 'Logged out successfully',
      timestamp: new Date().toISOString()
    });
    
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(0),
      path: '/'
    });
    
    console.log('Logout successful, cookie cleared');
    return response;
    
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST method to logout',
    endpoint: '/api/auth/logout',
    method: 'POST'
  });
}
