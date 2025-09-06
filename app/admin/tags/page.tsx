'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

interface Tag {
  id: string;
  tenant_id: string;
  name: string;
  color?: string;
  contacts_count?: number;
  created_at?: string;
}

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const colors = [
    '#EF4444', // אדום
    '#F59E0B', // כתום
    '#10B981', // ירוק
    '#3B82F6', // כחול
    '#8B5CF6', // סגול
    '#EC4899', // ורוד
    '#6B7280', // אפור
    '#059669', // ירוק כהה
  ];

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      setLoading(true);
      
      // קבל תגיות
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .order('name');

      if (tagsError) throw tagsError;

      // ספור כמה אנשי קשר לכל תגית
      const tagsWithCount = await Promise.all(
        (tagsData || []).map(async (tag) => {
          const { count } = await supabase
            .from('contacts')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', TENANT_ID)
            .contains('tags', [tag.name]);

          return {
            ...tag,
            contacts_count: count || 0
          };
        })
      );

      setTags(tagsWithCount);
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTag = async () => {
    if (!newTagName.trim()) {
      alert('נא להזין שם תגית');
      return;
    }

    // בדוק אם התגית כבר קיימת
    if (tags.some(tag => tag.name === newTagName.trim())) {
      alert('תגית זו כבר קיימת');
      return;
    }

    try {
      const { error } = await supabase
        .from('tags')
        .insert([{
          tenant_id: TENANT_ID,
          name: newTagName.trim(),
          color: newTagColor
        }]);

      if (error) throw error;

      setNewTagName('');
      fetchTags();
      alert('התגית נוספה בהצלחה');
    } catch (error) {
      console.error('Error creating tag:', error);
      alert('שגיאה ביצירת תגית');
    }
  };

  const updateTag = async () => {
    if (!editingTag) return;

    try {
      const { error } = await supabase
        .from('tags')
        .update({
          name: editingTag.name,
          color: editingTag.color
        })
        .eq('id', editingTag.id)
        .eq('tenant_id', TENANT_ID);

      if (error) throw error;

      // עדכן את התגית בכל אנשי הקשר
      const { data: contactsWithTag } = await supabase
        .from('contacts')
        .select('id, tags')
        .eq('tenant_id', TENANT_ID)
        .contains('tags', [tags.find(t => t.id === editingTag.id)?.name]);

      if (contactsWithTag && contactsWithTag.length > 0) {
        const originalTagName = tags.find(t => t.id === editingTag.id)?.name;
        
        for (const contact of contactsWithTag) {
          const updatedTags = contact.tags?.map((tag: string) => 
            tag === originalTagName ? editingTag.name : tag
          );
          
          await supabase
            .from('contacts')
            .update({ tags: updatedTags })
            .eq('id', contact.id);
        }
      }

      setEditingTag(null);
      fetchTags();
      alert('התגית עודכנה בהצלחה');
    } catch (error) {
      console.error('Error updating tag:', error);
      alert('שגיאה בעדכון תגית');
    }
  };

  const deleteTag = async (tag: Tag) => {
    if (tag.contacts_count && tag.contacts_count > 0) {
      if (!confirm(`לתגית זו משויכים ${tag.contacts_count} אנשי קשר. האם להסיר את התגית מכולם ולמחוק אותה?`)) {
        return;
      }
    } else {
      if (!confirm('האם אתה בטוח שברצונך למחוק את התגית?')) {
        return;
      }
    }

    try {
      // הסר את התגית מכל אנשי הקשר
      const { data: contactsWithTag } = await supabase
        .from('contacts')
        .select('id, tags')
        .eq('tenant_id', TENANT_ID)
        .contains('tags', [tag.name]);

      if (contactsWithTag && contactsWithTag.length > 0) {
        for (const contact of contactsWithTag) {
          const updatedTags = contact.tags?.filter((t: string) => t !== tag.name);
          
          await supabase
            .from('contacts')
            .update({ tags: updatedTags })
            .eq('id', contact.id);
        }
      }

      // מחק את התגית
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tag.id)
        .eq('tenant_id', TENANT_ID);

      if (error) throw error;

      fetchTags();
      alert('התגית נמחקה בהצלחה');
    } catch (error) {
      console.error('Error deleting tag:', error);
      alert('שגיאה במחיקת תגית');
    }
  };

  if (loading) {
    return <div className="p-8">טוען...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">ניהול תגיות</h1>

      {/* יצירת תגית חדשה */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">הוסף תגית חדשה</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="שם התגית"
            className="flex-1 border p-2 rounded"
            onKeyPress={(e) => e.key === 'Enter' && createTag()}
          />
          <div className="flex gap-1">
            {colors.map(color => (
              <button
                key={color}
                onClick={() => setNewTagColor(color)}
                className={`w-8 h-8 rounded ${newTagColor === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <button
            onClick={createTag}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            הוסף תגית
          </button>
        </div>
      </div>

      {/* רשימת תגיות */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <p className="text-gray-600">סה"כ תגיות: <strong>{tags.length}</strong></p>
        </div>
        
        <div className="p-4">
          {tags.length === 0 ? (
            <p className="text-gray-500 text-center py-8">אין תגיות עדיין</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tags.map(tag => (
                <div key={tag.id} className="border rounded-lg p-4">
                  {editingTag?.id === tag.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editingTag.name}
                        onChange={(e) => setEditingTag({...editingTag, name: e.target.value})}
                        className="w-full border p-1 rounded"
                      />
                      <div className="flex gap-1">
                        {colors.map(color => (
                          <button
                            key={color}
                            onClick={() => setEditingTag({...editingTag, color})}
                            className={`w-6 h-6 rounded ${editingTag.color === color ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={updateTag}
                          className="text-green-600 hover:underline text-sm"
                        >
                          שמור
                        </button>
                        <button
                          onClick={() => setEditingTag(null)}
                          className="text-gray-600 hover:underline text-sm"
                        >
                          ביטול
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: tag.color || '#3B82F6' }}
                          />
                          <span className="font-medium">{tag.name}</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {tag.contacts_count} אנשי קשר
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingTag(tag)}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          ערוך
                        </button>
                        <button
                          onClick={() => deleteTag(tag)}
                          className="text-red-600 hover:underline text-sm"
                        >
                          מחק
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
