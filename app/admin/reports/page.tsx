'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Campaign {
  id: string;
  name: string;
  message: string;
  status: string;
  created_at: string;
  success_count?: number;
  failure_count?: number;
  processed_at?: string;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  tags?: string[];
  created_at: string;
}

export default function ReportsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // שליפת קמפיינים
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!campaignsError && campaignsData) {
        setCampaigns(campaignsData);
      }

      // שליפת אנשי קשר
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!contactsError && contactsData) {
        setContacts(contactsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStats = () => {
    const totalCampaigns = campaigns.length;
    const completedCampaigns = campaigns.filter(c => c.status === 'completed').length;
    const totalContacts = contacts.length;
    const totalMessages = campaigns.reduce((sum, c) => sum + (c.success_count || 0), 0);
    const successRate = campaigns.length > 0
      ? Math.round(
          campaigns.reduce((sum, c) => {
            const total = (c.success_count || 0) + (c.failure_count || 0);
            return sum + (total > 0 ? (c.success_count || 0) / total : 0);
          }, 0) / campaigns.length * 100
        )
      : 0;

    return {
      totalCampaigns,
      completedCampaigns,
      totalContacts,
      totalMessages,
      successRate
    };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">טוען דוחות...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8" dir="rtl">
      <h1 className="text-3xl font-bold mb-8">דוחות</h1>

      {/* בחירת תקופה */}
      <div className="mb-6">
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="day">היום</option>
          <option value="week">השבוע</option>
          <option value="month">החודש</option>
          <option value="all">הכל</option>
        </select>
      </div>

      {/* כרטיסי סטטיסטיקה */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm mb-2">סה"כ קמפיינים</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.totalCampaigns}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm mb-2">קמפיינים שהושלמו</h3>
          <p className="text-3xl font-bold text-green-600">{stats.completedCampaigns}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm mb-2">סה"כ אנשי קשר</h3>
          <p className="text-3xl font-bold text-purple-600">{stats.totalContacts}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm mb-2">הודעות שנשלחו</h3>
          <p className="text-3xl font-bold text-orange-600">{stats.totalMessages}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm mb-2">אחוז הצלחה</h3>
          <p className="text-3xl font-bold text-teal-600">{stats.successRate}%</p>
        </div>
      </div>

      {/* טבלת קמפיינים אחרונים */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">קמפיינים אחרונים</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-right px-4 py-2">שם הקמפיין</th>
                <th className="text-right px-4 py-2">סטטוס</th>
                <th className="text-right px-4 py-2">תאריך</th>
                <th className="text-right px-4 py-2">הצלחות</th>
                <th className="text-right px-4 py-2">כשלונות</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.slice(0, 5).map((campaign) => (
                <tr key={campaign.id} className="border-b">
                  <td className="px-4 py-2">{campaign.name}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      campaign.status === 'completed' ? 'bg-green-100 text-green-800' :
                      campaign.status === 'active' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {campaign.status === 'completed' ? 'הושלם' :
                       campaign.status === 'active' ? 'פעיל' : 'טיוטה'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {new Date(campaign.created_at).toLocaleDateString('he-IL')}
                  </td>
                  <td className="px-4 py-2 text-green-600">
                    {campaign.success_count || 0}
                  </td>
                  <td className="px-4 py-2 text-red-600">
                    {campaign.failure_count || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* טבלת אנשי קשר אחרונים */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">אנשי קשר שנוספו לאחרונה</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-right px-4 py-2">שם</th>
                <th className="text-right px-4 py-2">טלפון</th>
                <th className="text-right px-4 py-2">תגיות</th>
                <th className="text-right px-4 py-2">תאריך הוספה</th>
              </tr>
            </thead>
            <tbody>
              {contacts.slice(0, 5).map((contact) => (
                <tr key={contact.id} className="border-b">
                  <td className="px-4 py-2">{contact.name}</td>
                  <td className="px-4 py-2" dir="ltr">{contact.phone}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1 flex-wrap">
                      {contact.tags?.map((tag, idx) => (
                        <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    {new Date(contact.created_at).toLocaleDateString('he-IL')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
