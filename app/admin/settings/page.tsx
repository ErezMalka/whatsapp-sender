'use client';

import { useState, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  role: string;
  expiryDate: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminSettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editedUser, setEditedUser] = useState<Partial<User>>({});
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'user',
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const [currentUserInfo, setCurrentUserInfo] = useState<any>(null);

  useEffect(() => {
    fetchUsers();
    checkCurrentUser();
  }, []);

  const checkCurrentUser = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUserInfo(user);
      console.log('Current user from localStorage:', user);
    }
    console.log('Current cookies:', document.cookie);
  };

  const showMessage = (message: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccess(message);
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(message);
      setSuccess('');
      setTimeout(() => setError(''), 3000);
    }
  };

  const getAuthHeaders = () => {
    const headers: any = {
      'Content-Type': 'application/json',
    };
    const userStr = localStorage.getItem('user');
    if (userStr) {
      headers['X-User-Data'] = userStr;
    }
    return headers;
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      console.log('Fetching users...');
      const response = await fetch('/api/users', {
        credentials: 'include',
        headers: getAuthHeaders()
      });
      
      console.log('Users fetch response:', response.status);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch users');
      }
      
      const data = await response.json();
      console.log('Users data:', data);
      setUsers(data);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      showMessage(error.message || 'שגיאה בטעינת המשתמשים', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password) {
      showMessage('נא למלא את כל השדות', 'error');
      return;
    }

    setLoading(true);
    try {
      console.log('Creating user:', newUser);
      const response = await fetch('/api/users', {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify(newUser)
      });

      console.log('Create user response:', response.status);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user');
      }

      showMessage('המשתמש נוצר בהצלחה', 'success');
      setNewUser({
        username: '',
        password: '',
        role: 'user',
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      showMessage(error.message || 'שגיאה ביצירת המשתמש', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify(editedUser)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      showMessage('המשתמש עודכן בהצלחה', 'success');
      setEditingUser(null);
      setEditedUser({});
      fetchUsers();
    } catch (error: any) {
      showMessage(error.message || 'שגיאה בעדכון המשתמש', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק משתמש זה?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      showMessage('המשתמש נמחק בהצלחה', 'success');
      fetchUsers();
    } catch (error: any) {
      showMessage(error.message || 'שגיאה במחיקת המשתמש', 'error');
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: 'container mx-auto p-6 max-w-6xl',
    header: 'mb-6',
    title: 'text-3xl font-bold',
    subtitle: 'text-gray-500',
    userInfo: 'mt-4 p-3 bg-blue-50 rounded-lg',
    tabs: 'border-b mb-4',
    tabButton: (active: boolean) => `px-4 py-2 font-medium ${active ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`,
    card: 'bg-white rounded-lg shadow-md p-6 mb-4',
    cardTitle: 'text-xl font-semibold mb-2',
    cardDescription: 'text-gray-600 mb-4',
    form: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4',
    label: 'block text-sm font-medium text-gray-700 mb-1',
    input: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
    select: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
    button: 'px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50',
    buttonOutline: 'px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50',
    badge: (type: string) => {
      const colors: any = {
        superadmin: 'bg-red-100 text-red-800',
        admin: 'bg-blue-100 text-blue-800',
        user: 'bg-gray-100 text-gray-800',
        active: 'bg-green-100 text-green-800',
        inactive: 'bg-red-100 text-red-800'
      };
      return `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[type] || colors.user}`;
    },
    table: 'min-w-full divide-y divide-gray-200',
    alert: (type: 'success' | 'error') => `p-4 mb-4 rounded-md ${type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`
  };

  return (
    <div className={styles.container} dir="rtl">
      <div className={styles.header}>
        <h1 className={styles.title}>הגדרות מערכת</h1>
        <p className={styles.subtitle}>ניהול משתמשים והגדרות המערכת</p>
        
        {currentUserInfo && (
          <div className={styles.userInfo}>
            <p className="text-sm">
              מחובר כ: <strong>{currentUserInfo.username}</strong> | 
              תפקיד: <span className={styles.badge(currentUserInfo.role)}>{currentUserInfo.role}</span>
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className={styles.alert('error')}>
          {error}
        </div>
      )}

      {success && (
        <div className={styles.alert('success')}>
          {success}
        </div>
      )}

      <div className={styles.tabs}>
        <button
          className={styles.tabButton(activeTab === 'users')}
          onClick={() => setActiveTab('users')}
        >
          ניהול משתמשים
        </button>
        <button
          className={styles.tabButton(activeTab === 'database')}
          onClick={() => setActiveTab('database')}
        >
          הגדרות מסד נתונים
        </button>
      </div>

      {activeTab === 'users' && (
        <>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>הוספת משתמש חדש</h2>
            <p className={styles.cardDescription}>צור משתמש חדש במערכת</p>
            
            <div className={styles.form}>
              <div>
                <label className={styles.label}>שם משתמש</label>
                <input
                  type="text"
                  className={styles.input}
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="הזן שם משתמש"
                  disabled={loading}
                />
              </div>
              <div>
                <label className={styles.label}>סיסמה</label>
                <input
                  type="password"
                  className={styles.input}
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="הזן סיסמה"
                  disabled={loading}
                />
              </div>
              <div>
                <label className={styles.label}>תפקיד</label>
                <select
                  className={styles.select}
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  disabled={loading}
                >
                  <option value="user">משתמש</option>
                  <option value="admin">מנהל</option>
                  <option value="superadmin">מנהל ראשי</option>
                </select>
              </div>
              <div>
                <label className={styles.label}>תאריך תפוגה</label>
                <input
                  type="date"
                  className={styles.input}
                  value={newUser.expiryDate}
                  onChange={(e) => setNewUser({ ...newUser, expiryDate: e.target.value })}
                  disabled={loading}
                />
              </div>
              <div className="flex items-end">
                <button
                  className={styles.button}
                  onClick={handleCreateUser}
                  disabled={loading}
                >
                  {loading ? 'מוסיף...' : 'הוסף משתמש'}
                </button>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>רשימת משתמשים</h2>
            <p className={styles.cardDescription}>ניהול המשתמשים הקיימים במערכת</p>
            
            {loading && users.length === 0 ? (
              <div className="flex justify-center p-8">
                <div className="text-gray-500">טוען...</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className={styles.table}>
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">שם משתמש</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תפקיד</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תאריך תפוגה</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">סטטוס</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תאריך יצירה</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">פעולות</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingUser === user.id ? (
                            <input
                              type="text"
                              className="px-2 py-1 border rounded"
                              value={editedUser.username || user.username}
                              onChange={(e) => setEditedUser({ ...editedUser, username: e.target.value })}
                            />
                          ) : (
                            <span className="font-medium">{user.username}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingUser === user.id ? (
                            <select
                              className="px-2 py-1 border rounded"
                              value={editedUser.role || user.role}
                              onChange={(e) => setEditedUser({ ...editedUser, role: e.target.value })}
                            >
                              <option value="user">משתמש</option>
                              <option value="admin">מנהל</option>
                              <option value="superadmin">מנהל ראשי</option>
                            </select>
                          ) : (
                            <span className={styles.badge(user.role)}>{user.role}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingUser === user.id ? (
                            <input
                              type="date"
                              className="px-2 py-1 border rounded"
                              value={editedUser.expiryDate?.split('T')[0] || user.expiryDate.split('T')[0]}
                              onChange={(e) => setEditedUser({ ...editedUser, expiryDate: e.target.value })}
                            />
                          ) : (
                            new Date(user.expiryDate).toLocaleDateString('he-IL')
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingUser === user.id ? (
                            <input
                              type="checkbox"
                              checked={editedUser.isActive !== undefined ? editedUser.isActive : user.isActive}
                              onChange={(e) => setEditedUser({ ...editedUser, isActive: e.target.checked })}
                            />
                          ) : (
                            <span className={styles.badge(user.isActive ? 'active' : 'inactive')}>
                              {user.isActive ? 'פעיל' : 'לא פעיל'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString('he-IL')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            {editingUser === user.id ? (
                              <>
                                <button
                                  className={styles.buttonOutline}
                                  onClick={() => handleUpdateUser(user.id)}
                                  disabled={loading}
                                >
                                  ✓
                                </button>
                                <button
                                  className={styles.buttonOutline}
                                  onClick={() => {
                                    setEditingUser(null);
                                    setEditedUser({});
                                  }}
                                  disabled={loading}
                                >
                                  ✕
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className={styles.buttonOutline}
                                  onClick={() => {
                                    setEditingUser(user.id);
                                    setEditedUser({});
                                  }}
                                  disabled={loading || user.role === 'superadmin'}
                                >
                                  עריכה
                                </button>
                                <button
                                  className={styles.buttonOutline}
                                  onClick={() => handleDeleteUser(user.id)}
                                  disabled={loading || user.role === 'superadmin'}
                                >
                                  מחק
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'database' && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>הגדרות Supabase</h2>
          <p className={styles.cardDescription}>הגדרות החיבור למסד הנתונים</p>
          
          <div className="space-y-4">
            <div>
              <label className={styles.label}>Supabase URL</label>
              <input
                type="text"
                className={styles.input}
                value={process.env.NEXT_PUBLIC_SUPABASE_URL || ''}
                readOnly
                placeholder="לא מוגדר"
              />
            </div>
            <div>
              <label className={styles.label}>Supabase Anon Key</label>
              <input
                type="password"
                className={styles.input}
                value={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}
                readOnly
                placeholder="לא מוגדר"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
