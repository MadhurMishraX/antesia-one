import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { motion } from 'motion/react';
import { Bell, Crown, ChevronUp, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';

import TopBar from '../../components/TopBar';

export default function Leaderboard() {
  const { profile } = useAuth();
  const [topStudents, setTopStudents] = useState<any[]>([]);
  const [myRank, setMyRank] = useState<any>(null);
  const [surrounding, setSurrounding] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      if (!profile) return;

      // Fetch all students ranked by XP with time-based tie-breaker
      const { data: allStats } = await supabase
        .from('student_stats')
        .select('*, profiles!inner(full_name, profile_photo_url, is_anonymous_on_leaderboard, role)')
        .eq('profiles.role', 'student')
        .order('total_xp', { ascending: false })
        .order('updated_at', { ascending: true });

      const ranked = (allStats || []).map((s, i) => ({ ...s, computedRank: i + 1 }));
      setTopStudents(ranked);

      // Find my rank
      const me = ranked.find(s => s.student_id === profile.id);
      if (me) {
        setMyRank(me);
      }

      setLoading(false);
    }

    fetchLeaderboard();
  }, [profile]);

  if (loading) return (
    <div className="p-6 space-y-8 animate-pulse">
      <div className="h-20 bg-surface/50 rounded-[40px] border border-surface/10" /> {/* TopBar Skeleton */}
      <div className="flex items-end justify-center gap-2 pt-12 pb-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex-1 flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-surface/50 border-4 border-surface/10" />
            <div className="w-12 h-3 bg-surface/50 rounded" />
            <div className={`w-full rounded-t-2xl bg-surface/50 ${i === 1 ? 'h-24' : i === 0 ? 'h-16' : 'h-12'}`} />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-20 bg-surface/50 rounded-card border border-surface/10" />
        ))}
      </div>
    </div>
  );

  const getDisplayName = (s: any) => {
    if (s.profiles?.is_anonymous_on_leaderboard && s.student_id !== profile?.id) {
      return 'Anonymous Student';
    }
    return s.profiles?.full_name;
  };

  const getPhoto = (s: any) => {
    if (s.profiles?.is_anonymous_on_leaderboard && s.student_id !== profile?.id) {
      return null;
    }
    return s.profiles?.profile_photo_url;
  };

  const podium = [
    topStudents[1], // 2nd
    topStudents[0], // 1st
    topStudents[2], // 3rd
  ];

  return (
    <div className="p-6 space-y-8 transition-colors duration-300">
      <TopBar 
        title="Leaderboard"
        subtitle="Global Rankings"
      />

      {/* Podium */}
      <div className="flex items-end justify-center gap-2 pt-12 pb-4">
        {podium.map((s, i) => {
          if (!s) return <div key={i} className="flex-1" />;
          const isFirst = i === 1;
          const isSecond = i === 0;
          const isThird = i === 2;
          
          return (
            <motion.div 
              key={s.student_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex-1 flex flex-col items-center gap-3 ${isFirst ? 'z-10' : ''}`}
            >
              <div className="relative">
                <div className={`rounded-full overflow-hidden border-4 shadow-lg ${
                  isFirst ? 'w-20 h-20 border-warning' : 'w-16 h-16 border-surface'
                }`}>
                  {getPhoto(s) ? (
                    <img src={getPhoto(s)} alt="PFP" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface text-text-muted font-bold text-xl">
                      {getDisplayName(s)[0]}
                    </div>
                  )}
                </div>
                {isFirst && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-warning animate-bounce">
                    <Crown size={32} fill="currentColor" />
                  </div>
                )}
                <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md ${
                  isFirst ? 'bg-warning' : isSecond ? 'bg-gray-400' : 'bg-amber-700'
                }`}>
                  {isFirst ? '1' : isSecond ? '2' : '3'}
                </div>
              </div>
              <div className="text-center">
                <p className={`font-bold text-xs truncate max-w-[80px] text-text-primary ${isFirst ? 'text-lg' : ''}`}>
                  {getDisplayName(s).split(' ')[0]}
                </p>
                <p className="text-[10px] text-text-muted font-bold">{s.total_xp} XP</p>
              </div>
              <div className={`w-full rounded-t-2xl shadow-inner ${
                isFirst ? 'h-24 bg-warning shadow-[0_-4px_12px_rgba(245,158,11,0.2)]' : isSecond ? 'h-16 bg-slate-400' : 'h-12 bg-amber-700/60'
              }`} />
            </motion.div>
          );
        })}
      </div>

      {/* All Ranks */}
      <div className="space-y-3">
        {topStudents.map((s) => {
          const isMe = s.student_id === profile?.id;
          const isTop3 = s.computedRank <= 3;
          const rankColor = s.computedRank === 1 ? 'bg-warning/10 border-warning/30' : 
                            s.computedRank === 2 ? 'bg-slate-400/10 border-slate-400/30' : 
                            s.computedRank === 3 ? 'bg-amber-700/10 border-amber-700/30' : '';
          
          return (
            <div 
              key={s.student_id} 
              className={`p-4 rounded-card shadow-sm border flex items-center gap-4 transition-all ${
                isMe ? 'bg-primary/10 border-primary border-l-4' : isTop3 ? `${rankColor} border-l-4` : 'bg-surface border-surface/10'
              }`}
            >
              <span className={`w-6 text-sm font-bold ${
                s.computedRank === 1 ? 'text-warning' : 
                s.computedRank === 2 ? 'text-slate-400' : 
                s.computedRank === 3 ? 'text-amber-700' : 'text-text-muted'
              }`}>{s.computedRank}</span>
              <div className="w-10 h-10 rounded-full bg-background overflow-hidden">
                {getPhoto(s) ? (
                  <img src={getPhoto(s)} alt="PFP" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-muted font-bold">
                    {getDisplayName(s)[0]}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-text-primary">{getDisplayName(s)}</p>
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">{s.current_league}</p>
              </div>
              <p className={`font-bold text-sm ${isMe ? 'text-primary' : 'text-text-muted'}`}>{s.total_xp} XP</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
