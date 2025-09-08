'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// ===============================
// CONSTANTS
// ===============================
const CAMPAIGN_STATUS = {
  DRAFT: 'draft',
  READY: 'ready',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// ===============================
// MAIN COMPONENT
// ===============================
export default function CampaignsNewPage() {
  // State Management
  const [campaigns, setCampaigns] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('create');
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    message: '',
    recipients: '',
    delay: 2000
  });

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    pending: 0
  });

  // Green API Credentials
  const [greenApiCredentials, setGreenApiCredentials] = useState({
    instanceId: '',
    token: ''
  });

  // ===============================
  // INITIALIZATION
  // ===============================
  useEffect(() => {
    loadCampaigns();
    loadGreenApiCredentials();
  }, []);

  const loadGreenApiCredentials = async () => {
    try {
      // נסה לטעון מ-localStorage
      const instanceId = localStorage.getItem('greenApiInstanceId') || localStorage.getItem('greenApiId');
      const token = localStorage.getItem('greenApiToken') || localStorage.getItem('greenApiKey');
      
      if (instanceId && token) {
        setGreenApiCredentials({ instanceId, token });
        addLog('success', 'חיבור ל-WhatsApp פעיל ✓');
      } else {
        // נסה לטעון מטבלת settings אם קיימת
        try {
          const { data, error } = await supabase
            .from('settings')
            .select('*')
            .limit(1)
            .single();
          
          if (data) {
            const id = data.green_api_instance_id || data.greenApiInstanceId || data.instanceId;
            const tk = data.green_api_token || data.greenApiToken || data.token;
            
            if (id && tk) {
              setGreenApiCredentials({ instanceId: id, token: tk });
              localStorage.setItem('greenApiInstanceId', id);
              localStorage.setItem('greenApiToken', tk);
              addLog('success', 'חיבור ל-WhatsApp נטען מההגדרות ✓');
            }
          }
        } catch (settingsError) {
          console.log('No settings table or error loading:', settingsError);
        }
        
        if (!greenApiCredentials.instanceId) {
          addLog('warning', 'חסרים פרטי חיבור ל-WhatsApp - הגדר בדף ההגדרות');
        }
      }
    } catch (error) {
      addLog('error', `שגיאה בטעינת פרטי חיבור: ${error.message}`);
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
        addLog('warning', 'לא ניתן לטעון קמפיינים קיימים');
        return;
      }
      
      if (data && data.length > 0) {
        setCampaigns(data);
        addLog('info', `נטענו ${data.length} קמפיינים`);
      } else {
        addLog('info', 'אין קמפיינים קיימים');
      }
    } catch (error) {
      console.error('Error:', error);
      addLog('error', `שגיאה בטעינת קמפיינים: ${error.message}`);
    }
  };

  // ===============================
  // CAMPAIGN CREATION
  // ===============================
  const createCampaign = async () => {
    try {
      setIsCreating(true);
      addLog('info', 'יוצר קמפיין חדש...');

      if (!formData.name || !formData.message || !formData.recipients) {
        throw new Error('נא למלא את כל השדות הנדרשים');
      }

      const recipientsList = formData.recipients
        .split('\n')
        .map(phone => phone.trim())
        .filter(phone => phone.length > 0);

      if (recipientsList.length === 0) {
        throw new Error('לא נמצאו מספרי טלפון תקינים');
      }

      const campaignData = {
        name: formData.name,
        message: formData.message,
        recipients: recipientsList,
        recipients_count: recipientsList.length,
        sent_count: 0,
        failed_count: 0,
        status: CAMPAIGN_STATUS.READY,
        delay: formData.delay,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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

      addLog('success', `קמפיין "${campaign.name}" נוצר בהצלחה עם ${recipientsList.length} נמענים`);
      setActiveTab('campaigns');
      
    } catch (error) {
      console.error('Create campaign error:', error);
      addLog('error', error.message);
    } finally {
      setIsCreating(false);
    }
  };

  // ===============================
  // CAMPAIGN EXECUTION
  // ===============================
  const startCampaign = async (campaign) => {
    try {
      if (!greenApiCredentials.instanceId || !greenApiCredentials.token) {
        addLog('error', 'חסרים פרטי חיבור ל-WhatsApp. עבור להגדרות להגדרת החיבור.');
        return;
      }

      setIsSending(true);
      addLog('info', `מתחיל שליחת קמפיין: ${campaign.name}`);
      
      await updateCampaignStatus(campaign.id, CAMPAIGN_STATUS.RUNNING);
      
      const recipients = campaign.recipients || [];
      const totalRecipients = recipients.length;
      let sentCount = 0;
      let failedCount = 0;

      setStats({
        total: totalRecipients,
        sent: 0,
        failed: 0,
        pending: totalRecipients
      });

      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        
        // בדוק אם הקמפיין הושהה
        const { data: currentCampaign } = await supabase
          .from('campaigns')
          .select('status')
          .eq('id', campaign.id)
          .single();
        
        if (currentCampaign?.status === CAMPAIGN_STATUS.PAUSED) {
          addLog('warning', 'הקמפיין הושהה');
          break;
        }

        try {
          addLog('info', `שולח הודעה ${i + 1}/${totalRecipients} ל-${recipient}`);
          
          const result = await sendWhatsAppMessage({
            phone: recipient,
            message: campaign.message,
            campaignId: campaign.id
          });

          if (result.success) {
            sentCount++;
            setStats(prev => ({
              ...prev,
              sent: sentCount,
              pending: totalRecipients - sentCount - failedCount
            }));
            addLog('success', `✓ נשלח בהצלחה ל-${recipient}`);
          } else {
            throw new Error(result.error || 'שגיאה בשליחה');
          }

        } catch (error) {
          failedCount++;
          setStats(prev => ({
            ...prev,
            failed: failedCount,
            pending: totalRecipients - sentCount - failedCount
          }));
          addLog('error', `✗ נכשל: ${recipient} - ${error.message}`);
        }

        // עדכן את הקמפיין בדאטהבייס
        await supabase
          .from('campaigns')
          .update({
            sent_count: sentCount,
            failed_count: failedCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', campaign.id);

        // השהייה בין הודעות
        if (i < recipients.length - 1) {
          const delaySeconds = (campaign.delay || 2000) / 1000;
          addLog('info', `ממתין ${delaySeconds} שניות...`);
          await new Promise(resolve => setTimeout(resolve, campaign.delay || 2000));
        }
      }

      const finalStatus = failedCount === totalRecipients 
        ? CAMPAIGN_STATUS.FAILED 
        : CAMPAIGN_STATUS.COMPLETED;
      
      await updateCampaignStatus(campaign.id, finalStatus);
      
      addLog('success', `קמפיין הסתיים: ${sentCount} נשלחו, ${failedCount} נכשלו`);
      await loadCampaigns();

    } catch (error) {
      console.error('Campaign execution error:', error);
      addLog('error', `שגיאה קריטית: ${error.message}`);
      await updateCampaignStatus(campaign.id, CAMPAIGN_STATUS.FAILED);
    } finally {
      setIsSending(false);
      setStats({ total: 0, sent: 0, failed: 0, pending: 0 });
    }
  };

  // ===============================
  // WHATSAPP SENDER
  // ===============================
  const sendWhatsAppMessage = async ({ phone, message, campaignId }) => {
    try {
      const formattedPhone = formatPhoneNumber(phone);
      
      const apiUrl = `https://api.green-api.com/waInstance${greenApiCredentials.instanceId}/sendMessage/${greenApiCredentials.token}`;
      
      const payload = {
        chatId: `${formattedPhone}@c.us`,
        message: message
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      // נסה לשמור לוג (אם הטבלה קיימת)
      try {
        await supabase
          .from('message_logs')
          .insert({
            campaign_id: campaignId,
            phone: formattedPhone,
            status: 'sent',
            message_id: data.idMessage,
            sent_at: new Date().toISOString()
          });
      } catch (logError) {
        console.log('Could not save message log:', logError);
      }

      return { success: true, messageId: data.idMessage };
      
    } catch (error) {
      // נסה לשמור לוג כישלון
      try {
        await supabase
          .from('message_logs')
          .insert({
            campaign_id: campaignId,
            phone: phone,
            status: 'failed',
            error: error.message,
            sent_at: new Date().toISOString()
          });
      } catch (logError) {
        console.log('Could not save error log:', logError);
      }

      return { success: false, error: error.message };
    }
  };

  // ===============================
  // HELPER FUNCTIONS
  // ===============================
  const formatPhoneNumber = (phone) => {
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('0')) {
      cleaned = '972' + cleaned.substring(1);
    } else if (!cleaned.startsWith('972')) {
      cleaned = '972' + cleaned;
    }
    
    return cleaned;
  };

  const updateCampaignStatus = async (campaignId, status) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ 
          status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', campaignId);

      if (error) throw error;

      setCampaigns(prev => prev.map(c => 
        c.id === campaignId ? { ...c, status } : c
      ));
    } catch (error) {
      console.error('Update status error:', error);
      addLog('error', `שגיאה בעדכון סטטוס: ${error.message}`);
    }
  };

  const pauseCampaign = async (campaignId) => {
    await updateCampaignStatus(campaignId, CAMPAIGN_STATUS.PAUSED);
    addLog('warning', 'הקמפיין הושהה');
  };

  const resumeCampaign = async (campaign) => {
    await startCampaign(campaign);
  };

  const addLog = (type, message) => {
    const logEntry = {
      id: Date.now(),
      type,
      message,
      timestamp: new Date().toLocaleTimeString('he-IL')
    };
    setLogs(prev => [logEntry, ...prev].slice(0, 100));
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      [CAMPAIGN_STATUS.DRAFT]: { label: 'טיוטה', color: 'gray' },
      [CAMPAIGN_STATUS.READY]: { label: 'מוכן', color: 'blue' },
      [CAMPAIGN_STATUS.RUNNING]: { label: 'רץ', color: 'green' },
      [CAMPAIGN_STATUS.PAUSED]: { label: 'מושהה', color: 'yellow' },
      [CAMPAIGN_STATUS.COMPLETED]: { label: 'הושלם', color: 'green' },
      [CAMPAIGN_STATUS.FAILED]: { label: 'נכשל', color: 'red' }
    };

    const config = statusConfig[status] || { label: status, color: 'gray' };
    const colorClasses = {
      gray: 'bg-gray-500',
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      red: 'bg-red-500'
    };
    
    return (
      <span className={`${colorClasses[config.color]} text-white px-2 py-1 rounded text-xs`}>
        {config.label}
      </span>
    );
  };

  // ===============================
  // STYLES
  // ===============================
  const styles = {
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    tabs: {
      display: 'flex',
      gap: '10px',
      marginBottom: '20px',
      borderBottom: '2px solid #e5e5e5'
    },
    tab: {
      padding: '10px 20px',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: '16px',
      borderBottom: '2px solid transparent',
      marginBottom: '-2px'
    },
    tabActive: {
      borderBottomColor: '#10b981',
      color: '#10b981',
      fontWeight: 'bold'
    },
    formGroup: {
      marginBottom: '15px'
    },
    label: {
      display: 'block',
      marginBottom: '5px',
      fontWeight: 'bold',
      fontSize: '14px'
    },
    input: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px'
    },
    textarea: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
      resize: 'vertical'
    },
    button: {
      padding: '10px 20px',
      borderRadius: '4px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 'bold',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px'
    },
    buttonPrimary: {
      backgroundColor: '#10b981',
      color: 'white'
    },
    buttonSecondary: {
      backgroundColor: '#f3f4f6',
      color: '#374151'
    },
    buttonDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed'
    },
    stats: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '15px',
      marginBottom: '20px'
    },
    statCard: {
      textAlign: 'center',
      padding: '15px',
      backgroundColor: '#f9fafb',
      borderRadius: '8px'
    },
    logContainer: {
      maxHeight: '400px',
      overflowY: 'auto',
      fontSize: '13px'
    },
    logEntry: {
      display: 'flex',
      gap: '10px',
      padding: '5px 0',
      borderBottom: '1px solid #f3f4f6'
    }
  };

  // ===============================
  // RENDER
  // ===============================
  return (
    <div style={styles.container} dir="rtl">
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '10px' }}>
          מנהל קמפיינים חדש
        </h1>
        <p style={{ color: '#6b7280' }}>ניהול ושליחת קמפיינים ב-WhatsApp</p>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'create' ? styles.tabActive : {})
          }}
          onClick={() => setActiveTab('create')}
        >
          יצירת קמפיין
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'campaigns' ? styles.tabActive : {})
          }}
          onClick={() => setActiveTab('campaigns')}
        >
          קמפיינים ({campaigns.length})
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'logs' ? styles.tabActive : {})
          }}
          onClick={() => setActiveTab('logs')}
        >
          לוגים
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'create' && (
        <div style={styles.card}>
          <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>יצירת קמפיין חדש</h2>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>שם הקמפיין</label>
            <input
              style={styles.input}
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="לדוגמה: מבצע חורף 2024"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>תוכן ההודעה</label>
            <textarea
              style={styles.textarea}
              rows={5}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="הקלד את תוכן ההודעה כאן..."
            />
            <small style={{ color: '#6b7280' }}>{formData.message.length} תווים</small>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>רשימת נמענים</label>
            <textarea
              style={styles.textarea}
              rows={5}
              value={formData.recipients}
              onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
              placeholder="הכנס מספר טלפון בכל שורה&#10;0501234567&#10;0521234567"
            />
            <small style={{ color: '#6b7280' }}>
              {formData.recipients.split('\n').filter(p => p.trim()).length} מספרים
            </small>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>השהייה בין הודעות (מילישניות)</label>
            <input
              style={styles.input}
              type="number"
              value={formData.delay}
              onChange={(e) => setFormData({ ...formData, delay: parseInt(e.target.value) || 2000 })}
              min="1000"
              step="500"
            />
            <small style={{ color: '#6b7280' }}>
              {formData.delay / 1000} שניות בין הודעה להודעה
            </small>
          </div>

          <button
            style={{
              ...styles.button,
              ...styles.buttonPrimary,
              ...(isCreating ? styles.buttonDisabled : {}),
              width: '100%'
            }}
            onClick={createCampaign}
            disabled={isCreating}
          >
            {isCreating ? '⏳ יוצר קמפיין...' : '📤 צור קמפיין'}
          </button>
        </div>
      )}

      {activeTab === 'campaigns' && (
        <div>
          {stats.total > 0 && (
            <div style={styles.stats}>
              <div style={styles.statCard}>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.total}</div>
                <div style={{ color: '#6b7280', fontSize: '12px' }}>סה"כ</div>
              </div>
              <div style={styles.statCard}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{stats.sent}</div>
                <div style={{ color: '#6b7280', fontSize: '12px' }}>נשלחו</div>
              </div>
              <div style={styles.statCard}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{stats.pending}</div>
                <div style={{ color: '#6b7280', fontSize: '12px' }}>ממתינים</div>
              </div>
              <div style={styles.statCard}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{stats.failed}</div>
                <div style={{ color: '#6b7280', fontSize: '12px' }}>נכשלו</div>
              </div>
            </div>
          )}

          {campaigns.map(campaign => (
            <div key={campaign.id} style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>{campaign.name}</h3>
                  <p style={{ color: '#6b7280', fontSize: '12px' }}>
                    נוצר: {new Date(campaign.created_at).toLocaleString('he-IL')}
                  </p>
                </div>
                {getStatusBadge(campaign.status)}
              </div>

              <div style={{ display: 'flex', gap: '20px', marginBottom: '15px', fontSize: '14px' }}>
                <span>נמענים: {campaign.recipients_count}</span>
                <span>נשלחו: {campaign.sent_count || 0}</span>
                <span>נכשלו: {campaign.failed_count || 0}</span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                {campaign.status === CAMPAIGN_STATUS.READY && (
                  <button
                    style={{
                      ...styles.button,
                      ...styles.buttonPrimary,
                      ...(isSending ? styles.buttonDisabled : {})
                    }}
                    onClick={() => startCampaign(campaign)}
                    disabled={isSending}
                  >
                    ▶️ התחל שליחה
                  </button>
                )}
                
                {campaign.status === CAMPAIGN_STATUS.RUNNING && (
                  <button
                    style={{
                      ...styles.button,
                      ...styles.buttonSecondary
                    }}
                    onClick={() => pauseCampaign(campaign.id)}
                  >
                    ⏸️ השהה
                  </button>
                )}
                
                {campaign.status === CAMPAIGN_STATUS.PAUSED && (
                  <button
                    style={{
                      ...styles.button,
                      ...styles.buttonPrimary,
                      ...(isSending ? styles.buttonDisabled : {})
                    }}
                    onClick={() => resumeCampaign(campaign)}
                    disabled={isSending}
                  >
                    ▶️ המשך
                  </button>
                )}
                
                {campaign.status === CAMPAIGN_STATUS.COMPLETED && (
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                    ✅ הושלם בהצלחה
                  </span>
                )}
              </div>
            </div>
          ))}

          {campaigns.length === 0 && (
            <div style={styles.card}>
              <p style={{ textAlign: 'center', color: '#6b7280' }}>
                אין קמפיינים. צור קמפיין חדש כדי להתחיל.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'logs' && (
        <div style={styles.card}>
          <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>לוג פעילות</h2>
          
          <div style={styles.logContainer}>
            {logs.map(log => (
              <div key={log.id} style={styles.logEntry}>
                <span style={{ color: '#6b7280' }}>{log.timestamp}</span>
                <span>
                  {log.type === 'success' && '✅'}
                  {log.type === 'error' && '❌'}
                  {log.type === 'warning' && '⚠️'}
                  {log.type === 'info' && 'ℹ️'}
                </span>
                <span style={{
                  color: log.type === 'error' ? '#ef4444' :
                         log.type === 'success' ? '#10b981' :
                         log.type === 'warning' ? '#f59e0b' :
                         '#374151'
                }}>
                  {log.message}
                </span>
              </div>
            ))}
            
            {logs.length === 0 && (
              <p style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
                אין פעילות עדיין
              </p>
            )}
          </div>
          
          {logs.length > 0 && (
            <button
              style={{
                ...styles.button,
                ...styles.buttonSecondary,
                marginTop: '15px',
                width: '100%'
              }}
              onClick={() => setLogs([])}
            >
              🗑️ נקה לוג
            </button>
          )}
        </div>
      )}
    </div>
  );
}
