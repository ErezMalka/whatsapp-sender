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
  scheduled_for?: string;
  target_type?: string;
  target_tags?: string[];
  created_at: string;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  tags?: string[];
  group?: string;
}

export default function CampaignsNewPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('create');
  
  const [formData, setFormData] = useState({
    name: '',
    message: '',
    recipients: '',
    delay: 30,
    scheduled_for: '',
    target_type: 'all', // all, manual, tags, groups
    selected_tags: [] as string[],
    selected_groups: [] as string[]
  });

  useEffect(() => {
    loadCampaigns();
    loadContacts();
  }, []);

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
        
        // Extract unique tags and groups
        const tags = new Set<string>();
        const groups = new Set<string>();
        
        data.forEach((contact: Contact) => {
          if (contact.tags) {
            contact.tags.forEach(tag => tags.add(tag));
          }
          if (contact.group) {
            groups.add(contact.group);
          }
        });
        
        setAvailableTags(Array.from(tags));
        setAvailableGroups(Array.from(groups));
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
      
      case 'groups':
        targetContacts = contacts.filter(contact => 
          contact.group && formData.selected_groups.includes(contact.group)
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

      const campaignData: any = {
        name: formData.name,
        message: formData.message,
        recipients: recipientsList,
        recipients_count: recipientsList.length,
        sent_count: 0,
        failed_count: 0,
        status: 'ready',
        delay: formData.delay * 1000, // Convert to milliseconds
      };

      // Add optional fields if they exist
      if (formData.scheduled_for) {
        campaignData.scheduled_for = formData.scheduled_for;
        campaignData.status = 'scheduled';
      }

      if (formData.target_type !== 'all') {
        campaignData.target_type = formData.target_type;
        if (formData.target_type === 'tags') {
          campaignData.target_tags = formData.selected_tags;
        } else if (formData.target_type === 'groups') {
          campaignData.target_groups = formData.selected_groups;
        }
      }

      const { data: campaign, error } = await supabase
        .from('campaigns')
        .insert([campaignData])
        .select()
        .single();

      if (error) throw error;

      setCampaigns([campaign as Campaign, ...campaigns]);
      
      // Reset form
      setFormData({
        name: '',
        message: '',
        recipients: '',
        delay: 30,
        scheduled_for: '',
        target_type: 'all',
        selected_tags: [],
        selected_groups: []
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

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }} dir="rtl">
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '20px' }}>
        מנהל קמפיינים מתקדם
      </h1>

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

      {activeTab === 'create' && (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>יצירת קמפיין חדש</h2>
          
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

          {/* Target Type Selection */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>קהל יעד</label>
            <select
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
              value={formData.target_type}
              onChange={(e) => setFormData({ ...formData, target_type: e.target.value })}
            >
              <option value="all">כל אנשי הקשר ({contacts.length})</option>
              <option value="tags">לפי תגיות</option>
              <option value="groups">לפי קבוצות</option>
              <option value="manual">הזנה ידנית</option>
            </select>
          </div>

          {/* Tags Selection */}
          {formData.target_type === 'tags' && availableTags.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>בחר תגיות</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
                {availableTags.map(tag => (
                  <label key={tag} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
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
              <small style={{ color: '#6b7280' }}>
                {contacts.filter(c => c.tags?.some(t => formData.selected_tags.includes(t))).length} אנשי קשר נבחרו
              </small>
            </div>
          )}

          {/* Groups Selection */}
          {formData.target_type === 'groups' && availableGroups.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>בחר קבוצות</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
                {availableGroups.map(group => (
                  <label key={group} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input
                      type="checkbox"
                      checked={formData.selected_groups.includes(group)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, selected_groups: [...formData.selected_groups, group] });
                        } else {
                          setFormData({ ...formData, selected_groups: formData.selected_groups.filter(g => g !== group) });
                        }
                      }}
                    />
                    <span>{group}</span>
                  </label>
                ))}
              </div>
              <small style={{ color: '#6b7280' }}>
                {contacts.filter(c => c.group && formData.selected_groups.includes(c.group)).length} אנשי קשר נבחרו
              </small>
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
              <small style={{ color: '#6b7280' }}>
                {formData.recipients.split('\n').filter(p => p.trim()).length} מספרים
              </small>
            </div>
          )}

          {/* Delay */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>קצב שליחה (שניות בין הודעה להודעה)</label>
            <input
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
              type="number"
              min="1"
              max="300"
              value={formData.delay}
              onChange={(e) => setFormData({ ...formData, delay: parseInt(e.target.value) || 30 })}
            />
            <small style={{ color: '#6b7280' }}>המתנה של {formData.delay} שניות בין כל הודעה</small>
          </div>

          {/* Schedule */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>תזמון שליחה (אופציונלי)</label>
            <input
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
              type="datetime-local"
              value={formData.scheduled_for}
              onChange={(e) => setFormData({ ...formData, scheduled_for: e.target.value })}
            />
            <small style={{ color: '#6b7280' }}>השאר ריק לשליחה מיידית</small>
          </div>

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
            {isCreating ? 'יוצר קמפיין...' : 'צור קמפיין'}
          </button>
        </div>
      )}

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
                  {campaign.scheduled_for && (
                    <p style={{ color: '#3b82f6', fontSize: '12px' }}>
                      מתוזמן ל: {new Date(campaign.scheduled_for).toLocaleString('he-IL')}
                    </p>
                  )}
                </div>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  backgroundColor: campaign.status === 'ready' ? '#dcfce7' : 
                                 campaign.status === 'scheduled' ? '#dbeafe' :
                                 campaign.status === 'completed' ? '#f3f4f6' : '#fef3c7',
                  color: campaign.status === 'ready' ? '#166534' :
                         campaign.status === 'scheduled' ? '#1e40af' :
                         campaign.status === 'completed' ? '#374151' : '#92400e'
                }}>
                  {campaign.status === 'ready' ? 'מוכן' :
                   campaign.status === 'scheduled' ? 'מתוזמן' :
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
                <span>⏱️ קצב: {Math.round((campaign.delay || 2000) / 1000)} שניות</span>
              </div>
            </div>
          ))}

          {campaigns.length === 0 && (
            <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '40px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'center', color: '#6b7280' }}>
              אין קמפיינים. צור קמפיין חדש כדי להתחיל.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
