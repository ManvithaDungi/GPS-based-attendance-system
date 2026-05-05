import React, { useEffect, useState } from 'react';
import { Clock, MapPin, RefreshCw, UserCheck, Users, UserX } from 'lucide-react';
import api from '../lib/api';
import { NeumorphicCard } from '../components/common/NeumorphicCard';
import { cn } from '../lib/utils';

type DashboardStats = {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  totalLocations: number;
};

type AttendanceSummary = {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  attendancePercentage: number;
};

type Profile = {
  name: string;
  role: string;
};

const formatNumber = (value?: number) => (value ?? 0).toLocaleString('en-IN');

export const Overview = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardRes, summaryRes, profileRes] = await Promise.all([
          api.get('/admin/dashboard'),
          api.get('/attendance/summary'),
          api.get('/auth/me'),
        ]);

        const totalStudents = dashboardRes.data.totalStudents ?? 0;
        const presentToday = dashboardRes.data.presentToday ?? 0;

        setStats({
          totalStudents,
          presentToday,
          absentToday: totalStudents - presentToday,
          lateToday: dashboardRes.data.lateToday ?? 0,
          totalLocations: dashboardRes.data.totalLocations ?? 0,
        });
        setSummary({
          totalDays: summaryRes.data.totalDays ?? 0,
          presentDays: summaryRes.data.presentDays ?? 0,
          absentDays: summaryRes.data.absentDays ?? 0,
          lateDays: summaryRes.data.lateDays ?? 0,
          attendancePercentage: summaryRes.data.attendancePercentage ?? 0,
        });
        setProfile({
          name: profileRes.data.name ?? 'Admin',
          role: profileRes.data.role ?? 'ADMIN',
        });
      } catch (err) {
        console.error('Error fetching dashboard data', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <RefreshCw className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !stats || !summary) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <NeumorphicCard className="p-8 text-center">
          <p className="font-bold text-danger">{error || 'Dashboard data is unavailable'}</p>
        </NeumorphicCard>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Present Today', value: stats.presentToday, icon: UserCheck, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Absent Today', value: stats.absentToday, icon: UserX, color: 'text-danger', bg: 'bg-danger/10' },
    { label: 'Late Today', value: stats.lateToday, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div>
        <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 font-headline tracking-tight">Dashboard Overview</h2>
        <p className="text-slate-500 mt-1">Welcome back, {profile?.name ?? 'Admin'}. Here is today's InDaZone attendance snapshot.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {statCards.map((card) => (
          <NeumorphicCard key={card.label} className="p-6 group hover:translate-y-[-4px]">
            <div className="flex justify-between items-start mb-4">
              <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110', card.bg)}>
                <card.icon className={cn('w-6 h-6', card.color)} />
              </div>
            </div>
            <p className="text-slate-500 text-sm font-medium mb-1">{card.label}</p>
            <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100">{formatNumber(card.value)}</h3>
          </NeumorphicCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <NeumorphicCard className="lg:col-span-2 p-8">
          <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-headline mb-6">Attendance Summary</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-bg-light dark:bg-bg-dark p-5 rounded-2xl neumorphic-inset">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Present Days</p>
              <p className="text-2xl font-black text-success mt-2">{formatNumber(summary.presentDays)}</p>
            </div>
            <div className="bg-bg-light dark:bg-bg-dark p-5 rounded-2xl neumorphic-inset">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Absent Days</p>
              <p className="text-2xl font-black text-danger mt-2">{formatNumber(summary.absentDays)}</p>
            </div>
            <div className="bg-bg-light dark:bg-bg-dark p-5 rounded-2xl neumorphic-inset">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Late Days</p>
              <p className="text-2xl font-black text-warning mt-2">{formatNumber(summary.lateDays)}</p>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-3 text-slate-500">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold">{formatNumber(stats.totalLocations)} active premises configured</span>
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="p-8 flex flex-col items-center">
          <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-headline mb-8 w-full">Quick Summary</h4>

          <div className="relative w-56 h-56 mb-8 flex items-center justify-center rounded-full neumorphic-inset">
            <svg className="w-48 h-48 transform -rotate-90">
              <circle className="text-slate-200 dark:text-slate-800" strokeWidth="12" stroke="currentColor" fill="transparent" r="84" cx="96" cy="96" />
              <circle
                className="text-primary"
                strokeWidth="12"
                strokeDasharray={527}
                strokeDashoffset={527 - (527 * Math.min(summary.attendancePercentage, 100)) / 100}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="84"
                cx="96"
                cy="96"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-5xl font-black text-slate-800 dark:text-slate-100">{summary.attendancePercentage.toFixed(1)}%</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Attendance</span>
            </div>
          </div>

          <div className="space-y-4 w-full">
            <div className="bg-bg-light dark:bg-bg-dark py-4 px-6 rounded-2xl neumorphic-inset text-center">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {formatNumber(summary.presentDays)} out of {formatNumber(summary.totalDays)}
              </p>
              <p className="text-[11px] text-slate-500 font-medium mt-1">Days marked present for the signed-in account</p>
            </div>
          </div>
        </NeumorphicCard>
      </div>
    </div>
  );
};
