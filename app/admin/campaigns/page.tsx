'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// הגדרת טיפוסים
interface Contact {
  id: string;
  name: string;
  phone: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

interface Campaign {
  id: string;
  name: string;
  message: string;
  status: 'draft' | 'active' | 'completed';
  created_at: string;
  updated_at: string;
  selected_tags?: string[];
  selected_contacts?: string[];
}

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    message: '',
    selectedTags: [] as string[],
    selectedContacts: [] as string[]
  });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaigns();
    fetchContactsAndTags();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const fetchContactsAndTags = async () => {
    try {
      const { data: contactsData, error } = await supabase
        .from('contacts')
        .select('*');

      if (error) throw error;

      setContacts(contactsData || []);
      
      // אוסף את כל הטאגים הייחודיים עם טיפוס מפורש
      const allTags = new Set<string>();
      contactsData?.forEach((contact: Contact) => {
        contact.tags?.forEach((tag: string) => allTags.add(tag));
      });
      setTags(Array.from(allTags));
      
    } catch (err) {
      console.error('Error fetching contacts:', err);
    }
  };

  const handleCreateCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          name: newCampaign.name,
          message: newCampaign.message,
          status: 'draft',
          selected_tags: newCampaign.selectedTags,
          selected_contacts: newCampaign.selectedContacts
        })
        .select()
        .single();

      if (error) throw error;

      setCampaigns([data, ...campaigns]);
      setShowNewCampaign(false);
      setNewCampaign({
        name: '',
        message: '',
        selectedTags: [],
        selectedContacts: []
      });
    } catch (err) {
      console.error('Error creating campaign:', err);
      setError('Failed to create campaign');
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCampaigns(campaigns.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting campaign:', err);
      setError('Failed to delete campaign');
    }
  };

  const getContactsByTags = () => {
    if (newCampaign.selectedTags.length === 0) return [];
    
    return contacts.filter((contact: Contact) => 
      contact.tags?.some((tag: string) => 
        newCampaign.selectedTags.includes(tag)
      )
    );
  };

  const handleTagSelection = (tag: string) => {
    setNewCampaign(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter(t => t !== tag)
        : [...prev.selectedTags, tag]
    }));
  };

  const handleContactSelection = (contactId: string) => {
    setNewCampaign(prev => ({
      ...prev,
      selectedContacts: prev.selectedContacts.includes(contactId)
        ? prev.selectedContacts.filter(id => id !== contactId)
        : [...prev.selectedContacts, contactId]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading campaigns...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Campaigns</h1>
        <button
          onClick={() => setShowNewCampaign(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          New Campaign
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* New Campaign Form */}
      {showNewCampaign && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">Create New Campaign</h2>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Campaign Name
            </label>
            <input
              type="text"
              value={newCampaign.name}
              onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Enter campaign name"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Message
            </label>
            <textarea
              value={newCampaign.message}
              onChange={(e) => setNewCampaign({ ...newCampaign, message: e.target.value })}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              rows={4}
              placeholder="Enter your message"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Select Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag: string) => (
                <button
                  key={tag}
                  onClick={() => handleTagSelection(tag)}
                  className={`px-3 py-1 rounded ${
                    newCampaign.selectedTags.includes(tag)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {newCampaign.selectedTags.length > 0 && (
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Contacts to receive message ({getContactsByTags().length})
              </label>
              <div className="max-h-40 overflow-y-auto border rounded p-2">
                {getContactsByTags().map((contact: Contact) => (
                  <div key={contact.id} className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      checked={newCampaign.selectedContacts.includes(contact.id)}
                      onChange={() => handleContactSelection(contact.id)}
                    />
                    <span>{contact.name} - {contact.phone}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleCreateCampaign}
              disabled={!newCampaign.name || !newCampaign.message}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
            >
              Create Campaign
            </button>
            <button
              onClick={() => {
                setShowNewCampaign(false);
                setNewCampaign({
                  name: '',
                  message: '',
                  selectedTags: [],
                  selectedContacts: []
                });
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Campaigns List */}
      <div className="grid gap-4">
        {campaigns.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No campaigns yet. Create your first campaign!
          </div>
        ) : (
          campaigns.map((campaign: Campaign) => (
            <div key={campaign.id} className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold mb-2">{campaign.name}</h3>
                  <p className="text-gray-600 mb-2">{campaign.message}</p>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>Status: {campaign.status}</span>
                    <span>Created: {new Date(campaign.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/admin/campaigns/${campaign.id}`)}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleDeleteCampaign(campaign.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
