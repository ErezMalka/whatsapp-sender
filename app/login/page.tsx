'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDebugInfo(null);
    setIsLoading(true);

    try {
      console.log('Attempting login with:', { username });
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      console.log('Login response:', response.status, data);

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בהתחברות');
      }

      // בדיקת cookies אחרי התחברות מוצלחת
      const cookiesCheck = document.cookie;
      console.log('Cookies after login:', cookiesCheck);
      
      // שמירת מידע על המשתמש ב-localStorage כגיבוי
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        console.log('User saved to localStorage:', data.user);
      }

      // הצגת מידע דיבוג
      if (showDebug) {
        setDebugInfo({
          status: 'Success',
          user: data.user,
          cookies: cookiesCheck ? 'Cookies set' : 'No cookies found',
          localStorage: 'User data saved'
        });
      }

      // המתנה קצרה לפני ניתוב
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1000);
      
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'שגיאה בהתחברות');
      if (showDebug) {
        setDebugInfo({
          status: 'Error',
          message: err.message,
          cookies: document.cookie || 'No cookies'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const styles = {
    container: 'min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4',
    card: 'w-full max-w-md p-8 space-y-6 bg-white/95 backdrop-blur shadow-xl rounded-lg',
    header: 'space-y-2 text-center',
    icon: 'mx-auto w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold',
    title: 'text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent',
    subtitle: 'text-gray-500',
    form: 'space-y-5',
    fieldGroup: 'space-y-2',
    label: 'text-right flex items-center gap-2 text-sm font-medium text-gray-700',
    input: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right disabled:opacity-50',
    button: 'w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-md hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2',
    error: 'p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-right text-sm',
    debug: 'p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-md text-left text-xs font-mono overflow-auto',
    info: 'text-center text-sm text-gray-500 space-y-1',
    infoBox: 'font-mono text-xs bg-gray-100 p-2 rounded',
    checkbox: 'flex items-center gap-2 text-sm text-gray-600'
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.icon}>
            <span>👤</span>
          </div>
          <h1 className={styles.title}>
            התחברות למערכת
          </h1>
          <p className={styles.subtitle}>הזן את פרטי המשתמש שלך</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.fieldGroup}>
            <label htmlFor="username" className={styles.label}>
              <span>👤</span>
              שם משתמש
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="הזן שם משתמש"
              required
              disabled={isLoading}
              className={styles.input}
              dir="rtl"
              autoComplete="username"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="password" className={styles.label}>
              <span>🔒</span>
              סיסמה
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="הזן סיסמה"
              required
              disabled={isLoading}
              className={styles.input}
              dir="rtl"
              autoComplete="current-password"
            />
          </div>

          <div className={styles.checkbox}>
            <input
              type="checkbox"
              id="showDebug"
              checked={showDebug}
              onChange={(e) => setShowDebug(e.target.checked)}
            />
            <label htmlFor="showDebug">הצג מידע דיבוג</label>
          </div>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          {debugInfo && showDebug && (
            <div className={styles.debug}>
              <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={styles.button}
          >
            {isLoading ? (
              <>
                <span className="inline-block animate-spin">⏳</span>
                מתחבר...
              </>
            ) : (
              <>
                <span>🚀</span>
                התחבר
              </>
            )}
          </button>
        </form>

        <div className={styles.info}>
          <p>משתמשי ברירת מחדל:</p>
          <div className={styles.infoBox}>
            <p>superadmin / super123</p>
            <p>admin / admin123</p>
            <p>erez / 1234</p>
          </div>
        </div>
      </div>
    </div>
  );
}
