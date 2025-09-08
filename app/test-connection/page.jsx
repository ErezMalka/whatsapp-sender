'use client';

import React, { useState, useEffect } from 'react';

export default function TestConnection() {
  const [status, setStatus] = useState('בודק חיבור...');
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      // בדיקה 1: האם יש משתני סביבה?
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        setError('חסרים משתני סביבה של Supabase');
        setStatus('❌ חיבור נכשל');
        return;
      }

      setStatus('משתני סביבה נמצאו ✓');

      // בדיקה 2: ניסיון להתחבר
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      setStatus('Supabase client נוצר ✓');

      // בדיקה 3: ניסיון לקרוא מהטבלה
      const { data: campaigns, error: fetchError } = await supabase
        .from('campaigns')
        .select('id, name, status')
        .limit(5);

      if (fetchError) {
        setError(`שגיאה בקריאה מהטבלה: ${fetchError.message}`);
        setStatus('❌ לא ניתן לקרוא מהטבלה');
        return;
      }

      setData(campaigns);
      setStatus('✅ החיבור תקין!');

    } catch (err) {
      setError(err.message);
      setStatus('❌ שגיאה כללית');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }} dir="rtl">
      <h1>בדיקת חיבור ל-Supabase</h1>
      
      <div style={{ 
        padding: '20px', 
        backgroundColor: status.includes('✅') ? '#d4edda' : status.includes('❌') ? '#f8d7da' : '#fff3cd',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>סטטוס: {status}</h2>
      </div>

      {error && (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f8d7da', 
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3>שגיאה:</h3>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{error}</pre>
        </div>
      )}

      {data && (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#d4edda', 
          borderRadius: '8px'
        }}>
          <h3>נתונים מהטבלה campaigns:</h3>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <h3>פרטי סביבה:</h3>
        <ul>
          <li>SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ קיים' : '❌ חסר'}</li>
          <li>SUPABASE_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ קיים' : '❌ חסר'}</li>
        </ul>
      </div>

      <button 
        onClick={() => window.location.reload()}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        רענן דף
      </button>
    </div>
  );
}
