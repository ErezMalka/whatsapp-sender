// app/campaigns-new.jsx
'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Pause, 
  Send, 
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

// ===============================
// 1. CONSTANTS
// ===============================
const CAMPAIGN_STATUS = {
  DRAFT: 'draft',
  READY: 'ready',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

const MESSAGE_STATUS = {
  PENDING: 'pending',
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed'
};

// ===============================
// 2. MAIN COMPONENT
// ===============================
export default function CampaignsNew() {
  const supabase = createClientComponentClient();
  
  // State Management
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [logs, setLogs] = useState([]);
  
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
  // 3. INITIALIZATION
  // ===============================
  useEffect(() => {
    loadCampaigns();
    loadGreenApiCredentials();
  }, []);

  const loadGreenApiCredentials = async () => {
    try {
      // נסה לטעון מ-localStorage
      const instanceId = localStorage.getItem('greenApiInstanceId');
      const token = localStorage.getItem('greenApiToken');
      
      if (instanceId && token) {
        setGreenApiCredentials({ instanceId, token });
        addLog('success', 'חיבור ל-WhatsApp פעיל ✓');
      } else {
        // נסה לטעון מטבלת settings בסופהבייס
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .single();
        
        if (data?.green_api_instance_id && data?.green_api_token) {
          setGreenApiCredentials({
            instanceId: data.green_api_instance_id,
            token: data.green_api_token
          });
          // שמור ב-localStorage לפעם הבאה
          localStorage.setItem('greenApiInstanceId', data.green_api_instance_id);
          localStorage.setItem('greenApiToken', data.green_api_token);
          addLog('success', 'חיבור ל-WhatsApp פעיל ✓');
        } else {
          addLog('error', 'חסרים פרטי חיבור ל-WhatsApp');
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
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setCampaigns(data);
        addLog('info', `נטענו ${data.length} קמפיינים`);
      }
    } catch (error) {
      addLog('error', `שגיאה בטעינת קמפיינים: ${error.message}`);
    }
  };

  // ===============================
  // 4. CAMPAIGN CREATION
  // ===============================
  const createCampaign = async () => {
    try {
      setIsCreating(true);
      addLog('info', 'יוצר קמפיין חדש...');

      // Validate
      if (!formData.name || !formData.message || !formData.recipients) {
        throw new Error('נא למלא את כל השדות הנדרשים');
      }

      // Parse recipients
      const recipientsList = formData.recipients
        .split('\n')
        .map(phone => phone.trim())
        .filter(phone => phone.length > 0);

      if (recipientsList.length === 0) {
        throw new Error('לא נמצאו מספרי טלפון תקינים');
      }

      // Create campaign
      const campaignData = {
        name: formData.name,
        message: formData.message,
        recipients: recipientsList,
        recipients_count: recipientsList.length,
        sent_count: 0,
        failed_count: 0,
        status: CAMPAIGN_STATUS.READY,
        delay: formData.delay
      };

      // Save to Supabase
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .insert(campaignData)
        .select()
        .single();

      if (error) throw error;

      setCampaigns([campaign, ...campaigns]);
      setSelectedCampaign(campaign);
      
      // Reset form
      setFormData({
        name: '',
        message: '',
        recipients: '',
        delay: 2000
      });

      addLog('success', `קמפיין "${campaign.name}" נוצר בהצלחה עם ${recipientsList.length} נמענים`);
      
    } catch (error) {
      addLog('error', error.message);
    } finally {
      setIsCreating(false);
    }
  };

  // ===============================
  // 5. CAMPAIGN EXECUTION
  // ===============================
  const startCampaign = async (campaign) => {
    try {
      setIsSending(true);
      addLog('info', `מתחיל שליחת קמפיין: ${campaign.name}`);
      
      // Update status to running
      await updateCampaignStatus(campaign.id, CAMPAIGN_STATUS.RUNNING);
      
      const recipients = campaign.recipients;
      const totalRecipients = recipients.length;
      let sentCount = 0;
      let failedCount = 0;

      // Update stats
      setStats({
        total: totalRecipients,
        sent: 0,
        failed: 0,
        pending: totalRecipients
      });

      // Send messages one by one
      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        
        // Check if campaign was paused
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
          
          // Send message
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

        // Update campaign counters in database
        await supabase
          .from('campaigns')
          .update({
            sent_count: sentCount,
            failed_count: failedCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', campaign.id);

        // Delay between messages
        if (i < recipients.length - 1) {
          addLog('info', `ממתין ${campaign.delay / 1000} שניות...`);
          await new Promise(resolve => setTimeout(resolve, campaign.delay));
        }
      }

      // Update final status
      const finalStatus = failedCount === totalRecipients 
        ? CAMPAIGN_STATUS.FAILED 
        : CAMPAIGN_STATUS.COMPLETED;
      
      await updateCampaignStatus(campaign.id, finalStatus);
      
      addLog('success', `קמפיין הסתיים: ${sentCount} נשלחו, ${failedCount} נכשלו`);

      // Reload campaigns to show updated data
      await loadCampaigns();

    } catch (error) {
      addLog('error', `שגיאה קריטית: ${error.message}`);
      await updateCampaignStatus(campaign.id, CAMPAIGN_STATUS.FAILED);
    } finally {
      setIsSending(false);
    }
  };

  // ===============================
  // 6. WHATSAPP SENDER
  // ===============================
  const sendWhatsAppMessage = async ({ phone, message, campaignId }) => {
    try {
      // Format phone number
      const formattedPhone = formatPhoneNumber(phone);
      
      // Check credentials
      if (!greenApiCredentials.instanceId || !greenApiCredentials.token) {
        throw new Error('חסרים פרטי חיבור ל-Green API');
      }

      // Send via Green API
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
        throw new Error(`שגיאת API: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Log to database
      await supabase
        .from('message_logs')
        .insert({
          campaign_id: campaignId,
          phone: formattedPhone,
          status: MESSAGE_STATUS.SENT,
          message_id: data.idMessage,
          sent_at: new Date().toISOString()
        });

      return { success: true, messageId: data.idMessage };
      
    } catch (error) {
      // Log failure
      await supabase
        .from('message_logs')
        .insert({
          campaign_id: campaignId,
          phone: phone,
          status: MESSAGE_STATUS.FAILED,
          error: error.message,
          sent_at: new Date().toISOString()
        });

      return { success: false, error: error.message };
    }
  };

  // ===============================
  // 7. HELPER FUNCTIONS
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

  // ===============================
  // 8. UI HELPERS
  // ===============================
  const getStatusBadge = (status) => {
    const statusConfig = {
      [CAMPAIGN_STATUS.DRAFT]: { label: 'טיוטה', className: 'bg-gray-500' },
      [CAMPAIGN_STATUS.READY]: { label: 'מוכן', className: 'bg-blue-500' },
      [CAMPAIGN_STATUS.RUNNING]: { label: 'רץ', className: 'bg-green-500' },
      [CAMPAIGN_STATUS.PAUSED]: { label: 'מושהה', className: 'bg-yellow-500' },
      [CAMPAIGN_STATUS.COMPLETED]: { label: 'הושלם', className: 'bg-green-600' },
      [CAMPAIGN_STATUS.FAILED]: { label: 'נכשל', className: 'bg-red-500' }
    };

    const config = statusConfig[status] || { label: status, className: 'bg-gray-500' };
    
    return (
      <Badge className={`${config.className} text-white`}>
        {config.label}
      </Badge>
    );
  };

  const getLogIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <AlertCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  // ===============================
  // 9. RENDER
  // ===============================
  return (
    <div className="container mx-auto p-6 max-w-7xl" dir="rtl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">מנהל קמפיינים חדש</h1>
        <p className="text-gray-600">ניהול ושליחת קמפיינים ב-WhatsApp</p>
      </div>

      <Tabs defaultValue="create" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="create">יצירת קמפיין</TabsTrigger>
          <TabsTrigger value="campaigns">קמפיינים</TabsTrigger>
          <TabsTrigger value="logs">לוגים</TabsTrigger>
        </TabsList>

        {/* TAB 1: CREATE CAMPAIGN */}
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>יצירת קמפיין חדש</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">שם הקמפיין</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="לדוגמה: מבצע חורף 2024"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">תוכן ההודעה</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="הקלד את תוכן ההודעה כאן..."
                  rows={5}
                />
                <p className="text-sm text-gray-500">
                  {formData.message.length} תווים
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipients">רשימת נמענים</Label>
                <Textarea
                  id="recipients"
                  value={formData.recipients}
                  onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                  placeholder="הכנס מספר טלפון בכל שורה&#10;0501234567&#10;0521234567"
                  rows={5}
                />
                <p className="text-sm text-gray-500">
                  {formData.recipients.split('\n').filter(p => p.trim()).length} מספרים
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delay">השהייה בין הודעות (מילישניות)</Label>
                <Input
                  id="delay"
                  type="number"
                  value={formData.delay}
                  onChange={(e) => setFormData({ ...formData, delay: parseInt(e.target.value) || 2000 })}
                  min="1000"
                  step="500"
                />
                <p className="text-sm text-gray-500">
                  {formData.delay / 1000} שניות בין הודעה להודעה
                </p>
              </div>

              <Button 
                onClick={createCampaign} 
                disabled={isCreating}
                className="w-full"
              >
                {isCreating ? (
                  <>
                    <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                    יוצר קמפיין...
                  </>
                ) : (
                  <>
                    <Send className="ml-2 h-4 w-4" />
                    צור קמפיין
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: CAMPAIGNS LIST */}
        <TabsContent value="campaigns">
          <div className="grid gap-4">
            {/* Statistics */}
            {stats.total > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>סטטיסטיקות נוכחיות</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{stats.total}</p>
                      <p className="text-sm text-gray-500">סה"כ</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-500">{stats.sent}</p>
                      <p className="text-sm text-gray-500">נשלחו</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
                      <p className="text-sm text-gray-500">ממתינים</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-500">{stats.failed}</p>
                      <p className="text-sm text-gray-500">נכשלו</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Campaigns List */}
            {campaigns.map(campaign => (
              <Card key={campaign.id}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <p className="text-sm text-gray-500">
                        נוצר: {new Date(campaign.created_at).toLocaleString('he-IL')}
                      </p>
                    </div>
                    {getStatusBadge(campaign.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>נמענים: {campaign.recipients_count}</span>
                      <span>נשלחו: {campaign.sent_count || 0}</span>
                      <span>נכשלו: {campaign.failed_count || 0}</span>
                    </div>
                    
                    <div className="flex gap-2">
                      {campaign.status === CAMPAIGN_STATUS.READY && (
                        <Button
                          onClick={() => startCampaign(campaign)}
                          disabled={isSending}
                          size="sm"
                          className="flex-1"
                        >
                          <Play className="ml-2 h-4 w-4" />
                          התחל שליחה
                        </Button>
                      )}
                      
                      {campaign.status === CAMPAIGN_STATUS.RUNNING && (
                        <Button
                          onClick={() => pauseCampaign(campaign.id)}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <Pause className="ml-2 h-4 w-4" />
                          השהה
                        </Button>
                      )}
                      
                      {campaign.status === CAMPAIGN_STATUS.PAUSED && (
                        <Button
                          onClick={() => resumeCampaign(campaign)}
                          disabled={isSending}
                          size="sm"
                          className="flex-1"
                        >
                          <Play className="ml-2 h-4 w-4" />
                          המשך
                        </Button>
                      )}
                      
                      {campaign.status === CAMPAIGN_STATUS.COMPLETED && (
                        <Badge variant="success" className="flex-1 justify-center bg-green-600 text-white">
                          הושלם בהצלחה
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {campaigns.length === 0 && (
              <Alert>
                <AlertDescription>
                  אין קמפיינים. צור קמפיין חדש כדי להתחיל.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </TabsContent>

        {/* TAB 3: LOGS */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>לוג פעילות</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.map(log => (
                  <div key={log.id} className="flex items-start gap-2 text-sm">
                    {getLogIcon(log.type)}
                    <span className="text-gray-500">{log.timestamp}</span>
                    <span className={`flex-1 ${
                      log.type === 'error' ? 'text-red-600' :
                      log.type === 'success' ? 'text-green-600' :
                      log.type === 'warning' ? 'text-yellow-600' :
                      'text-gray-700'
                    }`}>
                      {log.message}
                    </span>
                  </div>
                ))}
                
                {logs.length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    אין פעילות עדיין
                  </p>
                )}
              </div>
              
              {logs.length > 0 && (
                <Button
                  onClick={() => setLogs([])}
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full"
                >
                  נקה לוג
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
