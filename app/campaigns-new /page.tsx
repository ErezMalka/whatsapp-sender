'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Contact {
  id: number;
  name: string;
  phone: string;
  email?: string;
  tags?: string[];
}

interface Group {
  id: number;
  name: string;
  icon?: string;
  memberCount: number;
}

interface MessageTemplate {
  id: number;
  name: string;
  content: string;
  variables?: string[];
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [campaignName, setCampaignName] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [sendSpeed, setSendSpeed] = useState(5);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'groups' | 'contacts'>('groups');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);

  // Message Templates
  const templates: MessageTemplate[] = [
    { 
      id: 1, 
      name: 'ברכת יום הולדת', 
      content: 'היי {name}, יום הולדת שמח! 🎉 מאחלים לך שנה מדהימה מלאה בהצלחה ואושר.',
      variables: ['name']
    },
    { 
      id: 2, 
      name: 'תזכורת לפגישה', 
      content: 'שלום {name}, זוהי תזכורת על הפגישה שלנו ב-{date} בשעה {time}. נתראה!',
      variables: ['name', 'date', 'time']
    },
    { 
      id: 3, 
      name: 'מבצע מיוחד', 
      content: 'היי {name}! 🎁 יש לנו מבצע מיוחד בשבילך - {offer}. תוקף עד {expiry}.',
      variables: ['name', 'offer', 'expiry']
    }
  ];

  useEffect(() => {
    // Check authentication
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
    } else {
      setCurrentUser(JSON.parse(userData));
    }
    
    // Load data
    loadGroups();
    loadContacts();
    
    // Load draft if exists
    const draft = localStorage.getItem('campaignDraft');
    if (draft) {
      const draftData = JSON.parse(draft);
      setCampaignName(draftData.name || '');
      setMessageContent(draftData.message || '');
      setSelectedTemplate(draftData.templateId || null);
      setSelectedContacts(draftData.contactIds || []);
      setSelectedGroups(draftData.groupIds || []);
    }
  }, [router]);

  const loadGroups = () => {
    // Mock data for groups
    const mockGroups: Group[] = [
      { id: 1, name: 'לקוחות VIP', icon: '⭐', memberCount: 25 },
      { id: 2, name: 'לקוחות חדשים', icon: '🆕', memberCount: 42 },
      { id: 3, name: 'ספקים', icon: '📦', memberCount: 18 },
      { id: 4, name: 'צוות המכירות', icon: '💼', memberCount: 8 },
      { id: 5, name: 'שותפים עסקיים', icon: '🤝', memberCount: 15 },
      { id: 6, name: 'רשימת תפוצה ראשית', icon: '📧', memberCount: 156 }
    ];
    setGroups(mockGroups);
  };

  const loadContacts = () => {
    // Mock data for contacts - 83 contacts as requested
    const mockContacts: Contact[] = [
      { id: 1, name: 'יוסי כהן', phone: '+972501234567', email: 'yossi@example.com', tags: ['VIP'] },
      { id: 2, name: 'מירי לוי', phone: '+972502345678', email: 'miri@example.com', tags: ['לקוחות'] },
      { id: 3, name: 'דוד ישראלי', phone: '+972503456789', email: 'david@example.com', tags: ['ספקים'] },
      { id: 4, name: 'רונית שמש', phone: '+972504567890', email: 'ronit@example.com', tags: ['חדש'] },
      { id: 5, name: 'אבי ממן', phone: '+972505678901', email: 'avi@example.com', tags: ['VIP'] },
      { id: 6, name: 'שירה גולן', phone: '+972506789012', email: 'shira@example.com', tags: ['לקוחות'] },
      { id: 7, name: 'משה פרץ', phone: '+972507890123', email: 'moshe@example.com', tags: ['ספקים', 'VIP'] },
      { id: 8, name: 'נועה אברהם', phone: '+972508901234', email: 'noa@example.com', tags: ['לקוחות'] }
    ];
    
    // Add more contacts to reach 83
    for (let i = 9; i <= 83; i++) {
      mockContacts.push({
        id: i,
        name: `איש קשר ${i}`,
        phone: `+97250${1000000 + i}`,
        email: `contact${i}@example.com`,
        tags: i % 3 === 0 ? ['VIP'] : i % 2 === 0 ? ['לקוחות'] : ['ספקים']
      });
    }
    
    setContacts(mockContacts);
  };

  const handleTemplateSelect = (templateId: number) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setMessageContent(template.content);
    }
  };

  const toggleGroup = (groupId: number) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const toggleContact = (contactId: number) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const selectAllGroups = () => {
    setSelectedGroups(groups.map(g => g.id));
  };

  const deselectAllGroups = () => {
    setSelectedGroups([]);
  };

  const selectAllContacts = () => {
    const visibleContacts = filteredContacts.map(c => c.id);
    setSelectedContacts(visibleContacts);
  };

  const deselectAllContacts = () => {
    setSelectedContacts([]);
  };

  const getTotalRecipients = () => {
    const groupsCount = selectedGroups.reduce((total, groupId) => {
      const group = groups.find(g => g.id === groupId);
      return total + (group?.memberCount || 0);
    }, 0);
    return groupsCount + selectedContacts.length;
  };

  const filteredContacts = contacts.filter(contact => {
    if (!searchTerm) return true;
    return contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           contact.phone.includes(searchTerm) ||
           contact.email?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const saveDraft = () => {
    const draftData = {
      name: campaignName,
      message: messageContent,
      templateId: selectedTemplate,
      contactIds: selectedContacts,
      groupIds: selectedGroups,
      sendSpeed: sendSpeed,
      scheduled: isScheduled,
      scheduleDateTime: isScheduled ? `${scheduleDate} ${scheduleTime}` : null,
      savedAt: new Date().toISOString()
    };
    
    localStorage.setItem('campaignDraft', JSON.stringify(draftData));
    alert('הטיוטה נשמרה בהצלחה!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (getTotalRecipients() === 0) {
      alert('אנא בחר לפחות קבוצה אחת או איש קשר אחד');
      return;
    }

    if (!campaignName || !messageContent) {
      alert('אנא מלא את כל השדות החובה');
      return;
    }

    const campaignData = {
      name: campaignName,
      message: messageContent,
      templateId: selectedTemplate,
      sendSpeed: sendSpeed,
      groupIds: selectedGroups,
      contactIds: selectedContacts,
      scheduled: isScheduled,
      scheduleDateTime: isScheduled ? `${scheduleDate} ${scheduleTime}` : null,
      totalRecipients: getTotalRecipients(),
      createdAt: new Date().toISOString(),
      status: isScheduled ? 'scheduled' : 'active'
    };

    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      console.log('Campaign created:', campaignData);
      localStorage.removeItem('campaignDraft'); // Clear draft
      alert(`הקמפיין "${campaignName}" נוצר בהצלחה! נשלח ל-${getTotalRecipients()} נמענים`);
      router.push('/campaigns');
    }, 1500);
  };

  if (!currentUser) {
    return <div className="flex items-center justify-center h-screen">טוען...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-800 p-5" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 text-white">
          <div className="flex justify-between items-center mb-4">
            <Link 
              href="/dashboard" 
              className="text-white hover:text-purple-200 flex items-center gap-2"
            >
              ← חזור לדשבורד
            </Link>
            <div className="text-sm">
              שלום, {currentUser.name}
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2">📱 יצירת קמפיין חדש</h1>
          <p className="text-lg opacity-95">הגדר את פרטי הקמפיין ובחר את קבוצת הנמענים</p>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Left Column - Campaign Details */}
              <div className="space-y-6">
                {/* Campaign Name */}
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    <span className="text-red-500">*</span> שם הקמפיין
                  </label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="לדוגמה: מבצע חגים 2024"
                    required
                  />
                </div>

                {/* Template Selection */}
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    📝 תבנית הודעה (אופציונלי)
                  </label>
                  <select
                    value={selectedTemplate || ''}
                    onChange={(e) => handleTemplateSelect(Number(e.target.value))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                  >
                    <option value="">בחר תבנית...</option>
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Message Content */}
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    <span className="text-red-500">*</span> תוכן ההודעה
                  </label>
                  <textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value.substring(0, 1000))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition-colors min-h-[150px] resize-y"
                    placeholder="כתוב כאן את תוכן ההודעה שתישלח..."
                    required
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    {messageContent.length} / 1000 תווים
                  </div>
                </div>

                {/* Send Speed */}
                <div className="bg-gray-50 p-5 rounded-lg">
                  <label className="block text-gray-700 font-semibold mb-3">
                    ⏱️ קצב שליחה
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="60"
                    value={sendSpeed}
                    onChange={(e) => setSendSpeed(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-3xl font-bold text-purple-600">{sendSpeed}</span>
                    <span className="text-gray-600">שניות בין כל הודעה</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    זמן משוער לשליחה: {Math.ceil(getTotalRecipients() * sendSpeed / 60)} דקות
                  </div>
                </div>

                {/* Schedule */}
                <div className="bg-gray-50 p-5 rounded-lg">
                  <label className="flex items-center mb-3">
                    <input
                      type="checkbox"
                      checked={isScheduled}
                      onChange={(e) => setIsScheduled(e.target.checked)}
                      className="ml-2 h-4 w-4 text-purple-600"
                    />
                    <span className="font-semibold">⏰ תזמן שליחה</span>
                  </label>
                  
                  {isScheduled && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">תאריך</label>
                        <input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
                          required={isScheduled}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">שעה</label>
                        <input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
                          required={isScheduled}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Recipients */}
              <div className="space-y-6">
                {/* Recipients Selection */}
                <div className="bg-gray-50 p-5 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">📋 בחירת נמענים</h3>
                  
                  {/* Tabs */}
                  <div className="flex border-b-2 border-gray-200 mb-4">
                    <button
                      type="button"
                      onClick={() => setActiveTab('groups')}
                      className={`px-6 py-3 font-semibold transition-colors ${
                        activeTab === 'groups'
                          ? 'text-purple-600 border-b-3 border-purple-600'
                          : 'text-gray-500'
                      }`}
                    >
                      👥 קבוצות ({groups.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('contacts')}
                      className={`px-6 py-3 font-semibold transition-colors ${
                        activeTab === 'contacts'
                          ? 'text-purple-600 border-b-3 border-purple-600'
                          : 'text-gray-500'
                      }`}
                    >
                      👤 אנשי קשר ({contacts.length})
                    </button>
                  </div>

                  {/* Groups Tab */}
                  {activeTab === 'groups' && (
                    <div>
                      <div className="flex justify-end mb-3 gap-2">
                        <button
                          type="button"
                          onClick={selectAllGroups}
                          className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-colors"
                        >
                          בחר הכל
                        </button>
                        <button
                          type="button"
                          onClick={deselectAllGroups}
                          className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-colors"
                        >
                          נקה בחירה
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto p-2">
                        {groups.map((group) => (
                          <div
                            key={group.id}
                            onClick={() => toggleGroup(group.id)}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              selectedGroups.includes(group.id)
                                ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white border-transparent'
                                : 'bg-white border-gray-200 hover:shadow-md'
                            }`}
                          >
                            <div className="text-center">
                              <div className="text-3xl mb-2">{group.icon || '👥'}</div>
                              <div className="font-semibold">{group.name}</div>
                              <div className="text-sm opacity-80">
                                {group.memberCount} אנשי קשר
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contacts Tab */}
                  {activeTab === 'contacts' && (
                    <div>
                      <div className="mb-3">
                        <input
                          type="text"
                          placeholder="חיפוש איש קשר..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm text-gray-600">
                          מציג {filteredContacts.length} מתוך {contacts.length} אנשי קשר
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={selectAllContacts}
                            className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-colors text-sm"
                          >
                            בחר הכל
                          </button>
                          <button
                            type="button"
                            onClick={deselectAllContacts}
                            className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-colors text-sm"
                          >
                            נקה
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto p-2">
                        {filteredContacts.map((contact) => (
                          <div
                            key={contact.id}
                            onClick={() => toggleContact(contact.id)}
                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              selectedContacts.includes(contact.id)
                                ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white border-transparent'
                                : 'bg-white border-gray-200 hover:shadow-md'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-semibold">{contact.name}</div>
                                <div className="text-sm opacity-80">{contact.phone}</div>
                              </div>
                              {contact.tags && contact.tags.length > 0 && (
                                <div className="flex gap-1">
                                  {contact.tags.map(tag => (
                                    <span key={tag} className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 rounded-lg mt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">📊 סיכום בחירה:</span>
                      <div className="flex gap-6">
                        <span>קבוצות: <b>{selectedGroups.length}</b></span>
                        <span>אנשי קשר: <b>{selectedContacts.length}</b></span>
                        <span className="text-yellow-300">סה"כ: <b>{getTotalRecipients()}</b></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Message Preview */}
                <div className="bg-gray-50 p-5 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3">👁️ תצוגה מקדימה</h3>
                  <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
                    <div className="max-w-sm mx-auto">
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                          W
                        </div>
                        <span className="mr-3 font-medium">WhatsApp Business</span>
                      </div>
                      <div className="bg-green-100 rounded-lg p-3 relative">
                        <div className="text-sm text-gray-800 whitespace-pre-wrap">
                          {messageContent || 'התוכן של ההודעה יופיע כאן...'}
                        </div>
                        <div className="text-xs text-gray-500 mt-2 text-left">
                          {new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mt-8">
              <button
                type="submit"
                disabled={loading || getTotalRecipients() === 0}
                className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                  loading || getTotalRecipients() === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:shadow-lg'
                }`}
              >
                {loading ? 'שולח...' : isScheduled ? '⏰ תזמן קמפיין' : '🚀 התחל קמפיין'}
              </button>
              
              <button
                type="button"
                onClick={saveDraft}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
              >
                💾 שמור כטיוטה
              </button>
              
              <button
                type="button"
                onClick={() => router.push('/campaigns')}
                className="px-6 py-3 bg-white text-purple-600 border-2 border-purple-600 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                ביטול
              </button>
            </div>
          </form>
        </div>

        {/* Stats Footer */}
        <div className="mt-6 text-center text-white text-sm opacity-90">
          <p>💡 טיפ: שמור כטיוטה כדי להמשיך מאוחר יותר</p>
        </div>
      </div>
    </div>
  );
}
