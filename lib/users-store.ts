import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  username: string;
  password: string;
  role: string;
  expiryDate: string;
  isActive: boolean;
  createdAt: string;
}

// Type for database row
interface UserRow {
  id: string;
  username: string;
  password: string;
  role: string;
  expiry_date: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

class UsersStore {
  private supabase: ReturnType<typeof createClient> | null = null;
  private useInMemory = false;
  private inMemoryUsers: User[] = [];

  constructor() {
    this.initializeSupabase();
    this.initializeDefaultUsers();
  }

  private initializeSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️ Supabase credentials not found, using in-memory storage');
      this.useInMemory = true;
      return;
    }

    try {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log('✅ Connected to Supabase');
    } catch (error) {
      console.error('❌ Failed to connect to Supabase:', error);
      this.useInMemory = true;
    }
  }

  private async initializeDefaultUsers() {
    if (this.useInMemory) {
      // Initialize in-memory users
      const hashedPassword = await bcrypt.hash('admin123', 10);
      this.inMemoryUsers = [
        {
          id: '1',
          username: 'admin',
          password: hashedPassword,
          role: 'admin',
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          isActive: true,
          createdAt: new Date().toISOString()
        }
      ];
      return;
    }

    // Check if admin exists in Supabase
    if (!this.supabase) return;

    try {
      const { data: existingAdmin } = await this.supabase
        .from('users')
        .select('id')
        .eq('username', 'admin')
        .single();

      if (!existingAdmin) {
        // Create admin user if doesn't exist
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await this.supabase
          .from('users')
          .insert([{
            username: 'admin',
            password: hashedPassword,
            role: 'admin',
            expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            is_active: true
          }]);
        console.log('✅ Admin user created');
      }
    } catch (error) {
      console.error('Error initializing admin user:', error);
    }
  }

  // Convert database row to User interface
  private rowToUser(row: UserRow): User {
    return {
      id: row.id,
      username: row.username,
      password: row.password,
      role: row.role,
      expiryDate: row.expiry_date,
      isActive: row.is_active,
      createdAt: row.created_at
    };
  }

  // Convert User interface to database row
  private userToRow(user: Partial<User>): Partial<UserRow> {
    const row: Partial<UserRow> = {};
    if (user.username !== undefined) row.username = user.username;
    if (user.password !== undefined) row.password = user.password;
    if (user.role !== undefined) row.role = user.role;
    if (user.expiryDate !== undefined) row.expiry_date = user.expiryDate;
    if (user.isActive !== undefined) row.is_active = user.isActive;
    return row;
  }

  async getAll(): Promise<User[]> {
    if (this.useInMemory) {
      return [...this.inMemoryUsers];
    }

    if (!this.supabase) {
      throw new Error('Database connection not available');
    }

    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(row => this.rowToUser(row));
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<User | undefined> {
    if (this.useInMemory) {
      return this.inMemoryUsers.find(u => u.id === id);
    }

    if (!this.supabase) {
      throw new Error('Database connection not available');
    }

    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return undefined; // Not found
        throw error;
      }
      return data ? this.rowToUser(data) : undefined;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  async findByUsername(username: string): Promise<User | undefined> {
    if (this.useInMemory) {
      return this.inMemoryUsers.find(u => u.username === username);
    }

    if (!this.supabase) {
      throw new Error('Database connection not available');
    }

    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return undefined; // Not found
        throw error;
      }
      return data ? this.rowToUser(data) : undefined;
    } catch (error) {
      console.error('Error finding user by username:', error);
      throw error;
    }
  }

  async authenticate(username: string, password: string): Promise<User | null> {
    try {
      const user = await this.findByUsername(username);
      if (!user) return null;

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return null;

      // Check if user is active and not expired
      if (!user.isActive) return null;
      if (new Date(user.expiryDate) < new Date()) return null;

      return user;
    } catch (error) {
      console.error('Error authenticating user:', error);
      return null;
    }
  }

  async create(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    // Hash password before saving
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    if (this.useInMemory) {
      const newUser: User = {
        ...userData,
        id: Date.now().toString(),
        password: hashedPassword,
        createdAt: new Date().toISOString()
      };
      this.inMemoryUsers.push(newUser);
      return newUser;
    }

    if (!this.supabase) {
      throw new Error('Database connection not available');
    }

    try {
      const { data, error } = await this.supabase
        .from('users')
        .insert([{
          username: userData.username,
          password: hashedPassword,
          role: userData.role,
          expiry_date: userData.expiryDate,
          is_active: userData.isActive
        }])
        .select()
        .single();

      if (error) throw error;
      return this.rowToUser(data);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async update(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> {
    // Hash password if it's being updated
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    if (this.useInMemory) {
      const index = this.inMemoryUsers.findIndex(u => u.id === id);
      if (index === -1) return null;
      
      this.inMemoryUsers[index] = { ...this.inMemoryUsers[index], ...updates };
      return this.inMemoryUsers[index];
    }

    if (!this.supabase) {
      throw new Error('Database connection not available');
    }

    try {
      const { data, error } = await this.supabase
        .from('users')
        .update(this.userToRow(updates))
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      return data ? this.rowToUser(data) : null;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    if (this.useInMemory) {
      const index = this.inMemoryUsers.findIndex(u => u.id === id);
      if (index === -1) return false;
      
      this.inMemoryUsers.splice(index, 1);
      return true;
    }

    if (!this.supabase) {
      throw new Error('Database connection not available');
    }

    try {
      const { error } = await this.supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.code === 'PGRST116') return false; // Not found
        throw error;
      }
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  async checkHealth(): Promise<{ connected: boolean; mode: string }> {
    if (this.useInMemory) {
      return { connected: true, mode: 'in-memory' };
    }

    if (!this.supabase) {
      return { connected: false, mode: 'error' };
    }

    try {
      const { error } = await this.supabase
        .from('users')
        .select('count')
        .limit(1);

      if (error) throw error;
      return { connected: true, mode: 'supabase' };
    } catch (error) {
      console.error('Health check failed:', error);
      return { connected: false, mode: 'error' };
    }
  }
}

// Create singleton instance
const usersStore = new UsersStore();
export default usersStore;
