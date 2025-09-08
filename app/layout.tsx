// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'WhatsApp Sender - מערכת שליחת הודעות',
  description: 'מערכת מתקדמת לשליחת הודעות WhatsApp',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className={inter.className}>
        {/* Navigation Bar */}
        <nav className="bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <div className="flex items-center space-x-reverse space-x-2">
                <span className="text-2xl">💬</span>
                <span className="text-xl font-bold">WhatsApp Sender</span>
              </div>
              
              {/* Main Navigation */}
              <div className="hidden md:flex items-center space-x-reverse space-x-6">
                <Link 
                  href="/" 
                  className="hover:bg-green-700 px-3 py-2 rounded-md transition duration-200 flex items-center gap-2"
                >
                  <span>🏠</span>
                  <span>ראשי</span>
                </Link>
                
                <Link 
                  href="/admin/tenants" 
                  className="hover:bg-green-700 px-3 py-2 rounded-md transition duration-200 flex items-center gap-2"
                >
                  <span>🏢</span>
                  <span>דיירים</span>
                </Link>
                
                <Link 
                  href="/admin/contacts" 
                  className="hover:bg-green-700 px-3 py-2 rounded-md transition duration-200 flex items-center gap-2"
                >
                  <span>👥</span>
                  <span>אנשי קשר</span>
                </Link>
                
                <Link 
                  href="/admin/templates" 
                  className="hover:bg-green-700 px-3 py-2 rounded-md transition duration-200 flex items-center gap-2"
                >
                  <span>📝</span>
                  <span>תבניות</span>
                </Link>
                
                <Link 
                  href="/admin/send-message" 
                  className="hover:bg-green-700 px-3 py-2 rounded-md transition duration-200 flex items-center gap-2"
                >
                  <span>📤</span>
                  <span>שליחת הודעה</span>
                </Link>
                
                <Link 
                  href="/admin/campaigns" 
                  className="hover:bg-green-700 px-3 py-2 rounded-md transition duration-200 flex items-center gap-2"
                >
                  <span>📢</span>
                  <span>קמפיינים</span>
                </Link>
                
                {/* קישור חדש לקמפיינים החדש */}
                <Link 
                  href="/campaigns-new" 
                  className="hover:bg-green-700 px-3 py-2 rounded-md transition duration-200 flex items-center gap-2 bg-green-800 border border-green-500"
                >
                  <span>🚀</span>
                  <span>קמפיינים חדש</span>
                </Link>
                
                <Link 
                  href="/admin/reports" 
                  className="hover:bg-green-700 px-3 py-2 rounded-md transition duration-200 flex items-center gap-2"
                >
                  <span>📊</span>
                  <span>דוחות</span>
                </Link>
                
                <Link 
                  href="/admin/settings" 
                  className="hover:bg-green-700 px-3 py-2 rounded-md transition duration-200 flex items-center gap-2"
                >
                  <span>⚙️</span>
                  <span>הגדרות</span>
                </Link>
              </div>
              
              {/* Mobile Menu Button */}
              <button className="md:hidden flex items-center px-3 py-2 border rounded text-white border-white hover:text-white hover:border-white">
                <svg className="fill-current h-6 w-6" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <title>Menu</title>
                  <path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z"/>
                </svg>
              </button>
            </div>
            
            {/* Mobile Navigation (hidden by default) */}
            <div className="md:hidden hidden" id="mobile-menu">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                <Link 
                  href="/" 
                  className="hover:bg-green-700 block px-3 py-2 rounded-md text-base font-medium"
                >
                  🏠 ראשי
                </Link>
                <Link 
                  href="/admin/tenants" 
                  className="hover:bg-green-700 block px-3 py-2 rounded-md text-base font-medium"
                >
                  🏢 דיירים
                </Link>
                <Link 
                  href="/admin/contacts" 
                  className="hover:bg-green-700 block px-3 py-2 rounded-md text-base font-medium"
                >
                  👥 אנשי קשר
                </Link>
                <Link 
                  href="/admin/templates" 
                  className="hover:bg-green-700 block px-3 py-2 rounded-md text-base font-medium"
                >
                  📝 תבניות
                </Link>
                <Link 
                  href="/admin/send-message" 
                  className="hover:bg-green-700 block px-3 py-2 rounded-md text-base font-medium"
                >
                  📤 שליחת הודעה
                </Link>
                <Link 
                  href="/admin/campaigns" 
                  className="hover:bg-green-700 block px-3 py-2 rounded-md text-base font-medium"
                >
                  📢 קמפיינים
                </Link>
                {/* קישור חדש לקמפיינים החדש במובייל */}
                <Link 
                  href="/campaigns-new" 
                  className="hover:bg-green-700 block px-3 py-2 rounded-md text-base font-medium bg-green-800 border border-green-500"
                >
                  🚀 קמפיינים חדש
                </Link>
                <Link 
                  href="/admin/reports" 
                  className="hover:bg-green-700 block px-3 py-2 rounded-md text-base font-medium"
                >
                  📊 דוחות
                </Link>
                <Link 
                  href="/admin/settings" 
                  className="hover:bg-green-700 block px-3 py-2 rounded-md text-base font-medium"
                >
                  ⚙️ הגדרות
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Secondary Navigation Bar (Optional) */}
        <div className="bg-gray-100 border-b border-gray-200">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-10 text-sm">
              {/* Breadcrumbs or Status */}
              <div className="flex items-center text-gray-600">
                <span>מערכת ניהול WhatsApp</span>
                <span className="mx-2">›</span>
                <span className="text-gray-900 font-medium">v1.0</span>
              </div>
              
              {/* Quick Actions */}
              <div className="flex items-center space-x-reverse space-x-4">
                <Link 
                  href="/campaigns-new" 
                  className="text-purple-600 hover:text-purple-700 font-medium"
                >
                  🚀 קמפיין חדש
                </Link>
                <Link 
                  href="/admin/send-message" 
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  + שליחה מהירה
                </Link>
                <Link 
                  href="/admin/contacts" 
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  + איש קשר חדש
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-gray-800 text-white py-8 mt-auto">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Company Info */}
              <div>
                <h3 className="text-lg font-bold mb-3">WhatsApp Sender</h3>
                <p className="text-gray-400 text-sm">
                  מערכת מתקדמת לניהול ושליחת הודעות WhatsApp למגוון לקוחות
                </p>
              </div>
              
              {/* Quick Links */}
              <div>
                <h4 className="text-md font-semibold mb-3">קישורים מהירים</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/admin/contacts" className="text-gray-400 hover:text-white">
                      ניהול אנשי קשר
                    </Link>
                  </li>
                  <li>
                    <Link href="/admin/templates" className="text-gray-400 hover:text-white">
                      תבניות הודעות
                    </Link>
                  </li>
                  <li>
                    <Link href="/admin/campaigns" className="text-gray-400 hover:text-white">
                      קמפיינים
                    </Link>
                  </li>
                  <li>
                    <Link href="/campaigns-new" className="text-gray-400 hover:text-white">
                      🚀 קמפיינים חדש
                    </Link>
                  </li>
                </ul>
              </div>
              
              {/* Statistics */}
              <div>
                <h4 className="text-md font-semibold mb-3">סטטיסטיקה</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>הודעות שנשלחו היום: 0</li>
                  <li>אנשי קשר פעילים: 0</li>
                  <li>קמפיינים פעילים: 0</li>
                </ul>
              </div>
              
              {/* Support */}
              <div>
                <h4 className="text-md font-semibold mb-3">תמיכה</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/admin/settings" className="text-gray-400 hover:text-white">
                      הגדרות מערכת
                    </Link>
                  </li>
                  <li>
                    <a href="/api/health" className="text-gray-400 hover:text-white">
                      בדיקת מערכת
                    </a>
                  </li>
                  <li className="text-gray-400">
                    גרסה: 1.0.0
                  </li>
                </ul>
              </div>
            </div>
            
            {/* Copyright */}
            <div className="border-t border-gray-700 mt-8 pt-6 text-center text-sm text-gray-400">
              <p>© 2025 WhatsApp Sender. כל הזכויות שמורות.</p>
              <p className="mt-2">
                Powered by Next.js • Supabase • Green API
              </p>
            </div>
          </div>
        </footer>

        {/* Mobile Menu Toggle Script */}
        <script dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('DOMContentLoaded', function() {
              const menuButton = document.querySelector('.md\\\\:hidden button');
              const mobileMenu = document.getElementById('mobile-menu');
              
              if (menuButton && mobileMenu) {
                menuButton.addEventListener('click', function() {
                  mobileMenu.classList.toggle('hidden');
                });
              }
            });
          `
        }} />
      </body>
    </html>
  );
}
