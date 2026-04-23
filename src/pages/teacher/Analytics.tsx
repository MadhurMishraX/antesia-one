import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, Timer, Target, CheckCircle2, X, Activity, ChevronRight, Search, BookOpen, Clock, Award, Crown } from 'lucide-react';

import TopBar from '../../components/TopBar';

export default function Analytics() {
  const { profile } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentLeaderboard, setStudentLeaderboard] = useState<any[]>([]);
  const [leaderboardSortBy, setLeaderboardSortBy] = useState<'xp' | 'score' | 'accuracy'>('xp');
  const [studentWorkModule, setStudentWorkModule] = useState<string | null>(null);
  const [studentWork, setStudentWork] = useState<any>(null);
  const [teacherModules, setTeacherModules] = useState<any[]>([]);

  const fetchAnalytics = async () => {
    if (!profile) return;

    // Fetch all submissions for modules created by this teacher
    const { data: modules } = await supabase
      .from('modules')
      .select(`
        id, module_name, xp_reward,
        assignment_submissions(
          id, score, total_questions, time_taken_seconds, student_id, 
          profiles(
            full_name, 
            profile_photo_url,
            student_stats!student_stats_student_id_fkey(total_xp, current_league, accuracy_all_time)
          )
        )
      `)
      .eq('created_by', profile.id);

    setTeacherModules(modules || []);

    const allSubs = modules?.flatMap(m => (m.assignment_submissions || []).map((s: any) => ({ ...s, module_name: m.module_name }))) || [];
    
    if (allSubs.length === 0) {
      setLoading(false);
      return;
    }

    // Calculate summary
    const avgScore = allSubs.reduce((acc, s) => {
      const safeScore = (s.score ?? 0) / (s.total_questions || 1);
      return acc + safeScore;
    }, 0) / allSubs.length * 100;
    
    const avgTime = allSubs.reduce((acc, s) => acc + (s.time_taken_seconds || 0), 0) / allSubs.length;
    const avgAccuracy = avgScore; // Simplified for MVP
    
    const { data: students } = await supabase.from('profiles').select('id').eq('role', 'student');
    const totalPossible = (students?.length || 0) * (modules?.length || 0);
    const completionRate = (allSubs.length / totalPossible) * 100;

    // Calculate per-student leaderboard
    const studentMap = allSubs.reduce((acc: any, s: any) => {
      if (!acc[s.student_id]) {
        acc[s.student_id] = {
          id: s.student_id,
          name: s.profiles.full_name,
          photo: s.profiles.profile_photo_url,
          totalScore: 0,
          totalPossible: 0,
          totalTime: 0,
          count: 0
        };
      }
      acc[s.student_id].totalScore += s.score || 0;
      acc[s.student_id].totalPossible += s.total_questions || 1;
      acc[s.student_id].totalTime += s.time_taken_seconds || 0;
      acc[s.student_id].count++;
      acc[s.student_id].stats = s.profiles.student_stats?.[0] || {};
      return acc;
    }, {});

    const leaderboard = Object.values(studentMap).map((s: any) => ({
      ...s,
      avgScore: Math.round((s.totalScore / s.totalPossible) * 100),
      avgTime: Math.round(s.totalTime / s.count),
      accuracy: s.stats.accuracy_all_time || Math.round((s.totalScore / s.totalPossible) * 100),
      xp: s.stats.total_xp || 0,
      league: s.stats.current_league || 'Bronze'
    }));

    setStudentLeaderboard(leaderboard);

    setSummary({
      avgScore: avgScore.toFixed(2),
      avgTime: Math.floor(avgTime / 60) + ':' + (avgTime % 60).toFixed(2).padStart(5, '0'),
      avgAccuracy: avgAccuracy.toFixed(2),
      completionRate: completionRate.toFixed(2),
      perStudent: {
        avgScore: Object.values(allSubs.reduce((acc: any, s: any) => {
          if (!acc[s.student_id]) acc[s.student_id] = { name: s.profiles.full_name, total: 0, count: 0 };
          const safeScore = (s.score ?? 0) / (s.total_questions || 1);
          acc[s.student_id].total += safeScore * 100;
          acc[s.student_id].count++;
          return acc;
        }, {})).map((s: any) => ({ student_name: s.name, value_percent: (s.total / s.count).toFixed(2) }))
      }
    });

    // Calculate charts
    const scorePerModule = modules?.map(m => {
      const subs = m.assignment_submissions || [];
      const avg = subs.length > 0 ? Math.round((subs.reduce((acc, s) => {
        const safeScore = (s.score ?? 0) / (s.total_questions || 1);
        return acc + safeScore;
      }, 0) / subs.length) * 100) : 0;
      return { module_name: m.module_name, avg_score_percent: avg };
    });

    setCharts({
      scorePerModule
    });

    setLoading(false);
  };

  const fetchStudentWork = async (submissionId: string, moduleId: string) => {
    setStudentWorkModule(moduleId);
    setStudentWork(null);

    const { data: submission } = await supabase
      .from('assignment_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    const { data: answers } = await supabase
      .from('submission_answers')
      .select('*, questions(*)')
      .eq('submission_id', submissionId)
      .order('question_number', { ascending: true });

    setStudentWork({ submission, answers });
  };

  useEffect(() => {
    fetchAnalytics();

    window.addEventListener('focus', fetchAnalytics);
    return () => window.removeEventListener('focus', fetchAnalytics);
  }, [profile]);

  const sortedLeaderboard = [...studentLeaderboard].sort((a, b) => {
    if (leaderboardSortBy === 'xp') {
      if (b.xp !== a.xp) return b.xp - a.xp;
      const timeA = new Date(a.stats?.updated_at || 0).getTime();
      const timeB = new Date(b.stats?.updated_at || 0).getTime();
      return timeA - timeB;
    }
    if (leaderboardSortBy === 'score') {
      if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
      const timeA = new Date(a.stats?.updated_at || 0).getTime();
      const timeB = new Date(b.stats?.updated_at || 0).getTime();
      return timeA - timeB;
    }
    if (leaderboardSortBy === 'accuracy') {
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      const timeA = new Date(a.stats?.updated_at || 0).getTime();
      const timeB = new Date(b.stats?.updated_at || 0).getTime();
      return timeA - timeB;
    }
    return 0;
  });

  if (loading) return null;

  return (
    <div className="p-6 space-y-8 transition-colors duration-300">
      <TopBar 
        title="Analytics"
        subtitle="Performance Insights"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard 
          icon={<Target size={20} className="text-primary" />} 
          value={`${summary?.avgScore || 0}%`} 
          label="Avg Score" 
          onClick={() => setExpandedMetric('avgScore')}
          color="primary"
        />
        <MetricCard 
          icon={<Timer size={20} className="text-warning" />} 
          value={summary?.avgTime || '0:00'} 
          label="Avg Time" 
          onClick={() => setExpandedMetric('avgTime')}
          color="warning"
        />
        <MetricCard 
          icon={<Activity size={20} className="text-danger" />} 
          value={`${summary?.avgAccuracy || 0}%`} 
          label="Accuracy" 
          onClick={() => setExpandedMetric('avgAccuracy')}
          color="danger"
        />
        <MetricCard 
          icon={<CheckCircle2 size={20} className="text-success" />} 
          value={`${summary?.completionRate || 0}%`} 
          label="Completion" 
          onClick={() => setExpandedMetric('completion')}
          color="success"
        />
      </div>

      {/* Expanded Panel */}
      <AnimatePresence>
        {expandedMetric && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-surface rounded-[32px] shadow-sm border border-surface/10 p-8 relative overflow-hidden"
          >
            <button onClick={() => setExpandedMetric(null)} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-background text-text-muted">
              <X size={18} />
            </button>
            <h3 className="font-bold text-sm uppercase tracking-widest text-text-muted mb-6">Student Breakdown</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {summary?.perStudent?.avgScore?.map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 bg-background rounded-[16px] border border-transparent hover:border-primary/10 transition-all">
                  <span className="text-sm font-bold text-text-primary">{s.student_name}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 bg-surface rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${s.value_percent}%` }} />
                    </div>
                    <span className="text-sm font-bold text-primary tabular-nums">{s.value_percent}%</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Graphs Section */}
      <div className="space-y-6">
        <ChartCard title="Avg Score per Module" data={charts?.scorePerModule} dataKey="avg_score_percent" />
      </div>

      {/* Student Performance Leaderboard */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm uppercase tracking-widest text-text-muted">Student Performance Leaderboard</h3>
          <div className="flex gap-2">
            {(['xp', 'score', 'accuracy'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setLeaderboardSortBy(type)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border ${
                  leaderboardSortBy === type 
                    ? 'bg-primary text-white border-primary shadow-md shadow-primary/20' 
                    : 'bg-surface text-text-muted border-surface/10 hover:border-primary/30'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Podium for Top 3 */}
        <div className="flex items-end justify-center gap-2 pt-8 pb-4">
          {[1, 0, 2].map((idx) => {
            const s = sortedLeaderboard[idx];
            if (!s) return <div key={idx} className="flex-1" />;
            const isFirst = idx === 0;
            const isSecond = idx === 1;
            const isThird = idx === 2;
            
            return (
              <motion.div 
                key={s.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex-1 flex flex-col items-center gap-3 ${isFirst ? 'z-10' : ''}`}
                onClick={() => setSelectedStudent(s)}
              >
                <div className="relative cursor-pointer group">
                  <div className={`rounded-full overflow-hidden border-4 shadow-lg transition-transform group-hover:scale-110 ${
                    isFirst ? 'w-20 h-20 border-warning' : 'w-16 h-16 border-surface'
                  }`}>
                    {s.photo ? (
                      <img src={s.photo} alt="PFP" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-background text-text-muted font-bold text-xl">
                        {s.name[0]}
                      </div>
                    )}
                  </div>
                  {isFirst && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-warning">
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
                  <p className={`font-bold text-xs truncate max-w-[80px] text-text-primary ${isFirst ? 'text-sm' : ''}`}>
                    {s.name.split(' ')[0]}
                  </p>
                  <p className="text-[10px] text-text-muted font-bold">
                    {leaderboardSortBy === 'xp' ? `${s.xp} XP` : leaderboardSortBy === 'score' ? `${s.avgScore}% Score` : `${s.accuracy.toFixed(1)}% Acc`}
                  </p>
                </div>
                <div className={`w-full rounded-t-2xl shadow-inner ${
                  isFirst ? 'h-20 bg-warning/20' : isSecond ? 'h-14 bg-surface' : 'h-10 bg-amber-700/10'
                }`} />
              </motion.div>
            );
          })}
        </div>

        {/* List for All Students */}
        <div className="space-y-3">
          {sortedLeaderboard.map((s, i) => {
            const isTop3 = i < 3;
            const rankColor = i === 0 ? 'bg-warning/10 border-warning/30' : 
                              i === 1 ? 'bg-slate-200/50 border-slate-300/30' : 
                              i === 2 ? 'bg-amber-700/10 border-amber-700/30' : 'bg-surface border-surface/10';
            
            return (
              <button 
                key={s.id} 
                onClick={() => setSelectedStudent(s)}
                className={`w-full p-4 rounded-card shadow-sm border flex items-center gap-4 transition-all hover:scale-[1.02] text-left ${
                  isTop3 ? `${rankColor} border-l-4` : 'bg-surface border-surface/10'
                }`}
              >
                <span className={`w-6 text-sm font-bold ${
                  i === 0 ? 'text-warning' : 
                  i === 1 ? 'text-slate-500' : 
                  i === 2 ? 'text-amber-800' : 'text-text-muted'
                }`}>{i + 1}</span>
                <div className="w-10 h-10 rounded-full bg-background overflow-hidden">
                  {s.photo ? (
                    <img src={s.photo} alt="PFP" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted font-bold">
                      {s.name[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm text-text-primary">{s.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                      <Target size={10} /> {s.accuracy.toFixed(1)}%
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                      <Clock size={10} /> {Math.floor(s.avgTime / 60)}:{(s.avgTime % 60).toFixed(0).padStart(2, '0')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-primary">
                    {leaderboardSortBy === 'xp' ? `${s.xp} XP` : leaderboardSortBy === 'score' ? `${s.avgScore}%` : `${s.accuracy.toFixed(1)}%`}
                  </p>
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
                    {leaderboardSortBy === 'xp' ? s.league : leaderboardSortBy === 'score' ? 'Avg Score' : 'Accuracy'}
                  </p>
                </div>
                <ChevronRight size={16} className="text-text-muted" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Student Detail Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStudent(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-surface rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-8 bg-primary text-white relative">
                <button 
                  onClick={() => setSelectedStudent(null)}
                  className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-3xl bg-white/20 overflow-hidden border-2 border-white/30">
                    {selectedStudent.photo ? (
                      <img src={selectedStudent.photo} alt="PFP" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl font-bold">
                        {selectedStudent.name[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">{selectedStudent.name}</h2>
                    <p className="text-white/70 font-medium text-sm">Student Performance Profile</p>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="p-8 grid grid-cols-3 gap-4 bg-background border-b border-surface/10">
                <div className="bg-surface p-4 rounded-3xl border border-surface/10 shadow-sm text-center">
                  <Target size={20} className="mx-auto mb-2 text-primary" />
                  <p className="text-xl font-bold text-text-primary">{selectedStudent.accuracy.toFixed(2)}%</p>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Accuracy</p>
                </div>
                <div className="bg-surface p-4 rounded-3xl border border-surface/10 shadow-sm text-center">
                  <Clock size={20} className="mx-auto mb-2 text-warning" />
                  <p className="text-xl font-bold text-text-primary">
                    {Math.floor(selectedStudent.avgTime / 60)}:{(selectedStudent.avgTime % 60).toFixed(2).padStart(5, '0')}
                  </p>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Avg Time</p>
                </div>
                <div className="bg-surface p-4 rounded-3xl border border-surface/10 shadow-sm text-center">
                  <Award size={20} className="mx-auto mb-2 text-success" />
                  <p className="text-xl font-bold text-text-primary">{selectedStudent.avgScore.toFixed(2)}%</p>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Avg Score</p>
                </div>
              </div>

              {/* Module Selection & Work View */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                <div className="space-y-4">
                  <h3 className="font-bold text-sm uppercase tracking-widest text-text-muted flex items-center gap-2">
                    <BookOpen size={16} /> Select Module to View Work
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {teacherModules.map((m) => {
                      const sub = m.assignment_submissions.find((s: any) => s.student_id === selectedStudent.id);
                      if (!sub) return null;
                      return (
                        <button 
                          key={m.id}
                          onClick={() => fetchStudentWork(sub.id, m.id)}
                          className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                            studentWorkModule === m.id 
                              ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
                              : 'bg-surface text-text-muted border-surface/10 hover:border-primary/30'
                          }`}
                        >
                          {m.module_name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Work Detail */}
                <AnimatePresence mode="wait">
                  {studentWork ? (
                    <motion.div 
                      key={studentWorkModule}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
                        <div>
                          <p className="text-xs font-bold text-primary uppercase tracking-widest">Module Score</p>
                          <p className="text-lg font-bold text-text-primary">{studentWork.submission.score} / {studentWork.submission.total_questions}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-primary uppercase tracking-widest">Time Taken</p>
                          <p className="text-lg font-bold text-text-primary">
                            {Math.floor(studentWork.submission.time_taken_seconds / 60)}:{(studentWork.submission.time_taken_seconds % 60).toFixed(2).padStart(5, '0')}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {(studentWork.answers || []).map((ans: any, i: number) => (
                          <div key={ans.id} className="p-5 bg-surface rounded-3xl border border-surface/10 shadow-sm space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1">Question {ans.question_number}</p>
                                <p className="text-sm font-medium text-text-primary leading-relaxed">{ans.questions.question_text}</p>
                              </div>
                              <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                ans.is_correct ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                              }`}>
                                {ans.is_correct ? 'Correct' : 'Incorrect'}
                              </div>
                            </div>
                            <div className="p-3 bg-background rounded-xl border border-surface/10">
                              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Student's Answer</p>
                              <p className="text-sm font-bold text-text-primary">
                                {ans.questions.question_type === 'MCQ' 
                                  ? ans.questions.options.find((o: any) => o.option_id === ans.selected_option_id)?.option_text || 'No option selected'
                                  : ans.text_answer || 'No answer provided'}
                              </p>
                            </div>
                            {!ans.is_correct && (
                              <div className="p-3 bg-success/5 rounded-xl border border-success/10">
                                <p className="text-[10px] font-bold text-success uppercase tracking-widest mb-1">Correct Answer</p>
                                <p className="text-sm font-bold text-success">
                                  {ans.questions.question_type === 'MCQ'
                                    ? ans.questions.options.find((o: any) => o.is_correct)?.option_text
                                    : ans.questions.correct_answer_text}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ) : studentWorkModule ? (
                    <div className="flex flex-col items-center justify-center py-12 text-text-muted">
                      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                      <p className="text-sm font-bold uppercase tracking-widest">Loading Work...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-text-muted border-2 border-dashed border-surface/10 rounded-[40px]">
                      <Activity size={48} className="mb-4 opacity-20" />
                      <p className="text-sm font-bold uppercase tracking-widest">Select a module to view details</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MetricCard({ icon, value, label, onClick, color }: any) {
  const colorMap: any = {
    primary: 'bg-primary/10 text-primary',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
    success: 'bg-success/10 text-success'
  };

  return (
    <button 
      onClick={onClick}
      className="bg-surface p-6 rounded-[28px] shadow-sm border border-surface/10 text-left space-y-4 hover:border-primary/30 transition-all active:scale-95 group"
    >
      <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center transition-transform group-hover:scale-110 ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums text-text-primary">{value}</p>
        <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-1">{label}</p>
      </div>
    </button>
  );
}

function ChartCard({ title, data, dataKey }: any) {
  return (
    <div className="bg-surface p-8 rounded-[32px] shadow-sm border border-surface/10 space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm uppercase tracking-widest text-text-muted">{title}</h3>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Score %</span>
        </div>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(var(--text-muted), 0.1)" />
            <XAxis 
              dataKey="module_name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 600 }}
              interval={0}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 600 }}
            />
            <Tooltip 
              cursor={{ fill: 'rgba(var(--primary), 0.05)', radius: 8 }}
              contentStyle={{ 
                borderRadius: '16px', 
                border: 'none', 
                backgroundColor: 'var(--surface)',
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                padding: '12px',
                color: 'var(--text-primary)'
              }}
              itemStyle={{ color: 'var(--text-primary)' }}
            />
            <Bar dataKey={dataKey} fill="var(--primary)" radius={[6, 6, 0, 0]} barSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
