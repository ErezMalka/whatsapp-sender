// מאגר משתמשים משותף לכל ה-API routes

export interface User {
  id: string;
  username: string;
  password: string;
  role: string;
  expiryDate: string;
  isActive: boolean;
  createdAt: string;
}

// משתמשי ברירת מחדל
const DEFAULT_USERS: User[] = [
  {
    id: '1',
    username: 'superadmin',
    password: 'super123',
    role: 'super-admin',
    expiryDate: '2030-12-31',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    expiryDate: '2030-12-31',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    username: 'erez',
    password: '1234',
    role: 'user',
    expiryDate: '2025-10-10',
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

// מאגר משתמשים גלובלי
class UsersStore {
  private users: User[] = [...DEFAULT_USERS];

  getAll(): User[] {
    return this.users;
  }

  findByUsername(username: string): User | undefined {
    return this.users.find(u => u.username === username);
  }

  findById(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  }

  authenticate(username: string, password: string): User | null {
    const user = this.users.find(u => 
      u.username === username && u.password === password
    );
    return user || null;
  }

  create(userData: Omit<User, 'id' | 'createdAt'>): User {
    const newUser: User = {
      ...userData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    this.users.push(newUser);
    console.log('User created:', newUser.username, 'Total users:', this.users.length);
    return newUser;
  }

  update(id: string, updates: Partial<User>): User | null {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return null;
    
    this.users[index] = {
      ...this.users[index],
      ...updates,
      id // Keep original ID
    };
    return this.users[index];
  }

  delete(id: string): boolean {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return false;
    
    // אל תמחק super-admin
    if (this.users[index].role === 'super-admin') {
      return false;
    }
    
    this.users.splice(index, 1);
    return true;
  }
}

// יצירת instance יחיד שישותף בין כל ה-routes
export const usersStore = new UsersStore();
