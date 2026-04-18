import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, XCircle, HelpCircle, User, Zap, Clock, Award } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';

export default function ModuleSubmissions() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [module, setModule] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;

      // 1. Fetch module info
      const { data: mod } = await supabase
        .from('modules')
        .select('*')
        .eq('id', id)
        .single();
      setModule(mod);

      // 2. Fetch questions
      const { data: qs } = await supabase
        .from('questions')
        .select('*')
        .eq('module_id', id)
        .order('question_number', { ascending: true });
      setQuestions(qs || []);

      // 3. Fetch all submissions with student profiles
      const { data: subs } = await supabase
        .from('assignment_submissions')
        .select('*, profiles(full_name, login_id)')
        .eq('module_id', id)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false });
      
      // 4. For each submission, fetch answers
      if (subs && subs.length > 0) {
        const subsWithAnswers = await Promise.all(subs.map(async (sub) => {
          const { data: ans } = await supabase
            .from('submission_answers')
            .select('*')
            .eq('submission_id', sub.id);
          return { ...sub, answers: ans || [] };
        }));
        setSubmissions(subsWithAnswers);
      }

      setLoading(false);
    }
    fetchData();
  }, [id]);

  // 🌌 Antesia - Developed by Madhur Mishra (github: MadhurMishraX)

  const handleApprove = async (answerId: string, isCorrect: boolean) => {
    setApproving(true);
    try {
      const currentSub = submissions[currentIndex];
      const status = isCorrect ? 'approved' : 'rejected';
      
      // 1. Fetch LATEST xp_earned from DB to avoid stale state issues
      const { data: latestSub } = await supabase
        .from('assignment_submissions')
        .select('xp_earned')
        .eq('id', currentSub.id)
        .single();
      
      const oldXp = latestSub?.xp_earned || 0;

      // 2. Update answer status
      const { error: ansError } = await supabase
        .from('submission_answers')
        .update({ 
          is_correct: isCorrect,
          approval_status: status
        })
        .eq('id', answerId);

      console.log('Answer update error:', ansError);

      // After the update, immediately re-fetch that specific answer and log it:
      const { data: verify } = await supabase
        .from('submission_answers')
        .select('id, approval_status, is_correct')
        .eq('id', answerId)
        .single();
      console.log('DB verification after approve:', verify);

      if (ansError) throw ansError;

      // 3. Update local state
      const updatedSubmissions = [...submissions];
      const ansIdx = updatedSubmissions[currentIndex].answers.findIndex((a: any) => a.id === answerId);
      if (ansIdx === -1) {
        console.error('Answer not found in local state:', answerId);
        return;
      }

      updatedSubmissions[currentIndex].answers[ansIdx] = {
        ...updatedSubmissions[currentIndex].answers[ansIdx],
        is_correct: isCorrect,
        approval_status: status
      };

      // 4. Recalculate score and XP for the submission
      const correctCount = updatedSubmissions[currentIndex].answers.filter((a: any) => !!a.is_correct).length;
      const totalQs = questions.length;
      const xpEarned = Math.round((correctCount / totalQs) * (module.xp_reward || 0));

      // 5. Update submission record
      console.log('WRITING SCORE TO DB:', correctCount, 'answers array:', updatedSubmissions[currentIndex].answers.map((a: any) => ({ id: a.id, is_correct: a.is_correct })));
      const { error: subUpdateError } = await supabase
        .from('assignment_submissions')
        .update({ score: correctCount, xp_earned: xpEarned })
        .eq('id', currentSub.id);

      if (subUpdateError) {
        console.error('Error updating assignment_submissions score:', subUpdateError);
      }

      const { data: freshSub } = await supabase
        .from('assignment_submissions')
        .select('score, xp_earned')
        .eq('id', currentSub.id)
        .single();

      if (freshSub) {
        updatedSubmissions[currentIndex].score = freshSub.score;
        updatedSubmissions[currentIndex].xp_earned = freshSub.xp_earned;
        console.log('VERIFY SUBMISSION AFTER APPROVE (FRESH):', freshSub);
      }

      // 5. Update student stats (XP difference, Accuracy, and League)
      const xpDiff = xpEarned - oldXp;
      const { data: stats, error: statsFetchError } = await supabase
        .from('student_stats')
        .select('*')
        .eq('student_id', currentSub.student_id)
        .single();
      
      if (statsFetchError) {
        console.error('Error fetching student stats for update:', statsFetchError);
      }

      if (stats) {
        const currentAccuracy = (correctCount / totalQs) * 100;
        const statsAccuracy = Number(stats.accuracy_all_time) || 0;
        const newAccuracy = statsAccuracy === 0
          ? currentAccuracy
          : ((statsAccuracy * 0.7) + (currentAccuracy * 0.3));

        let newTotalXp = (stats.total_xp || 0) + xpDiff;
        let newXpInLeague = (stats.xp_in_current_league || 0) + xpDiff;
        let newLeague = stats.current_league || 'Bronze';

        // League Transition Logic (Must match AssignmentInterface.tsx)
        if (newLeague === 'Bronze' && newXpInLeague >= 500) {
          newLeague = 'Silver';
          newXpInLeague -= 500;
        } else if (newLeague === 'Silver' && newXpInLeague >= 1000) {
          newLeague = 'Gold';
          newXpInLeague -= 1000;
        } else if (newLeague === 'Gold' && newXpInLeague >= 2000) {
          newLeague = 'Platinum';
          newXpInLeague -= 2000;
        }

        const { error: statsUpdateError } = await supabase
          .from('student_stats')
          .update({ 
            total_xp: newTotalXp,
            xp_in_current_league: newXpInLeague,
            current_league: newLeague,
            accuracy_all_time: newAccuracy.toFixed(2)
          })
          .eq('student_id', currentSub.student_id);
        
        if (statsUpdateError) {
          console.error('Error updating student stats:', statsUpdateError);
        }

        console.log('STATS UPDATED ON APPROVAL:', { newTotalXp, newLeague, newAccuracy });
      }

      updatedSubmissions[currentIndex].score = correctCount;
      updatedSubmissions[currentIndex].xp_earned = xpEarned;
      setSubmissions([...updatedSubmissions]);

      // 6. Send notification to student
      await supabase.from('notifications').insert({
        recipient_id: currentSub.student_id,
        type: 'xp_gain',
        title: 'Answers Approved! 🌟',
        body: `Your teacher approved your answers for "${module.module_name}". Your score is now ${correctCount}/${totalQs}.`,
        deep_link_target: 'study_vault',
        reference_id: module.id
      });

    } catch (err) {
      console.error('Approval error:', err);
    } finally {
      setApproving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (submissions.length === 0) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
        <User size={40} className="text-gray-300" />
      </div>
      <h2 className="text-xl font-bold mb-2">No Submissions Yet</h2>
      <p className="text-text-muted text-sm mb-8">Students haven't submitted this assignment yet.</p>
      <button onClick={() => navigate(-1)} className="px-6 py-3 bg-primary text-white font-bold rounded-button">
        Go Back
      </button>
    </div>
  );

  const currentSub = submissions[currentIndex];
  const pendingCount = currentSub?.answers?.filter((a: any) => a.is_correct === null && a.answer_status === 'answered').length || 0;

  const renderTextWithMath = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\$.*?\$)/g);
    return parts.map((part, i) => {
      if (part.startsWith('$') && part.endsWith('$')) {
        return <InlineMath key={i} math={part.slice(1, -1)} />;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors duration-300">
      {/* Top Bar */}
      <div className="p-4 bg-surface shadow-sm flex items-center justify-between sticky top-0 z-30 border-b border-surface/10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 text-text-muted hover:text-primary transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-sm font-bold truncate max-w-[200px] text-text-primary">{module?.module_name}</h2>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Submissions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex(currentIndex - 1)}
            className="p-2 text-text-muted hover:text-primary disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <span className="text-xs font-bold font-mono text-text-primary">
            {currentIndex + 1} / {submissions.length}
          </span>
          <button 
            disabled={currentIndex === submissions.length - 1}
            onClick={() => setCurrentIndex(currentIndex + 1)}
            className="p-2 text-text-muted hover:text-primary disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Student Header */}
          <div className="bg-surface rounded-[32px] p-6 shadow-sm border border-surface/10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <User size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-text-primary">{submissions[currentIndex]?.profiles?.full_name}</h3>
                <p className="text-xs font-bold text-text-muted uppercase tracking-widest">{submissions[currentIndex]?.profiles?.login_id}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <span className={`text-[8px] font-bold px-2 py-0.5 rounded-pill uppercase ${
                  submissions[currentIndex]?.status === 'submitted' ? 'bg-success text-white' : 'bg-warning text-white'
                }`}>
                  {submissions[currentIndex]?.status}
                </span>
                <Award size={18} className="text-warning" />
                <span className="text-xl font-bold text-text-primary">{submissions[currentIndex]?.score} / {submissions[currentIndex]?.total_questions}</span>
              </div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Current Score</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface p-4 rounded-card border border-surface/10 text-center">
              <Zap size={20} className="text-warning mx-auto mb-1" />
              <p className="text-lg font-bold text-text-primary">{submissions[currentIndex]?.xp_earned}</p>
              <p className="text-[8px] font-bold text-text-muted uppercase tracking-widest">XP Earned</p>
            </div>
            <div className="bg-surface p-4 rounded-card border border-surface/10 text-center">
              <Clock size={20} className="text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-text-primary">{Math.floor((submissions[currentIndex]?.time_taken_seconds || 0) / 60)}m</p>
              <p className="text-[8px] font-bold text-text-muted uppercase tracking-widest">Time Taken</p>
            </div>
            <div className="bg-surface p-4 rounded-card border border-surface/10 text-center">
              <HelpCircle size={20} className="text-violet-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-violet-500">{pendingCount}</p>
              <p className="text-[8px] font-bold text-text-muted uppercase tracking-widest">Pending</p>
            </div>
          </div>

          {/* Answers List */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-text-muted uppercase tracking-widest px-2">Responses</h4>
            {questions.map((q, i) => {
              const ans = submissions[currentIndex]?.answers?.find((a: any) => a.question_id === q.id);
              console.log('approval_status:', ans?.approval_status);
              const isPending = q.question_type === 'text_answer' && !ans?.approval_status && ans?.student_answer;
              
              return (
                <div key={q.id} className="bg-surface rounded-[24px] border border-surface/10 overflow-hidden shadow-sm">
                  <div className="p-5 border-b border-surface/5 flex items-center justify-between bg-background">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center font-bold text-xs shadow-sm text-text-primary">Q{i + 1}</span>
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{q.question_type}</span>
                    </div>
                    {ans?.is_correct === true && <CheckCircle2 size={20} className="text-success" />}
                    {ans?.is_correct === false && <XCircle size={20} className="text-danger" />}
                    {isPending && <span className="text-[8px] font-bold bg-warning/10 text-warning px-2 py-0.5 rounded-pill uppercase">Pending Review</span>}
                  </div>
                  
                  <div className="p-6 space-y-4">
                    <div className="text-sm font-medium leading-relaxed text-text-primary">
                      {renderTextWithMath(q.question_text)}
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Student Response</p>
                      <div className={`p-4 rounded-xl border-2 text-sm font-bold ${
                        ans?.is_correct === true ? 'bg-success/5 border-success text-success' :
                        ans?.is_correct === false ? 'bg-danger/5 border-danger text-danger' :
                        'bg-background border-transparent text-text-primary'
                      }`}>
                        {q.question_type === 'MCQ' ? (
                          q.options?.find((o: any) => o.option_id === ans?.student_answer)?.option_text || '(No Answer)'
                        ) : (
                          ans?.student_answer || '(No Answer)'
                        )}
                      </div>
                    </div>

                    {q.question_type === 'text_answer' && ans?.student_answer && (
                      <div className="flex gap-3 pt-2">
                        <button 
                          onClick={() => handleApprove(ans.id, true)}
                          disabled={approving}
                          className={`flex-1 py-3 text-white font-bold rounded-button shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 ${
                            ans?.is_correct === true ? 'bg-success ring-4 ring-success/30 ring-offset-1' : 'bg-success/80 hover:bg-success'
                          }`}
                        >
                          <CheckCircle2 size={18} />
                          Correct
                        </button>
                        <button 
                          onClick={() => handleApprove(ans.id, false)}
                          disabled={approving}
                          className={`flex-1 py-3 text-white font-bold rounded-button shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 ${
                            ans?.is_correct === false ? 'bg-danger ring-4 ring-danger/30 ring-offset-1' : 'bg-danger/80 hover:bg-danger'
                          }`}
                        >
                          <XCircle size={18} />
                          Incorrect
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
