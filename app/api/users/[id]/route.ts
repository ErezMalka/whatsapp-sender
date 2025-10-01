import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await req.json();
    const updateData: any = {};

    if (data.username) updateData.username = data.username;
    if (data.password) {
      updateData.password = await hashPassword(data.password);
    }
    if (data.expiryDate) updateData.expiryDate = new Date(data.expiryDate);
    if (data.role) updateData.role = data.role;
    if (typeof data.isActive !== 'undefined') updateData.isActive = data.isActive;

    const user = await db.users.update(params.id, updateData);

    return NextResponse.json({
      id: user.id,
      username: user.username,
      role: user.role,
      expiryDate: user.expiryDate,
      isActive: user.isActive
    });
  } catch (error) {
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
    await db.users.delete(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
