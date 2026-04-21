import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import { CONFIG } from '../config';

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Handle admin login specially
      const email = loginId.toLowerCase() === 'admin' 
        ? CONFIG.admin.email 
        : `${loginId.toLowerCase()}@antesia.com`;
      
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: password,
      });

      if (authError) throw authError;

      // Check role mismatch
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profile && profile.role === 'admin') {
        // Admin logged in, but needs PIN verification
        setLoading(false);
        navigate('/admin-login', { replace: true });
        return;
      }

      if (profile && profile.role !== role) {
        await supabase.auth.signOut();
        throw new Error(`This ID belongs to a ${profile.role} account. Please switch the toggle above.`);
      }
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? 'Invalid Login ID or Password' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-indigo-600 to-violet-700 relative overflow-hidden">
      {/* Subtle geometric pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[24px] shadow-2xl p-8 w-[85%] max-w-md z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary tracking-tight">ANTESIA</h1>
          <p className="text-text-muted text-sm mt-1">Your classroom, supercharged.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Role Selector */}
          <div className="flex bg-gray-100 p-1 rounded-pill">
            <button
              type="button"
              onClick={() => setRole('teacher')}
              className={`flex-1 py-2 rounded-pill text-sm font-semibold transition-all ${
                role === 'teacher' ? 'bg-primary text-white shadow-sm' : 'text-text-muted'
              }`}
            >
              Teacher
            </button>
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`flex-1 py-2 rounded-pill text-sm font-semibold transition-all ${
                role === 'student' ? 'bg-primary text-white shadow-sm' : 'text-text-muted'
              }`}
            >
              Student
            </button>
          </div>

          {/* Login ID */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              <User size={18} />
            </div>
            <input
              type="text"
              placeholder="Login ID"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-input focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              required
            />
          </div>

          {/* Password */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              <Lock size={18} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-input focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <p className="text-danger text-xs text-center font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-button shadow-lg shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-text-muted text-xs font-medium">
            {role === 'student' 
              ? 'Please consult your class teacher for account registration.' 
              : 'Please contact the IT Department for administrative access.'}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
