// app/api/webhook/optout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Keywords that trigger opt-out
const OPT_OUT_KEYWORDS = [
  'הסר',
  'להסרה',
  'הסירו',
  'stop',
  'unsubscribe',
  'להפסיק',
  'תפסיק',
  'תפסיקו',
  'עצור',
  'ביטול'
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Parse Green API webhook
    const { senderData, messageData } = body;
    
    if (!senderData?.chatId || !messageData?.textMessageData?.textMessage) {
      return NextResponse.json({ status: 'ignored' });
    }
    
    const phone = senderData.chatId.replace('@c.us', '');
    const message = messageData.textMessageData.textMessage.toLowerCase();
    
    // Check if message contains opt-out keyword
    const hasOptOutKeyword = OPT_OUT_KEYWORDS.some(keyword => 
      message.includes(keyword.toLowerCase())
    );
    
    if (!hasOptOutKeyword) {
      return NextResponse.json({ status: 'not_optout' });
    }
    
    // Find contact by phone
    const { data: contact, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone', phone)
      .single();
    
    if (error || !contact) {
      console.log('Contact not found for phone:', phone);
      return NextResponse.json({ status: 'contact_not_found' });
    }
    
    // Update opt-out status
    const { error: updateError } = await supabase
      .from('contacts')
      .update({
        opt_out: true,
        opt_out_at: new Date().toISOString(),
        opt_out_reason: `הודעת הסרה: "${message}"`
      })
      .eq('id', contact.id);
    
    if (updateError) {
      throw updateError;
    }
    
    // Send confirmation message
    await sendConfirmationMessage(phone, contact.name);
    
    return NextResponse.json({ 
      status: 'success',
      message: 'Contact opted out successfully'
    });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

// Send confirmation message
async function sendConfirmationMessage(phone: string, name: string) {
  const GREEN_API_URL = 'https://api.green-api.com';
  const GREEN_INSTANCE_ID = process.env.GREEN_INSTANCE_ID || '7103914530';
  const GREEN_API_TOKEN = process.env.GREEN_API_TOKEN || 'd80385666656407bab2a9808a7e21c109cfda1df83a343c3be';
  
  const confirmationMessage = `שלום ${name},
הבקשה שלך התקבלה ✅
הוסרת בהצלחה מרשימת התפוצה שלנו.
לא תקבל יותר הודעות.

תודה על הזמן שהיית איתנו.`;
  
  try {
    await fetch(
      `${GREEN_API_URL}/waInstance${GREEN_INSTANCE_ID}/sendMessage/${GREEN_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: `${phone}@c.us`,
          message: confirmationMessage
        })
      }
    );
  } catch (error) {
    console.error('Error sending confirmation:', error);
  }
}