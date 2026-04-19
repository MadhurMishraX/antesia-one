import { createClient } from '@supabase/supabase-js';
import { CONFIG } from '../config';

const supabaseUrl = CONFIG.supabase.url || '';
const supabaseAnonKey = CONFIG.supabase.anonKey || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Please check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.sessionStorage, // RAM-only storage: clear session on tab/browser close
    persistSession: true,
    autoRefreshToken: true
  }
});

// 🌌 Antesia - Developed by Madhur Mishra (github: MadhurMishraX)

export type UserRole = 'teacher' | 'student' | 'admin';

export interface Profile {
  id: string;
  role: UserRole;
  login_id: string;
  full_name: string;
  profile_photo_url: string | null;
  is_anonymous_on_leaderboard: boolean;
  push_notifications_enabled: boolean;
  dark_mode_enabled: boolean;
  subject: string | null;
  created_at: string;
  updated_at: string;
  last_seen_at: string | null;
  last_location: string | null;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data as Profile;
}
