import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Moon, Bell, Trophy, Key, LogOut, ChevronLeft, Flame, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { profile, signOut, refreshProfile, isDarkMode, toggleDarkMode } = useAuth();
  const navigate = useNavigate();
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(profile?.full_name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [settings, setSettings] = useState({
    darkMode: isDarkMode,
    notifications: profile?.push_notifications_enabled || true,
    showLeaderboard: !profile?.is_anonymous_on_leaderboard,
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const [stats, setStats] = useState<any>(null);

  React.useEffect(() => {
    setSettings(prev => ({ ...prev, darkMode: isDarkMode }));
  }, [isDarkMode]);

  React.useEffect(() => {
    async function fetchStats() {
      if (profile?.id && profile.role === 'student') {
        const { data } = await supabase.from('student_stats').select('*').eq('student_id', profile.id).single();
        setStats(data);
      }
    }
    fetchStats();
  }, [profile]);

  const toggleSetting = async (key: keyof typeof settings) => {
    if (key === 'showLeaderboard') {
      setToastMsg('Coming Soon');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    const newValue = !settings[key];
    setSettings(prev => ({ ...prev, [key]: newValue }));

    if (key === 'darkMode') {
      toggleDarkMode(newValue);
    }

    const updateMap: any = {
      darkMode: { dark_mode_enabled: newValue },
      notifications: { push_notifications_enabled: newValue },
      showLeaderboard: { is_anonymous_on_leaderboard: !newValue },
    };

    const { error } = await supabase
      .from('profiles')
      .update(updateMap[key])
      .eq('id', profile?.id);

    if (error) console.error('Error updating settings:', error);
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) return;
    setIsUpdating(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: newName })
        .eq('id', profile?.id);

      if (!error) {
        await refreshProfile();
        setIsEditingName(false);
        setToastMsg('Name updated successfully!');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } else {
        setToastMsg('Error updating name');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (err) {
      console.error('Update name error:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordClick = () => {
    setToastMsg('Ask your teacher to change your password');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="min-h-screen bg-background pb-32 transition-colors duration-300">
      {/* Top Bar */}
      <header className="w-full sticky top-0 z-40 bg-background/80 backdrop-blur-xl flex items-center justify-between px-6 h-16">
        <button 
          onClick={() => navigate(-1)}
          className="text-text-muted hover:bg-surface/50 transition-colors p-2 rounded-full active:scale-90"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-bold text-lg tracking-tight">Profile</h1>
        <div className="w-10"></div>
      </header>

      <main className="max-w-2xl mx-auto px-6 space-y-12 pt-4">
        {/* Profile Header */}
        <section className="flex flex-col items-center">
          <div className="relative">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-surface shadow-sm bg-surface">
              {profile?.profile_photo_url ? (
                <img 
                  src={profile.profile_photo_url} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-4xl">
                  {profile?.full_name?.[0]}
                </div>
              )}
            </div>
          </div>
          <div className="text-center mt-6 w-full max-w-xs">
            {isEditingName ? (
              <div className="flex flex-col gap-2">
                <input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="text-center text-2xl font-extrabold tracking-tight text-text-primary bg-transparent border-b-2 border-primary focus:outline-none w-full"
                  autoFocus
                />
                <div className="flex justify-center gap-4">
                  <button 
                    disabled={isUpdating}
                    onClick={handleUpdateName} 
                    className="text-primary font-bold text-xs uppercase tracking-widest disabled:opacity-50"
                  >
                    {isUpdating ? 'Saving...' : 'Save'}
                  </button>
                  <button 
                    disabled={isUpdating}
                    onClick={() => setIsEditingName(false)} 
                    className="text-slate-400 font-bold text-xs uppercase tracking-widest disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="group cursor-pointer" onClick={() => setIsEditingName(true)}>
                <h2 className="text-3xl font-extrabold tracking-tight text-text-primary flex items-center justify-center gap-2">
                  {profile?.full_name}
                  <Sparkles size={18} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </h2>
                <p className="text-primary font-bold text-[10px] uppercase tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click to edit name</p>
              </div>
            )}
            <p className="text-text-muted font-medium mt-1 tracking-wide">
              {profile?.role === 'student' ? `Student ID: ${profile?.login_id}` : `Teacher ID: ${profile?.login_id}`}
            </p>
          </div>
        </section>

        {/* Stats Bento */}
        {profile?.role === 'student' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary p-6 rounded-[1.5rem] text-white flex flex-col justify-between aspect-square shadow-lg shadow-primary/30 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <Flame size={32} className="relative z-10" />
              <div className="relative z-10">
                <span className="text-4xl font-extrabold block">{stats?.current_streak_days || 0}</span>
                <span className="text-[10px] uppercase tracking-widest font-bold opacity-90">Day Streak</span>
              </div>
            </div>
            <div className="bg-accent p-6 rounded-[1.5rem] text-white flex flex-col justify-between aspect-square shadow-lg shadow-accent/30 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <Sparkles size={32} className="relative z-10" />
              <div className="relative z-10">
                <span className="text-4xl font-extrabold block">{(stats?.total_xp / 1000).toFixed(1)}k</span>
                <span className="text-[10px] uppercase tracking-widest font-bold opacity-90">Skill Points</span>
              </div>
            </div>
          </div>
        )}

        {/* Settings List */}
        <section className="bg-surface rounded-[2rem] overflow-hidden shadow-sm border border-surface/10">
          <SettingRow 
            icon={<Moon size={22} />} 
            label="Dark Mode" 
            value={settings.darkMode} 
            onToggle={() => toggleSetting('darkMode')} 
          />
          <SettingRow 
            icon={<Bell size={22} />} 
            label="Push Notifications" 
            value={settings.notifications} 
            onToggle={() => toggleSetting('notifications')} 
          />
          {profile?.role === 'student' && (
            <SettingRow 
              icon={<Trophy size={22} />} 
              label="Show on Leaderboard" 
              value={settings.showLeaderboard} 
              onToggle={() => toggleSetting('showLeaderboard')} 
            />
          )}
          <div 
            onClick={handlePasswordClick}
            className="flex items-center justify-between p-6 hover:bg-surface/50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-background flex items-center justify-center text-text-muted group-hover:text-primary transition-colors">
                <Key size={22} />
              </div>
              <div>
                <span className="font-semibold text-[17px] block">Password</span>
                <span className="text-text-muted font-mono tracking-widest text-sm">••••••••</span>
              </div>
            </div>
          </div>
        </section>

        {/* Logout Button */}
        <button 
          onClick={signOut}
          className="w-full py-5 bg-surface border-2 border-danger/10 text-danger font-bold rounded-[2rem] flex items-center justify-center gap-3 hover:bg-danger/5 transition-all active:scale-[0.98] shadow-sm"
        >
          <LogOut size={22} />
          Log Out
        </button>
      </main>

      {/* Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-full shadow-2xl z-[100] text-sm font-bold pointer-events-none"
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingRow({ icon, label, value, onToggle }: any) {
  return (
    <div className="flex items-center justify-between p-6 hover:bg-surface/50 transition-colors group border-b border-surface/5 last:border-0">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-background flex items-center justify-center text-text-muted group-hover:text-primary transition-colors">
          {icon}
        </div>
        <span className="font-semibold text-[17px]">{label}</span>
      </div>
      <button 
        onClick={onToggle}
        className={`w-14 h-8 rounded-full relative transition-all duration-300 ${value ? 'bg-primary' : 'bg-surface/20'}`}
      >
        <motion.div 
          animate={{ x: value ? 28 : 4 }}
          className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
        />
      </button>
    </div>
  );
}
