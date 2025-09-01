'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [instanceId, setInstanceId] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');

  // טען מה-ENV אם קיים
  useEffect(() => {
    // בדרך כלל לא נגיש ל-ENV מה-client, אבל לצורך הדגמה
    setInstanceId('7103914530');
    setApiToken('d80385666656407bab2a9808a7e21c109cfda1df83a343c3be');
  }, []);

  const testConnection = async () => {
    setTesting(true);
    setMessage('');
    
    try {
      const res = await fetch('/api/green/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId, apiToken })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage(`✅ Connected! Status: ${data.status}`);
      } else {
        setMessage(`❌ ${data.error || 'Connection failed'}`);
      }
    } catch (err) {
      setMessage('❌ Network error - check console');
      console.error(err);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          ⚙️ Green API Settings
        </h1>
        
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('✅') 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message}
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">
            WhatsApp Connection Configuration
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instance ID
              </label>
              <input
                type="text"
                value={instanceId}
                onChange={(e) => setInstanceId(e.target.value)}
                placeholder="e.g., 7103914530"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your Green API instance identifier
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Token
              </label>
              <input
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Your API token"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Keep this secret and secure
              </p>
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                onClick={testConnection}
                disabled={testing || !instanceId || !apiToken}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {testing ? 'Testing...' : '🔌 Test Connection'}
              </button>
              
              <button
                disabled={!instanceId || !apiToken || message !== '✅ Connected! Status: authorized'}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                💾 Save Configuration
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">Connection Status</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">API URL:</span>
              <span className="font-mono text-sm">https://api.green-api.com</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Instance:</span>
              <span className="font-mono text-sm">{instanceId || 'Not configured'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={message.includes('✅') ? 'text-green-600' : 'text-gray-400'}>
                {message.includes('✅') ? 'Connected' : 'Not connected'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}