import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, Paperclip, Send, CheckCircle2, ChevronDown, MessageSquare, Plus, ArrowLeft } from 'lucide-react';

import TopBar from '../../components/TopBar';

export default function DoubtSection() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [doubts, setDoubts] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function fetchDoubts() {
      if (!profile) return;

      let query = supabase
        .from('doubts')
        .select(`
          *,
          profiles(full_name),
          doubt_replies(*, profiles(full_name))
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data } = await query;
      setDoubts(data || []);
      setLoading(false);
    }

    fetchDoubts();
  }, [profile, filter]);

  const handleSendReply = async (doubtId: string) => {
    if (!profile || !replyText.trim()) return;
    setSending(true);

    const { data, error } = await supabase.from('doubt_replies').insert({
      doubt_id: doubtId,
      teacher_id: profile.id, // Using existing column name but storing student ID
      reply_text: replyText
    }).select('*, profiles(full_name)').single();

    if (!error) {
      setDoubts(doubts.map(d => d.id === doubtId ? { ...d, doubt_replies: [...(d.doubt_replies || []), data] } : d));
      setReplyText('');

      // Create notification for the student who asked the doubt (if it's not the same person)
      const doubt = doubts.find(d => d.id === doubtId);
      if (doubt && doubt.student_id !== profile.id) {
        await supabase.from('notifications').insert({
          recipient_id: doubt.student_id,
          type: 'doubt_reply',
          title: 'New Reply to your Doubt! 💬',
          body: replyText.length > 100 ? replyText.substring(0, 97) + '...' : replyText,
          deep_link_target: 'doubt_detail',
          reference_id: doubtId
        });
      }
    }
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-background pb-24 transition-colors duration-300">
      {/* Top Bar */}
      <div className="p-6 flex items-center justify-between bg-surface shadow-sm sticky top-0 z-30 border-b border-surface/10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-muted hover:text-primary transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-lg font-bold text-text-primary">Doubt Section</h2>
        </div>
        <button 
          onClick={() => navigate('/doubt/post')}
          className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/20 active:scale-95 transition-all"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="p-6 space-y-8">
        {/* Filter Bar */}
        <div className="flex bg-surface p-1.5 rounded-full shadow-sm border border-surface/10 w-fit">
          {(['all', 'open', 'resolved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                filter === f ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted hover:bg-surface/50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Doubt List */}
        <div className="space-y-4">
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : doubts.length > 0 ? (
            doubts.map((doubt) => (
              <motion.div 
                key={doubt.id}
                layout
                className="bg-surface rounded-[32px] shadow-sm border border-surface/10 overflow-hidden group"
              >
                <div 
                  onClick={() => setExpandedId(expandedId === doubt.id ? null : doubt.id)}
                  className="p-6 space-y-4 cursor-pointer active:bg-surface/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {doubt.profiles?.full_name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-text-primary">
                          {doubt.profiles?.full_name}
                          {doubt.student_id === profile?.id && <span className="ml-2 text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-pill">YOU</span>}
                        </p>
                        <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest">
                          {doubt.subject} • {new Date(doubt.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-pill uppercase ${
                        doubt.status === 'open' ? 'bg-warning text-white' : 'bg-success text-white'
                      }`}>
                        {doubt.status}
                      </span>
                      <ChevronDown size={18} className={`text-text-muted transition-transform duration-300 ${expandedId === doubt.id ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  <p className="text-sm font-medium leading-relaxed text-text-primary line-clamp-2">
                    {doubt.doubt_text}
                  </p>
                  
                  {doubt.attachment_url && (
                    <div className="flex items-center gap-2 text-primary">
                      <Paperclip size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Attachment Attached</span>
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {expandedId === doubt.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-surface/10 p-6 space-y-8"
                    >
                      <div className="space-y-6">
                        <div className="bg-background p-5 rounded-[24px] border border-surface/10">
                          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3">Context</p>
                          <p className="text-xs font-medium text-text-muted whitespace-pre-wrap leading-relaxed">{doubt.pre_filled_context}</p>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Question</p>
                          <p className="text-sm font-bold leading-relaxed text-text-primary">{doubt.doubt_text}</p>
                        </div>

                        {doubt.attachment_url && (
                          <div className="rounded-[24px] overflow-hidden border border-surface/10 max-w-sm shadow-sm">
                            <img src={doubt.attachment_url} alt="Attachment" className="w-full h-auto" referrerPolicy="no-referrer" />
                          </div>
                        )}
                      </div>

                      {/* Replies */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Discussion</h4>
                        {doubt.doubt_replies?.map((reply: any) => (
                          <div key={reply.id} className="bg-primary/5 p-5 rounded-[24px] border border-primary/10 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{reply.profiles?.full_name}</p>
                              <p className="text-[8px] text-text-muted font-bold">{new Date(reply.created_at).toLocaleDateString()}</p>
                            </div>
                            <p className="text-sm font-medium text-text-primary leading-relaxed">{reply.reply_text}</p>
                          </div>
                        ))}
                      </div>

                      {/* Reply Input */}
                      <div className="space-y-4 pt-6 border-t border-surface/10">
                        <div className="relative">
                          <textarea 
                            placeholder="Type your response here..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="w-full h-32 p-5 bg-background border border-surface/10 rounded-[24px] focus:bg-surface focus:border-primary/20 focus:outline-none transition-all text-sm font-medium resize-none text-text-primary"
                          />
                        </div>
                        
                        <div className="flex items-center justify-end">
                          <button 
                            disabled={sending || !replyText.trim()}
                            onClick={() => handleSendReply(doubt.id)}
                            className="bg-primary text-white px-10 py-3 rounded-full font-bold shadow-xl shadow-primary/20 flex items-center gap-3 active:scale-95 transition-all disabled:opacity-50 text-sm"
                          >
                            {sending ? 'Sending...' : 'Send Response'}
                            <Send size={16} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          ) : (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto text-text-muted">
                <MessageSquare size={32} />
              </div>
              <div>
                <p className="text-text-primary font-bold">No doubts found</p>
                <p className="text-text-muted text-xs mt-1">Be the first to ask something!</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
