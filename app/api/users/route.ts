import { NextRequest, NextResponse } from 'next/server';
import { usersStore } from '@/lib/users-store';
import { cookies } from 'next/headers';

// Helper function to check if user is authenticated and is admin
function checkAdminAuth() {
  const sessionCookie = cookies().get('session');
  if (!sessionCookie) return null;
  
  try {
    const decoded = Buffer.from(sessionCookie.value, 'base64').toString();
    const session = JSON.parse(decoded);
    if (session.role !== 'admin') return null;
    return session;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = checkAdminAuth();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get all users
    const users = usersStore.getAll();
    
    // Remove passwords from response
    const usersWithoutPasswords = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    return NextResponse.json(usersWithoutPasswords);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = checkAdminAuth();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { username, password, role } = body;
    
    // Validate input
    if (!username || !password || !role) {
      return NextResponse.json(
        { error: 'Username, password, and role are required' },
        { status: 400 }
      );
    }
    
    // Validate role
    if (role !== 'admin' && role !== 'user') {
      return NextResponse.json(
        { error: 'Invalid role. Must be "admin" or "user"' },
        { status: 400 }
      );
    }
    
    // Check if username already exists
    const existingUser = usersStore.getByUsername(username);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }
    
    // Create user - only with the fields that exist in the User interface
    const newUser = usersStore.create({
      username,
      password, // In production, hash this!
      role
    });
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser;
    
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
