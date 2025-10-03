import { NextRequest, NextResponse } from 'next/server';
import { activityLogger } from '@/lib/activity-logger';
import { cookies } from 'next/headers';

// Helper function to parse session from cookie
function getSession() {
  const sessionCookie = cookies().get('session');
  if (!sessionCookie) return null;
  
  try {
    const decoded = Buffer.from(sessionCookie.value, 'base64').toString();
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit');
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');

    // Check permissions
    // Only admin and superadmin can view logs
    // Regular users can only view their own logs
    if (session.role !== 'admin' && session.role !== 'superadmin') {
      // Log unauthorized access attempt - using the regular log method
      activityLogger.log({
        userId: session.userId,
        action: 'permission_denied',
        details: `User ${session.username} attempted to view logs without permission`,
        timestamp: new Date().toISOString()
      });

      // Regular users can only see their own logs
      if (userId && userId !== session.userId) {
        return NextResponse.json(
          { error: 'You can only view your own logs' },
          { status: 403 }
        );
      }

      // Force userId to be the current user's ID for non-admins
      const userLogs = activityLogger.getLogsByUser(
        session.userId,
        limit ? parseInt(limit) : undefined
      );

      return NextResponse.json(userLogs);
    }

    // Admin users can view all logs
    let logs;
    
    if (userId) {
      logs = activityLogger.getLogsByUser(
        userId,
        limit ? parseInt(limit) : undefined
      );
    } else if (action) {
      logs = activityLogger.getLogsByAction(
        action as any,
        limit ? parseInt(limit) : undefined
      );
    } else {
      logs = activityLogger.getLogs(
        limit ? parseInt(limit) : undefined
      );
    }

    return NextResponse.json(logs);

  } catch (error) {
    console.error('Error fetching logs:', error);
    
    // Log error
    activityLogger.log({
      action: 'error',
      details: `Error fetching logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only superadmin can clear logs
    if (session.role !== 'superadmin') {
      // Log unauthorized access attempt
      activityLogger.log({
        userId: session.userId,
        action: 'permission_denied',
        details: `User ${session.username} attempted to clear logs without permission`,
        timestamp: new Date().toISOString()
      });

      return NextResponse.json(
        { error: 'Only superadmin can clear logs' },
        { status: 403 }
      );
    }

    // Clear logs
    activityLogger.clearLogs();

    // Log the action
    activityLogger.log({
      userId: session.userId,
      action: 'settings_updated',
      details: `Logs cleared by ${session.username}`,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true,
      message: 'Logs cleared successfully' 
    });

  } catch (error) {
    console.error('Error clearing logs:', error);
    
    // Log error
    activityLogger.log({
      action: 'error',
      details: `Error clearing logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
