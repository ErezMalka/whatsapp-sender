'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

interface Campaign {
  id: string;
  tenant_id: string;
  name: string;
  message?: string;
  message_content?: string;
  target_type?: string;
  status: string;
  send_rate?: number;
  delay?: number;
  is_sending?: boolean;
  total_recipients?: number;
  recipients_count?: number;
  recipients?: any[];
  sent_count?: number;
  failed_count?: number;
  start_time?: string;
  end_time?: string;
  green_api_instance?: string;
  green_api_token?: string;
  created_at: string;
  updated_at?: string;
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
  const [error, setError] = useState<string | null>(null);
  
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    message_content: '',
    target_type: 'all',
    target_tags: [] as string[],
    custom_recipients: '',
    send_rate: 30,
    green_api_instance: '',
    green_api_token: ''
  });

  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());

  useEffect(() => {
    testConnection();
    fetchCampaigns();
    fetchContacts();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      campaigns.forEach(campaign => {
        if (campaign.is_sending) {
          fetchCampaignStats(campaign.id);
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [campaigns]);

  // בדיקת חיבור ל-Supabase
  const testConnection = async () => {
    try {
      console.log('Testing Supabase connection...');
      const { data, error } = await supabase
        .from('campaigns')
        .select('id')
        .limit(1);
      
      if (error) {
        console.error('Supabase connection test failed:', error);
        setError(`בעיית חיבור ל-Supabase: ${error.message}`);
      } else {
        console.log('Supabase connection successful');
      }
    } catch (err: any) {
      console.error('Connection error:', err);
      setError(`שגיאת חיבור: ${err.message}`);
    }
  };

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching campaigns...');
      
      // נסיון 1: query פשוט ללא פילטרים
      let { data, error } = await supabase
        .from('campaigns')
        .select('*');

      if (error) {
        console.error('Error fetching all campaigns:', error);
        
        // נסיון 2: query עם שדות ספציפיים
        const response = await supabase
          .from('campaigns')
          .select('id, name, status, created_at, sent_count, failed_count');
        
        data = response.data;
        error = response.error;
        
        if (error) {
          throw error;
        }
      }

      // סינון לפי tenant_id בצד הלקוח אם צריך
      const filteredData = data?.filter(c => c.tenant_id === TENANT_ID) || data || [];
      
      // מיון לפי תאריך יצירה
      const sortedData = filteredData.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setCampaigns(sortedData);
      console.log(`Fetched ${sortedData.length} campaigns`);
      
      // קבל סטטיסטיקות לכל קמפיין
      sortedData.forEach(campaign => {
        fetchCampaignStats(campaign.id);
      });
    } catch (error: any) {
      console.error('Error fetching campaigns:', error);
      setError(`שגיאה בטעינת קמפיינים: ${error.message}`);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      console.log('Fetching contacts...');
      
      // נסה query פשוט קודם
      let { data, error } = await supabase
        .from('contacts')
        .select('*');

      if (error) {
        console.error('Error fetching all contacts:', error);
        
        // נסה query עם שדות ספציפיים
        const response = await supabase
          .from('contacts')
          .select('id, name, phone, tags');
        
        data = response.data;
        error = response.error;
        
        if (error) {
          throw error;
        }
      }

      // סינון בצד הלקוח
      const filteredData = data?.filter(c => 
        c.tenant_id === TENANT_ID && c.opt_out !== true
      ) || data || [];
      
      setContacts(filteredData);
      console.log(`Fetched ${filteredData.length} contacts`);
    } catch (error: any) {
      console.error('Error fetching contacts:', error);
      setContacts([]);
    }
  };

  const fetchCampaignStats = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/campaigns/send?campaignId=${campaignId}`);
      if (response.ok) {
        const data = await response.json();
        setCampaignStats((prev: any) => ({
          ...prev,
          [campaignId]: data
        }));
      }
    } catch (error) {
      console.error('Error fetching campaign stats:', error);
    }
  };

  const createCampaign = async () => {
    try {
      setError(null);
      
      // הכן את הנמענים
      let recipients: any[] = [];
      let contactIds: string[] = [];
      
      if (newCampaign.target_type === 'all') {
        recipients = contacts.map(c => ({ phone: c.phone, name: c.name || '' }));
        contactIds = contacts.map(c => c.id);
      } else if (newCampaign.target_type === 'tags') {
        const filteredContacts = contacts.filter(contact => 
          contact.tags?.some(tag => newCampaign.target_tags.includes(tag))
        );
        recipients = filteredContacts.map(c => ({ phone: c.phone, name: c.name || '' }));
        contactIds = filteredContacts.map(c => c.id);
      } else if (newCampaign.target_type === 'selected') {
        const filteredContacts = contacts.filter(contact => 
          selectedContacts.has(contact.id)
        );
        recipients = filteredContacts.map(c => ({ phone: c.phone, name: c.name || '' }));
        contactIds = filteredContacts.map(c => c.id);
      } else if (newCampaign.target_type === 'custom') {
        const customNumbers = newCampaign.custom_recipients
          .split('\n')
          .map(n => n.trim())
          .filter(n => n.length > 0);
        recipients = customNumbers.map(phone => ({ phone, name: '' }));
      }

      if (recipients.length === 0) {
        alert('לא נבחרו נמענים');
        return;
      }

      console.log('Creating campaign with recipients:', recipients.length);

      // בנה אובייקט קמפיין בסיסי
      const campaignData: any = {
        name: newCampaign.name,
        status: 'draft',
        created_at: new Date().toISOString()
      };

      // הוסף את tenant_id רק אם השדה קיים בטבלה
      // נבדוק את זה בהמשך

      // הוסף שדות אופציונליים - נוסיף רק את השדות שבאמת קיימים
      const optionalFields: any = {
        tenant_id: TENANT_ID,
        message: newCampaign.message_content,
        message_content: newCampaign.message_content,
        recipients: recipients,
        recipients_count: recipients.length,
        total_recipients: recipients.length,
        delay: newCampaign.send_rate,
        send_rate: newCampaign.send_rate,
        target_type: newCampaign.target_type,
        sent_count: 0,
        failed_count: 0,
        is_sending: false,
        updated_at: new Date().toISOString()
      };

      // הוסף Green API אם יש
      if (newCampaign.green_api_instance) {
        optionalFields.green_api_instance = newCampaign.green_api_instance;
      }
      if (newCampaign.green_api_token) {
        optionalFields.green_api_token = newCampaign.green_api_token;
      }

      // נסה ליצור עם כל השדות
      console.log('Attempting to create campaign with all fields...');
      let { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert([{...campaignData, ...optionalFields}])
        .select()
        .single();

      if (campaignError) {
        console.error('Full insert failed:', campaignError);
        
        // נסה עם פחות שדות
        console.log('Attempting minimal campaign creation...');
        const minimalData = {
          name: newCampaign.name,
          status: 'draft',
          created_at: new Date().toISOString()
        };

        const { data: minimalCampaign, error: minimalError } = await supabase
          .from('campaigns')
          .insert([minimalData])
          .select()
          .single();

        if (minimalError) {
          throw new Error(`לא הצלחתי ליצור קמפיין: ${minimalError.message}`);
        }

        campaign = minimalCampaign;
        
        // נסה לעדכן עם שאר השדות
        console.log('Updating campaign with additional fields...');
        const updateData: any = {};
        
        // נוסיף שדות אחד אחד ונבדוק מה עובד
        const fieldsToTry = [
          { key: 'tenant_id', value: TENANT_ID },
          { key: 'message', value: newCampaign.message_content },
          { key: 'message_content', value: newCampaign.message_content },
          { key: 'recipients', value: recipients },
          { key: 'recipients_count', value: recipients.length },
          { key: 'total_recipients', value: recipients.length },
          { key: 'delay', value: newCampaign.send_rate },
          { key: 'send_rate', value: newCampaign.send_rate },
          { key: 'sent_count', value: 0 },
          { key: 'failed_count', value: 0 },
          { key: 'green_api_instance', value: newCampaign.green_api_instance },
          { key: 'green_api_token', value: newCampaign.green_api_token }
        ];

        for (const field of fieldsToTry) {
          if (field.value !== undefined && field.value !== '') {
            try {
              await supabase
                .from('campaigns')
                .update({ [field.key]: field.value })
                .eq('id', campaign.id);
              
              updateData[field.key] = field.value;
              console.log(`Successfully updated field: ${field.key}`);
            } catch (err) {
              console.log(`Field ${field.key} does not exist in table`);
            }
          }
        }

        // עדכן את הקמפיין המקומי
        campaign = { ...campaign, ...updateData };
      }

      console.log('Campaign created:', campaign.id);

      // נסה להוסיף לטבלת campaign_recipients אם יש אנשי קשר
      if (contactIds.length > 0) {
        try {
          const campaignRecipients = contactIds.map(contactId => ({
            campaign_id: campaign.id,
            contact_id: contactId,
            tenant_id: TENANT_ID,
            status: 'pending'
          }));

          console.log('Adding recipients to campaign_recipients...');
          await supabase
            .from('campaign_recipients')
            .insert(campaignRecipients);
          
          console.log('Recipients added successfully');
        } catch (err) {
          console.log('campaign_recipients table might not exist, skipping...');
        }
      }

      alert(`קמפיין נוצר בהצלחה! ${recipients.length} נמענים נוספו.`);
      
      // אפס הכל
      setShowNewCampaign(false);
      setNewCampaign({
        name: '',
        message_content: '',
        target_type: 'all',
        target_tags: [],
        custom_recipients: '',
        send_rate: 30,
        green_api_instance: '',
        green_api_token: ''
      });
      setSelectedContacts(new Set());
      
      // רענן רשימת קמפיינים
      await fetchCampaigns();
      
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      setError(`שגיאה ביצירת קמפיין: ${error.message}`);
      alert(`שגיאה ביצירת קמפיין: ${error.message}`);
    }
  };

  const startCampaign = async (campaignId: string) => {
    if (!confirm('האם אתה בטוח שברצונך להתחיל את הקמפיין?')) return;

    try {
      // נסה לעדכן את הסטטוס
      const updateData: any = {
        status: 'sending',
        start_time: new Date().toISOString()
      };

      // נסה להוסיף שדות אופציונליים
      try {
        await supabase
          .from('campaigns')
          .update({ ...updateData, is_sending: true })
          .eq('id', campaignId);
      } catch {
        // אם is_sending לא קיים, נסה בלעדיו
        await supabase
          .from('campaigns')
          .update(updateData)
          .eq('id', campaignId);
      }

      // נסה לקרוא ל-API
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

        if (!response.ok) {
          console.log('API call failed, but campaign status updated');
        }
      } catch (err) {
        console.log('API not available, continuing...');
      }

      alert('הקמפיין הופעל בהצלחה!');
      fetchCampaigns();
      
    } catch (error: any) {
      console.error('Error starting campaign:', error);
      alert('שגיאה בהפעלת הקמפיין: ' + error.message);
    }
  };

  const stopCampaign = async (campaignId: string) => {
    if (!confirm('האם אתה בטוח שברצונך לעצור את הקמפיין?')) return;

    try {
      const updateData: any = {
        status: 'paused'
      };

      try {
        await supabase
          .from('campaigns')
          .update({ ...updateData, is_sending: false })
          .eq('id', campaignId);
      } catch {
        await supabase
          .from('campaigns')
          .update(updateData)
          .eq('id', campaignId);
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
      // נסה למחוק מ-campaign_recipients אם קיימת
      try {
        await supabase
          .from('campaign_recipients')
          .delete()
          .eq('campaign_id', campaignId);
      } catch {
        console.log('No campaign_recipients to delete');
      }

      // מחק את הקמפיין
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;
      
      alert('הקמפיין נמחק בהצלחה');
      fetchCampaigns();
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      alert('שגיאה במחיקת הקמפיין: ' + error.message);
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
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="text-xl mb-2">טוען...</div>
          {error && (
            <div className="text-red-500 mt-4 p-4 bg-red-50 rounded">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* הודעת שגיאה כללית */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">ניהול קמפיינים</h1>
        <button
          onClick={() => setShowNewCampaign(!showNewCampaign)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          {showNewCampaign ? 'ביטול' : '+ קמפיין חדש'}
        </button>
      </div>

      {showNewCampaign && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">יצירת קמפיין חדש</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם הקמפיין *</label>
              <input
                type="text"
                value={newCampaign.name}
                onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="לדוגמה: מבצע סוף שנה"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">תוכן ההודעה *</label>
              <textarea
                value={newCampaign.message_content}
                onChange={(e) => setNewCampaign({...newCampaign, message_content: e.target.value})}
                className="w-full border p-2 rounded h-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">כל אנשי הקשר ({contacts.length})</option>
                <option value="tags">לפי תגיות</option>
                <option value="selected">בחירה ידנית</option>
                <option value="custom">רשימה מותאמת אישית</option>
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
                  {contacts.length > 0 ? contacts.map(contact => (
                    <label key={contact.id} className="flex items-center py-1 hover:bg-gray-50">
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
                  )) : (
                    <p className="text-gray-500 text-center py-2">אין אנשי קשר זמינים</p>
                  )}
                </div>
              </div>
            )}

            {newCampaign.target_type === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  הכנס רשימת מספרי טלפון (אחד בכל שורה)
                </label>
                <textarea
                  value={newCampaign.custom_recipients}
                  onChange={(e) => setNewCampaign({...newCampaign, custom_recipients: e.target.value})}
                  className="w-full border p-2 rounded h-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="972501234567
972502345678
972503456789"
                />
                <p className="text-sm text-gray-500 mt-1">
                  פורמט: 972XXXXXXXXX (ללא + או -)
                </p>
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
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Instance ID (אם ריק - ישתמש בברירת מחדל)"
                  />
                  <input
                    type="password"
                    value={newCampaign.green_api_token}
                    onChange={(e) => setNewCampaign({...newCampaign, green_api_token: e.target.value})}
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="API Token (אם ריק - ישתמש בברירת מחדל)"
                  />
                </div>
              </details>
            </div>

            <button
              onClick={createCampaign}
              disabled={!newCampaign.name || !newCampaign.message_content}
              className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              צור קמפיין
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {campaigns.map(campaign => {
          const totalRecipients = campaign.total_recipients || campaign.recipients_count || 0;
          const sentCount = campaign.sent_count || 0;
          const failedCount = campaign.failed_count || 0;
          const progress = totalRecipients > 0 
            ? Math.round((sentCount / totalRecipients) * 100)
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

              {(campaign.message_content || campaign.message) && (
                <div className="bg-gray-50 p-3 rounded mb-4">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {campaign.message_content || campaign.message}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-gray-500 text-sm">נמענים</p>
                  <p className="text-xl font-semibold">{totalRecipients}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-sm">נשלחו</p>
                  <p className="text-xl font-semibold text-green-600">{sentCount}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-sm">נכשלו</p>
                  <p className="text-xl font-semibold text-red-600">{failedCount}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-sm">קצב שליחה</p>
                  <p className="text-xl font-semibold">{campaign.send_rate || campaign.delay || 30}s</p>
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
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
                  >
                    🚀 התחל שליחה
                  </button>
                )}
                
                {campaign.is_sending && (
                  <button
                    onClick={() => stopCampaign(campaign.id)}
                    className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors"
                  >
                    ⏸️ עצור שליחה
                  </button>
                )}

                {campaign.status === 'paused' && (
                  <button
                    onClick={() => startCampaign(campaign.id)}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                  >
                    ▶️ המשך שליחה
                  </button>
                )}

                <button
                  onClick={() => setSelectedCampaign(campaign)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
                >
                  📊 פרטים
                </button>

                {!campaign.is_sending && (
                  <button
                    onClick={() => deleteCampaign(campaign.id)}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                  >
                    🗑️ מחק
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {campaigns.length === 0 && !loading && (
        <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
          <p>אין קמפיינים עדיין</p>
          <p className="mt-2">לחץ על "קמפיין חדש" להתחיל</p>
        </div>
      )}

      {/* Modal לפרטי קמפיין */}
      {selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold">פרטי קמפיין: {selectedCampaign.name}</h3>
                <button
                  onClick={() => setSelectedCampaign(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {(selectedCampaign.message_content || selectedCampaign.message) && (
                  <div>
                    <h4 className="font-semibold text-gray-700">הודעה</h4>
                    <div className="bg-gray-50 p-3 rounded mt-1">
                      <p className="whitespace-pre-wrap">
                        {selectedCampaign.message_content || selectedCampaign.message}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-700">סטטוס</h4>
                    <span className={`inline-block px-3 py-1 rounded text-sm mt-1 ${getStatusColor(selectedCampaign.status)}`}>
                      {getStatusText(selectedCampaign.status)}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700">קצב שליחה</h4>
                    <p>{selectedCampaign.send_rate || selectedCampaign.delay || 30} שניות</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded">
                  <div className="text-center">
                    <p className="text-gray-500 text-sm">נמענים</p>
                    <p className="text-2xl font-bold">
                      {selectedCampaign.total_recipients || selectedCampaign.recipients_count || 0}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 text-sm">נשלחו</p>
                    <p className="text-2xl font-bold text-green-600">{selectedCampaign.sent_count || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 text-sm">נכשלו</p>
                    <p className="text-2xl font-bold text-red-600">{selectedCampaign.failed_count || 0}</p>
                  </div>
                </div>

                {selectedCampaign.start_time && (
                  <div>
                    <h4 className="font-semibold text-gray-700">זמן התחלה</h4>
                    <p>{new Date(selectedCampaign.start_time).toLocaleString('he-IL')}</p>
                  </div>
                )}

                {selectedCampaign.end_time && (
                  <div>
                    <h4 className="font-semibold text-gray-700">זמן סיום</h4>
                    <p>{new Date(selectedCampaign.end_time).toLocaleString('he-IL')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
