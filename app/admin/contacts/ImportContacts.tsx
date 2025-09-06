'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface ImportContactsProps {
  onImportComplete: () => void;
  tenantId: string;
}

interface ContactData {
  name: string;
  phone: string;
  email?: string | null;
  tags?: string[];
  status: string;
  opt_out: boolean;
  tenant_id: string;
}

export default function ImportContacts({ onImportComplete, tenantId }: ImportContactsProps) {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<ContactData[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrors([]);
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    try {
      let data: any[] = [];

      if (fileExtension === 'csv') {
        const text = await file.text();
        const result = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
        });
        data = result.data;
      } else if (['xlsx', 'xls'].includes(fileExtension || '')) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(firstSheet);
      } else {
        throw new Error('פורמט קובץ לא נתמך. השתמש ב-CSV או Excel');
      }

      const normalizedData: ContactData[] = data.map((row, index) => ({
        name: row['שם'] || row['name'] || row['Name'] || `איש קשר ${index + 1}`,
        phone: normalizePhone(
          row['טלפון'] || row['phone'] || row['Phone'] || 
          row['נייד'] || row['mobile'] || row['Mobile'] || ''
        ),
        email: row['אימייל'] || row['email'] || row['Email'] || null,
        tags: parseTags(row['תגיות'] || row['tags'] || row['Tags']),
        status: row['סטטוס'] || row['status'] || 'active',
        opt_out: false,
        tenant_id: tenantId
      })).filter(contact => contact.phone);

      setPreview(normalizedData.slice(0, 100));
      setShowPreview(true);

    } catch (error: any) {
      console.error('Error parsing file:', error);
      setErrors(['שגיאה בקריאת הקובץ: ' + error.message]);
    }
  };

  const normalizePhone = (phone: string): string => {
    let cleaned = phone.toString().replace(/\D/g, '');
    
    if (cleaned.startsWith('0')) {
      cleaned = '972' + cleaned.substring(1);
    } else if (!cleaned.startsWith('972')) {
      cleaned = '972' + cleaned;
    }
    
    return '+' + cleaned;
  };

  const parseTags = (tagsString: string | undefined): string[] => {
    if (!tagsString) return [];
    return tagsString.split(',').map(tag => tag.trim()).filter(Boolean);
  };

  const performImport = async () => {
    if (preview.length === 0) {
      setErrors(['אין נתונים לייבוא']);
      return;
    }

    setImporting(true);
    setProgress(0);
    const importErrors: string[] = [];
    let successCount = 0;
    let skipCount = 0;
    let updateCount = 0;

    try {
      const { data: existingContacts } = await supabase
        .from('contacts')
        .select('phone')
        .eq('tenant_id', tenantId);

      const existingPhones = new Set(existingContacts?.map(c => c.phone) || []);

      const batchSize = 10;
      for (let i = 0; i < preview.length; i += batchSize) {
        const batch = preview.slice(i, i + batchSize);
        const newContacts = batch.filter(contact => !existingPhones.has(contact.phone));
        const existingToUpdate = batch.filter(contact => existingPhones.has(contact.phone));

        if (newContacts.length > 0) {
          const { error } = await supabase
            .from('contacts')
            .insert(newContacts);

          if (error) {
            console.error('Batch insert error:', error);
            importErrors.push(`שגיאה בהוספת אנשי קשר: ${error.message}`);
            skipCount += newContacts.length;
          } else {
            successCount += newContacts.length;
          }
        }

        for (const contact of existingToUpdate) {
          const { error } = await supabase
            .from('contacts')
            .update({
              name: contact.name,
              email: contact.email,
              tags: contact.tags,
              status: contact.status
            })
            .eq('phone', contact.phone)
            .eq('tenant_id', tenantId);

          if (error) {
            console.error(`Error updating contact ${contact.name}:`, error);
            skipCount++;
          } else {
            updateCount++;
          }
        }

        setProgress(Math.round(((i + batch.length) / preview.length) * 100));
      }

      const summary = `
ייבוא הושלם!
✅ נוספו: ${successCount} אנשי קשר חדשים
🔄 עודכנו: ${updateCount} אנשי קשר קיימים
⏭️ דילוגים: ${skipCount}
${importErrors.length > 0 ? `\n⚠️ שגיאות:\n${importErrors.slice(0, 5).join('\n')}` : ''}
      `.trim();
      
      alert(summary);
      onImportComplete();
      
      setShowPreview(false);
      setPreview([]);
      setErrors([]);
      
    } catch (error: any) {
      console.error('Import error:', error);
      setErrors(['שגיאה כללית בייבוא: ' + error.message]);
    } finally {
      setImporting(false);
      setProgress(0);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white">
      <h3 className="text-lg font-semibold mb-4">ייבוא אנשי קשר מקובץ</h3>
      
      {!showPreview ? (
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              בחר קובץ CSV או Excel
            </label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>
          
          <div className="bg-gray-50 p-3 rounded text-sm text-gray-600">
            <p className="font-medium mb-2">📋 הקובץ צריך להכיל את העמודות הבאות:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>שם / Name</strong> - שם איש הקשר</li>
              <li><strong>טלפון / Phone</strong> - מספר טלפון (חובה)</li>
              <li><strong>אימייל / Email</strong> - כתובת אימייל (אופציונלי)</li>
              <li><strong>תגיות / Tags</strong> - תגיות מופרדות בפסיק (אופציונלי)</li>
            </ul>
            <p className="mt-2 text-xs">💡 טיפ: המערכת מנרמלת מספרי טלפון אוטומטית לפורמט בינלאומי</p>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <h4 className="font-medium mb-2">
              תצוגה מקדימה - {preview.length} אנשי קשר לייבוא
            </h4>
            <div className="overflow-x-auto max-h-60 border rounded">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-right">#</th>
                    <th className="px-3 py-2 text-right">שם</th>
                    <th className="px-3 py-2 text-right">טלפון</th>
                    <th className="px-3 py-2 text-right">אימייל</th>
                    <th className="px-3 py-2 text-right">תגיות</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {preview.slice(0, 10).map((contact, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                      <td className="px-3 py-2">{contact.name}</td>
                      <td className="px-3 py-2" dir="ltr">{contact.phone}</td>
                      <td className="px-3 py-2">{contact.email || '-'}</td>
                      <td className="px-3 py-2">{contact.tags?.join(', ') || '-'}</td>
                    </tr>
                  ))}
                  {preview.length > 10 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-2 text-center text-gray-500">
                        ... ועוד {preview.length - 10} אנשי קשר
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={performImport}
              disabled={importing}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? `מייבא... ${progress}%` : `🚀 ייבא ${preview.length} אנשי קשר`}
            </button>
            <button
              onClick={() => {
                setShowPreview(false);
                setPreview([]);
                setErrors([]);
              }}
              disabled={importing}
              className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400 disabled:opacity-50"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          <p className="font-medium mb-1">❌ שגיאות:</p>
          <ul className="list-disc list-inside text-sm">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {importing && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>מעבד נתונים...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
