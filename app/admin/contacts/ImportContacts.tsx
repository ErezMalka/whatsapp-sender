'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

interface Contact {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  email?: string;
  tags?: string[];
  status: string;
  opt_out: boolean;
  created_at?: string;
  updated_at?: string;
}

interface Tag {
  id: string;
  tenant_id: string;
  name: string;
  color?: string;
  contacts_count?: number;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: '',
    tags: [] as string[]
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  useEffect(() => {
    fetchContacts();
    fetchTags();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('tenant_id', TENANT_ID);

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const handleAddContact = async () => {
    try {
      const { error } = await supabase
        .from('contacts')
        .insert([{
          ...newContact,
          tenant_id: TENANT_ID,
          status: 'active',
          opt_out: false
        }]);

      if (error) throw error;
      
      setNewContact({ name: '', phone: '', email: '', tags: [] });
      setShowAddForm(false);
      fetchContacts();
    } catch (error) {
      console.error('Error adding contact:', error);
      alert('שגיאה בהוספת איש קשר');
    }
  };

  const handleUpdateContact = async () => {
    if (!editingContact) return;

    try {
      const { error } = await supabase
        .from('contacts')
        .update({
          name: editingContact.name,
          phone: editingContact.phone,
          email: editingContact.email,
          tags: editingContact.tags
        })
        .eq('id', editingContact.id)
        .eq('tenant_id', TENANT_ID);

      if (error) throw error;
      
      setEditingContact(null);
      fetchContacts();
    } catch (error) {
      console.error('Error updating contact:', error);
      alert('שגיאה בעדכון איש קשר');
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק איש קשר זה?')) return;

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id)
        .eq('tenant_id', TENANT_ID);

      if (error) throw error;
      fetchContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('שגיאה במחיקת איש קשר');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedContacts.size === 0) {
      alert('לא נבחרו אנשי קשר');
      return;
    }

    if (!confirm(`האם אתה בטוח שברצונך למחוק ${selectedContacts.size} אנשי קשר?`)) return;

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .in('id', Array.from(selectedContacts))
        .eq('tenant_id', TENANT_ID);

      if (error) throw error;
      
      setSelectedContacts(new Set());
      fetchContacts();
    } catch (error) {
      console.error('Error bulk deleting contacts:', error);
      alert('שגיאה במחיקת אנשי קשר');
    }
  };

  const toggleSelectAll = () => {
    if (selectedContacts.size === contacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(contacts.map(c => c.id)));
    }
  };

  const toggleSelectContact = (id: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedContacts(newSelected);
  };

  const addSampleContacts = async () => {
    const sampleContacts = [
      { name: 'ישראל ישראלי', phone: '+972501234567', email: 'israel@example.com', tags: ['לקוחות', 'VIP'] },
      { name: 'רחל כהן', phone: '+972502223333', email: 'rachel@example.com', tags: ['חדשים'] },
      { name: 'דוד לוי', phone: '+972523334444', email: '', tags: ['לקוחות'] },
      { name: 'שרה אברהם', phone: '+972504445555', email: 'sara@example.com', tags: ['ספקים'] },
      { name: 'משה רוזנברג', phone: '+972505556666', email: 'moshe@example.com', tags: ['עובדים', 'VIP'] },
      { name: 'ארז', phone: '+972505782800', email: '', tags: ['ארז'] }
    ];

    try {
      for (const contact of sampleContacts) {
        await supabase
          .from('contacts')
          .insert([{
            ...contact,
            tenant_id: TENANT_ID,
            status: 'active',
            opt_out: false
          }]);
      }
      alert('נוספו 6 אנשי קשר לדוגמה!');
      fetchContacts();
    } catch (error) {
      console.error('Error adding sample contacts:', error);
      alert('שגיאה בהוספת אנשי קשר לדוגמה');
    }
  };

  if (loading) {
    return <div className="p-8">טוען...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">ניהול אנשי קשר</h1>
        <div className="flex gap-2">
          {contacts.length === 1 && (
            <button
              onClick={addSampleContacts}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
            >
              🔄 שחזר אנשי קשר לדוגמה
            </button>
          )}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            {showAddForm ? 'ביטול' : '+ הוסף איש קשר'}
          </button>
          {selectedContacts.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              מחק {selectedContacts.size} נבחרים
            </button>
          )}
        </div>
      </div>

      <div className="bg-gray-100 p-4 rounded mb-4">
        <p>סה״כ אנשי קשר: <strong>{contacts.length}</strong></p>
        {contacts.length === 1 && (
          <div className="mt-2 p-2 bg-yellow-100 text-yellow-800 rounded">
            ⚠️ נראה שאנשי הקשר הקודמים נמחקו. לחץ על ״שחזר אנשי קשר לדוגמה״ להוספת נתוני דוגמה.
          </div>
        )}
      </div>

      {showImport && (
        <div className="mb-6">
          <ImportContacts 
            onImportComplete={() => {
              fetchContacts();
              setShowImport(false);
            }}
            tenantId={TENANT_ID}
          />
        </div>
      )}

      {showAddForm && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold mb-4">הוסף איש קשר חדש</h3>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="שם"
              value={newContact.name}
              onChange={(e) => setNewContact({...newContact, name: e.target.value})}
              className="border p-2 rounded"
            />
            <input
              type="text"
              placeholder="טלפון (לדוגמה: +972501234567)"
              value={newContact.phone}
              onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
              className="border p-2 rounded"
            />
            <input
              type="email"
              placeholder="אימייל (אופציונלי)"
              value={newContact.email}
              onChange={(e) => setNewContact({...newContact, email: e.target.value})}
              className="border p-2 rounded"
            />
            <select
              multiple
              value={newContact.tags}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setNewContact({...newContact, tags: selected});
              }}
              className="border p-2 rounded"
              title="החזק Ctrl/Cmd לבחירה מרובה"
            >
              <option value="לקוחות">לקוחות</option>
              <option value="ספקים">ספקים</option>
              <option value="עובדים">עובדים</option>
              <option value="VIP">VIP</option>
              <option value="חדשים">חדשים</option>
              {tags.map(tag => (
                <option key={tag.id} value={tag.name}>{tag.name}</option>
              ))}
            </select>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAddContact}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              שמור
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-right">
                <input
                  type="checkbox"
                  checked={selectedContacts.size === contacts.length && contacts.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="p-3 text-right">שם</th>
              <th className="p-3 text-right">טלפון</th>
              <th className="p-3 text-right">אימייל</th>
              <th className="p-3 text-right">תגיות</th>
              <th className="p-3 text-right">סטטוס</th>
              <th className="p-3 text-right">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map(contact => (
              <tr key={contact.id} className="border-t hover:bg-gray-50">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedContacts.has(contact.id)}
                    onChange={() => toggleSelectContact(contact.id)}
                  />
                </td>
                <td className="p-3">
                  {editingContact?.id === contact.id ? (
                    <input
                      type="text"
                      value={editingContact.name}
                      onChange={(e) => setEditingContact({...editingContact, name: e.target.value})}
                      className="border p-1 rounded"
                    />
                  ) : (
                    contact.name
                  )}
                </td>
                <td className="p-3" dir="ltr">
                  {editingContact?.id === contact.id ? (
                    <input
                      type="text"
                      value={editingContact.phone}
                      onChange={(e) => setEditingContact({...editingContact, phone: e.target.value})}
                      className="border p-1 rounded"
                      dir="ltr"
                    />
                  ) : (
                    contact.phone
                  )}
                </td>
                <td className="p-3">
                  {editingContact?.id === contact.id ? (
                    <input
                      type="email"
                      value={editingContact.email || ''}
                      onChange={(e) => setEditingContact({...editingContact, email: e.target.value})}
                      className="border p-1 rounded"
                    />
                  ) : (
                    contact.email || '-'
                  )}
                </td>
                <td className="p-3">
                  {contact.tags?.join(', ') || '-'}
                </td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    contact.opt_out ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {contact.opt_out ? 'הסרה' : 'פעיל'}
                  </span>
                </td>
                <td className="p-3">
                  {editingContact?.id === contact.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={handleUpdateContact}
                        className="text-green-600 hover:underline"
                      >
                        שמור
                      </button>
                      <button
                        onClick={() => setEditingContact(null)}
                        className="text-gray-600 hover:underline"
                      >
                        ביטול
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingContact(contact)}
                        className="text-blue-600 hover:underline"
                      >
                        ערוך
                      </button>
                      <button
                        onClick={() => handleDeleteContact(contact.id)}
                        className="text-red-600 hover:underline"
                      >
                        מחק
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {contacts.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            אין אנשי קשר. לחץ על הוסף איש קשר להתחיל.
          </div>
        )}
      </div>
    </div>
  );
}
