import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Calendar as CalendarIcon, 
  Filter, 
  Download, 
} from 'lucide-react';
import api from '../lib/api';
import { NeumorphicCard } from '../components/common/NeumorphicCard';
import { cn } from '../lib/utils';

export const Attendance = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/admin/attendance');
        const mappedData = res.data.data.map((row: any) => {
          const formatTime = (isoString: string) => {
            if (!isoString) return '-';
            return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          };
          const formatDuration = (hours: number | null) => {
            if (!hours) return '-';
            const h = Math.floor(hours);
            const m = Math.round((hours - h) * 60);
            return `${h}h ${m}m`;
          };
          const capitalize = (str: string) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '-';
          
          return {
            id: row.id,
            name: row.student?.name || 'Unknown',
            rollNo: row.student?.studentCode || 'N/A',
            status: capitalize(row.status),
            punctuality: row.punctuality === 'ON_TIME' ? 'On Time' : (row.punctuality === 'LATE' ? 'Late' : '-'),
            checkIn: formatTime(row.checkInTime),
            checkOut: formatTime(row.checkOutTime),
            duration: formatDuration(row.durationHours),
            date: row.date,
          };
        });
        setData(mappedData);
      } catch (err) {
        console.error('Error fetching attendance', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 font-headline tracking-tight">Attendance Logs</h2>
          <p className="text-slate-500 mt-1">Monitor daily student presence and punctuality trends.</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-bg-dark text-slate-700 dark:text-slate-200 font-bold rounded-2xl neumorphic-raised hover:text-primary transition-all self-start">
          <Download className="w-5 h-5" />
          <span>Export CSV</span>
        </button>
      </div>

      <NeumorphicCard className="p-4 sm:p-6 overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search by student name or roll number..." 
              className="w-full bg-bg-light dark:bg-bg-dark neumorphic-inset border-none rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-0"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 px-4 bg-bg-light dark:bg-bg-dark neumorphic-inset rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <CalendarIcon className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">May 04, 2026</span>
            </div>
            <div className="flex items-center gap-2 px-4 bg-bg-light dark:bg-bg-dark neumorphic-inset rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Filters</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg-light/40 dark:bg-bg-dark/40 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-black/5 dark:border-white/5">
                <th className="px-6 py-4">Student Name</th>
                <th className="px-6 py-4">Roll No</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Punctuality</th>
                <th className="px-6 py-4">Check-in</th>
                <th className="px-6 py-4">Check-out</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5 text-sm">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="px-6 py-6 h-16 bg-slate-200/20 dark:bg-slate-800/20"></td>
                  </tr>
                ))
              ) : data.map((row) => (
                <tr key={row.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{row.name}</td>
                  <td className="px-6 py-4 text-slate-500 font-medium">{row.rollNo}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                      row.status === 'Present' ? "bg-success/10 text-success" : 
                      row.status === 'Late' ? "bg-warning/10 text-warning" : "bg-danger/10 text-danger"
                    )}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-xs font-medium",
                      row.punctuality === 'On Time' ? "text-success" : "text-amber-500"
                    )}>
                      {row.punctuality}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{row.checkIn}</td>
                  <td className="px-6 py-4 text-slate-500">{row.checkOut}</td>
                  <td className="px-6 py-4 text-slate-500">{row.duration}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-primary font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity">View Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex items-center justify-between px-2">
          <p className="text-xs text-slate-500 font-medium">Showing 1-10 of 1,240 entries</p>
          <div className="flex gap-2">
            {[1, 2, 3, '...', 124].map((p, i) => (
              <button 
                key={i}
                className={cn(
                  "w-8 h-8 rounded-lg text-[10px] font-black transition-all",
                  p === 1 ? "bg-primary text-white shadow-lg" : "text-slate-500 hover:neumorphic-raised"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
};
