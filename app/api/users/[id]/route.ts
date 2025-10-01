import { NextRequest, NextResponse } from 'next/server';
import { usersStore } from '@/lib/users-store';

// Middleware לבדיקת הרשאות
async function checkAdminAuth(request: NextRequest): Promise<boolean> {
  try {
    const authToken = request.cookies.get('auth-token');
    if (!authToken) return false;

    // בדיקה בסיסית של הטוקן
    const tokenData = JSON.parse(
      Buffer.from(authToken.value, 'base64').toString('utf8')
    );
    
    // בדיקה שהמשתמש הוא admin או superadmin
    return tokenData.role === 'admin' || tokenData.role === 'superadmin';
  } catch (error) {
    console.error('Auth check error:', error);
    return false;
  }
}

// PUT - עדכון משתמש
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // בדיקת הרשאות
    const isAdmin = await checkAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'אין הרשאה' },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { username, password, role, expiryDate, isActive } = body;

    // חיפוש המשתמש
    const existingUser = usersStore.findById(id);
    if (!existingUser) {
      return NextResponse.json(
        { error: 'המשתמש לא נמצא' },
        { status: 404 }
      );
    }

    // בדיקה אם שם המשתמש החדש כבר תפוס (אם השם השתנה)
    if (username && username !== existingUser.username) {
      const userWithSameName = usersStore.findByUsername(username);
      if (userWithSameName) {
        return NextResponse.json(
          { error: 'שם המשתמש כבר קיים' },
          { status: 409 }
        );
      }
    }

    // הכנת נתונים לעדכון
    const updateData: any = {};
    if (username !== undefined) updateData.username = username;
    if (password !== undefined && password !== '') updateData.password = password;
    if (role !== undefined) updateData.role = role;
    if (expiryDate !== undefined) updateData.expiryDate = expiryDate;
    if (isActive !== undefined) updateData.isActive = isActive;

    // עדכון המשתמש
    const updatedUser = usersStore.update(id, updateData);
    
    if (!updatedUser) {
      return NextResponse.json(
        { error: 'שגיאה בעדכון המשתמש' },
        { status: 500 }
      );
    }

    // החזרת המשתמש המעודכן ללא הסיסמה
    const safeUser = {
      id: updatedUser.id,
      username: updatedUser.username,
      role: updatedUser.role,
      expiryDate: updatedUser.expiryDate,
      isActive: updatedUser.isActive,
      createdAt: updatedUser.createdAt
    };

    return NextResponse.json(
      { 
        message: 'המשתמש עודכן בהצלחה',
        user: safeUser 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'שגיאה בעדכון המשתמש' },
      { status: 500 }
    );
  }
}

// DELETE - מחיקת משתמש
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // בדיקת הרשאות
    const isAdmin = await checkAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'אין הרשאה' },
        { status: 403 }
      );
    }

    const { id } = params;

    // חיפוש המשתמש
    const existingUser = usersStore.findById(id);
    if (!existingUser) {
      return NextResponse.json(
        { error: 'המשתמש לא נמצא' },
        { status: 404 }
      );
    }

    // מניעת מחיקת superadmin
    if (existingUser.role === 'superadmin') {
      return NextResponse.json(
        { error: 'לא ניתן למחוק משתמש superadmin' },
        { status: 403 }
      );
    }

    // בדיקה שלא מוחקים את עצמך
    const authToken = request.cookies.get('auth-token');
    if (authToken) {
      try {
        const tokenData = JSON.parse(
          Buffer.from(authToken.value, 'base64').toString('utf8')
        );
        if (tokenData.userId === id) {
          return NextResponse.json(
            { error: 'לא ניתן למחוק את המשתמש הנוכחי' },
            { status: 403 }
          );
        }
      } catch (error) {
        console.error('Token parse error:', error);
      }
    }

    // מחיקת המשתמש
    const deleted = usersStore.delete(id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'שגיאה במחיקת המשתמש' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'המשתמש נמחק בהצלחה' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'שגיאה במחיקת המשתמש' },
      { status: 500 }
    );
  }
}

// GET - קבלת משתמש בודד
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // בדיקת הרשאות
    const isAdmin = await checkAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'אין הרשאה' },
        { status: 403 }
      );
    }

    const { id } = params;

    // חיפוש המשתמש
    const user = usersStore.findById(id);
    if (!user) {
      return NextResponse.json(
        { error: 'המשתמש לא נמצא' },
        { status: 404 }
      );
    }

    // החזרת המשתמש ללא הסיסמה
    const safeUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      expiryDate: user.expiryDate,
      isActive: user.isActive,
      createdAt: user.createdAt
    };

    return NextResponse.json(safeUser, { status: 200 });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'שגיאה בקבלת המשתמש' },
      { status: 500 }
    );
  }
}
