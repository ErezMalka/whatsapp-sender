import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    // בדיקת שדות חובה
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // יצירת Supabase client
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // ניסיון התחברות
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Invalid login credentials' },
        { status: 401 }
      );
    }

    // החזרת תשובה מוצלחת
    return NextResponse.json({
      user: data.user,
      session: data.session,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
