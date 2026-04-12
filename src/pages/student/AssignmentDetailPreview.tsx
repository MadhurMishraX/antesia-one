import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar, Flag, Zap, HelpCircle } from 'lucide-react';

export default function AssignmentDetailPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [module, setModule] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchModuleAndSubmission() {
      if (!profile) return;

      const { data: modData, error: modError } = await supabase
        .from('modules')
        .select('*')
        .eq('id', id)
        .single();

      if (modError) {
        navigate('/learn');
        return;
      }

      setModule(modData);

      const { data: subData } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('module_id', id)
        .eq('student_id', profile.id)
        .single();
      
      setSubmission(subData);
      setLoading(false);
    }

    fetchModuleAndSubmission();
  }, [id, navigate, profile]);

  if (loading) return null;

  const priorityColors: any = {
    Crucial: 'bg-danger text-white',
    Vital: 'bg-warning text-white',
    Foundational: 'bg-primary text-white',
    Supporting: 'bg-gray-400 text-white',
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <div className="p-6 flex items-center gap-4 bg-white shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-muted hover:text-primary transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-lg font-bold truncate">{module.module_name}</h2>
      </div>

      <div className="p-6 flex-1">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-card shadow-sm border border-gray-100 p-6 space-y-6"
        >
          <div className="space-y-4">
            <span className={`text-[10px] font-bold px-3 py-1 rounded-pill ${priorityColors[module.priority]}`}>
              {module.subject.toUpperCase()}
            </span>
            <h1 className="text-2xl font-bold leading-tight">{module.module_name}</h1>
          </div>

          <div className="space-y-4">
            <InfoRow icon={<Calendar size={20} className="text-primary" />} label="Due Date" value={new Date(module.due_date).toLocaleDateString()} />
            <InfoRow 
              icon={<Flag size={20} className="text-primary" />} 
              label="Priority" 
              value={
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-pill ${priorityColors[module.priority]}`}>
                  {module.priority}
                </span>
              } 
            />
            <InfoRow icon={<Zap size={20} className="text-warning" />} label="XP Reward" value={`${module.xp_reward} XP on completion`} />
            <InfoRow icon={<HelpCircle size={20} className="text-primary" />} label="Questions" value={`${module.total_questions} Questions`} />
          </div>

          <div className="h-px bg-gray-100 w-full" />

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider">Description</h3>
            <p className="text-sm leading-relaxed text-text-primary">
              {module.description || 'No description provided for this module.'}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Fixed Bottom Button */}
      <div className="p-6 bg-white border-t border-gray-100">
        {submission?.status === 'submitted' ? (
          <Link to={`/results/${submission.id}`}>
            <button className="w-full py-4 bg-primary text-white font-bold rounded-button shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
              Analyse assignment
            </button>
          </Link>
        ) : (
          <Link to={`/assignment/${id}/interface`}>
            <button className="w-full py-4 bg-primary text-white font-bold rounded-button shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
              Start Assignment
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode, label: string, value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">{label}</p>
        <div className="font-bold text-sm mt-0.5">{value}</div>
      </div>
    </div>
  );
}
