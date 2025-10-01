import { NextRequest, NextResponse } from 'next/server';

// מגדיר את הראוט כדינמי
export const dynamic = 'force-dynamic';

// נשתמש באותו DB מהקובץ הקודם
let USERS_DB = [
  {
    id: '1',
    username: 'superadmin',
    password: 'super123',
    role: 'super-admin',
    expiryDate: '2030-12-31',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    expiryDate: '2030-12-31',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    username: 'erez',
    password: '1234',
    role: 'user',
    expiryDate: '2025-10-10',
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const userIndex = USERS_DB.findIndex(u => u.id === params.id);
    
    if (userIndex === -1) {
      return NextResponse.json(
        { error: 'משתמש לא נמצא' },
        { status: 404 }
      );
    }

    // עדכון המשתמש
    USERS_DB[userIndex] = {
      ...USERS_DB[userIndex],
      ...body,
      id: params.id // וודא שה-ID לא משתנה
    };

    // החזרה בלי סיסמה
    const { password: _, ...userWithoutPassword } = USERS_DB[userIndex];
    
    return NextResponse.json({
      success: true,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userIndex = USERS_DB.findIndex(u => u.id === params.id);
    
    if (userIndex === -1) {
      return NextResponse.json(
        { error: 'משתמש לא נמצא' },
        { status: 404 }
      );
    }

    // אל תמחק super-admin
    if (USERS_DB[userIndex].role === 'super-admin') {
      return NextResponse.json(
        { error: 'לא ניתן למחוק Super Admin' },
        { status: 400 }
      );
    }

    // מחיקת המשתמש
    USERS_DB.splice(userIndex, 1);
    
    return NextResponse.json({ 
      success: true,
      message: 'המשתמש נמחק בהצלחה' 
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
