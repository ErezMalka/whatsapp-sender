import { NextResponse } from 'next/server';
import { usersStore } from '@/lib/users-store';
import { cookies } from 'next/headers';

// בדיקת הרשאות
async function checkAuth() {
  const sessionCookie = cookies().get('session');
  
  if (!sessionCookie) {
    return null;
  }
  
  try {
    const session = JSON.parse(sessionCookie.value);
    
    // בדיקת תוקף
    if (new Date(session.expiresAt) < new Date()) {
      return null;
    }
    
    return session;
  } catch (error) {
    return null;
  }
}

// GET /api/users/[id] - קבלת משתמש ספציפי
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await checkAuth();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const user = await usersStore.findById(params.id);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // משתמש רגיל יכול לראות רק את עצמו
    if (session.role === 'user' && session.userId !== params.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    // הסרת הסיסמה לפני החזרה
    const { password, ...sanitizedUser } = user;
    
    return NextResponse.json(sanitizedUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - עדכון משתמש
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await checkAuth();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // משתמש רגיל יכול לעדכן רק את עצמו (ורק חלק מהשדות)
    if (session.role === 'user' && session.userId !== params.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const updates: any = {};
    
    // משתמש רגיל יכול לעדכן רק סיסמה
    if (session.role === 'user') {
      if (body.password) {
        updates.password = body.password;
      }
    } else {
      // Admin/Superadmin יכולים לעדכן הכל
      if (body.username !== undefined) updates.username = body.username;
      if (body.password !== undefined) updates.password = body.password;
      if (body.role !== undefined) updates.role = body.role;
      if (body.expiryDate !== undefined) updates.expiryDate = body.expiryDate;
      if (body.isActive !== undefined) updates.isActive = body.isActive;
    }
    
    const updatedUser = await usersStore.update(params.id, updates);
    
    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found or update failed' },
        { status: 404 }
      );
    }
    
    // הסרת הסיסמה לפני החזרה
    const { password, ...sanitizedUser } = updatedUser;
    
    return NextResponse.json(sanitizedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - מחיקת משתמש
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await checkAuth();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // רק superadmin יכול למחוק משתמשים
    if (session.role !== 'superadmin' && session.role !== 'super-admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    // אסור למחוק את עצמך
    if (session.userId === params.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }
    
    const success = await usersStore.delete(params.id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'User not found or deletion failed' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
