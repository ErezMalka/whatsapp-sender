import { NextRequest, NextResponse } from 'next/server';
import { activityLogger } from '@/lib/activity-logger';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader || !cookieHeader.includes('session=')) {
      return NextResponse.json(
        { message: 'לא מחובר' },
        { status: 401 }
      );
    }

    // Parse session from cookie
    let session;
    try {
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map(c => c.split('='))
      );
      
      if (!cookies.session) {
        return NextResponse.json(
          { message: 'לא מחובר' },
          { status: 401 }
        );
      }

      session = JSON.parse(decodeURIComponent(cookies.session));
    } catch (e) {
      return NextResponse.json(
        { message: 'סשן לא תקין' },
        { status: 401 }
      );
    }

    // Check if user is admin or superadmin
    if (session.role !== 'admin' && session.role !== 'superadmin') {
      // Log unauthorized access attempt
      await activityLogger.logWithRequest(request, {
        user_id: session.userId,
        username: session.username,
        action: 'view_logs',
        details: { denied: true, reason: 'Insufficient permissions' }
      });

      return NextResponse.json(
        { message: 'אין הרשאות מתאימות' },
        { status: 403 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const username = searchParams.get('username') || undefined;
    const action = searchParams.get('action') as any || undefined;
    const fromDate = searchParams.get('from_date') || undefined;
    const toDate = searchParams.get('to_date') || undefined;

    // Log the viewing of logs
    await activityLogger.logWithRequest(request, {
      user_id: session.userId,
      username: session.username,
      action: 'view_logs',
      details: {
        filters: {
          username,
          action,
          from_date: fromDate,
          to_date: toDate
        }
      }
    });

    // Fetch logs from database
    const { logs, total } = await activityLogger.getLogs({
      username,
      action,
      limit,
      offset,
      from_date: fromDate,
      to_date: toDate
    });

    return NextResponse.json({
      logs,
      total,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    
    return NextResponse.json(
      { message: 'שגיאת שרת פנימית' },
      { status: 500 }
    );
  }
}

// Clear old logs endpoint (admin only)
export async function DELETE(request: NextRequest) {
  try {
    // Check if user is authenticated
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader || !cookieHeader.includes('session=')) {
      return NextResponse.json(
        { message: 'לא מחובר' },
        { status: 401 }
      );
    }

    // Parse session from cookie
    let session;
    try {
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map(c => c.split('='))
      );
      
      if (!cookies.session) {
        return NextResponse.json(
          { message: 'לא מחובר' },
          { status: 401 }
        );
      }

      session = JSON.parse(decodeURIComponent(cookies.session));
    } catch (e) {
      return NextResponse.json(
        { message: 'סשן לא תקין' },
        { status: 401 }
      );
    }

    // Only superadmin can clear logs
    if (session.role !== 'superadmin') {
      return NextResponse.json(
        { message: 'רק superadmin יכול למחוק לוגים' },
        { status: 403 }
      );
    }

    // Get days parameter (default 90 days)
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '90');

    // Clear old logs
    await activityLogger.clearOldLogs(days);

    return NextResponse.json({
      message: `נמחקו לוגים ישנים מ-${days} ימים`
    });
  } catch (error) {
    console.error('Error clearing logs:', error);
    
    return NextResponse.json(
      { message: 'שגיאת שרת פנימית' },
      { status: 500 }
    );
  }
}
