// pages/api/test.ts
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // GET - בדיקת חיבור
  if (req.method === 'GET') {
    const hasInstanceId = !!process.env.GREEN_API_INSTANCE_ID
    const hasToken = !!process.env.GREEN_API_TOKEN
    
    return res.status(200).json({
      status: 'API is working!',
      timestamp: new Date().toISOString(),
      configured: hasInstanceId && hasToken,
      hasInstanceId,
      hasToken,
      message: hasInstanceId && hasToken 
        ? '✅ Green API is configured' 
        : '⚠️ Add GREEN_API_INSTANCE_ID and GREEN_API_TOKEN in Vercel'
    })
  }
  
  // POST - שליחת הודעה
  if (req.method === 'POST') {
    try {
      const { phone } = req.body
      
      if (!phone) {
        return res.status(400).json({ error: 'Missing phone number' })
      }
      
      const instanceId = process.env.GREEN_API_INSTANCE_ID
      const token = process.env.GREEN_API_TOKEN
      
      if (!instanceId || !token) {
        return res.status(500).json({
          error: 'Missing Green API credentials',
          hasInstanceId: !!instanceId,
          hasToken: !!token
        })
      }
      
      // נקה את המספר
      let phoneNumber = phone.toString().replace(/[^0-9]/g, '')
      
      if (phoneNumber.startsWith('0')) {
        phoneNumber = phoneNumber.substring(1)
      }
      
      if (!phoneNumber.startsWith('972')) {
        phoneNumber = '972' + phoneNumber
      }
      
      // שלח ל-Green API
      const apiUrl = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: `${phoneNumber}@c.us`,
          message: `✅ Test message from WhatsApp system!\nTime: ${new Date().toLocaleString('he-IL')}`
        })
      })
      
      const result = await response.json()
      
      if (response.ok && result.idMessage) {
        return res.status(200).json({
          success: true,
          messageId: result.idMessage,
          phone: phoneNumber,
          message: 'Message sent successfully!'
        })
      } else {
        return res.status(400).json({
          error: 'Failed to send message',
          details: result
        })
      }
      
    } catch (error: any) {
      return res.status(500).json({
        error: 'Server error',
        message: error.message
      })
    }
  }
  
  // Method not allowed
  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).json({ error: 'Method not allowed' })
}
