import { NextResponse } from 'next/server';

export async function GET() {
  // נתונים לדוגמה - החלף עם מסד נתונים אמיתי
  return NextResponse.json([
    { id: 1, name: 'משה כהן', phone: '050-1234567' },
    { id: 2, name: 'שרה לוי', phone: '052-9876543' },
    { id: 3, name: 'דוד ישראלי', phone: '054-5555555' },
    { id: 4, name: 'רחל אברהם', phone: '053-1111111' },
    { id: 5, name: 'יוסף מזרחי', phone: '058-2222222' }
  ]);
}
