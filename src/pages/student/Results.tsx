import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, CheckCircle2, XCircle, MinusCircle, ChevronDown, HelpCircle } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';

export default function Results() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResults() {
      const { data: sub } = await supabase
        .from('assignment_submissions')
        .select('*, modules(*)')
        .eq('id', id)
        .single();
      
      if (!sub) {
        navigate('/learn');
        return;
      }
      setSubmission(sub);

      const { data: qs } = await supabase
        .from('questions')
        .select('*')
        .eq('module_id', sub.module_id)
        .order('question_number', { ascending: true });

      const { data: ans } = await supabase
        .from('submission_answers')
        .select('*')
        .eq('submission_id', id);

      const combined = (qs || []).map(q => {
        const studentAns = ans?.find(a => a.question_id === q.id);
        return { ...q, studentAns };
      });

      setQuestions(combined);
      setLoading(false);
    }

    fetchResults();
  }, [id, navigate]);

  if (loading) return null;

  const correctCount = questions.filter(q => q.studentAns?.is_correct === true).length;
  const wrongCount = questions.filter(q => q.studentAns?.is_correct === false && q.studentAns?.student_answer).length;
  const pendingCount = questions.filter(q => q.studentAns?.is_correct === null && q.studentAns?.student_answer).length;
  const skippedCount = questions.filter(q => !q.studentAns?.student_answer).length;

  // 🌌 Antesia - Developed by Madhur Mishra (github: MadhurMishraX)

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
    <div className="min-h-screen bg-background pb-24 transition-colors duration-300">
      {/* Top Bar */}
      <div className="p-6 flex items-center gap-4 bg-surface shadow-sm sticky top-0 z-30 border-b border-surface/10">
        <button onClick={() => navigate('/learn')} className="p-2 -ml-2 text-text-muted hover:text-primary transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-lg font-bold">Results</h2>
      </div>

      <div className="p-6 space-y-8">
        {/* Score Hero Block */}
        <div className="bg-surface rounded-[32px] p-8 shadow-sm border border-surface/10 text-center space-y-6">
          <div className="space-y-1">
            <h1 className="text-5xl font-bold tracking-tight text-text-primary">
              {submission.score ?? 0} / {submission.total_questions}
            </h1>
            <p className="text-text-muted font-bold uppercase tracking-widest text-[10px]">Total Score</p>
          </div>

          <div className="flex items-center justify-around">
            <StatItem icon={<CheckCircle2 size={18} className="text-success" />} value={correctCount} label="Correct" />
            <StatItem icon={<XCircle size={18} className="text-danger" />} value={wrongCount} label="Wrong" />
            <StatItem icon={<MinusCircle size={18} className="text-text-muted" />} value={skippedCount} label="Skipped" />
            {pendingCount > 0 && (
              <StatItem icon={<HelpCircle size={18} className="text-warning" />} value={pendingCount} label="Review Pool" />
            )}
          </div>

          {/* Semicircle Chart Placeholder */}
            <div className="relative w-48 h-24 mx-auto overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 100 50">
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="currentColor" className="text-surface/20" strokeWidth="10" />
                <path 
                  d="M 10 50 A 40 40 0 0 1 90 50" 
                  fill="none" 
                  stroke="#4F46E5" 
                  strokeWidth="10" 
                  strokeDasharray={`${((submission.score ?? 0) / submission.total_questions) * 125.6}, 125.6`}
                />
              </svg>
              <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
                <span className="text-xl font-bold text-text-primary">{Math.round(((submission.score ?? 0) / submission.total_questions) * 100)}%</span>
              </div>
            </div>

            <div className="inline-block bg-success/10 text-success px-4 py-1.5 rounded-pill font-bold text-sm">
              +{submission.xp_earned ?? 0} XP earned
            </div>
          </div>

        {/* Question Review List */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-text-muted uppercase tracking-widest">Question Review</h3>
          <div className="space-y-3">
            {questions.map((q, i) => (
              <motion.div 
                key={q.id}
                layout
                className="bg-surface rounded-card shadow-sm border border-surface/10 overflow-hidden"
              >
                <div 
                  onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                  className="p-4 flex items-center gap-4 cursor-pointer active:bg-surface/50 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                    q.studentAns?.is_correct === true ? 'bg-success/10 text-success' : 
                    q.studentAns?.is_correct === false ? 'bg-danger/10 text-danger' : 
                    q.studentAns?.student_answer ? 'bg-warning/10 text-warning' : 
                    'bg-background text-text-muted'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-text-primary">
                      {renderTextWithMath(q.question_text)}
                    </p>
                    {q.studentAns?.is_correct === null && q.studentAns?.student_answer && (
                      <p className="text-[9px] font-black text-warning uppercase tracking-widest mt-0.5">
                        (Waiting for teacher review)
                      </p>
                    )}
                  </div>
                  <ChevronDown size={18} className={`text-text-muted transition-transform ${expandedId === q.id ? 'rotate-180' : ''}`} />
                </div>

                <AnimatePresence>
                  {expandedId === q.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-surface/10 p-4 space-y-6"
                    >
                      <div className="text-sm leading-relaxed font-medium text-text-primary">
                        {renderTextWithMath(q.question_text)}
                      </div>

                      {q.question_type === 'MCQ' ? (
                        <div className="space-y-2">
                          {q.options?.map((opt: any) => {
                            const isCorrect = opt.is_correct;
                            const isSelected = q.studentAns?.student_answer === opt.option_id;
                            
                            let bgColor = 'bg-background';
                            let borderColor = 'border-transparent';
                            let textColor = 'text-text-primary';

                            if (isCorrect) {
                              bgColor = 'bg-success/10';
                              borderColor = 'border-success';
                              textColor = 'text-success';
                            } else if (isSelected && !isCorrect) {
                              bgColor = 'bg-danger/10';
                              borderColor = 'border-danger';
                              textColor = 'text-danger';
                            }

                            return (
                              <div key={opt.option_id} className={`p-3 rounded-lg border-2 text-sm font-bold flex items-center justify-between ${bgColor} ${borderColor} ${textColor}`}>
                                {renderTextWithMath(opt.option_text)}
                                {isCorrect && <CheckCircle2 size={16} />}
                                {isSelected && !isCorrect && <XCircle size={16} />}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Your Answer</p>
                            <div className={`p-3 rounded-lg border-2 text-sm font-bold ${
                              q.studentAns?.approval_status === 'approved' ? 'bg-success/10 border-success text-success' : 
                              q.studentAns?.approval_status === 'rejected' ? 'bg-danger/10 border-danger text-danger' : 
                              'bg-warning/10 border-warning text-warning'
                            }`}>
                              {q.studentAns?.student_answer || '(Skipped)'}
                              {!q.studentAns?.approval_status && q.studentAns?.student_answer && (
                                <span className="ml-2 text-[10px] font-bold uppercase tracking-widest">(Waiting for teacher review)</span>
                              )}
                              {q.studentAns?.approval_status === 'approved' && (
                                <span className="ml-2 text-[10px] font-bold uppercase tracking-widest">(Correct)</span>
                              )}
                              {q.studentAns?.approval_status === 'rejected' && (
                                <span className="ml-2 text-[10px] font-bold uppercase tracking-widest">(Incorrect)</span>
                              )}
                            </div>
                          </div>
                          {(q.studentAns?.approval_status || q.studentAns?.is_correct !== null) && (
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Correct Answer</p>
                              <div className="p-3 rounded-lg bg-success/10 border-2 border-success text-success text-sm font-bold">
                                {q.correct_answer_text}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="bg-background p-4 rounded-lg">
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Explanation</p>
                        <p className="text-xs italic leading-relaxed text-text-muted">
                          {q.explanation ? renderTextWithMath(q.explanation) : 'No explanation provided.'}
                        </p>
                      </div>

                      <div className="flex justify-end">
                        <Link to={`/doubt/post?module_id=${submission.module_id}&question_id=${q.id}`} className="flex items-center gap-2 text-primary text-xs font-bold hover:underline">
                          <HelpCircle size={16} />
                          Post a Doubt
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatItem({ icon, value, label }: any) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="font-bold">{value}</span>
      </div>
      <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{label}</span>
    </div>
  );
}
