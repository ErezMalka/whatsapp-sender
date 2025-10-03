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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = checkAdminAuth();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const user = usersStore.getById(params.id);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    if (!username || !role) {
      return NextResponse.json(
        { error: 'Username and role are required' },
        { status: 400 }
      );
    }
    
    // Update user
    const updateData: any = { username, role };
    if (password) {
      updateData.password = password; // In production, hash this!
    }
    
    const updatedUser = usersStore.update(params.id, updateData);
    
    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = updatedUser;
    
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = checkAdminAuth();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Prevent deleting the last admin user
    const user = usersStore.getById(params.id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    if (user.role === 'admin') {
      const allUsers = usersStore.getAll();
      const adminCount = allUsers.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last admin user' },
          { status: 400 }
        );
      }
    }
    
    const deleted = usersStore.delete(params.id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
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
