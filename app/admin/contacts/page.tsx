// app/admin/contacts/page.tsx
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
  
  // Form states
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

  // פונקציה להוספת מספר אנשי קשר לדוגמה
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
        <p>סה"כ אנשי קשר: <strong>{contacts.length}</strong></p>
        {contacts.length === 1 && (
          <div className="mt-2 p-2 bg-yellow-100 text-yellow-800 rounded">
            ⚠️ נראה שאנשי הקשר הקודמים נמחקו. לחץ ע
