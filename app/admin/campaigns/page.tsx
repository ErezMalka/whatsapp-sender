'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

interface Campaign {
  id: string;
  tenant_id: string;
  name: string;
  message_content: string;
  target_type: string;
  status: string;
  send_rate: number;
  is_sending: boolean;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  start_time?: string;
  end_time?: string;
  created_at: string;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  tags?: string[];
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignStats, setCampaignStats] = useState<any>({});
  
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    message_content: '',
    target_type: 'all',
    target_tags: [] as string[],
    send_rate: 30,
    green_api_instance: '',
    green_api_token: ''
  });

  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCampaigns();
    fetchContacts();
  }, []);

  useEffect(() => {
    // רענן סטטיסטיקות כל 5 שניות עבור קמפיינים פעילים
    const interval = setInterval(() => {
      campaigns.forEach(campaign => {
        if (campaign.is_sending) {
          fetchCampaignStats(campaign.id);
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [campaigns]);

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
      
      // קבל סטטיסטיקות לכל קמפיין
      data?.forEach(campaign => {
        fetchCampaignStats(campaign.id);
      });
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, phone, tags')
        .eq('tenant_id', TENANT_ID)
        .eq('opt_out', false);

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchCampaignStats = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/campaigns/send?campaignId=${campaignId}`);
      const data = await response.json();
      
      setCampaignStats((prev: any) => ({
        ...prev,
        [campaignId]: data
      }));
    } catch (error) {
      console.error('Error fetching campaign stats:', error);
    }
  };

  const createCampaign = async () => {
    try {
      // קבע את הנמענים בהתאם לסוג היעד
      let recipients: Contact[] = [];
      
      if (newCampaign.target_type === 'all') {
        recipients = contacts;
      } else if (newCampaign.target_type === 'tags') {
        recipients = contacts.filter(contact => 
          contact.tags?.some(tag => newCampaign.target_tags.includes(tag))
        );
      } else if (newCampaign.target_type === 'selected') {
        recipients = contacts.filter(contact => 
          selectedContacts.has(contact.id)
        );
      }

      if (recipients.length === 0) {
        alert('לא נבחרו נמענים');
        return;
      }

      // צור קמפיין חדש
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert([{
          tenant_id: TENANT_ID,
          name: newCampaign.name,
          message_content: newCampaign.message_content,
          target_type: newCampaign.target_type,
          status: 'draft',
          send_rate: newCampaign.send_rate,
          total_recipients: recipients.length,
          green_api_instance: newCampaign.green_api_instance || process.env.NEXT_PUBLIC_GREEN_API_INSTANCE,
          green_api_token: newCampaign.green_api_token || process.env.NEXT_PUBLIC_GREEN_API_TOKEN
        }])
        .select()
        .single();

      if (campaignError) throw campaignError;

      // הוסף נמענים לקמפיין
      const campaignRecipients = recipients.map(contact => ({
        campaign_id: campaign.id,
        contact_id: contact.id,
        tenant_id: TENANT_ID,
        status: 'pending'
      }));

      const { error: recipientsError } = await supabase
        .from('campaign_recipients')
        .insert(campaignRecipients);

      if (recipientsError) throw recipientsError;

      alert(`קמפיין נוצר בהצלחה! ${recipients.length} נמענים נוספו.`);
      
      setShowNewCampaign(false);
      setNewCampaign({
        name: '',
        message_content: '',
        target_type: 'all',
        target_tags: [],
        send_rate: 30,
        green_api_instance: '',
        green_api_token: ''
      });
      setSelectedContacts(new Set());
      fetchCampaigns();
      
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('שגיאה ביצירת קמפיין');
    }
  };

  const startCampaign = async (campaignId: string) => {
    if (!confirm('האם אתה בטוח שברצונך להתחיל את הקמפיין?')) return;

    try {
      const response = await fetch('/api/campaigns/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId,
          action: 'start'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start campaign');
      }

      alert(`הקמפיין החל! ${data.totalRecipients} הודעות ישלחו בקצב של הודעה כל ${data.sendRate} שניות.`);
      fetchCampaigns();
      
    } catch (error: any) {
      console.error('Error starting campaign:', error);
      alert('שגיאה בהפעלת הקמפיין: ' + error.message);
    }
  };

  const stopCampaign = async (campaignId: string) => {
    if (!confirm('האם אתה בטוח שברצונך לעצור את הקמפיין?')) return;

    try {
      const response = await fetch('/api/campaigns/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId,
          action: 'stop'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to stop campaign');
      }

      alert('הקמפיין נעצר');
      fetchCampaigns();
      
    } catch (error: any) {
      console.error('Error stopping campaign:', error);
      alert('שגיאה בעצירת הקמפיין: ' + error.message);
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הקמפיין?')) return;

    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId)
        .eq('tenant_id', TENANT_ID);

      if (error) throw error;
      
      alert('הקמפיין נמחק בהצלחה');
      fetchCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert('שגיאה במחיקת הקמפיין');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sending': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'טיוטה';
      case 'sending': return 'נשלח...';
      case 'completed': return 'הושלם';
      case 'paused': return 'מושהה';
      case 'failed': return 'נכשל';
      default: return status;
    }
  };

  if (loading) {
    return <div className="p-8">טוען...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">ניהול קמפיינים</h1>
        <button
          onClick={() => setShowNewCampaign(!showNewCampaign)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          {showNewCampaign ? 'ביטול' : '+ קמפיין חדש'}
        </button>
      </div>

      {showNewCampaign && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">יצירת קמפיין חדש</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם הקמפיין</label>
              <input
                type="text"
                value={newCampaign.name}
                onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                className="w-full border p-2 rounded"
                placeholder="לדוגמה: מבצע סוף שנה"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">תוכן ההודעה</label>
              <textarea
                value={newCampaign.message_content}
                onChange={(e) => setNewCampaign({...newCampaign, message_content: e.target.value})}
                className="w-full border p-2 rounded h-32"
                placeholder="הקלד את תוכן ההודעה כאן..."
              />
              <p className="text-sm text-gray-500 mt-1">
                {newCampaign.message_content.length} תווים
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ⏱️ קצב שליחה (שניות בין הודעה להודעה)
              </label>
              <select
                value={newCampaign.send_rate}
                onChange={(e) => setNewCampaign({...newCampaign, send_rate: parseInt(e.target.value)})}
                className="w-full border p-2 rounded"
              >
                <option value="10">10 שניות (מהיר - זהירות מחסימה!)</option>
                <option value="20">20 שניות</option>
                <option value="30">30 שניות (מומלץ)</option>
                <option value="45">45 שניות</option>
                <option value="60">דקה</option>
                <option value="90">דקה וחצי</option>
                <option value="120">2 דקות (איטי ובטוח)</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                💡 קצב איטי יותר = פחות סיכוי לחסימה ב-WhatsApp
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">קהל יעד</label>
              <select
                value={newCampaign.target_type}
                onChange={(e) => setNewCampaign({...newCampaign, target_type: e.target.value})}
                className="w-full border p-2 rounded"
              >
                <option value="all">כל אנשי הקשר ({contacts.length})</option>
                <option value="tags">לפי תגיות</option>
                <option value="selected">בחירה ידנית</option>
              </select>
            </div>

            {newCampaign.target_type === 'tags' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">בחר תגיות</label>
                <div className="flex flex-wrap gap-2">
                  {['לקוחות', 'ספקים', 'עובדים', 'VIP', 'חדשים'].map(tag => (
                    <label key={tag} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newCampaign.target_tags.includes(tag)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewCampaign({
                              ...newCampaign,
                              target_tags: [...newCampaign.target_tags, tag]
                            });
                          } else {
                            setNewCampaign({
                              ...newCampaign,
                              target_tags: newCampaign.target_tags.filter(t => t !== tag)
                            });
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="bg-gray-100 px-2 py-1 rounded">{tag}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {newCampaign.target_type === 'selected' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  בחר נמענים ({selectedContacts.size} נבחרו)
                </label>
                <div className="max-h-40 overflow-y-auto border rounded p-2">
                  {contacts.map(contact => (
                    <label key={contact.id} className="flex items-center py-1">
                      <input
                        type="checkbox"
                        checked={selectedContacts.has(contact.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedContacts);
                          if (e.target.checked) {
                            newSelected.add(contact.id);
                          } else {
                            newSelected.delete(contact.id);
                          }
                          setSelectedContacts(newSelected);
                        }}
                        className="mr-2"
                      />
                      <span>{contact.name} - {contact.phone}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <details className="cursor-pointer">
                <summary className="text-sm font-medium text-gray-700">הגדרות Green API (אופציונלי)</summary>
                <div className="mt-2 space-y-2">
                  <input
                    type="text"
                    value={newCampaign.green_api_instance}
                    onChange={(e) => setNewCampaign({...newCampaign, green_api_instance: e.target.value})}
                    className="w-full border p-2 rounded"
                    placeholder="Instance ID (אם ריק - ישתמש בברירת מחדל)"
                  />
                  <input
                    type="password"
                    value={newCampaign.green_api_token}
                    onChange={(e) => setNewCampaign({...newCampaign, green_api_token: e.target.value})}
                    className="w-full border p-2 rounded"
                    placeholder="API Token (אם ריק - ישתמש בברירת מחדל)"
                  />
                </div>
              </details>
            </div>

            <button
              onClick={createCampaign}
              disabled={!newCampaign.name || !newCampaign.message_content}
              className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            >
              צור קמפיין
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {campaigns.map(campaign => {
          const stats = campaignStats[campaign.id];
          const progress = campaign.total_recipients > 0 
            ? Math.round((campaign.sent_count / campaign.total_recipients) * 100)
            : 0;

          return (
            <div key={campaign.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{campaign.name}</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    נוצר ב: {new Date(campaign.created_at).toLocaleDateString('he-IL')}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded text-sm ${getStatusColor(campaign.status)}`}>
                  {getStatusText(campaign.status)}
                </span>
              </div>

              <div className="bg-gray-50 p-3 rounded mb-4">
                <p className="text-gray-700 whitespace-pre-wrap">{campaign.message_content}</p>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-gray-500 text-sm">נמענים</p>
                  <p className="text-xl font-semibold">{campaign.total_recipients}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-sm">נשלחו</p>
                  <p className="text-xl font-semibold text-green-600">{campaign.sent_count}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-sm">נכשלו</p>
                  <p className="text-xl font-semibold text-red-600">{campaign.failed_count}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-sm">קצב שליחה</p>
                  <p className="text-xl font-semibold">{campaign.send_rate}s</p>
                </div>
              </div>

              {campaign.is_sending && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>התקדמות</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {campaign.start_time && (
                    <p className="text-xs text-gray-500 mt-1">
                      התחיל ב: {new Date(campaign.start_time).toLocaleTimeString('he-IL')}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                {campaign.status === 'draft' && (
                  <button
                    onClick={() => startCampaign(campaign.id)}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    🚀 התחל שליחה
                  </button>
                )}
                
                {campaign.is_sending && (
                  <button
                    onClick={() => stopCampaign(campaign.id)}
                    className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                  >
                    ⏸️ עצור שליחה
                  </button>
                )}

                {campaign.status === 'paused' && (
                  <button
                    onClick={() => startCampaign(campaign.id)}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    ▶️ המשך שליחה
                  </button>
                )}

                <button
                  onClick={() => setSelectedCampaign(campaign)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  📊 פרטים
                </button>

                {!campaign.is_sending && (
                  <button
                    onClick={() => deleteCampaign(campaign.id)}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  >
                    🗑️ מחק
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {campaigns.length === 0 && (
        <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
          <p>אין קמפיינים עדיין</p>
          <p className="mt-2">לחץ על "קמפיין חדש" להתחיל</p>
        </div>
      )}
    </div>
  );
}
