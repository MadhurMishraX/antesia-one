import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'motion/react';
import { ArrowLeft, Bell, Megaphone, Zap, Clock, MessageSquare, ChevronRight } from 'lucide-react';

export default function Notifications() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotifications() {
      if (!profile) return;

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', profile.id)
        .order('created_at', { ascending: false });
      
      setNotifications(data || []);
      setLoading(false);
    }

    fetchNotifications();
  }, [profile]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'broadcast': return <Megaphone size={18} className="text-primary" />;
      case 'xp_gain': return <Zap size={18} className="text-warning" />;
      case 'due_date_reminder': return <Clock size={18} className="text-violet-500" />;
      case 'doubt_reply': return <MessageSquare size={18} className="text-success" />;
      case 'doubt_new': return <MessageSquare size={18} className="text-primary" />;
      default: return <Bell size={18} className="text-text-muted" />;
    }
  };

  const markAllAsRead = async () => {
    if (!profile) return;
    
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', profile.id)
      .eq('is_read', false);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  };

  const handleNotificationClick = async (n: any) => {
    // Mark as read
    if (!n.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, is_read: true } : item));
    }

    // Navigate
    switch (n.deep_link_target) {
      case 'broadcast_history': 
        navigate(profile?.role === 'teacher' ? '/teacher/broadcast-history' : '/broadcast-history'); 
        break;
      case 'dashboard': 
        navigate(profile?.role === 'teacher' ? '/teacher' : '/'); 
        break;
      case 'study_vault': 
        navigate('/learn?tab=due'); 
        break;
      case 'doubt_detail': 
        navigate(profile?.role === 'teacher' ? '/teacher/doubts' : '/doubts'); 
        break;
      case 'teacher_doubts':
        navigate('/teacher/doubts');
        break;
      default: 
        navigate(profile?.role === 'teacher' ? '/teacher' : '/'); 
        break;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Top Bar */}
      <div className="p-6 flex items-center justify-between bg-surface shadow-sm sticky top-0 z-30 border-b border-surface/10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-muted hover:text-primary transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-lg font-bold text-text-primary">Notifications</h2>
        </div>
        {unreadCount > 0 && (
          <button 
            onClick={markAllAsRead}
            className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="p-6 space-y-3">
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((n) => (
            <motion.div 
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`p-4 rounded-card border transition-all cursor-pointer active:scale-[0.98] flex items-center gap-4 ${
                n.is_read ? 'bg-surface border-surface/10 opacity-70' : 'bg-surface border-primary/20 shadow-sm'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                n.is_read ? 'bg-background' : 'bg-primary/10'
              }`}>
                {getIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm truncate text-text-primary">{n.title}</h4>
                <p className="text-xs text-text-muted line-clamp-1">{n.body}</p>
                <p className="text-[8px] font-bold text-text-muted uppercase tracking-widest mt-1">
                  {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {!n.is_read && <div className="w-2 h-2 bg-primary rounded-full" />}
              <ChevronRight size={16} className="text-text-muted" />
            </motion.div>
          ))
        ) : (
          <div className="py-12 text-center space-y-2">
            <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center mx-auto text-text-muted">
              <Bell size={24} />
            </div>
            <p className="text-text-muted text-sm font-medium">All caught up!</p>
          </div>
        )}
      </div>
    </div>
  );
}
