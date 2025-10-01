'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, User, Lock, LogIn } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
        credentials: 'include', // חשוב! מוודא ש-cookies נשלחים ומתקבלים
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

      // הצגת מידע דיבוג למשתמש (רק בפיתוח)
      setDebugInfo({
        status: 'Success',
        user: data.user,
        cookies: cookiesCheck ? 'Cookies set' : 'No cookies found',
        localStorage: 'User data saved'
      });

      // המתנה קצרה לפני ניתוב
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1000);
      
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'שגיאה בהתחברות');
      setDebugInfo({
        status: 'Error',
        message: err.message,
        cookies: document.cookie || 'No cookies'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <Card className="w-full max-w-md p-8 space-y-6 bg-white/95 backdrop-blur shadow-xl">
        <div className="space-y-2 text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            התחברות למערכת
          </h1>
          <p className="text-gray-500">הזן את פרטי המשתמש שלך</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-right flex items-center gap-2">
              <User className="w-4 h-4" />
              שם משתמש
            </Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="הזן שם משתמש"
              required
              disabled={isLoading}
              className="text-right"
              dir="rtl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-right flex items-center gap-2">
              <Lock className="w-4 h-4" />
              סיסמה
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="הזן סיסמה"
              required
              disabled={isLoading}
              className="text-right"
              dir="rtl"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-right">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Debug info - הצג רק בפיתוח */}
          {debugInfo && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription className="text-left text-xs font-mono">
                <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
              </AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                מתחבר...
              </>
            ) : (
              <>
                <LogIn className="ml-2 h-4 w-4" />
                התחבר
              </>
            )}
          </Button>
        </form>

        <div className="text-center text-sm text-gray-500 space-y-1">
          <p>משתמשי ברירת מחדל:</p>
          <div className="font-mono text-xs bg-gray-100 p-2 rounded">
            <p>superadmin / super123</p>
            <p>admin / admin123</p>
            <p>erez / 1234</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
