'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const isExpired = searchParams.get('expired') === 'true';
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'שגיאה בהתחברות');
        setIsLoading(false);
        return;
      }
      
      // התחברות הצליחה
      router.push('/');
      router.refresh();
      
    } catch (err) {
      setError('שגיאה בהתחברות למערכת');
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 to-green-600 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            WhatsApp Sender 📱
          </h1>
          <p className="text-gray-600">התחבר למערכת</p>
        </div>
        
        {isExpired && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-4">
            תוקף ההתחברות פג, אנא התחבר מחדש
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              שם משתמש
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
              disabled={isLoading}
              autoComplete="username"
            />
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              סיסמה
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-500 text-white font-medium py-3 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-400"
          >
            {isLoading ? 'מתחבר...' : 'התחבר'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            משתמשי ברירת מחדל:
          </p>
          <div className="mt-2 text-xs text-gray-400">
            <div>superadmin / super123</div>
            <div>admin / admin123</div>
            <div>erez / erez123</div>
          </div>
        </div>
      </div>
    </div>
  );
}
