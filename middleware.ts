import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // דפים מוגנים
  const protectedPaths = ['/admin'];
  const pathname = request.nextUrl.pathname;
  
  const isProtectedPath = protectedPaths.some(path => 
    pathname.startsWith(path)
  );

  // אם זה דף מוגן (חוץ מדף ההגדרות הראשון)
  if (isProtectedPath && pathname !== '/admin/settings') {
    const token = request.cookies.get('auth-token');
    
    if (!token) {
      const url = new URL('/login', request.url);
      return NextResponse.redirect(url);
    }

    try {
      // בדיקה בסיסית של הטוקן
      const parts = token.value.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token');
      }
      
      const payload = JSON.parse(atob(parts[1]));
      
      // בדיקת תאריך תפוגה של המשתמש
      if (payload.expiryDate) {
        const expiryDate = new Date(payload.expiryDate);
        if (expiryDate < new Date()) {
          const url = new URL('/login?expired=true', request.url);
          const response = NextResponse.redirect(url);
          response.cookies.delete('auth-token');
          return response;
        }
      }
      
      // בדיקת תפוגת הטוקן עצמו
      if (payload.exp && payload.exp < Date.now()) {
        const url = new URL('/login', request.url);
        const response = NextResponse.redirect(url);
        response.cookies.delete('auth-token');
        return response;
      }
      
      return NextResponse.next();
    } catch (error) {
      const url = new URL('/login', request.url);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico).*)'
  ]
};
