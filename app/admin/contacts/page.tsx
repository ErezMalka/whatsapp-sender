'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';

// Dynamic import למניעת בעיות SSR
const ImportContacts = dynamic(() => import('./ImportContacts'), {
  ssr: false,
  loading: () => <p>טוען רכיב ייבוא...</p>
});

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
  birth_date?: string;
  anniversary_date?: string;
  join_date?: string;
  last_order_date?: string;
  loyalty_points?: number;
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
    tags: [] as string[],
    birth_date: '',
    anniversary_date: '',
    join_date: new Date().toISOString().split('T')[0],
    last_order_date: '',
    loyalty_points: 0
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showExtendedFields, setShowExtendedFields] = useState(false);

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

  const exportContactsToCSV = (onlySelected = false) => {
    const contactsToExport = onlySelected 
      ? contacts.filter(c => selectedContacts.has(c.id))
      : contacts;

    if (contactsToExport.length === 0) {
      alert('אין אנשי קשר לייצוא');
      return;
    }

    // הכנת הנתונים לייצוא עם השדות החדשים
    let csvContent = 'שם,טלפון,אימייל,תגיות,סטטוס,יום הולדת,יום נישואין,תאריך הצטרפות,הזמנה אחרונה,נקודות\n';
    
    contactsToExport.forEach(contact => {
      const name = contact.name || '';
      const phone = contact.phone || '';
      const email = contact.email || '';
      const tags = contact.tags?.join(';') || '';
      const status = contact.opt_out ? 'הוסר' : 'פעיל';
      const birthDate = contact.birth_date || '';
      const anniversaryDate = contact.anniversary_date || '';
      const joinDate = contact.join_date || '';
      const lastOrderDate = contact.last_order_date || '';
      const loyaltyPoints = contact.loyalty_points || 0;
      
      csvContent += `${name},${phone},${email},${tags},${status},${birthDate},${anniversaryDate},${joinDate},${lastOrderDate},${loyaltyPoints}\n`;
    });

    // יצירת הקובץ והורדה
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().split('T')[0];
    const prefix = onlySelected ? 'selected_contacts' : 'all_contacts';
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${prefix}_export_${date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const message = onlySelected 
      ? `יוצאו ${contactsToExport.length} אנשי קשר נבחרים`
      : `יוצאו ${contactsToExport.length} אנשי קשר`;
    alert(message);
  };

  const handleAddContact = async () => {
    try {
      const contactData: any = {
        ...newContact,
        tenant_id: TENANT_ID,
        status: 'active',
        opt_out: false,
        loyalty_points: newContact.loyalty_points || 0
      };

      // נקה תאריכים ריקים
      if (!contactData.birth_date) delete contactData.birth_date;
      if (!contactData.anniversary_date) delete contactData.anniversary_date;
      if (!contactData.last_order_date) delete contactData.last_order_date;

      const { error } = await supabase
        .from('contacts')
        .insert([contactData]);

      if (error) throw error;
      
      setNewContact({ 
        name: '', 
        phone: '', 
        email: '', 
        tags: [],
        birth_date: '',
        anniversary_date: '',
        join_date: new Date().toISOString().split('T')[0],
        last_order_date: '',
        loyalty_points: 0
      });
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
      const updateData: any = {
        name: editingContact.name,
        phone: editingContact.phone,
        email: editingContact.email,
        tags: editingContact.tags,
        birth_date: editingContact.birth_date || null,
        anniversary_date: editingContact.anniversary_date || null,
        join_date: editingContact.join_date || null,
        last_order_date: editingContact.last_order_date || null,
        loyalty_points: editingContact.loyalty_points || 0
      };

      const { error } = await supabase
        .from('contacts')
        .update(updateData)
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL');
  };

  const getUpcomingBirthdays = () => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return contacts.filter(contact => {
      if (!contact.birth_date) return false;
      const birthDate = new Date(contact.birth_date);
      birthDate.setFullYear(today.getFullYear());
      return birthDate >= today && birthDate <= nextWeek;
    });
  };

  if (loading) {
    return <div className="p-8">טוען...</div>;
  }

  const upcomingBirthdays = getUpcomingBirthdays();

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">ניהול אנשי קשר</h1>
        <div className="flex gap-2 flex-wrap">
          {contacts.length > 0 && (
            <button
              onClick={() => exportContactsToCSV(false)}
              className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
            >
              💾 ייצא הכל לCSV ({contacts.length})
            </button>
          )}
          {selectedContacts.size > 0 && (
            <button
              onClick={() => exportContactsToCSV(true)}
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
            >
              📋 ייצא {selectedContacts.size} נבחרים
            </button>
          )}
          <button
            onClick={() => setShowImport(!showImport)}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            {showImport ? 'סגור ייבוא' : '📤 ייבוא מקובץ'}
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            {showAddForm ? 'ביטול' : '+ הוסף איש קשר'}
          </button>
          <button
            onClick={() => setShowExtendedFields(!showExtendedFields)}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            {showExtendedFields ? '📉 הסתר שדות' : '📊 הצג שדות מורחבים'}
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
        <div className="flex justify-between items-center">
          <p>סה״כ אנשי קשר: <strong>{contacts.length}</strong></p>
          {upcomingBirthdays.length > 0 && (
            <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded">
              🎂 {upcomingBirthdays.length} ימי הולדת השבוע!
            </div>
          )}
        </div>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם *</label>
              <input
                type="text"
                placeholder="שם מלא"
                value={newContact.name}
                onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">טלפון *</label>
              <input
                type="text"
                placeholder="+972501234567"
                value={newContact.phone}
                onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
              <input
                type="email"
                placeholder="example@email.com"
                value={newContact.email}
                onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">תגיות</label>
              <select
                multiple
                value={newContact.tags}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setNewContact({...newContact, tags: selected});
                }}
                className="border p-2 rounded w-full"
                title="החזק Ctrl/Cmd לבחירה מרובה"
                size={5}
              >
                <option value="לקוחות">לקוחות</option>
                <option value="ספקים">ספקים</option>
                <option value="עובדים">עובדים</option>
                <option value="VIP">VIP</option>
                <option value="חדשים">חדשים</option>
                {tags.filter(tag => !['לקוחות', 'ספקים', 'עובדים', 'VIP', 'חדשים'].includes(tag.name))
                  .map(tag => (
                    <option key={tag.id} value={tag.name} style={{color: tag.color}}>
                      {tag.name}
                    </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">החזק Ctrl/Cmd לבחירה מרובה</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">🎂 יום הולדת</label>
              <input
                type="date"
                value={newContact.birth_date}
                onChange={(e) => setNewContact({...newContact, birth_date: e.target.value})}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">💍 יום נישואין</label>
              <input
                type="date"
                value={newContact.anniversary_date}
                onChange={(e) => setNewContact({...newContact, anniversary_date: e.target.value})}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">📅 תאריך הצטרפות</label>
              <input
                type="date"
                value={newContact.join_date}
                onChange={(e) => setNewContact({...newContact, join_date: e.target.value})}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">🛒 הזמנה אחרונה</label>
              <input
                type="date"
                value={newContact.last_order_date}
                onChange={(e) => setNewContact({...newContact, last_order_date: e.target.value})}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">⭐ נקודות נאמנות</label>
              <input
                type="number"
                placeholder="0"
                value={newContact.loyalty_points}
                onChange={(e) => setNewContact({...newContact, loyalty_points: parseInt(e.target.value) || 0})}
                className="border p-2 rounded w-full"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAddContact}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              שמור איש קשר
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

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-right sticky left-0 bg-gray-50">
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
              {showExtendedFields && (
                <>
                  <th className="p-3 text-right">🎂 יום הולדת</th>
                  <th className="p-3 text-right">💍 יום נישואין</th>
                  <th className="p-3 text-right">📅 הצטרפות</th>
                  <th className="p-3 text-right">🛒 הזמנה אחרונה</th>
                  <th className="p-3 text-right">⭐ נקודות</th>
                </>
              )}
              <th className="p-3 text-right">סטטוס</th>
              <th className="p-3 text-right">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map(contact => (
              <tr key={contact.id} className="border-t hover:bg-gray-50">
                <td className="p-3 sticky left-0 bg-white">
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
                    <div>
                      {contact.name}
                      {contact.birth_date && new Date(contact.birth_date).getMonth() === new Date().getMonth() && 
                       new Date(contact.birth_date).getDate() === new Date().getDate() && (
                        <span className="ml-2">🎂</span>
                      )}
                    </div>
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
                {showExtendedFields && (
                  <>
                    <td className="p-3">
                      {editingContact?.id === contact.id ? (
                        <input
                          type="date"
                          value={editingContact.birth_date || ''}
                          onChange={(e) => setEditingContact({...editingContact, birth_date: e.target.value})}
                          className="border p-1 rounded"
                        />
                      ) : (
                        formatDate(contact.birth_date)
                      )}
                    </td>
                    <td className="p-3">
                      {editingContact?.id === contact.id ? (
                        <input
                          type="date"
                          value={editingContact.anniversary_date || ''}
                          onChange={(e) => setEditingContact({...editingContact, anniversary_date: e.target.value})}
                          className="border p-1 rounded"
                        />
                      ) : (
                        formatDate(contact.anniversary_date)
                      )}
                    </td>
                    <td className="p-3">{formatDate(contact.join_date)}</td>
                    <td className="p-3">
                      {editingContact?.id === contact.id ? (
                        <input
                          type="date"
                          value={editingContact.last_order_date || ''}
                          onChange={(e) => setEditingContact({...editingContact, last_order_date: e.target.value})}
                          className="border p-1 rounded"
                        />
                      ) : (
                        formatDate(contact.last_order_date)
                      )}
                    </td>
                    <td className="p-3">
                      {editingContact?.id === contact.id ? (
                        <input
                          type="number"
                          value={editingContact.loyalty_points || 0}
                          onChange={(e) => setEditingContact({...editingContact, loyalty_points: parseInt(e.target.value) || 0})}
                          className="border p-1 rounded w-20"
                        />
                      ) : (
                        contact.loyalty_points || 0
                      )}
                    </td>
                  </>
                )}
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
