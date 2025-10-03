// This is a simple in-memory store for user data
// In production, you'd want to use a proper database

interface User {
  id: string;
  username: string;
  password: string; // In production, this should be hashed!
  role: 'admin' | 'user';
  createdAt: string;
}

class UsersStore {
  private users: Map<string, User> = new Map();

  constructor() {
    // Initialize with a default admin user
    this.users.set('1', {
      id: '1',
      username: 'admin',
      password: 'admin123', // In production, use proper hashing!
      role: 'admin',
      createdAt: new Date().toISOString(),
    });
  }

  getAll(): User[] {
    return Array.from(this.users.values());
  }

  getById(id: string): User | undefined {
    return this.users.get(id);
  }

  getByUsername(username: string): User | undefined {
    return Array.from(this.users.values()).find(u => u.username === username);
  }

  create(userData: Omit<User, 'id' | 'createdAt'>): User {
    const id = Date.now().toString();
    const user: User = {
      ...userData,
      id,
      createdAt: new Date().toISOString(),
    };
    this.users.set(id, user);
    return user;
  }

  update(id: string, userData: Partial<Omit<User, 'id' | 'createdAt'>>): User | undefined {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  delete(id: string): boolean {
    return this.users.delete(id);
  }

  validateCredentials(username: string, password: string): User | null {
    const user = this.getByUsername(username);
    if (user && user.password === password) {
      return user;
    }
    return null;
  }
}

// Export as both named and default export for compatibility
export const usersStore = new UsersStore();
export default usersStore;
