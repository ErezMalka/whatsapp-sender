// app/api/campaigns/[id]/start/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// יצירת Supabase client עם service key
// חשוב: וודא שהוספת SUPABASE_SERVICE_KEY ב-Vercel Environment Variables
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pxukjsbvwcaqsgfxsteh.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4dWtqc2J2d2NhcXNnZnhzdGVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA3OTQ2NSwiZXhwIjoyMDcwNjU1NDY1fQ.JNlUO_qQ5CtjnAZBHXk9EvSXd3Xh6Q2jUQMlUgDQnik'
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
      .limit(20) // שלח 20 הודעות בכל פעם

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
        message: 'אין הודעות ממתינות לשליחה',
        messagesProcessed: 0 
      })
    }

    // שלח הודעות
    let successCount = 0
    let failCount = 0
    const results = []

    for (const message of messages) {
      try {
        console.log(`Sending message to ${message.phone}`)
        
        // פורמט מספר טלפון
        let phoneNumber = message.phone.replace(/\D/g, '')
        
        // הסר 0 מההתחלה אם יש
        if (phoneNumber.startsWith('0')) {
          phoneNumber = phoneNumber.substring(1)
        }
        
        // הוסף קידומת ישראל אם אין
        if (!phoneNumber.startsWith('972')) {
          phoneNumber = '972' + phoneNumber
        }

        console.log(`Formatted phone: ${phoneNumber}`)

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
        console.log('API Response:', result)
        
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
          results.push({ phone: message.phone, status: 'success', messageId: result.idMessage })
        } else {
          console.error('Failed to send message:', result)
          
          const errorMessage = result.error || result.message || 'Unknown error'
          
          await supabase
            .from('campaign_messages')
            .update({ 
              status: 'failed',
              error: errorMessage
            })
            .eq('id', message.id)
          
          failCount++
          results.push({ phone: message.phone, status: 'failed', error: errorMessage })
        }

        // המתן בין הודעות (קצב מהקמפיין או 30 שניות כברירת מחדל)
        const delay = (campaign.messages_per_minute && campaign.messages_per_minute > 0) 
          ? (60000 / campaign.messages_per_minute) 
          : 30000
        
        console.log(`Waiting ${delay}ms before next message`)
        
        // המתן רק אם זו לא ההודעה האחרונה
        if (messages.indexOf(message) < messages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }
        
      } catch (error) {
        console.error('Error sending message:', error)
        
        const errorMessage = error instanceof Error ? error.message : String(error)
        
        await supabase
          .from('campaign_messages')
          .update({ 
            status: 'failed',
            error: errorMessage
          })
          .eq('id', message.id)
        
        failCount++
        results.push({ phone: message.phone, status: 'failed', error: errorMessage })
      }
    }

    // עדכן סטטיסטיקות הקמפיין
    const { data: updatedCampaign } = await supabase
      .from('campaigns')
      .select('sent_count, failed_count')
      .eq('id', campaignId)
      .single()

    const currentSentCount = updatedCampaign?.sent_count || 0
    const currentFailedCount = updatedCampaign?.failed_count || 0

    await supabase
      .from('campaigns')
      .update({
        sent_count: currentSentCount + successCount,
        failed_count: currentFailedCount + failCount
      })
      .eq('id', campaignId)

    // בדוק אם יש עוד הודעות ממתינות
    const { count: pendingCount } = await supabase
      .from('campaign_messages')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')

    // אם אין עוד הודעות, סמן את הקמפיין כהושלם
    if (pendingCount === 0) {
      await supabase
        .from('campaigns')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', campaignId)
    }

    return NextResponse.json({ 
      success: true,
      message: `נשלחו ${successCount} הודעות בהצלחה, ${failCount} נכשלו`,
      messagesProcessed: messages.length,
      successCount,
      failCount,
      pendingCount,
      results
    })

  } catch (error) {
    console.error('Campaign start error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
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

    return NextResponse.json({ 
      success: true,
      message: 'הקמפיין הושהה בהצלחה'
    })

  } catch (error) {
    console.error('Campaign pause error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
