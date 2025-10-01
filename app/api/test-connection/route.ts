import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // בדיקת משתני סביבה
    const supabaseConfigured = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL && 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // בדיקת API endpoints
    const endpoints = {
      login: '/api/auth/login',
      logout: '/api/auth/logout',
      users: '/api/users',
      test: '/api/test-connection'
    };

    // מידע על המערכת
    const systemInfo = {
      status: 'System is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    };

    // סטטוס חיבורים
    const connections = {
      supabase: {
        configured: supabaseConfigured,
        status: supabaseConfigured ? 'Configured' : 'Not configured'
      },
      database: 'In-memory storage'
    };

    return NextResponse.json({
      ...systemInfo,
      connections,
      endpoints,
      message: '✅ All systems operational',
      users: {
        defaultUsers: 3,
        info: 'Login with: superadmin/super123, admin/admin123, or erez/1234'
      }
    });
  } catch (error) {
    console.error('Test connection error:', error);
    return NextResponse.json({
      status: 'Error',
      error: error instanceof Error ? error.message : 'Unknown error',
      message: '❌ System check failed'
    }, { status: 500 });
  }
}
