import { NextResponse } from 'next/server';

// מגדיר את הראוט כדינמי
export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ 
    success: true,
    message: 'התנתקת בהצלחה' 
  });
  
  // מחיקת ה-cookie
  response.cookies.delete('auth-token');
  
  return response;
}
