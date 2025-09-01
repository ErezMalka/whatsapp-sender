// app/admin/campaigns/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: string;
  target_type: string;
  target_tags: string[];
  estimated_recipients: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  scheduled_at?: string;
  created_at: string;
  completed_at?: string;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  tags: string[];
}

interface Template {
  id: string;
  name: string;
  content: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'scheduled' | 'completed'>('active');
  
  // Form state for new campaign
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    template_id: '',
    message_content: '',
    target_type: 'all' as 'all' | 'tags' | 'specific',
    target_tags: [] as string[],
    target_contacts: [] as string[],
    send_type: 'immediate' as 'immediate' | 'scheduled',
    scheduled_at: '',
    batch_size: 50,
    delay_between_messages: 1000
  });

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    scheduled: 0,
    completed: 0,
    totalSent: 0
  });

  // Load data
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (campaignsError) throw campaignsError;
      setCampaigns(campaignsData || []);
      
      // Calculate statistics
      const total = campaignsData?.length || 0;
      const active = campaignsData?.filter(c => c.status === 'running').length || 0;
      const scheduled = campaignsData?.filter(c => c.status === 'scheduled').length || 0;
      const completed = campaignsData?.filter(c => c.status === 'completed').length || 0;
      const totalSent = campaignsData?.reduce((sum, c) => sum + (c.sent_count || 0), 0) || 0;
      
      setStats({ total, active, scheduled, completed, totalSent });
      
      // Load contacts for targeting
      const { data: contactsData } = await supabase
        .from('contacts')
        .select('id, name, phone, tags')
        .eq('status', 'active')
        .eq('opt_out', false);
      
      setContacts(contactsData || []);
      
      // Extract unique tags
      const allTags = new Set<string>();
      contactsData?.forEach(contact => {
        contact.tags?.forEach(tag => allTags.add(tag));
      });
      setTags(Array.from(allTags));
      
      // Load templates
      const { data: templatesData } = await supabase
        .from('templates')
        .select('*')
        .order('name');
      
      setTemplates(templatesData || []);
      
    } catch (error) {
      console.error('Error loading data:', error);
      // Set demo data if error
      setCampaigns([
        {
          id: '1',
          name: 'קמפיין ברכות לחג',
          description: 'שליחת ברכות לכל הלקוחות',
          status: 'draft',
          target_type: 'tags',
          target_tags: ['לקוחות'],
          estimated_recipients: 6,
          sent_count: 0,
          delivered_count: 0,
          failed_count: 0,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'מבצע סוף עונה',
          description: 'הודעה על מבצע מיוחד',
          status: 'completed',
          target_type: 'tags',
          target_tags: ['VIP'],
          estimated_recipients: 2,
          sent_count: 2,
          delivered_count: 2,
          failed_count: 0,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          completed_at: new Date().toISOString()
        }
      ]);
      setTags(['לקוחות', 'VIP', 'חדשים', 'ספקים']);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Create new campaign
  const handleCreateCampaign = async () => {
    if (!newCampaign.name || !newCampaign.message_content) {
      alert('נא למלא שם קמפיין ותוכן הודעה');
      return;
    }

    try {
      // Calculate estimated recipients
      let estimatedRecipients = 0;
      if (newCampaign.target_type === 'all') {
        estimatedRecipients = contacts.length;
      } else if (newCampaign.target_type === 'tags') {
        estimatedRecipients = contacts.filter(c => 
          c.tags?.some(tag => newCampaign.target_tags.includes(tag))
        ).length;
      } else if (newCampaign.target_type === 'specific') {
        estimatedRecipients = newCampaign.target_contacts.length;
      }

      // Prepare data for insertion - remove empty strings that should be null
      const campaignData = {
        name: newCampaign.name,
        description: newCampaign.description || null,
        message_content: newCampaign.message_content,
        template_id: newCampaign.template_id || null, // Convert empty string to null
        target_type: newCampaign.target_type,
        target_tags: newCampaign.target_tags.length > 0 ? newCampaign.target_tags : null,
        target_contacts: newCampaign.target_contacts.length > 0 ? newCampaign.target_contacts : null,
        send_type: newCampaign.send_type,
        scheduled_at: newCampaign.scheduled_at || null,
        batch_size: newCampaign.batch_size,
        delay_between_messages: newCampaign.delay_between_messages,
        tenant_id: '00000000-0000-0000-0000-000000000001',
        estimated_recipients: estimatedRecipients,
        status: newCampaign.send_type === 'scheduled' ? 'scheduled' : 'draft'
      };

      const { error } = await supabase
        .from('campaigns')
        .insert([campaignData]);
      
      if (error) throw error;
      
      setShowCreateModal(false);
      resetForm();
      loadData();
      alert('הקמפיין נוצר בהצלחה!');
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('שגיאה ביצירת קמפיין');
    }
  };

  // Start campaign - Fixed version
  const startCampaign = async (campaignId: string) => {
    if (!confirm('האם להתחיל את הקמפיין? ההודעות ישלחו לכל המקבלים שנבחרו.')) return;
    
    try {
      // Get campaign details
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError || !campaign) {
        throw new Error('Campaign not found');
      }

      // Update campaign status to running
      await supabase
        .from('campaigns')
        .update({ 
          status: 'running',
          started_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      alert('הקמפיין התחיל! ההודעות ישלחו בהדרגה...');
      
      // Get ALL contacts (not just from state)
      const { data: allContacts } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', '00000000-0000-0000-0000-000000000001')
        .eq('status', 'active')
        .eq('opt_out', false);

      if (!allContacts || allContacts.length === 0) {
        throw new Error('לא נמצאו אנשי קשר פעילים');
      }

      // Filter contacts based on campaign target
      let targetContacts = [];
      
      if (campaign.target_type === 'all') {
        targetContacts = allContacts;
      } else if (campaign.target_type === 'tags' && campaign.target_tags?.length > 0) {
        targetContacts = allContacts.filter(c => 
          c.tags && c.tags.some(tag => campaign.target_tags.includes(tag))
        );
      } else if (campaign.target_type === 'specific' && campaign.target_contacts?.length > 0) {
        targetContacts = allContacts.filter(c => 
          campaign.target_contacts.includes(c.id)
        );
      }

      console.log(`Found ${targetContacts.length} contacts to send to`);
      
      if (targetContacts.length === 0) {
        throw new Error('לא נמצאו אנשי קשר מתאימים לקריטריונים');
      }

      // Send messages
      let sentCount = 0;
      let failedCount = 0;
      const failedContacts = [];
      
      for (const contact of targetContacts) {
        try {
          // Personalize message
          let personalizedMessage = campaign.message_content;
          personalizedMessage = personalizedMessage.replace(/\{\{name\}\}/g, contact.name || '');
          personalizedMessage = personalizedMessage.replace(/\{\{phone\}\}/g, contact.phone || '');
          
          // Add opt-out text (without URL for now - will add when deployed)
          const optOutText = `\n\n❌ להסרה מרשימת התפוצה, השב "הסר" או "stop"`;
          
          // Add opt-out only if not already in message
          if (!personalizedMessage.includes('להסרה') && !personalizedMessage.includes('stop')) {
            personalizedMessage += optOutText;
          }

          console.log(`Sending to ${contact.name} (${contact.phone}): ${personalizedMessage}`);

          // Call existing send API
          const response = await fetch('/api/messages/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: contact.phone,
              message: personalizedMessage
            })
          });

          const result = await response.json();
          
          if (response.ok && result.success) {
            sentCount++;
            console.log(`✅ Sent to ${contact.name}`);
          } else {
            failedCount++;
            failedContacts.push(contact.name);
            console.error(`❌ Failed to send to ${contact.name}:`, result.error);
          }

          // Update campaign progress
          await supabase
            .from('campaigns')
            .update({
              sent_count: sentCount,
              failed_count: failedCount
            })
            .eq('id', campaignId);

          // Delay between messages (1 second)
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`Error sending to ${contact.name}:`, error);
          failedCount++;
          failedContacts.push(contact.name);
        }
      }

      // Mark campaign as completed
      await supabase
        .from('campaigns')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          sent_count: sentCount,
          failed_count: failedCount,
          delivered_count: sentCount
        })
        .eq('id', campaignId);

      loadData();
      
      let resultMessage = `הקמפיין הושלם!\n✅ נשלחו בהצלחה: ${sentCount}\n❌ נכשלו: ${failedCount}`;
      if (failedContacts.length > 0) {
        resultMessage += `\n\nנכשלו עבור: ${failedContacts.join(', ')}`;
      }
      alert(resultMessage);
      
    } catch (error) {
      console.error('Error starting campaign:', error);
      alert(`שגיאה בהפעלת הקמפיין: ${error.message}`);
      
      // Reset campaign status
      await supabase
        .from('campaigns')
        .update({ status: 'draft' })
        .eq('id', campaignId);
        
      loadData();
    }
  };

  // Cancel campaign
  const cancelCampaign = async (campaignId: string) => {
    if (!confirm('האם לבטל את הקמפיין?')) return;
    
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ 
          status: 'cancelled',
          completed_at: new Date().toISOString()
        })
        .eq('id', campaignId);
      
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error cancelling campaign:', error);
    }
  };

  // Delete campaign
  const deleteCampaign = async (campaignId: string) => {
    if (!confirm('האם למחוק את הקמפיין? פעולה זו לא ניתנת לביטול.')) return;
    
    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);
      
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting campaign:', error);
    }
  };

  // Reset form
  const resetForm = () => {
    setNewCampaign({
      name: '',
      description: '',
      template_id: '',
      message_content: '',
      target_type: 'all',
      target_tags: [],
      target_contacts: [],
      send_type: 'immediate',
      scheduled_at: '',
      batch_size: 50,
      delay_between_messages: 1000
    });
  };

  // Filter campaigns by tab
  const filteredCampaigns = campaigns.filter(campaign => {
    if (activeTab === 'active') return ['draft', 'running', 'paused'].includes(campaign.status);
    if (activeTab === 'scheduled') return campaign.status === 'scheduled';
    if (activeTab === 'completed') return ['completed', 'cancelled'].includes(campaign.status);
    return true;
  });

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', label: 'טיוטה', icon: '📝' },
      scheduled: { color: 'bg-blue-100 text-blue-800', label: 'מתוזמן', icon: '⏰' },
      running: { color: 'bg-green-100 text-green-800', label: 'פעיל', icon: '🚀' },
      paused: { color: 'bg-yellow-100 text-yellow-800', label: 'מושהה', icon: '⏸️' },
      completed: { color: 'bg-purple-100 text-purple-800', label: 'הושלם', icon: '✅' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'בוטל', icon: '❌' }
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon} {config.label}
      </span>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">ניהול קמפיינים</h1>
        <p className="text-gray-600">צור ונהל קמפיינים לשליחת הודעות המוניות</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-gray-600">סה״כ קמפיינים</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm text-gray-600">פעילים</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
          <div className="text-sm text-gray-600">מתוזמנים</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-purple-600">{stats.completed}</div>
          <div className="text-sm text-gray-600">הושלמו</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-indigo-600">{stats.totalSent}</div>
          <div className="text-sm text-gray-600">הודעות נשלחו</div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-lg transition ${
                activeTab === 'active'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              פעילים ({campaigns.filter(c => ['draft', 'running', 'paused'].includes(c.status)).length})
            </button>
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`px-4 py-2 rounded-lg transition ${
                activeTab === 'scheduled'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              מתוזמנים ({campaigns.filter(c => c.status === 'scheduled').length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-4 py-2 rounded-lg transition ${
                activeTab === 'completed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              הושלמו ({campaigns.filter(c => ['completed', 'cancelled'].includes(c.status)).length})
            </button>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            ➕ קמפיין חדש
          </button>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <div className="mt-2">טוען קמפיינים...</div>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-500 mb-4">
              <div className="text-6xl mb-4">📢</div>
              <div className="text-xl">אין קמפיינים {activeTab === 'active' ? 'פעילים' : activeTab === 'scheduled' ? 'מתוזמנים' : 'שהושלמו'}</div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              צור קמפיין ראשון
            </button>
          </div>
        ) : (
          filteredCampaigns.map(campaign => (
            <div key={campaign.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">{campaign.name}</h3>
                    {getStatusBadge(campaign.status)}
                  </div>
                  
                  {campaign.description && (
                    <p className="text-gray-600 mb-3">{campaign.description}</p>
                  )}
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">קהל יעד:</span>
                      <div className="font-medium">
                        {campaign.target_type === 'all' && 'כל אנשי הקשר'}
                        {campaign.target_type === 'tags' && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {campaign.target_tags?.map(tag => (
                              <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {campaign.target_type === 'specific' && `${campaign.estimated_recipients} אנשי קשר`}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-gray-500">מקבלים:</span>
                      <div className="font-medium">{campaign.estimated_recipients}</div>
                    </div>
                    
                    <div>
                      <span className="text-gray-500">נשלחו:</span>
                      <div className="font-medium text-green-600">{campaign.sent_count}</div>
                    </div>
                    
                    <div>
                      <span className="text-gray-500">נכשלו:</span>
                      <div className="font-medium text-red-600">{campaign.failed_count}</div>
                    </div>
                  </div>
                  
                  {campaign.scheduled_at && campaign.status === 'scheduled' && (
                    <div className="mt-3 text-sm text-blue-600">
                      ⏰ מתוזמן ל: {new Date(campaign.scheduled_at).toLocaleString('he-IL')}
                    </div>
                  )}
                  
                  {campaign.status === 'running' && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${(campaign.sent_count / campaign.estimated_recipients) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">
                          {Math.round((campaign.sent_count / campaign.estimated_recipients) * 100)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 ml-4">
                  {campaign.status === 'draft' && (
                    <>
                      <button
                        onClick={() => startCampaign(campaign.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        🚀 התחל
                      </button>
                      <button
                        onClick={() => deleteCampaign(campaign.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                      >
                        🗑️ מחק
                      </button>
                    </>
                  )}
                  
                  {campaign.status === 'running' && (
                    <button
                      onClick={() => cancelCampaign(campaign.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                    >
                      ⏹️ עצור
                    </button>
                  )}
                  
                  {campaign.status === 'scheduled' && (
                    <button
                      onClick={() => cancelCampaign(campaign.id)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                    >
                      ❌ בטל
                    </button>
                  )}
                  
                  <button
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    📊 דוח
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">יצירת קמפיין חדש</h2>
            
            <div className="space-y-4">
              {/* Campaign Name */}
              <div>
                <label className="block text-sm font-medium mb-1">שם הקמפיין *</label>
                <input
                  type="text"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="למשל: מבצע חגים"
                />
              </div>
              
              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1">תיאור</label>
                <textarea
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign({...newCampaign, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="תיאור קצר של הקמפיין..."
                />
              </div>
              
              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium mb-1">בחר תבנית</label>
                <select
                  value={newCampaign.template_id}
                  onChange={(e) => {
                    const template = templates.find(t => t.id === e.target.value);
                    setNewCampaign({
                      ...newCampaign,
                      template_id: e.target.value,
                      message_content: template?.content || newCampaign.message_content
                    });
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- בחר תבנית או כתוב הודעה --</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Message Content */}
              <div>
                <label className="block text-sm font-medium mb-1">תוכן ההודעה *</label>
                <textarea
                  value={newCampaign.message_content}
                  onChange={(e) => setNewCampaign({...newCampaign, message_content: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="כתוב את תוכן ההודעה..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  ניתן להשתמש במשתנים: {'{{name}}'}, {'{{phone}}'}
                </p>
              </div>
              
              {/* Target Type */}
              <div>
                <label className="block text-sm font-medium mb-2">קהל יעד *</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="all"
                      checked={newCampaign.target_type === 'all'}
                      onChange={(e) => setNewCampaign({...newCampaign, target_type: 'all', target_tags: [], target_contacts: []})}
                      className="ml-2"
                    />
                    <span>כל אנשי הקשר הפעילים ({contacts.length})</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="tags"
                      checked={newCampaign.target_type === 'tags'}
                      onChange={(e) => setNewCampaign({...newCampaign, target_type: 'tags', target_contacts: []})}
                      className="ml-2"
                    />
                    <span>לפי תגיות</span>
                  </label>
                  
                  {newCampaign.target_type === 'tags' && (
                    <div className="mr-6 flex flex-wrap gap-2">
                      {tags.map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            setNewCampaign(prev => ({
                              ...prev,
                              target_tags: prev.target_tags.includes(tag)
                                ? prev.target_tags.filter(t => t !== tag)
                                : [...prev.target_tags, tag]
                            }));
                          }}
                          className={`px-3 py-1 rounded-full text-sm transition ${
                            newCampaign.target_tags.includes(tag)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="specific"
                      checked={newCampaign.target_type === 'specific'}
                      onChange={(e) => setNewCampaign({...newCampaign, target_type: 'specific', target_tags: []})}
                      className="ml-2"
                    />
                    <span>בחירה ידנית</span>
                  </label>
                </div>
                
                {/* Recipients count */}
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-900">
                    מקבלים פוטנציאליים: {
                      newCampaign.target_type === 'all' 
                        ? contacts.length
                        : newCampaign.target_type === 'tags'
                        ? contacts.filter(c => c.tags?.some(tag => newCampaign.target_tags.includes(tag))).length
                        : newCampaign.target_contacts.length
                    }
                  </div>
                </div>
              </div>
              
              {/* Send Type */}
              <div>
                <label className="block text-sm font-medium mb-2">תזמון שליחה</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="immediate"
                      checked={newCampaign.send_type === 'immediate'}
                      onChange={(e) => setNewCampaign({...newCampaign, send_type: 'immediate'})}
                      className="ml-2"
                    />
                    <span>שליחה מיידית</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="scheduled"
                      checked={newCampaign.send_type === 'scheduled'}
                      onChange={(e) => setNewCampaign({...newCampaign, send_type: 'scheduled'})}
                      className="ml-2"
                    />
                    <span>תזמון לשעה מאוחרת יותר</span>
                  </label>
                  
                  {newCampaign.send_type === 'scheduled' && (
                    <div className="mr-6">
                      <input
                        type="datetime-local"
                        value={newCampaign.scheduled_at}
                        onChange={(e) => setNewCampaign({...newCampaign, scheduled_at: e.target.value})}
                        className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Advanced Settings */}
              <details className="border rounded-lg p-3">
                <summary className="cursor-pointer font-medium">הגדרות מתקדמות</summary>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">גודל קבוצה לשליחה</label>
                    <input
                      type="number"
                      value={newCampaign.batch_size}
                      onChange={(e) => setNewCampaign({...newCampaign, batch_size: parseInt(e.target.value) || 50})}
                      className="w-full px-3 py-2 border rounded-lg"
                      min="1"
                      max="100"
                    />
                    <p className="text-xs text-gray-500 mt-1">כמה הודעות לשלוח בכל פעם</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">השהייה בין הודעות (מילישניות)</label>
                    <input
                      type="number"
                      value={newCampaign.delay_between_messages}
                      onChange={(e) => setNewCampaign({...newCampaign, delay_between_messages: parseInt(e.target.value) || 1000})}
                      className="w-full px-3 py-2 border rounded-lg"
                      min="500"
                      max="10000"
                    />
                    <p className="text-xs text-gray-500 mt-1">זמן המתנה בין הודעה להודעה</p>
                  </div>
                </div>
              </details>
            </div>
            
            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-6 py-2 text-gray-600 hover:text-gray-800"
              >
                ביטול
              </button>
              <button
                onClick={handleCreateCampaign}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                צור קמפיין
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}