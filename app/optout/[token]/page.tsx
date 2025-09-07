'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function OptOutPage() {
  const params = useParams();
  const token = params?.token as string || '';
  
  const [status, setStatus] = useState<'loading' | 'form' | 'success' | 'error'>('loading');
  const [contact, setContact] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setStatus('error');
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      // בדוק אם הטוקן תקף
      const { data, error } = await supabase
        .from('optout_tokens')
        .select('*, contacts(*)')
        .eq('token', token)
        .eq('used', false)
        .single();

      if (error || !data) {
        setStatus('error');
        return;
      }

      // בדוק אם הטוקן לא פג תוקף (24 שעות)
      const createdAt = new Date(data.created_at);
      const now = new Date();
      const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        setStatus('error');
        return;
      }

      setContact(data.contacts);
      setStatus('form');
    } catch (err) {
      console.error('Error verifying token:', err);
      setStatus('error');
    }
  };

  const handleOptOut = async () => {
    if (!contact) return;

    try {
      // עדכן את הקונטקט
      const { error: contactError } = await supabase
        .from('contacts')
        .update({
          opted_out: true,
          opted_out_at: new Date().toISOString(),
          opt_out_reason: reason,
          opt_out_feedback: feedback
        })
        .eq('id', contact.id);

      if (contactError) throw contactError;

      // סמן את הטוקן כמשומש
      const { error: tokenError } = await supabase
        .from('optout_tokens')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('token', token);

      if (tokenError) throw tokenError;

      setStatus('success');
    } catch (err) {
      console.error('Error processing opt-out:', err);
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">מאמת את הבקשה...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
          <div className="text-red-600 text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-bold mb-4">קישור לא תקף</h1>
          <p className="text-gray-600">
            הקישור שלחצת עליו אינו תקף או שפג תוקפו.
            אם ברצונך להסיר את עצמך מרשימת התפוצה, אנא השב להודעה המקורית.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
          <div className="text-green-600 text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold mb-4">הוסרת בהצלחה</h1>
          <p className="text-gray-600">
            המספר {contact?.phone} הוסר מרשימת התפוצה.
            לא תקבל/י יותר הודעות מאיתנו.
          </p>
          {feedback && (
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-500">תודה על המשוב שלך.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">הסרה מרשימת תפוצה</h1>
        
        <div className="mb-6">
          <p className="text-gray-600">
            האם ברצונך להסיר את המספר <strong>{contact?.phone}</strong> מרשימת התפוצה?
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            סיבת ההסרה (אופציונלי)
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">בחר סיבה</option>
            <option value="too_many">יותר מדי הודעות</option>
            <option value="not_relevant">התוכן לא רלוונטי</option>
            <option value="not_requested">לא ביקשתי לקבל הודעות</option>
            <option value="other">אחר</option>
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            משוב נוסף (אופציונלי)
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="ספר/י לנו איך נוכל להשתפר..."
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleOptOut}
            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
          >
            הסר אותי
          </button>
          <button
            onClick={() => window.close()}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
          >
            ביטול
          </button>
        </div>

        <p className="mt-4 text-xs text-gray-500 text-center">
          פעולה זו ניתנת לביטול על ידי יצירת קשר עם השולח
        </p>
      </div>
    </div>
  );
}
