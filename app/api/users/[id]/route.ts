import { NextRequest, NextResponse } from 'next/server';
import { usersDB, hashPassword } from '@/lib/users-db';

// מגדיר את הראוט כדינמי
export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await req.json();
    const updateData: any = {};

    if (data.username !== undefined) updateData.username = data.username;
    if (data.password) {
      updateData.password = await hashPassword(data.password);
    }
    if (data.expiryDate !== undefined) updateData.expiryDate = data.expiryDate;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const user = await usersDB.update(params.id, updateData);

    if (!user) {
      return NextResponse.json(
        { error: 'משתמש לא נמצא' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'שגיאה בעדכון משתמש' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = await usersDB.delete(params.id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'לא ניתן למחוק משתמש זה או שהמשתמש לא קיים' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'שגיאה במחיקת משתמש' },
      { status: 500 }
    );
  }
}
