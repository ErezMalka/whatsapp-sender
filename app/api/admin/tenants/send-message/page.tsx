'use client';

import { useState } from 'react';

export default function SendMessagePage() {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState('');

  const sendMessage = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message })
      });
      const data = await res.json();
      setResult(data.success ? '✅ Sent!' : '❌ ' + data.error);
    } catch (err) {
      setResult('❌ Error');
    }
    setSending(false);
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">📤 Send WhatsApp Message</h1>
      
      {result && (
        <div className={`p-4 mb-4 rounded ${
          result.includes('✅') ? 'bg-green-100' : 'bg-red-100'
        }`}>
          {result}
        </div>
      )}
      
      <div className="space-y-4 max-w-lg">
        <input
          type="tel"
          placeholder="Phone (e.g. 0501234567)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full p-2 border rounded"
        />
        
        <textarea
          placeholder="Message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full p-2 border rounded h-32"
        />
        
        <button
          onClick={sendMessage}
          disabled={sending || !phone || !message}
          className="px-6 py-2 bg-green-600 text-white rounded disabled:opacity-50"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}