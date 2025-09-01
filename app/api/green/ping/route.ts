// app/api/green/ping/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { instanceId, apiToken } = await request.json();
    
    if (!instanceId || !apiToken) {
      return NextResponse.json(
        { error: 'Missing Instance ID or API Token' },
        { status: 400 }
      );
    }

    console.log('Testing Green API connection...');

    // בדיקת חיבור ל-Green API
    const url = `https://api.green-api.com/waInstance${instanceId}/getStateInstance/${apiToken}`;
    console.log('Calling:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log('Green API Response:', data);
    
    if (response.ok && data.stateInstance) {
      return NextResponse.json({
        success: true,
        status: data.stateInstance,
        message: `Connection successful! WhatsApp is ${data.stateInstance}`
      });
    }

    return NextResponse.json({
      success: false,
      error: data.error || 'Failed to connect to Green API',
      details: data
    });

  } catch (error: any) {
    console.error('Green API ping error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Connection failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}