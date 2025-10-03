'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface User {
  username: string;
  role: string;
}

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    checkAuth();
  }, [pathname]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setUser(null);
        router.push('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + '/');
  };

  const navLinkClass = (path: string) => {
    return `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive(path)
        ? 'bg-blue-700 text-white'
        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`;
  };

  const mobileNavLinkClass = (path: string) => {
    return `block px-3 py-2 rounded-md text-base font-medium transition-colors ${
      isActive(path)
        ? 'bg-blue-700 text-white'
        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`;
  };

  if (!user) {
    return null;
  }

  return (
    <nav className="bg-gray-800" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-white text-xl font-bold">WhatsApp Sender</h1>
            </div>
            <div className="hidden md:block">
              <div className="mr-10 flex items-baseline space-x-4 space-x-reverse">
                <Link href="/admin" className={navLinkClass('/admin')}>
                  דשבורד
                </Link>
                
                <Link href="/admin/contacts" className={navLinkClass('/admin/contacts')}>
                  אנשי קשר
                </Link>
                
                <Link href="/admin/campaigns-new" className={navLinkClass('/admin/campaigns-new')}>
                  קמפיינים
                </Link>
                
                <Link href="/send" className={navLinkClass('/send')}>
                  שליחת הודעות
                </Link>
                
                <Link href="/templates" className={navLinkClass('/templates')}>
                  תבניות
                </Link>

                {/* Admin Menu */}
                {(user.role === 'admin' || user.role === 'superadmin') && (
                  <>
                    <div className="relative group">
                      <button className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors flex items-center">
                        ניהול
                        <svg className="mr-1 h-4 w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M19 9l-7 7-7-7"></path>
                        </svg>
                      </button>
                      
                      <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                        <div className="py-1" role="menu">
                          <Link 
                            href="/admin/settings" 
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            הגדרות
                          </Link>
                          
                          <Link 
                            href="/admin/logs" 
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            יומן פעילות
                          </Link>
                          
                          {user.role === 'superadmin' && (
                            <>
                              <hr className="my-1" />
                              <Link 
                                href="/admin/system" 
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                הגדרות מערכת
                              </Link>
                              
                              <Link 
                                href="/admin/backup" 
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                גיבוי ושחזור
                              </Link>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <Link href="/reports" className={navLinkClass('/reports')}>
                  דוחות
                </Link>
              </div>
            </div>
          </div>
          
          <div className="hidden md:block">
            <div className="mr-4 flex items-center md:mr-6">
              <span className="text-gray-300 ml-3">
                שלום, {user.username}
              </span>
              
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                יציאה
              </button>
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="-ml-2 flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="bg-gray-900 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
            >
              <span className="sr-only">פתח תפריט ראשי</span>
              {mobileMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link href="/admin" className={mobileNavLinkClass('/admin')}>
              דשבורד
            </Link>
            
            <Link href="/admin/contacts" className={mobileNavLinkClass('/admin/contacts')}>
              אנשי קשר
            </Link>
            
            <Link href="/admin/campaigns-new" className={mobileNavLinkClass('/admin/campaigns-new')}>
              קמפיינים
            </Link>
            
            <Link href="/send" className={mobileNavLinkClass('/send')}>
              שליחת הודעות
            </Link>
            
            <Link href="/templates" className={mobileNavLinkClass('/templates')}>
              תבניות
            </Link>

            {(user.role === 'admin' || user.role === 'superadmin') && (
              <>
                <hr className="my-2 border-gray-600" />
                <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  ניהול
                </div>
                
                <Link href="/admin/settings" className={mobileNavLinkClass('/admin/settings')}>
                  הגדרות
                </Link>
                
                <Link href="/admin/logs" className={mobileNavLinkClass('/admin/logs')}>
                  יומן פעילות
                </Link>
                
                {user.role === 'superadmin' && (
                  <>
                    <Link href="/admin/system" className={mobileNavLinkClass('/admin/system')}>
                      הגדרות מערכת
                    </Link>
                    
                    <Link href="/admin/backup" className={mobileNavLinkClass('/admin/backup')}>
                      גיבוי ושחזור
                    </Link>
                  </>
                )}
              </>
            )}
            
            <Link href="/reports" className={mobileNavLinkClass('/reports')}>
              דוחות
            </Link>
          </div>
          
          <div className="pt-4 pb-3 border-t border-gray-700">
            <div className="flex items-center px-5">
              <div className="flex-shrink-0">
                <span className="text-white">{user.username}</span>
              </div>
            </div>
            <div className="mt-3 px-2 space-y-1">
              <button
                onClick={handleLogout}
                className="block w-full text-right px-3 py-2 rounded-md text-base font-medium text-white bg-red-600 hover:bg-red-700"
              >
                יציאה
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
