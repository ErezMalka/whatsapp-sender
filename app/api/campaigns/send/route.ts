// app/api/campaigns/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Green API Configuration
const GREEN_API_BASE_URL = 'https://api.green-api.com';

interface SendMessageParams {
  phone: string;
  message: string;
  instanceId: string;
  token: string;
}

// פונקציה לשליחת הודעה בודדת ב-Green API
async function sendWhatsAppMessage(params: SendMessageParams) {
  const { phone, message, instanceId, token } = params;
  
  try {
    const response = await fetch(
      `${GREEN_API_BASE_URL}/waInstance${instanceId}/sendMessage/${token}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: `${phone}@c.us`,
          message: message,
        }),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to send message');
    }

    return { success: true, messageId: data.idMessage };
  } catch (error: any) {
    console.error('Error sending WhatsApp message:', error);
    return { success: false, error: error.message };
  }
}

// שליחת הודעה בודדת מהתור
async function processNextMessage(campaignId: string) {
  try {
    // קבל את הקמפיין
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error('Campaign not found:', campaignError);
      return { success: false, error: 'Campaign not found' };
    }

    // קבל את ההודעה הבאה בתור
    const { data: nextMessage, error: messageError } = await supabase
      .from('message_queue')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')
      .order('scheduled_time', { ascending: true })
      .limit(1)
      .single();

    if (messageError || !nextMessage) {
      // אין עוד הודעות - סיים את הקמפיין
      await supabase
        .from('campaigns')
        .update({
          is_sending: false,
          status: 'completed',
          end_time: new Date().toISOString()
        })
        .eq('id', campaignId);

      return { success: true, completed: true };
    }

    // עדכן סטטוס ל-sending
    await supabase
      .from('message_queue')
      .update({ status: 'sending' })
      .eq('id', nextMessage.id);

    // שלח את ההודעה
    const sendResult = await sendWhatsAppMessage({
      phone: nextMessage.phone,
      message: nextMessage.message,
      instanceId: campaign.green_api_instance || process.env.GREEN_API_INSTANCE!,
      token: campaign.green_api_token || process.env.GREEN_API_TOKEN!
    });

    if (sendResult.success) {
      // עדכן כהצלחה
      await supabase
        .from('message_queue')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          whatsapp_message_id: sendResult.messageId
        })
        .eq('id', nextMessage.id);

      // עדכן מונה בקמפיין
      await supabase
        .from('campaigns')
        .update({
          sent_count: campaign.sent_count + 1
        })
        .eq('id', campaignId);
    } else {
      // עדכן ככישלון
      await supabase
        .from('message_queue')
        .update({
          status: 'failed',
          error_message: sendResult.error
        })
        .eq('id', nextMessage.id);

      // עדכן מונה כישלונות
      await supabase
        .from('campaigns')
        .update({
          failed_count: campaign.failed_count + 1
        })
        .eq('id', campaignId);
    }

    return { success: true, messageId: nextMessage.id };
  } catch (error: any) {
    console.error('Error processing message:', error);
    return { success: false, error: error.message };
  }
}

// API Route - התחלת קמפיין
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, action } = body;

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    if (action === 'start') {
      // קבל את הקמפיין
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError || !campaign) {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        );
      }

      if (campaign.is_sending) {
        return NextResponse.json(
          { error: 'Campaign is already sending' },
          { status: 400 }
        );
      }

      // קבל את הנמענים עם JOIN לטבלת contacts
      const { data: recipients, error: recipientsError } = await supabase
        .from('campaign_recipients')
        .select(`
          contact_id,
          contacts!inner (
            id,
            name,
            phone,
            email
          )
        `)
        .eq('campaign_id', campaignId);

      if (recipientsError || !recipients || recipients.length === 0) {
        return NextResponse.json(
          { error: 'No recipients found' },
          { status: 400 }
        );
      }

      // צור תור הודעות - תיקון: השתמש ב-scheduled_time ובגישה נכונה ל-contacts
      const messageQueue = recipients.map((recipient: any, index: number) => ({
        tenant_id: campaign.tenant_id,
        campaign_id: campaignId,
        contact_id: recipient.contact_id,
        phone: recipient.contacts.phone,
        message: campaign.message_content,
        status: 'pending',
        scheduled_time: new Date(Date.now() + (index * campaign.send_rate * 1000)).toISOString()
      }));

      // הכנס לתור
      const { error: queueError } = await supabase
        .from('message_queue')
        .insert(messageQueue);

      if (queueError) {
        console.error('Error creating message queue:', queueError);
        return NextResponse.json(
          { error: 'Failed to create message queue' },
          { status: 500 }
        );
      }

      // עדכן את הקמפיין
      await supabase
        .from('campaigns')
        .update({
          is_sending: true,
          status: 'sending',
          start_time: new Date().toISOString(),
          total_recipients: recipients.length,
          sent_count: 0,
          failed_count: 0
        })
        .eq('id', campaignId);

      // התחל שליחה של ההודעה הראשונה
      processNextMessage(campaignId);

      return NextResponse.json({
        success: true,
        message: 'Campaign started',
        totalRecipients: recipients.length,
        sendRate: campaign.send_rate
      });

    } else if (action === 'stop') {
      // עצור קמפיין
      await supabase
        .from('campaigns')
        .update({
          is_sending: false,
          status: 'paused',
          end_time: new Date().toISOString()
        })
        .eq('id', campaignId);

      // עדכן הודעות שעדיין ממתינות
      await supabase
        .from('message_queue')
        .update({ status: 'cancelled' })
        .eq('campaign_id', campaignId)
        .eq('status', 'pending');

      return NextResponse.json({
        success: true,
        message: 'Campaign stopped'
      });

    } else if (action === 'process') {
      // עבד את ההודעה הבאה (נקרא מה-cron job)
      const result = await processNextMessage(campaignId);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// API Route - קבלת סטטוס קמפיין
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // קבל סטטיסטיקות מהתור
    const { data: queueStats } = await supabase
      .from('message_queue')
      .select('status')
      .eq('campaign_id', campaignId);

    const stats = {
      pending: queueStats?.filter(m => m.status === 'pending').length || 0,
      sending: queueStats?.filter(m => m.status === 'sending').length || 0,
      sent: queueStats?.filter(m => m.status === 'sent').length || 0,
      failed: queueStats?.filter(m => m.status === 'failed').length || 0,
    };

    return NextResponse.json({
      campaign,
      stats,
      progress: campaign.total_recipients > 0 
        ? Math.round((campaign.sent_count / campaign.total_recipients) * 100)
        : 0
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
