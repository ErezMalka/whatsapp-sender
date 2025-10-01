import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const users = await db.users.findMany();
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { username, password, expiryDate, role = 'user' } = await req.json();

    const existing = await db.users.findUnique({ username });

    if (existing) {
      return NextResponse.json(
        { error: 'שם המשתמש כבר קיים' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await db.users.create({
      username,
      password: hashedPassword,
      expiryDate: new Date(expiryDate),
      isActive: true,
      role
    });

    return NextResponse.json({
      id: user.id,
      username: user.username,
      role: user.role,
      expiryDate: user.expiryDate
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
