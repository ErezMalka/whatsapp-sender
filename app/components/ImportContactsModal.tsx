// app/components/ImportContactsModal.tsx
'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ImportContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  existingTags: string[];
}

interface ParsedContact {
  name: string;
  phone: string;
  email?: string;
  tags?: string[];
  notes?: string;
  isValid: boolean;
  errors: string[];
}

export default function ImportContactsModal({
  isOpen,
  onClose,
  onImportComplete,
  existingTags
}: ImportContactsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedContact[]>([]);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload');
  const [importResults, setImportResults] = useState({
    total: 0,
    success: 0,
    failed: 0,
    duplicates: 0
  });

  // Parse CSV file
  const parseCSV = (text: string): ParsedContact[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    
    // מיפוי עמודות
    const nameIndex = headers.findIndex(h => h.includes('name') || h.includes('שם'));
    const phoneIndex = headers.findIndex(h => h.includes('phone') || h.includes('טלפון'));
    const emailIndex = headers.findIndex(h => h.includes('email') || h.includes('אימייל'));
    const tagsIndex = headers.findIndex(h => h.includes('tag') || h.includes('תגית'));
    const notesIndex = headers.findIndex(h => h.includes('note') || h.includes('הער'));

    const contacts: ParsedContact[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const errors: string[] = [];
      
      let phone = phoneIndex >= 0 ? values[phoneIndex] : '';
      
      // נרמול מספר טלפון
      if (phone) {
        // הסר תווים לא רלוונטיים
        phone = phone.replace(/[\s\-\(\)]/g, '');
        
        // המר 0 בהתחלה ל-+972
        if (phone.startsWith('0')) {
          phone = '+972' + phone.substring(1);
        }
        
        // הוסף + אם חסר
        if (!phone.startsWith('+') && phone.match(/^\d/)) {
          phone = '+' + phone;
        }
        
        // ולידציה
        if (!phone.match(/^\+972\d{9}$/)) {
          errors.push('מספר טלפון לא תקין (דרוש: +972XXXXXXXXX)');
        }
      } else {
        errors.push('חסר מספר טלפון');
      }
      
      const name = nameIndex >= 0 ? values[nameIndex] : '';
      if (!name) {
        errors.push('חסר שם');
      }
      
      const contact: ParsedContact = {
        name: name || '',
        phone: phone || '',
        email: emailIndex >= 0 ? values[emailIndex] : undefined,
        tags: tagsIndex >= 0 && values[tagsIndex] 
          ? values[tagsIndex].split(';').map(t => t.trim()).filter(t => t)
          : [],
        notes: notesIndex >= 0 ? values[notesIndex] : undefined,
        isValid: errors.length === 0,
        errors
      };
      
      contacts.push(contact);
    }
    
    return contacts;
  };

  // Handle file selection
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    
    // Read and parse file
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      
      if (selectedFile.name.endsWith('.csv')) {
        const parsed = parseCSV(text);
        setParsedData(parsed);
        setStep('preview');
      } else if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        // TODO: Add Excel parsing with SheetJS
        alert('תמיכה ב-Excel תתווסף בקרוב. כרגע השתמש ב-CSV');
      }
    };
    
    reader.readAsText(selectedFile);
  }, []);

  // Import contacts to database
  const importContacts = async () => {
    setImporting(true);
    setStep('importing');
    
    const results = {
      total: parsedData.length,
      success: 0,
      failed: 0,
      duplicates: 0
    };
    
    // מסנן רק אנשי קשר תקינים
    const validContacts = parsedData.filter(c => c.isValid);
    
    // מייבא בקבוצות של 10
    const batchSize = 10;
    for (let i = 0; i < validContacts.length; i += batchSize) {
      const batch = validContacts.slice(i, i + batchSize);
      
      try {
        const { data, error } = await supabase
          .from('contacts')
          .insert(
            batch.map(contact => ({
              tenant_id: '00000000-0000-0000-0000-000000000001',
              name: contact.name,
              phone: contact.phone,
              email: contact.email,
              tags: contact.tags,
              notes: contact.notes,
              source: 'import',
              status: 'active'
            }))
          )
          .select();
        
        if (error) {
          if (error.code === '23505') {
            results.duplicates += batch.length;
          } else {
            results.failed += batch.length;
          }
        } else {
          results.success += data?.length || 0;
        }
      } catch (error) {
        console.error('Import error:', error);
        results.failed += batch.length;
      }
    }
    
    results.failed += parsedData.filter(c => !c.isValid).length;
    
    setImportResults(results);
    setStep('complete');
    setImporting(false);
    
    // Refresh contacts list
    setTimeout(() => {
      onImportComplete();
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">ייבוא אנשי קשר</h2>
        
        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-600 mb-2">גרור קובץ או לחץ לבחירה</p>
              <p className="text-xs text-gray-500 mb-4">CSV (Excel בקרוב)</p>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                id="file-upload-import"
                onChange={handleFileSelect}
              />
              <label
                htmlFor="file-upload-import"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"
              >
                בחר קובץ
              </label>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">📋 פורמט קובץ CSV:</h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p className="font-semibold">שורה ראשונה - כותרות (באנגלית או עברית):</p>
                <code className="block bg-white p-2 rounded" dir="ltr">
                  name,phone,email,tags,notes
                </code>
                <p className="mt-2">או:</p>
                <code className="block bg-white p-2 rounded">
                  שם,טלפון,אימייל,תגיות,הערות
                </code>
              </div>
              <div className="mt-3 text-sm text-blue-700">
                <p className="font-semibold">דוגמה:</p>
                <code className="block bg-white p-2 rounded text-xs" dir="ltr">
                  יוסי כהן,0501234567,yossi@example.com,לקוחות;VIP,לקוח חשוב<br/>
                  שרה לוי,050-234-5678,sara@example.com,חדשים,<br/>
                  דני גולד,+972503456789,,ספקים,ספק ציוד
                </code>
              </div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="font-medium text-yellow-900 mb-2">⚠️ שים לב:</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• מספרי טלפון יומרו אוטומטית לפורמט +972</li>
                <li>• תגיות מופרדות בנקודה-פסיק (;)</li>
                <li>• כפילויות (לפי מספר טלפון) לא ייובאו</li>
                <li>• קידוד הקובץ צריך להיות UTF-8</li>
              </ul>
            </div>
          </div>
        )}
        
        {/* Step 2: Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">תצוגה מקדימה</h3>
              <div className="text-sm text-gray-600">
                {parsedData.filter(c => c.isValid).length} / {parsedData.length} תקינים
              </div>
            </div>
            
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-right">סטטוס</th>
                    <th className="px-3 py-2 text-right">שם</th>
                    <th className="px-3 py-2 text-right">טלפון</th>
                    <th className="px-3 py-2 text-right">אימייל</th>
                    <th className="px-3 py-2 text-right">תגיות</th>
                    <th className="px-3 py-2 text-right">הערות</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {parsedData.slice(0, 100).map((contact, index) => (
                    <tr key={index} className={contact.isValid ? '' : 'bg-red-50'}>
                      <td className="px-3 py-2">
                        {contact.isValid ? (
                          <span className="text-green-600">✅</span>
                        ) : (
                          <span className="text-red-600" title={contact.errors.join(', ')}>❌</span>
                        )}
                      </td>
                      <td className="px-3 py-2">{contact.name}</td>
                      <td className="px-3 py-2" dir="ltr">{contact.phone}</td>
                      <td className="px-3 py-2">{contact.email || '-'}</td>
                      <td className="px-3 py-2">
                        {contact.tags?.map(tag => (
                          <span key={tag} className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs mr-1">
                            {tag}
                          </span>
                        ))}
                      </td>
                      <td className="px-3 py-2 text-xs">{contact.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedData.length > 100 && (
                <div className="text-center py-2 text-sm text-gray-500">
                  מציג 100 מתוך {parsedData.length} רשומות
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center pt-4">
              <button
                onClick={() => {
                  setStep('upload');
                  setParsedData([]);
                  setFile(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                חזור
              </button>
              <button
                onClick={importContacts}
                disabled={parsedData.filter(c => c.isValid).length === 0}
                className={`px-6 py-2 rounded-lg text-white ${
                  parsedData.filter(c => c.isValid).length > 0
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                ייבא {parsedData.filter(c => c.isValid).length} אנשי קשר
              </button>
            </div>
          </div>
        )}
        
        {/* Step 3: Importing */}
        {step === 'importing' && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-lg">מייבא אנשי קשר...</p>
            <p className="text-sm text-gray-600 mt-2">אנא המתן</p>
          </div>
        )}
        
        {/* Step 4: Complete */}
        {step === 'complete' && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">
              {importResults.success > 0 ? '✅' : '⚠️'}
            </div>
            <h3 className="text-xl font-bold mb-4">הייבוא הושלם</h3>
            <div className="space-y-2 text-lg">
              <p>סה״כ: {importResults.total}</p>
              <p className="text-green-600">הצליחו: {importResults.success}</p>
              {importResults.duplicates > 0 && (
                <p className="text-yellow-600">כפילויות: {importResults.duplicates}</p>
              )}
              {importResults.failed > 0 && (
                <p className="text-red-600">נכשלו: {importResults.failed}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              סגור
            </button>
          </div>
        )}
        
        {/* Close button */}
        {step !== 'importing' && step !== 'complete' && (
          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              ביטול
            </button>
          </div>
        )}
      </div>
    </div>
  );
}