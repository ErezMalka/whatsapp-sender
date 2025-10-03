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
  icon?: string;
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

// Icons map for groups
const groupIcons: { [key: string]: string } = {
  'לקוחות VIP': '⭐',
  'לקוחות חדשים': '🆕',
  'לקוחות רגילים': '👥',
  'ספקים': '🏢',
  'עובדים': '💼'
};

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
    color: '#3B82F6',
    icon: '📁'
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
  
  // יצירת קבוצה חדשה בתוך טופס איש קשר
  const [showNewGroupInForm, setShowNewGroupInForm] = useState(false);
  const [tempNewGroup, setTempNewGroup] = useState({
    name: '',
    color: '#3B82F6'
  });

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
      { tenant_id: TENANT_ID, name: 'לקוחות VIP', color: '#FFD700', description: 'לקוחות מועדפים', icon: '⭐' },
      { tenant_id: TENANT_ID, name: 'לקוחות חדשים', color: '#10B981', description: 'לקוחות שהצטרפו לאחרונה', icon: '🆕' },
      { tenant_id: TENANT_ID, name: 'לקוחות רגילים', color: '#3B82F6', description: 'לקוחות קבועים', icon: '👥' },
      { tenant_id: TENANT_ID, name: 'ספקים', color: '#8B5CF6', description: 'ספקים ושותפים עסקיים', icon: '🏢' },
      { tenant_id: TENANT_ID, name: 'עובדים', color: '#EF4444', description: 'צוות העובדים', icon: '💼' }
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

  // יצירת קבוצה חדשה מתוך טופס איש קשר
  const handleCreateGroupFromForm = async () => {
    if (!tempNewGroup.name) {
      alert('נא להזין שם קבוצה');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('groups')
        .insert([{
          name: tempNewGroup.name,
          color: tempNewGroup.color,
          tenant_id: TENANT_ID,
          icon: '📁'
        }])
        .select()
        .single();

      if (error) throw error;
      
      // עדכון רשימת הקבוצות
      setGroups([...groups, data]);
      
      // הוסף את הקבוצה החדשה לאיש הקשר
      setNewContact({
        ...newContact,
        group_ids: [...newContact.group_ids, data.id]
      });
      
      // אפס את הטופס
      setTempNewGroup({ name: '', color: '#3B82F6' });
      setShowNewGroupInForm(false);
    } catch (error) {
      console.error('Error creating group:', error);
      alert('שגיאה ביצירת קבוצה');
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
      setNewGroup({ name: '', description: '', color: '#3B82F6', icon: '📁' });
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
          color: editingGroup.color,
          icon: editingGroup.icon
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

  const exportContactsToCSV = (onlySelected = false) => {
    const contactsToExport = onlySelected 
      ? contacts.filter(c => selectedContacts.has(c.id))
      : getFilteredContacts();

    if (contactsToExport.length === 0) {
      alert('אין אנשי קשר לייצוא');
      return;
    }

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

  const getFilteredContacts = () => {
    let filtered = contacts;
    
    if (selectedGroupFilter !== 'all') {
      filtered = filtered.filter(c => c.group_ids?.includes(selectedGroupFilter));
    }
    
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
    <div className="p-8 bg-gray-50 min-h-screen">
      <style jsx global>{`
        .modern-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 0.75rem;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .modern-btn::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }

        .modern-btn:active::before {
          width: 300px;
          height: 300px;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }

        .btn-primary:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 7px 25px rgba(102, 126, 234, 0.5);
        }

        .btn-success {
          background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(17, 153, 142, 0.4);
        }

        .btn-success:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 7px 25px rgba(17, 153, 142, 0.5);
        }

        .btn-danger {
          background: linear-gradient(135deg, #ee0979 0%, #ff6a00 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(238, 9, 121, 0.4);
        }

        .btn-danger:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 7px 25px rgba(238, 9, 121, 0.5);
        }

        .tab-btn {
          padding: 0.875rem 1.75rem;
          border: none;
          background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
          border-radius: 0.75rem;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          gap: 0.625rem;
          position: relative;
          overflow: hidden;
          color: #6b7280;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .tab-btn.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
          transform: scale(1.05);
        }

        .tab-btn:hover:not(.active) {
          background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .group-card {
          background: white;
          border-radius: 1rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .group-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
        }

        .action-btn {
          flex: 1;
          padding: 0.75rem 1rem;
          border: none;
          border-radius: 0.625rem;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 600;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          position: relative;
          overflow: hidden;
          letter-spacing: 0.025em;
        }

        .action-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%);
          transition: opacity 0.3s;
        }

        .checkbox-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .checkbox-group:hover {
          border-color: #667eea;
          background: #f0f4ff;
        }

        .checkbox-group.selected {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-color: transparent;
        }

        .icon-btn {
          padding: 0.75rem 1.25rem;
          border: 2px solid transparent;
          background: white;
          border-radius: 0.875rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .icon-btn:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.12);
          border-color: #e5e7eb;
        }
      `}</style>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          ניהול אנשי קשר וקבוצות
        </h1>
        <div className="flex gap-2 bg-white p-1 rounded-lg shadow-md">
          <button
            onClick={() => setActiveTab('contacts')}
            className={`tab-btn ${activeTab === 'contacts' ? 'active' : ''}`}
          >
            <span>👤</span>
            <span>אנשי קשר ({contacts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
          >
            <span>👥</span>
            <span>קבוצות ({groups.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'groups' && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">ניהול קבוצות</h2>
            <button
              onClick={() => setShowGroupForm(!showGroupForm)}
              className="modern-btn btn-success"
            >
              <span>✨</span>
              <span>קבוצה חדשה</span>
            </button>
          </div>

          {showGroupForm && (
            <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
              <h3 className="font-semibold mb-4 text-lg">הוסף קבוצה חדשה</h3>
              <div className="grid grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="שם הקבוצה"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                  className="border-2 p-3 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                />
                <input
                  type="text"
                  placeholder="תיאור (אופציונלי)"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                  className="border-2 p-3 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                />
                <input
                  type="text"
                  placeholder="אייקון"
                  value={newGroup.icon}
                  onChange={(e) => setNewGroup({...newGroup, icon: e.target.value})}
                  className="border-2 p-3 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                />
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={newGroup.color}
                    onChange={(e) => setNewGroup({...newGroup, color: e.target.value})}
                    className="border-2 rounded-lg h-12 w-20 cursor-pointer"
                  />
                  <button
                    onClick={handleAddGroup}
                    className="modern-btn btn-primary flex-1"
                  >
                    הוסף
                  </button>
                  <button
                    onClick={() => setShowGroupForm(false)}
                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map(group => (
              <div key={group.id} className="group-card">
                <div 
                  className="p-6 border-r-8 bg-gradient-to-br from-gray-50 to-white"
                  style={{borderRightColor: group.color}}
                >
                  {editingGroup?.id === group.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editingGroup.name}
                        onChange={(e) => setEditingGroup({...editingGroup, name: e.target.value})}
                        className="border-2 p-2 rounded-lg w-full focus:border-purple-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={editingGroup.description || ''}
                        onChange={(e) => setEditingGroup({...editingGroup, description: e.target.value})}
                        className="border-2 p-2 rounded-lg w-full focus:border-purple-500 focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editingGroup.icon || ''}
                          onChange={(e) => setEditingGroup({...editingGroup, icon: e.target.value})}
                          className="border-2 p-2 rounded-lg w-20 focus:border-purple-500 focus:outline-none"
                        />
                        <input
                          type="color"
                          value={editingGroup.color}
                          onChange={(e) => setEditingGroup({...editingGroup, color: e.target.value})}
                          className="border-2 rounded-lg h-10 w-20 cursor-pointer"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleUpdateGroup} className="modern-btn btn-success flex-1">
                          שמור
                        </button>
                        <button onClick={() => setEditingGroup(null)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors flex-1">
                          ביטול
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{group.icon || groupIcons[group.name] || '📁'}</span>
                          <h3 className="font-bold text-xl">{group.name}</h3>
                        </div>
                        <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                          {getGroupContactsCount(group.id)}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-4 min-h-[3rem]">
                        {group.description || 'ללא תיאור'}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedGroupFilter(group.id);
                            setActiveTab('contacts');
                          }}
                          className="action-btn btn-primary"
                          style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          }}
                        >
                          <span>👁️</span>
                          <span>צפייה</span>
                        </button>
                        <button
                          onClick={() => setEditingGroup(group)}
                          className="action-btn btn-success"
                          style={{
                            background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
                          }}
                        >
                          <span>✏️</span>
                          <span>עריכה</span>
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="action-btn btn-danger"
                          style={{
                            background: 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)'
                          }}
                        >
                          <span>🗑️</span>
                          <span>מחיקה</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'contacts' && (
        <>
          <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div className="flex gap-3 items-center flex-wrap">
                <input
                  type="text"
                  placeholder="🔍 חפש לפי שם, טלפון או אימייל..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-2 p-3 rounded-lg w-72 focus:border-purple-500 focus:outline-none transition-colors"
                />
                <select
                  value={selectedGroupFilter}
                  onChange={(e) => setSelectedGroupFilter(e.target.value)}
                  className="border-2 p-3 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                >
                  <option value="all">כל הקבוצות</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.icon || groupIcons[group.name] || '📁'} {group.name} ({getGroupContactsCount(group.id)})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                {selectedContacts.size > 0 && (
                  <>
                    <button
                      onClick={() => setShowMoveToGroup(!showMoveToGroup)}
                      className="icon-btn"
                      style={{
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                        color: 'white'
                      }}
                    >
                      <span>👥</span>
                      <span>העבר לקבוצה ({selectedContacts.size})</span>
                    </button>
                    <button
                      onClick={() => exportContactsToCSV(true)}
                      className="icon-btn"
                      style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                        color: 'white'
                      }}
                    >
                      <span>📋</span>
                      <span>ייצא {selectedContacts.size} נבחרים</span>
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      className="icon-btn"
                      style={{
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        color: 'white'
                      }}
                    >
                      <span>🗑️</span>
                      <span>מחק {selectedContacts.size} נבחרים</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => exportContactsToCSV(false)}
                  className="icon-btn"
                >
                  <span>💾</span>
                  <span>ייצא לאקסל</span>
                </button>
                <button
                  onClick={() => setShowImport(!showImport)}
                  className="icon-btn"
                >
                  <span>📤</span>
                  <span>ייבוא מקובץ</span>
                </button>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="icon-btn"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                  }}
                >
                  <span>✨</span>
                  <span>איש קשר חדש</span>
                </button>
                <button
                  onClick={() => setShowExtendedFields(!showExtendedFields)}
                  className="icon-btn"
                >
                  <span>{showExtendedFields ? '📉' : '📊'}</span>
                  <span>שדות נוספים</span>
                </button>
              </div>
            </div>
          </div>

          {showMoveToGroup && selectedContacts.size > 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl mb-4 flex items-center gap-4">
              <span className="font-semibold">העבר {selectedContacts.size} אנשי קשר לקבוצה:</span>
              <select
                value={targetGroupId}
                onChange={(e) => setTargetGroupId(e.target.value)}
                className="border-2 p-2 rounded-lg flex-1 max-w-xs focus:border-purple-500 focus:outline-none"
              >
                <option value="">בחר קבוצה...</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.icon || groupIcons[group.name] || '📁'} {group.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleMoveToGroup}
                className="modern-btn btn-primary"
              >
                העבר
              </button>
              <button
                onClick={() => {
                  setShowMoveToGroup(false);
                  setTargetGroupId('');
                }}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
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
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    הוסף איש קשר חדש
                  </h3>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="w-9 h-9 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg flex items-center justify-center hover:rotate-90 transition-transform"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">שם מלא *</label>
                      <input
                        type="text"
                        value={newContact.name}
                        onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                        className="w-full border-2 p-3 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                        placeholder="הכנס שם מלא"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">טלפון *</label>
                      <input
                        type="text"
                        value={newContact.phone}
                        onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                        className="w-full border-2 p-3 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                        placeholder="050-1234567"
                        dir="ltr"
                      />
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">אימייל</label>
                    <input
                      type="email"
                      value={newContact.email}
                      onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                      className="w-full border-2 p-3 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                      placeholder="example@email.com"
                      dir="ltr"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">שיוך לקבוצות</label>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-medium">בחר קבוצות או צור חדשה</span>
                        <button
                          type="button"
                          onClick={() => setShowNewGroupInForm(!showNewGroupInForm)}
                          className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg transition-shadow text-sm font-semibold"
                        >
                          ✨ קבוצה חדשה
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {groups.map(group => (
                          <label key={group.id} className={`checkbox-group ${newContact.group_ids.includes(group.id) ? 'selected' : ''}`}>
                            <input
                              type="checkbox"
                              checked={newContact.group_ids.includes(group.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewContact({...newContact, group_ids: [...newContact.group_ids, group.id]});
                                } else {
                                  setNewContact({...newContact, group_ids: newContact.group_ids.filter(id => id !== group.id)});
                                }
                              }}
                              className="mr-2"
                            />
                            <span>{group.icon || groupIcons[group.name] || '📁'}</span>
                            <span>{group.name}</span>
                          </label>
                        ))}
                      </div>
                      
                      {showNewGroupInForm && (
                        <div className="bg-white p-3 rounded-lg border-2 border-purple-200">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="שם הקבוצה החדשה"
                              value={tempNewGroup.name}
                              onChange={(e) => setTempNewGroup({...tempNewGroup, name: e.target.value})}
                              className="flex-1 border-2 p-2 rounded-lg focus:border-purple-500 focus:outline-none"
                            />
                            <input
                              type="color"
                              value={tempNewGroup.color}
                              onChange={(e) => setTempNewGroup({...tempNewGroup, color: e.target.value})}
                              className="w-12 h-10 border-2 rounded-lg cursor-pointer"
                            />
                            <button
                              type="button"
                              onClick={handleCreateGroupFromForm}
                              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-shadow font-semibold"
                            >
                              הוסף
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">תאריך יום הולדת</label>
                      <input
                        type="date"
                        value={newContact.birth_date}
                        onChange={(e) => setNewContact({...newContact, birth_date: e.target.value})}
                        className="w-full border-2 p-3 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">תאריך יום נישואין</label>
                      <input
                        type="date"
                        value={newContact.anniversary_date}
                        onChange={(e) => setNewContact({...newContact, anniversary_date: e.target.value})}
                        className="w-full border-2 p-3 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">תאריך הצטרפות</label>
                      <input
                        type="date"
                        value={newContact.join_date}
                        onChange={(e) => setNewContact({...newContact, join_date: e.target.value})}
                        className="w-full border-2 p-3 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">נקודות נאמנות</label>
                      <input
                        type="number"
                        value={newContact.loyalty_points}
                        onChange={(e) => setNewContact({...newContact, loyalty_points: parseInt(e.target.value) || 0})}
                        className="w-full border-2 p-3 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-6 py-3 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                  >
                    ביטול
                  </button>
                  <button
                    onClick={handleAddContact}
                    className="modern-btn btn-primary"
                  >
                    <span>💾</span>
                    <span>שמור איש קשר</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-4 rounded-lg mb-4">
            <p className="font-semibold">מציג {filteredContacts.length} מתוך {contacts.length} אנשי קשר</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-purple-50 to-pink-50">
                  <tr>
                    <th className="p-4 text-right">
                      <input
                        type="checkbox"
                        checked={selectedContacts.size === filteredContacts.length && filteredContacts.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="p-4 text-right font-semibold">שם</th>
                    <th className="p-4 text-right font-semibold">טלפון</th>
                    <th className="p-4 text-right font-semibold">אימייל</th>
                    <th className="p-4 text-right font-semibold">קבוצות</th>
                    <th className="p-4 text-right font-semibold">תגיות</th>
                    {showExtendedFields && (
                      <>
                        <th className="p-4 text-right font-semibold">🎂</th>
                        <th className="p-4 text-right font-semibold">💍</th>
                        <th className="p-4 text-right font-semibold">הצטרפות</th>
                        <th className="p-4 text-right font-semibold">⭐</th>
                      </>
                    )}
                    <th className="p-4 text-right font-semibold">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map(contact => (
                    <tr key={contact.id} className="border-t hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedContacts.has(contact.id)}
                          onChange={() => toggleSelectContact(contact.id)}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="p-4">
                        {editingContact?.id === contact.id ? (
                          <input
                            type="text"
                            value={editingContact.name}
                            onChange={(e) => setEditingContact({...editingContact, name: e.target.value})}
                            className="border-2 p-2 rounded-lg focus:border-purple-500 focus:outline-none"
                          />
                        ) : (
                          <span className="font-medium">{contact.name}</span>
                        )}
                      </td>
                      <td className="p-4" dir="ltr">
                        {editingContact?.id === contact.id ? (
                          <input
                            type="text"
                            value={editingContact.phone}
                            onChange={(e) => setEditingContact({...editingContact, phone: e.target.value})}
                            className="border-2 p-2 rounded-lg focus:border-purple-500 focus:outline-none"
                            dir="ltr"
                          />
                        ) : (
                          contact.phone
                        )}
                      </td>
                      <td className="p-4">
                        {editingContact?.id === contact.id ? (
                          <input
                            type="email"
                            value={editingContact.email || ''}
                            onChange={(e) => setEditingContact({...editingContact, email: e.target.value})}
                            className="border-2 p-2 rounded-lg focus:border-purple-500 focus:outline-none"
                          />
                        ) : (
                          contact.email || '-'
                        )}
                      </td>
                      <td className="p-4">
                        {editingContact?.id === contact.id ? (
                          <select
                            multiple
                            value={editingContact.group_ids || []}
                            onChange={(e) => {
                              const selected = Array.from(e.target.selectedOptions, option => option.value);
                              setEditingContact({...editingContact, group_ids: selected});
                            }}
                            className="border-2 p-2 rounded-lg focus:border-purple-500 focus:outline-none"
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
                                  className="px-2 py-1 rounded-full text-xs text-white font-semibold"
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
                      <td className="p-4">
                        {contact.tags?.join(', ') || '-'}
                      </td>
                      {showExtendedFields && (
                        <>
                          <td className="p-4">{formatDate(contact.birth_date)}</td>
                          <td className="p-4">{formatDate(contact.anniversary_date)}</td>
                          <td className="p-4">{formatDate(contact.join_date)}</td>
                          <td className="p-4">{contact.loyalty_points || 0}</td>
                        </>
                      )}
                      <td className="p-4">
                        {editingContact?.id === contact.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={handleUpdateContact}
                              className="text-green-600 hover:text-green-700 font-semibold"
                            >
                              שמור
                            </button>
                            <button
                              onClick={() => setEditingContact(null)}
                              className="text-gray-600 hover:text-gray-700 font-semibold"
                            >
                              ביטול
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingContact(contact)}
                              className="text-blue-600 hover:text-blue-700 font-semibold"
                            >
                              ערוך
                            </button>
                            <button
                              onClick={() => handleDeleteContact(contact.id)}
                              className="text-red-600 hover:text-red-700 font-semibold"
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
                <div className="p-16 text-center">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-xl text-gray-600 mb-4">אין אנשי קשר להצגה</p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="modern-btn btn-primary"
                  >
                    <span>✨</span>
                    <span>הוסף איש קשר ראשון</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
