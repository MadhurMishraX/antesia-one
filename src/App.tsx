/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import { StudentLayout, TeacherLayout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';

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

// 🌌 Antesia - Developed by Madhur Mishra (github: MadhurMishraX)

function AppRoutes() {
  const { user, profile, loading, isDarkMode, updateActivity } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      // Map path to friendly names
      const pathMap: Record<string, string> = {
        '/': 'Dashboard',
        '/learn': 'Study Vault',
        '/ranks': 'Leaderboard',
        '/profile': 'Profile Settings',
        '/doubts': 'Doubt Section',
        '/teacher': 'Command Center',
        '/teacher/auditor': 'Auditor',
        '/teacher/class': 'Class Management',
        '/teacher/analytics': 'Analytics',
        '/teacher/doubts': 'Teacher Doubts',
        '/admin': 'Admin Control Panel'
      };

      const locationName = Object.keys(pathMap).find(path => location.pathname === path) 
        ? pathMap[location.pathname] 
        : location.pathname.split('/')[1] || 'Dashboard';

      updateActivity(locationName);

      // Add a periodic heartbeat every 2 minutes for those staying on one page
      const interval = setInterval(() => {
        updateActivity(locationName);
      }, 120000); // 2 minutes

      return () => clearInterval(interval);
    }
  }, [location.pathname, user, updateActivity]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

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

  // Admin Access
  if (profile?.role === 'admin') {
    const isVerified = sessionStorage.getItem('admin_verified') === 'true';
    const isAtAdminLogin = location.pathname === '/admin-login';
    
    // If not verified, they MUST go to /admin-login
    if (!isVerified && !isAtAdminLogin) {
      return <Navigate to="/admin-login" replace />;
    }

    return (
      <Routes>
        <Route path="/admin" element={isVerified ? <AdminPanel /> : <Navigate to="/admin-login" replace />} />
        <Route path="/admin-login" element={isVerified ? <Navigate to="/admin" replace /> : <AdminLogin />} />
        <Route path="*" element={<Navigate to={isVerified ? "/admin" : "/admin-login"} replace />} />
      </Routes>
    );
  }

  // If a non-admin tries to access /admin or /admin-login, redirect them appropriately
  if (location.pathname.startsWith('/admin')) {
    return <Navigate to="/" replace />;
  }

  const renderRoutes = () => {
    if (profile?.role === 'teacher') {
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

  return renderRoutes();
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
