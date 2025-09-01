'use client';

import { useState, useEffect } from 'react';

interface Template {
  id: string;
  name: string;
  category: string;
  language: string;
  content: string;
  variables: string[];
  usage_count: number;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [preview, setPreview] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [language, setLanguage] = useState('he');

  // תבניות מקומיות לדוגמה (בהמשך נביא מה-DB)
  useEffect(() => {
    const mockTemplates: Template[] = [
      {
        id: '1',
        name: 'ברכת יום הולדת',
        category: 'ברכות',
        language: 'he',
        content: 'שלום {{name}}, מאחלים לך יום הולדת שמח! 🎂',
        variables: ['name'],
        usage_count: 45
      },
      {
        id: '2',
        name: 'תזכורת לתור',
        category: 'תזכורות',
        language: 'he',
        content: 'שלום {{name}}, זוהי תזכורת לתור שלך ב-{{date}} בשעה {{time}}',
        variables: ['name', 'date', 'time'],
        usage_count: 120
      },
      {
        id: '3',
        name: 'אישור הזמנה',
        category: 'מכירות',
        language: 'he',
        content: 'תודה {{name}}! הזמנתך מספר #{{order}} התקבלה בהצלחה.',
        variables: ['name', 'order'],
        usage_count: 89
      },
      {
        id: '4',
        name: 'Welcome Message',
        category: 'General',
        language: 'en',
        content: 'Welcome {{name}}! Thank you for joining us.',
        variables: ['name'],
        usage_count: 34
      }
    ];
    
    setTemplates(mockTemplates.filter(t => t.language === language));
  }, [language]);

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setPreview(template.content);
    const vars: Record<string, string> = {};
    template.variables.forEach(v => {
      vars[v] = '';
    });
    setVariables(vars);
  };

  const updatePreview = () => {
    if (!selectedTemplate) return;
    
    let text = selectedTemplate.content;
    Object.entries(variables).forEach(([key, value]) => {
      text = text.replace(`{{${key}}}`, value || `{{${key}}}`);
    });
    setPreview(text);
  };

  useEffect(() => {
    updatePreview();
  }, [variables]);

  const categories = {
    he: ['ברכות', 'תזכורות', 'מכירות', 'שירות', 'כללי'],
    en: ['Greetings', 'Reminders', 'Sales', 'Service', 'General']
  };

  return (
    <div className="min-h-screen bg-gray-50" dir={language === 'he' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {language === 'he' ? '📝 ניהול תבניות' : '📝 Template Management'}
          </h1>
          
          {/* Language Switcher */}
          <div className="flex gap-2">
            <button
              onClick={() => setLanguage('he')}
              className={`px-4 py-2 rounded ${
                language === 'he' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              עברית
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-4 py-2 rounded ${
                language === 'en' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              English
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Templates List */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              {language === 'he' ? 'תבניות זמינות' : 'Available Templates'}
            </h2>
            
            <div className="space-y-2">
              {templates.map(template => (
                <div
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{template.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {template.category}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {language === 'he' 
                          ? `${template.usage_count} שימושים`
                          : `${template.usage_count} uses`}
                      </p>
                    </div>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {template.variables.length} {language === 'he' ? 'משתנים' : 'vars'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Template Preview & Variables */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              {language === 'he' ? 'תצוגה מקדימה' : 'Preview'}
            </h2>
            
            {selectedTemplate ? (
              <div className="space-y-4">
                {/* Variables Input */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-700">
                    {language === 'he' ? 'משתנים:' : 'Variables:'}
                  </h3>
                  {selectedTemplate.variables.map(variable => (
                    <div key={variable}>
                      <label className="block text-sm text-gray-600 mb-1">
                        {variable}:
                      </label>
                      <input
                        type="text"
                        value={variables[variable] || ''}
                        onChange={(e) => setVariables({
                          ...variables,
                          [variable]: e.target.value
                        })}
                        placeholder={`${language === 'he' ? 'הכנס' : 'Enter'} ${variable}`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>

                {/* Preview Box */}
                <div className="mt-6">
                  <h3 className="font-medium text-gray-700 mb-2">
                    {language === 'he' ? 'ההודעה הסופית:' : 'Final Message:'}
                  </h3>
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="whitespace-pre-wrap">{preview}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                  <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    {language === 'he' ? '💾 שמור תבנית' : '💾 Save Template'}
                  </button>
                  <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    {language === 'he' ? '📤 שלח הודעה' : '📤 Send Message'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                {language === 'he' 
                  ? 'בחר תבנית מהרשימה'
                  : 'Select a template from the list'}
              </p>
            )}
          </div>
        </div>

        {/* Create New Template Button */}
        <div className="mt-6 text-center">
          <button className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            {language === 'he' ? '➕ צור תבנית חדשה' : '➕ Create New Template'}
          </button>
        </div>
      </div>
    </div>
  );
}