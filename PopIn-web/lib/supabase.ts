import { createClient } from '@supabase/supabase-js';

const url = 'https://uzcjjgziqotacqimedcp.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(url, key || 'placeholder');

export const SUPABASE_CONFIGURED = !!key;

export type Profile = {
  id: string;
  name: string;
  friend_code: string;
  avatar: string;
  website: string;
  home_location: string;
  status: string;
  lat: number | null;
  lng: number | null;
};

export type Plan = {
  id: string;
  creator_id: string;
  title: string;
  date: string;
  time: string;
  note: string;
  created_at: string;
};

export type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  text: string;
  created_at: string;
};
