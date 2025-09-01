'use client';

import { useState } from 'react';

export default function SendMessagePage() {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState('');

  const sendMessage = async () => {
    if (!phone || !message) {
      setResult('❌ Please fill in all fields');
      return;
    }

    setSending(true);
    setResult('');

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message })
      });

      const data = await response.json();

      if (data.success) {
        setResult(`✅ Message sent successfully!`);
        setMessage(''); // Clear message after sending
      } else {
        setResult(`❌ ${data.error || 'Failed to send'}`);
      }
    } catch (error) {
      setResult('❌ Network error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">📤 Send WhatsApp Message</h1>

        {result && (
          <div className={`p-4 mb-6 rounded-lg ${
            result.includes('✅') 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {result}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="972501234567 or 0501234567"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={sending}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter with or without country code
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={sending}
              />
              <p className="text-xs text-gray-500 mt-1">
                {message.length} characters
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={sendMessage}
                disabled={sending || !phone || !message}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? 'Sending...' : 'Send Message'}
              </button>

              <button
                onClick={() => {
                  setPhone('');
                  setMessage('');
                  setResult('');
                }}
                disabled={sending}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Quick Templates */}
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h3 className="font-semibold mb-3">Quick Templates</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMessage('שלום! זוהי הודעת בדיקה.')}
              className="p-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
            >
              Test Hebrew
            </button>
            <button
              onClick={() => setMessage('Hello! This is a test message.')}
              className="p-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
            >
              Test English
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}