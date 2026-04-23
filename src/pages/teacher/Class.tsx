import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Target, 
  Clock, 
  Award, 
  ChevronRight, 
  X, 
  TrendingUp, 
  BookOpen, 
  Activity,
  Crown,
  Search,
  Filter
} from 'lucide-react';
import TopBar from '../../components/TopBar';

export default function Class() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'xp' | 'accuracy' | 'score'>('xp');

  const fetchClassData = async () => {
    if (!profile) return;

    // 1. Fetch all students and their stats
    const { data: studentProfiles } = await supabase
      .from('profiles')
      .select('*, student_stats(*)')
      .eq('role', 'student');

    // 2. Fetch all submissions across all modules
    const { data: allSubmissions } = await supabase
      .from('assignment_submissions')
      .select(`
        *,
        modules(subject, module_name)
      `)
      .eq('status', 'submitted');

    if (!studentProfiles) {
      setLoading(false);
      return;
    }

    // 3. Process data
    const processedStudents = studentProfiles.map(s => {
      const stats = Array.isArray(s.student_stats) 
        ? s.student_stats[0] 
        : (s.student_stats || null);
      
      const studentSubs = (allSubmissions || []).filter(sub => sub.student_id === s.id);
      
      // Calculate overall metrics
      const totalScore = studentSubs.reduce((acc, sub) => acc + (sub.score || 0), 0);
      const totalQuestions = studentSubs.reduce((acc, sub) => acc + (sub.total_questions || 1), 0);
      const totalTime = studentSubs.reduce((acc, sub) => acc + (sub.time_taken_seconds || 0), 0);
      
      const avgScore = studentSubs.length > 0 ? (totalScore / totalQuestions) * 100 : 0;
      const avgTime = studentSubs.length > 0 ? totalTime / studentSubs.length : 0;
      const accuracy = stats?.accuracy_all_time || avgScore;

      // Group by subject
      const subjectMetrics = studentSubs.reduce((acc: any, sub: any) => {
        const subject = sub.modules?.subject || 'Other';
        if (!acc[subject]) {
          acc[subject] = { score: 0, questions: 0, time: 0, count: 0 };
        }
        acc[subject].score += sub.score || 0;
        acc[subject].questions += sub.total_questions || 1;
        acc[subject].time += sub.time_taken_seconds || 0;
        acc[subject].count++;
        return acc;
      }, {});

      const subjectBreakdown = Object.entries(subjectMetrics).map(([name, m]: [string, any]) => ({
        name,
        avgScore: (m.score / m.questions) * 100,
        avgTime: m.time / m.count,
        count: m.count
      }));

      return {
        ...s,
        stats,
        overall: {
          xp: stats?.total_xp ?? 0,
          avgScore,
          avgTime,
          accuracy,
          totalModules: studentSubs.length
        },
        subjectBreakdown
      };
    });

    // Sort by XP initially with time-based tie-breaker
    const sorted = processedStudents.sort((a, b) => {
      if (b.overall.xp !== a.overall.xp) return b.overall.xp - a.overall.xp;
      const timeA = new Date(a.stats?.updated_at || 0).getTime();
      const timeB = new Date(b.stats?.updated_at || 0).getTime();
      return timeA - timeB;
    });
    setStudents(sorted);
    setLoading(false);
  };

  useEffect(() => {
    fetchClassData();
    const interval = setInterval(fetchClassData, 30000);
    return () => clearInterval(interval);
  }, [profile]);

  const filteredStudents = [...students]
    .filter(s => s.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'xp') {
        if (b.overall.xp !== a.overall.xp) return b.overall.xp - a.overall.xp;
        const timeA = new Date(a.stats?.updated_at || 0).getTime();
        const timeB = new Date(b.stats?.updated_at || 0).getTime();
        return timeA - timeB;
      }
      if (sortBy === 'accuracy') {
        if (b.overall.accuracy !== a.overall.accuracy) return b.overall.accuracy - a.overall.accuracy;
        const timeA = new Date(a.stats?.updated_at || 0).getTime();
        const timeB = new Date(b.stats?.updated_at || 0).getTime();
        return timeA - timeB;
      }
      if (sortBy === 'score') {
        if (b.overall.avgScore !== a.overall.avgScore) return b.overall.avgScore - a.overall.avgScore;
        const timeA = new Date(a.stats?.updated_at || 0).getTime();
        const timeB = new Date(b.stats?.updated_at || 0).getTime();
        return timeA - timeB;
      }
      return 0;
    });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-8 pb-32 transition-colors duration-300">
      <TopBar 
        title="Class Metrics"
        subtitle="Comprehensive Student Analytics"
      />

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
          <input 
            type="text"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-surface border border-surface/10 rounded-3xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-text-primary"
          />
        </div>
        <div className="flex gap-2">
          {(['xp', 'accuracy', 'score'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSortBy(type)}
              className={`px-6 py-4 rounded-3xl font-bold text-xs uppercase tracking-widest transition-all border ${
                sortBy === type 
                  ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
                  : 'bg-surface text-text-muted border-surface/10 hover:border-primary/30'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Podium for Top 3 (Based on current sort) */}
      <div className="flex items-end justify-center gap-2 pt-8 pb-4">
        {[1, 0, 2].map((idx) => {
          const s = filteredStudents[idx];
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
                  {s.profile_photo_url ? (
                    <img src={s.profile_photo_url} alt="PFP" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-background text-text-muted font-bold text-xl">
                      {s.full_name[0]}
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
                  {s.full_name.split(' ')[0]}
                </p>
                <p className="text-[10px] text-text-muted font-bold">
                  {sortBy === 'xp' ? `${s.overall.xp} XP` : sortBy === 'accuracy' ? `${s.overall.accuracy.toFixed(2)}% Acc` : `${s.overall.avgScore.toFixed(2)}% Score`}
                </p>
              </div>
              <div className={`w-full rounded-t-2xl shadow-inner ${
                isFirst ? 'h-20 bg-warning/20' : isSecond ? 'h-14 bg-surface' : 'h-10 bg-amber-700/10'
              }`} />
            </motion.div>
          );
        })}
      </div>

      {/* Student List */}
      <div className="space-y-3">
        {filteredStudents.map((s, i) => {
          const isTop3 = i < 3;
          const rankColor = i === 0 ? 'bg-warning/10 border-warning/30' : 
                            i === 1 ? 'bg-slate-200/50 border-slate-300/30' : 
                            i === 2 ? 'bg-amber-700/10 border-amber-700/30' : 'bg-surface border-surface/10';
          
          return (
            <button 
              key={s.id} 
              onClick={() => setSelectedStudent(s)}
              className={`w-full p-4 rounded-card shadow-sm border flex items-center gap-4 transition-all hover:scale-[1.01] text-left ${
                isTop3 ? `${rankColor} border-l-4` : 'bg-surface border-surface/10'
              }`}
            >
              <span className={`w-6 text-sm font-bold ${
                i === 0 ? 'text-warning' : 
                i === 1 ? 'text-slate-500' : 
                i === 2 ? 'text-amber-800' : 'text-text-muted'
              }`}>{i + 1}</span>
              <div className="w-10 h-10 rounded-full bg-background overflow-hidden">
                {s.profile_photo_url ? (
                  <img src={s.profile_photo_url} alt="PFP" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-muted font-bold">
                    {s.full_name[0]}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-text-primary">{s.full_name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    <Target size={10} /> {s.overall.accuracy.toFixed(2)}%
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    <Clock size={10} /> {Math.floor(s.overall.avgTime / 60)}:{(Math.round(s.overall.avgTime % 60)).toString().padStart(2, '0')}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm text-primary">
                  {sortBy === 'xp' ? `${s.overall.xp} XP` : sortBy === 'accuracy' ? `${s.overall.accuracy.toFixed(2)}%` : `${s.overall.avgScore.toFixed(2)}%`}
                </p>
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
                  {sortBy === 'xp' ? (s.stats?.current_league || 'Bronze') : sortBy === 'accuracy' ? 'Accuracy' : 'Avg Score'}
                </p>
              </div>
              <ChevronRight size={16} className="text-text-muted" />
            </button>
          );
        })}
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
                    {selectedStudent.profile_photo_url ? (
                      <img src={selectedStudent.profile_photo_url} alt="PFP" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl font-bold">
                        {selectedStudent.full_name[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">{selectedStudent.full_name}</h2>
                    <p className="text-white/70 font-medium text-sm">{(selectedStudent.stats?.current_league || 'Bronze')} League Student</p>
                  </div>
                </div>
              </div>

              {/* Overall Stats */}
              <div className="p-8 grid grid-cols-4 gap-4 bg-background border-b border-surface/10">
                <div className="bg-surface p-4 rounded-3xl border border-surface/10 shadow-sm text-center">
                  <TrendingUp size={20} className="mx-auto mb-2 text-primary" />
                  <p className="text-xl font-bold text-text-primary">{selectedStudent.overall.xp}</p>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Total XP</p>
                </div>
                <div className="bg-surface p-4 rounded-3xl border border-surface/10 shadow-sm text-center">
                  <Target size={20} className="mx-auto mb-2 text-danger" />
                  <p className="text-xl font-bold text-text-primary">{selectedStudent.overall.accuracy.toFixed(2)}%</p>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Accuracy</p>
                </div>
                <div className="bg-surface p-4 rounded-3xl border border-surface/10 shadow-sm text-center">
                  <Award size={20} className="mx-auto mb-2 text-success" />
                  <p className="text-xl font-bold text-text-primary">{selectedStudent.overall.avgScore.toFixed(2)}%</p>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Avg Score</p>
                </div>
                <div className="bg-surface p-4 rounded-3xl border border-surface/10 shadow-sm text-center">
                  <Clock size={20} className="mx-auto mb-2 text-warning" />
                  <p className="text-xl font-bold text-text-primary">
                    {Math.floor(selectedStudent.overall.avgTime / 60)}:{(selectedStudent.overall.avgTime % 60).toString().padStart(2, '0')}
                  </p>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Avg Time</p>
                </div>
              </div>

              {/* Subject Breakdown */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <div className="space-y-6">
                  <h3 className="font-bold text-sm uppercase tracking-widest text-text-muted flex items-center gap-2">
                    <BookOpen size={16} /> Subject Performance
                  </h3>
                  <div className="grid gap-4">
                    {selectedStudent.subjectBreakdown.map((subject: any) => (
                      <div key={subject.name} className="p-6 bg-surface rounded-[32px] border border-surface/10 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-lg text-text-primary">{subject.name}</h4>
                          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest">
                            {subject.count} Modules
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Score</p>
                            <p className="text-lg font-bold text-primary">{subject.avgScore.toFixed(2)}%</p>
                            <div className="w-full h-1 bg-background rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${subject.avgScore}%` }} />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Time</p>
                            <p className="text-lg font-bold text-warning">
                              {Math.floor(subject.avgTime / 60)}:{(subject.avgTime % 60).toString().padStart(2, '0')}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Effort</p>
                            <div className="flex items-center gap-1">
                              {subject.avgScore < 40 ? (
                                <>
                                  <Activity size={14} className="text-danger" />
                                  <p className="text-lg font-bold text-danger">Needs Attention</p>
                                </>
                              ) : subject.avgScore < 75 ? (
                                <>
                                  <Activity size={14} className="text-warning" />
                                  <p className="text-lg font-bold text-warning">Steady Progress</p>
                                </>
                              ) : (
                                <>
                                  <Activity size={14} className="text-success" />
                                  <p className="text-lg font-bold text-success">Peak Performance</p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {selectedStudent.subjectBreakdown.length === 0 && (
                      <div className="text-center py-12 text-text-muted border-2 border-dashed border-surface/10 rounded-[40px]">
                        <Activity size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-sm font-bold uppercase tracking-widest">No subject data available yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
