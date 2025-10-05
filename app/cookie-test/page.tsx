'use client';

import { useEffect, useState } from 'react';

export default function CookieTestPage() {
  const [cookies, setCookies] = useState<string>('');
  const [authStatus, setAuthStatus] = useState<any>(null);

  useEffect(() => {
    // בדיקת cookies
    setCookies(document.cookie);
    
    // בדיקת סטטוס אימות
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/login');
      const data = await response.json();
      setAuthStatus(data);
    } catch (error) {
      setAuthStatus({ error: error.toString() });
    }
  };

  const setCookie = () => {
    document.cookie = "auth-token=test-token-123; path=/; max-age=3600";
    setCookies(document.cookie);
    alert('Cookie נוסף! רענן את העמוד');
  };

  const clearCookies = () => {
    document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    setCookies(document.cookie);
    alert('Cookies נמחקו! רענן את העמוד');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🍪 בדיקת Cookies ואימות</h1>
        
        {/* Cookies נוכחיים */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Cookies נוכחיים:</h2>
          <div className="bg-gray-100 p-4 rounded font-mono text-sm break-all">
            {cookies || 'אין cookies'}
          </div>
        </div>

        {/* סטטוס אימות */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">סטטוס אימות מה-API:</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(authStatus, null, 2)}
          </pre>
        </div>

        {/* כפתורי פעולה */}
        <div className="flex gap-4">
          <button
            onClick={setCookie}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            הוסף Cookie בדיקה
          </button>
          
          <button
            onClick={clearCookies}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            מחק Cookies
          </button>
          
          <a
            href="/login"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block"
          >
            חזור להתחברות
          </a>
          
          <a
            href="/dashboard"
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 inline-block"
          >
            נסה Dashboard
          </a>
        </div>

        {/* הוראות */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold mb-2">הוראות:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>אם אין auth-token ב-cookies, לך להתחבר קודם</li>
            <li>אחרי התחברות מוצלחת, חזור לכאן לבדוק שה-cookie נשמר</li>
            <li>אם ה-cookie קיים אבל עדיין לא מגיע ל-dashboard, הבעיה ב-middleware</li>
            <li>אם אין cookie אחרי התחברות, הבעיה בשמירת ה-cookie</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
