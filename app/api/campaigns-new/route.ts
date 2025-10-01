import { NextRequest, NextResponse } from 'next/server';

// מסד נתונים זמני בזיכרון (לפיתוח)
let campaigns: any[] = [];
let campaignIdCounter = 1;

// GET - קבלת רשימת קמפיינים
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

// POST - יצירת קמפיין חדש
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, message, sendSpeed, groupIds, contactIds } = body;

    // יצירת קמפיין חדש
    const newCampaign = {
      id: campaignIdCounter++,
      name,
      message,
      sendSpeed: sendSpeed || 5,
      status: 'pending',
      groupIds,
      contactIds,
      totalRecipients: (groupIds?.length || 0) * 50 + (contactIds?.length || 0), // הערכה
      sentCount: 0,
      createdAt: new Date().toISOString()
    };

    campaigns.push(newCampaign);

    // TODO: כאן תוסיף לוגיקה לשליחת הודעות WhatsApp
    console.log('Campaign created:', newCampaign);

    return NextResponse.json({
      success: true,
      campaign: newCampaign
    });

  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
