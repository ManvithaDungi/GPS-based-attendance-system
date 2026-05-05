import React, { useState, useEffect } from 'react';
import { Search, Sun, Moon, Bell, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';
import api from '../../lib/api';

export const TopBar = () => {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [profile, setProfile] = useState<{ name: string; role: string } | null>(null);
  const profileInitial = (profile?.name || 'Admin').charAt(0).toUpperCase();

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/auth/me');
        setProfile({
          name: response.data.name ?? 'Admin',
          role: response.data.role ?? 'ADMIN',
        });
      } catch (err) {
        console.error('Error fetching profile', err);
      }
    };

    fetchProfile();
  }, []);

  return (
    <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-20 bg-bg-light/80 dark:bg-bg-dark/80 backdrop-blur-md z-40 flex justify-between items-center px-8">
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search for students, staff or logs..." 
            className="w-full bg-surface-light dark:bg-surface-dark neumorphic-inset border-none rounded-2xl pl-12 pr-4 py-2.5 text-sm focus:ring-0 placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsDark(!isDark)}
            className="w-10 h-10 rounded-full bg-surface-light dark:bg-surface-dark neumorphic-raised flex items-center justify-center text-slate-500 hover:text-primary transition-colors"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button className="w-10 h-10 rounded-full bg-surface-light dark:bg-surface-dark neumorphic-raised flex items-center justify-center text-slate-500 hover:text-primary transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full border-2 border-bg-light dark:border-bg-dark"></span>
          </button>
          <button className="w-10 h-10 rounded-full bg-surface-light dark:bg-surface-dark neumorphic-raised flex items-center justify-center text-slate-500 hover:text-primary transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="h-8 w-px bg-slate-300 dark:bg-slate-700"></div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-none">{profile?.name ?? 'Admin'}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-1">{profile?.role ?? 'ADMIN'}</p>
          </div>
          <div className="w-10 h-10 rounded-xl neumorphic-raised bg-primary/10 text-primary flex items-center justify-center font-black">
            {profileInitial}
          </div>
        </div>
      </div>
    </header>
  );
};
