// פונקציות עזר לאימות ללא תלות בספריות חיצוניות

export async function hashPassword(password: string): Promise<string> {
  // במקום bcrypt, נשתמש בהצפנה בסיסית
  // בפרודקשן כדאי להשתמש ב-bcrypt אמיתי
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'salt-key-2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const testHash = await hashPassword(password);
  return testHash === hash;
}

export function generateToken(payload: any): string {
  // יצירת JWT בסיסי
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify({
    ...payload,
    exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
  }));
  
  const signature = btoa('signature-' + encodedHeader + '.' + encodedPayload);
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyToken(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    
    if (payload.exp && payload.exp < Date.now()) {
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}
