import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, ShieldCheck, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { CONFIG } from '../config';

const ADMIN_EMAIL = CONFIG.admin.email;
const ADMIN_PIN = CONFIG.admin.pin;

export default function AdminLogin() {
  const { user, profile, loading: authLoading } = useAuth();
  const [step, setStep] = useState<'credentials' | 'pin'>('credentials');
  const [isInitializing, setIsInitializing] = useState(true);
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Initialize device fingerprint immediately
  useEffect(() => {
    if (!localStorage.getItem('ants_dev_sig')) {
      localStorage.setItem('ants_dev_sig', crypto.randomUUID());
    }
  }, []);

  // Sync step with auth state
  useEffect(() => {
    if (authLoading) return;

    if (user && profile?.role === 'admin') {
      const isVerified = sessionStorage.getItem('admin_verified') === 'true';
      if (isVerified) {
        navigate('/admin', { replace: true });
      } else {
        setStep('pin');
      }
    } else if (user && profile?.role !== 'admin') {
      // If logged in as non-admin, kick them out
      supabase.auth.signOut();
      setStep('credentials');
    }
    
    setIsInitializing(false);
  }, [user, profile, authLoading, navigate]);

  if (isInitializing || authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-primary" size={48} />
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Securing Session...</p>
        </div>
      </div>
    );
  }

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (email !== ADMIN_EMAIL) {
        throw new Error('Invalid admin email');
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Get fingerprint
      const fingerprint = localStorage.getItem('ants_dev_sig') || 'unknown';

      const logAttempt = async (status: 'success' | 'fail') => {
        await supabase.from('admin_security_logs').insert({
          fingerprint,
          user_agent: navigator.userAgent,
          status
        });
      };

      if (authError) {
        await logAttempt('fail');
        throw authError;
      }

      // Check role immediately
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError || profile?.role !== 'admin') {
        await supabase.auth.signOut();
        await logAttempt('fail');
        throw new Error('Unauthorized: Admin access only');
      }

      // Success phase 1
      await logAttempt('success');
      setStep('pin');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (pin === ADMIN_PIN) {
      // Success phase 2
      sessionStorage.setItem('admin_verified', 'true');
      
      // Log successful session verification
      const fingerprint = localStorage.getItem('ants_dev_sig') || 'unknown';
      await supabase.from('admin_security_logs').insert({
        fingerprint,
        user_agent: navigator.userAgent,
        status: 'success'
      });
      
      navigate('/admin');
    } else {
      // Failure - log out immediately as requested
      await supabase.auth.signOut();
      setError('Access denied: Invalid PIN');
      setStep('credentials');
      setPin('');
      setPassword('');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 selection:bg-primary/30">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/[0.02] border border-white/10 backdrop-blur-xl rounded-[32px] p-8 md:p-12 shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 border border-primary/20">
            {step === 'credentials' ? <Lock size={32} /> : <ShieldCheck size={32} />}
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">
            ANTESIA <span className="text-primary">ADMIN</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium">
            {step === 'credentials' ? 'Secure Internal Access' : 'Two-Factor Authentication'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'credentials' ? (
            <motion.form 
              key="credentials"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleCredentialsLogin}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Admin Email</label>
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:bg-white/[0.07] transition-all"
                    placeholder="admin@antesia.internal"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
                  <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:bg-white/[0.07] transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400 text-sm font-medium"
                >
                  <AlertCircle size={18} />
                  {error}
                </motion.div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2 group transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    Continue to Verification
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </motion.form>
          ) : (
            <motion.form 
              key="pin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handlePinSubmit}
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">6-Digit Admin PIN</label>
                <input 
                  type="text"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-center text-3xl tracking-[1em] placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:bg-white/[0.07] transition-all font-mono"
                  placeholder="••••••"
                  autoFocus
                  required
                />
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400 text-sm font-medium"
                >
                  <AlertCircle size={18} />
                  {error}
                </motion.div>
              )}

              <button 
                type="submit"
                disabled={loading || pin.length !== 6}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2 group transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    Verify & Access Panel
                    <ShieldCheck size={18} />
                  </>
                )}
              </button>

              <button 
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  setStep('credentials');
                  navigate('/', { replace: true });
                }}
                className="w-full text-slate-500 hover:text-slate-300 text-xs font-bold uppercase tracking-widest transition-colors"
              >
                Cancel & Logout
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="fixed bottom-8 text-slate-600 text-[10px] font-bold uppercase tracking-[0.2em]">
        Antesia Internal Security System v2.0
      </div>
    </div>
  );
}
