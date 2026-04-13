/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import { StudentLayout, TeacherLayout } from './components/Layout';
import { LogOut, Eye, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Student Pages
import Dashboard from './pages/student/Dashboard';
import StudyVault from './pages/student/StudyVault';
import Leaderboard from './pages/student/Leaderboard';
import Profile from './pages/student/Profile';
import AssignmentDetailPreview from './pages/student/AssignmentDetailPreview';
import AssignmentInterface from './pages/student/AssignmentInterface';
import Celebration from './pages/student/Celebration';
import Results from './pages/student/Results';
import DoubtPost from './pages/student/DoubtPost';
import DoubtSection from './pages/student/DoubtSection';
import BroadcastHistory from './pages/student/BroadcastHistory';
import Notifications from './pages/student/Notifications';

// Teacher Pages
import TeacherCommand from './pages/teacher/Command';
import TeacherAuditor from './pages/teacher/Auditor';
import TeacherAnalytics from './pages/teacher/Analytics';
import TeacherClass from './pages/teacher/Class';
import TeacherDoubts from './pages/teacher/Doubts';
import NewModule from './pages/teacher/NewModule';
import ModuleDetailView from './pages/teacher/ModuleDetailView';
import ModuleSubmissions from './pages/teacher/ModuleSubmissions';
import AdminPanel from './pages/AdminPanel';
import AdminLogin from './pages/AdminLogin';
import { ErrorBoundary } from './components/ErrorBoundary';

function AppRoutes() {
  const { user, profile, adminProfile, loading, isImpersonating, activeProfile, stopImpersonation } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Public Routes
  if (!user) {
    return (
      <Routes>
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  // Admin Access (Real session, not impersonating)
  if (adminProfile?.role === 'admin' && !isImpersonating) {
    const isVerified = sessionStorage.getItem('admin_verified') === 'true';
    const isAtAdminLogin = location.pathname === '/admin-login';
    
    // If not verified, they MUST go to /admin-login
    if (!isVerified && !isAtAdminLogin) {
      return <Navigate to="/admin-login" replace />;
    }

    return (
      <>
        <Routes>
          <Route path="/admin" element={isVerified ? <AdminPanel /> : <Navigate to="/admin-login" replace />} />
          <Route path="/admin-login" element={isVerified ? <Navigate to="/admin" replace /> : <AdminLogin />} />
          <Route path="*" element={<Navigate to={isVerified ? "/admin" : "/admin-login"} replace />} />
        </Routes>
      </>
    );
  }

  // If a non-admin tries to access /admin or /admin-login, redirect them appropriately
  if (location.pathname.startsWith('/admin') && !isImpersonating) {
    return <Navigate to="/" replace />;
  }

  const renderRoutes = () => {
    if (activeProfile?.role === 'teacher') {
      return (
        <Routes>
          <Route element={<TeacherLayout />}>
            <Route path="/teacher" element={<TeacherCommand />} />
            <Route path="/teacher/auditor" element={<TeacherAuditor />} />
            <Route path="/teacher/class" element={<TeacherClass />} />
            <Route path="/teacher/analytics" element={<TeacherAnalytics />} />
            <Route path="/teacher/doubts" element={<TeacherDoubts />} />
            <Route path="/teacher/broadcast-history" element={<BroadcastHistory />} />
            <Route path="/teacher/notifications" element={<Notifications />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="/teacher/auditor/new" element={<NewModule />} />
          <Route path="/teacher/auditor/:id" element={<ModuleDetailView />} />
          <Route path="/teacher/auditor/:id/submissions" element={<ModuleSubmissions />} />
          <Route path="*" element={<Navigate to="/teacher" replace />} />
        </Routes>
      );
    }

    // Default to Student Routes
    return (
      <Routes>
        <Route element={<StudentLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/learn" element={<StudyVault />} />
          <Route path="/ranks" element={<Leaderboard />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route path="/assignment/:id" element={<AssignmentDetailPreview />} />
        <Route path="/assignment/:id/interface" element={<AssignmentInterface />} />
        <Route path="/celebration/:id" element={<Celebration />} />
        <Route path="/results/:id" element={<Results />} />
        <Route path="/doubt/post" element={<DoubtPost />} />
        <Route path="/doubts" element={<DoubtSection />} />
        <Route path="/broadcast-history" element={<BroadcastHistory />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  };

  return (
    <>
      <AnimatePresence>
        {isImpersonating && (
          <motion.div 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="fixed top-0 left-0 right-0 z-[9999] bg-slate-900 text-white px-6 py-3 flex items-center justify-between shadow-2xl border-b border-white/10"
          >
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <Eye size={18} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Impersonating User</p>
                <p className="text-sm font-bold">{activeProfile?.full_name} <span className="text-primary ml-2">({activeProfile?.role})</span></p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-warning/10 text-warning rounded-full text-[10px] font-bold uppercase tracking-widest border border-warning/20">
                <ShieldAlert size={12} /> Read-Only Mode Recommended
              </div>
              <button 
                onClick={stopImpersonation}
                className="flex items-center gap-2 px-4 py-2 bg-danger text-white rounded-xl text-xs font-bold hover:bg-danger/80 transition-all active:scale-95 shadow-lg shadow-danger/20"
              >
                <LogOut size={14} />
                Exit Session
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className={isImpersonating ? 'pt-16' : ''}>
        {renderRoutes()}
      </div>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
