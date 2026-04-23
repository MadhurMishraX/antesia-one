import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Home, BookOpen, Trophy, User, Zap, ClipboardList, BarChart3, MessageSquare, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function StudentLayout() {
  const { isDarkMode } = useAuth();
  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-background text-text-primary pb-24 transition-colors duration-300">
        <Outlet />
      
      <nav className="bottom-nav-glass">
        <NavLink to="/" className={({ isActive }) => `nav-tab ${isActive ? 'nav-tab-active' : 'nav-tab-inactive'}`}>
          {({ isActive }) => (
            <>
              <Home size={24} fill={isActive ? 'currentColor' : 'none'} />
              <span className="text-[10px] font-medium">Home</span>
            </>
          )}
        </NavLink>
        <NavLink to="/learn" className={({ isActive }) => `nav-tab ${isActive ? 'nav-tab-active' : 'nav-tab-inactive'}`}>
          {({ isActive }) => (
            <>
              <BookOpen size={24} fill={isActive ? 'currentColor' : 'none'} />
              <span className="text-[10px] font-medium">Learn</span>
            </>
          )}
        </NavLink>
        <NavLink to="/ranks" className={({ isActive }) => `nav-tab ${isActive ? 'nav-tab-active' : 'nav-tab-inactive'}`}>
          {({ isActive }) => (
            <>
              <Trophy size={24} fill={isActive ? 'currentColor' : 'none'} />
              <span className="text-[10px] font-medium">Ranks</span>
            </>
          )}
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `nav-tab ${isActive ? 'nav-tab-active' : 'nav-tab-inactive'}`}>
          {({ isActive }) => (
            <>
              <User size={24} fill={isActive ? 'currentColor' : 'none'} />
              <span className="text-[10px] font-medium">Profile</span>
            </>
          )}
        </NavLink>
      </nav>
      </div>
    </div>
  );
}

export function TeacherLayout() {
  const { isDarkMode } = useAuth();
  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-background text-text-primary pb-24 transition-colors duration-300">
        <Outlet />
        
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50">
          <nav className="bg-surface/80 backdrop-blur-xl border border-surface/20 shadow-2xl rounded-full p-2 flex items-center justify-between">
            <NavLink to="/teacher" end className={({ isActive }) => `flex-1 flex flex-col items-center gap-1 py-2 rounded-full transition-all ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted hover:bg-surface/50'}`}>
            <Zap size={20} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Command</span>
          </NavLink>
          <NavLink to="/teacher/auditor" className={({ isActive }) => `flex-1 flex flex-col items-center gap-1 py-2 rounded-full transition-all ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted hover:bg-gray-50'}`}>
            <ClipboardList size={20} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Auditor</span>
          </NavLink>
          <NavLink to="/teacher/class" className={({ isActive }) => `flex-1 flex flex-col items-center gap-1 py-2 rounded-full transition-all ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted hover:bg-gray-50'}`}>
            <Users size={20} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Class</span>
          </NavLink>
          <NavLink to="/teacher/analytics" className={({ isActive }) => `flex-1 flex flex-col items-center gap-1 py-2 rounded-full transition-all ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted hover:bg-gray-50'}`}>
            <BarChart3 size={20} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Analytics</span>
          </NavLink>
          <NavLink to="/teacher/doubts" className={({ isActive }) => `flex-1 flex flex-col items-center gap-1 py-2 rounded-full transition-all ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted hover:bg-gray-50'}`}>
            <MessageSquare size={20} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Doubts</span>
          </NavLink>
        </nav>
      </div>
      </div>
    </div>
  );
}
