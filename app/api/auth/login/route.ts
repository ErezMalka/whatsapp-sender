import { NextResponse } from 'next/server';

// מגדיר את הראוט כדינמי
export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ 
    success: true,
    message: 'Logged out successfully' 
  });
  
  // מחיקת ה-cookie
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/'
  });
  
  return response;
}
