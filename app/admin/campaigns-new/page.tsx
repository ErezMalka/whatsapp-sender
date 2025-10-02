'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Campaign {
  id: string;
  name: string;
  message: string;
  recipients: any[];
  recipients_count: number;
  sent_count: number;
  failed_count: number;
  status: string;
  delay: number;
  green_api_instance?: string;
  green_api_token?: string;
  created_at: string;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  tags?: string[];
}

export default function CampaignsNewPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('create');
  const [logs, setLogs] = useState<string[]>([]);
  
  // Green API Credentials
  const [greenApiConfig, setGreenApiConfig] = useState({
    instanceId: '',
    token: ''
  });
  
  const [formData, setFormData] = useState({
    name: '',
    message: '',
    recipients: '',
    delay: 30,
    target_type: 'all',
    selected_tags: [] as string[],
    green_api_instance: '',
    green_api_token: ''
  });

  useEffect(() => {
    loadCampaigns();
    loadContacts();
    loadGreenApiConfig();
  }, []);

  const loadGreenApiConfig = () => {
    // Try to load from environment variables or localStorage
    const instanceId = process.env.NEXT_PUBLIC_GREEN_API_INSTANCE || 
                      localStorage.getItem('green_api_instance') || '';
    const token = process.env.NEXT_PUBLIC_GREEN_API_TOKEN || 
                 localStorage.getItem('green_api_token') || '';
    
    setGreenApiConfig({ instanceId, token });
    setFormData(prev => ({
      ...prev,
      green_api_instance: instanceId,
      green_api_token: token
    }));
  };

  const loadContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*');
      
      if (error) {
        console.error('Error loading contacts:', error);
        return;
      }
      
      if (data) {
        setContacts(data as Contact[]);
        
        const tags = new Set<string>();
        data.forEach((contact: Contact) => {
          if (contact.tags) {
            contact.tags.forEach(tag => tags.add(tag));
          }
        });
        
        if (tags.size === 0) {
          ['לקוחות', 'ספקים', 'עובדים', 'VIP', 'חדשים'].forEach(tag => tags.add(tag));
        }
        
        setAvailableTags(Array.from(tags));
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading campaigns:', error);
        return;
      }
      
      if (data) {
        setCampaigns(data as Campaign[]);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getTargetRecipients = () => {
    let targetContacts: Contact[] = [];
    
    switch (formData.target_type) {
      case 'all':
        targetContacts = contacts;
        break;
      
      case 'tags':
        targetContacts = contacts.filter(contact => 
          contact.tags?.some(tag => formData.selected_tags.includes(tag))
        );
        break;
      
      case 'manual':
        const manualNumbers = formData.recipients
          .split('\n')
          .map(phone => phone.trim())
          .filter(phone => phone.length > 0);
        
        return manualNumbers.map(phone => ({
          phone,
          name: ''
        }));
    }
    
    return targetContacts.map(contact => ({
      phone: contact.phone,
      name: contact.name || ''
    }));
  };

  const createCampaign = async () => {
    try {
      setIsCreating(true);

      if (!formData.name || !formData.message) {
        alert('נא למלא שם קמפיין והודעה');
        return;
      }

      const recipientsList = getTargetRecipients();

      if (recipientsList.length === 0) {
        alert('לא נבחרו נמענים');
        return;
      }

      const campaignData = {
        name: formData.name,
        message: formData.message,
        recipients: recipientsList,
        recipients_count: recipientsList.length,
        sent_count: 0,
        failed_count: 0,
        status: 'ready',
        delay: formData.delay * 1000,
        green_api_instance: formData.green_api_instance || null,
        green_api_token: formData.green_api_token || null
      };

      console.log('Creating campaign with:', campaignData);

      const { data: campaign, error } = await supabase
        .from('campaigns')
        .insert([campaignData])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      setCampaigns([campaign as Campaign, ...campaigns]);
      
      // Save Green API credentials if provided
      if (formData.green_api_instance) {
        localStorage.setItem('green_api_instance', formData.green_api_instance);
      }
      if (formData.green_api_token) {
        localStorage.setItem('green_api_token', formData.green_api_token);
      }
      
      // Reset form
      setFormData({
        name: '',
        message: '',
        recipients: '',
        delay: 30,
        target_type: 'all',
        selected_tags: [],
        green_api_instance: greenApiConfig.instanceId,
        green_api_token: greenApiConfig.token
      });

      alert(`קמפיין נוצר בהצלחה עם ${recipientsList.length} נמענים`);
      setActiveTab('campaigns');
      
    } catch (error: any) {
      console.error('Create campaign error:', error);
      alert('שגיאה: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  // Function to send WhatsApp message via Green API
  const sendWhatsAppMessage = async (phone: string, message: string, instanceId: string, token: string) => {
    try {
      // Format phone number
      let formattedPhone = phone.replace(/\D/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '972' + formattedPhone.substring(1);
      }
      if (!formattedPhone.startsWith('972')) {
        formattedPhone = '972' + formattedPhone;
      }

      const apiUrl = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: `${formattedPhone}@c.us`,
          message: message
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, messageId: data.idMessage };
      
    } catch (error: any) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }
  };

  // Function to start sending campaign
  const startCampaign = async (campaign: Campaign) => {
    try {
      const instanceId = campaign.green_api_instance || greenApiConfig.instanceId;
      const token = campaign.green_api_token || greenApiConfig.token;

      if (!instanceId || !token) {
        alert('חסרים פרטי Green API. הגדר אותם בהגדרות או בעת יצירת הקמפיין.');
        return;
      }

      if (!confirm(`להתחיל לשלוח ${campaign.recipients_count} הודעות?`)) {
        return;
      }

      setIsSending(true);
      setSendingCampaignId(campaign.id);
      setLogs([]);
      setActiveTab('campaigns');

      // Update campaign status to running
      await supabase
        .from('campaigns')
        .update({ status: 'running' })
        .eq('id', campaign.id);

      let sentCount = 0;
      let failedCount = 0;

      for (let i = 0; i < campaign.recipients.length; i++) {
        const recipient = campaign.recipients[i];
        
        // Check if campaign was paused
        const { data: currentCampaign } = await supabase
          .from('campaigns')
          .select('status')
          .eq('id', campaign.id)
          .single();

        if (currentCampaign?.status === 'paused') {
          setLogs(prev => [...prev, 'הקמפיין הושהה']);
          break;
        }

        setLogs(prev => [...prev, `שולח הודעה ${i + 1}/${campaign.recipients_count} ל-${recipient.phone}`]);

        const result = await sendWhatsAppMessage(
          recipient.phone,
          campaign.message,
          instanceId,
          token
        );

        if (result.success) {
          sentCount++;
          setLogs(prev => [...prev, `✅ נשלח בהצלחה ל-${recipient.phone}`]);
        } else {
          failedCount++;
          setLogs(prev => [...prev, `❌ נכשל: ${recipient.phone} - ${result.error}`]);
        }

        // Update campaign progress
        await supabase
          .from('campaigns')
          .update({
            sent_count: sentCount,
            failed_count: failedCount
          })
          .eq('id', campaign.id);

        // Reload campaigns to show updated progress
        loadCampaigns();

        // Wait between messages
        if (i < campaign.recipients.length - 1) {
          const delaySeconds = (campaign.delay || 30000) / 1000;
          setLogs(prev => [...prev, `⏳ ממתין ${delaySeconds} שניות...`]);
          await new Promise(resolve => setTimeout(resolve, campaign.delay || 30000));
        }
      }

      // Update campaign status to completed
      await supabase
        .from('campaigns')
        .update({ status: 'completed' })
        .eq('id', campaign.id);

      setLogs(prev => [...prev, `✅ הקמפיין הושלם! נשלחו ${sentCount}, נכשלו ${failedCount}`]);
      loadCampaigns();

    } catch (error: any) {
      console.error('Error starting campaign:', error);
      alert('שגיאה בשליחת הקמפיין: ' + error.message);
    } finally {
      setIsSending(false);
      setSendingCampaignId(null);
    }
  };

  // Function to pause campaign
  const pauseCampaign = async (campaignId: string) => {
    await supabase
      .from('campaigns')
      .update({ status: 'paused' })
      .eq('id', campaignId);
    
    loadCampaigns();
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }} dir="rtl">
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '20px' }}>
        מנהל קמפיינים
      </h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #e5e5e5' }}>
        <button
          style={{
            padding: '10px 20px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            borderBottom: activeTab === 'create' ? '2px solid #10b981' : '2px solid transparent',
            color: activeTab === 'create' ? '#10b981' : '#000',
            fontWeight: activeTab === 'create' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('create')}
        >
          יצירת קמפיין
        </button>
        <button
          style={{
            padding: '10px 20px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            borderBottom: activeTab === 'campaigns' ? '2px solid #10b981' : '2px solid transparent',
            color: activeTab === 'campaigns' ? '#10b981' : '#000',
            fontWeight: activeTab === 'campaigns' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('campaigns')}
        >
          קמפיינים ({campaigns.length})
        </button>
      </div>

      {/* Logs Display */}
      {logs.length > 0 && (
        <div style={{ 
          backgroundColor: '#f9fafb', 
          borderRadius: '8px', 
          padding: '15px', 
          marginBottom: '20px',
          maxHeight: '200px',
          overflowY: 'auto',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          {logs.map((log, index) => (
            <div key={index} style={{ marginBottom: '5px' }}>{log}</div>
          ))}
        </div>
      )}

      {/* Create Tab */}
      {activeTab === 'create' && (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>יצירת קמפיין חדש</h2>
          
          {/* Campaign Name */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>שם הקמפיין</label>
            <input
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="לדוגמה: מבצע חורף 2024"
            />
          </div>

          {/* Message */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>תוכן ההודעה</label>
            <textarea
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical', minHeight: '100px' }}
              rows={5}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="הקלד את תוכן ההודעה כאן..."
            />
            <small style={{ color: '#6b7280' }}>{formData.message.length} תווים</small>
          </div>

          {/* Target Type */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>קהל יעד</label>
            <select
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
              value={formData.target_type}
              onChange={(e) => setFormData({ ...formData, target_type: e.target.value })}
            >
              <option value="all">כל אנשי הקשר ({contacts.length})</option>
              <option value="tags">לפי תגיות</option>
              <option value="manual">הזנה ידנית</option>
            </select>
          </div>

          {/* Tags Selection */}
          {formData.target_type === 'tags' && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>בחר תגיות</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
                {availableTags.map(tag => (
                  <label key={tag} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.selected_tags.includes(tag)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, selected_tags: [...formData.selected_tags, tag] });
                        } else {
                          setFormData({ ...formData, selected_tags: formData.selected_tags.filter(t => t !== tag) });
                        }
                      }}
                    />
                    <span>{tag}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Manual Recipients */}
          {formData.target_type === 'manual' && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>רשימת נמענים</label>
              <textarea
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical', minHeight: '100px' }}
                rows={5}
                value={formData.recipients}
                onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                placeholder="הכנס מספר טלפון בכל שורה"
              />
            </div>
          )}

          {/* Send Rate */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>קצב שליחה</label>
            <select
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
              value={formData.delay}
              onChange={(e) => setFormData({ ...formData, delay: parseInt(e.target.value) })}
            >
              <option value="5">5 שניות</option>
              <option value="10">10 שניות</option>
              <option value="30">30 שניות (מומלץ)</option>
              <option value="60">דקה</option>
            </select>
          </div>

          {/* Green API Settings */}
          <details style={{ marginBottom: '15px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }}>
              הגדרות Green API (אופציונלי)
            </summary>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
                type="text"
                value={formData.green_api_instance}
                onChange={(e) => setFormData({ ...formData, green_api_instance: e.target.value })}
                placeholder="Instance ID"
              />
              <input
                style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
                type="password"
                value={formData.green_api_token}
                onChange={(e) => setFormData({ ...formData, green_api_token: e.target.value })}
                placeholder="Token"
              />
            </div>
          </details>

          {/* Create Button */}
          <button
            style={{
              width: '100%',
              padding: '12px 20px',
              borderRadius: '4px',
              border: 'none',
              cursor: isCreating ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: '#10b981',
              color: 'white',
              opacity: isCreating ? 0.5 : 1
            }}
            onClick={createCampaign}
            disabled={isCreating}
          >
            {isCreating ? '⏳ יוצר קמפיין...' : '📤 צור קמפיין'}
          </button>
        </div>
      )}

      {/* Campaigns List */}
      {activeTab === 'campaigns' && (
        <div>
          {campaigns.map(campaign => (
            <div key={campaign.id} style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>{campaign.name}</h3>
                  <p style={{ color: '#6b7280', fontSize: '12px' }}>
                    נוצר: {new Date(campaign.created_at).toLocaleString('he-IL')}
                  </p>
                </div>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  backgroundColor: 
                    campaign.status === 'ready' ? '#dcfce7' : 
                    campaign.status === 'running' ? '#fef3c7' :
                    campaign.status === 'completed' ? '#e5e7eb' : '#dbeafe',
                  color: 
                    campaign.status === 'ready' ? '#166534' :
                    campaign.status === 'running' ? '#92400e' :
                    campaign.status === 'completed' ? '#374151' : '#1e40af'
                }}>
                  {campaign.status === 'ready' ? 'מוכן לשליחה' :
                   campaign.status === 'running' ? 'שולח...' :
                   campaign.status === 'paused' ? 'מושהה' :
                   campaign.status === 'completed' ? 'הושלם' : campaign.status}
                </span>
              </div>
              
              <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
                <p style={{ fontSize: '14px', color: '#374151' }}>{campaign.message}</p>
              </div>
              
              <div style={{ display: 'flex', gap: '20px', marginTop: '15px', fontSize: '14px' }}>
                <span>📋 נמענים: {campaign.recipients_count}</span>
                <span>✅ נשלחו: {campaign.sent_count || 0}</span>
                <span>❌ נכשלו: {campaign.failed_count || 0}</span>
              </div>

              {/* Progress Bar */}
              {(campaign.sent_count > 0 || campaign.status === 'running') && (
                <div style={{ marginTop: '15px' }}>
                  <div style={{ width: '100%', backgroundColor: '#e5e7eb', borderRadius: '4px', height: '8px' }}>
                    <div style={{
                      width: `${(campaign.sent_count / campaign.recipients_count) * 100}%`,
                      backgroundColor: '#10b981',
                      height: '100%',
                      borderRadius: '4px',
                      transition: 'width 0.3s'
                    }}></div>
                  </div>
                  <small style={{ color: '#6b7280' }}>
                    {Math.round((campaign.sent_count / campaign.recipients_count) * 100)}% הושלם
                  </small>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                {campaign.status === 'ready' && (
                  <button
                    style={{
                      padding: '8px 16px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: '#10b981',
                      color: 'white',
                      cursor: isSending ? 'not-allowed' : 'pointer',
                      opacity: isSending ? 0.5 : 1,
                      fontWeight: 'bold'
                    }}
                    onClick={() => startCampaign(campaign)}
                    disabled={isSending}
                  >
                    ▶️ התחל שליחה
                  </button>
                )}
                
                {campaign.status === 'running' && sendingCampaignId === campaign.id && (
                  <button
                    style={{
                      padding: '8px 16px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                    onClick={() => pauseCampaign(campaign.id)}
                  >
                    ⏸️ השהה
                  </button>
                )}

                {campaign.status === 'paused' && (
                  <button
                    style={{
                      padding: '8px 16px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      cursor: isSending ? 'not-allowed' : 'pointer',
                      opacity: isSending ? 0.5 : 1,
                      fontWeight: 'bold'
                    }}
                    onClick={() => startCampaign(campaign)}
                    disabled={isSending}
                  >
                    ▶️ המשך שליחה
                  </button>
                )}
              </div>
            </div>
          ))}

          {campaigns.length === 0 && (
            <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '40px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'center', color: '#6b7280' }}>
              <p style={{ fontSize: '18px', marginBottom: '10px' }}>אין קמפיינים עדיין</p>
              <p>צור קמפיין חדש כדי להתחיל לשלוח הודעות</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
