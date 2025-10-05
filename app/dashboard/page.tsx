'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/login');
      const data = await response.json();
      
      if (data.authenticated) {
        setUser(data.user);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    console.log('Logout clicked!'); // לדיבוג
    
    // מחיקת כל ה-cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    // מחיקה ספציפית של auth-token
    document.cookie = 'auth-token=; Max-Age=0; path=/;';
    
    // ניתוב מיידי
    window.location.replace('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-800">WhatsApp Sender</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-sm text-gray-500">מחובר כ:</span>
                <p className="text-sm font-semibold text-gray-800">
                  {user?.email || 'משתמש'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  console.log('Button clicked!');
                  handleLogout();
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium cursor-pointer"
              >
                התנתק
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">ברוכים הבאים ל-WhatsApp Sender</h2>
          <p className="text-gray-600 mt-2">המערכת המתקדמת ביותר לניהול ושליחת הודעות WhatsApp לעסקים</p>
        </div>

        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => router.push('/contacts')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            נהל אנשי קשר
          </button>
          <button
            onClick={() => router.push('/campaigns/new')}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            התחל לשלוח הודעות
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl font-bold text-gray-800">0</span>
            </div>
            <h3 className="text-gray-700 font-medium">קמפיינים</h3>
            <p className="text-sm text-gray-500">קמפיינים פעילים</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl font-bold text-gray-800">0</span>
            </div>
            <h3 className="text-gray-700 font-medium">נשלחו</h3>
            <p className="text-sm text-gray-500">הודעות</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl font-bold text-gray-800">0</span>
            </div>
            <h3 className="text-gray-700 font-medium">פעילות</h3>
            <p className="text-sm text-gray-500">תבניות</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl font-bold text-gray-800">83</span>
            </div>
            <h3 className="text-gray-700 font-medium">סה״כ</h3>
            <p className="text-sm text-gray-500">אנשי קשר</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">פעולות מהירות</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={() => router.push('/settings')}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              <span className="text-sm text-gray-700">הגדרות</span>
            </button>

            <button
              onClick={() => router.push('/templates')}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              <span className="text-sm text-gray-700">תבניות</span>
            </button>

            <button
              onClick={() => router.push('/contacts')}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              <span className="text-sm text-gray-700">אנשי קשר</span>
            </button>

            <button
              onClick={() => router.push('/campaigns/new')}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              <span className="text-sm text-gray-700">שליחת הודעות</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
