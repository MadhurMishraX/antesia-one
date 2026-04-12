import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { motion } from 'motion/react';
import { Search, Plus, ChevronRight, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';

import { getSubjectStyle } from '../../lib/constants';

export default function Auditor() {
  const { profile } = useAuth();
  const [modules, setModules] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    fetchModules();
  }, [profile]);

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
    <div className="p-6 space-y-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Auditor</h1>
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
          className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-[20px] shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all text-sm font-medium"
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
                <div className="bg-white p-5 rounded-[24px] shadow-sm border border-gray-100 flex items-center gap-4 hover:border-primary/30 transition-all active:scale-[0.98]">
                  <div className={`w-12 h-12 rounded-[16px] ${subjectStyle.lightColor} flex items-center justify-center ${subjectStyle.textColor} group-hover:bg-primary group-hover:text-white transition-colors`}>
                    <Icon size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{module.module_name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold ${subjectStyle.textColor} uppercase tracking-widest`}>{module.subject}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
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
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-text-muted">
              <ClipboardList size={32} />
            </div>
            <div>
              <p className="text-text-primary font-bold">No modules found</p>
              <p className="text-text-muted text-xs mt-1">Try a different search term or create one.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
