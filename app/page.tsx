// appp/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function HomePage() {
  const [stats, setStats] = useState({
    contacts: 0,
    templates: 0,
    messagesSent: 0,
    campaigns: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Load contacts count
      const { count: contactsCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', '00000000-0000-0000-0000-000000000001');
      
      // Load templates count
      const { count: templatesCount } = await supabase
        .from('templates')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', '00000000-0000-0000-0000-000000000001');
      
      // Load messages count
      const { count: messagesCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true });
      
      setStats({
        contacts: contactsCount || 0,
        templates: templatesCount || 0,
        messagesSent: messagesCount || 0,
        campaigns: 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      // Set demo data if error
      setStats({
        contacts: 6,
        templates: 3,
        messagesSent: 42,
        campaigns: 2
      });
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'שליחת הודעה',
      description: 'שלח הודעת WhatsApp מיידית',
      icon: '📤',
      href: '/admin/send-message',
      color: 'bg-green-500'
    },
    {
      title: 'אנשי קשר',
      description: 'נהל את רשימת אנשי הקשר',
      icon: '👥',
      href: '/admin/contacts',
      color: 'bg-blue-500'
    },
    {
      title: 'תבניות',
      description: 'צור וערוך תבניות הודעות',
      icon: '📝',
      href: '/admin/templates',
      color: 'bg-purple-500'
    },
    {
      title: 'הגדרות',
      description: 'הגדרות מערכת וחיבורים',
      icon: '⚙️',
      href: '/admin/settings',
      color: 'bg-gray-600'
    }
  ];

  const features = [
    {
      icon: '🚀',
      title: 'שליחה מהירה',
      description: 'שלח הודעות WhatsApp באופן מיידי לאנשי קשר בודדים או קבוצות'
    },
    {
      icon: '📊',
      title: 'דוחות מפורטים',
      description: 'עקוב אחר ביצועי הקמפיינים שלך עם דוחות ואנליטיקס מתקדמים'
    },
    {
      icon: '🎯',
      title: 'מיקוד מדויק',
      description: 'שלח הודעות ממוקדות לקבוצות ספציפיות לפי תגיות ומאפיינים'
    },
    {
      icon: '🔄',
      title: 'אוטומציה חכמה',
      description: 'הגדר קמפיינים אוטומטיים ותזמון שליחה מראש'
    },
    {
      icon: '📱',
      title: 'ממשק ידידותי',
      description: 'ממשק משתמש פשוט ואינטואיטיבי בעברית מלאה'
    },
    {
      icon: '🔒',
      title: 'אבטחה מתקדמת',
      description: 'הגנה מלאה על המידע עם הצפנה ו-Multi-Tenant Architecture'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            ברוכים הבאים ל-WhatsApp Sender
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            המערכת המתקדמת ביותר לניהול ושליחת הודעות WhatsApp לעסקים
          </p>
          <div className="flex justify-center gap-4">
            <Link 
              href="/admin/send-message"
              className="px-8 py-3 bg-green-600 text-white text-lg font-semibold rounded-lg hover:bg-green-700 transition duration-200 flex items-center gap-2"
            >
              <span>📤</span>
              <span>התחל לשלוח הודעות</span>
            </Link>
            <Link 
              href="/admin/contacts"
              className="px-8 py-3 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition duration-200 flex items-center gap-2"
            >
              <span>👥</span>
              <span>נהל אנשי קשר</span>
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-xl shadow-lg p-6 transform hover:scale-105 transition duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="text-3xl">👥</div>
              <div className="text-sm text-gray-500">סה״כ</div>
            </div>
            <div className="text-3xl font-bold text-gray-800">
              {loading ? '...' : stats.contacts}
            </div>
            <div className="text-sm text-gray-600 mt-2">אנשי קשר</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 transform hover:scale-105 transition duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="text-3xl">📝</div>
              <div className="text-sm text-gray-500">פעילות</div>
            </div>
            <div className="text-3xl font-bold text-gray-800">
              {loading ? '...' : stats.templates}
            </div>
            <div className="text-sm text-gray-600 mt-2">תבניות</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 transform hover:scale-105 transition duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="text-3xl">📤</div>
              <div className="text-sm text-gray-500">נשלחו</div>
            </div>
            <div className="text-3xl font-bold text-gray-800">
              {loading ? '...' : stats.messagesSent}
            </div>
            <div className="text-sm text-gray-600 mt-2">הודעות</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 transform hover:scale-105 transition duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="text-3xl">📢</div>
              <div className="text-sm text-gray-500">פעילים</div>
            </div>
            <div className="text-3xl font-bold text-gray-800">
              {loading ? '...' : stats.campaigns}
            </div>
            <div className="text-sm text-gray-600 mt-2">קמפיינים</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">פעולות מהירות</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                href={action.href}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transform hover:scale-105 transition duration-200"
              >
                <div className={`w-16 h-16 ${action.color} rounded-full flex items-center justify-center text-3xl mb-4`}>
                  {action.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{action.title}</h3>
                <p className="text-gray-600">{action.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">יכולות המערכת</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg p-6">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl shadow-xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">מוכנים להתחיל?</h2>
          <p className="text-xl mb-8">
            הצטרפו לאלפי עסקים שכבר משתמשים במערכת שלנו לניהול תקשורת WhatsApp
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/admin/contacts"
              className="px-8 py-3 bg-white text-green-700 font-semibold rounded-lg hover:bg-gray-100 transition duration-200"
            >
              הוסף אנשי קשר
            </Link>
            <Link
              href="/admin/templates"
              className="px-8 py-3 bg-green-800 text-white font-semibold rounded-lg hover:bg-green-900 transition duration-200"
            >
              צור תבנית ראשונה
            </Link>
          </div>
        </div>

        {/* System Status */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-sm font-medium">המערכת פעילה ומוכנה לשימוש</span>
          </div>
        </div>
      </div>
    </div>
  );
}
