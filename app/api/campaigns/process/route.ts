// app/api/campaigns/process/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Green API configuration
const GREEN_API_URL = 'https://api.green-api.com';
const GREEN_INSTANCE_ID = process.env.GREEN_INSTANCE_ID || '7103914530';
const GREEN_API_TOKEN = process.env.GREEN_API_TOKEN || 'd80385666656407bab2a9808a7e21c109cfda1df83a343c3be';

// Send message via Green API
async function sendWhatsAppMessage(phone: string, message: string) {
  try {
    const response = await fetch(
      `${GREEN_API_URL}/waInstance${GREEN_INSTANCE_ID}/sendMessage/${GREEN_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: `${phone}@c.us`,
          message: message
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Green API error: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, messageId: data.idMessage };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return { success: false, error: error.message };
  }
}

// Replace template variables
function personalizeMessage(template: string, contact: any): string {
  let message = template;
  
  // Replace common variables
  message = message.replace(/\{\{name\}\}/g, contact.name || '');
  message = message.replace(/\{\{phone\}\}/g, contact.phone || '');
  message = message.replace(/\{\{email\}\}/g, contact.email || '');
  message = message.replace(/\{\{company\}\}/g, contact.company || '');
  
  // Replace custom fields if they exist
  if (contact.custom_fields) {
    Object.keys(contact.custom_fields).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      message = message.replace(regex, contact.custom_fields[key] || '');
    });
  }
  
  return message;
}

// Process a single campaign
export async function POST(request: NextRequest) {
  try {
    const { campaignId } = await request.json();
    
    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check if campaign is already running
    if (campaign.status === 'running') {
      return NextResponse.json({ error: 'Campaign already running' }, { status: 400 });
    }

    // Update campaign status to running
    await supabase
      .from('campaigns')
      .update({ 
        status: 'running',
        started_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    // Get target contacts based on campaign settings
    let contactsQuery = supabase
      .from('contacts')
      .select('*')
      .eq('tenant_id', campaign.tenant_id)
      .eq('status', 'active')
      .eq('opt_out', false);

    // Apply targeting filters
    if (campaign.target_type === 'tags' && campaign.target_tags?.length > 0) {
      // Filter by tags - this is tricky with arrays, so we'll do it in JavaScript
      const { data: allContacts } = await contactsQuery;
      const filteredContacts = allContacts?.filter(contact => 
        contact.tags?.some(tag => campaign.target_tags.includes(tag))
      ) || [];
      
      await processContacts(campaign, filteredContacts);
    } else if (campaign.target_type === 'specific' && campaign.target_contacts?.length > 0) {
      contactsQuery = contactsQuery.in('id', campaign.target_contacts);
      const { data: contacts } = await contactsQuery;
      await processContacts(campaign, contacts || []);
    } else {
      // Send to all
      const { data: contacts } = await contactsQuery;
      await processContacts(campaign, contacts || []);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Campaign processing started',
      campaignId 
    });

  } catch (error) {
    console.error('Campaign processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process campaign' },
      { status: 500 }
    );
  }
}

// Process list of contacts
async function processContacts(campaign: any, contacts: any[]) {
  const batchSize = campaign.batch_size || 50;
  const delayBetween = campaign.delay_between_messages || 1000;
  
  let sentCount = 0;
  let failedCount = 0;
  
  // Process in batches
  for (let i = 0; i < contacts.length; i += batchSize) {
    const batch = contacts.slice(i, i + batchSize);
    
    // Process each contact in the batch
    for (const contact of batch) {
      try {
        // Personalize message
        const personalizedMessage = personalizeMessage(
          campaign.message_content,
          contact
        );
        
        // Send message
        const result = await sendWhatsAppMessage(
          contact.phone,
          personalizedMessage
        );
        
        if (result.success) {
          sentCount++;
          
          // Log successful send
          await supabase.from('campaign_recipients').insert({
            campaign_id: campaign.id,
            contact_id: contact.id,
            contact_name: contact.name,
            contact_phone: contact.phone,
            personalized_message: personalizedMessage,
            status: 'sent',
            message_id: result.messageId,
            sent_at: new Date().toISOString()
          });
        } else {
          failedCount++;
          
          // Log failed send
          await supabase.from('campaign_recipients').insert({
            campaign_id: campaign.id,
            contact_id: contact.id,
            contact_name: contact.name,
            contact_phone: contact.phone,
            personalized_message: personalizedMessage,
            status: 'failed',
            last_error: result.error,
            failed_at: new Date().toISOString()
          });
        }
        
        // Update campaign statistics
        await supabase
          .from('campaigns')
          .update({
            sent_count: sentCount,
            failed_count: failedCount
          })
          .eq('id', campaign.id);
        
        // Delay between messages
        await new Promise(resolve => setTimeout(resolve, delayBetween));
        
      } catch (error) {
        console.error(`Error sending to ${contact.phone}:`, error);
        failedCount++;
      }
    }
    
    // Delay between batches (longer delay)
    if (i + batchSize < contacts.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetween * 5));
    }
  }
  
  // Update campaign as completed
  await supabase
    .from('campaigns')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      sent_count: sentCount,
      failed_count: failedCount,
      delivered_count: sentCount // Assume delivered for now
    })
    .eq('id', campaign.id);
  
  return { sentCount, failedCount };
}