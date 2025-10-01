import { NextResponse } from 'next/server';

export async function GET() {
  // נתונים לדוגמה - החלף עם מסד נתונים אמיתי
  return NextResponse.json([
    { id: 1, name: 'משפחה', icon: '👨‍👩‍👧‍👦', memberCount: 25 },
    { id: 2, name: 'לקוחות VIP', icon: '💼', memberCount: 150 },
    { id: 3, name: 'עובדים', icon: '🏢', memberCount: 75 },
    { id: 4, name: 'לקוחות רגילים', icon: '🛍️', memberCount: 300 },
    { id: 5, name: 'ספקים', icon: '🤝', memberCount: 50 }
  ]);
}
