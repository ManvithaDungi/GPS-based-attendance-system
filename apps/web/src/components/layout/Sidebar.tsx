import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UserCheck, 
  MapPin, 
  History, 
  LogOut, 
  ShieldCheck,
  HelpCircle,
  Users,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import api from '../../lib/api';

const menuItems = [
  { icon: LayoutDashboard, label: 'Overview',   path: '/' },
  { icon: UserCheck,       label: 'Attendance', path: '/attendance' },
  { icon: Users,           label: 'Students',   path: '/students' },
  { icon: MapPin,          label: 'Premises',   path: '/premises' },
  { icon: History,         label: 'Logs',       path: '/logs' },
];

export const Sidebar = () => {
  const handleLogout = async () => {
    try {
      // Use shared axios client so interceptors attach Authorization and send cookies
      await api.post('/auth/logout', {}, { withCredentials: true });
    } catch (err) {
      // ignore logout errors
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userRole');
    window.location.href = '/login';
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-bg-light dark:bg-bg-dark border-r border-black/5 dark:border-white/5 py-8 flex flex-col z-50">
      <div className="px-6 mb-10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-surface-light dark:bg-surface-dark neumorphic-raised flex items-center justify-center">
          <ShieldCheck className="text-primary w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-black text-primary tracking-tighter">InDaZone</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Admin Dashboard</p>
        </div>
      </div>

      <nav className="flex-1 space-y-4 px-4 font-headline">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300",
              isActive 
                ? "bg-surface-light dark:bg-surface-dark neumorphic-inset text-primary" 
                : "text-slate-500 hover:text-primary hover:neumorphic-raised"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium text-sm">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-4 space-y-2 border-t border-black/5 dark:border-white/5 pt-6">
        <NavLink
          to="/help"
          className={({ isActive }) => cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300",
            isActive
              ? "bg-surface-light dark:bg-surface-dark neumorphic-inset text-primary"
              : "text-slate-500 hover:text-primary hover:neumorphic-raised"
          )}
        >
          <HelpCircle className="w-5 h-5" />
          <span className="font-medium text-sm">Help Center</span>
        </NavLink>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-danger hover:neumorphic-raised transition-all font-headline"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
};