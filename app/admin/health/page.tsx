'use client';

import { useState, useEffect } from 'react';

export default function HealthPage() {
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setHealth(data));
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">System Health</h1>
      {health ? (
        <pre className="bg-gray-100 p-4 rounded">
          {JSON.stringify(health, null, 2)}
        </pre>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}