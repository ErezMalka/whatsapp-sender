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
  created_at?: string;
  updated_at?: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [preview, setPreview] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [language, setLanguage] = useState('he');
  const [isCreating, setIsCreating] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    category: '',
    content: '',
    language: 'he'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // טעינת תבניות - כרגע משתמשים בנתונים מקומיים
  useEffect(() => {
    loadTemplates();
  }, [language]);

  const loadTemplates = () => {
    setLoading(true);
    
    // נטען תבניות מ-localStorage או נשתמש בדמו
    const savedTemplates = localStorage.getItem('templates');
    if (savedTemplates) {
      const allTemplates = JSON.parse(savedTemplates);
      setTemplates(allTemplates.filter((t: Template) => t.language === language));
    } else {
      loadMockTemplates();
    }
    
    setLoading(false);
  };

  const loadMockTemplates = () => {
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
        name: 'מבצע חדש',
        category: 'מכירות',
        language: 'he',
        content: 'היי {{name}}, יש לנו מבצע מיוחד בשבילך! {{discount}}% הנחה על {{product}}',
        variables: ['name', 'discount', 'product'],
        usage_count: 67
      },
      {
        id: '5',
        name: 'Welcome Message',
        category: 'General',
        language: 'en',
        content: 'Welcome {{name}}! Thank you for joining us.',
        variables: ['name'],
        usage_count: 34
      },
      {
        id: '6',
        name: 'Order Confirmation',
        category: 'Sales',
        language: 'en',
        content: 'Hi {{name}}, your order #{{order}} has been confirmed and will arrive on {{date}}',
        variables: ['name', 'order', 'date'],
        usage_count: 56
      }
    ];
    
    // שמירה ב-localStorage
    localStorage.setItem('templates', JSON.stringify(mockTemplates));
    setTemplates(mockTemplates.filter(t => t.language === language));
  };

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setPreview(template.content);
    const vars: Record<string, string> = {};
    template.variables.forEach(v => {
      vars[v] = '';
    });
    setVariables(vars);
    setIsCreating(false);
  };

  const updatePreview = () => {
    if (!selectedTemplate) return;
    
    let text = selectedTemplate.content;
    Object.entries(variables).forEach(([key, value]) => {
      text = text.replace(new RegExp(`{{${key}}}`, 'g'), value || `{{${key}}}`);
    });
    setPreview(text);
  };

  useEffect(() => {
    updatePreview();
  }, [variables, selectedTemplate]);

  const extractVariables = (content: string): string[] => {
    const matches = content.match(/{{(\w+)}}/g);
    if (!matches) return [];
    
    const vars = matches.map(m => m.replace(/{{|}}/g, ''));
    // Remove duplicates using filter instead of Set
    return vars.filter((value, index, self) => self.indexOf(value) === index);
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setSelectedTemplate(null);
    setNewTemplate({
      name: '',
      category: '',
      content: '',
      language: language
    });
    setError(null);
    setSuccess(null);
  };

  const handleSaveTemplate = () => {
    if (!newTemplate.name || !newTemplate.content || !newTemplate.category) {
      setError(language === 'he' 
        ? 'אנא מלא את כל השדות החובה' 
        : 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    // יצירת תבנית חדשה
    const newTemplateData: Template = {
      id: Date.now().toString(),
      name: newTemplate.name,
      category: newTemplate.category,
      content: newTemplate.content,
      language: newTemplate.language,
      variables: extractVariables(newTemplate.content),
      usage_count: 0,
      created_at: new Date().toISOString()
    };

    // טעינת כל התבניות
    const savedTemplates = localStorage.getItem('templates');
    const allTemplates = savedTemplates ? JSON.parse(savedTemplates) : [];
    
    // הוספת התבנית החדשה
    allTemplates.push(newTemplateData);
    
    // שמירה ב-localStorage
    localStorage.setItem('templates', JSON.stringify(allTemplates));
    
    // עדכון הרשימה המוצגת
    setTemplates(allTemplates.filter((t: Template) => t.language === language));
    
    setSuccess(language === 'he' 
      ? 'התבנית נשמרה בהצלחה!' 
      : 'Template saved successfully!');

    setIsCreating(false);
    setNewTemplate({
      name: '',
      category: '',
      content: '',
      language: 'he'
    });

    setLoading(false);
    
    // הסרת הודעת ההצלחה אחרי 3 שניות
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (!confirm(language === 'he' 
      ? 'האם אתה בטוח שברצונך למחוק תבנית זו?' 
      : 'Are you sure you want to delete this template?')) {
      return;
    }

    // טעינת כל התבניות
    const savedTemplates = localStorage.getItem('templates');
    const allTemplates = savedTemplates ? JSON.parse(savedTemplates) : [];
    
    // סינון התבנית שנמחקה
    const updatedTemplates = allTemplates.filter((t: Template) => t.id !== templateId);
    
    // שמירה מחדש
    localStorage.setItem('templates', JSON.stringify(updatedTemplates));
    
    // עדכון הרשימה המוצגת
    setTemplates(updatedTemplates.filter((t: Template) => t.language === language));

    if (selectedTemplate?.id === templateId) {
      setSelectedTemplate(null);
    }

    setSuccess(language === 'he' 
      ? 'התבנית נמחקה בהצלחה' 
      : 'Template deleted successfully');
    
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleUseTemplate = () => {
    if (!selectedTemplate) return;

    // שמירת התבנית ב-localStorage לשימוש בדף אחר
    localStorage.setItem('selectedTemplateForCampaign', JSON.stringify({
      content: preview,
      originalContent: selectedTemplate.content,
      variables: variables,
      templateName: selectedTemplate.name
    }));

    setSuccess(language === 'he' 
      ? 'התבנית מוכנה לשימוש! ניתן לעבור לדף הקמפיינים' 
      : 'Template is ready to use! You can go to the campaigns page');
    
    // הוספה לספירת השימושים
    const savedTemplates = localStorage.getItem('templates');
    const allTemplates = savedTemplates ? JSON.parse(savedTemplates) : [];
    const updatedTemplates = allTemplates.map((t: Template) => 
      t.id === selectedTemplate.id 
        ? { ...t, usage_count: t.usage_count + 1 } 
        : t
    );
    localStorage.setItem('templates', JSON.stringify(updatedTemplates));
    
    setTimeout(() => setSuccess(null), 5000);
  };

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
              className={`px-4 py-2 rounded transition-colors ${
                language === 'he' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              עברית
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-4 py-2 rounded transition-colors ${
                language === 'en' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">✕</button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex justify-between items-center">
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="text-green-700 hover:text-green-900">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Templates List */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {language === 'he' ? 'תבניות זמינות' : 'Available Templates'}
              </h2>
              <button
                onClick={handleCreateNew}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
              >
                <span>+</span>
                <span>{language === 'he' ? 'חדש' : 'New'}</span>
              </button>
            </div>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {templates.map(template => (
                  <div
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedTemplate?.id === template.id
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:bg-gray-50 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {template.category}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {language === 'he' 
                            ? `${template.usage_count} שימושים`
                            : `${template.usage_count} uses`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {template.variables.length} {language === 'he' ? 'משתנים' : 'vars'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(template.id);
                          }}
                          className="text-red-500 hover:text-red-700 transition-colors p-1"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {templates.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">
                      {language === 'he' 
                        ? 'אין תבניות זמינות' 
                        : 'No templates available'}
                    </p>
                    <button
                      onClick={handleCreateNew}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {language === 'he' ? 'צור תבנית ראשונה' : 'Create your first template'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Template Preview & Variables OR Create New */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              {isCreating 
                ? (language === 'he' ? 'יצירת תבנית חדשה' : 'Create New Template')
                : (language === 'he' ? 'תצוגה מקדימה' : 'Preview')}
            </h2>
            
            {isCreating ? (
              <div className="space-y-4">
                {/* New Template Form */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {language === 'he' ? 'שם התבנית:' : 'Template Name:'}
                  </label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={language === 'he' ? 'הכנס שם לתבנית' : 'Enter template name'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {language === 'he' ? 'קטגוריה:' : 'Category:'}
                  </label>
                  <select
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({...newTemplate, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">
                      {language === 'he' ? 'בחר קטגוריה' : 'Select category'}
                    </option>
                    {categories[language].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {language === 'he' ? 'תוכן ההודעה:' : 'Message Content:'}
                  </label>
                  <textarea
                    value={newTemplate.content}
                    onChange={(e) => setNewTemplate({...newTemplate, content: e.target.value})}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={language === 'he' 
                      ? 'הכנס תוכן... השתמש ב-{{variable}} למשתנים'
                      : 'Enter content... Use {{variable}} for variables'}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {language === 'he' 
                      ? 'דוגמה: שלום {{name}}, ברוכים הבאים!'
                      : 'Example: Hello {{name}}, welcome!'}
                  </p>
                </div>

                {/* Detected Variables */}
                {extractVariables(newTemplate.content).length > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">
                      {language === 'he' ? 'משתנים שזוהו:' : 'Detected variables:'}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {extractVariables(newTemplate.content).map(v => (
                        <span key={v} className="px-2 py-1 bg-white rounded text-sm border border-blue-300">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button 
                    onClick={handleSaveTemplate}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                  >
                    {loading 
                      ? (language === 'he' ? 'שומר...' : 'Saving...')
                      : (language === 'he' ? '💾 שמור תבנית' : '💾 Save Template')}
                  </button>
                  <button 
                    onClick={() => setIsCreating(false)}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    {language === 'he' ? 'ביטול' : 'Cancel'}
                  </button>
                </div>
              </div>
            ) : selectedTemplate ? (
              <div className="space-y-4">
                {/* Template Info */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-800">{selectedTemplate.name}</h3>
                  <p className="text-sm text-gray-600">{selectedTemplate.category}</p>
                </div>

                {/* Variables Input */}
                {selectedTemplate.variables.length > 0 && (
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
                )}

                {/* Preview Box */}
                <div className="mt-6">
                  <h3 className="font-medium text-gray-700 mb-2">
                    {language === 'he' ? 'ההודעה הסופית:' : 'Final Message:'}
                  </h3>
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="whitespace-pre-wrap text-gray-800">{preview}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                  <button 
                    onClick={handleUseTemplate}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    {language === 'he' ? '📤 השתמש בתבנית' : '📤 Use Template'}
                  </button>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(preview);
                      setSuccess(language === 'he' 
                        ? 'הטקסט הועתק!' 
                        : 'Text copied!');
                      setTimeout(() => setSuccess(null), 3000);
                    }}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    {language === 'he' ? '📋 העתק טקסט' : '📋 Copy Text'}
                  </button>
                </div>

                {/* Usage Instructions */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    {language === 'he' 
                      ? '💡 טיפ: לאחר לחיצה על "השתמש בתבנית", עבור לדף הקמפיינים והתבנית תהיה מוכנה לשימוש'
                      : '💡 Tip: After clicking "Use Template", go to the campaigns page and the template will be ready to use'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <p className="text-gray-500 mb-4">
                  {language === 'he' 
                    ? 'בחר תבנית מהרשימה או צור חדשה'
                    : 'Select a template from the list or create a new one'}
                </p>
                <button
                  onClick={handleCreateNew}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  {language === 'he' ? '➕ צור תבנית חדשה' : '➕ Create New Template'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            {language === 'he' ? '📊 סטטיסטיקות' : '📊 Statistics'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{templates.length}</p>
              <p className="text-sm text-gray-600">
                {language === 'he' ? 'סה"כ תבניות' : 'Total Templates'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {templates.reduce((sum, t) => sum + t.usage_count, 0)}
              </p>
              <p className="text-sm text-gray-600">
                {language === 'he' ? 'סה"כ שימושים' : 'Total Uses'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {[...new Set(templates.map(t => t.category))].length}
              </p>
              <p className="text-sm text-gray-600">
                {language === 'he' ? 'קטגוריות' : 'Categories'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {templates.filter(t => t.variables.length > 0).length}
              </p>
              <p className="text-sm text-gray-600">
                {language === 'he' ? 'עם משתנים' : 'With Variables'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
