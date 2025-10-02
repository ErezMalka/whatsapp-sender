'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function CampaignsNewPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('create');
  
  const [formData, setFormData] = useState({
    name: '',
    message: '',
    recipients: '',
    delay: 2000
  });

  useEffect(() => {
    loadCampaigns();
  }, []);

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
        setCampaigns(data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const createCampaign = async () => {
    try {
      setIsCreating(true);

      if (!formData.name || !formData.message || !formData.recipients) {
        alert('נא למלא את כל השדות');
        return;
      }

      const recipientsList = formData.recipients
        .split('\n')
        .map(phone => phone.trim())
        .filter(phone => phone.length > 0);

      if (recipientsList.length === 0) {
        alert('לא נמצאו מספרי טלפון');
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
        delay: formData.delay
      };

      const { data: campaign, error } = await supabase
        .from('campaigns')
        .insert([campaignData])
        .select()
        .single();

      if (error) throw error;

      setCampaigns([campaign, ...campaigns]);
      setFormData({
        name: '',
        message: '',
        recipients: '',
        delay: 2000
      });

      alert(`קמפיין נוצר בהצלחה עם ${recipientsList.length} נמענים`);
      setActiveTab('campaigns');
      
    } catch (error) {
      console.error('Create campaign error:', error);
      alert('שגיאה: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }} dir="rtl">
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '20px' }}>
        מנהל קמפיינים
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
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical' }}
              rows={5}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="הקלד את תוכן ההודעה כאן..."
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>רשימת נמענים</label>
            <textarea
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical' }}
              rows={5}
              value={formData.recipients}
              onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
              placeholder="הכנס מספר טלפון בכל שורה"
            />
            <small style={{ color: '#6b7280' }}>
              {formData.recipients.split('\n').filter(p => p.trim()).length} מספרים
            </small>
          </div>

          <button
            style={{
              width: '100%',
              padding: '10px 20px',
              borderRadius: '4px',
              border: 'none',
              cursor: isCreating ? 'not-allowed' : 'pointer',
              fontSize: '14px',
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
              <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>{campaign.name}</h3>
              <p style={{ color: '#6b7280', fontSize: '12px' }}>
                נוצר: {new Date(campaign.created_at).toLocaleString('he-IL')}
              </p>
              <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                <span>נמענים: {campaign.recipients_count}</span>
                <span>נשלחו: {campaign.sent_count || 0}</span>
                <span>נכשלו: {campaign.failed_count || 0}</span>
              </div>
            </div>
          ))}

          {campaigns.length === 0 && (
            <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'center', color: '#6b7280' }}>
              אין קמפיינים. צור קמפיין חדש כדי להתחיל.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
