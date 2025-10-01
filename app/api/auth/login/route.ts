// מסד נתונים של משתמשים - בזיכרון
export interface User {
  id: string;
  username: string;
  password: string; // מוצפן
  role: 'super-admin' | 'admin' | 'user';
  expiryDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// פונקציית הצפנה פשוטה
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'salt-2024-key');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// משתמשים קבועים במערכת
// הסיסמאות כבר מוצפנות
export const DEFAULT_USERS: User[] = [
  {
    id: '1',
    username: 'superadmin',
    password: 'f0e2f9784a98554cd5c7e6f39e7b2f3a908c45c4b1e8a9f87d5c3a2b1e4f6a8c', // super123
    role: 'super-admin',
    expiryDate: '2030-12-31',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2', 
    username: 'admin',
    password: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // admin123
    role: 'admin',
    expiryDate: '2030-12-31',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    username: 'erez',
    password: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', // 1234
    role: 'user',
    expiryDate: '2025-10-10',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// מחלקה לניהול משתמשים
class UsersDatabase {
  private users: User[] = [];

  constructor() {
    // טעינת משתמשים מ-localStorage או שימוש בברירת מחדל
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('app_users');
      this.users = stored ? JSON.parse(stored) : DEFAULT_USERS;
    } else {
      this.users = DEFAULT_USERS;
    }
  }

  private save() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_users', JSON.stringify(this.users));
    }
  }

  async findAll(): Promise<User[]> {
    return this.users.map(u => ({ ...u, password: undefined } as any));
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find(u => u.id === id) || null;
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.users.find(u => u.username === username) || null;
  }

  async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const newUser: User = {
      ...userData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.users.push(newUser);
    this.save();
    
    return { ...newUser, password: undefined } as any;
  }

  async update(id: string, userData: Partial<User>): Promise<User | null> {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return null;
    
    this.users[index] = {
      ...this.users[index],
      ...userData,
      updatedAt: new Date().toISOString()
    };
    
    this.save();
    return { ...this.users[index], password: undefined } as any;
  }

  async delete(id: string): Promise<boolean> {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return false;
    
    // אל תמחק super-admin
    if (this.users[index].role === 'super-admin') {
      return false;
    }
    
    this.users.splice(index, 1);
    this.save();
    return true;
  }

  async verifyPassword(username: string, password: string): Promise<User | null> {
    const user = await this.findByUsername(username);
    if (!user) return null;
    
    const hashedPassword = await hashPassword(password);
    if (user.password === hashedPassword) {
      return { ...user, password: undefined } as any;
    }
    
    return null;
  }
}

// יצירת instance יחיד
export const usersDB = new UsersDatabase();
