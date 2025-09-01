'use client';

import { useState } from 'react';

export default function WebhookSetupPage() {
  const [setting, setSetting] = useState(false);
  const [message, setMessage] = useState('');
  
  // הכתובת של ה-Webhook שלך
  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/green/webhook`
    : '';

  const setupWebhook = async () => {
    setSetting(true);
    setMessage('');
    
    try {
      // קריאה ל-Green API להגדרת webhook
      const instanceId = '7103914530';
      const apiToken = 'd80385666656407bab2a9808a7e21c109cfda1df83a343c3be';
      
      const response = await fetch(
        `https://api.green-api.com/waInstance${instanceId}/setSettings/${apiToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            webhookUrl: webhookUrl,
            outgoingWebhook: 'yes',
            stateWebhook: 'yes',
            incomingWebhook: 'yes',
            deviceWebhook: 'yes'
          })
        }
      );

      const data = await response.json();
      
      if (response.ok && data.saveSettings) {
        setMessage('✅ Webhook configured successfully!');
      } else {
        setMessage('❌ Failed to configure webhook');
        console.error(data);
      }
    } catch (error) {
      setMessage('❌ Error setting up webhook');
      console.error(error);
    } finally {
      setSetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🔗 Webhook Setup
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

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Webhook Configuration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Webhook URL:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={webhookUrl}
                  readOnly
                  className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(webhookUrl)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  📋 Copy
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This URL will receive all WhatsApp events
              </p>
            </div>

            <div className="pt-4">
              <button
                onClick={setupWebhook}
                disabled={setting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {setting ? 'Setting up...' : '🚀 Configure Webhook in Green API'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Webhook Events</h3>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="checkbox" checked readOnly className="mr-2" />
              <span>📥 Incoming Messages</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" checked readOnly className="mr-2" />
              <span>📤 Outgoing Message Status</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" checked readOnly className="mr-2" />
              <span>🔄 State Changes</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" checked readOnly className="mr-2" />
              <span>📱 Device Events</span>
            </label>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
          <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Important Notes:</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Make sure your app is publicly accessible (not localhost)</li>
            <li>• For testing locally, use ngrok or similar tunneling service</li>
            <li>• The webhook URL must be HTTPS in production</li>
            <li>• Check the terminal/console for incoming webhook events</li>
          </ul>
        </div>
      </div>
    </div>
  );
}