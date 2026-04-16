import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams, Link } from 'react-router-dom';
import { Bell, ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Paperclip, Send, Search, MessageSquare } from 'lucide-react';

import TopBar from '../../components/TopBar';
import { getSubjectStyle, SUBJECTS } from '../../lib/constants';

export default function StudyVault() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'due' | 'completed' | 'missed') || 'due';
  const [activeTab, setActiveTab] = useState<'due' | 'completed' | 'missed'>(initialTab);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('All Subjects');
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && (tab === 'due' || tab === 'completed' || tab === 'missed')) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    async function fetchAssignments() {
      if (!profile) return;
      setLoading(true);

      let query = supabase
        .from('modules')
        .select(`
          *,
          assignment_submissions!left(*)
        `)
        .eq('is_published', true)
        .eq('assignment_submissions.student_id', profile.id)
        .order('created_at', { ascending: false });

      if (subject !== 'All Subjects') {
        query = query.eq('subject', subject);
      }

      const { data } = await query;
      
      const filtered = (data || []).map((module: any) => {
        const subs = Array.isArray(module.assignment_submissions) 
          ? module.assignment_submissions 
          : (module.assignment_submissions ? [module.assignment_submissions] : []);
          
        const submission = subs[0]; // Should only be one due to filter
        return { ...module, userSubmission: submission };
      }).filter((module: any) => {
        const status = module.userSubmission?.status || 'not_started';
        const isMissed = new Date(module.due_date) < new Date() && status !== 'submitted';

        if (activeTab === 'due') return status !== 'submitted' && !isMissed;
        if (activeTab === 'completed') return status === 'submitted';
        if (activeTab === 'missed') return isMissed;
        return false;
      });

      setAssignments(filtered);
      setLoading(false);
    }

    fetchAssignments();
  }, [profile, activeTab, subject]);

  const priorityColors: any = {
    Crucial: 'bg-danger text-white',
    Vital: 'bg-warning text-white',
    Foundational: 'bg-primary text-white',
    Supporting: 'bg-gray-400 text-white',
  };

  return (
    <div className="p-6 space-y-6 transition-colors duration-300">
      <TopBar 
        title="Study Vault"
        subtitle="Your learning journey"
      />

      {/* Subject Dropdown */}
      <div className="relative">
        <button 
          onClick={() => setShowSubjectPicker(!showSubjectPicker)}
          className="w-full bg-surface p-4 rounded-pill shadow-sm border border-surface/10 flex items-center justify-between font-bold text-sm"
        >
          {subject}
          <ChevronDown size={20} className={`transition-transform ${showSubjectPicker ? 'rotate-180' : ''}`} />
        </button>
        
        <AnimatePresence>
          {showSubjectPicker && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
                onClick={() => setShowSubjectPicker(false)}
              />
              <motion.div 
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                className="fixed bottom-0 left-0 right-0 bg-surface rounded-t-[32px] p-8 z-50 shadow-2xl border-t border-surface/10"
              >
                <h3 className="text-xl font-bold mb-6 text-text-primary">Select Subject</h3>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  <button
                    onClick={() => { setSubject('All Subjects'); setShowSubjectPicker(false); }}
                    className={`w-full p-4 rounded-card text-left font-bold transition-all flex items-center gap-4 ${
                      subject === 'All Subjects' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-background text-text-primary hover:bg-surface/50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${subject === 'All Subjects' ? 'bg-white/20' : 'bg-surface shadow-sm'}`}>
                      <Search size={20} />
                    </div>
                    <span>All Subjects</span>
                  </button>

                  {SUBJECTS.map((s) => {
                    const Icon = s.icon;
                    const isActive = subject === s.name;
                    return (
                      <button
                        key={s.id}
                        onClick={() => { setSubject(s.name); setShowSubjectPicker(false); }}
                        className={`w-full p-4 rounded-card text-left font-bold transition-all flex items-center gap-4 ${
                          isActive ? `${s.color} text-white shadow-lg shadow-primary/20` : 'bg-background text-text-primary hover:bg-surface/50'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-white/20' : 'bg-surface shadow-sm'} ${isActive ? 'text-white' : s.textColor}`}>
                          <Icon size={20} />
                        </div>
                        <span>{s.name}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-surface/10">
        {(['due', 'completed', 'missed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 text-sm font-bold capitalize relative transition-colors ${
              activeTab === tab ? 'text-primary' : 'text-text-muted'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Assignment List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : assignments.length > 0 ? (
          assignments.map((assignment) => {
            const subjectStyle = getSubjectStyle(assignment.subject);
            const Icon = subjectStyle.icon;
            
            return (
              <Link 
                key={assignment.id} 
                to={assignment.userSubmission?.status === 'submitted' ? `/results/${assignment.userSubmission.id}` : `/assignment/${assignment.id}/interface`} 
                className="block"
              >
                <div className={`bg-surface p-4 rounded-card shadow-sm border border-surface/10 flex items-center gap-4 transition-all active:scale-[0.98] ${activeTab === 'missed' ? 'opacity-70' : ''}`}>
                  <div className={`w-10 h-10 rounded-full ${subjectStyle.lightColor} flex items-center justify-center ${subjectStyle.textColor} font-bold`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm truncate text-text-primary">{assignment.module_name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-text-muted font-medium">
                        {new Date(assignment.due_date).toLocaleDateString()}
                      </p>
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-pill ${priorityColors[assignment.priority]}`}>
                        {assignment.priority.toUpperCase()}
                      </span>
                    </div>
                    {activeTab === 'completed' && (
                      <p className="text-[10px] text-success font-bold mt-1">
                        +{assignment.assignment_submissions?.[0]?.xp_earned || 0} XP
                      </p>
                    )}
                  </div>
                  <div>
                    {activeTab === 'due' && <ChevronRight size={20} className="text-text-muted" />}
                    {activeTab === 'completed' && <CheckCircle2 size={20} className="text-success" />}
                    {activeTab === 'missed' && <span className="text-[10px] font-bold text-danger bg-danger/10 px-2 py-1 rounded-pill">Missed</span>}
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="py-12 text-center space-y-2">
            <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center mx-auto text-text-muted">
              <Search size={24} />
            </div>
            <p className="text-text-muted text-sm font-medium">No assignments found</p>
          </div>
        )}
      </div>

      {/* Doubts Subsection */}
      <div className="pt-6 space-y-4">
        <div className="h-px bg-surface/10 w-full" />
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-text-primary">Community Doubts</h3>
          <Link to="/doubts" className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">View All</Link>
        </div>
        <Link to="/doubts" className="block">
          <div className="bg-surface p-5 rounded-card shadow-sm border border-surface/10 flex items-center gap-4 hover:border-primary/30 transition-all active:scale-[0.98]">
            <div className="w-10 h-10 bg-primary/5 rounded-full flex items-center justify-center text-primary">
              <MessageSquare size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-xs text-text-primary">Have a Question?</h3>
              <p className="text-[10px] text-text-muted font-medium mt-0.5">
                Ask doubts or help others with their queries
              </p>
            </div>
            <ChevronRight size={16} className="text-text-muted" />
          </div>
        </Link>
      </div>
    </div>
  );
}
