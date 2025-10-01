import { NextResponse } from 'next/server';

// מגדיר את הראוט כדינמי
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    users: [
      { username: 'superadmin', password: 'super123', role: 'super-admin' },
      { username: 'admin', password: 'admin123', role: 'admin' },
      { username: 'erez', password: '1234', role: 'user' }
    ]
  });
}
