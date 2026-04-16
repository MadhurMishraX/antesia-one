import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, Profile, getProfile } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isDarkMode: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  toggleDarkMode: (enabled: boolean) => void;
  updateActivity: (location: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const fetchProfile = async (userId: string) => {
    const profileData = await getProfile(userId);
    setProfile(profileData);
    setIsDarkMode(profileData?.dark_mode_enabled || false);
    setLoading(false);
  };

  const toggleDarkMode = (enabled: boolean) => {
    setIsDarkMode(enabled);
  };

  const updateActivity = useCallback(async (location: string) => {
    if (!user) return;
    try {
      await supabase
        .from('profiles')
        .update({
          last_seen_at: new Date().toISOString(),
          last_location: location
        })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  }, [user]);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // Check active sessions and subscribe to auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    sessionStorage.removeItem('admin_verified');
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      isDarkMode,
      signOut,
      refreshProfile,
      toggleDarkMode,
      updateActivity
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// 🌌 Antesia - Developed by Madhur Mishra (github: MadhurMishraX)

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
