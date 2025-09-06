// app/admin/contacts/ImportContacts.tsx
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface ImportContactsProps {
  onImportComplete: () => void;
  tenantId: string;
}

export default function ImportContacts({ onImportComplete, tenantId }: ImportContactsProps) {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrors([]);
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    try {
      let data: any[] = [];

      if (fileExtension === 'csv') {
        // Parse CSV
        const text = await file.text();
        const result = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
        });
        data = result.data;
      } else if (['xlsx', 'xls'].includes(fileExtension || '')) {
        // Parse Excel
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(firstSheet);
      } else {
        throw new Error('פורמט קובץ לא נתמך. השתמש ב-CSV או Excel');
      }

      // נרמול הנתונים
      const normalizedData = data.map((row, index) => ({
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
      })).filter(contact => contact.phone); // סינון רשומות ללא טלפון

      setPreview(normalizedData.slice(0, 5));
      setShowPreview(true);

    } catch (error) {
      console.error('Error parsing file:', error);
      setErrors(['שגיאה בקריאת הקובץ: ' + error.message]);
    }
  };

  const normalizePhone = (phone: string): string => {
    // הסרת כל התווים שאינם ספרות
    let cleaned = phone.replace(/\D/g, '');
    
    // הוספת קידומת ישראל אם חסרה
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
    const errors: string[] = [];
    let successCount = 0;
    let skipCount = 0;
    let updateCount = 0;

    try {
      // בדיקת אנשי קשר קיימים
      const { data: existingContacts } = await supabase
        .from('contacts')
        .select('phone')
        .eq('tenant_id', tenantId);

      const existingPhones = new Set(existingContacts?.map(c => c.phone));

      for (let i = 0; i < preview.length; i++) {
        const contact = preview[i];
        
        try {
          if (existingPhones.has(contact.phone)) {
            // עדכון איש קשר קיים - אופציונלי
            const { error } = await supabase
              .from('contacts')
              .update({
                name: contact.name,
                email: contact.email,
                tags: contact.tags,
                updated_at: new Date().toISOString()
              })
              .eq('phone', contact.phone)
              .eq('tenant_id', tenantId);

            if (error) throw error;
            updateCount++;
          } else {
            // הוספת איש קשר חדש
            const { error } = await supabase
              .from('contacts')
              .insert([contact]);

            if (error) throw error;
            successCount++;
          }
        } catch (error) {
          console.error(`Error importing contact ${contact.name}:`, error);
          errors.push(`${contact.name} (${contact.phone}): ${error.message}`);
          skipCount++;
        }

        setProgress(Math.round(((i + 1) / preview.length) * 100));
      }

      // הודעת סיכום
      alert(`
        ייבוא הושלם!
        נוספו: ${successCount} אנשי קשר חדשים
        עודכנו: ${updateCount} אנשי קשר קיימים
        דילוגים: ${skipCount}
        ${errors.length > 0 ? `\nשגיאות:\n${errors.join('\n')}` : ''}
      `);

      onImportComplete();
      setShowPreview(false);
      setPreview([]);
      
    } catch (error) {
      console.error('Import error:', error);
      setErrors(['שגיאה כללית בייבוא: ' + error.message]);
    } finally {
      setImporting(false);
      setProgress(0);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white">
      <h3 className="text-lg font-semibold mb-4">ייבוא אנשי קשר</h3>
      
      {!showPreview ? (
        <div>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            className="mb-4"
          />
          <div className="text-sm text-gray-600 mb-2">
            <p>הקובץ צריך להכיל עמודות:</p>
            <ul className="list-disc list-inside">
              <li>שם / Name</li>
              <li>טלפון / Phone (חובה)</li>
              <li>אימייל / Email (אופציונלי)</li>
              <li>תגיות / Tags (מופרדות בפסיק, אופציונלי)</li>
            </ul>
          </div>
        </div>
      ) : (
        <div>
          <h4 className="font-medium mb-2">תצוגה מקדימה ({preview.length} רשומות)</h4>
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-2 py-1 text-right">שם</th>
                  <th className="px-2 py-1 text-right">טלפון</th>
                  <th className="px-2 py-1 text-right">אימייל</th>
                  <th className="px-2 py-1 text-right">תגיות</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 5).map((contact, index) => (
                  <tr key={index} className="border-b">
                    <td className="px-2 py-1">{contact.name}</td>
                    <td className="px-2 py-1">{contact.phone}</td>
                    <td className="px-2 py-1">{contact.email || '-'}</td>
                    <td className="px-2 py-1">{contact.tags?.join(', ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <button
              onClick={performImport}
              disabled={importing}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {importing ? `מייבא... ${progress}%` : `ייבא ${preview.length} אנשי קשר`}
            </button>
            <button
              onClick={() => {
                setShowPreview(false);
                setPreview([]);
              }}
              disabled={importing}
              className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-4 p-2 bg-red-100 text-red-700 rounded">
          <p className="font-medium">שגיאות:</p>
          <ul className="list-disc list-inside text-sm">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {importing && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
