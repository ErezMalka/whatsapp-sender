'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // בדיקת שדות ריקים
      if (!email || !password) {
        setError('נא למלא את כל השדות');
        setLoading(false);
        return;
      }

      // ניסיון התחברות ישירות עם Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('Login error:', authError);
        
        // טיפול בשגיאות ספציפיות
        if (authError.message.includes('Invalid login credentials')) {
          setError('אימייל או סיסמה שגויים');
        } else if (authError.message.includes('Email not confirmed')) {
          setError('נא לאמת את כתובת האימייל שלך');
        } else {
          setError('שגיאה בהתחברות. נסה שוב');
        }
        
        setLoading(false);
        return;
      }

      if (data?.user) {
        // התחברות הצליחה
        console.log('Login successful:', data.user);
        
        // ניתוב לדף הראשי
        router.push('/admin/dashboard');
        router.refresh();
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('שגיאה בלתי צפויה. נסה שוב מאוחר יותר');
      setLoading(false);
    }
  };

  // פונקציה לאיפוס סיסמה
  const handleResetPassword = async () => {
    if (!email) {
      setError('נא להזין כתובת אימייל');
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError('שגיאה בשליחת אימייל איפוס סיסמה');
      } else {
        setError('');
        alert('נשלח אימייל לאיפוס סיסמה. בדוק את תיבת הדואר שלך');
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setError('שגיאה בשליחת אימייל איפוס');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            התחברות למערכת
          </h1>
          <p className="text-gray-600">
            WhatsApp Sender Pro
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label 
              htmlFor="email" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              אימייל
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="your@email.com"
              dir="ltr"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label 
              htmlFor="password" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              סיסמה
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="••••••••"
              dir="ltr"
              required
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input 
                type="checkbox" 
                className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">זכור אותי</span>
            </label>
            
            <button
              type="button"
              onClick={handleResetPassword}
              className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
              disabled={loading}
            >
              שכחת סיסמה?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                מתחבר...
              </span>
            ) : (
              'התחבר'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <span className="text-sm text-gray-600">
            אין לך חשבון? 
          </span>
          <a 
            href="/register" 
            className="text-sm text-blue-600 hover:text-blue-700 font-semibold mr-1 transition-colors"
          >
            הירשם עכשיו
          </a>
        </div>

        {/* פרטי התחברות לבדיקה - למחוק בפרודקשן */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-2">לבדיקה:</p>
          <p className="text-xs text-gray-600" dir="ltr">
            Email: test@example.com<br/>
            Password: Test123456
          </p>
        </div>
      </div>
    </div>
  );
}
