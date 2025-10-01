import { NextResponse } from 'next/server';

// מגדיר את הראוט כדינמי
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ message: 'Process endpoint' });
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // כאן תוסיף את הלוגיקה של עיבוד הקמפיין
    
    return NextResponse.json({ 
      success: true,
      message: 'Campaign processed successfully',
      data 
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process campaign' },
      { status: 500 }
    );
  }
}
