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
  group_ids?: string[];
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

interface Group {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  color: string;
  contacts_count?: number;
  created_at?: string;
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
  const [groups, setGroups] = useState<Group[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'contacts' | 'groups'>('contacts');
  
  // ניהול קבוצות
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });
  
  // ניהול אנשי קשר
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: '',
    tags: [] as string[],
    group_ids: [] as string[],
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
  
  // פילטרים
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // ניהול העברת אנשי קשר
  const [showMoveToGroup, setShowMoveToGroup] = useState(false);
  const [targetGroupId, setTargetGroupId] = useState<string>('');

  useEffect(() => {
    fetchContacts();
    fetchGroups();
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

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .order('name', { ascending: true });

      if (error) {
        // אם אין טבלת groups, ניצור אותה
        console.log('Groups table might not exist, creating default groups');
        await createDefaultGroups();
        return;
      }
      
      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const createDefaultGroups = async () => {
    const defaultGroups = [
      { tenant_id: TENANT_ID, name: 'לקוחות VIP', color: '#FFD700', description: 'לקוחות מועדפים' },
      { tenant_id: TENANT_ID, name: 'לקוחות חדשים', color: '#10B981', description: 'לקוחות שהצטרפו לאחרונה' },
      { tenant_id: TENANT_ID, name: 'לקוחות רגילים', color: '#3B82F6', description: 'לקוחות קבועים' },
      { tenant_id: TENANT_ID, name: 'ספקים', color: '#8B5CF6', description: 'ספקים ושותפים עסקיים' },
      { tenant_id: TENANT_ID, name: 'עובדים', color: '#EF4444', description: 'צוות העובדים' }
    ];

    try {
      const { data, error } = await supabase
        .from('groups')
        .insert(defaultGroups)
        .select();
      
      if (!error) {
        setGroups(data || []);
      }
    } catch (error) {
      console.error('Error creating default groups:', error);
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

  // פונקציות ניהול קבוצות
  const handleAddGroup = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .insert([{
          ...newGroup,
          tenant_id: TENANT_ID
        }])
        .select()
        .single();

      if (error) throw error;
      
      setGroups([...groups, data]);
      setNewGroup({ name: '', description: '', color: '#3B82F6' });
      setShowGroupForm(false);
    } catch (error) {
      console.error('Error adding group:', error);
      alert('שגיאה ביצירת קבוצה');
    }
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup) return;

    try {
      const { error } = await supabase
        .from('groups')
        .update({
          name: editingGroup.name,
          description: editingGroup.description,
          color: editingGroup.color
        })
        .eq('id', editingGroup.id)
        .eq('tenant_id', TENANT_ID);

      if (error) throw error;
      
      fetchGroups();
      setEditingGroup(null);
    } catch (error) {
      console.error('Error updating group:', error);
      alert('שגיאה בעדכון קבוצה');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    const contactsInGroup = contacts.filter(c => c.group_ids?.includes(groupId));
    
    if (contactsInGroup.length > 0) {
      if (!confirm(`יש ${contactsInGroup.length} אנשי קשר בקבוצה זו. למחוק בכל זאת?`)) {
        return;
      }
      
      // הסר את הקבוצה מכל אנשי הקשר
      for (const contact of contactsInGroup) {
        const newGroupIds = contact.group_ids?.filter(id => id !== groupId) || [];
        await supabase
          .from('contacts')
          .update({ group_ids: newGroupIds })
          .eq('id', contact.id);
      }
    }

    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId)
        .eq('tenant_id', TENANT_ID);

      if (error) throw error;
      
      fetchGroups();
      fetchContacts();
    } catch (error) {
      console.error('Error deleting group:', error);
      alert('שגיאה במחיקת קבוצה');
    }
  };

  // העברת אנשי קשר לקבוצה
  const handleMoveToGroup = async () => {
    if (!targetGroupId || selectedContacts.size === 0) {
      alert('בחר קבוצת יעד ואנשי קשר להעברה');
      return;
    }

    try {
      const contactsToMove = contacts.filter(c => selectedContacts.has(c.id));
      
      for (const contact of contactsToMove) {
        const currentGroups = contact.group_ids || [];
        const newGroups = currentGroups.includes(targetGroupId) 
          ? currentGroups 
          : [...currentGroups, targetGroupId];
          
        await supabase
          .from('contacts')
          .update({ group_ids: newGroups })
          .eq('id', contact.id);
      }
      
      alert(`${contactsToMove.length} אנשי קשר הוספו לקבוצה`);
      setShowMoveToGroup(false);
      setTargetGroupId('');
      setSelectedContacts(new Set());
      fetchContacts();
    } catch (error) {
      console.error('Error moving contacts to group:', error);
      alert('שגיאה בהעברת אנשי קשר');
    }
  };

  const handleRemoveFromGroup = async (contactId: string, groupId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;

    const newGroupIds = contact.group_ids?.filter(id => id !== groupId) || [];
    
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ group_ids: newGroupIds })
        .eq('id', contactId);

      if (error) throw error;
      
      fetchContacts();
    } catch (error) {
      console.error('Error removing from group:', error);
    }
  };

  // ייצוא לאקסל עם קבוצות
  const exportContactsToCSV = (onlySelected = false) => {
    const contactsToExport = onlySelected 
      ? contacts.filter(c => selectedContacts.has(c.id))
      : getFilteredContacts();

    if (contactsToExport.length === 0) {
      alert('אין אנשי קשר לייצוא');
      return;
    }

    // הכנת הנתונים לייצוא עם קבוצות
    let csvContent = 'שם,טלפון,אימייל,קבוצות,תגיות,סטטוס,יום הולדת,יום נישואין,תאריך הצטרפות,הזמנה אחרונה,נקודות\n';
    
    contactsToExport.forEach(contact => {
      const name = contact.name || '';
      const phone = contact.phone || '';
      const email = contact.email || '';
      const groupNames = contact.group_ids?.map(id => 
        groups.find(g => g.id === id)?.name || ''
      ).filter(Boolean).join(';') || '';
      const tags = contact.tags?.join(';') || '';
      const status = contact.opt_out ? 'הוסר' : 'פעיל';
      const birthDate = contact.birth_date || '';
      const anniversaryDate = contact.anniversary_date || '';
      const joinDate = contact.join_date || '';
      const lastOrderDate = contact.last_order_date || '';
      const loyaltyPoints = contact.loyalty_points || 0;
      
      csvContent += `${name},${phone},${email},${groupNames},${tags},${status},${birthDate},${anniversaryDate},${joinDate},${lastOrderDate},${loyaltyPoints}\n`;
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

    alert(`יוצאו ${contactsToExport.length} אנשי קשר`);
  };

  // פונקציות עזר
  const getFilteredContacts = () => {
    let filtered = contacts;
    
    // סינון לפי קבוצה
    if (selectedGroupFilter !== 'all') {
      filtered = filtered.filter(c => c.group_ids?.includes(selectedGroupFilter));
    }
    
    // סינון לפי חיפוש
    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  const getGroupContactsCount = (groupId: string) => {
    return contacts.filter(c => c.group_ids?.includes(groupId)).length;
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
        group_ids: [],
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
        group_ids: editingContact.group_ids,
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
    const filtered = getFilteredContacts();
    if (selectedContacts.size === filtered.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(filtered.map(c => c.id)));
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

  if (loading) {
    return <div className="p-8">טוען...</div>;
  }

  const filteredContacts = getFilteredContacts();

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">ניהול אנשי קשר וקבוצות</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('contacts')}
            className={`px-4 py-2 rounded ${activeTab === 'contacts' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            👤 אנשי קשר ({contacts.length})
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-4 py-2 rounded ${activeTab === 'groups' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            👥 קבוצות ({groups.length})
          </button>
        </div>
      </div>

      {activeTab === 'groups' && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">ניהול קבוצות</h2>
            <button
              onClick={() => setShowGroupForm(!showGroupForm)}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              + קבוצה חדשה
            </button>
          </div>

          {showGroupForm && (
            <div className="bg-white p-4 rounded-lg shadow mb-4">
              <h3 className="font-semibold mb-3">הוסף קבוצה חדשה</h3>
              <div className="grid grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="שם הקבוצה"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                  className="border p-2 rounded"
                />
                <input
                  type="text"
                  placeholder="תיאור (אופציונלי)"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                  className="border p-2 rounded"
                />
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={newGroup.color}
                    onChange={(e) => setNewGroup({...newGroup, color: e.target.value})}
                    className="border rounded h-10 w-20"
                  />
                  <button
                    onClick={handleAddGroup}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    הוסף
                  </button>
                  <button
                    onClick={() => setShowGroupForm(false)}
                    className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map(group => (
              <div key={group.id} className="bg-white p-4 rounded-lg shadow border-l-4" style={{borderLeftColor: group.color}}>
                {editingGroup?.id === group.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editingGroup.name}
                      onChange={(e) => setEditingGroup({...editingGroup, name: e.target.value})}
                      className="border p-1 rounded w-full"
                    />
                    <input
                      type="text"
                      value={editingGroup.description || ''}
                      onChange={(e) => setEditingGroup({...editingGroup, description: e.target.value})}
                      className="border p-1 rounded w-full"
                    />
                    <input
                      type="color"
                      value={editingGroup.color}
                      onChange={(e) => setEditingGroup({...editingGroup, color: e.target.value})}
                      className="border rounded h-8"
                    />
                    <div className="flex gap-2">
                      <button onClick={handleUpdateGroup} className="text-green-600 hover:underline">שמור</button>
                      <button onClick={() => setEditingGroup(null)} className="text-gray-600 hover:underline">ביטול</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">{group.name}</h3>
                      <span className="bg-gray-100 px-2 py-1 rounded text-sm">
                        {getGroupContactsCount(group.id)} אנשי קשר
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{group.description || 'ללא תיאור'}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedGroupFilter(group.id);
                          setActiveTab('contacts');
                        }}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        צפה באנשי קשר
                      </button>
                      <button
                        onClick={() => setEditingGroup(group)}
                        className="text-green-600 hover:underline text-sm"
                      >
                        ערוך
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="text-red-600 hover:underline text-sm"
                      >
                        מחק
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'contacts' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="חפש לפי שם, טלפון או אימייל..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border p-2 rounded w-64"
              />
              <select
                value={selectedGroupFilter}
                onChange={(e) => setSelectedGroupFilter(e.target.value)}
                className="border p-2 rounded"
              >
                <option value="all">כל הקבוצות</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({getGroupContactsCount(group.id)})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {selectedContacts.size > 0 && (
                <>
                  <button
                    onClick={() => setShowMoveToGroup(!showMoveToGroup)}
                    className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
                  >
                    👥 העבר לקבוצה ({selectedContacts.size})
                  </button>
                  <button
                    onClick={() => exportContactsToCSV(true)}
                    className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
                  >
                    📋 ייצא {selectedContacts.size} נבחרים
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  >
                    🗑️ מחק {selectedContacts.size} נבחרים
                  </button>
                </>
              )}
              <button
                onClick={() => exportContactsToCSV(false)}
                className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
              >
                💾 ייצא לאקסל
              </button>
              <button
                onClick={() => setShowImport(!showImport)}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                📤 ייבוא מקובץ
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                + איש קשר חדש
              </button>
              <button
                onClick={() => setShowExtendedFields(!showExtendedFields)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                {showExtendedFields ? '📉' : '📊'} שדות נוספים
              </button>
            </div>
          </div>

          {showMoveToGroup && selectedContacts.size > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg mb-4 flex items-center gap-4">
              <span className="font-semibold">העבר {selectedContacts.size} אנשי קשר לקבוצה:</span>
              <select
                value={targetGroupId}
                onChange={(e) => setTargetGroupId(e.target.value)}
                className="border p-2 rounded flex-1 max-w-xs"
              >
                <option value="">בחר קבוצה...</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
              <button
                onClick={handleMoveToGroup}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                העבר
              </button>
              <button
                onClick={() => {
                  setShowMoveToGroup(false);
                  setTargetGroupId('');
                }}
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
              >
                ביטול
              </button>
            </div>
          )}

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
                    value={newContact.name}
                    onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                    className="border p-2 rounded w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">טלפון *</label>
                  <input
                    type="text"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                    className="border p-2 rounded w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
                  <input
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                    className="border p-2 rounded w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">קבוצות</label>
                  <select
                    multiple
                    value={newContact.group_ids}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setNewContact({...newContact, group_ids: selected});
                    }}
                    className="border p-2 rounded w-full"
                    size={5}
                  >
                    {groups.map(group => (
                      <option key={group.id} value={group.id} style={{color: group.color}}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">החזק Ctrl/Cmd לבחירה מרובה</p>
                </div>
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

          <div className="bg-gray-100 p-3 rounded mb-4">
            <p>מציג {filteredContacts.length} מתוך {contacts.length} אנשי קשר</p>
          </div>

          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-right">
                    <input
                      type="checkbox"
                      checked={selectedContacts.size === filteredContacts.length && filteredContacts.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="p-3 text-right">שם</th>
                  <th className="p-3 text-right">טלפון</th>
                  <th className="p-3 text-right">אימייל</th>
                  <th className="p-3 text-right">קבוצות</th>
                  <th className="p-3 text-right">תגיות</th>
                  {showExtendedFields && (
                    <>
                      <th className="p-3 text-right">🎂</th>
                      <th className="p-3 text-right">💍</th>
                      <th className="p-3 text-right">הצטרפות</th>
                      <th className="p-3 text-right">⭐</th>
                    </>
                  )}
                  <th className="p-3 text-right">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map(contact => (
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
                      {editingContact?.id === contact.id ? (
                        <select
                          multiple
                          value={editingContact.group_ids || []}
                          onChange={(e) => {
                            const selected = Array.from(e.target.selectedOptions, option => option.value);
                            setEditingContact({...editingContact, group_ids: selected});
                          }}
                          className="border p-1 rounded"
                          size={3}
                        >
                          {groups.map(group => (
                            <option key={group.id} value={group.id}>{group.name}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {contact.group_ids?.map(groupId => {
                            const group = groups.find(g => g.id === groupId);
                            return group ? (
                              <span 
                                key={groupId} 
                                className="px-2 py-1 rounded text-xs text-white"
                                style={{backgroundColor: group.color}}
                              >
                                {group.name}
                                <button
                                  onClick={() => handleRemoveFromGroup(contact.id, groupId)}
                                  className="ml-1 hover:opacity-75"
                                >
                                  ×
                                </button>
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      {contact.tags?.join(', ') || '-'}
                    </td>
                    {showExtendedFields && (
                      <>
                        <td className="p-3">{formatDate(contact.birth_date)}</td>
                        <td className="p-3">{formatDate(contact.anniversary_date)}</td>
                        <td className="p-3">{formatDate(contact.join_date)}</td>
                        <td className="p-3">{contact.loyalty_points || 0}</td>
                      </>
                    )}
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
            
            {filteredContacts.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                אין אנשי קשר להצגה
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
