'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  role: string;
  expiryDate: string;
  isActive: boolean;
  createdAt: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('whatsapp');
  
  // WhatsApp Settings
  const [instanceId, setInstanceId] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');
  
  // Users Management
  const [users, setUsers] = useState<User[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    expiryDate: '',
    role: 'user'
  });

  useEffect(() => {
    setInstanceId('7103914530');
    setApiToken('d80385666656407bab2a9808a7e21c109cfda1df83a343c3be');
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setMessage('');
    
    try {
      const res = await fetch('/api/green/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId, apiToken })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage(`✅ Connected! Status: ${data.status}`);
      } else {
        setMessage(`❌ ${data.error || 'Connection failed'}`);
      }
    } catch (err) {
      setMessage('❌ Network error - check console');
      console.error(err);
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const url = editingUser 
        ? `/api/users/${editingUser.id}`
        : '/api/users';
      
      const method = editingUser ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        fetchUsers();
        setShowAddModal(false);
        setEditingUser(null);
        setFormData({
          username: '',
          password: '',
          expiryDate: '',
          role: 'user'
        });
      } else {
        const error = await res.json();
        alert(error.error || 'שגיאה בשמירה');
      }
    } catch (error) {
      alert('שגיאה בשמירה');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('האם אתה בטוח שברצונך למחוק משתמש זה?')) {
      try {
        const res = await fetch(`/api/users/${id}`, {
          method: 'DELETE'
        });
        
        if (res.ok) {
          fetchUsers();
        }
      } catch (error) {
        alert('שגיאה במחיקה');
      }
    }
  };

  const toggleUserStatus = async (user: User) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive })
      });
      
      if (res.ok) {
        fetchUsers();
      }
    } catch (error) {
      alert('שגיאה בעדכון סטטוס');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL');
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            ⚙️ הגדרות מערכת
          </h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >
            🚪 התנתק
          </button>
        </div>
        
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('whatsapp')}
                className={`py-3 px-6 border-b-2 font-medium text-sm transition ${
                  activeTab === 'whatsapp'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🔌 חיבור WhatsApp
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-3 px-6 border-b-2 font-medium text-sm transition ${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                👥 ניהול משתמשים
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'whatsapp' ? (
          <>
            {message && (
              <div className={`mb-6 p-4 rounded-lg ${
                message.includes('✅') 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                {message}
              </div>
            )}
            
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-6">
                הגדרות חיבור WhatsApp
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instance ID
                  </label>
                  <input
                    type="text"
                    value={instanceId}
                    onChange={(e) => setInstanceId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Token
                  </label>
                  <input
                    type="password"
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={testConnection}
                    disabled={testing || !instanceId || !apiToken}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
                  >
                    {testing ? 'בודק...' : '🔌 בדוק חיבור'}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Users Tab */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => {
                  setShowAddModal(true);
                  setEditingUser(null);
                  setFormData({
                    username: '',
                    password: '',
                    expiryDate: '',
                    role: 'user'
                  });
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                הוסף משתמש חדש
              </button>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      שם משתמש
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      תפקיד
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      תאריך תפוגה
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      סטטוס
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      פעולות
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {user.username}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role === 'admin' ? 'מנהל' : 'משתמש'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${
                          isExpired(user.expiryDate) ? 'text-red-600 font-bold' : 'text-gray-900'
                        }`}>
                          {formatDate(user.expiryDate)}
                          {isExpired(user.expiryDate) && (
                            <span className="block text-xs">פג תוקף</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleUserStatus(user)}
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer transition ${
                            user.isActive
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {user.isActive ? 'פעיל' : 'לא פעיל'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setFormData({
                              username: user.username,
                              password: '',
                              expiryDate: user.expiryDate.split('T')[0],
                              role: user.role
                            });
                            setShowAddModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 ml-4"
                        >
                          עריכה
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          מחיקה
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {users.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  אין משתמשים במערכת
                </div>
              )}
            </div>

            {/* Add/Edit Modal */}
            {showAddModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <h2 className="text-xl font-bold mb-4">
                    {editingUser ? 'עריכת משתמש' : 'הוספת משתמש חדש'}
                  </h2>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        שם משתמש
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.username}
                        onChange={(e) => setFormData({
                          ...formData,
                          username: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        סיסמה {editingUser && '(השאר ריק אם לא רוצה לשנות)'}
                      </label>
                      <input
                        type="password"
                        required={!editingUser}
                        value={formData.password}
                        onChange={(e) => setFormData({
                          ...formData,
                          password: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        תאריך תפוגה
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({
                          ...formData,
                          expiryDate: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        תפקיד
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({
                          ...formData,
                          role: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="user">משתמש</option>
                        <option value="admin">מנהל</option>
                      </select>
                    </div>
                    
                    <div className="flex gap-3 justify-end pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddModal(false);
                          setEditingUser(null);
                        }}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition"
                      >
                        ביטול
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition"
                      >
                        {loading ? 'שומר...' : (editingUser ? 'עדכן' : 'הוסף')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
