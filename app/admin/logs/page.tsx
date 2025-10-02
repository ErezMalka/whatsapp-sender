'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ActivityLog {
  id: string;
  user_id: string | null;
  username: string;
  action: string;
  details: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const actionTranslations: Record<string, string> = {
  'login': 'התחברות',
  'logout': 'יציאה',
  'login_failed': 'ניסיון התחברות כושל',
  'create_user': 'יצירת משתמש',
  'update_user': 'עדכון משתמש',
  'delete_user': 'מחיקת משתמש',
  'update_password': 'עדכון סיסמה',
  'reset_password_request': 'בקשת איפוס סיסמה',
  'reset_password_complete': 'השלמת איפוס סיסמה',
  'view_users': 'צפייה במשתמשים',
  'view_logs': 'צפייה בלוגים'
};

const actionColors: Record<string, string> = {
  'login': 'bg-green-100 text-green-800',
  'logout': 'bg-gray-100 text-gray-800',
  'login_failed': 'bg-red-100 text-red-800',
  'create_user': 'bg-blue-100 text-blue-800',
  'update_user': 'bg-yellow-100 text-yellow-800',
  'delete_user': 'bg-red-100 text-red-800',
  'update_password': 'bg-purple-100 text-purple-800',
  'reset_password_request': 'bg-orange-100 text-orange-800',
  'reset_password_complete': 'bg-green-100 text-green-800',
  'view_users': 'bg-gray-100 text-gray-800',
  'view_logs': 'bg-gray-100 text-gray-800'
};

export default function LogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    username: '',
    action: '',
    fromDate: '',
    toDate: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const logsPerPage = 50;

  useEffect(() => {
    fetchLogs();
  }, [currentPage]);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        limit: logsPerPage.toString(),
        offset: ((currentPage - 1) * logsPerPage).toString()
      });

      if (filters.username) {
        params.append('username', filters.username);
      }
      if (filters.action) {
        params.append('action', filters.action);
      }
      if (filters.fromDate) {
        params.append('from_date', filters.fromDate);
      }
      if (filters.toDate) {
        params.append('to_date', filters.toDate);
      }

      const response = await fetch(`/api/logs?${params.toString()}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch logs');
      }

      const data = await response.json();
      setLogs(data.logs);
      setTotalPages(Math.ceil(data.total / logsPerPage));
    } catch (err) {
      setError('שגיאה בטעינת הלוגים');
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchLogs();
  };

  const clearFilters = () => {
    setFilters({
      username: '',
      action: '',
      fromDate: '',
      toDate: ''
    });
    setCurrentPage(1);
    fetchLogs();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const formatDetails = (details: Record<string, any>) => {
    if (!details || Object.keys(details).length === 0) {
      return '-';
    }
    return Object.entries(details)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  };

  const formatUserAgent = (userAgent: string | null) => {
    if (!userAgent) return '-';
    
    // Extract browser and OS info
    const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/);
    const osMatch = userAgent.match(/(Windows|Mac OS X|Linux|Android|iOS)[^;)]*/);
    
    const browser = browserMatch ? browserMatch[1] : 'Unknown';
    const os = osMatch ? osMatch[1] : 'Unknown';
    
    return `${browser} / ${os}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">יומן פעילות</h1>
          
          {/* Filters */}
          <form onSubmit={handleFilterSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">שם משתמש</label>
                <input
                  type="text"
                  value={filters.username}
                  onChange={(e) => setFilters({...filters, username: e.target.value})}
                  className="w-full p-2 border rounded"
                  placeholder="חיפוש לפי שם משתמש"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">סוג פעולה</label>
                <select
                  value={filters.action}
                  onChange={(e) => setFilters({...filters, action: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="">כל הפעולות</option>
                  {Object.entries(actionTranslations).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">מתאריך</label>
                <input
                  type="datetime-local"
                  value={filters.fromDate}
                  onChange={(e) => setFilters({...filters, fromDate: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">עד תאריך</label>
                <input
                  type="datetime-local"
                  value={filters.toDate}
                  onChange={(e) => setFilters({...filters, toDate: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
            
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                סנן תוצאות
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                נקה סינון
              </button>
            </div>
          </form>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Loading state */}
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2">טוען לוגים...</p>
            </div>
          ) : (
            <>
              {/* Logs table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        תאריך ושעה
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        משתמש
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        פעולה
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        פרטים
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        כתובת IP
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        דפדפן / מערכת
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                          אין לוגים להצגה
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(log.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.username}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${actionColors[log.action] || 'bg-gray-100 text-gray-800'}`}>
                              {actionTranslations[log.action] || log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {formatDetails(log.details)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.ip_address || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatUserAgent(log.user_agent)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    עמוד {currentPage} מתוך {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className={`px-3 py-1 rounded ${
                        currentPage === 1
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      הקודם
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1 rounded ${
                        currentPage === totalPages
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      הבא
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
