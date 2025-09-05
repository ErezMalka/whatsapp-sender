import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// פונקציה לשליחת הודעת WhatsApp
async function sendWhatsAppMessage(phone: string, message: string) {
  try {
    // כאן תוסיף את הלוגיקה לשליחת הודעת WhatsApp
    // לדוגמה: קריאה ל-WhatsApp Business API
    
    const whatsappApiUrl = process.env.WHATSAPP_API_URL;
    const whatsappApiKey = process.env.WHATSAPP_API_KEY;
    
    if (!whatsappApiUrl || !whatsappApiKey) {
      throw new Error('WhatsApp API configuration is missing');
    }
    
    // דוגמה לקריאת API (התאם לפי ה-API שלך)
    const response = await fetch(`${whatsappApiUrl}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: phone,
        message: message,
        type: 'text'
      })
    });
    
    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return { success: true, data };
    
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    // תיקון: טיפול נכון בשגיאה מטיפוס unknown
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: errorMessage };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { campaignId } = await request.json();
    
    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }
    
    // שליפת פרטי הקמפיין
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
    
    // שליפת אנשי הקשר לפי הטאגים או הרשימה שנבחרה
    let contacts = [];
    
    if (campaign.selected_contacts && campaign.selected_contacts.length > 0) {
      // אם יש אנשי קשר ספציפיים שנבחרו
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .in('id', campaign.selected_contacts);
      
      if (!error && data) {
        contacts = data;
      }
    } else if (campaign.selected_tags && campaign.selected_tags.length > 0) {
      // אם נבחרו טאגים, מצא את כל אנשי הקשר עם הטאגים האלה
      const { data, error } = await supabase
        .from('contacts')
        .select('*');
      
      if (!error && data) {
        contacts = data.filter(contact => 
          contact.tags?.some((tag: string) => 
            campaign.selected_tags.includes(tag)
          )
        );
      }
    }
    
    if (contacts.length === 0) {
      return NextResponse.json(
        { error: 'No contacts found for this campaign' },
        { status: 400 }
      );
    }
    
    // שליחת הודעות
    const results = [];
    let successCount = 0;
    let failureCount = 0;
    
    for (const contact of contacts) {
      const result = await sendWhatsAppMessage(contact.phone, campaign.message);
      
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
      
      results.push({
        contactId: contact.id,
        contactName: contact.name,
        phone: contact.phone,
        ...result
      });
      
      // השהייה קטנה בין הודעות למניעת חסימה
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // עדכון סטטוס הקמפיין
    await supabase
      .from('campaigns')
      .update({ 
        status: 'completed',
        processed_at: new Date().toISOString(),
        success_count: successCount,
        failure_count: failureCount
      })
      .eq('id', campaignId);
    
    return NextResponse.json({
      success: true,
      message: `Campaign processed successfully`,
      summary: {
        total: contacts.length,
        successful: successCount,
        failed: failureCount
      },
      results
    });
    
  } catch (error) {
    console.error('Error processing campaign:', error);
    // תיקון: טיפול נכון בשגיאה מטיפוס unknown
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Failed to process campaign: ${errorMessage}` },
      { status: 500 }
    );
  }
}
