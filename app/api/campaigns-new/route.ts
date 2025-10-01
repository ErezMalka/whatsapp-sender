import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - קבלת רשימת קמפיינים
export async function GET(request: NextRequest) {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        _count: {
          select: {
            recipients: true
          }
        }
      }
    });
    
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

    // יצירת הקמפיין
    const campaign = await prisma.campaign.create({
      data: {
        name,
        message,
        sendSpeed: sendSpeed || 5,
        status: 'pending',
        totalRecipients: 0,
        sentCount: 0
      }
    });

    // הוספת נמענים מקבוצות
    if (groupIds && groupIds.length > 0) {
      // מצא את כל אנשי הקשר בקבוצות
      const groupMembers = await prisma.groupMember.findMany({
        where: {
          groupId: {
            in: groupIds
          }
        },
        select: {
          contactId: true
        }
      });

      // הוסף אותם כנמענים
      const recipientData = groupMembers.map(member => ({
        campaignId: campaign.id,
        contactId: member.contactId,
        status: 'pending' as const
      }));

      if (recipientData.length > 0) {
        await prisma.campaignRecipient.createMany({
          data: recipientData,
          skipDuplicates: true
        });
      }
    }

    // הוספת אנשי קשר בודדים
    if (contactIds && contactIds.length > 0) {
      const contactRecipients = contactIds.map((contactId: number) => ({
        campaignId: campaign.id,
        contactId,
        status: 'pending' as const
      }));

      await prisma.campaignRecipient.createMany({
        data: contactRecipients,
        skipDuplicates: true
      });
    }

    // עדכון מספר הנמענים הכולל
    const totalRecipients = await prisma.campaignRecipient.count({
      where: {
        campaignId: campaign.id
      }
    });

    const updatedCampaign = await prisma.campaign.update({
      where: {
        id: campaign.id
      },
      data: {
        totalRecipients
      }
    });

    // TODO: התחל את תהליך השליחה
    // startSendingProcess(campaign.id);

    return NextResponse.json({
      success: true,
      campaign: updatedCampaign
    });

  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
