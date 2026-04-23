import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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
  const lastActivityRef = useRef<number>(Date.now());

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

  const signOut = useCallback(async () => {
    sessionStorage.removeItem('admin_verified');
    await supabase.auth.signOut();
  }, []);

  const checkTimeout = useCallback(async () => {
    // If not logged in, skip
    if (!user) return;

    const now = Date.now();
    const diffInMinutes = (now - lastActivityRef.current) / (1000 * 60);

    // Iron Clad Security: 20-minute idle wall
    if (diffInMinutes > 20) {
      console.log('Session timed out (>20m idle). Executing security logout.');
      await signOut();
    }
  }, [user, signOut]);

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
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Fixed: Run auth listener setup ONLY ONCE

  useEffect(() => {
    // Reset local stopwatch on user interaction
    const resetTimer = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousedown', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('scroll', resetTimer, true);
    window.addEventListener('touchstart', resetTimer);

    // Security Listeners for re-entry/focus
    window.addEventListener('focus', checkTimeout);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkTimeout();
      }
    });

    return () => {
      window.removeEventListener('mousedown', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('scroll', resetTimer, true);
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('focus', checkTimeout);
      window.removeEventListener('visibilitychange', checkTimeout);
    };
  }, [checkTimeout]);

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
