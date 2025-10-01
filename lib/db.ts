// מסד נתונים זמני בזיכרון
// בפרודקשן תחליף ב-Prisma או מסד נתונים אמיתי

interface User {
  id: string;
  username: string;
  password: string;
  expiryDate: Date;
  isActive: boolean;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

// נתונים ראשוניים - הסיסמאות כבר מוצפנות
const initialUsers: User[] = [
  {
    id: '1',
    username: 'admin',
    password: '5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5', // admin123
    expiryDate: new Date('2030-12-31'),
    isActive: true,
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    username: 'erez',
    password: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', // 1234
    expiryDate: new Date('2025-10-10'),
    isActive: true,
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// אחסון בזיכרון או localStorage
let users: User[] = [];

if (typeof window !== 'undefined') {
  // צד לקוח - שימוש ב-localStorage
  const stored = localStorage.getItem('users');
  users = stored ? JSON.parse(stored) : initialUsers;
} else {
  // צד שרת - שימוש בזיכרון
  users = initialUsers;
}

export const db = {
  users: {
    findMany: async () => {
      return users.map(u => ({
        ...u,
        password: undefined // אל תחזיר סיסמאות
      }));
    },
    
    findUnique: async (where: { id?: string; username?: string }) => {
      return users.find(u => 
        (where.id && u.id === where.id) ||
        (where.username && u.username === where.username)
      );
    },
    
    create: async (data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newUser: User = {
        ...data,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      users.push(newUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('users', JSON.stringify(users));
      }
      return newUser;
    },
    
    update: async (id: string, data: Partial<User>) => {
      const index = users.findIndex(u => u.id === id);
      if (index === -1) throw new Error('User not found');
      
      users[index] = {
        ...users[index],
        ...data,
        updatedAt: new Date()
      };
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('users', JSON.stringify(users));
      }
      return users[index];
    },
    
    delete: async (id: string) => {
      const index = users.findIndex(u => u.id === id);
      if (index === -1) throw new Error('User not found');
      
      users.splice(index, 1);
      if (typeof window !== 'undefined') {
        localStorage.setItem('users', JSON.stringify(users));
      }
      return true;
    }
  }
};
