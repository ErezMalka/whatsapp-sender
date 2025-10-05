import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  console.log('Middleware: Processing path:', request.nextUrl.pathname);
  
  // קבלת הטוקן מה-cookies
  const token = request.cookies.get('auth-token');
  console.log('Middleware: Token exists:', !!token);
  
  // נתיבים ציבוריים שלא דורשים אימות
  const publicPaths = [
    '/login',
    '/test',
    '/api/auth/login',
    '/api/auth/register',
    '/_next',
    '/favicon.ico'
  ];
  
  const isPublicPath = publicPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );
  
  console.log('Middleware: Is public path:', isPublicPath);

  // אם זה נתיב ציבורי - תן לעבור
  if (isPublicPath) {
    // אם המשתמש מחובר ומנסה לגשת לדף login
    if (token && request.nextUrl.pathname === '/login') {
      console.log('Middleware: User logged in, redirecting to dashboard');
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // אם אין טוקן - הפנה להתחברות
  if (!token) {
    console.log('Middleware: No token, redirecting to login');
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // יש טוקן - תן לעבור
  console.log('Middleware: Token found, allowing access');
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/webhooks (webhook endpoints)  
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api/webhooks|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.webp$).*)',
  ],
};
