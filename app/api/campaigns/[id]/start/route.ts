// app/api/campaigns/[id]/start/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id
    console.log('Starting campaign:', campaignId)

    // בדוק שה-API keys קיימים
    if (!process.env.GREEN_API_INSTANCE_ID || !process.env.GREEN_API_TOKEN) {
      console.error('Missing Green API credentials')
      return NextResponse.json(
        { error: 'Missing API credentials. Please configure GREEN_API_INSTANCE_ID and GREEN_API_TOKEN in environment variables.' },
        { status: 500 }
      )
    }

    // טען פרטי קמפיין
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      console.error('Campaign not found:', campaignError)
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // עדכן סטטוס לפעיל
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({ 
        status: 'active',
        started_at: new Date().toISOString()
      })
      .eq('id', campaignId)

    if (updateError) {
      console.error('Error updating campaign:', updateError)
      return NextResponse.json(
        { error: 'Failed to update campaign status' },
        { status: 500 }
      )
    }

    // טען הודעות לשליחה
    const { data: messages, error: messagesError } = await supabase
      .from('campaign_messages')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5) // התחל עם 5 הודעות לבדיקה

    if (messagesError) {
      console.error('Error loading messages:', messagesError)
      return NextResponse.json(
        { error: 'Failed to load messages' },
        { status: 500 }
      )
    }

    console.log(`Found ${messages?.length || 0} messages to send`)

    if (!messages || messages.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No pending messages to send',
        messagesProcessed: 0 
      })
    }

    // שלח הודעות
    let successCount = 0
    let failCount = 0

    for (const message of messages) {
      try {
        console.log(`Sending message to ${message.phone}`)
        
        // פורמט מספר טלפון
        let phoneNumber = message.phone.replace(/\D/g, '')
        if (!phoneNumber.startsWith('972')) {
          phoneNumber = '972' + phoneNumber.replace(/^0/, '')
        }

        // שלח הודעה דרך Green API
        const response = await fetch(
          `https://api.green-api.com/waInstance${process.env.GREEN_API_INSTANCE_ID}/sendMessage/${process.env.GREEN_API_TOKEN}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatId: `${phoneNumber}@c.us`,
              message: message.content
            })
          }
        )

        const result = await response.json()
        
        if (response.ok && result.idMessage) {
          console.log('Message sent successfully:', result.idMessage)
          
          // עדכן סטטוס ההודעה
          await supabase
            .from('campaign_messages')
            .update({ 
              status: 'sent',
              sent_at: new Date().toISOString(),
              whatsapp_message_id: result.idMessage
            })
            .eq('id', message.id)
          
          successCount++
        } else {
          console.error('Failed to send message:', result)
          
          await supabase
            .from('campaign_messages')
            .update({ 
              status: 'failed',
              error: JSON.stringify(result)
            })
            .eq('id', message.id)
          
          failCount++
        }

        // המתן בין הודעות (קצב מהקמפיין או 30 שניות כברירת מחדל)
        const delay = (campaign.messages_per_minute && campaign.messages_per_minute > 0) 
          ? (60000 / campaign.messages_per_minute) 
          : 30000
        
        console.log(`Waiting ${delay}ms before next message`)
        await new Promise(resolve => setTimeout(resolve, delay))
        
      } catch (error) {
        console.error('Error sending message:', error)
        
        await supabase
          .from('campaign_messages')
          .update({ 
            status: 'failed',
            error: String(error)
          })
          .eq('id', message.id)
        
        failCount++
      }
    }

    // עדכן סטטיסטיקות הקמפיין
    await supabase
      .from('campaigns')
      .update({
        sent_count: successCount,
        failed_count: failCount
      })
      .eq('id', campaignId)

    return NextResponse.json({ 
      success: true,
      message: `Campaign started. Sent: ${successCount}, Failed: ${failCount}`,
      messagesProcessed: messages.length,
      successCount,
      failCount
    })

  } catch (error) {
    console.error('Campaign start error:', error)
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}

// עצירת קמפיין
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id

    const { error } = await supabase
      .from('campaigns')
      .update({ 
        status: 'paused',
        paused_at: new Date().toISOString()
      })
      .eq('id', campaignId)

    if (error) {
      console.error('Error pausing campaign:', error)
      return NextResponse.json(
        { error: 'Failed to pause campaign' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Campaign pause error:', error)
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}
