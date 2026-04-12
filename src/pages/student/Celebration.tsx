import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { motion } from 'motion/react';
import { Check, Flame } from 'lucide-react';

export default function Celebration() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      const { data: sub } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('id', id)
        .single();
      setSubmission(sub);

      if (sub) {
        const { data: s } = await supabase
          .from('student_stats')
          .select('*')
          .eq('student_id', sub.student_id)
          .single();
        setStats(s);
      }
    }
    fetchData();
  }, [id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-violet-700 flex flex-col items-center justify-center p-8 text-white overflow-hidden relative">
      {/* Animated Background Pulse */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute inset-0 bg-white/5 rounded-full blur-3xl -z-10"
      />

      <div className="flex-1 flex flex-col items-center justify-center space-y-8 text-center">
        {/* Checkmark Circle */}
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 200 }}
          className="w-24 h-24 bg-success rounded-full flex items-center justify-center shadow-2xl shadow-success/40"
        >
          <motion.div
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Check size={48} strokeWidth={4} />
          </motion.div>
        </motion.div>

        <div className="space-y-2">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-3xl font-bold tracking-tight"
          >
            Assignment Submitted! 🎉
          </motion.h1>
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
            className="inline-block bg-warning text-text-primary px-4 py-1.5 rounded-pill font-bold text-sm shadow-lg shadow-warning/20"
          >
            +{submission?.xp_earned || 0} XP earned
          </motion.div>
        </div>

        {/* Streak Animation */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2, type: 'spring' }}
          className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-4 rounded-card border border-white/20"
        >
          <Flame size={32} className="text-danger fill-danger" />
          <div className="text-left">
            <p className="text-xs font-bold uppercase tracking-widest opacity-70">New Streak</p>
            <p className="text-2xl font-bold">{stats?.current_streak_days ?? 0} Day Streak!</p>
          </div>
        </motion.div>
      </div>

      {/* Bottom Button */}
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
        className="w-full max-w-sm"
      >
        <button 
          onClick={() => navigate(`/results/${id}`)}
          className="w-full py-4 bg-white text-primary font-bold rounded-button shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          Continue
          <Check size={20} />
        </button>
      </motion.div>
    </div>
  );
}
