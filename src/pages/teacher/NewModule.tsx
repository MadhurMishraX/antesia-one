import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, HelpCircle, Trash2, Plus, Save, Info, Copy, Check, Zap, ChevronDown } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';
import { transpile, ParsedQuestion } from '../../lib/mmarkupTranspiler';
import { SUBJECTS, getSubjectStyle } from '../../lib/constants';

function renderMixed(text: string) {
  if (!text) return null;
  const dollarCount = (text.match(/\$/g) || []).length;
  if (dollarCount < 2) return null;
  const parts = text.split(/(\$[^$]+\$)/g);
  return (
    <div className="px-4 py-3 bg-background rounded-[16px] text-sm font-medium leading-relaxed text-text-primary border border-surface/10">
      {parts.map((part, i) =>
        part.startsWith('$') && part.endsWith('$')
          ? <InlineMath key={i} math={part.slice(1, -1)} />
          : <span key={i}>{part}</span>
      )}
    </div>
  );
}

export default function NewModule() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<'forms' | 'markup'>('forms');
  const [showInfo, setShowInfo] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Step 1 State
  const [metadata, setMetadata] = useState({
    name: '',
    priority: 'Foundational',
    xp: 50,
    dueDate: '',
    subject: profile?.subject || ''
  });

  // Step 2 State
  const [questions, setQuestions] = useState<any[]>([
    { id: crypto.randomUUID(), type: 'MCQ', text: '', options: [{ id: crypto.randomUUID(), text: '', isCorrect: true }, { id: crypto.randomUUID(), text: '', isCorrect: false }], explanation: '' }
  ]);
  const [markup, setMarkup] = useState('');

  const handlePriorityChange = (p: string) => {
    const xpMap: any = { Crucial: 100, Vital: 75, Foundational: 50, Supporting: 25 };
    setMetadata({ ...metadata, priority: p, xp: xpMap[p] });
  };

  const handleParseMarkup = () => {
    const result = transpile(markup);
    
    if (result.questions.length > 0) {
      const mappedQuestions = result.questions.map((q: ParsedQuestion) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        options: q.options ?? [],
        correctAnswer: q.correctAnswer ?? '',
        explanation: q.explanation ?? '',
      }));
      
      setQuestions(mappedQuestions);
      setMode('forms');
    } else if (result.errors.length > 0) {
      alert(`Parse Error: ${result.errors[0].message}`);
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, { 
      id: crypto.randomUUID(), 
      type: 'MCQ', 
      text: '', 
      options: [{ id: crypto.randomUUID(), text: '', isCorrect: true }, { id: crypto.randomUUID(), text: '', isCorrect: false }], 
      explanation: '' 
    }]);
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestion = (id: string, updates: any) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const handleSave = async () => {
    if (!profile) return;

    const { data: module, error: modError } = await supabase.from('modules').insert({
      created_by: profile.id,
      module_name: metadata.name,
      subject: metadata.subject,
      priority: metadata.priority,
      xp_reward: metadata.xp,
      due_date: metadata.dueDate,
      total_questions: questions.length
    }).select().single();

    if (modError) {
      console.error(modError);
      return;
    }

    const questionsToInsert = questions.map((q, i) => ({
      module_id: module.id,
      question_number: i + 1,
      question_type: q.type === 'MCQ' ? 'MCQ' : 'text_answer',
      question_text: q.text,
      options: q.type === 'MCQ' ? q.options.map((o: any) => ({ option_id: o.id, option_text: o.text, is_correct: o.isCorrect })) : null,
      correct_answer_text: q.type === 'text_answer' ? q.correctAnswer : null,
      explanation: q.explanation
    }));

    const { error: qsError } = await supabase.from('questions').insert(questionsToInsert);

    if (qsError) {
      console.error(qsError);
      return;
    }

    // 3. Create notifications for all students
    const { data: students } = await supabase.from('profiles').select('id').eq('role', 'student');
    if (students && students.length > 0) {
      const notifications = students.map(s => ({
        recipient_id: s.id,
        type: 'due_date_reminder',
        title: 'New Assignment Out! 📚',
        body: `A new ${metadata.priority} assignment "${metadata.name}" is out by ${profile.full_name}. Awarding ${metadata.xp} XP!`,
        deep_link_target: 'study_vault',
        reference_id: module.id
      }));
      await supabase.from('notifications').insert(notifications);
    }

    navigate('/teacher/auditor');
  };

  const copyPrompt = () => {
    const prompt = `Generate an ANTESIA M-Markup block for a quiz. 
Format:
TYPE: MCQ
Q: Question text
A) Option 1
*B) Correct Option
C) Option 3
D) Option 4
EXP: Explanation text`;
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyAIPrompt = () => {
    const prompt = `Convert the questions above into M-Markup format using these rules:

Each question starts with ?N.type where type is:
.m  = single correct MCQ:   ?1.m{Question}[Option|*Correct|Option]
.tf = true/false:           ?2.tf{Question}[*True|False]
.n  = numeric answer:       ?3.n{Question}[42]

Rules:
- Mark correct answers with * before the option
- Separate options with |
- Add explanation with >>{explanation text}
- Use $...$ for math/LaTeX
- Output ONLY the M-Markup, nothing else

Start with this header:
!!{ v: "1.0", title: "Assignment", subject: "General", marks: 4, neg: -1 }`;
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24 transition-colors duration-300">
      {/* Top Bar */}
      <div className="p-6 flex items-center justify-between bg-surface/80 backdrop-blur-xl border-b border-surface/10 sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button onClick={() => step === 1 ? navigate(-1) : setStep(1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-background transition-colors">
            <ArrowLeft size={24} className="text-text-primary" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-text-primary">New Module</h2>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Step {step} of 2</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {[1, 2].map(s => (
            <div key={s} className={`w-2 h-2 rounded-full transition-all ${step === s ? 'bg-primary w-4' : 'bg-surface/20'}`} />
          ))}
        </div>
      </div>

      <div className="p-6 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-surface rounded-[32px] shadow-sm border border-surface/10 p-8 space-y-8"
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Module Name</label>
                  <input 
                    type="text"
                    placeholder="e.g. Introduction to Calculus"
                    value={metadata.name}
                    onChange={(e) => setMetadata({ ...metadata, name: e.target.value })}
                    className="w-full p-4 bg-background border border-transparent rounded-[20px] focus:bg-surface focus:border-primary/20 focus:outline-none transition-all font-medium text-text-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Priority</label>
                    <div className="relative">
                      <select 
                        value={metadata.priority}
                        onChange={(e) => handlePriorityChange(e.target.value)}
                        className="w-full p-4 bg-background border border-transparent rounded-[20px] focus:bg-surface focus:border-primary/20 focus:outline-none transition-all font-bold text-sm appearance-none pr-10 text-text-primary"
                      >
                        <option>Crucial</option>
                        <option>Vital</option>
                        <option>Foundational</option>
                        <option>Supporting</option>
                      </select>
                      <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">XP Reward</label>
                    <input 
                      type="number"
                      value={metadata.xp}
                      onChange={(e) => setMetadata({ ...metadata, xp: parseInt(e.target.value) })}
                      className="w-full p-4 bg-background border border-transparent rounded-[20px] focus:bg-surface focus:border-primary/20 focus:outline-none transition-all font-bold text-sm text-text-primary"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Due Date</label>
                  <input 
                    type="datetime-local"
                    value={metadata.dueDate}
                    onChange={(e) => setMetadata({ ...metadata, dueDate: e.target.value })}
                    className="w-full p-4 bg-background border border-transparent rounded-[20px] focus:bg-surface focus:border-primary/20 focus:outline-none transition-all font-medium text-text-primary"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Subject</label>
                  <div className="grid grid-cols-2 gap-3">
                    {SUBJECTS.map((s) => {
                      const Icon = s.icon;
                      const isSelected = metadata.subject === s.name;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setMetadata({ ...metadata, subject: s.name })}
                          className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left ${
                            isSelected 
                              ? `${s.lightColor} ${s.textColor} border-primary shadow-sm` 
                              : 'bg-background border-transparent hover:border-surface/20 text-text-muted'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSelected ? 'bg-white shadow-sm' : 'bg-surface/50'}`}>
                            <Icon size={16} />
                          </div>
                          <span className="text-xs font-bold truncate">{s.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setStep(2)}
                disabled={!metadata.name || !metadata.dueDate || !metadata.subject}
                className="w-full py-5 bg-primary text-white font-bold rounded-[24px] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                Next: Add Questions →
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between px-2">
                <h3 className="font-bold text-sm text-text-muted uppercase tracking-widest">Questions</h3>
                <button 
                  onClick={() => setMode(mode === 'forms' ? 'markup' : 'forms')}
                  className="bg-primary/5 text-primary px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-primary/10 transition-colors"
                >
                  {mode === 'forms' ? 'Switch to M-Markup' : 'Switch to Forms'}
                </button>
              </div>

              {mode === 'forms' ? (
                <div className="space-y-6">
                  {questions.map((q, i) => (
                    <div key={q.id} className="bg-surface rounded-[32px] shadow-sm border border-surface/10 p-8 space-y-6 relative group">
                      <button 
                        onClick={() => deleteQuestion(q.id)}
                        className="absolute top-6 right-6 text-danger hover:bg-danger/5 p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={20} />
                      </button>

                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-[12px] bg-primary/5 flex items-center justify-center font-bold text-primary">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <select 
                            value={q.type}
                            onChange={(e) => updateQuestion(q.id, { type: e.target.value })}
                            className="bg-transparent font-bold text-xs uppercase tracking-widest text-text-muted focus:outline-none"
                          >
                            <option value="MCQ">Multiple Choice</option>
                            <option value="text_answer">Text Answer</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Question Text</label>
                          <textarea 
                            placeholder="Type question here (LaTeX supported with $...$)"
                            value={q.text}
                            onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                            className="w-full h-32 p-4 bg-background border border-transparent rounded-[20px] focus:bg-surface focus:border-primary/20 focus:outline-none transition-all text-sm font-medium resize-none text-text-primary"
                          />
                          {renderMixed(q.text)}
                        </div>

                      {q.type === 'MCQ' ? (
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Options</label>
                          {q.options.map((opt: any, optIdx: number) => (
                            <div key={opt.id} className="space-y-2 group/opt">
                              <div className="flex items-center gap-3">
                                <button 
                                  onClick={() => {
                                    const newOpts = q.options.map((o: any, idx: number) => 
                                      ({ ...o, isCorrect: idx === optIdx }));
                                    updateQuestion(q.id, { options: newOpts });
                                  }}
                                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                    opt.isCorrect ? 'bg-success border-success text-white' : 'border-surface/20 hover:border-primary'
                                  }`}
                                >
                                  {opt.isCorrect && <Check size={14} />}
                                </button>
                                <input 
                                  type="text"
                                  placeholder={`Option ${optIdx + 1}`}
                                  value={opt.text}
                                  onChange={(e) => {
                                    const newOpts = q.options.map((o: any, idx: number) => idx === optIdx ? { ...o, text: e.target.value } : o);
                                    updateQuestion(q.id, { options: newOpts });
                                  }}
                                  className="flex-1 p-3 bg-background border border-transparent rounded-[16px] text-sm font-medium focus:bg-surface focus:border-primary/20 focus:outline-none transition-all text-text-primary"
                                />
                                <button 
                                  onClick={() => {
                                    const newOpts = q.options.filter((o: any, idx: number) => idx !== optIdx);
                                    updateQuestion(q.id, { options: newOpts });
                                  }}
                                  className="text-text-muted hover:text-danger opacity-0 group-hover/opt:opacity-100 transition-opacity"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                              {renderMixed(opt.text)}
                            </div>
                          ))}
                          <button 
                            onClick={() => {
                              const newOpts = [...q.options, { id: Date.now().toString(), text: '', isCorrect: false }];
                              updateQuestion(q.id, { options: newOpts });
                            }}
                            className="text-primary text-[10px] font-bold uppercase tracking-widest mt-2 ml-9 hover:underline"
                          >
                            + Add Option
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Correct Answer</label>
                          <input 
                            type="text"
                            placeholder="Type correct answer"
                            value={q.correctAnswer}
                            onChange={(e) => updateQuestion(q.id, { correctAnswer: e.target.value })}
                            className="w-full p-4 bg-background border border-transparent rounded-[20px] focus:bg-surface focus:border-primary/20 focus:outline-none transition-all font-bold text-sm text-text-primary"
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Explanation</label>
                        <textarea 
                          placeholder="Why is this answer correct?"
                          value={q.explanation}
                          onChange={(e) => updateQuestion(q.id, { explanation: e.target.value })}
                          className="w-full h-20 p-4 bg-background border border-transparent rounded-[20px] focus:bg-surface focus:border-primary/20 focus:outline-none transition-all text-xs font-medium resize-none text-text-primary"
                        />
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={addQuestion}
                    className="w-full py-6 border-2 border-dashed border-primary/20 text-primary font-bold rounded-[32px] hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={20} />
                    Add Another Question
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-slate-900 rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[12px] bg-primary/20 flex items-center justify-center text-primary">
                          <Zap size={20} />
                        </div>
                        <h4 className="text-white font-bold">M-Markup Engine</h4>
                      </div>
                      <button onClick={() => setShowInfo(true)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-white/60 hover:text-white transition-colors">
                        <HelpCircle size={20} />
                      </button>
                    </div>
                    <textarea 
                      placeholder="Paste your M-Markup code here..."
                      value={markup}
                      onChange={(e) => setMarkup(e.target.value)}
                      className="w-full h-96 bg-transparent text-slate-300 font-mono text-sm focus:outline-none resize-none placeholder:text-slate-700"
                    />
                    <div className="absolute bottom-4 right-4">
                      <button 
                        onClick={handleParseMarkup}
                        className="bg-primary text-white px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                      >
                        Parse Code
                      </button>
                    </div>
                  </div>
                  <div className="bg-primary/5 p-6 rounded-[24px] border border-primary/10 flex items-center gap-4">
                    <Info size={24} className="text-primary shrink-0" />
                    <p className="text-xs font-medium text-primary/80 leading-relaxed">
                      M-Markup is a high-speed format for creating modules. Use AI to generate the code and paste it here.
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-8">
                <button 
                  onClick={handleSave}
                  className="w-full py-5 bg-primary text-white font-bold rounded-[24px] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  <Save size={20} />
                  Deploy Module
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info Overlay */}
      <AnimatePresence>
        {showInfo && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
              onClick={() => setShowInfo(false)}
            />
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="fixed bottom-0 left-0 right-0 bg-surface rounded-t-[40px] p-10 z-[70] shadow-2xl max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-text-primary">WHAT IS M-MARKUP?</h3>
                  <p className="text-xs font-bold text-text-muted uppercase tracking-widest mt-1">M-Markup (or Madhur's Markup)</p>
                </div>
                <button onClick={() => setShowInfo(false)} className="w-12 h-12 flex items-center justify-center rounded-full bg-background text-text-muted">
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-8">
                <p className="text-sm text-text-muted leading-relaxed">
                  M-Markup is a high-speed shorthand used to create educational modules in seconds. It allows you to turn raw text into structured questions without manual data entry.
                </p>

                <div className="space-y-4">
                  <h4 className="font-bold text-sm uppercase tracking-widest">Key Rules:</h4>
                  <ul className="space-y-3">
                    {[
                      'Use * to mark the correct option in MCQs.',
                      'Use $...$ for LaTeX math formulas.',
                      'Separate question blocks with a blank line.',
                      'EXP: is optional but recommended for student feedback.'
                    ].map((rule, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-text-muted">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <h4 className="font-bold text-sm uppercase tracking-widest">How to use</h4>
                    <ol className="space-y-3">
                      {[
                        'Copy your raw questions (from a PDF, book, or notes).',
                        'Paste them into any AI along with the prompt below.',
                        'Copy the code the AI gives you and paste it into the M-Markup Engine.'
                      ].map((step, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-text-muted">
                          <span className="font-bold text-primary">{i + 1}.</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="bg-slate-900 p-6 rounded-[20px] font-mono text-xs text-slate-300 relative group">
                    <pre className="whitespace-pre-wrap">{`Return the entire response wrapped in a single code block.
Convert the questions above into M-Markup format using these rules:

Each question starts with ?N.type where type is:
.m  = single correct MCQ:   ?1.m{Question}[Option|*Correct|Option]
.tf = true/false:           ?2.tf{Question}[*True|False]
.n  = numeric answer:       ?3.n{Question}[42]

Rules:
- Mark correct answers with * before the option
- Separate options with |
- Add explanation with >>{explanation text}
- Use $...$ for math/LaTeX
- Output ONLY the M-Markup, nothing else

Start with this header:
!!{ v: "1.0", title: "Assignment", subject: "General", marks: 4, neg: -1 }`}</pre>
                    <button 
                      onClick={copyAIPrompt}
                      className="absolute top-4 right-4 p-2 bg-white/5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    >
                      {copiedPrompt ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <button 
                  onClick={() => setShowInfo(false)}
                  className="w-full py-4 bg-primary text-white font-bold rounded-[20px] shadow-lg shadow-primary/20"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function X({ size, className }: { size: number, className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
