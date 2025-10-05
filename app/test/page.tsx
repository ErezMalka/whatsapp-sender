export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-green-600 mb-4">✅ העמוד עובד!</h1>
        <p className="text-lg text-gray-700 mb-6">אם אתה רואה את זה, הראוטינג עובד כמו שצריך.</p>
        
        <div className="space-y-4">
          <a 
            href="/login" 
            className="block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            חזור להתחברות
          </a>
          
          <a 
            href="/dashboard" 
            className="block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            נסה Dashboard
          </a>

          <a 
            href="/campaigns" 
            className="block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            נסה Campaigns
          </a>
        </div>
        
        <div className="mt-8 p-4 bg-yellow-100 rounded-lg">
          <p className="text-sm text-gray-600">
            URL נוכחי: <span className="font-mono">{typeof window !== 'undefined' ? window.location.href : ''}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
