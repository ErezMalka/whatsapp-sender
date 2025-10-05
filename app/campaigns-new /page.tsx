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

export default function NewCampaignPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [campaignName, setCampaignName] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [sendSpeed, setSendSpeed] = useState(5);
  const [groups, setGroups] = useState<Group[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'groups' | 'contacts'>('groups');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
    } else {
      setCurrentUser(JSON.parse(userData));
    }
    
    loadGroups();
    loadContacts();
  }, [router]);

  const loadGroups = () => {
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
    const mockContacts: Contact[] = [];
    for (let i = 1; i <= 83; i++) {
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
    setSelectedContacts(contacts.map(c => c.id));
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
      sendSpeed: sendSpeed,
      groupIds: selectedGroups,
      contactIds: selectedContacts,
      totalRecipients: getTotalRecipients(),
      createdAt: new Date().toISOString()
    };

    setLoading(true);

    setTimeout(() => {
      console.log('Campaign created:', campaignData);
      alert(`הקמפיין "${campaignName}" נוצר בהצלחה! נשלח ל-${getTotalRecipients()} נמענים`);
      router.push('/campaigns');
    }, 1500);
  };

  if (!currentUser) {
    return <div className="flex items-center justify-center h-screen">טוען...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-800 p-5" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 text-white">
          <div className="flex justify-between items-center mb-4">
            <Link 
              href="/dashboard" 
              className="text-white hover:text-purple-200"
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

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
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

            <div className="mb-6">
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

            <div className="bg-gray-50 p-5 rounded-lg mb-6">
              <label className="block text-gray-700 font-semibold mb-3">
                ⏱️ קצב שליחה (שניות בין הודעה להודעה)
              </label>
              <input
                type="range"
                min="1"
                max="60"
                value={sendSpeed}
                onChange={(e) => setSendSpeed(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex items-center mt-3">
                <span className="text-3xl font-bold text-purple-600">{sendSpeed}</span>
                <span className="text-gray-600 mr-3">שניות בין כל הודעה</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                זמן משוער לשליחה: {Math.ceil(getTotalRecipients() * sendSpeed / 60)} דקות
              </div>
            </div>

            <div className="bg-gray-50 p-5 rounded-lg mb-6">
              <h3 className="text-xl font-semibold mb-4">📋 בחירת נמענים</h3>
              
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-80 overflow-y-auto p-2">
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

              {activeTab === 'contacts' && (
                <div>
                  <div className="flex justify-end mb-3 gap-2">
                    <button
                      type="button"
                      onClick={selectAllContacts}
                      className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-colors"
                    >
                      בחר הכל
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllContacts}
                      className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-colors"
                    >
                      נקה בחירה
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto p-2">
                    {contacts.map((contact) => (
                      <div
                        key={contact.id}
                        onClick={() => toggleContact(contact.id)}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedContacts.includes(contact.id)
                            ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white border-transparent'
                            : 'bg-white border-gray-200 hover:shadow-md'
                        }`}
                      >
                        <div className="font-semibold">{contact.name}</div>
                        <div className="text-sm opacity-80">{contact.phone}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 rounded-lg mt-4 flex justify-between items-center">
                <span>📊 סיכום בחירה:</span>
                <div className="flex gap-6">
                  <span>קבוצות: <b>{selectedGroups.length}</b></span>
                  <span>אנשי קשר: <b>{selectedContacts.length}</b></span>
                  <span>סה"כ נמענים: <b>{getTotalRecipients()}</b></span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transition-shadow disabled:opacity-50"
              >
                {loading ? 'שולח...' : '🚀 התחל קמפיין'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/campaigns')}
                className="flex-1 bg-white text-purple-600 border-2 border-purple-600 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                ביטול
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
