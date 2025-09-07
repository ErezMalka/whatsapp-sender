// app/api/test-whatsapp/route.ts
// שימוש ב-Edge Runtime במקום Node.js

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

// GET - בדיקת חיבור
export async function GET() {
  const hasInstanceId = !!process.env.GREEN_API_INSTANCE_ID
  const hasToken = !!process.env.GREEN_API_TOKEN
  
  return NextResponse.json({
    status: 'API is working',
    timestamp: new Date().toISOString(),
    configured: hasInstanceId && hasToken,
    hasInstanceId,
    hasToken,
    message: hasInstanceId && hasToken 
      ? '✅ Green API configured successfully' 
      : '⚠️ Missing environment variables'
  })
}

// POST - שליחת הודעת בדיקה
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone } = body
    
    if (!phone) {
      return NextResponse.json(
        { error: 'Missing phone number' },
        { status: 400 }
      )
    }
    
    const instanceId = process.env.GREEN_API_INSTANCE_ID
    const token = process.env.GREEN_API_TOKEN
    
    if (!instanceId || !token) {
      return NextResponse.json(
        {
          error: 'Missing Green API credentials',
          hasInstanceId: !!instanceId,
          hasToken: !!token
        },
        { status: 500 }
      )
    }
    
    // נקה את המספר
    let phoneNumber = phone.toString().replace(/[^0-9]/g, '')
    
    if (phoneNumber.startsWith('0')) {
      phoneNumber = phoneNumber.substring(1)
    }
    
    if (!phoneNumber.startsWith('972')) {
      phoneNumber = '972' + phoneNumber
    }
    
    // שלח ל-Green API
    const apiUrl = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`
    
    const greenApiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chatId: `${phoneNumber}@c.us`,
        message: `✅ Test message from WhatsApp system\nTime: ${new Date().toISOString()}`
      })
    })
    
    const result = await greenApiResponse.json()
    
    if (greenApiResponse.ok && result.idMessage) {
      return NextResponse.json({
        success: true,
        messageId: result.idMessage,
        phone: phoneNumber
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to send', details: result },
        { status: 400 }
      )
    }
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
