import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Edit2, Calendar, Flag, Zap, HelpCircle, ChevronDown, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';

import { getSubjectStyle } from '../../lib/constants';

export default function ModuleDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [module, setModule] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchModule() {
      const { data: mod } = await supabase
        .from('modules')
        .select(`
          *,
          assignment_submissions(count)
        `)
        .eq('id', id)
        .single();
      
      if (!mod) {
        navigate('/teacher/auditor');
        return;
      }
      setModule(mod);

      const { data: qs } = await supabase
        .from('questions')
        .select('*')
        .eq('module_id', id)
        .order('question_number', { ascending: true });
      
      setQuestions(qs || []);
      setLoading(false);
    }

    fetchModule();
  }, [id, navigate]);

  if (loading) return null;

  const priorityColors: any = {
    Crucial: 'bg-danger text-white',
    Vital: 'bg-warning text-white',
    Foundational: 'bg-primary text-white',
    Supporting: 'bg-gray-400 text-white',
  };

  const subjectStyle = getSubjectStyle(module.subject);
  const SubjectIcon = subjectStyle.icon;

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
    <div className="min-h-screen bg-background pb-24">
      {/* Top Bar */}
      <div className="p-6 flex items-center justify-between bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${subjectStyle.lightColor} flex items-center justify-center ${subjectStyle.textColor}`}>
              <SubjectIcon size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold truncate max-w-[200px]">{module.module_name}</h2>
              <p className={`text-[10px] font-bold ${subjectStyle.textColor} uppercase tracking-widest`}>{module.subject}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Info Block */}
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-8 space-y-8">
          <div className="grid grid-cols-2 gap-8">
            <InfoItem icon={<Calendar size={20} className="text-primary" />} label="Due Date" value={new Date(module.due_date).toLocaleDateString()} />
            <InfoItem 
              icon={<Flag size={20} className="text-primary" />} 
              label="Priority" 
              value={<span className={`text-[8px] font-bold px-2 py-0.5 rounded-pill uppercase ${priorityColors[module.priority]}`}>{module.priority}</span>} 
            />
            <InfoItem icon={<Zap size={20} className="text-warning" />} label="XP Reward" value={`${module.xp_reward} XP`} />
            <InfoItem icon={<HelpCircle size={20} className="text-primary" />} label="Questions" value={module.total_questions} />
          </div>
          <div 
            onClick={() => navigate(`/teacher/auditor/${id}/submissions`)}
            className="pt-6 border-t border-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors rounded-b-[32px] -mx-8 px-8"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-success" />
              <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Submissions</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-primary">{module.assignment_submissions?.[0]?.count || 0} Students</p>
              <ChevronRight size={16} className="text-text-muted" />
            </div>
          </div>
        </div>

        {/* Question List */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-text-muted uppercase tracking-widest px-2">Question List</h3>
          <div className="space-y-4">
            {questions.map((q, i) => (
              <motion.div 
                key={q.id}
                layout
                className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden group"
              >
                <div 
                  onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                  className="p-5 flex items-center gap-4 cursor-pointer active:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-[12px] bg-gray-50 flex items-center justify-center font-bold text-sm text-text-muted group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                    Q{i + 1}
                  </div>
                  <p className="flex-1 text-sm font-medium truncate">
                    {q.question_text}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-[8px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-pill uppercase">
                      {q.question_type === 'MCQ' ? 'MCQ' : 'Text'}
                    </span>
                    <ChevronDown size={18} className={`text-text-muted transition-transform duration-300 ${expandedId === q.id ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                <AnimatePresence>
                  {expandedId === q.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-50 p-6 space-y-6"
                    >
                      <div className="text-sm leading-relaxed font-medium text-text-primary">
                        {renderTextWithMath(q.question_text)}
                      </div>

                      {q.question_type === 'MCQ' ? (
                        <div className="space-y-2">
                          {q.options?.map((opt: any) => (
                            <div key={opt.option_id} className={`p-4 rounded-[16px] border-2 text-sm font-bold flex items-center justify-between transition-all ${
                              opt.is_correct ? 'bg-success/5 border-success text-success' : 'bg-gray-50 border-transparent text-text-primary'
                            }`}>
                              {opt.option_text}
                              {opt.is_correct && <CheckCircle2 size={18} />}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Correct Answer</p>
                          <div className="p-4 rounded-[16px] bg-success/5 border-2 border-success text-success text-sm font-bold">
                            {q.correct_answer_text}
                          </div>
                        </div>
                      )}

                      <div className="bg-gray-50 p-5 rounded-[20px] border border-gray-100">
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Explanation</p>
                        <p className="text-xs italic leading-relaxed text-text-muted">
                          {q.explanation || 'No explanation provided.'}
                        </p>
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

function InfoItem({ icon, label, value }: any) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-text-muted">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-sm font-bold pl-6">{value}</div>
    </div>
  );
}
