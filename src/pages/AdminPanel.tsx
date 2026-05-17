import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CONFIG } from '../config';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  CheckSquare, 
  MessageSquare, 
  Megaphone, 
  Bell, 
  Trash2, 
  Database, 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Filter, 
  AlertTriangle, 
  HardDrive,
  RefreshCw,
  X,
  CheckCircle2,
  Key,
  ShieldCheck
} from 'lucide-react';

// --- Types ---
type AdminSection = 'overview' | 'users' | 'activity' | 'modules' | 'submissions' | 'doubts' | 'broadcasts' | 'notifications' | 'storage' | 'security';

interface Stats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalModules: number;
  totalSubmissions: number;
  totalAnswers: number;
  totalDoubts: number;
  totalBroadcasts: number;
  totalNotifications: number;
  unreadNotifications: number;
}

// --- Hardcoded Row Size Estimates (in bytes) ---
const ROW_SIZES = {
  profiles: 500,
  modules: 800,
  questions: 1200,
  assignment_submissions: 400,
  submission_answers: 300,
  student_stats: 300,
  broadcasts: 600,
  doubts: 1000,
  doubt_replies: 800,
  notifications: 400
};

// --- Components ---

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => (
  <motion.div 
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 50 }}
    className={`fixed bottom-6 right-6 px-6 py-3 rounded-xl shadow-2xl z-[100] flex items-center gap-3 ${
      type === 'success' ? 'bg-success text-white' : 'bg-danger text-white'
    }`}
  >
    {type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
    <span className="font-bold text-sm">{message}</span>
    <button onClick={onClose} className="ml-2 hover:opacity-70 transition-opacity">
      <X size={18} />
    </button>
  </motion.div>
);

const Modal = ({ show, onClose, title, description, onConfirm, confirmText, confirmColor = 'bg-danger', loading, requireConfirmText, children }: any) => {
  const [confirmInput, setConfirmInput] = useState('');
  
  if (!show) return null;

  const isConfirmDisabled = requireConfirmText && confirmInput !== requireConfirmText;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl space-y-6"
        >
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-900">{title}</h3>
            <div className="text-slate-500 text-sm leading-relaxed">
              {description}
            </div>
          </div>

          {children}

          {requireConfirmText && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Type "{requireConfirmText}" to confirm</p>
              <input 
                type="text" 
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={requireConfirmText}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-primary transition-all font-mono text-sm"
              />
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              disabled={loading || isConfirmDisabled}
              onClick={onConfirm}
              className={`w-full py-4 ${confirmColor} text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50`}
            >
              {loading ? 'Processing...' : confirmText}
            </button>
            <button
              disabled={loading}
              onClick={onClose}
              className="w-full py-4 bg-gray-100 text-slate-600 font-bold rounded-xl hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const SectionHeader = ({ title, count }: { title: string, count?: number }) => (
  <div className="flex items-center justify-between mb-8">
    <div className="space-y-1">
      <h2 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h2>
      {count !== undefined && (
        <p className="text-xs font-bold text-primary uppercase tracking-widest">{count} Total Records</p>
      )}
    </div>
  </div>
);

const Pagination = ({ page, totalPages, onPageChange }: { page: number, totalPages: number, onPageChange: (p: number) => void }) => (
  <div className="flex items-center justify-center gap-4 mt-8">
    <button 
      disabled={page === 1}
      onClick={() => onPageChange(page - 1)}
      className="p-2 rounded-lg border border-gray-100 disabled:opacity-30 hover:bg-gray-50 transition-colors"
    >
      <ChevronLeft size={20} />
    </button>
    <span className="text-sm font-bold text-slate-600">Page {page} of {totalPages || 1}</span>
    <button 
      disabled={page === totalPages || totalPages === 0}
      onClick={() => onPageChange(page + 1)}
      className="p-2 rounded-lg border border-gray-100 disabled:opacity-30 hover:bg-gray-50 transition-colors"
    >
      <ChevronRight size={20} />
    </button>
  </div>
);

// --- Main Component ---

export default function AdminPanel() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [loading, setLoading] = useState(true);
  const [secretCount, setSecretCount] = useState(0);
  const [secretUnlocked, setSecretUnlocked] = useState(false);
  const [trustedDevices, setTrustedDevices] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  
  // Data States
  const [stats, setStats] = useState<Stats | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<any>({});
  const [search, setSearch] = useState('');
  
  // Modal States
  const [modal, setModal] = useState<any>({ show: false });

  const pageSize = 25;

  // --- Auth Check ---
  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      navigate('/', { replace: true });
    }
  }, [profile, navigate]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpdatePassword = async (userId: string, newPassword: string, serviceKey: string) => {
    if (!newPassword || !serviceKey) {
      showToast('Password and Service Key are required', 'error');
      return;
    }

    setLoading(true);
    try {
      if (!CONFIG.supabase.url) {
        throw new Error('Supabase URL is missing in configuration');
      }
      // Initialize a temporary admin client
      const { createClient } = await import('@supabase/supabase-js');
      const adminClient = createClient(CONFIG.supabase.url, serviceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
        password: newPassword
      });

      if (updateError) throw updateError;

      showToast('Password updated successfully', 'success');
      setModal({ show: false });
    } catch (err: any) {
      console.error('Password update error:', err);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const PasswordUpdateModal = ({ user, onClose }: { user: any, onClose: () => void }) => {
    const [newPass, setNewPass] = useState('');
    const [sKey, setSKey] = useState(sessionStorage.getItem('temp_service_key') || '');

    const handleConfirm = () => {
      sessionStorage.setItem('temp_service_key', sKey);
      handleUpdatePassword(user.id, newPass, sKey);
    };

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">New Password</label>
          <input 
            type="text" 
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            placeholder="Enter new password"
            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-primary transition-all text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Supabase Service Role Key</label>
          <input 
            type="password" 
            value={sKey}
            onChange={(e) => setSKey(e.target.value)}
            placeholder="Paste your service_role key"
            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-primary transition-all text-sm font-mono"
          />
          <p className="text-[10px] text-slate-400 leading-tight">
            Find this in Supabase Dashboard → Settings → API → service_role key. 
            <br/><strong>Warning:</strong> This key bypasses all security. Use with caution.
          </p>
        </div>
        <button
          disabled={loading || !newPass || !sKey}
          onClick={handleConfirm}
          className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </div>
    );
  };

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData([]);
    
    try {
      if (activeSection === 'overview') {
        const [
          { count: u }, { count: s }, { count: t }, { count: m }, 
          { count: sub }, { count: ans }, { count: d }, { count: b }, 
          { count: n }, { count: un }
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
          supabase.from('modules').select('*', { count: 'exact', head: true }),
          supabase.from('assignment_submissions').select('*', { count: 'exact', head: true }),
          supabase.from('submission_answers').select('*', { count: 'exact', head: true }),
          supabase.from('doubts').select('*', { count: 'exact', head: true }),
          supabase.from('broadcasts').select('*', { count: 'exact', head: true }),
          supabase.from('notifications').select('*', { count: 'exact', head: true }),
          supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('is_read', false),
        ]);

        setStats({
          totalUsers: u || 0,
          totalStudents: s || 0,
          totalTeachers: t || 0,
          totalModules: m || 0,
          totalSubmissions: sub || 0,
          totalAnswers: ans || 0,
          totalDoubts: d || 0,
          totalBroadcasts: b || 0,
          totalNotifications: n || 0,
          unreadNotifications: un || 0
        });
      } else {
        let query: any;
        let countQuery: any;

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let orderField = 'created_at';
        switch (activeSection) {
          case 'users':
            query = supabase.from('profiles').select('*', { count: 'exact' });
            if (filters.role) query = query.eq('role', filters.role);
            if (search) query = query.or(`full_name.ilike.%${search}%,login_id.ilike.%${search}%`);
            break;
          case 'activity':
            query = supabase.from('profiles').select('id, full_name, role, last_seen_at, last_location', { count: 'exact' });
            if (filters.role) query = query.eq('role', filters.role);
            if (search) query = query.or(`full_name.ilike.%${search}%`);
            orderField = 'last_seen_at';
            break;
          case 'modules':
            query = supabase.from('modules').select('*, profiles(full_name)', { count: 'exact' });
            if (filters.subject) query = query.eq('subject', filters.subject);
            if (filters.published !== undefined) query = query.eq('is_published', filters.published);
            if (search) query = query.ilike('module_name', `%${search}%`);
            break;
          case 'submissions':
            query = supabase.from('assignment_submissions').select('*, profiles(full_name), modules(module_name)', { count: 'exact' });
            if (filters.status) query = query.eq('status', filters.status);
            if (search) query = query.or(`profiles.full_name.ilike.%${search}%,modules.module_name.ilike.%${search}%`);
            orderField = 'submitted_at';
            break;
          case 'doubts':
            query = supabase.from('doubts').select('*, profiles(full_name)', { count: 'exact' });
            if (filters.status) query = query.eq('status', filters.status);
            if (search) query = query.ilike('doubt_text', `%${search}%`);
            break;
          case 'broadcasts':
            query = supabase.from('broadcasts').select('*, profiles(full_name)', { count: 'exact' });
            if (search) query = query.ilike('message_text', `%${search}%`);
            break;
          case 'notifications':
            query = supabase.from('notifications').select('*', { count: 'exact' });
            if (filters.is_read !== undefined) query = query.eq('is_read', filters.is_read);
            break;
          case 'storage':
            // Storage is handled differently
            const [pFiles, dFiles] = await Promise.all([
              supabase.storage.from('profile-photos').list(),
              supabase.storage.from('doubt-attachments').list()
            ]);
            setData([{ bucket: 'profile-photos', files: pFiles.data || [] }, { bucket: 'doubt-attachments', files: dFiles.data || [] }]);
            setTotalCount(0);
            setLoading(false);
            return;
          case 'security':
            const { data: logs, count: logCount } = await supabase
              .from('admin_security_logs')
              .select('*', { count: 'exact' })
              .order('created_at', { ascending: false })
              .range(from, to);
            
            const { data: trusted } = await supabase
              .from('admin_trusted_devices')
              .select('fingerprint');
            
            setTrustedDevices(trusted?.map(t => t.fingerprint) || []);
            setData(logs || []);
            setTotalCount(logCount || 0);
            setLoading(false);
            return;
        }

        const { data: result, count, error: fetchError } = await query
          .order(orderField, { ascending: false })
          .range(from, to);

        if (fetchError) throw fetchError;
        setData(result || []);
        setTotalCount(count || 0);
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeSection, page, filters, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Actions ---

  const handleDelete = async (table: string, id: string) => {
    try {
      const { error: delError } = await supabase.from(table).delete().eq('id', id);
      if (delError) throw delError;
      showToast('Record deleted successfully', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setModal({ show: false });
    }
  };

  const handleBulkDelete = async (table: string, days: number, field = 'created_at') => {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString();

      // Handle dependencies for submissions
      if (table === 'assignment_submissions') {
        const { data: subs } = await supabase.from('assignment_submissions').select('id').lt(field, cutoffStr);
        if (subs && subs.length > 0) {
          const ids = subs.map(s => s.id);
          await supabase.from('submission_answers').delete().in('submission_id', ids);
        }
      }

      const { error: delError } = await supabase.from(table).delete().lt(field, cutoffStr);
      if (delError) throw delError;
      showToast('Bulk cleanup completed', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setModal({ show: false });
    }
  };

  const handleClearTable = async (table: string) => {
    try {
      const { error: delError } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all hack
      if (delError) throw delError;
      showToast(`Table ${table} cleared`, 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setModal({ show: false });
    }
  };

  const handleDeleteFile = async (bucket: string, fileName: string) => {
    try {
      const { error: delError } = await supabase.storage.from(bucket).remove([fileName]);
      if (delError) throw delError;
      showToast('File deleted successfully', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // --- Render Helpers ---

  const handleTrustDevice = async (fingerprint: string) => {
    try {
      const { error } = await supabase
        .from('admin_trusted_devices')
        .insert({ fingerprint, label: 'Admin Device' });
      
      if (error) throw error;
      showToast('Device marked as TRUSTED', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const renderSecurityAudit = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Device / Time</th>
                <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Browser Info</th>
                <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((log) => {
                const isTrusted = trustedDevices.includes(log.fingerprint);
                const isCurrent = log.fingerprint === localStorage.getItem('ants_dev_sig');
                
                return (
                  <tr key={log.id} className={`${isTrusted ? 'bg-success/5' : 'bg-white'} hover:bg-gray-50/80 transition-colors`}>
                    <td className="p-6">
                      <div className="flex flex-col">
                        <span className={`text-[10px] font-mono leading-none mb-1 ${isTrusted ? 'text-success' : 'text-slate-400'}`}>
                          ID: {(log.fingerprint || 'unknown').slice(0, 12)}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                        {isCurrent && <span className="text-[8px] font-black text-primary uppercase mt-1">This Browser</span>}
                      </div>
                    </td>
                    <td className="p-6">
                      <p className="text-[10px] text-slate-500 line-clamp-1 max-w-[200px]" title={log.user_agent}>
                        {log.user_agent}
                      </p>
                    </td>
                    <td className="p-6">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-pill uppercase ${
                        log.status === 'success' ? 'bg-success text-white' : 'bg-danger text-white'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      {isTrusted ? (
                        <div className="flex items-center justify-end gap-2 text-success">
                          <ShieldCheck size={16} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Trusted</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleTrustDevice(log.fingerprint)}
                          className="px-4 py-2 bg-slate-900 text-white text-[10px] font-bold rounded-lg hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/20"
                        >
                          Trust Device
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={Math.ceil(totalCount / pageSize)} onPageChange={setPage} />
      </div>
    );
  };

  const renderOverview = () => {
    if (!stats) return null;
    
    const metrics = [
      { label: 'Total Users', value: stats.totalUsers, icon: <Users /> },
      { label: 'Students', value: stats.totalStudents, icon: <Users className="text-primary" /> },
      { label: 'Teachers', value: stats.totalTeachers, icon: <Users className="text-secondary" /> },
      { label: 'Modules', value: stats.totalModules, icon: <ClipboardList /> },
      { label: 'Submissions', value: stats.totalSubmissions, icon: <CheckSquare /> },
      { label: 'Answers Logged', value: stats.totalAnswers, icon: <RefreshCw /> },
      { label: 'Doubts', value: stats.totalDoubts, icon: <MessageSquare /> },
      { label: 'Broadcasts', value: stats.totalBroadcasts, icon: <Megaphone /> },
      { label: 'Notifications', value: stats.totalNotifications, icon: <Bell /> },
      { label: 'Unread Alerts', value: stats.unreadNotifications, icon: <AlertTriangle className="text-warning" /> },
    ];

    const tableEstimates = [
      { name: 'submission_answers', count: stats.totalAnswers, risk: 'Critical', size: stats.totalAnswers * ROW_SIZES.submission_answers },
      { name: 'notifications', count: stats.totalNotifications, risk: 'High', size: stats.totalNotifications * ROW_SIZES.notifications },
      { name: 'assignment_submissions', count: stats.totalSubmissions, risk: 'Medium', size: stats.totalSubmissions * ROW_SIZES.assignment_submissions },
      { name: 'doubts', count: stats.totalDoubts, risk: 'Medium', size: stats.totalDoubts * ROW_SIZES.doubts },
      { name: 'profiles', count: stats.totalUsers, risk: 'Low', size: stats.totalUsers * ROW_SIZES.profiles },
      { name: 'modules', count: stats.totalModules, risk: 'Low', size: stats.totalModules * ROW_SIZES.modules },
    ];

    const totalEstimatedSize = tableEstimates.reduce((acc, curr) => acc + curr.size, 0);

    return (
      <div className="space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {metrics.map((m, i) => (
            <div key={i} className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-slate-400">
                {m.icon}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.label}</p>
                <p className="text-2xl font-bold text-slate-900">{m.value.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-8 space-y-6">
          <div className="flex items-center gap-3">
            <Database className="text-primary" />
            <h3 className="text-xl font-bold">Data Size Estimator</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Table Name</th>
                  <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Row Count</th>
                  <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Est. Size</th>
                  <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Growth Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tableEstimates.map((t, i) => (
                  <tr key={i}>
                    <td className="py-4 font-mono text-xs font-bold text-slate-600">{t.name}</td>
                    <td className="py-4 text-sm font-medium">{t.count.toLocaleString()}</td>
                    <td className="py-4 text-sm font-medium">{(t.size / 1024).toFixed(1)} KB</td>
                    <td className="py-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-pill ${
                        t.risk === 'Critical' ? 'bg-danger text-white' :
                        t.risk === 'High' ? 'bg-warning text-white' :
                        t.risk === 'Medium' ? 'bg-primary text-white' : 'bg-success text-white'
                      }`}>
                        {t.risk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pt-6 border-t border-gray-50 flex justify-between items-center">
            <p className="text-sm font-bold text-slate-400">Total Estimated DB Size</p>
            <p className="text-xl font-bold text-primary">{(totalEstimatedSize / 1024).toFixed(1)} KB</p>
          </div>
        </div>
      </div>
    );
  };

  const renderUsers = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name or login ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:border-primary transition-all shadow-sm"
          />
        </div>
        <select 
          value={filters.role || ''}
          onChange={(e) => setFilters({ ...filters, role: e.target.value || undefined })}
          className="px-4 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:border-primary transition-all shadow-sm font-bold text-sm"
        >
          <option value="">All Roles</option>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name</th>
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Login ID</th>
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role</th>
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Created At</th>
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-6 font-bold text-sm text-slate-900">{u.full_name}</td>
                <td className="p-6 font-mono text-xs text-slate-500">{u.login_id}</td>
                <td className="p-6">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-pill ${
                    u.role === 'admin' ? 'bg-violet-500 text-white' :
                    u.role === 'teacher' ? 'bg-primary text-white' : 'bg-gray-400 text-white'
                  }`}>
                    {u.role?.toUpperCase() || 'USER'}
                  </span>
                </td>
                <td className="p-6 text-xs text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="p-6 text-right flex items-center justify-end gap-2">
                  <button 
                    onClick={() => setModal({
                      show: true,
                      title: 'Change Password',
                      description: `Set a new password for ${u.full_name}.`,
                      confirmText: 'Update',
                      confirmColor: 'hidden', // Hide default button
                      children: <PasswordUpdateModal user={u} onClose={() => setModal({ show: false })} />
                    })}
                    className="p-2 text-primary hover:bg-primary/5 rounded-lg transition-colors"
                    title="Change Password"
                  >
                    <Key size={18} />
                  </button>
                  <button 
                    onClick={() => setModal({
                      show: true,
                      title: 'Delete User?',
                      description: `Are you sure you want to delete ${u.full_name}? This action is irreversible and will delete all associated data.`,
                      confirmText: 'Delete User',
                      onConfirm: () => handleDelete('profiles', u.id)
                    })}
                    className="p-2 text-danger hover:bg-danger/5 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={Math.ceil(totalCount / pageSize)} onPageChange={setPage} />
    </div>
  );

  const renderActivity = () => {
    const getStatusInfo = (lastSeen: string | null) => {
      if (!lastSeen) return { label: 'Offline', color: 'bg-slate-400', pulse: false };
      const diff = Date.now() - new Date(lastSeen).getTime();
      const mins = diff / 1000 / 60;

      if (mins < 5) return { label: 'Online', color: 'bg-success', pulse: true };
      if (mins < 15) return { label: 'Idle', color: 'bg-warning', pulse: false };
      return { label: 'Offline', color: 'bg-slate-400', pulse: false };
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search active users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:border-primary transition-all shadow-sm"
            />
          </div>
          <select 
            value={filters.role || ''}
            onChange={(e) => setFilters({ ...filters, role: e.target.value || undefined })}
            className="px-4 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:border-primary transition-all shadow-sm font-bold text-sm"
          >
            <option value="">All Roles</option>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">User</th>
                <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Page</th>
                <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((u) => {
                const status = getStatusInfo(u.last_seen_at);
                return (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-slate-900">{u.full_name}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{u.role}</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                        <div className="relative flex items-center justify-center">
                          {status.pulse && (
                            <span className={`absolute inline-flex h-3 w-3 rounded-full ${status.color} opacity-75 animate-ping`} />
                          )}
                          <div className={`h-2.5 w-2.5 rounded-full ${status.color} relative z-10`} />
                        </div>
                        <span className="text-sm font-bold text-slate-700">{status.label}</span>
                      </div>
                    </td>
                    <td className="p-6">
                      {status.label === 'Offline' ? (
                        <span className="text-xs text-slate-400 italic">Inactive</span>
                      ) : (
                        <span className="text-sm font-medium text-primary bg-primary/5 px-3 py-1 rounded-lg">
                          {u.last_location || 'Dashboard'}
                        </span>
                      )}
                    </td>
                    <td className="p-6 text-xs text-slate-500">
                      {u.last_seen_at ? new Date(u.last_seen_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                      <div className="text-[9px] font-medium text-slate-400 mt-1">
                        {u.last_seen_at && new Date(u.last_seen_at).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={Math.ceil(totalCount / pageSize)} onPageChange={setPage} />
      </div>
    );
  };

  const renderModules = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search modules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:border-primary transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Module Name</th>
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Creator</th>
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subject</th>
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">XP</th>
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Due Date</th>
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-6 font-bold text-sm text-slate-900">{m.module_name}</td>
                <td className="p-6 text-sm text-slate-600">{m.profiles?.full_name || 'System'}</td>
                <td className="p-6 text-xs font-bold text-primary">{m.subject}</td>
                <td className="p-6 text-sm font-bold text-warning">{m.xp_reward}</td>
                <td className="p-6 text-xs text-slate-500">{new Date(m.due_date).toLocaleDateString()}</td>
                <td className="p-6 text-right">
                  <button 
                    onClick={() => setModal({
                      show: true,
                      title: 'Delete Module?',
                      description: `Are you sure you want to delete "${m.module_name}"? This will delete all questions and student submissions for this module.`,
                      confirmText: 'Delete Module',
                      onConfirm: () => handleDelete('modules', m.id)
                    })}
                    className="p-2 text-danger hover:bg-danger/5 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={Math.ceil(totalCount / pageSize)} onPageChange={setPage} />
    </div>
  );

  const renderSubmissions = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-danger/5 flex items-center justify-center text-danger">
            <Trash2 size={20} />
          </div>
          <div>
            <h4 className="font-bold text-sm">Bulk Cleanup</h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Remove old records</p>
          </div>
        </div>
        <div className="flex gap-2">
          {[30, 60, 90].map(days => (
            <button 
              key={days}
              onClick={() => setModal({
                show: true,
                title: 'Cleanup Old Submissions',
                description: `Delete all submissions older than ${days} days?`,
                confirmText: `Delete > ${days} Days`,
                onConfirm: () => handleBulkDelete('assignment_submissions', days, 'submitted_at')
              })}
              className="px-3 py-1.5 bg-gray-50 text-slate-600 font-bold rounded-lg text-[10px] hover:bg-gray-100 transition-all border border-gray-100"
            >
              &gt; {days} Days
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by student or module..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:border-primary transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student</th>
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Module</th>
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Score</th>
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time</th>
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-6 font-bold text-sm text-slate-900">{s.profiles?.full_name || 'Unknown Student'}</td>
                <td className="p-6 text-sm text-slate-600">{s.modules?.module_name || 'Unknown Module'}</td>
                <td className="p-6">
                  <span className="font-bold text-sm">{s.score}</span>
                  <span className="text-xs text-slate-400"> / {s.total_questions}</span>
                </td>
                <td className="p-6 text-sm text-slate-500">{Math.floor(s.time_taken_seconds / 60)}m {s.time_taken_seconds % 60}s</td>
                <td className="p-6 text-xs text-slate-500">{s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : 'N/A'}</td>
                <td className="p-6 text-right">
                  <button 
                    onClick={() => setModal({
                      show: true,
                      title: 'Delete Submission?',
                      description: 'Are you sure you want to delete this student submission?',
                      confirmText: 'Delete Submission',
                      onConfirm: () => handleDelete('assignment_submissions', s.id)
                    })}
                    className="p-2 text-danger hover:bg-danger/5 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={Math.ceil(totalCount / pageSize)} onPageChange={setPage} />
    </div>
  );

  const renderDoubts = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student</th>
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subject</th>
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Message</th>
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-6 font-bold text-sm text-slate-900">{d.profiles?.full_name}</td>
                <td className="p-6 text-xs font-bold text-primary">{d.subject}</td>
                <td className="p-6 text-sm text-slate-600 max-w-xs truncate">{d.doubt_text}</td>
                <td className="p-6">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-pill ${
                    d.status === 'resolved' ? 'bg-success text-white' : 'bg-warning text-white'
                  }`}>
                    {d.status?.toUpperCase() || 'PENDING'}
                  </span>
                </td>
                <td className="p-6 text-right">
                  <button 
                    onClick={() => setModal({
                      show: true,
                      title: 'Delete Doubt?',
                      description: 'Are you sure you want to delete this doubt?',
                      confirmText: 'Delete Doubt',
                      onConfirm: () => handleDelete('doubts', d.id)
                    })}
                    className="p-2 text-danger hover:bg-danger/5 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={Math.ceil(totalCount / pageSize)} onPageChange={setPage} />
    </div>
  );

  const renderBroadcasts = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Teacher</th>
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Message</th>
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Urgent</th>
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-6 font-bold text-sm text-slate-900">{b.profiles?.full_name}</td>
                <td className="p-6 text-sm text-slate-600 max-w-md truncate">{b.message_text}</td>
                <td className="p-6">
                  {b.is_urgent && <span className="bg-danger text-white text-[8px] font-bold px-2 py-0.5 rounded-pill">URGENT</span>}
                </td>
                <td className="p-6 text-xs text-slate-500">{new Date(b.created_at).toLocaleDateString()}</td>
                <td className="p-6 text-right">
                  <button 
                    onClick={() => setModal({
                      show: true,
                      title: 'Delete Broadcast?',
                      description: 'Are you sure you want to delete this broadcast?',
                      confirmText: 'Delete Broadcast',
                      onConfirm: () => handleDelete('broadcasts', b.id)
                    })}
                    className="p-2 text-danger hover:bg-danger/5 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={Math.ceil(totalCount / pageSize)} onPageChange={setPage} />
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-danger/5 flex items-center justify-center text-danger">
            <Bell size={20} />
          </div>
          <div>
            <h4 className="font-bold text-sm">Notification Cleanup</h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Manage system alerts</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setModal({
              show: true,
              title: 'Delete All Notifications?',
              description: 'This will permanently delete ALL notifications for ALL users. This action is extremely dangerous.',
              confirmText: 'Wipe Notifications',
              requireConfirmText: 'DELETE',
              onConfirm: () => handleClearTable('notifications')
            })}
            className="px-4 py-2 bg-danger text-white font-bold rounded-lg text-xs shadow-lg shadow-danger/20 active:scale-95 transition-all"
          >
            Wipe All
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recipient ID</th>
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Title</th>
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Read</th>
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
              <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((n) => (
              <tr key={n.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-6 font-mono text-[10px] text-slate-400">{n.recipient_id}</td>
                <td className="p-6 font-bold text-sm text-slate-900">{n.title}</td>
                <td className="p-6">
                  {n.is_read ? <span className="text-success text-[10px] font-bold">YES</span> : <span className="text-warning text-[10px] font-bold">NO</span>}
                </td>
                <td className="p-6 text-xs text-slate-500">{new Date(n.created_at).toLocaleDateString()}</td>
                <td className="p-6 text-right">
                  <button 
                    onClick={() => setModal({
                      show: true,
                      title: 'Delete Notification?',
                      description: 'Are you sure you want to delete this notification?',
                      confirmText: 'Delete Notification',
                      onConfirm: () => handleDelete('notifications', n.id)
                    })}
                    className="p-2 text-danger hover:bg-danger/5 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={Math.ceil(totalCount / pageSize)} onPageChange={setPage} />
    </div>
  );

   const renderStorage = () => (
    <div className="space-y-12">
      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-8 space-y-8">
        <div className="flex items-center gap-3">
          <Database className="text-primary" />
          <h3 className="text-xl font-bold">Database Maintenance</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.keys(ROW_SIZES).map((table) => (
            <div key={table} className="p-6 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-4">
              <p className="font-mono text-xs font-bold text-slate-600">{table}</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setModal({
                    show: true,
                    title: `Cleanup ${table}?`,
                    description: `Delete records from ${table} older than 90 days?`,
                    confirmText: 'Cleanup',
                    onConfirm: () => handleBulkDelete(table, 90)
                  })}
                  className="flex-1 py-2 bg-white border border-gray-200 text-slate-600 font-bold rounded-lg text-[10px] hover:bg-gray-50 transition-all"
                >
                  &gt; 90 Days
                </button>
                <button 
                  onClick={() => setModal({
                    show: true,
                    title: `Clear ${table}?`,
                    description: `Delete ALL rows from ${table}? This is irreversible.`,
                    confirmText: 'Clear All',
                    requireConfirmText: table,
                    onConfirm: () => handleClearTable(table)
                  })}
                  className="px-3 py-2 bg-white border border-danger/20 text-danger font-bold rounded-lg text-[10px] hover:bg-danger/5 transition-all"
                >
                  Clear
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-8 space-y-8">
        <div className="flex items-center gap-3">
          <HardDrive className="text-primary" />
          <h3 className="text-xl font-bold">File Storage</h3>
        </div>

        <div className="space-y-8">
          {data.map((bucketData: any) => (
            <div key={bucketData.bucket} className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm uppercase tracking-widest text-slate-400">{bucketData.bucket}</h4>
                <p className="text-xs font-bold text-slate-400">{(bucketData.files?.length || 0)} Files</p>
              </div>
              <div className="bg-gray-50/50 rounded-2xl border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">File Name</th>
                      <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Size</th>
                      <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(bucketData.files || []).map((f: any) => (
                      <tr key={f.name}>
                        <td className="p-4 text-xs font-medium text-slate-600 truncate max-w-[200px]">{f.name}</td>
                        <td className="p-4 text-xs text-slate-400">{(f.metadata?.size / 1024).toFixed(1)} KB</td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => handleDeleteFile(bucketData.bucket, f.name)}
                            className="p-2 text-danger hover:bg-danger/5 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(bucketData.files?.length || 0) === 0 && (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-xs text-slate-400 font-medium italic">No files in this bucket</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // --- Main Render ---

  return (
    <div className="min-h-screen bg-[#f9f9fb] flex">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-gray-100 flex flex-col sticky top-0 h-screen z-40">
        <div className="p-8">
          <h1 className="text-2xl font-black tracking-tighter text-primary">ANTESIA <span className="text-slate-900">ADMIN</span></h1>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <NavItem active={activeSection === 'overview'} onClick={() => setActiveSection('overview')} icon={<LayoutDashboard size={20} />} label="Overview" />
          <div 
            onClick={() => {
              const newCount = secretCount + 1;
              setSecretCount(newCount);
              if (newCount === 7) {
                setSecretUnlocked(true);
                showToast('🔒 Security Module Unlocked', 'success');
              }
            }}
            className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-default select-none transition-colors hover:text-slate-300"
          >
            Management
          </div>
          <NavItem active={activeSection === 'users'} onClick={() => setActiveSection('users')} icon={<Users size={20} />} label="Users" />
          <NavItem active={activeSection === 'activity'} onClick={() => setActiveSection('activity')} icon={<RefreshCw size={20} />} label="Activity" />
          <NavItem active={activeSection === 'modules'} onClick={() => setActiveSection('modules')} icon={<ClipboardList size={20} />} label="Modules" />
          <NavItem active={activeSection === 'submissions'} onClick={() => setActiveSection('submissions')} icon={<CheckSquare size={20} />} label="Submissions" />
          <NavItem active={activeSection === 'doubts'} onClick={() => setActiveSection('doubts')} icon={<MessageSquare size={20} />} label="Doubts" />
          <NavItem active={activeSection === 'broadcasts'} onClick={() => setActiveSection('broadcasts')} icon={<Megaphone size={20} />} label="Broadcasts" />
          <NavItem active={activeSection === 'notifications'} onClick={() => setActiveSection('notifications')} icon={<Bell size={20} />} label="Notifications" />
          <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">System</div>
          <NavItem active={activeSection === 'storage'} onClick={() => setActiveSection('storage')} icon={<Database size={20} />} label="Storage Cleanup" />
          {secretUnlocked && (
            <NavItem active={activeSection === 'security'} onClick={() => setActiveSection('security')} icon={<ShieldCheck size={20} />} label="Security Audit" />
          )}
        </nav>

        <div className="p-6 border-t border-gray-100">
          <button 
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-danger hover:bg-danger/5 rounded-xl transition-all"
          >
            <LogOut size={20} />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-12 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <LayoutDashboard size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Welcome, {profile?.full_name}</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">System Administrator</p>
              </div>
            </div>
            <button 
              onClick={fetchData}
              className="p-3 bg-white border border-gray-100 rounded-xl text-slate-400 hover:text-primary hover:border-primary/20 transition-all shadow-sm"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Section Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {loading && activeSection !== 'overview' ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Fetching Data...</p>
                </div>
              ) : error ? (
                <div className="py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-danger/5 rounded-full flex items-center justify-center mx-auto text-danger">
                    <AlertTriangle size={32} />
                  </div>
                  <h3 className="text-xl font-bold">Failed to load data</h3>
                  <p className="text-slate-500 max-w-sm mx-auto">{error}</p>
                  <button onClick={fetchData} className="px-8 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all">
                    Retry Fetch
                  </button>
                </div>
              ) : (
                <>
                  <SectionHeader 
                    title={activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} 
                    count={activeSection === 'overview' ? undefined : totalCount} 
                  />
                  {activeSection === 'overview' && renderOverview()}
                  {activeSection === 'users' && renderUsers()}
                  {activeSection === 'activity' && renderActivity()}
                  {activeSection === 'modules' && renderModules()}
                  {activeSection === 'submissions' && renderSubmissions()}
                  {activeSection === 'doubts' && renderDoubts()}
                  {activeSection === 'broadcasts' && renderBroadcasts()}
                  {activeSection === 'notifications' && renderNotifications()}
                  {activeSection === 'storage' && renderStorage()}
                  {activeSection === 'security' && renderSecurityAudit()}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Modals & Toasts */}
      <Modal 
        {...modal} 
        onClose={() => setModal({ show: false })} 
        loading={loading}
      />
      
      <AnimatePresence>
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
        active 
          ? 'bg-primary text-white shadow-lg shadow-primary/20' 
          : 'text-slate-400 hover:bg-gray-50 hover:text-slate-600'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
