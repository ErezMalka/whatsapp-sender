// app/api/campaigns/process/route.ts
// קראו ל-API זה כל דקה באמצעות Vercel Cron או שירות חיצוני

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // בדוק אם יש אישור (למנוע קריאות לא מורשות)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // מצא קמפיינים פעילים
    const { data: activeCampaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('is_sending', true);

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
    }

    if (!activeCampaigns || activeCampaigns.length === 0) {
      return NextResponse.json({ message: 'No active campaigns' });
    }

    const results = [];

    // עבור כל קמפיין פעיל
    for (const campaign of activeCampaigns) {
      // בדוק אם הגיע הזמן לשלוח את ההודעה הבאה
      const { data: nextMessage } = await supabase
        .from('message_queue')
        .select('*')
        .eq('campaign_id', campaign.id)
        .eq('status', 'pending')
        .lte('scheduled_time', new Date().toISOString())
        .order('scheduled_time', { ascending: true })
        .limit(1)
        .single();

      if (nextMessage) {
        // שלח את ההודעה
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/campaigns/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            campaignId: campaign.id,
            action: 'process'
          })
        });

        const result = await response.json();
        results.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          result
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results
    });

  } catch (error: any) {
    console.error('Process Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
