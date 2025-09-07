// app/api/campaigns/[id]/status/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pxukjsbvwcaqsgfxsteh.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4dWtqc2J2d2NhcXNnZnhzdGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNzk0NjUsImV4cCI6MjA3MDY1NTQ2NX0.p77CyAgyV5dip7_fi389I7_KWHHlkxQcdW4L0XynLho'
)

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id

    // קבל פרטי קמפיין
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError) {
      throw campaignError
    }

    // קבל סטטיסטיקות הודעות
    const { data: messages, error: messagesError } = await supabase
      .from('campaign_messages')
      .select('*')
      .eq('campaign_id', campaignId)

    if (messagesError) {
      throw messagesError
    }

    // חשב סטטיסטיקות
    const stats = {
      total: messages?.length || 0,
      pending: messages?.filter(m => m.status === 'pending').length || 0,
      sent: messages?.filter(m => m.status === 'sent').length || 0,
      failed: messages?.filter(m => m.status === 'failed').length || 0
    }

    // קבל דוגמאות של הודעות
    const sampleMessages = messages?.slice(0, 10).map(msg => ({
      id: msg.id,
      phone: msg.phone,
      status: msg.status,
      error: msg.error,
      sent_at: msg.sent_at,
      content: msg.content?.substring(0, 50) + '...'
    }))

    return NextResponse.json({
      success: true,
      campaign,
      stats,
      sampleMessages,
      recommendations: getRecommendations(stats)
    })

  } catch (error) {
    console.error('Error fetching campaign status:', error)
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}

// איפוס הודעות שנכשלו
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id
    const { action } = await request.json()

    if (action === 'reset-failed') {
      // אפס הודעות שנכשלו
      const { error } = await supabase
        .from('campaign_messages')
        .update({
          status: 'pending',
          error: null,
          sent_at: null,
          whatsapp_message_id: null
        })
        .eq('campaign_id', campaignId)
        .eq('status', 'failed')

      if (error) throw error

      return NextResponse.json({ 
        success: true, 
        message: 'הודעות שנכשלו אופסו בהצלחה' 
      })

    } else if (action === 'reset-all') {
      // אפס את כל ההודעות
      const { error: messagesError } = await supabase
        .from('campaign_messages')
        .update({
          status: 'pending',
          error: null,
          sent_at: null,
          whatsapp_message_id: null
        })
        .eq('campaign_id', campaignId)

      if (messagesError) throw messagesError

      // אפס את הקמפיין
      const { error: campaignError } = await supabase
        .from('campaigns')
        .update({
          status: 'draft',
          sent_count: 0,
          failed_count: 0,
          started_at: null,
          completed_at: null,
          paused_at: null
        })
        .eq('id', campaignId)

      if (campaignError) throw campaignError

      return NextResponse.json({ 
        success: true, 
        message: 'כל ההודעות אופסו בהצלחה' 
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error resetting messages:', error)
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}

function getRecommendations(stats: any) {
  const recommendations = []
  
  if (stats.pending === 0 && stats.total > 0) {
    recommendations.push({
      type: 'error',
      message: 'אין הודעות ממתינות! צריך לאפס את הסטטוס כדי לשלוח שוב.'
    })
  }
  
  if (stats.failed > 0) {
    recommendations.push({
      type: 'warning',
      message: `יש ${stats.failed} הודעות שנכשלו. אפשר לאפס אותן ולנסות שוב.`
    })
  }
  
  if (stats.pending > 0) {
    recommendations.push({
      type: 'success',
      message: `יש ${stats.pending} הודעות ממתינות לשליחה.`
    })
  }
  
  if (stats.sent === stats.total && stats.total > 0) {
    recommendations.push({
      type: 'info',
      message: 'כל ההודעות נשלחו בהצלחה!'
    })
  }
  
  return recommendations
}
