// app/api/test-whatsapp/route.ts
import { NextRequest, NextResponse } from 'next/server'

// בדיקת חיבור - GET
export async function GET() {
  console.log('GET /api/test-whatsapp called')
  
  const hasInstanceId = !!process.env.GREEN_API_INSTANCE_ID
  const hasToken = !!process.env.GREEN_API_TOKEN
  
  return NextResponse.json({
    status: 'API is working',
    timestamp: new Date().toISOString(),
    configured: hasInstanceId && hasToken,
    hasInstanceId,
    hasToken,
    message: hasInstanceId && hasToken 
      ? '✅ Green API מוגדר' 
      : '⚠️ חסרים משתני סביבה'
  })
}

// שליחת הודעת בדיקה - POST
export async function POST(request: NextRequest) {
  console.log('POST /api/test-whatsapp called')
  
  try {
    // קבל את הנתונים מהבקשה
    const body = await request.json()
    const { phone } = body
    
    console.log('Phone received:', phone)
    
    // בדוק שיש מספר טלפון
    if (!phone) {
      return NextResponse.json(
        { error: 'חסר מספר טלפון' },
        { status: 400 }
      )
    }
    
    // בדוק שיש API keys
    const instanceId = process.env.GREEN_API_INSTANCE_ID
    const token = process.env.GREEN_API_TOKEN
    
    if (!instanceId || !token) {
      console.error('Missing Green API credentials')
      return NextResponse.json(
        {
          error: 'חסרים פרטי Green API',
          details: {
            hasInstanceId: !!instanceId,
            hasToken: !!token
          },
          solution: 'הוסף את המשתנים ב-Vercel Settings → Environment Variables'
        },
        { status: 500 }
      )
    }
    
    // נקה את המספר
    let phoneNumber = phone.toString().replace(/\D/g, '')
    
    // הסר 0 מההתחלה אם יש
    if (phoneNumber.startsWith('0')) {
      phoneNumber = phoneNumber.substring(1)
    }
    
    // הוסף קידומת ישראל אם אין
    if (!phoneNumber.startsWith('972')) {
      phoneNumber = '972' + phoneNumber
    }
    
    console.log('Formatted phone:', phoneNumber)
    
    // הכן את ההודעה
    const messageContent = `🚀 בדיקת מערכת WhatsApp

✅ החיבור תקין!
📱 מספר: ${phoneNumber}
🕐 זמן: ${new Date().toLocaleString('he-IL')}

המערכת מוכנה לשליחת קמפיינים!`
    
    // שלח ל-Green API
    const apiUrl = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`
    
    console.log('Calling Green API...')
    
    const greenApiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chatId: `${phoneNumber}@c.us`,
        message: messageContent
      })
    })
    
    const responseText = await greenApiResponse.text()
    console.log('Green API raw response:', responseText)
    
    // נסה לפרסר את התשובה
    let result
    try {
      result = JSON.parse(responseText)
    } catch (e) {
      console.error('Failed to parse response:', e)
      return NextResponse.json(
        {
          error: 'תשובה לא תקינה מ-Green API',
          details: responseText
        },
        { status: 500 }
      )
    }
    
    // בדוק אם ההודעה נשלחה
    if (greenApiResponse.ok && result.idMessage) {
      console.log('✅ Success! Message ID:', result.idMessage)
      
      return NextResponse.json({
        success: true,
        message: 'ההודעה נשלחה בהצלחה! 🎉',
        messageId: result.idMessage,
        phone: phoneNumber,
        tip: 'בדוק את ה-WhatsApp שלך'
      })
    } else {
      console.error('❌ Failed to send:', result)
      
      // טפל בשגיאות נפוצות
      let errorMessage = 'השליחה נכשלה'
      let solution = ''
      
      if (result.error === 'Instance not authorized' || result.stateInstance === 'notAuthorized') {
        errorMessage = 'המספר לא מחובר ל-WhatsApp'
        solution = 'לך ל-Green API וסרוק את ה-QR code מחדש'
      } else if (result.error === 'Bad request' || result.error === 'Bad Request') {
        errorMessage = 'בעיה בפורמט הבקשה'
        solution = 'בדוק שהמספר תקין'
      }
      
      return NextResponse.json(
        {
          error: errorMessage,
          solution: solution,
          details: result
        },
        { status: 400 }
      )
    }
    
  } catch (error: any) {
    console.error('Unexpected error:', error)
    
    return NextResponse.json(
      {
        error: 'שגיאה לא צפויה',
        message: error.message || 'Unknown error',
        type: error.constructor.name
      },
      { status: 500 }
    )
  }
}
