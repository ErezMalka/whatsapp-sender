import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // דפים שלא דורשים התחברות
  const publicPaths = [
    '/login',
    '/api/auth/login',
    '/api/auth/logout',
    '/api/test-db',
    '/api/test-connection',
    '/api/test-supabase-users'
  ];
  
  // בדיקה אם זה דף ציבורי
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  
  // אם זה דף ציבורי - תן לעבור
  if (isPublicPath) {
    return NextResponse.next();
  }
  
  // רשימת דפים מוגנים
  const protectedPaths = ['/admin', '/'];
  
  // בדיקה אם זה דף מוגן
  const isProtectedPath = protectedPaths.some(path => 
    pathname === path || pathname.startsWith('/admin')
  );
  
  // אם זה דף מוגן
  if (isProtectedPath) {
    // חפש את ה-session cookie החדש
    const sessionCookie = request.cookies.get('session');
    
    // אם אין session - שלח להתחברות
    if (!sessionCookie) {
      console.log('No session found, redirecting to login');
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    try {
      // פענוח ה-session
      const session = JSON.parse(sessionCookie.value);
      
      // בדיקת תוקף
      const expiresAt = new Date(session.expiresAt);
      if (expiresAt < new Date()) {
        console.log('Session expired');
        const response = NextResponse.redirect(new URL('/login?expired=true', request.url));
        response.cookies.delete('session');
        return response;
      }
      
      // בדיקה נוספת לתוקף המשתמש (לא חובה)
      // אפשר להוסיף כאן בדיקה נוספת מול הדאטאבייס אם רוצים
      
      console.log('User authenticated:', session.username);
      return NextResponse.next();
      
    } catch (error) {
      console.error('Session validation error:', error);
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('session');
      return response;
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.).*)',
  ]
};
