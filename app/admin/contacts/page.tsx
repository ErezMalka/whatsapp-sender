// app/admin/contacts/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tags: string[];
  status: string;
  opt_out: boolean;
  notes?: string;
  created_at: string;
  last_contacted_at?: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
  contacts_count: number;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  
  // Form state for new contact
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: '',
    tags: [] as string[],
    notes: ''
  });

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    optOut: 0
  });

  // Load contacts and tags
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', '00000000-0000-0000-0000-000000000001')
        .order('created_at', { ascending: false });
      
      if (contactsError) throw contactsError;
      setContacts(contactsData || []);
      
      // Calculate statistics
      const total = contactsData?.length || 0;
      const active = contactsData?.filter(c => c.status === 'active' && !c.opt_out).length || 0;
      const optOut = contactsData?.filter(c => c.opt_out).length || 0;
      setStats({ total, active, optOut });
      
      // Load tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .eq('tenant_id', '00000000-0000-0000-0000-000000000001')
        .order('name');
      
      if (tagsError) throw tagsError;
      setTags(tagsData || []);
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Add new contact
  const handleAddContact = async () => {
    if (!newContact.name || !newContact.phone) {
      alert('נא למלא שם וטלפון');
      return;
    }

    // Validate phone format
    const phoneRegex = /^\+972\d{9}$/;
    if (!phoneRegex.test(newContact.phone)) {
      alert('מספר טלפון חייב להיות בפורמט +972XXXXXXXXX');
      return;
    }

    try {
      const { error } = await supabase
        .from('contacts')
        .insert([{
          ...newContact,
          tenant_id: '00000000-0000-0000-0000-000000000001',
          source: 'manual'
        }]);
      
      if (error) {
        if (error.code === '23505') {
          alert('מספר הטלפון כבר קיים במערכת');
        } else {
          throw error;
        }
        return;
      }
      
      setShowAddModal(false);
      setNewContact({ name: '', phone: '', email: '', tags: [], notes: '' });
      loadData();
    } catch (error) {
      console.error('Error adding contact:', error);
      alert('שגיאה בהוספת איש קשר');
    }
  };

  // Delete contact(s)
  const handleDeleteContacts = async (ids: string[]) => {
    if (!confirm(`האם למחוק ${ids.length} אנשי קשר?`)) return;
    
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .in('id', ids);
      
      if (error) throw error;
      setSelectedContacts([]);
      loadData();
    } catch (error) {
      console.error('Error deleting contacts:', error);
    }
  };

  // Toggle opt-out status
  const toggleOptOut = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ 
          opt_out: !currentStatus,
          opt_out_at: !currentStatus ? new Date().toISOString() : null
        })
        .eq('id', id);
      
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error updating opt-out:', error);
    }
  };

  // Filter contacts
  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = 
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone.includes(searchTerm) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTags = selectedTags.length === 0 ||
      selectedTags.some(tag => contact.tags?.includes(tag));
    
    return matchesSearch && matchesTags;
  });

  // Toggle contact selection
  const toggleContactSelection = (id: string) => {
    setSelectedContacts(prev =>
      prev.includes(id)
        ? prev.filter(cId => cId !== id)
        : [...prev, id]
    );
  };

  // Select all filtered contacts
  const selectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(c => c.id));
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">ניהול אנשי קשר</h1>
        <p className="text-gray-600">ניהול רשימת אנשי הקשר לשליחת הודעות WhatsApp</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-gray-600">סה״כ אנשי קשר</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm text-gray-600">פעילים</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-red-600">{stats.optOut}</div>
          <div className="text-sm text-gray-600">הוסרו מהרשימה</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-purple-600">{tags.length}</div>
          <div className="text-sm text-gray-600">תגיות</div>
        </div>
      </div>

      {/* Tools Bar */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="חיפוש לפי שם, טלפון, אימייל או הערות..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            ➕ הוסף איש קשר
          </button>
          
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            📤 ייבוא מקובץ
          </button>
          
          {selectedContacts.length > 0 && (
            <button
              onClick={() => handleDeleteContacts(selectedContacts)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              🗑️ מחק {selectedContacts.length} נבחרים
            </button>
          )}
        </div>

        {/* Tags Filter */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-600">סנן לפי תגיות:</span>
          {tags.map(tag => (
            <button
              key={tag.id}
              onClick={() => {
                setSelectedTags(prev =>
                  prev.includes(tag.name)
                    ? prev.filter(t => t !== tag.name)
                    : [...prev, tag.name]
                );
              }}
              className={`px-3 py-1 rounded-full text-sm transition ${
                selectedTags.includes(tag.name)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              style={{
                backgroundColor: selectedTags.includes(tag.name) ? tag.color : undefined
              }}
            >
              {tag.name} ({tag.contacts_count})
            </button>
          ))}
          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              className="text-sm text-red-600 hover:underline"
            >
              ✖ נקה הכל
            </button>
          )}
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <div className="mt-2">טוען...</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right">
                    <input
                      type="checkbox"
                      checked={filteredContacts.length > 0 && selectedContacts.length === filteredContacts.length}
                      onChange={selectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    שם
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    טלפון
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    אימייל
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    תגיות
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    סטטוס
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    הערות
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    פעולות
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      <div className="text-lg mb-2">לא נמצאו אנשי קשר</div>
                      <div className="text-sm">נסה לשנות את החיפוש או הסינון</div>
                    </td>
                  </tr>
                ) : (
                  filteredContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact.id)}
                          onChange={() => toggleContactSelection(contact.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-mono" dir="ltr">{contact.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{contact.email || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {contact.tags?.map(tag => {
                            const tagData = tags.find(t => t.name === tag);
                            return (
                              <span
                                key={tag}
                                className="px-2 py-1 text-xs text-white rounded-full"
                                style={{ backgroundColor: tagData?.color || '#3B82F6' }}
                              >
                                {tag}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {contact.opt_out ? (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                            ❌ הוסר
                          </span>
                        ) : contact.status === 'active' ? (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            ✅ פעיל
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                            ⏸️ לא פעיל
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 max-w-xs truncate" title={contact.notes || ''}>
                          {contact.notes || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => toggleOptOut(contact.id, contact.opt_out)}
                          className="text-blue-600 hover:text-blue-900 ml-3"
                        >
                          {contact.opt_out ? '♻️ הפעל' : '🚫 השבת'}
                        </button>
                        <button
                          onClick={() => handleDeleteContacts([contact.id])}
                          className="text-red-600 hover:text-red-900 ml-3"
                        >
                          🗑️ מחק
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">הוסף איש קשר חדש</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">שם מלא *</label>
                <input
                  type="text"
                  value={newContact.name}
                  onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="יוסי כהן"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">טלפון * (פורמט: +972XXXXXXXXX)</label>
                <input
                  type="tel"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="+972501234567"
                  dir="ltr"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">אימייל</label>
                <input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="yossi@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">תגיות</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        setNewContact(prev => ({
                          ...prev,
                          tags: prev.tags.includes(tag.name)
                            ? prev.tags.filter(t => t !== tag.name)
                            : [...prev.tags, tag.name]
                        }));
                      }}
                      className={`px-3 py-1 rounded-full text-sm transition ${
                        newContact.tags.includes(tag.name)
                          ? 'text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      style={{
                        backgroundColor: newContact.tags.includes(tag.name) ? tag.color : undefined
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">הערות</label>
                <textarea
                  value={newContact.notes}
                  onChange={(e) => setNewContact({...newContact, notes: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="הערות נוספות..."
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewContact({ name: '', phone: '', email: '', tags: [], notes: '' });
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                ביטול
              </button>
              <button
                onClick={handleAddContact}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                הוסף איש קשר
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImportComplete={() => {
            setShowImportModal(false);
            loadData();
          }}
          existingTags={tags.map(t => t.name)}
        />
      )}
    </div>
  );
}

// Import Modal Component (inline to avoid module not found error)
function ImportModal({ 
  onClose, 
  onImportComplete, 
  existingTags 
}: { 
  onClose: () => void;
  onImportComplete: () => void;
  existingTags: string[];
}) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload');
  const [importResults, setImportResults] = useState({
    total: 0,
    success: 0,
    failed: 0,
    duplicates: 0
  });

  // Download sample CSV
  const downloadSampleCSV = () => {
    const csvContent = `name,phone,email,tags,notes
ישראל ישראלי,0501234567,israel@example.com,לקוחות;VIP,לקוח ותיק מ-2020
רחל כהן,050-222-3333,rachel@example.com,חדשים,הצטרפה החודש
דוד לוי,0523334444,,לקוחות,אין לו אימייל
שרה אברהם,+972504445555,sara@example.com,ספקים,ספקית ציוד משרדי
משה רוזנברג,0505556666,moshe@example.com,עובדים;VIP,מנהל אזור צפון`;

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'contacts_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse CSV file
  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    
    const nameIndex = headers.findIndex(h => h.includes('name') || h.includes('שם'));
    const phoneIndex = headers.findIndex(h => h.includes('phone') || h.includes('טלפון'));
    const emailIndex = headers.findIndex(h => h.includes('email') || h.includes('אימייל'));
    const tagsIndex = headers.findIndex(h => h.includes('tag') || h.includes('תגית'));
    const notesIndex = headers.findIndex(h => h.includes('note') || h.includes('הער'));

    const contacts: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const errors: string[] = [];
      
      let phone = phoneIndex >= 0 ? values[phoneIndex] : '';
      
      // נרמול מספר טלפון
      if (phone) {
        phone = phone.replace(/[\s\-\(\)]/g, '');
        if (phone.startsWith('0')) {
          phone = '+972' + phone.substring(1);
        }
        if (!phone.startsWith('+') && phone.match(/^\d/)) {
          phone = '+' + phone;
        }
        if (!phone.match(/^\+972\d{9}$/)) {
          errors.push('מספר טלפון לא תקין');
        }
      } else {
        errors.push('חסר מספר טלפון');
      }
      
      const name = nameIndex >= 0 ? values[nameIndex] : '';
      if (!name) {
        errors.push('חסר שם');
      }
      
      contacts.push({
        name: name || '',
        phone: phone || '',
        email: emailIndex >= 0 ? values[emailIndex] : undefined,
        tags: tagsIndex >= 0 && values[tagsIndex] 
          ? values[tagsIndex].split(';').map(t => t.trim()).filter(t => t)
          : [],
        notes: notesIndex >= 0 ? values[notesIndex] : undefined,
        isValid: errors.length === 0,
        errors
      });
    }
    
    return contacts;
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      
      if (selectedFile.name.endsWith('.csv')) {
        const parsed = parseCSV(text);
        setParsedData(parsed);
        setStep('preview');
      } else {
        alert('נא להשתמש בקובץ CSV');
      }
    };
    
    reader.readAsText(selectedFile);
  };

  // Import contacts to database
  const importContacts = async () => {
    setImporting(true);
    setStep('importing');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const results = {
      total: parsedData.length,
      success: 0,
      failed: 0,
      duplicates: 0
    };
    
    const validContacts = parsedData.filter(c => c.isValid);
    
    for (let i = 0; i < validContacts.length; i += 10) {
      const batch = validContacts.slice(i, i + 10);
      
      try {
        const { data, error } = await supabase
          .from('contacts')
          .insert(
            batch.map(contact => ({
              tenant_id: '00000000-0000-0000-0000-000000000001',
              name: contact.name,
              phone: contact.phone,
              email: contact.email,
              tags: contact.tags,
              notes: contact.notes,
              source: 'import',
              status: 'active'
            }))
          )
          .select();
        
        if (error) {
          if (error.code === '23505') {
            results.duplicates += batch.length;
          } else {
            results.failed += batch.length;
          }
        } else {
          results.success += data?.length || 0;
        }
      } catch (error) {
        results.failed += batch.length;
      }
    }
    
    results.failed += parsedData.filter(c => !c.isValid).length;
    
    setImportResults(results);
    setStep('complete');
    setImporting(false);
    
    setTimeout(() => {
      onImportComplete();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">ייבוא אנשי קשר</h2>
        
        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-600 mb-2">גרור קובץ או לחץ לבחירה</p>
              <p className="text-xs text-gray-500 mb-4">CSV</p>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                id="file-upload-import"
                onChange={handleFileSelect}
              />
              <label
                htmlFor="file-upload-import"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 ml-3"
              >
                בחר קובץ
              </label>
              <button
                onClick={downloadSampleCSV}
                className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                📥 הורד קובץ לדוגמה
              </button>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">📋 פורמט קובץ CSV:</h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p className="font-semibold">עמודות נדרשות:</p>
                <ul className="mr-4 space-y-1">
                  <li>• <strong>name</strong> - שם מלא (חובה)</li>
                  <li>• <strong>phone</strong> - מספר טלפון (חובה, פורמט: 050-123-4567 או 0501234567)</li>
                  <li>• <strong>email</strong> - כתובת אימייל (אופציונלי)</li>
                  <li>• <strong>tags</strong> - תגיות מופרדות בנקודה-פסיק (אופציונלי)</li>
                  <li>• <strong>notes</strong> - הערות (אופציונלי)</li>
                </ul>
                <div className="mt-2 p-2 bg-white rounded">
                  <p className="font-semibold mb-1">דוגמה:</p>
                  <code className="block text-xs" dir="ltr">
                    name,phone,email,tags,notes<br/>
                    יוסי כהן,0501234567,yossi@example.com,לקוחות;VIP,לקוח חשוב<br/>
                    שרה לוי,050-234-5678,sara@example.com,חדשים,
                  </code>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="font-medium text-yellow-900 mb-2">💡 טיפים:</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• הקובץ חייב להיות בקידוד UTF-8</li>
                <li>• ניתן לפתוח ב-Excel ולשמור כ-CSV</li>
                <li>• מספרי טלפון יומרו אוטומטית לפורמט +972</li>
                <li>• כפילויות (לפי מספר טלפון) לא ייובאו</li>
              </ul>
            </div>
          </div>
        )}
        
        {/* Step 2: Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">תצוגה מקדימה</h3>
              <div className="text-sm text-gray-600">
                {parsedData.filter(c => c.isValid).length} / {parsedData.length} תקינים
              </div>
            </div>
            
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-right">סטטוס</th>
                    <th className="px-3 py-2 text-right">שם</th>
                    <th className="px-3 py-2 text-right">טלפון</th>
                    <th className="px-3 py-2 text-right">אימייל</th>
                    <th className="px-3 py-2 text-right">תגיות</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {parsedData.slice(0, 100).map((contact, index) => (
                    <tr key={index} className={contact.isValid ? '' : 'bg-red-50'}>
                      <td className="px-3 py-2">
                        {contact.isValid ? '✅' : '❌'}
                      </td>
                      <td className="px-3 py-2">{contact.name}</td>
                      <td className="px-3 py-2" dir="ltr">{contact.phone}</td>
                      <td className="px-3 py-2">{contact.email || '-'}</td>
                      <td className="px-3 py-2">
                        {contact.tags?.join(', ') || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-between items-center pt-4">
              <button
                onClick={() => {
                  setStep('upload');
                  setParsedData([]);
                  setFile(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                חזור
              </button>
              <button
                onClick={importContacts}
                disabled={parsedData.filter(c => c.isValid).length === 0}
                className={`px-6 py-2 rounded-lg text-white ${
                  parsedData.filter(c => c.isValid).length > 0
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                ייבא {parsedData.filter(c => c.isValid).length} אנשי קשר
              </button>
            </div>
          </div>
        )}
        
        {/* Step 3: Importing */}
        {step === 'importing' && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-lg">מייבא אנשי קשר...</p>
          </div>
        )}
        
        {/* Step 4: Complete */}
        {step === 'complete' && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-xl font-bold mb-4">הייבוא הושלם</h3>
            <div className="space-y-2">
              <p>הצליחו: {importResults.success}</p>
              <p>כפילויות: {importResults.duplicates}</p>
              <p>נכשלו: {importResults.failed}</p>
            </div>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              סגור
            </button>
          </div>
        )}
        
        {/* Close button */}
        {step !== 'importing' && step !== 'complete' && (
          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              ביטול
            </button>
          </div>
        )}
      </div>
    </div>
  );
}