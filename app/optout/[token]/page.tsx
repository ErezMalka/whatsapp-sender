// app/optout/[token]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function OptOutPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [status, setStatus] = useState<'loading' | 'form' | 'success' | 'error'>('loading');
  const [contact, setContact] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      // Decode the token (base64 encoded contact ID)
      const contactId = atob(token);
      
      // Get contact details
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single();
      
      if (error || !data) {
        setStatus('error');
        return;
      }
      
      if (data.opt_out) {
        // Already opted out
        setStatus('success');
      } else {
        setContact(data);
        setStatus('form');
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      setStatus('error');
    }
  };

  const handleOptOut = async () => {
    if (!contact) return;
    
    setProcessing(true);
    
    try {
      // Update contact opt-out status
      const { error } = await supabase
        .from('contacts')
        .update({
          opt_out: true,
          opt_out_at: new Date().toISOString(),
          opt_out_reason: reason || 'לא צוין'
        })
        .eq('id', contact.id);
      
      if (error) throw error;
      
      setStatus('success');
    } catch (error) {
      console.error('Error processing opt-out:', error);
      alert('אירעה שגיאה. נסה שוב.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">📱</div>
          <h1 className="text-2xl font-bold text-gray-800">הסרה מרשימת תפוצה</h1>
        </div>

        {/* Loading State */}
        {status === 'loading' && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">מאמת את הבקשה...</p>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-semibold text-red-600 mb-2">קישור לא תקין</h2>
            <p className="text-gray-600">
              הקישור שלחצת עליו אינו תקין או שפג תוקפו.
              <br />
              אם ברצונך להפסיק לקבל הודעות, השב "הסר" להודעה האחרונה.
            </p>
          </div>
        )}

        {/* Opt-Out Form */}
        {status === 'form' && contact && (
          <div>
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <p className="text-sm text-blue-800">
                <strong>שלום {contact.name},</strong>
                <br />
                האם ברצונך להפסיק לקבל הודעות WhatsApp למספר:
                <br />
                <span className="font-mono" dir="ltr">{contact.phone}</span>
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                סיבת ההסרה (אופציונלי)
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- בחר סיבה --</option>
                <option value="יותר מדי הודעות">יותר מדי הודעות</option>
                <option value="תוכן לא רלוונטי">תוכן לא רלוונטי</option>
                <option value="לא מעוניין יותר">לא מעוניין יותר</option>
                <option value="אחר">אחר</option>
              </select>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleOptOut}
                disabled={processing}
                className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition"
              >
                {processing ? 'מעבד...' : 'הסר אותי מהרשימה'}
              </button>
              
              <button
                onClick={() => window.close()}
                className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                ביטול
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              תמיד תוכל לחזור ולהצטרף שוב בעתיד
            </p>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-semibold text-green-600 mb-2">הוסרת בהצלחה</h2>
            <p className="text-gray-600 mb-4">
              לא תקבל יותר הודעות WhatsApp מאיתנו.
              <br />
              תודה על הזמן שהיית איתנו.
            </p>
            <button
              onClick={() => window.close()}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              סגור חלון
            </button>
          </div>
        )}
      </div>
    </div>
  );
}