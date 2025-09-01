// app/api/green/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Webhook received:', JSON.stringify(body, null, 2));

    // אימות webhook secret (אופציונלי)
    const webhookSecret = request.headers.get('x-webhook-secret');
    if (webhookSecret && webhookSecret !== process.env.GREEN_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // סוגי אירועים מ-Green API
    const { typeWebhook, instanceData, senderData, messageData, eventData } = body;

    // שמירה ב-Database
    const supabase = createServiceRoleClient();
    
    // טבלת events - נוסיף בהמשך
    const { error } = await supabase
      .from('webhook_events')
      .insert({
        type: typeWebhook,
        instance_id: instanceData?.idInstance,
        sender_phone: senderData?.sender || senderData?.chatId,
        message_data: messageData,
        event_data: eventData,
        raw_payload: body,
        received_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to save webhook:', error);
    }

    // טיפול לפי סוג האירוע
    switch (typeWebhook) {
      case 'incomingMessageReceived':
        console.log('New message from:', senderData?.sender);
        console.log('Message:', messageData?.textMessageData?.textMessage);
        // כאן אפשר להוסיף לוגיקה לטיפול בהודעות נכנסות
        break;
        
      case 'outgoingMessageStatus':
        console.log('Message status update:', messageData?.status);
        // עדכון סטטוס הודעה שנשלחה
        break;
        
      case 'stateInstanceChanged':
        console.log('Instance state changed:', instanceData?.stateInstance);
        break;
    }

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}