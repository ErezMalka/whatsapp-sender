import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // בדיקה שיש משתני סביבה
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase environment variables',
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey
      });
    }

    // יצירת חיבור
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // בדיקת החיבור עם query פשוט
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Database query failed',
        details: error.message
      });
    }

    // אם הגענו לכאן, החיבור עובד!
    // ננסה לקרוא את המשתמשים
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, role, is_active, expiry_date, created_at')
      .order('created_at', { ascending: true });

    if (usersError) {
      return NextResponse.json({
        success: true,
        connected: true,
        message: 'Connected but failed to fetch users',
        error: usersError.message
      });
    }

    return NextResponse.json({
      success: true,
      connected: true,
      usersCount: users?.length || 0,
      users: users || [],
      message: 'Database connection successful!'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
