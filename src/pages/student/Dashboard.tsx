import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { motion } from 'motion/react';
import { Bell, Trophy, Zap, Target, Flame, ChevronRight, Megaphone, Clock, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

import TopBar from '../../components/TopBar';
import { getSubjectStyle } from '../../lib/constants';

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [computedRank, setComputedRank] = useState<number | null>(null);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [showAllBroadcasts, setShowAllBroadcasts] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!profile) return;

    // Fetch stats
    const { data: statsData } = await supabase
      .from('student_stats')
      .select('*')
      .eq('student_id', profile.id)
      .single();
    setStats(statsData);

    // Calculate rank locally with time-based tie-breaker
    const { data: allStats } = await supabase
      .from('student_stats')
      .select('student_id, total_xp, updated_at')
      .order('total_xp', { ascending: false })
      .order('updated_at', { ascending: true });
    
    if (allStats) {
      const rank = allStats.findIndex(s => s.student_id === profile.id) + 1;
      setComputedRank(rank);
    }

    // Fetch latest 5 broadcasts
    const { data: broadcastsData } = await supabase
      .from('broadcasts')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(5);
    setBroadcasts(broadcastsData || []);

    // Fetch tasks (due assignments)
    const { data: tasksData } = await supabase
      .from('modules')
      .select('*, assignment_submissions!left(*)')
      .eq('is_published', true)
      .eq('assignment_submissions.student_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(3);
    
    // Process tasks
    const tasksWithUserSub = (tasksData || []).map(task => {
      const subs = Array.isArray(task.assignment_submissions) 
        ? task.assignment_submissions 
        : (task.assignment_submissions ? [task.assignment_submissions] : []);
      const userSub = subs[0]; // Should only be one due to filter
      return { ...task, userSub };
    });

    setTasks(tasksWithUserSub);

    setLoading(false);
  };

  // 🌌 Antesia - Developed by Madhur Mishra (github: MadhurMishraX)

  useEffect(() => {
    if (!profile) return;
    
    fetchData();
    
    // Refresh on focus
    window.addEventListener('focus', fetchData);

    // Realtime subscription for stats
    const channel = supabase
      .channel('stats-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'student_stats',
        filter: `student_id=eq.${profile.id}`
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      window.removeEventListener('focus', fetchData);
      supabase.removeChannel(channel);
    };
  }, [profile]);

  if (loading) return (
    <div className="p-6 space-y-8 animate-pulse">
      <div className="h-20 bg-surface/50 rounded-[40px] border border-surface/10" /> {/* TopBar Skeleton */}
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 bg-surface/50 rounded-card border border-surface/10" />
        ))}
      </div>
      <div className="h-24 bg-surface/50 rounded-card border border-surface/10" /> {/* League Skeleton */}
      <div className="h-64 bg-surface/50 rounded-card border border-surface/10" /> {/* Bulletin Skeleton */}
    </div>
  );

  // 🕒 Smart Greeting Logic
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 22) return 'Good evening';
    return 'Burning the midnight oil?';
  };

  const greeting = getGreeting();

  const priorityColors: any = {
    Crucial: 'bg-danger text-white',
    Vital: 'bg-warning text-white',
    Foundational: 'bg-primary text-white',
    Supporting: 'bg-gray-400 text-white',
  };

  return (
    <div className="p-6 space-y-8 transition-colors duration-300">
      <TopBar 
        title={`${greeting}, ${profile?.full_name.split(' ')[0]} 👋`}
        subtitle={`${stats?.current_streak_days || 0} day streak 🔥`}
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard 
          icon={<Trophy size={20} className="text-warning" />} 
          label="Rank" 
          value={computedRank ? `#${computedRank}` : '-'} 
          color="bg-warning/10"
          textColor="text-warning"
        />
        <StatCard 
          icon={<Flame size={20} className="text-danger" />} 
          label="Streak" 
          value={`${stats?.current_streak_days || 0} days`} 
          color="bg-danger/10"
          textColor="text-danger"
        />
        <StatCard 
          icon={<Zap size={20} className="text-primary" />} 
          label="XP" 
          value={stats?.total_xp?.toLocaleString() || '0'} 
          color="bg-primary/10"
          textColor="text-primary"
        />
        <StatCard 
          icon={<Target size={20} className="text-success" />} 
          label="Accuracy" 
          value={`${stats?.accuracy_all_time || 0}%`} 
          color="bg-success/10"
          textColor="text-success"
        />
      </div>

      {/* League Progress */}
      <div className="bg-surface p-5 rounded-card shadow-sm border border-surface/10 flex items-center gap-4">
        <div className="w-12 h-12 bg-indigo-50/10 rounded-full flex items-center justify-center text-primary">
          <Trophy size={24} />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-sm text-text-primary">{stats?.current_league || 'Bronze'} League</h3>
          <p className="text-[10px] text-text-muted font-medium mt-0.5">
            {500 - (stats?.xp_in_current_league || 0)} XP to Silver
          </p>
        </div>
        <div className="relative w-12 h-12">
          <svg className="w-full h-full" viewBox="0 0 36 36">
            <path
              className="text-surface/20"
              strokeDasharray="100, 100"
              strokeWidth="3"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-primary"
              strokeDasharray={`${(stats?.xp_in_current_league || 0) / 5}, 100`}
              strokeWidth="3"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
            {Math.round((stats?.xp_in_current_league || 0) / 5)}%
          </div>
        </div>
      </div>

      {/* Bulletin Board */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2 text-text-primary">
            <Megaphone size={18} className="text-primary" />
            Bulletin Board
          </h3>
          <Link to="/broadcast-history" className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">View History</Link>
        </div>
        {broadcasts.length > 0 ? (
          <div className="space-y-3">
            {/* Latest Broadcast - Bigger */}
            <div className={`bg-surface p-5 rounded-card shadow-md border-l-4 ${broadcasts[0].is_urgent ? 'border-danger' : 'border-primary'} relative border-t border-r border-b border-surface/10`}>
              {broadcasts[0].is_urgent && (
                <span className="absolute top-3 right-3 bg-danger text-[8px] font-bold text-white px-2 py-0.5 rounded-pill">
                  🚨 URGENT
                </span>
              )}
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">
                {broadcasts[0].profiles?.full_name}
              </p>
              <p className="text-base mt-1 font-bold leading-relaxed text-text-primary">
                {broadcasts[0].message_text}
              </p>
              <p className="text-[10px] text-text-muted text-right mt-2">
                {new Date(broadcasts[0].created_at).toLocaleDateString()}
              </p>
            </div>

            {/* Other Broadcasts - Smaller */}
            {broadcasts.length > 1 && (
              <div className="space-y-2">
                {!showAllBroadcasts ? (
                  <button 
                    onClick={() => setShowAllBroadcasts(true)}
                    className="w-full py-2 text-[10px] font-bold text-primary uppercase tracking-widest hover:bg-primary/5 rounded-lg transition-all"
                  >
                    Show More ({broadcasts.length - 1})
                  </button>
                ) : (
                  <>
                    {broadcasts.slice(1).map((b) => (
                      <div key={b.id} className={`bg-surface p-3 rounded-card shadow-sm border-l-2 ${b.is_urgent ? 'border-danger' : 'border-primary'} relative border-t border-r border-b border-surface/10`}>
                        <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider flex justify-between items-center">
                          {b.profiles?.full_name}
                          {b.is_urgent && <span className="text-danger">🚨</span>}
                        </p>
                        <p className="text-xs mt-1 leading-relaxed text-text-primary">
                          {b.message_text}
                        </p>
                        <p className="text-[8px] text-text-muted text-right mt-1">
                          {new Date(b.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                    <button 
                      onClick={() => setShowAllBroadcasts(false)}
                      className="w-full py-2 text-[10px] font-bold text-text-muted uppercase tracking-widest hover:bg-background rounded-lg transition-all"
                    >
                      Show Less
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-surface p-4 rounded-card shadow-sm border border-dashed border-surface/20 text-center text-text-muted text-sm italic">
            No broadcasts yet.
          </div>
        )}
      </div>

      {/* Doubt Section Link */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2 text-text-primary">
            <MessageSquare size={18} className="text-primary" />
            Doubt Section
          </h3>
          <Link to="/doubts" className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">Open Section</Link>
        </div>
        <Link to="/doubts" className="block">
          <div className="bg-surface p-5 rounded-card shadow-sm border border-surface/10 flex items-center gap-4 hover:border-primary/30 transition-all active:scale-[0.98]">
            <div className="w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center text-primary">
              <MessageSquare size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm text-text-primary">Have a Question?</h3>
              <p className="text-[10px] text-text-muted font-medium mt-0.5">
                Ask doubts or help others with their queries
              </p>
            </div>
            <ChevronRight size={20} className="text-text-muted" />
          </div>
        </Link>
      </div>

      {/* Task Control */}
      <div className="space-y-4">
        <h3 className="font-bold flex items-center gap-2 text-text-primary">
          <ClipboardList size={18} className="text-primary" />
          Task Control
        </h3>
        <div className="space-y-3">
          {tasks.map((task) => {
            const subjectStyle = getSubjectStyle(task.subject);
            const Icon = subjectStyle.icon;
            const isSubmitted = task.userSub?.status === 'submitted';
            const targetPath = isSubmitted 
              ? `/results/${task.userSub.id}` 
              : `/assignment/${task.id}/interface`;
            
            return (
              <Link key={task.id} to={targetPath} className="block">
                <div className="bg-surface p-4 rounded-card shadow-sm border border-surface/10 flex items-center gap-4 hover:border-primary/30 transition-all active:scale-[0.98]">
                  <div className={`w-10 h-10 rounded-full ${subjectStyle.lightColor} flex items-center justify-center ${subjectStyle.textColor} font-bold`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm truncate text-text-primary">{task.module_name}</h4>
                    <p className="text-[10px] text-text-muted font-medium mt-0.5">
                      {task.subject} • Due {new Date(task.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded-pill ${priorityColors[task.priority]}`}>
                      {task.priority.toUpperCase()}
                    </span>
                    <ChevronRight size={16} className="text-text-muted" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        <Link to="/learn" className="block">
          <button className="w-full py-3 border-2 border-primary text-primary font-bold rounded-button hover:bg-primary/5 transition-all">
            Show More
          </button>
        </Link>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, textColor }: { icon: React.ReactNode, label: string, value: string, color: string, textColor: string }) {
  return (
    <div className={`p-4 rounded-card shadow-sm border border-surface/10 space-y-2 ${color}`}>
      <div className="w-8 h-8 rounded-lg bg-surface/80 flex items-center justify-center shadow-sm">
        {icon}
      </div>
      <div>
        <p className={`text-lg font-bold tabular-nums ${textColor}`}>{value}</p>
        <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

function ClipboardList({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  );
}
