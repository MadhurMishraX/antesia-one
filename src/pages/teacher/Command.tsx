import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, Activity, Send, AlertCircle, ChevronRight, ArrowLeft, History } from 'lucide-react';

import TopBar from '../../components/TopBar';

export default function Command() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [showAllBroadcasts, setShowAllBroadcasts] = useState(false);
  const [classHealth, setClassHealth] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showBroadcastForm, setShowBroadcastForm] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!profile) return;

      // Fetch latest 5 broadcasts
      const { data: b } = await supabase
        .from('broadcasts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      setBroadcasts(b || []);

      // Fetch class health (modules and their avg scores)
      const { data: modules } = await supabase
        .from('modules')
        .select(`
          id, module_name, subject,
          assignment_submissions(score, total_questions)
        `)
        .eq('created_by', profile.id)
        .order('created_at', { ascending: false });

      const health = (modules || []).map(m => {
        const subs = m.assignment_submissions || [];
        const avg = subs.length > 0 
          ? Math.round((subs.reduce((acc, s) => acc + (s.score / s.total_questions), 0) / subs.length) * 100)
          : null;
        return { ...m, avg };
      });

      setClassHealth(health);
      setLoading(false);
    }

    fetchData();
  }, [profile]);

  const handleSendBroadcast = async () => {
    if (!profile || !message.trim()) return;
    setSending(true);

    // Unpin old
    await supabase.from('broadcasts').update({ is_pinned: false }).eq('is_pinned', true);

    // Insert new
    const { data, error } = await supabase.from('broadcasts').insert({
      teacher_id: profile.id,
      message_text: message,
      is_urgent: isUrgent,
      is_pinned: true
    }).select().single();

    if (!error) {
      setBroadcasts(prev => [data, ...prev].slice(0, 5));
      setMessage('');
      setShowBroadcastForm(false);

      // Create notifications for all students
      const { data: students } = await supabase.from('profiles').select('id').eq('role', 'student');
      if (students && students.length > 0) {
        const notifications = students.map(s => ({
          recipient_id: s.id,
          type: 'broadcast',
          title: isUrgent ? 'Urgent Broadcast! 🚨' : 'New Broadcast 📢',
          body: message.length > 100 ? message.substring(0, 97) + '...' : message,
          deep_link_target: 'broadcast_history',
          reference_id: data.id
        }));
        await supabase.from('notifications').insert(notifications);
      }
    }
    setSending(false);
  };

  const getHealthColor = (avg: number | null) => {
    if (avg === null) return 'text-text-muted';
    if (avg > 70) return 'text-success';
    if (avg >= 40) return 'text-warning';
    return 'text-danger';
  };

  return (
    <div className="p-6 space-y-8 transition-colors duration-300">
      <TopBar 
        title="Command Center"
        subtitle="Control & Broadcast"
      />

      {/* Broadcast Station */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-text-muted uppercase tracking-widest flex items-center gap-2">
            <Megaphone size={16} className="text-primary" />
            Broadcast Station
          </h3>
          {broadcasts.length > 0 && (
            <span className="text-[8px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-pill uppercase">Active</span>
          )}
        </div>
        
        {broadcasts.length > 0 ? (
          <div className="space-y-3">
            {/* Latest Broadcast - Bigger */}
            <div className={`p-5 rounded-[24px] shadow-md border relative overflow-hidden transition-all ${broadcasts[0].is_urgent ? 'bg-danger/10 border-danger/20' : 'bg-primary/10 border-primary/20'}`}>
              <div className={`absolute top-0 left-0 w-1.5 h-full ${broadcasts[0].is_urgent ? 'bg-danger' : 'bg-primary'}`} />
              <p className="text-base font-bold leading-relaxed text-text-primary">{broadcasts[0].message_text}</p>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-surface/10">
                <span className={`text-[8px] font-bold px-2 py-0.5 rounded-pill uppercase ${broadcasts[0].is_urgent ? 'bg-danger text-white' : 'bg-primary text-white'}`}>
                  {broadcasts[0].is_urgent ? 'Urgent' : 'Active'}
                </span>
                <p className="text-[10px] font-bold text-text-muted">
                  {new Date(broadcasts[0].created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Other Broadcasts - Smaller */}
            {broadcasts.length > 1 && (
              <div className="space-y-2">
                {!showAllBroadcasts ? (
                  <button 
                    onClick={() => setShowAllBroadcasts(true)}
                    className="w-full py-2 text-[10px] font-bold text-primary uppercase tracking-widest hover:bg-primary/10 rounded-lg transition-all"
                  >
                    Show More ({broadcasts.length - 1})
                  </button>
                ) : (
                  <>
                    {broadcasts.slice(1).map((b) => (
                      <div key={b.id} className={`p-4 rounded-[16px] border relative overflow-hidden transition-all ${b.is_urgent ? 'bg-danger/10 border-danger/10' : 'bg-surface border-surface/10'}`}>
                        <div className={`absolute top-0 left-0 w-1 h-full ${b.is_urgent ? 'bg-danger' : 'bg-primary'}`} />
                        <p className="text-xs font-medium text-text-primary leading-relaxed">{b.message_text}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded-pill uppercase ${b.is_urgent ? 'bg-danger text-white' : 'bg-primary text-white'}`}>
                            {b.is_urgent ? 'Urgent' : 'Active'}
                          </span>
                          <p className="text-[9px] font-bold text-text-muted">
                            {new Date(b.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    <button 
                      onClick={() => setShowAllBroadcasts(false)}
                      className="w-full py-2 text-[10px] font-bold text-text-muted uppercase tracking-widest hover:bg-surface/50 rounded-lg transition-all"
                    >
                      Show Less
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-surface p-8 rounded-[24px] shadow-sm border border-dashed border-surface/20 text-center">
            <p className="text-text-muted text-sm font-medium italic">No active broadcast.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => { setShowBroadcastForm(true); setIsUrgent(false); }}
            className="py-4 bg-surface border border-surface/10 text-text-primary font-bold rounded-[20px] shadow-sm hover:bg-surface/50 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Megaphone size={18} className="text-primary" />
            Broadcast
          </button>
          <button 
            onClick={() => { setShowBroadcastForm(true); setIsUrgent(true); }}
            className="py-4 bg-danger text-white font-bold rounded-[20px] shadow-lg shadow-danger/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm"
          >
            <AlertCircle size={18} />
            Urgent
          </button>
        </div>

        <button 
          onClick={() => navigate('/teacher/broadcast-history')}
          className="w-full py-4 bg-surface border border-surface/10 text-text-primary font-bold rounded-[20px] shadow-sm hover:bg-surface/50 transition-all flex items-center justify-center gap-2 text-sm"
        >
          <History size={18} className="text-text-muted" />
          View Broadcast History
        </button>

        <AnimatePresence>
          {showBroadcastForm && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-3 overflow-hidden"
            >
              <div className="bg-surface p-4 rounded-[24px] border border-surface/10 shadow-sm space-y-4">
                <textarea 
                  placeholder={isUrgent ? "Type urgent broadcast..." : "Type broadcast message..."}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className={`w-full h-32 p-4 rounded-[16px] border-2 focus:outline-none transition-all resize-none text-sm font-medium bg-background text-text-primary ${
                    isUrgent ? 'border-danger/10 focus:border-danger' : 'border-primary/10 focus:border-primary'
                  }`}
                />
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => setShowBroadcastForm(false)}
                    className="px-6 py-2 text-text-muted font-bold text-xs uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={sending || !message.trim()}
                    onClick={handleSendBroadcast}
                    className={`px-8 py-2 text-white font-bold rounded-full shadow-lg transition-all active:scale-95 disabled:opacity-50 text-sm ${
                      isUrgent ? 'bg-danger shadow-danger/20' : 'bg-primary shadow-primary/20'
                    }`}
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Class Health */}
      <div className="space-y-4">
        <h3 className="font-bold text-sm text-text-muted uppercase tracking-widest flex items-center gap-2">
          <Activity size={16} className="text-primary" />
          Class Health
        </h3>
        <div className="bg-surface rounded-[24px] shadow-sm border border-surface/10 overflow-hidden">
          {classHealth.length > 0 ? (
            classHealth.slice(0, 3).map((module) => (
              <div 
                key={module.id} 
                onClick={() => navigate(`/teacher/auditor/${module.id}/submissions`)}
                className="p-5 flex items-center justify-between border-b border-surface/5 last:border-0 hover:bg-surface/50 transition-colors cursor-pointer group"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm truncate group-hover:text-primary transition-colors text-text-primary">{module.module_name}</h4>
                  <span className="text-[10px] font-bold text-text-muted mt-1 inline-block uppercase tracking-widest">
                    {module.subject}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`text-lg font-bold tabular-nums ${getHealthColor(module.avg)}`}>
                    {module.avg !== null ? `${module.avg}%` : '--'}
                  </div>
                  <ChevronRight size={18} className="text-text-muted group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))
          ) : (
            <div className="p-10 text-center">
              <p className="text-text-muted text-sm font-medium italic">No modules created yet.</p>
            </div>
          )}
        </div>
        {classHealth.length > 3 && (
          <button 
            onClick={() => navigate('/teacher/auditor')}
            className="w-full py-4 bg-surface border border-surface/10 text-text-primary font-bold rounded-[20px] shadow-sm hover:bg-surface/50 transition-all text-sm"
          >
            View All Modules
          </button>
        )}
      </div>
    </div>
  );
}
