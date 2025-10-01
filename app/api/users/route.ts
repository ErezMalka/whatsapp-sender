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

// GET /api/users - קבלת כל המשתמשים
export async function GET() {
  try {
    const session = await checkAuth();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // רק admin או superadmin יכולים לראות את כל המשתמשים
    if (session.role !== 'admin' && session.role !== 'superadmin' && session.role !== 'super-admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    const users = await usersStore.getAll();
    
    // הסרת סיסמאות לפני החזרה
    const sanitizedUsers = users.map(({ password, ...user }) => user);
    
    return NextResponse.json(sanitizedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/users - יצירת משתמש חדש
export async function POST(request: Request) {
  try {
    const session = await checkAuth();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // רק admin או superadmin יכולים ליצור משתמשים
    if (session.role !== 'admin' && session.role !== 'superadmin' && session.role !== 'super-admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { username, password, role, expiryDate, isActive } = body;
    
    if (!username || !password || !role) {
      return NextResponse.json(
        { error: 'Username, password, and role are required' },
        { status: 400 }
      );
    }
    
    try {
      const newUser = await usersStore.create({
        username,
        password,
        role,
        expiryDate: expiryDate || '',
        isActive: isActive !== undefined ? isActive : true
      });
      
      if (!newUser) {
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        );
      }
      
      // הסרת הסיסמה לפני החזרה
      const { password: _, ...sanitizedUser } = newUser;
      
      return NextResponse.json(sanitizedUser, { status: 201 });
    } catch (error) {
      if (error instanceof Error && error.message === 'Username already exists') {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 409 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
