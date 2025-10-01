'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Save, UserPlus, Trash2, Edit2, X, Check, Users, Settings, Database } from 'lucide-react';

interface User {
  id: string;
  username: string;
  role: string;
  expiryDate: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminSettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editedUser, setEditedUser] = useState<Partial<User>>({});
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'user',
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [currentUserInfo, setCurrentUserInfo] = useState<any>(null);

  useEffect(() => {
    fetchUsers();
    loadSupabaseConfig();
    checkCurrentUser();
  }, []);

  const checkCurrentUser = () => {
    // בדיקת המשתמש הנוכחי מ-localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUserInfo(user);
      console.log('Current user from localStorage:', user);
    }

    // בדיקת cookies
    console.log('Current cookies:', document.cookie);
  };

  const getAuthHeaders = () => {
    // נסה לקבל את המידע מ-localStorage אם אין cookies
    const headers: any = {
      'Content-Type': 'application/json',
    };

    // הוסף מידע על המשתמש אם קיים
    const userStr = localStorage.getItem('user');
    if (userStr) {
      headers['X-User-Data'] = userStr;
    }

    return headers;
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      console.log('Fetching users...');
      const response = await fetch('/api/users', {
        credentials: 'include',
        headers: getAuthHeaders()
      });
      
      console.log('Users fetch response:', response.status);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch users');
      }
      
      const data = await response.json();
      console.log('Users data:', data);
      setUsers(data);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: 'שגיאה',
        description: error.message || 'שגיאה בטעינת המשתמשים',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password) {
      toast({
        title: 'שגיאה',
        description: 'נא למלא את כל השדות',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      console.log('Creating user:', newUser);
      const response = await fetch('/api/users', {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify(newUser)
      });

      console.log('Create user response:', response.status);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user');
      }

      toast({
        title: 'הצלחה',
        description: 'המשתמש נוצר בהצלחה'
      });

      setNewUser({
        username: '',
        password: '',
        role: 'user',
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });

      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: 'שגיאה',
        description: error.message || 'שגיאה ביצירת המשתמש',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId: string) => {
    setLoading(true);
    try {
      console.log('Updating user:', userId, editedUser);
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify(editedUser)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      toast({
        title: 'הצלחה',
        description: 'המשתמש עודכן בהצלחה'
      });

      setEditingUser(null);
      setEditedUser({});
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: 'שגיאה',
        description: error.message || 'שגיאה בעדכון המשתמש',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק משתמש זה?')) {
      return;
    }

    setLoading(true);
    try {
      console.log('Deleting user:', userId);
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      toast({
        title: 'הצלחה',
        description: 'המשתמש נמחק בהצלחה'
      });

      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: 'שגיאה',
        description: error.message || 'שגיאה במחיקת המשתמש',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSupabaseConfig = () => {
    setSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
    setSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-connection');
      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Failed to test connection'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl" dir="rtl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">הגדרות מערכת</h1>
        <p className="text-gray-500">ניהול משתמשים והגדרות המערכת</p>
        
        {/* הצגת מידע על המשתמש הנוכחי */}
        {currentUserInfo && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm">
              מחובר כ: <strong>{currentUserInfo.username}</strong> | 
              תפקיד: <Badge>{currentUserInfo.role}</Badge>
            </p>
          </div>
        )}
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            ניהול משתמשים
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            הגדרות מסד נתונים
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>הוספת משתמש חדש</CardTitle>
              <CardDescription>צור משתמש חדש במערכת</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="username">שם משתמש</Label>
                  <Input
                    id="username"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    placeholder="הזן שם משתמש"
                    disabled={loading}
                  />
                </div>
                <div>
                  <Label htmlFor="password">סיסמה</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="הזן סיסמה"
                    disabled={loading}
                  />
                </div>
                <div>
                  <Label htmlFor="role">תפקיד</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">משתמש</SelectItem>
                      <SelectItem value="admin">מנהל</SelectItem>
                      <SelectItem value="superadmin">מנהל ראשי</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="expiryDate">תאריך תפוגה</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={newUser.expiryDate}
                    onChange={(e) => setNewUser({ ...newUser, expiryDate: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleCreateUser} disabled={loading} className="w-full">
                    {loading ? (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="ml-2 h-4 w-4" />
                    )}
                    הוסף משתמש
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>רשימת משתמשים</CardTitle>
              <CardDescription>ניהול המשתמשים הקיימים במערכת</CardDescription>
            </CardHeader>
            <CardContent>
              {loading && users.length === 0 ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>שם משתמש</TableHead>
                      <TableHead>תפקיד</TableHead>
                      <TableHead>תאריך תפוגה</TableHead>
                      <TableHead>סטטוס</TableHead>
                      <TableHead>תאריך יצירה</TableHead>
                      <TableHead>פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          {editingUser === user.id ? (
                            <Input
                              value={editedUser.username || user.username}
                              onChange={(e) => setEditedUser({ ...editedUser, username: e.target.value })}
                              className="w-32"
                            />
                          ) : (
                            <span className="font-medium">{user.username}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingUser === user.id ? (
                            <Select
                              value={editedUser.role || user.role}
                              onValueChange={(value) => setEditedUser({ ...editedUser, role: value })}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">משתמש</SelectItem>
                                <SelectItem value="admin">מנהל</SelectItem>
                                <SelectItem value="superadmin">מנהל ראשי</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant={user.role === 'superadmin' ? 'destructive' : user.role === 'admin' ? 'default' : 'secondary'}>
                              {user.role}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingUser === user.id ? (
                            <Input
                              type="date"
                              value={editedUser.expiryDate?.split('T')[0] || user.expiryDate.split('T')[0]}
                              onChange={(e) => setEditedUser({ ...editedUser, expiryDate: e.target.value })}
                              className="w-36"
                            />
                          ) : (
                            new Date(user.expiryDate).toLocaleDateString('he-IL')
                          )}
                        </TableCell>
                        <TableCell>
                          {editingUser === user.id ? (
                            <Switch
                              checked={editedUser.isActive !== undefined ? editedUser.isActive : user.isActive}
                              onCheckedChange={(checked) => setEditedUser({ ...editedUser, isActive: checked })}
                            />
                          ) : (
                            <Badge variant={user.isActive ? 'success' : 'destructive'}>
                              {user.isActive ? 'פעיל' : 'לא פעיל'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString('he-IL')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {editingUser === user.id ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateUser(user.id)}
                                  disabled={loading}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingUser(null);
                                    setEditedUser({});
                                  }}
                                  disabled={loading}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingUser(user.id);
                                    setEditedUser({});
                                  }}
                                  disabled={loading || user.role === 'superadmin'}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteUser(user.id)}
                                  disabled={loading || user.role === 'superadmin'}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>הגדרות Supabase</CardTitle>
              <CardDescription>הגדר את החיבור למסד הנתונים</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="supabase-url">Supabase URL</Label>
                <Input
                  id="supabase-url"
                  value={supabaseUrl}
                  readOnly
                  placeholder="לא מוגדר"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supabase-key">Supabase Anon Key</Label>
                <Input
                  id="supabase-key"
                  type="password"
                  value={supabaseKey}
                  readOnly
                  placeholder="לא מוגדר"
                />
              </div>
              <Button onClick={testConnection} disabled={loading}>
                {loading ? (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                ) : (
                  <Settings className="ml-2 h-4 w-4" />
                )}
                בדוק חיבור
              </Button>
              {testResult && (
                <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  {testResult.message}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
