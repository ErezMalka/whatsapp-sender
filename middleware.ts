import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // רשימת דפים מוגנים
  const protectedPaths = ['/admin'];
  
  // בדיקה אם זה דף מוגן
  const isProtectedPath = protectedPaths.some(path => 
    pathname.startsWith(path)
  );

  // אם זה דף מוגן (אבל לא דף ההגדרות עצמו)
  if (isProtectedPath && pathname !== '/admin/settings') {
    const token = request.cookies.get('auth-token');
    
    // אם אין טוקן - שלח להתחברות
    if (!token) {
      console.log('No token found, redirecting to login');
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      // פענוח הטוקן
      const decoded = JSON.parse(
        Buffer.from(token.value, 'base64').toString()
      );
      
      // בדיקת תוקף
      const expiryDate = new Date(decoded.expiryDate);
      if (expiryDate < new Date()) {
        console.log('User subscription expired');
        const response = NextResponse.redirect(new URL('/login?expired=true', request.url));
        response.cookies.delete('auth-token');
        return response;
      }
      
      console.log('User authenticated:', decoded.username);
      return NextResponse.next();
      
    } catch (error) {
      console.error('Token validation error:', error);
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*']
};
