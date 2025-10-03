'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Campaign {
  id: string;
  name: string;
  message: string;
  message_content?: string;
  status: string;
  recipients_count?: number;
  total_recipients?: number;
  sent_count?: number;
  failed_count?: number;
  send_rate?: number;
  delay?: number;
  created_at: string;
  start_time?: string;
  end_time?: string;
  is_sending?: boolean;
  target_type?: string;
  target_tags?: string[];
  green_api_instance?: string;
  green_api_token?: string;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  tags?: string[];
}

export default function CampaignsNew() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    message_content: '',
    send_rate: 30,
    target_type: 'all',
    target_tags: [] as string[],
    custom_recipients: '',
    green_api_instance: '',
    green_api_token: ''
  });

  useEffect(() => {
    fetchCampaigns();
    fetchContacts();
    
    // רענון אוטומטי כל 5 שניות עבור קמפיינים פעילים
    const interval = setInterval(() => {
      if (campaigns.some(c => c.is_sending)) {
        fetchCampaigns();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching campaigns:', error);
        setError('שגיאה בטעינת קמפיינים');
      } else {
        setCampaigns(data || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('שגיאה לא צפויה בטעינת קמפיינים');
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching contacts:', error);
      } else {
        setContacts(data || []);
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
    }
  };

  const createCampaign = async () => {
    try {
      // בדיקות בסיסיות
      if (!newCampaign.name.trim()) {
        setError('יש להזין שם לקמפיין');
        return;
      }
      
      if (!newCampaign.message_content.trim()) {
        setError('יש להזין תוכן הודעה');
        return;
      }
      
      // הכנת נתוני הקמפיין
      const campaignData = {
        name: newCampaign.name.trim(),
        message_content: newCampaign.message_content.trim(),
        status: 'draft',
        send_rate: newCampaign.send_rate,
        total_recipients: 0,
        sent_count: 0,
        failed_count: 0,
        is_sending: false,
        target_type: newCampaign.target_type,
        created_at: new Date().toISOString()
      };
      
      // הוספת שדות אופציונליים אם קיימים
      const optionalFields: any = {};
      
      if (newCampaign.target_type === 'tags' && newCampaign.target_tags.length > 0) {
        optionalFields.target_tags = newCampaign.target_tags;
      }
      
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
        console.error('Error with full campaign:', campaignError);
        
        // נסיון ללא שדות אופציונליים
        console.log('Retrying with minimal fields...');
        const minimalData = {
          name: newCampaign.name.trim(),
          message_content: newCampaign.message_content.trim(),
          status: 'draft',
          send_rate: newCampaign.send_rate,
          total_recipients: 0,
          sent_count: 0,
          failed_count: 0,
          created_at: new Date().toISOString()
        };
        
        const { data: minimalCampaign, error: minimalError } = await supabase
          .from('campaigns')
          .insert([minimalData])
          .select()
          .single();
        
        if (minimalError) {
          console.error('Error with minimal campaign:', minimalError);
          
          // נסיון אחרון עם שמות שדות חלופיים
          const alternativeData = {
            name: newCampaign.name.trim(),
            message: newCampaign.message_content.trim(), // שם שדה חלופי
            status: 'draft',
            delay: newCampaign.send_rate, // שם שדה חלופי
            recipients_count: 0, // שם שדה חלופי
            created_at: new Date().toISOString()
          };
          
          const { data: altCampaign, error: altError } = await supabase
            .from('campaigns')
            .insert([alternativeData])
            .select()
            .single();
          
          if (altError) {
            throw altError;
          }
          
          campaign = altCampaign;
        } else {
          campaign = minimalCampaign;
        }
      }
      
      if (!campaign) {
        throw new Error('לא הצליח ליצור קמפיין');
      }
      
      console.log('Campaign created:', campaign);
      
      // נסה להוסיף שדות אופציונליים בנפרד
      if (Object.keys(optionalFields).length > 0 && campaign.id) {
        console.log('Adding optional fields separately...');
        
        const fieldsToTry = [
          { key: 'target_type', value: newCampaign.target_type },
          { key: 'target_tags', value: newCampaign.target_tags },
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
            } catch (updateError) {
              console.log(`Could not add ${field.key}:`, updateError);
            }
          }
        }
      }
      
      // הכנת רשימת נמענים
      let recipients: string[] = [];
      
      if (newCampaign.target_type === 'all') {
        recipients = contacts.map(c => c.phone);
      } else if (newCampaign.target_type === 'tags' && newCampaign.target_tags.length > 0) {
        recipients = contacts
          .filter(c => c.tags?.some(tag => newCampaign.target_tags.includes(tag)))
          .map(c => c.phone);
      } else if (newCampaign.target_type === 'selected') {
        recipients = contacts
          .filter(c => selectedContacts.has(c.id))
          .map(c => c.phone);
      } else if (newCampaign.target_type === 'custom') {
        recipients = newCampaign.custom_recipients
          .split('\n')
          .map(p => p.trim())
          .filter(p => p.length > 0);
      }
      
      // הוספת נמענים לטבלת campaign_recipients
      if (recipients.length > 0 && campaign.id) {
        const campaignRecipients = recipients.map(phone => ({
          campaign_id: campaign.id,
          phone: phone,
          status: 'pending'
        }));
        
        console.log('Adding recipients to campaign_recipients...');
        await supabase
          .from('campaign_recipients')
          .insert(campaignRecipients);
        
        // עדכון מספר הנמענים בקמפיין
        await supabase
          .from('campaigns')
          .update({ total_recipients: recipients.length })
          .eq('id', campaign.id);
      }
      
      // איפוס הטופס
      setNewCampaign({
        name: '',
        message_content: '',
        send_rate: 30,
        target_type: 'all',
        target_tags: [],
        custom_recipients: '',
        green_api_instance: '',
        green_api_token: ''
      });
      setShowNewCampaign(false);
      setSelectedContacts(new Set());
      
      // רענן רשימת קמפיינים
      await fetchCampaigns();
      
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      setError(error.message || 'שגיאה ביצירת קמפיין');
    }
  };

  const startCampaign = async (campaignId: string) => {
    try {
      const response = await fetch('/api/campaigns/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to start campaign');
      }
      
      await fetchCampaigns();
    } catch (error) {
      console.error('Error starting campaign:', error);
      setError('שגיאה בהתחלת קמפיין');
    }
  };

  const stopCampaign = async (campaignId: string) => {
    try {
      const response = await fetch('/api/campaigns/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to stop campaign');
      }
      
      await fetchCampaigns();
    } catch (error) {
      console.error('Error stopping campaign:', error);
      setError('שגיאה בעצירת קמפיין');
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק קמפיין זה?')) {
      return;
    }
    
    try {
      // מחק קודם את הנמענים
      await supabase
        .from('campaign_recipients')
        .delete()
        .eq('campaign_id', campaignId);
      
      // מחק את הקמפיין
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);
      
      if (error) throw error;
      
      await fetchCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      setError('שגיאה במחיקת קמפיין');
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'טיוטה';
      case 'sending': return 'שולח...';
      case 'paused': return 'מושהה';
      case 'completed': return 'הושלם';
      case 'failed': return 'נכשל';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sending': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
