import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // דפים מוגנים
  const protectedPaths = ['/admin'];
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );

  // אם זה דף מוגן אבל לא דף הגדרות
  if (isProtectedPath && !request.nextUrl.pathname.startsWith('/admin/settings')) {
    const token = request.cookies.get('auth-token');
    
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      // בדיקה בסיסית של הטוקן
      const tokenData = JSON.parse(atob(token.value.split('.')[1]));
      
      // בדיקת תאריך תפוגה
      const expiryDate = new Date(tokenData.expiryDate);
      if (expiryDate < new Date()) {
        const response = NextResponse.redirect(new URL('/login?expired=true', request.url));
        response.cookies.delete('auth-token');
        return response;
      }
      
      return NextResponse.next();
    } catch (error) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*']
};
