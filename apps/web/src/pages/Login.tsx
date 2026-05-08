import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, Loader2, User } from 'lucide-react';
import api from '../lib/api';
import { NeumorphicCard } from '../components/common/NeumorphicCard';

export const Login = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login fields
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const switchMode = (next: 'login' | 'register') => {
    setError('');
    setMode(next);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const getDeviceId = () => {
        const key = 'deviceId';
        let id = localStorage.getItem(key);
        if (!id) {
          id = crypto.randomUUID();
          localStorage.setItem(key, id);
        }
        return id;
      };

      const deviceId = getDeviceId();
      const response = await api.post('/auth/login', { email, password, deviceId });
      if (response.data.user?.role !== 'ADMIN') {
        setError('Admin access is required for this portal');
        return;
      }
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('userRole', response.data.user.role);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/auth/register', {
        name: regName,
        email: regEmail,
        password: regPassword,
        role: 'ADMIN',
      });
      // On success, switch to login and pre-fill email
      setEmail(regEmail);
      setPassword('');
      switchMode('login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex items-center justify-center p-4">
      <NeumorphicCard className="w-full max-w-md p-8 sm:p-12">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-surface-light dark:bg-surface-dark neumorphic-raised flex items-center justify-center mb-4">
            <ShieldCheck className="text-primary w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">InDaZone</h1>
          <p className="text-slate-500 font-medium mt-1">Admin Portal</p>
        </div>

        {/* Toggle */}
        <div className="flex bg-surface-light dark:bg-surface-dark neumorphic-inset rounded-2xl p-1 mb-8">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${mode === m
                ? 'bg-primary text-white shadow-[0_4px_12px_rgba(79,142,247,0.3)]'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
            >
              {m === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-4">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-light dark:bg-surface-dark neumorphic-inset border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-0 placeholder:text-slate-400"
                  placeholder="admin@indazone.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-4">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-light dark:bg-surface-dark neumorphic-inset border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-0 placeholder:text-slate-400"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && <p className="text-danger text-xs font-bold text-center animate-pulse">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-[0_10px_20px_rgba(79,142,247,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In To Dashboard'}
            </button>
          </form>
        )}

        {/* Register Form */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-4">Admin Name</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full bg-surface-light dark:bg-surface-dark neumorphic-inset border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-0 placeholder:text-slate-400"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-4">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full bg-surface-light dark:bg-surface-dark neumorphic-inset border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-0 placeholder:text-slate-400"
                  placeholder="admin@indazone.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-4">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full bg-surface-light dark:bg-surface-dark neumorphic-inset border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-0 placeholder:text-slate-400"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && <p className="text-danger text-xs font-bold text-center animate-pulse">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-[0_10px_20px_rgba(79,142,247,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Admin Account'}
            </button>
          </form>
        )}
      </NeumorphicCard>
    </div>
  );
};