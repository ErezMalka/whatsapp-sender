'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Campaign {
  id: string;
  name: string;
  message: string;
  recipients: any[];
  recipients_count: number;
  sent_count: number;
  failed_count: number;
  status: string;
  delay: number;
  scheduled_for?: string;
  target_type?: string;
  target_tags?: string[];
  created_at: string;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  tags?: string[];
  group?: string;
}

export default function CampaignsNewPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('create');
  
  const [formData, setFormData] = useState({
    name: '',
    message: '',
    recipients: '',
    delay: 30,
    scheduled_for: '',
    target_type: 'all', // all, manual, tags, groups
    selected_tags: [] as string[],
    selected_groups: [] as string[]
  });

  useEffect(() => {
    loadCampaigns();
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*');
      
      if (error) {
        console.error('Error loading contacts:', error);
        return;
      }
      
      if (data) {
        setContacts(data as Contact[]);
        
        // Extract unique tags and groups
        const tags = new Set<string>();
        const groups = new Set<string>();
        
        data.forEach((contact: Contact) => {
          if (contact.tags) {
            contact.tags.forEach(tag => tags.add(tag));
          }
          if (contact.group) {
            groups.add(contact.group);
          }
        });
        
        setAvailableTags(Array.from(tags));
        setAvailableGroups(Array.from(groups));
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error lo
