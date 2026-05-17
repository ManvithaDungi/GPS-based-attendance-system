/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Clock, MapPin, RefreshCw, UserCheck, Users, UserX,
  ChevronLeft, ChevronRight, Hourglass, X,
} from 'lucide-react';
import api from '../lib/api';
import { NeumorphicCard } from '../components/common/NeumorphicCard';
import { cn } from '../lib/utils';
import { DashboardStats, UserDTO } from '@indazone/shared';

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = 'PRESENT' | 'ABSENT' | 'LATE' | 'PENDING';

// Use shared DTOs for dashboard/profile
type Profile = Pick<UserDTO, 'name' | 'role'>;

type DayDetail = {
  present: number;
  absent: number;
  late: number;
  pending: number;
};

type StudentRow = {
  id: string;
  name: string;
  rollNo: string;
  status: string;
  punctuality: string;
  checkIn: string;
  checkOut: string;
  duration: string;
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

const formatTime = (isoString?: string | null) => {
  if (!isoString) return '-';
  return new Date(isoString).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
};

const formatDuration = (hours?: number | null) => {
  if (!hours) return '-';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
};

const formatStatus = (value?: string | null) => {
  if (!value) return '-';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const toDateStr = (year: number, month: number, day: number) => {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
};

// Normalises the various shapes our API can return for paginated lists.
const unwrapRecords = (data: any): any[] =>
  data?.data?.data ?? data?.data?.records ?? data?.data ?? data?.records ?? data ?? [];



const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({ onDayDetailChange }) => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    onDayDetailChange?.({ selectedDay, month, year, detail: dayDetail, loading: loadingDetail });
  }, [selectedDay, month, year, dayDetail, loadingDetail, onDayDetailChange]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y: number) => y - 1); } else { setMonth((m: number) => m - 1); }
    setSelectedDay(null); setDayDetail(null);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y: number) => y + 1); } else { setMonth((m: number) => m + 1); }
    setSelectedDay(null); setDayDetail(null);
  };
  const prevYear  = () => { setYear(y => y - 1); setSelectedDay(null); setDayDetail(null); };
  const nextYear  = () => { setYear((y: number) => y + 1); setSelectedDay(null); setDayDetail(null); };

  const handleDayClick = useCallback(async (day: number) => {
    // Compare date-parts only so same-day clicks aren't blocked by clock time.
    const now = new Date();
    const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (new Date(year, month, day) > todayDateOnly) return;
    setSelectedDay(day); setDayDetail(null); setLoadingDetail(true);
    const dateStr = toDateStr(year, month, day);
    try {
      const res = await api.get(`/admin/attendance?from=${dateStr}&to=${dateStr}&limit=1000`);
      const records: any[] = unwrapRecords(res.data);
      const pending  = records.filter((r: any) => r.status === 'PENDING').length;
      const resolved = records.filter((r: any) => r.status !== 'PENDING');
      setDayDetail({
        present: resolved.filter((r: any) => r.status === 'PRESENT').length,
        late:    resolved.filter((r: any) => r.status === 'LATE').length,
        absent:  resolved.filter((r: any) => r.status === 'ABSENT').length,
        pending,
      });
    } catch { setDayDetail(null); }
    finally { setLoadingDetail(false); }
  }, [year, month]);

  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear();

  return (
    <div className="flex flex-col gap-3">
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
      <div className="grid grid-cols-7">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase pb-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const isFuture   = new Date(year, month, day) > todayDateOnly;
          const isToday    = isCurrentMonth && day === now.getDate();
          const isSelected = selectedDay === day;
          return (
            <button
              key={day}
              disabled={isFuture}
              onClick={() => handleDayClick(day)}
              className={cn(
                'aspect-square flex items-center justify-center rounded-lg text-xs font-bold transition-all',
                isFuture    && 'text-slate-300 dark:text-slate-700 cursor-not-allowed',
                !isFuture && !isSelected && 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
                isToday   && !isSelected && 'text-primary ring-1 ring-primary/40',
                isSelected  && 'bg-primary text-white shadow-md scale-110',
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

// ─── StudentDrawer ────────────────────────────────────────────────────────────

type StudentDrawerProps = {
  status: StatusFilter;
  date: string;
  onClose: () => void;
};

const STATUS_LABELS: Record<StatusFilter, string> = {
  PRESENT: 'Present',
  ABSENT:  'Absent',
  LATE:    'Late',
  PENDING: 'Pending',
};

const STATUS_COLORS: Record<StatusFilter, string> = {
  PRESENT: 'text-success',
  ABSENT:  'text-danger',
  LATE:    'text-warning',
  PENDING: 'text-slate-400',
};

const BADGE_COLORS: Record<string, string> = {
  Present: 'bg-success/10 text-success',
  Absent:  'bg-danger/10 text-danger',
  Late:    'bg-warning/10 text-warning',
  Pending: 'bg-slate-100/60 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300',
};

const StudentDrawer: React.FC<StudentDrawerProps> = ({ status, date, onClose }) => {
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const fetchStudents = async () => {
      setLoading(true); setError('');
      try {
        const res = await api.get(`/admin/attendance?from=${date}&to=${date}&limit=1000`);
        const records: any[] = unwrapRecords(res.data);
        const filtered = records.filter((r: any) => r.status === status);
        if (!cancelled) {
          setRows(filtered.map((r: any) => ({
            id:          r.id,
            name:        r.student?.name || 'Unknown',
            rollNo:      r.student?.studentCode || 'N/A',
            status:      formatStatus(r.status),
            punctuality: r.punctuality === 'ON_TIME' ? 'On Time' : r.punctuality === 'LATE' ? 'Late' : '-',
            checkIn:     formatTime(r.checkInTime),
            checkOut:    formatTime(r.checkOutTime),
            duration:    formatDuration(r.durationHours),
          })));
        }
      } catch { if (!cancelled) setError('Failed to load students'); }
      finally   { if (!cancelled) setLoading(false); }
    };
    fetchStudents();
    return () => { cancelled = true; };
  }, [status, date]);

  return (
    <div className="mt-6 animate-in slide-in-from-top-2 duration-300">
      {/* Drawer header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-black uppercase tracking-widest', STATUS_COLORS[status])}>
            {STATUS_LABELS[status]}
          </span>
          <span className="text-xs text-slate-400 font-medium">students · {date}</span>
          {!loading && (
            <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
              {rows.length} record{rows.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto overflow-y-auto max-h-72 rounded-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-bg-light/40 dark:bg-bg-dark/40 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-black/5 dark:border-white/5">
              <th className="px-4 py-3">Student Name</th>
              <th className="px-4 py-3">Roll No</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Punctuality</th>
              <th className="px-4 py-3">Check-in</th>
              <th className="px-4 py-3">Check-out</th>
              <th className="px-4 py-3">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5 text-sm">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={7} className="px-4 py-5 h-12 bg-slate-200/20 dark:bg-slate-800/20" />
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-danger font-bold">{error}</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-bold">
                  No {STATUS_LABELS[status].toLowerCase()} students found for this date.
                </td>
              </tr>
            ) : rows.map(row => (
              <tr key={row.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{row.name}</td>
                <td className="px-4 py-3 text-slate-500 font-medium">{row.rollNo}</td>
                <td className="px-4 py-3">
                  <span className={cn('px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider', BADGE_COLORS[row.status] ?? 'bg-slate-100 text-slate-600')}>
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs font-medium', row.punctuality === 'On Time' ? 'text-success' : 'text-amber-500')}>
                    {row.punctuality}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">{row.checkIn}</td>
                <td className="px-4 py-3 text-slate-500">{row.checkOut}</td>
                <td className="px-4 py-3 text-slate-500">{row.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
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

  // Two INDEPENDENT drill-down states — top cards always show today's data,
  // summary mini-cards show the calendar-selected date. They must never share state.
  const [activeSummaryStatus, setActiveSummaryStatus] = useState<StatusFilter | null>(null);

  const now = new Date();
  const todayStr = toDateStr(now.getFullYear(), now.getMonth(), now.getDate());

  // Date used by the summary drawer — calendar selection or today
  const summaryDateStr = selectedAttendance?.selectedDay
    ? toDateStr(selectedAttendance.year, selectedAttendance.month, selectedAttendance.selectedDay)
    : todayStr;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardRes, profileRes] = await Promise.all([
          api.get('/admin/dashboard'),
          api.get('/auth/me'),
        ]);
        setStats({
          totalStudents:  dashboardRes.data.totalStudents  ?? 0,
          presentToday:   dashboardRes.data.presentToday   ?? 0,
          absentToday:    dashboardRes.data.absentToday    ?? 0,
          lateToday:      dashboardRes.data.lateToday      ?? 0,
          pendingToday:   dashboardRes.data.pendingToday   ?? 0,
          totalLocations: dashboardRes.data.totalLocations ?? 0,
        });
        setProfile({ name: profileRes.data.name ?? 'Admin', role: profileRes.data.role ?? 'ADMIN' });
      } catch (err) {
        console.error('Error fetching dashboard data', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Close the SUMMARY drawer when the calendar date changes
  useEffect(() => {
    setActiveSummaryStatus(null);
  }, [selectedAttendance?.selectedDay, selectedAttendance?.month, selectedAttendance?.year]);

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

  const summaryDetail = selectedAttendance?.selectedDay && selectedAttendance.detail
    ? selectedAttendance.detail
    : { present: stats.presentToday, absent: stats.absentToday, late: stats.lateToday, pending: stats.pendingToday };

  const statCards = [
    { label: 'Total Students', value: stats.totalStudents, icon: Users,     color: 'text-primary',   bg: 'bg-primary/10',                 status: null                     },
    { label: 'Present Today',  value: stats.presentToday,  icon: UserCheck, color: 'text-success',   bg: 'bg-success/10',                 status: 'PRESENT' as StatusFilter },
    { label: 'Absent Today',   value: stats.absentToday,   icon: UserX,     color: 'text-danger',    bg: 'bg-danger/10',                  status: 'ABSENT'  as StatusFilter },
    { label: 'Late Today',     value: stats.lateToday,     icon: Clock,     color: 'text-warning',   bg: 'bg-warning/10',                 status: 'LATE'    as StatusFilter },
    { label: 'Pending',        value: stats.pendingToday,  icon: Hourglass, color: 'text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800',status: 'PENDING' as StatusFilter },
  ];

  const summaryCards = [
    { key: 'present' as const, label: 'Present', value: summaryDetail.present, color: 'text-success',   status: 'PRESENT' as StatusFilter },
    { key: 'absent'  as const, label: 'Absent',  value: summaryDetail.absent,  color: 'text-danger',    status: 'ABSENT'  as StatusFilter },
    { key: 'late'    as const, label: 'Late',     value: summaryDetail.late,    color: 'text-warning',   status: 'LATE'    as StatusFilter },
    { key: 'pending' as const, label: 'Pending',  value: summaryDetail.pending, color: 'text-slate-400', status: 'PENDING' as StatusFilter },
  ];

  const displayDate = selectedAttendance?.selectedDay
    ? `${MONTHS[selectedAttendance.month]} ${selectedAttendance.selectedDay}, ${selectedAttendance.year}`
    : `${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

  const isCalendarLoading = selectedAttendance?.loading ?? false;

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

      {/* Top Stat Cards — always today's data, independent from summary section */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <NeumorphicCard
              key={card.label}
              className={cn(
                'p-6 group transition-all hover:translate-y-[-4px]',
              )}
              onClick={undefined}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110', card.bg)}>
                  <Icon className={cn('w-6 h-6', card.color)} />
                </div>
              </div>
              <p className="text-slate-500 text-sm font-medium mb-1">{card.label}</p>
              <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100">{formatNumber(card.value)}</h3>
            </NeumorphicCard>
          );
        })}
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left: Attendance Summary */}
        <NeumorphicCard className="lg:col-span-2 p-8">
          <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-headline mb-6">
            Attendance Summary
          </h4>

          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
            {displayDate}
          </p>

          {isCalendarLoading ? (
            <div className="flex justify-center py-10">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* 4 clickable summary mini-cards — independent from top cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {summaryCards.map(card => (
                  <button
                    key={card.key}
                    onClick={() => setActiveSummaryStatus(prev => (prev === card.status ? null : card.status))}
                    className={cn(
                      'bg-bg-light dark:bg-bg-dark p-5 rounded-2xl neumorphic-inset text-left transition-all hover:scale-[1.02]',
                      activeSummaryStatus === card.status && 'ring-2 ring-primary/40',
                    )}
                  >
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{card.label}</p>
                    <p className={cn('text-2xl font-black mt-2', card.color)}>
                      {formatNumber(card.value)}
                    </p>
                    {activeSummaryStatus === card.status && (
                      <p className="text-[9px] font-black text-primary uppercase tracking-widest mt-1">viewing ↓</p>
                    )}
                  </button>
                ))}
              </div>

              {/* Premises */}
              <div className="mt-6 flex items-center gap-3 text-slate-500">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold">
                  {formatNumber(stats.totalLocations)} active premises configured
                </span>
              </div>

              {/* Summary drawer — uses calendar-selected date, independent from top */}
              {activeSummaryStatus && (
                <StudentDrawer
                  key={`summary-${activeSummaryStatus}-${summaryDateStr}`}
                  status={activeSummaryStatus}
                  date={summaryDateStr}
                  onClose={() => setActiveSummaryStatus(null)}
                />
              )}
            </>
          )}
        </NeumorphicCard>

        {/* Right: Calendar */}
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