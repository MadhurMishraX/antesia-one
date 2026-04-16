import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, ArrowLeft, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface Answer {
  status: 'answered' | 'skipped';
  selected_option_id?: string;
  text_answer?: string;
  student_answer?: string;
}

// 🌌 Antesia - Developed by Madhur Mishra (github: MadhurMishraX)

export default function AssignmentInterface() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  
  const [showDrawer, setShowDrawer] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  
  const [timeLeft, setTimeLeft] = useState(1800); // 30 min default
  const timerRef = useRef<any>(null);

  useEffect(() => {
    async function startAssignment() {
      if (!profile || !id) return;

      // 1. Get or create submission
      let { data: sub } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('module_id', id)
        .eq('student_id', profile.id)
        .maybeSingle();

      if (!sub) {
        const { data: moduleData } = await supabase.from('modules').select('total_questions').eq('id', id).single();
        const { data: newSub, error: createError } = await supabase
          .from('assignment_submissions')
          .upsert({
            module_id: id,
            student_id: profile.id,
            status: 'in_progress',
            started_at: new Date().toISOString(),
            total_questions: moduleData?.total_questions || 0
          }, { onConflict: 'student_id,module_id', ignoreDuplicates: true })
          .select()
          .maybeSingle();
        
        if (createError) {
          console.error('Error creating submission:', createError);
          navigate('/learn');
          return;
        }
        
        if (newSub) {
          sub = newSub;
        } else {
          // If upsert ignored duplicate, fetch it
          const { data: refetched } = await supabase
            .from('assignment_submissions')
            .select('*')
            .eq('module_id', id)
            .eq('student_id', profile.id)
            .single();
          sub = refetched;
        }
      }

      if (sub.status === 'submitted') {
        navigate(`/results/${sub.id}`);
        return;
      }

      setSubmissionId(sub.id);

      // 2. Fetch questions
      const { data: qs } = await supabase
        .from('questions')
        .select('id, question_number, question_type, question_text, options')
        .eq('module_id', id)
        .order('question_number', { ascending: true });

      // Strip is_correct from options
      const sanitizedQs = (qs || []).map(q => ({
        ...q,
        options: q.options?.map((o: any) => ({ option_id: o.option_id, option_text: o.option_text }))
      }));

      setQuestions(sanitizedQs);

      // 3. Fetch existing answers if resume
      const { data: existingAns } = await supabase
        .from('submission_answers')
        .select('*')
        .eq('submission_id', sub.id);

      const ansMap: Record<string, any> = {};
      existingAns?.forEach(a => {
        ansMap[a.question_id] = {
          student_answer: a.student_answer || null,
          status: a.answer_status
        };
      });
      setAnswers(ansMap);

      // 4. Fetch module metadata for title
      const { data: mod } = await supabase.from('modules').select('module_name').eq('id', id).single();
      setModule(mod);

      setLoading(false);
    }

    startAssignment();

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [id, profile, navigate]);

  const saveAnswer = async (qId: string, qNum: number, data: any) => {
    if (!submissionId) return;

    // Update local state immediately for UI responsiveness
    setAnswers(prev => ({
      ...prev,
      [qId]: { ...data, status: 'answered' }
    }));

    const { error } = await supabase
      .from('submission_answers')
      .upsert({
        submission_id: submissionId,
        question_id: qId,
        question_number: Number(qNum) || 0, // Explicitly cast and fallback to 0 if null
        student_answer: data.student_answer || null,
        answer_status: 'answered',
        updated_at: new Date().toISOString()
      }, { onConflict: 'submission_id,question_id' });

    if (error) {
      console.error('CRITICAL: Answer failed to save to Supabase:', error);
    }
  };

  // Debounce helper for text answers
  const timeoutRef = useRef<any>(null);
  const handleTextChange = (qId: string, qNum: number, text: string) => {
    setAnswers(prev => ({
      ...prev,
      [qId]: { ...prev[qId], student_answer: text, status: 'answered' }
    }));

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      saveAnswer(qId, qNum, { student_answer: text });
    }, 1000);
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setShowSubmitModal(true);
    }
  };

  const handleSubmit = async () => {
    if (!submissionId || !id || !profile) return;
    setLoading(true);

    try {
      // 1. Fetch correct answers (including the is_correct flag which is hidden from students normally)
      const { data: questionsData } = await supabase
        .from('questions')
        .select('id, question_number, question_type, options, correct_answer_text')
        .eq('module_id', id);

      // Fetch saved answers fresh from DB
      const { data: savedAnswers } = await supabase
        .from('submission_answers')
        .select('question_id, student_answer')
        .eq('submission_id', submissionId);

      const savedAnswerMap: Record<string, string> = {};
      savedAnswers?.forEach(a => {
        savedAnswerMap[a.question_id] = a.student_answer || '';
      });

      let score = 0;
      const totalQuestions = questionsData?.length || 0;
      const answerUpdates: any[] = [];

      questionsData?.forEach((q, index) => {
        const studentAnswerText = savedAnswerMap[q.id] || '';
        let isCorrect: boolean | null = false;
        const type = String(q.question_type).toUpperCase();

        if (type === 'MCQ' || (q.options && q.options.length > 0)) {
          const correctOption = q.options?.find((o: any) => o.is_correct);
          if (studentAnswerText && correctOption?.option_id &&
              String(studentAnswerText) === String(correctOption.option_id)) {
            isCorrect = true;
            score++;
          } else {
            isCorrect = false;
          }
        } else if (type === 'TEXT_ANSWER' || type === 'TEXT') {
          // Text answers are marked as pending (null) if answered, or false if skipped
          isCorrect = studentAnswerText.trim() ? null : false;
        } else {
          // Fallback for unknown types
          isCorrect = false;
        }
        
        const qNumber = Number(q.question_number) || (index + 1);
        answerUpdates.push({
          submission_id: submissionId,
          question_id: q.id,
          question_number: qNumber, // Use casted number or index fallback
          student_answer: studentAnswerText || null,
          answer_status: studentAnswerText.trim() ? 'answered' : 'skipped',
          is_correct: isCorrect,
          updated_at: new Date().toISOString()
        });
      });

      // 3. Update ALL answers in DB (ensures skipped questions are recorded)
      if (answerUpdates.length > 0) {
        const { error: upsertError } = await supabase
          .from('submission_answers')
          .upsert(answerUpdates, { onConflict: 'submission_id,question_id' });
        if (upsertError) console.error('Error updating answer correctness:', upsertError);
      }

      // 5. Calculate XP (Only for MCQs initially)
      const { data: moduleData } = await supabase.from('modules').select('xp_reward').eq('id', id).single();
      const xpEarned = totalQuestions > 0 
        ? Math.round((score / totalQuestions) * (moduleData?.xp_reward || 0))
        : 0;

      // 6. Update submission
      const timeTaken = 1800 - timeLeft;
      
      const { error: subUpdateError } = await supabase
        .from('assignment_submissions')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          score: score,
          xp_earned: xpEarned,
          time_taken_seconds: timeTaken
        })
        .eq('id', submissionId);
      
      if (subUpdateError) console.error('Error updating submission status:', subUpdateError);

      // 7. Update student stats
      const { data: stats } = await supabase
        .from('student_stats')
        .select('*')
        .eq('student_id', profile.id)
        .single();

      if (stats) {
        let newTotalXp = (stats.total_xp || 0) + xpEarned;
        let newXpInLeague = (stats.xp_in_current_league || 0) + xpEarned;
        let newLeague = stats.current_league || 'Bronze';

        // League Transition Logic
        // Bronze -> Silver (500)
        // Silver -> Gold (1000)
        // Gold -> Platinum (2000)
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
        
        // Improved streak logic (Daily streak)
        const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString('en-CA');

        let newStreak = stats.current_streak_days || 0;
        
        if (stats.last_submission_date === yesterdayStr) {
          // Submitted yesterday, increment streak
          newStreak++;
          console.log('STREAK INCREMENTED:', newStreak);
        } else if (stats.last_submission_date === todayStr) {
          // Already submitted today, keep streak same
          console.log('STREAK MAINTAINED (Already submitted today):', newStreak);
        } else {
          // Missed a day or first time, reset to 1
          newStreak = 1;
          console.log('STREAK RESET/INITIALIZED:', newStreak);
        }

        const currentAccuracy = (score / totalQuestions) * 100;
        const statsAccuracy = Number(stats.accuracy_all_time) || 0;
        const newAccuracy = statsAccuracy === 0
          ? currentAccuracy
          : ((statsAccuracy * 0.7) + (currentAccuracy * 0.3));

        const { error: statsUpdateError } = await supabase
          .from('student_stats')
          .update({
            total_xp: newTotalXp,
            xp_in_current_league: newXpInLeague,
            current_league: newLeague,
            current_streak_days: newStreak,
            last_submission_date: todayStr,
            accuracy_all_time: newAccuracy.toFixed(2)
          })
          .eq('student_id', profile.id);

        if (statsUpdateError) console.error('XP/Stats Update Error:', statsUpdateError);
      }

      navigate(`/celebration/${submissionId}`);
    } catch (err) {
      console.error('Submission error:', err);
      setLoading(false);
    }
  };

  if (loading && !questions.length) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const currentQ = questions[currentIdx];
  const currentAns = (answers[currentQ?.id] || {}) as any;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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
        <button onClick={() => setShowDrawer(true)} className="p-2 text-text-muted hover:text-primary transition-colors">
          <Menu size={24} />
        </button>
        <h2 className="text-sm font-bold truncate max-w-[50%]">{module?.module_name}</h2>
        <div className={`font-mono font-bold text-sm ${timeLeft < 300 ? 'text-danger animate-pulse' : 'text-text-primary'}`}>
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {showDrawer && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowDrawer(false)}
            />
            <motion.div 
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-surface z-50 p-6 flex flex-col border-r border-surface/10"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-text-primary">Questions</h3>
                <button onClick={() => setShowDrawer(false)} className="p-2 text-text-muted">
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-3 flex-1 overflow-y-auto content-start">
                {questions.map((q, i) => {
                  const status = answers[q.id]?.status || 'not_visited';
                  const colors: any = {
                    answered: 'bg-success text-white',
                    skipped: 'bg-danger text-white',
                    not_visited: 'bg-background text-text-muted'
                  };
                  return (
                    <button
                      key={q.id}
                      onClick={() => { setCurrentIdx(i); setShowDrawer(false); }}
                      className={`aspect-square rounded-lg flex items-center justify-center font-bold text-sm transition-all ${
                        currentIdx === i ? 'ring-2 ring-primary ring-offset-2' : ''
                      } ${colors[status]}`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>

              <div className="pt-6 border-t border-surface/10 mt-auto">
                <button 
                  onClick={() => setShowExitModal(true)}
                  className="w-full py-3 border-2 border-danger text-danger font-bold rounded-button hover:bg-danger/5 transition-all"
                >
                  Exit to Main Menu
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Question Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="space-y-2">
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest">
              Question {currentIdx + 1} of {questions.length}
            </p>
            <div className="text-lg font-medium leading-relaxed text-text-primary">
              {renderTextWithMath(currentQ?.question_text)}
            </div>
          </div>

          {currentQ?.question_type === 'MCQ' ? (
            <div className="space-y-3">
              {currentQ.options?.map((opt: any) => (
                <button
                  key={opt.option_id}
                  onClick={() => saveAnswer(
                    currentQ.id,
                    currentQ.question_number,
                    { student_answer: opt.option_id }
                  )}
                  className={`w-full p-4 rounded-card border-2 text-left transition-all flex items-center justify-between group ${
                    currentAns.student_answer === opt.option_id 
                      ? 'border-primary bg-primary text-white shadow-md' 
                      : 'border-surface/10 bg-surface hover:border-primary/30'
                  }`}
                >
                  <span className="font-medium">{renderTextWithMath(opt.option_text)}</span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    currentAns.student_answer === opt.option_id 
                      ? 'border-white' 
                      : 'border-surface/20 group-hover:border-primary/30'
                  }`}>
                    {currentAns.student_answer === opt.option_id && (
                      <div className="w-2.5 h-2.5 rounded-full bg-white" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                placeholder="Type your answer..."
                value={currentAns.student_answer || ''}
                onChange={(e) => handleTextChange(currentQ.id, currentQ.question_number, e.target.value)}
                className="w-full h-40 p-4 bg-surface border-2 border-surface/10 rounded-card focus:outline-none focus:border-primary transition-all resize-none font-medium text-text-primary"
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="p-6 bg-surface border-t border-surface/10 flex items-center gap-4">
        <button
          disabled={currentIdx === 0}
          onClick={() => setCurrentIdx(currentIdx - 1)}
          className="flex-1 py-4 border-2 border-surface/10 text-text-muted font-bold rounded-button flex items-center justify-center gap-2 disabled:opacity-30 transition-all"
        >
          <ArrowLeft size={20} />
          Previous
        </button>
        <button
          onClick={handleNext}
          className={`flex-1 py-4 text-white font-bold rounded-button flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] ${
            currentIdx === questions.length - 1 ? 'bg-violet-600 shadow-violet-200' : 'bg-primary shadow-primary/20'
          }`}
        >
          {currentIdx === questions.length - 1 ? 'Submit' : 'Next'}
          <ArrowRight size={20} />
        </button>
      </div>

      {/* Exit Modal */}
      <Modal 
        show={showExitModal} 
        onClose={() => setShowExitModal(false)}
        icon={<AlertTriangle size={32} className="text-danger" />}
        title="Exit Assignment?"
        description="Your recorded answers will be auto-submitted."
        confirmText="Confirm Exit"
        confirmColor="bg-danger"
        onConfirm={() => navigate('/learn')}
      />

      {/* Submit Modal */}
      <Modal 
        show={showSubmitModal} 
        onClose={() => setShowSubmitModal(false)}
        icon={<CheckCircle2 size={32} className="text-success" />}
        title="Submit Assignment?"
        description={
          <div className="space-y-2 mt-4">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-success">
                ✅ {Object.values(answers).filter(a => a.student_answer && a.student_answer.trim() !== '').length} Answered
              </span>
              <span className="text-danger">
                ❌ {questions.length - Object.values(answers).filter(a => a.student_answer && a.student_answer.trim() !== '').length} Skipped
              </span>
            </div>
            <p className="text-xs text-text-muted text-center pt-2 border-t border-surface/10">
              Total time: {formatTime(1800 - timeLeft)}
            </p>
          </div>
        }
        confirmText="Submit"
        confirmColor="bg-primary"
        onConfirm={handleSubmit}
        loading={loading}
      />
    </div>
  );
}

function Modal({ show, onClose, icon, title, description, confirmText, confirmColor, onConfirm, loading }: any) {
  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] max-w-sm bg-surface rounded-[24px] p-8 z-[70] shadow-2xl text-center border border-surface/10"
          >
            <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto mb-4">
              {icon}
            </div>
            <h3 className="text-xl font-bold mb-2 text-text-primary">{title}</h3>
            <div className="text-text-muted text-sm leading-relaxed mb-8">
              {description}
            </div>
            <div className="space-y-3">
              <button
                disabled={loading}
                onClick={onConfirm}
                className={`w-full py-3 ${confirmColor} text-white font-bold rounded-button shadow-lg transition-all active:scale-95 disabled:opacity-50`}
              >
                {loading ? 'Submitting...' : confirmText}
              </button>
              <button
                disabled={loading}
                onClick={onClose}
                className="w-full py-3 border-2 border-surface/10 text-text-muted font-bold rounded-button hover:bg-background transition-all"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
