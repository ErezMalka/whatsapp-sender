'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // בדיקה אם המשתמש מחובר
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    try {
      const response = await fetch('/api/auth/login');
      const data = await response.json();
      
      if (data.authenticated) {
        // אם מחובר - הפנה ל-Dashboard
        router.push('/dashboard');
      } else {
        // אם לא מחובר - הפנה להתחברות
        router.push('/login');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    }
  };

  // מציג מסך טעינה בזמן הבדיקה
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
        <h2 className="text-2xl font-semibold text-gray-700">WhatsApp Sender</h2>
        <p className="text-gray-500 mt-2">מעביר אותך למערכת...</p>
      </div>
    </div>
  );
}
