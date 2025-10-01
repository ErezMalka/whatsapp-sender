export interface User {
  id: string;
  username: string;
  password: string;
  role: string;
  expiryDate: string;
  isActive: boolean;
  createdAt: string;
}

// משתמשי ברירת מחדל - תיקון שמות ה-roles
const DEFAULT_USERS: User[] = [
  {
    id: '1',
    username: 'superadmin',
    password: 'super123',
    role: 'superadmin', // בלי מקף!
    expiryDate: '2025-12-31',
    isActive: true,
    createdAt: '2024-01-01'
  },
  {
    id: '2',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    expiryDate: '2025-12-31',
    isActive: true,
    createdAt: '2024-01-01'
  },
  {
    id: '3',
    username: 'erez',
    password: '1234',
    role: 'user',
    expiryDate: '2025-12-31',
    isActive: true,
    createdAt: '2024-01-01'
  }
];

// מחלקה לניהול משתמשים
class UsersStore {
  private users: User[] = [...DEFAULT_USERS];

  // קבלת כל המשתמשים
  getAll(): User[] {
    return this.users;
  }

  // חיפוש משתמש לפי ID
  findById(id: string): User | null {
    return this.users.find(user => user.id === id) || null;
  }

  // חיפוש משתמש לפי שם משתמש
  findByUsername(username: string): User | null {
    return this.users.find(user => user.username === username) || null;
  }

  // אימות משתמש
  authenticate(username: string, password: string): User | null {
    const user = this.users.find(
      u => u.username === username && u.password === password
    );
    return user || null;
  }

  // יצירת משתמש חדש
  create(userData: Omit<User, 'id' | 'createdAt'>): User {
    const newUser: User = {
      ...userData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    this.users.push(newUser);
    return newUser;
  }

  // עדכון משתמש
  update(id: string, updates: Partial<User>): User | null {
    const index = this.users.findIndex(user => user.id === id);
    if (index === -1) return null;
    
    this.users[index] = {
      ...this.users[index],
      ...updates,
      id: this.users[index].id // וודא שה-ID לא משתנה
    };
    
    return this.users[index];
  }

  // מחיקת משתמש
  delete(id: string): boolean {
    const index = this.users.findIndex(user => user.id === id);
    if (index === -1) return false;
    
    this.users.splice(index, 1);
    return true;
  }
}

// יצירת instance יחיד
export const usersStore = new UsersStore();
