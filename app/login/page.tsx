'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    if (searchParams?.get('expired') === 'true') {
      setError('המנוי שלך פג תוקף. אנא צור קשר עם המנהל');
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/admin/settings');
      } else {
        setError(data.error || 'שגיאה בהתחברות');
      }
    } catch (err) {
      setError('שגיאת רשת - בדוק את החיבור');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (username: string, password: string) => {
    setCredentials({ username, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100" dir="rtl">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-blue-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              התחברות למערכת
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              הזן את פרטי ההתחברות שלך
            </p>
          </div>
          
          <form onSubmit={handleLogin}>
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  שם משתמש
                </label>
                <input
                  type="text"
                  required
                  value={credentials.username}
                  onChange={(e) => setCredentials({
                    ...credentials,
                    username: e.target.value
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="הכנס שם משתמש"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  סיסמה
                </label>
                <input
                  type={showPasswords ? "text" : "password"}
                  required
                  value={credentials.password}
                  onChange={(e) => setCredentials({
                    ...credentials,
                    password: e.target.value
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="הכנס סיסמה"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  מתחבר...
                </span>
              ) : 'התחבר'}
            </button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-gray-700">משתמשים לדוגמה:</h3>
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                {showPasswords ? 'הסתר' : 'הצג'} סיסמאות
              </button>
            </div>
            
            <div className="space-y-2">
              <div 
                className="flex justify-between items-center p-2 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100 transition"
                onClick={() => quickLogin('superadmin', 'super123')}
              >
                <div>
                  <span className="text-sm font-medium text-purple-900">🔑 Super Admin</span>
                  <p className="text-xs text-purple-700">ניהול מלא של המערכת</p>
                </div>
                <div className="text-xs text-purple-600 font-mono">
                  superadmin / {showPasswords ? 'super123' : '•••••••'}
                </div>
              </div>
              
              <div 
                className="flex justify-between items-center p-2 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition"
                onClick={() => quickLogin('admin', 'admin123')}
              >
                <div>
                  <span className="text-sm font-medium text-blue-900">👨‍💼 Admin</span>
                  <p className="text-xs text-blue-700">מנהל רגיל</p>
                </div>
                <div className="text-xs text-blue-600 font-mono">
                  admin / {showPasswords ? 'admin123' : '••••••••'}
                </div>
              </div>
              
              <div 
                className="flex justify-between items-center p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition"
                onClick={() => quickLogin('erez', '1234')}
              >
                <div>
                  <span className="text-sm font-medium text-gray-900">👤 User</span>
                  <p className="text-xs text-gray-700">משתמש רגיל (תוקף: 10/10/25)</p>
                </div>
                <div className="text-xs text-gray-600 font-mono">
                  erez / {showPasswords ? '1234' : '••••'}
                </div>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 text-center mt-3">
              לחץ על משתמש למילוי אוטומטי
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">טוען...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
