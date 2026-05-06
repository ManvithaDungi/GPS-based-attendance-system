/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Clock, MapPin, RefreshCw, UserCheck, Users, UserX, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../lib/api';
import { NeumorphicCard } from '../components/common/NeumorphicCard';
import { cn } from '../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type DashboardStats = {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  totalLocations: number;
};

type Profile = {
  name: string;
  role: string;
};

type DayDetail = {
  present: number;
  absent: number;
  late: number;
};

type AttendanceCalendarProps = {
  onDayDetailChange?: (data: {
    selectedDay: number | null;
    month: number;
    year: number;
    detail: DayDetail | null;
    loading: boolean;
  }) => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatNumber = (value?: number) => (value ?? 0).toLocaleString('en-IN');

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const toDateStr = (year: number, month: number, day: number) => {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
};

// ─── AttendanceCalendar ───────────────────────────────────────────────────────

const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({ onDayDetailChange }) => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    onDayDetailChange?.({
      selectedDay,
      month,
      year,
      detail: dayDetail,
      loading: loadingDetail,
    });
  }, [selectedDay, month, year, dayDetail, loadingDetail, onDayDetailChange]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDay(null); setDayDetail(null);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDay(null); setDayDetail(null);
  };
  const prevYear = () => { setYear(y => y - 1); setSelectedDay(null); setDayDetail(null); };
  const nextYear = () => { setYear(y => y + 1); setSelectedDay(null); setDayDetail(null); };

  const handleDayClick = useCallback(async (day: number) => {
    const isFuture = new Date(year, month, day) > new Date();
    if (isFuture) return;

    setSelectedDay(day);
    setDayDetail(null);
    setLoadingDetail(true);

    const dateStr = toDateStr(year, month, day);
    try {
      // Uses admin endpoint: GET /admin/attendance?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=1000
      const res = await api.get(`/admin/attendance?from=${dateStr}&to=${dateStr}&limit=1000`);

      const records: any[] =
        res.data?.data?.data ??
        res.data?.data?.records ??
        res.data?.data ??
        res.data?.records ??
        res.data ??
        [];

      const present = records.filter((r: any) => r.status === 'PRESENT').length;
      const late    = records.filter((r: any) => r.status === 'LATE').length;
      const absent  = records.filter((r: any) => r.status === 'ABSENT').length;

      setDayDetail({ present, late, absent });
    } catch {
      setDayDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }, [year, month]);

  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear();

  return (
    <div className="flex flex-col gap-3">
      {/* Year navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={prevYear} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <span className="text-xs font-bold text-slate-500 w-10 text-center">{year}</span>
          <button onClick={nextYear} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>
          <span className="text-sm font-black text-slate-700 dark:text-slate-200 w-20 text-center">{MONTHS[month]}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase pb-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}

        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const isFuture = new Date(year, month, day) > new Date();
          const isToday  = isCurrentMonth && day === now.getDate();
          const isSelected = selectedDay === day;

          return (
            <button
              key={day}
              disabled={isFuture}
              onClick={() => handleDayClick(day)}
              className={cn(
                'aspect-square flex items-center justify-center rounded-lg text-xs font-bold transition-all',
                isFuture  && 'text-slate-300 dark:text-slate-700 cursor-not-allowed',
                !isFuture && !isSelected && 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
                isToday   && !isSelected && 'text-primary ring-1 ring-primary/40',
                isSelected && 'bg-primary text-white shadow-md scale-110',
              )}
            >
              {day}
            </button>
          );
        })}
      </div>

    </div>
  );
};

// ─── Overview ─────────────────────────────────────────────────────────────────

export const Overview = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAttendance, setSelectedAttendance] = useState<{
    selectedDay: number | null;
    month: number;
    year: number;
    detail: DayDetail | null;
    loading: boolean;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardRes, profileRes] = await Promise.all([
          api.get('/admin/dashboard'),
          api.get('/auth/me'),
        ]);

        const totalStudents = dashboardRes.data.totalStudents ?? 0;
        const presentToday  = dashboardRes.data.presentToday ?? 0;

        setStats({
          totalStudents,
          presentToday,
          absentToday:    totalStudents - presentToday,
          lateToday:      dashboardRes.data.lateToday ?? 0,
          totalLocations: dashboardRes.data.totalLocations ?? 0,
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

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <NeumorphicCard className="p-8 text-center">
          <p className="font-bold text-danger">{error || 'Dashboard data is unavailable'}</p>
        </NeumorphicCard>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Students', value: stats.totalStudents, icon: Users,    color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Present Today',  value: stats.presentToday,  icon: UserCheck, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Absent Today',   value: stats.absentToday,   icon: UserX,     color: 'text-danger',  bg: 'bg-danger/10'  },
    { label: 'Late Today',     value: stats.lateToday,     icon: Clock,     color: 'text-warning', bg: 'bg-warning/10' },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 font-headline tracking-tight">
          Dashboard Overview
        </h2>
        <p className="text-slate-500 mt-1">
          Welcome back, {profile?.name ?? 'Admin'}. Here is today's InDaZone attendance snapshot.
        </p>
      </div>

      {/* Stat Cards */}
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

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left: Selected Attendance Summary */}
        <NeumorphicCard className="lg:col-span-2 p-8">
          <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-headline mb-6">
            Attendance Summary
          </h4>

          {selectedAttendance?.selectedDay ? (
            <>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
                {MONTHS[selectedAttendance.month]} {selectedAttendance.selectedDay}, {selectedAttendance.year}
              </p>

              {selectedAttendance.loading ? (
                <div className="flex justify-center py-10">
                  <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : selectedAttendance.detail ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-bg-light dark:bg-bg-dark p-5 rounded-2xl neumorphic-inset">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Present
                      </p>
                      <p className="text-2xl font-black text-success mt-2">
                        {formatNumber(selectedAttendance.detail.present)}
                      </p>
                    </div>

                    <div className="bg-bg-light dark:bg-bg-dark p-5 rounded-2xl neumorphic-inset">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Absent
                      </p>
                      <p className="text-2xl font-black text-danger mt-2">
                        {formatNumber(selectedAttendance.detail.absent)}
                      </p>
                    </div>

                    <div className="bg-bg-light dark:bg-bg-dark p-5 rounded-2xl neumorphic-inset">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Late
                      </p>
                      <p className="text-2xl font-black text-warning mt-2">
                        {formatNumber(selectedAttendance.detail.late)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-3 text-slate-500">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold">
                      {formatNumber(stats.totalLocations)} active premises configured
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-[220px]">
                  <p className="text-sm text-slate-400">
                    No attendance records for selected day.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-slate-400 text-sm">
                Select a date from the calendar to view attendance summary.
              </p>
            </div>
          )}
        </NeumorphicCard>

        {/* Right: Interactive Calendar */}
        <NeumorphicCard className="p-6 flex flex-col">
          <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-headline mb-1">
            Attendance by Date
          </h4>

          <p className="text-xs text-slate-400 mb-4">
            Click any past date to see student counts.
          </p>

          <AttendanceCalendar onDayDetailChange={setSelectedAttendance} />
        </NeumorphicCard>
      </div>
    </div>
  );
};