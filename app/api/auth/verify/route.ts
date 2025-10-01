import { NextRequest, NextResponse } from 'next/server';

// מגדיר את הראוט כדינמי
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('auth-token');
    
    if (!token) {
      return NextResponse.json(
        { error: 'לא מחובר' },
        { status: 401 }
      );
    }

    // פענוח הטוקן
    const parts = token.value.split('.');
    if (parts.length !== 3) {
      return NextResponse.json(
        { error: 'טוקן לא תקין' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(atob(parts[1]));
    
    // בדיקת תוקף
    if (payload.exp && payload.exp < Date.now()) {
      return NextResponse.json(
        { error: 'הטוקן פג תוקף' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: payload.userId,
        username: payload.username,
        role: payload.role,
        expiryDate: payload.expiryDate
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'שגיאה באימות' },
      { status: 500 }
    );
  }
}
