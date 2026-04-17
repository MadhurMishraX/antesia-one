import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, ChevronRight, ClipboardList, Trash2, X, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

import { getSubjectStyle } from '../../lib/constants';

export default function Auditor() {
  const { profile } = useAuth();
  const [modules, setModules] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchModules();
  }, [profile]);

  async function fetchModules() {
    if (!profile) return;

    const { data } = await supabase
      .from('modules')
      .select(`
        *,
        assignment_submissions(count)
      `)
      .eq('created_by', profile.id)
      .order('created_at', { ascending: false });

    setModules(data || []);
    setLoading(false);
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);

    try {
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', deletingId);

      if (error) throw error;
      
      setModules(modules.filter(m => m.id !== deletingId));
      setDeletingId(null);
    } catch (error) {
      console.error('Error deleting module:', error);
      alert('Failed to delete module. Please check your network or permissions.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredModules = modules.filter(m => 
    m.module_name.toLowerCase().includes(search.toLowerCase()) ||
    m.subject.toLowerCase().includes(search.toLowerCase())
  );

  const priorityColors: any = {
    Crucial: 'bg-danger text-white',
    Vital: 'bg-warning text-white',
    Foundational: 'bg-primary text-white',
    Supporting: 'bg-gray-400 text-white',
  };

  return (
    <div className="p-6 space-y-8 transition-colors duration-300">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Auditor</h1>
          <p className="text-xs font-bold text-text-muted uppercase tracking-widest mt-1">Manage Modules</p>
        </div>
        <Link to="/teacher/auditor/new">
          <button className="w-12 h-12 bg-primary text-white rounded-[18px] flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-all">
            <Plus size={24} />
          </button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
          <Search size={20} />
        </div>
        <input 
          type="text"
          placeholder="Search modules or subjects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-surface border border-surface/10 rounded-[20px] shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all text-sm font-medium text-text-primary"
        />
      </div>

      {/* Module List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredModules.length > 0 ? (
          filteredModules.map((module) => {
            const subjectStyle = getSubjectStyle(module.subject);
            const Icon = subjectStyle.icon;
            
            return (
              <Link key={module.id} to={`/teacher/auditor/${module.id}`} className="block group">
                <div className="bg-surface p-5 rounded-[24px] shadow-sm border border-surface/10 flex items-center gap-4 hover:border-primary/30 transition-all active:scale-[0.98]">
                  <div className={`w-12 h-12 rounded-[16px] ${subjectStyle.lightColor} flex items-center justify-center ${subjectStyle.textColor} group-hover:bg-primary group-hover:text-white transition-colors`}>
                    <Icon size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm truncate group-hover:text-primary transition-colors text-text-primary">{module.module_name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold ${subjectStyle.textColor} uppercase tracking-widest`}>{module.subject}</span>
                      <span className="w-1 h-1 rounded-full bg-surface/20" />
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Due {new Date(module.due_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded-pill uppercase ${priorityColors[module.priority]}`}>
                      {module.priority}
                    </span>
                    <p className="text-[10px] font-bold text-primary">
                      {module.assignment_submissions?.[0]?.count || 0} Submissions
                    </p>
                    <button
                      onClick={(e) => handleDelete(e, module.id)}
                      className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/5 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto text-text-muted">
              <ClipboardList size={32} />
            </div>
            <div>
              <p className="text-text-primary font-bold">No modules found</p>
              <p className="text-text-muted text-xs mt-1">Try a different search term or create one.</p>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-surface w-full max-w-sm rounded-[32px] p-8 shadow-2xl space-y-6 border border-surface/10"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center text-danger">
                  <AlertTriangle size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text-primary">Delete Module?</h3>
                  <p className="text-sm text-text-muted mt-2">
                    This action is <span className="text-danger font-bold">irreversible</span>. It will permanently remove all questions, student scores, and records associated with this module.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmDelete}
                  disabled={deleteLoading}
                  className="w-full py-4 bg-danger text-white font-bold rounded-2xl shadow-lg shadow-danger/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {deleteLoading ? 'Deleting...' : 'Yes, Delete Completely'}
                </button>
                <button
                  onClick={() => setDeletingId(null)}
                  disabled={deleteLoading}
                  className="w-full py-4 bg-surface border border-surface/10 text-text-primary font-bold rounded-2xl hover:bg-background transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
