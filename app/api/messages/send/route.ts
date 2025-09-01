// app/api/messages/send/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { phone, message, type = 'text' } = await request.json();
    
    // וידוא נתונים
    if (!phone || !message) {
      return NextResponse.json(
        { error: 'Phone and message are required' },
        { status: 400 }
      );
    }

    // נקה את מספר הטלפון (הסר תווים מיוחדים)
    const cleanPhone = phone.replace(/\D/g, '');
    
    // הוסף קידומת 972 אם חסר
    const formattedPhone = cleanPhone.startsWith('972') 
      ? cleanPhone 
      : `972${cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone}`;

    // Green API credentials
    const instanceId = process.env.GREEN_INSTANCE_ID;
    const apiToken = process.env.GREEN_API_TOKEN;

    console.log(`Sending message to: ${formattedPhone}`);

    // שליחת הודעה דרך Green API
    const greenApiUrl = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${apiToken}`;
    
    const response = await fetch(greenApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chatId: `${formattedPhone}@c.us`,
        message: message
      })
    });

    const data = await response.json();
    
    if (response.ok && data.idMessage) {
      console.log('Message sent successfully:', data.idMessage);
      
      return NextResponse.json({
        success: true,
        messageId: data.idMessage,
        phone: formattedPhone,
        message: 'Message sent successfully!'
      });
    } else {
      console.error('Failed to send message:', data);
      return NextResponse.json({
        success: false,
        error: data.error || 'Failed to send message',
        details: data
      });
    }

  } catch (error: any) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to send message',
        details: error.message 
      },
      { status: 500 }
    );
  }
}