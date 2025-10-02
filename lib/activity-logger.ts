import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export type LogAction = 
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'create_user'
  | 'update_user'
  | 'delete_user'
  | 'update_password'
  | 'reset_password_request'
  | 'reset_password_complete'
  | 'view_users'
  | 'view_logs';

export interface LogEntry {
  user_id?: string | null;
  username: string;
  action: LogAction;
  details?: Record<string, any>;
  ip_address?: string | null;
  user_agent?: string | null;
}

export interface ActivityLog extends LogEntry {
  id: string;
  created_at: string;
}

class ActivityLogger {
  /**
   * Log an activity to the database
   */
  async log(entry: LogEntry): Promise<void> {
    try {
      const { error } = await supabase
        .from('activity_logs')
        .insert([{
          user_id: entry.user_id || null,
          username: entry.username,
          action: entry.action,
          details: entry.details || {},
          ip_address: entry.ip_address || null,
          user_agent: entry.user_agent || null
        }]);

      if (error) {
        console.error('Failed to log activity:', error);
      }
    } catch (error) {
      console.error('Error in activity logger:', error);
    }
  }

  /**
   * Extract IP address from request
   */
  getIpAddress(request: NextRequest): string | null {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    if (realIp) {
      return realIp;
    }
    return null;
  }

  /**
   * Extract user agent from request
   */
  getUserAgent(request: NextRequest): string | null {
    return request.headers.get('user-agent');
  }

  /**
   * Log activity with request context
   */
  async logWithRequest(
    request: NextRequest,
    entry: Omit<LogEntry, 'ip_address' | 'user_agent'>
  ): Promise<void> {
    await this.log({
      ...entry,
      ip_address: this.getIpAddress(request),
      user_agent: this.getUserAgent(request)
    });
  }

  /**
   * Get activity logs with filters
   */
  async getLogs(options?: {
    user_id?: string;
    username?: string;
    action?: LogAction;
    limit?: number;
    offset?: number;
    from_date?: string;
    to_date?: string;
  }): Promise<{ logs: ActivityLog[]; total: number }> {
    try {
      let query = supabase
        .from('activity_logs')
        .select('*', { count: 'exact' });

      // Apply filters
      if (options?.user_id) {
        query = query.eq('user_id', options.user_id);
      }
      if (options?.username) {
        query = query.ilike('username', `%${options.username}%`);
      }
      if (options?.action) {
        query = query.eq('action', options.action);
      }
      if (options?.from_date) {
        query = query.gte('created_at', options.from_date);
      }
      if (options?.to_date) {
        query = query.lte('created_at', options.to_date);
      }

      // Apply pagination and ordering
      query = query.order('created_at', { ascending: false });
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options?.limit || 50) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Failed to get logs:', error);
        return { logs: [], total: 0 };
      }

      return {
        logs: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error('Error fetching logs:', error);
      return { logs: [], total: 0 };
    }
  }

  /**
   * Get user's recent activity
   */
  async getUserActivity(username: string, limit: number = 10): Promise<ActivityLog[]> {
    const { logs } = await this.getLogs({
      username,
      limit
    });
    return logs;
  }

  /**
   * Get recent failed login attempts
   */
  async getFailedLogins(username?: string, hours: number = 24): Promise<ActivityLog[]> {
    const fromDate = new Date();
    fromDate.setHours(fromDate.getHours() - hours);
    
    const { logs } = await this.getLogs({
      username,
      action: 'login_failed',
      from_date: fromDate.toISOString()
    });
    
    return logs;
  }

  /**
   * Clear old logs (older than specified days)
   */
  async clearOldLogs(days: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { error } = await supabase
        .from('activity_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error) {
        console.error('Failed to clear old logs:', error);
      }
    } catch (error) {
      console.error('Error clearing old logs:', error);
    }
  }
}

// Export singleton instance
export const activityLogger = new ActivityLogger();

// Export for type usage
export default ActivityLogger;
