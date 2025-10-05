import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  // רענון הסשן
  const { data: { session } } = await supabase.auth.getSession();
  
  // נתיבים מוגנים
  const protectedPaths = ['/admin', '/dashboard'];
  const isProtectedPath = protectedPaths.some(path => 
    req.nextUrl.pathname.startsWith(path)
  );
  
  // נתיבים פומביים
  const publicPaths = ['/login', '/register', '/reset-password'];
  const isPublicPath = publicPaths.some(path => 
    req.nextUrl.pathname.startsWith(path)
  );
  
  // אם זה נתיב מוגן ואין סשן - הפנה להתחברות
  if (isProtectedPath && !session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  // אם יש סשן ומנסה לגשת לדף התחברות - הפנה לדשבורד
  if (isPublicPath && session) {
    return NextResponse.redirect(new URL('/admin/dashboard', req.url));
  }
  
  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
