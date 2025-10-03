// Activity logger for tracking user actions and system events

export type LogAction = 
  | 'login_attempt'
  | 'login_success'
  | 'login_failed'
  | 'login_error'
  | 'logout'
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'permission_denied'
  | 'error'
  | 'campaign_created'
  | 'campaign_started'
  | 'campaign_stopped'
  | 'campaign_completed'
  | 'message_sent'
  | 'message_failed'
  | 'contact_created'
  | 'contact_updated'
  | 'contact_deleted'
  | 'settings_updated';

export interface ActivityLog {
  id: string;
  action: LogAction;
  userId?: string;
  details: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

class ActivityLogger {
  private logs: ActivityLog[] = [];
  private maxLogs = 1000; // Keep only the last 1000 logs in memory

  log(entry: Omit<ActivityLog, 'id'>): void {
    const logEntry: ActivityLog = {
      ...entry,
      id: Date.now().toString(),
    };

    this.logs.unshift(logEntry);

    // Trim logs if they exceed the maximum
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // In production, you might want to:
    // - Send logs to a logging service
    // - Store them in a database
    // - Write them to a file
    console.log(`[${entry.action}] ${entry.details}`);
  }

  getLogs(limit?: number): ActivityLog[] {
    return limit ? this.logs.slice(0, limit) : this.logs;
  }

  getLogsByUser(userId: string, limit?: number): ActivityLog[] {
    const userLogs = this.logs.filter(log => log.userId === userId);
    return limit ? userLogs.slice(0, limit) : userLogs;
  }

  getLogsByAction(action: LogAction, limit?: number): ActivityLog[] {
    const actionLogs = this.logs.filter(log => log.action === action);
    return limit ? actionLogs.slice(0, limit) : actionLogs;
  }

  clearLogs(): void {
    this.logs = [];
  }
}

// Export a singleton instance
export const activityLogger = new ActivityLogger();
