import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'API is working',
    timestamp: new Date().toISOString(),
    configured: !!process.env.GREEN_API_INSTANCE_ID && !!process.env.GREEN_API_TOKEN,
    hasInstanceId: !!process.env.GREEN_API_INSTANCE_ID,
    hasToken: !!process.env.GREEN_API_TOKEN
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone } = body
    
    if (!phone) {
      return NextResponse.json(
        { error: 'חסר מספר טלפון' },
        { status: 400 }
      )
    }
    
    const instanceId = process.env.GREEN_API_INSTANCE_ID
    const token = process.env.GREEN_API_TOKEN
    
    if (!instanceId || !token) {
      return NextResponse.json(
        { error: 'חסרים פרטי Green API' },
        { status: 500 }
      )
    }
    
    let phoneNumber = phone.replace(/\D/g, '')
    if (phoneNumber.startsWith('0')) {
      phoneNumber = '972' + phoneNumber.substring(1)
    }
    if (!phoneNumber.startsWith('972')) {
      phoneNumber = '972' + phoneNumber
    }
    
    const response = await fetch(
      `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: `${phoneNumber}@c.us`,
          message: '✅ בדיקת מערכת WhatsApp - ההודעה הגיעה בהצלחה!'
        })
      }
    )
    
    const result = await response.json()
    
    if (response.ok && result.idMessage) {
      return NextResponse.json({
        success: true,
        messageId: result.idMessage,
        phone: phoneNumber
      })
    } else {
      return NextResponse.json(
        { error: 'השליחה נכשלה', details: result },
        { status: 400 }
      )
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
