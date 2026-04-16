import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { LogOut, User, Bell, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TopBarProps {
  title?: string;
  subtitle?: string;
  showNotifications?: boolean;
}

export default function TopBar({ title, subtitle, showNotifications = true }: TopBarProps) {
  const { profile, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;

    async function fetchUnread() {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', profile.id)
        .eq('is_read', false);
      
      setUnreadCount(count || 0);
    }

    fetchUnread();

    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'notifications',
        filter: `recipient_id=eq.${profile.id}`
      }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        {title && <h1 className="text-2xl font-bold tracking-tight text-text-primary">{title}</h1>}
        {subtitle && <p className="text-xs font-bold text-text-muted uppercase tracking-widest mt-1">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {showNotifications && (
          <Link 
            to={profile?.role === 'teacher' ? '/teacher/notifications' : '/notifications'} 
            className="p-2 text-text-muted hover:text-primary transition-colors relative"
          >
            <Bell size={24} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-4 h-4 bg-danger rounded-full border-2 border-background flex items-center justify-center text-[8px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        )}

        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 p-1 rounded-full hover:bg-surface/50 transition-all active:scale-95"
          >
            <div className="w-10 h-10 rounded-full bg-surface overflow-hidden border-2 border-surface shadow-sm">
              {profile?.profile_photo_url ? (
                <img 
                  src={profile.profile_photo_url} 
                  alt="Profile" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold">
                  {profile?.full_name?.[0]}
                </div>
              )}
            </div>
            <ChevronDown size={16} className={`text-text-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                 exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-2 w-48 bg-surface rounded-2xl shadow-2xl border border-surface/10 py-2 z-50 overflow-hidden"
              >
                <div className="px-4 py-2 border-b border-surface/5">
                  <p className="text-xs font-bold text-text-primary truncate">{profile?.full_name}</p>
                  <p className="text-[10px] text-text-muted truncate">{profile?.login_id}</p>
                </div>
                
                <Link 
                  to="/profile" 
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-text-primary hover:bg-surface/50 transition-colors"
                >
                  <User size={18} className="text-primary" />
                  My Profile
                </Link>
                
                <button 
                  onClick={() => {
                    setIsOpen(false);
                    signOut();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-danger hover:bg-danger/5 transition-colors"
                >
                  <LogOut size={18} />
                  Log Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
