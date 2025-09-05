'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tags?: string[];
  status: string;
  opt_out: boolean;
}

interface Campaign {
  id: string;
  name: string;
  message?: string;
  message_content?: string;
  status: string;
  created_at: string;
  updated_at?: string;
  target_type?: string;
  target_tags?: string[];
  target_contacts?: string[];
  selected_tags?: string[];
  selected_contacts?: string[];
  estimated_recipients?: number;
  total_recipients?: number;
  sent_count?: number;
  delivered_count?: number;
  failed_count?: number;
  pending_count?: number;
}

interface Tag {
  id: string;
  name: string;
  color: string;
  contacts_count: number;
}

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    message: '',
    selectedTags: [] as string[],
    selectedContacts: [] as string[]
  });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const TENANT_ID = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    fetchCampaigns();
    fetchContactsAndTags();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const fetchContactsAndTags = async () => {
    try {
      // Fetch active contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .eq('opt_out', false)
        .eq('status', 'active');

      if (contactsError) throw contactsError;
      setContacts(contactsData || []);
      
      // Fetch tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .order('name');
      
      if (tagsError) {
        // If tags table doesn't exist, create tags from contacts
        const uniqueTags = new Set<string>();
        contactsData?.forEach(contact => {
          contact.tags?.forEach(tag => uniqueTags.add(tag));
        });
        
        const mockTags = Array.from(uniqueTags).map(name => ({
          id: name,
          name,
          color: '#3B82F6',
          contacts_count: contactsData?.filter(c => c.tags?.includes(name)).length || 0
        }));
        
        setTags(mockTags);
      } else {
        setTags(tagsData || []);
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
    }
  };

  const getContactsByTags = () => {
    if (newCampaign.selectedTags.length === 0) return [];
    
    return contacts.filter((contact: Contact) => 
      contact.tags?.some((tag: string) => 
        newCampaign.selectedTags.includes(tag)
      )
    );
  };

  const handleCreateCampaign = async () => {
    try {
      if (!newCampaign.name || !newCampaign.message) {
        setError('נא למלא שם והודעה');
        return;
      }

      if (newCampaign.selectedTags.length === 0 && newCampaign.selectedContacts.length === 0) {
        setError('נא לבחור תגיות או אנשי קשר');
        return;
      }

      // קבע את סוג היעד
      let targetType = 'all';
      if (newCampaign.selectedContacts.length > 0) {
        targetType = 'contacts';
      } else if (newCampaign.selectedTags.length > 0) {
        targetType = 'tags';
      }

      const campaignData = {
        tenant_id: TENANT_ID,
        name: newCampaign.name,
        message: newCampaign.message,
        message_content: newCampaign.message,  // גם וגם כי יש את שתי העמודות
        target_type: targetType,
        target_tags: newCampaign.selectedTags,
        target_contacts: newCampaign.selectedContacts,
        status: 'draft',
        selected_tags: newCampaign.selectedTags,
        selected_contacts: newCampaign.selectedContacts,
        send_type: 'immediate',
        estimated_recipients: getContactsByTags().length || newCampaign.selectedContacts.length,
        total_recipients: getContactsByTags().length || newCampaign.selectedContacts.length,
        sent_count: 0,
        delivered_count: 0,
        failed_count: 0,
        pending_count: 0,
        batch_size: 10,
        delay_between_messages: 1000,
        stop_on_errors: false,
        max_retries: 3
      };

      console.log('Creating campaign with data:', campaignData);

      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaignData)
        .select()
        .single();

      if (error) throw error;

      setCampaigns([data, ...campaigns]);
      setShowNewCampaign(false);
      setNewCampaign({
        name: '',
        message: '',
        selectedTags: [],
        selectedContacts: []
      });
      setError(null);
    } catch (err: any) {
      console.error('Error creating campaign:', err);
      setError(err.message || 'Failed to create campaign');
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק קמפיין זה?')) return;

    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCampaigns(campaigns.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting campaign:', err);
      setError('Failed to delete campaign');
    }
  };

  const handleTagSelection = (tagName: string) => {
    setNewCampaign(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tagName)
        ? prev.selectedTags.filter(t => t !== tagName)
        : [...prev.selectedTags, tagName]
    }));
  };

  const handleContactSelection = (contactId: string) => {
    setNewCampaign(prev => ({
      ...prev,
      selectedContacts: prev.selectedContacts.includes(contactId)
        ? prev.selectedContacts.filter(id => id !== contactId)
        : [...prev.selectedContacts, contactId]
    }));
  };

  const sendCampaign = async (campaignId: string) => {
    try {
      const response = await fetch('/api/campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId })
      });

      if (!response.ok) throw new Error('Failed to send campaign');

      const result = await response.json();
      
      // Update campaign status
      setCampaigns(campaigns.map(c => 
        c.id === campaignId 
          ? { ...c, status: 'active' }
          : c
      ));

      alert(`הקמפיין נשלח! ${result.summary?.successful || 0} הודעות נשלחו בהצלחה`);
      fetchCampaigns();
    } catch (err) {
      console.error('Error sending campaign:', err);
      alert('שגיאה בשליחת הקמפיין');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">טוען קמפיינים...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8" dir="rtl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">קמפיינים</h1>
        <button
          onClick={() => setShowNewCampaign(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          קמפיין חדש
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button 
            onClick={() => setError(null)}
            className="float-left font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* New Campaign Form */}
      {showNewCampaign && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">יצירת קמפיין חדש</h2>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              שם הקמפיין *
            </label>
            <input
              type="text"
              value={newCampaign.name}
              onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="לדוגמה: מבצע חורף 2024"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              תוכן ההודעה *
            </label>
            <textarea
              value={newCampaign.message}
              onChange={(e) => setNewCampaign({ ...newCampaign, message: e.target.value })}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              rows={4}
              placeholder="הקלד את ההודעה שתישלח..."
            />
            <div className="text-sm text-gray-500 mt-1">
              {newCampaign.message.length} תווים
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              בחר תגיות
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.length === 0 ? (
                <div className="text-gray-500">
                  אין תגיות זמינות. הוסף אנשי קשר עם תגיות קודם.
                </div>
              ) : (
                tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleTagSelection(tag.name)}
                    className={`px-3 py-1 rounded-full text-sm transition ${
                      newCampaign.selectedTags.includes(tag.name)
                        ? 'text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    style={{
                      backgroundColor: newCampaign.selectedTags.includes(tag.name) 
                        ? tag.color 
                        : undefined
                    }}
                  >
                    {tag.name} ({tag.contacts_count})
                  </button>
                ))
              )}
            </div>
          </div>

          {newCampaign.selectedTags.length > 0 && (
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                אנשי קשר שיקבלו את ההודעה ({getContactsByTags().length})
              </label>
              <div className="max-h-40 overflow-y-auto border rounded p-2">
                {getContactsByTags().length === 0 ? (
                  <div className="text-gray-500">לא נמצאו אנשי קשר עם התגיות שנבחרו</div>
                ) : (
                  getContactsByTags().map((contact: Contact) => (
                    <div key={contact.id} className="flex items-center gap-2 py-1">
                      <input
                        type="checkbox"
                        checked={newCampaign.selectedContacts.includes(contact.id)}
                        onChange={() => handleContactSelection(contact.id)}
                        className="rounded"
                      />
                      <span>{contact.name}</span>
                      <span className="text-gray-500" dir="ltr">{contact.phone}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleCreateCampaign}
              disabled={!newCampaign.name || !newCampaign.message}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
            >
              צור קמפיין
            </button>
            <button
              onClick={() => {
                setShowNewCampaign(false);
                setNewCampaign({
                  name: '',
                  message: '',
                  selectedTags: [],
                  selectedContacts: []
                });
                setError(null);
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Campaigns List */}
      <div className="grid gap-4">
        {campaigns.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <div className="text-gray-500 mb-4">
              <div className="text-4xl mb-2">📭</div>
              <div className="text-xl">אין קמפיינים עדיין</div>
              <div className="text-sm mt-2">צור את הקמפיין הראשון שלך!</div>
            </div>
          </div>
        ) : (
          campaigns.map((campaign: Campaign) => (
            <div key={campaign.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{campaign.name}</h3>
                  <p className="text-gray-600 mb-2 whitespace-pre-wrap">
                    {campaign.message || campaign.message_content}
                  </p>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>
                      סטטוס: 
                      <span className={`mr-1 font-semibold ${
                        campaign.status === 'completed' ? 'text-green-600' :
                        campaign.status === 'active' || campaign.status === 'sending' ? 'text-blue-600' :
                        'text-gray-600'
                      }`}>
                        {campaign.status === 'completed' ? 'הושלם' :
                         campaign.status === 'active' || campaign.status === 'sending' ? 'פעיל' : 
                         campaign.status === 'scheduled' ? 'מתוזמן' : 'טיוטה'}
                      </span>
                    </span>
                    <span>נוצר: {new Date(campaign.created_at).toLocaleDateString('he-IL')}</span>
                    <span>נמענים: {campaign.total_recipients || campaign.estimated_recipients || 0}</span>
                    {campaign.sent_count !== undefined && campaign.sent_count > 0 && (
                      <span className="text-green-600">נשלחו: {campaign.sent_count}</span>
                    )}
                    {campaign.delivered_count !== undefined && campaign.delivered_count > 0 && (
                      <span className="text-blue-600">נמסרו: {campaign.delivered_count}</span>
                    )}
                    {campaign.failed_count !== undefined && campaign.failed_count > 0 && (
                      <span className="text-red-600">נכשלו: {campaign.failed_count}</span>
                    )}
                  </div>
                  {campaign.target_tags && campaign.target_tags.length > 0 && (
                    <div className="mt-2 flex gap-1 flex-wrap">
                      <span className="text-xs text-gray-500">תגיות:</span>
                      {campaign.target_tags.map((tag: string, idx: number) => (
                        <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mr-4">
                  {campaign.status === 'draft' && (
                    <button
                      onClick={() => sendCampaign(campaign.id)}
                      className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                    >
                      שלח
                    </button>
                  )}
                  <button
                    onClick={() => router.push(`/admin/campaigns/${campaign.id}`)}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                  >
                    פרטים
                  </button>
                  <button
                    onClick={() => handleDeleteCampaign(campaign.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    מחק
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
