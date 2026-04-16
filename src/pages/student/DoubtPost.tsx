import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Paperclip, Send, CheckCircle2 } from 'lucide-react';

export default function DoubtPost() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const moduleId = searchParams.get('module_id');
  const questionId = searchParams.get('question_id');
  
  const [doubtText, setDoubtText] = useState('');
  const [preFilled, setPreFilled] = useState('');
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    async function fetchContext() {
      if (!moduleId) return;
      
      const { data: mod } = await supabase.from('modules').select('module_name, subject').eq('id', moduleId).single();
      let context = `Subject: ${mod?.subject || ''}\nModule: ${mod?.module_name || ''}\n`;
      
      if (questionId) {
        const { data: q } = await supabase.from('questions').select('question_text, question_number').eq('id', questionId).single();
        context += `Question ${q?.question_number}: ${q?.question_text || ''}\n`;
      }
      
      setPreFilled(context);
    }
    fetchContext();
  }, [moduleId, questionId]);

  const handleSubmit = async () => {
    if (!profile || !doubtText.trim()) return;
    setLoading(true);

    const { data: mod } = await supabase.from('modules').select('subject, created_by').eq('id', moduleId).single();

    const { data: doubtData, error } = await supabase.from('doubts').insert({
      student_id: profile.id,
      subject: mod?.subject || 'General',
      module_id: moduleId,
      question_id: questionId,
      doubt_text: doubtText,
      pre_filled_context: preFilled,
      status: 'open'
    }).select().single();

    if (error) {
      console.error('Error posting doubt:', error);
      setLoading(false);
      return;
    }

    // Notify teacher
    if (mod?.created_by) {
      await supabase.from('notifications').insert({
        recipient_id: mod.created_by,
        type: 'doubt_new',
        title: `Student ${profile.full_name} has asked a doubt`,
        body: doubtText.length > 100 ? doubtText.substring(0, 97) + '...' : doubtText,
        deep_link_target: 'teacher_doubts',
        reference_id: doubtData.id
      });
    }

    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      navigate(-1);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Top Bar */}
      <div className="p-6 flex items-center gap-4 bg-surface shadow-sm sticky top-0 z-30 border-b border-surface/10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-muted hover:text-primary transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-lg font-bold text-text-primary">Post a Doubt</h2>
      </div>

      <div className="p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-card shadow-sm border border-surface/10 p-6 space-y-6"
        >
          <div className="space-y-4">
            <div className="bg-background p-4 rounded-lg border border-surface/10">
              <textarea 
                readOnly
                value={preFilled}
                className="w-full bg-transparent text-xs font-medium text-text-muted leading-relaxed resize-none focus:outline-none"
                rows={preFilled.split('\n').length}
              />
            </div>

            <textarea 
              placeholder="Describe your doubt in detail..."
              value={doubtText}
              onChange={(e) => setDoubtText(e.target.value)}
              className="w-full h-64 p-4 rounded-lg border-2 border-surface/10 bg-background focus:outline-none focus:border-primary transition-all resize-none text-sm font-medium text-text-primary"
            />
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-surface/10">
            <button 
              disabled={loading || !doubtText.trim()}
              onClick={handleSubmit}
              className="bg-primary text-white px-8 py-3 rounded-pill font-bold shadow-lg shadow-primary/20 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send'}
              <Send size={18} />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-success text-white px-6 py-3 rounded-pill shadow-2xl z-[100] flex items-center gap-2 font-bold text-sm"
          >
            <CheckCircle2 size={18} />
            Doubt submitted! ✓
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
