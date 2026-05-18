import React, { useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, FileDown, Printer } from 'lucide-react';
import api from '../lib/api';
import { NeumorphicCard } from '../components/common/NeumorphicCard';
import { cn } from '../lib/utils';

type AttendanceRow = {
  id: string;
  name: string;
  rollNo: string;
  status: string;
  punctuality: string;
  checkIn: string;
  checkInDate: string;
  checkOut: string;
  duration: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const formatTime = (isoString?: string | null) => {
  if (!isoString) return '-';
  return new Date(isoString).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
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

/** Calendar date in UTC — matches `<input type="date">` values. Extracts from ISO string to avoid timezone conversion. */
const formatDateFilterValue = (value?: string | null) => {
  if (!value) return '';
  // Extract YYYY-MM-DD from ISO string directly to preserve UTC date
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) return match[0];
  // Fallback for invalid format
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${mm}-${dd}`;
};

const FILTER_BTN =
  'px-4 py-3 rounded-xl text-xs font-black text-slate-500 hover:text-primary hover:neumorphic-raised disabled:opacity-40 disabled:hover:shadow-none disabled:hover:text-slate-500 transition-all flex items-center justify-center gap-2 shrink-0';

const mapAttendanceRow = (row: any): AttendanceRow => ({
  id: row.id,
  name: row.student?.name || 'Unknown',
  rollNo: row.student?.studentCode || 'N/A',
  status: formatStatus(row.status),
  punctuality: row.punctuality === 'ON_TIME' ? 'On Time' : row.punctuality === 'LATE' ? 'Late' : '-',
  checkIn: formatTime(row.checkInTime),
  checkInDate: formatDateFilterValue(row.date ?? row.checkInTime),
  checkOut: formatTime(row.checkOutTime),
  duration: formatDuration(row.durationHours),
});

const escapeCsvCell = (value: string) => {
  // Neutralize spreadsheet formula injection (=, +, -, @)
  if (/^[=+\-@]/.test(value)) {
    value = `'${value}`;
  }
  // Quote cells with special characters
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const printHtmlDocument = (html: string) => {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Attendance print');
  Object.assign(iframe.style, {
    position: 'fixed',
    width: '0',
    height: '0',
    border: 'none',
    left: '-9999px',
    top: '0',
  });
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = win?.document;
  if (!doc || !win) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const runPrint = () => {
    win.focus();
    win.print();
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 500);
  };

  // Allow layout to finish before opening the print dialog.
  if (doc.readyState === 'complete') {
    setTimeout(runPrint, 150);
  } else {
    iframe.onload = () => setTimeout(runPrint, 150);
  }
};

const applyClientFilters = (
  rows: AttendanceRow[],
  search: string,
  statusFilter: string,
  punctualityFilter: string,
  dateFilter: string,
) => {
  const query = search.trim().toLowerCase();
  return rows.filter((row) => {
    const matchesSearch = !query ||
      row.name.toLowerCase().includes(query) ||
      row.rollNo.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'ALL' ||
      row.status.toUpperCase() === statusFilter;
    const matchesPunctuality = punctualityFilter === 'ALL' ||
      row.punctuality.toUpperCase().replace(' ', '_') === punctualityFilter;
    const matchesDate = !dateFilter || row.checkInDate === dateFilter;
    return matchesSearch && matchesStatus && matchesPunctuality && matchesDate;
  });
};

export const Attendance = () => {
  const [data, setData] = useState<AttendanceRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT' | 'LATE' | 'PENDING'>('ALL');
  const [punctualityFilter, setPunctualityFilter] = useState<'ALL' | 'ON_TIME' | 'LATE'>('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');

      try {
        const params: Record<string, string | number> = {
          page: pagination.page,
          limit: pagination.limit,
        };
        if (dateFilter) {
          params.from = dateFilter;
          params.to = dateFilter;
        }

        const res = await api.get('/admin/attendance', { params });
        const mappedData = (res.data.data ?? []).map(mapAttendanceRow);
        setData(mappedData);
        setPagination((current) => ({
          page: res.data.pagination?.page ?? current.page,
          limit: res.data.pagination?.limit ?? current.limit,
          total: res.data.pagination?.total ?? 0,
          totalPages: res.data.pagination?.totalPages ?? 1,
        }));
      } catch (err) {
        console.error('Error fetching attendance', err);
        setError('Failed to load attendance logs');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pagination.page, pagination.limit, dateFilter]);

  const filteredData = useMemo(
    () => applyClientFilters(data, search, statusFilter, punctualityFilter, dateFilter),
    [data, dateFilter, punctualityFilter, search, statusFilter],
  );

  const fetchAllForExport = async (): Promise<AttendanceRow[]> => {
    const allRows: AttendanceRow[] = [];
    let currentPage = 1;
    let totalPages = 1;

    // Paginate through all matching records
    while (currentPage <= totalPages) {
      const params: Record<string, string | number> = { page: currentPage, limit: 100 };
      if (dateFilter) {
        params.from = dateFilter;
        params.to = dateFilter;
      }
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await api.get('/admin/attendance', { params });
      const rows = (res.data.data ?? []).map(mapAttendanceRow);
      allRows.push(...rows);

      totalPages = res.data.pagination?.totalPages ?? 1;
      currentPage++;
    }

    return applyClientFilters(allRows, search, statusFilter, punctualityFilter, dateFilter);
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const rows = await fetchAllForExport();
      if (rows.length === 0) return;

      const headers = ['Student Name', 'Roll No', 'Date', 'Status', 'Punctuality', 'Check-in', 'Check-out', 'Duration'];
      const lines = [
        headers.map(escapeCsvCell).join(','),
        ...rows.map((row) =>
          [row.name, row.rollNo, row.checkInDate, row.status, row.punctuality, row.checkIn, row.checkOut, row.duration]
            .map(escapeCsvCell)
            .join(','),
        ),
      ];

      const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const suffix = dateFilter || 'all-dates';
      link.href = url;
      link.download = `attendance-${suffix}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV export failed', err);
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = async () => {
    setExporting(true);
    try {
      const rows = await fetchAllForExport();
      if (rows.length === 0) return;

      const title = dateFilter
        ? `Attendance Logs — ${dateFilter}`
        : 'Attendance Logs';

      const tableRows = rows.map((row) => `
        <tr>
          <td>${escapeHtml(row.name)}</td>
          <td>${escapeHtml(row.rollNo)}</td>
          <td>${escapeHtml(row.checkInDate)}</td>
          <td>${escapeHtml(row.status)}</td>
          <td>${escapeHtml(row.punctuality)}</td>
          <td>${escapeHtml(row.checkIn)}</td>
          <td>${escapeHtml(row.checkOut)}</td>
          <td>${escapeHtml(row.duration)}</td>
        </tr>
      `).join('');

      const generatedAt = escapeHtml(new Date().toLocaleString('en-IN'));

      printHtmlDocument(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${escapeHtml(title)}</title>
            <style>
              @page { margin: 16mm; }
              body { font-family: system-ui, sans-serif; padding: 24px; color: #1e293b; }
              h1 { font-size: 18px; margin: 0 0 4px; }
              p { font-size: 12px; color: #64748b; margin: 0 0 20px; }
              table { width: 100%; border-collapse: collapse; font-size: 12px; }
              th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
              th { background: #f8fafc; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
              tr:nth-child(even) { background: #f8fafc; }
            </style>
          </head>
          <body>
            <h1>${escapeHtml(title)}</h1>
            <p>${rows.length} record(s) · Generated ${generatedAt}</p>
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Roll No</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Punctuality</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
          </body>
        </html>
      `);
    } catch (err) {
      console.error('Print failed', err);
    } finally {
      setExporting(false);
    }
  };

  const firstItem = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const lastItem = Math.min(pagination.page * pagination.limit, pagination.total);
  const hasActiveFilters = statusFilter !== 'ALL' || punctualityFilter !== 'ALL' || dateFilter !== '';

  const resetFilters = () => {
    setStatusFilter('ALL');
    setPunctualityFilter('ALL');
    setDateFilter('');
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 font-headline tracking-tight">Attendance Logs</h2>
        <p className="text-slate-500 mt-1">Monitor daily student presence and punctuality records.</p>
      </div>

      <NeumorphicCard className="p-4 sm:p-6 overflow-hidden">
        <div className="flex flex-col xl:flex-row gap-4 mb-8">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search this page by student name or roll number..."
              className="w-full bg-bg-light dark:bg-bg-dark neumorphic-inset border-none rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-0"
            />
          </div>
          <div className={cn(
            'flex flex-col sm:flex-row gap-3 rounded-xl transition-all',
            hasActiveFilters && 'text-primary'
          )}>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'ALL' | 'PRESENT' | 'ABSENT' | 'LATE' | 'PENDING')}
              className={cn(
                'bg-bg-light dark:bg-bg-dark neumorphic-inset border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-500 focus:ring-0',
                statusFilter !== 'ALL' && 'text-primary'
              )}
            >
              <option value="ALL">All Status</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Late</option>
              <option value="PENDING">Pending</option>
            </select>
            <select
              value={punctualityFilter}
              onChange={(event) => setPunctualityFilter(event.target.value as 'ALL' | 'ON_TIME' | 'LATE')}
              className={cn(
                'bg-bg-light dark:bg-bg-dark neumorphic-inset border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-500 focus:ring-0',
                punctualityFilter !== 'ALL' && 'text-primary'
              )}
            >
              <option value="ALL">All Punctuality</option>
              <option value="ON_TIME">On Time</option>
              <option value="LATE">Late</option>
            </select>
            <input
              type="date"
              value={dateFilter}
              onChange={(event) => {
                setDateFilter(event.target.value);
                setPagination((current) => ({ ...current, page: 1 }));
              }}
              className={cn(
                'bg-bg-light dark:bg-bg-dark neumorphic-inset border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-500 focus:ring-0',
                dateFilter && 'text-primary'
              )}
            />
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={loading || exporting || pagination.total === 0}
              className={FILTER_BTN}
            >
              <FileDown className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || exporting || pagination.total === 0}
              className={FILTER_BTN}
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className={FILTER_BTN}
            >
              Reset
            </button>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5 text-sm">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-6 py-6 h-16 bg-slate-200/20 dark:bg-slate-800/20"></td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-danger font-bold">{error}</td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500 font-bold">
                    {data.length > 0 ? 'No results match filters' : 'No attendance records found'}
                  </td>
                </tr>
              ) : filteredData.map((row) => (
                <tr key={row.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{row.name}</td>
                  <td className="px-6 py-4 text-slate-500 font-medium">{row.rollNo}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider',
                      row.status === 'Present' ? 'bg-success/10 text-success' :
                      row.status === 'Late' ? 'bg-warning/10 text-warning' :
                      row.status === 'Pending' ? 'bg-slate-100/60 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300' :
                      'bg-danger/10 text-danger'
                    )}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn('text-xs font-medium', row.punctuality === 'On Time' ? 'text-success' : 'text-amber-500')}>
                      {row.punctuality}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{row.checkIn}</td>
                  <td className="px-6 py-4 text-slate-500">{row.checkOut}</td>
                  <td className="px-6 py-4 text-slate-500">{row.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
          <p className="text-xs text-slate-500 font-medium">
            Showing {firstItem}-{lastItem} of {pagination.total.toLocaleString('en-IN')} entries
          </p>
          <div className="flex gap-2">
            <button
              disabled={loading || pagination.page <= 1}
              onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))}
              className="px-3 h-8 rounded-lg text-[10px] font-black text-slate-500 hover:neumorphic-raised disabled:opacity-40 disabled:hover:shadow-none"
            >
              Previous
            </button>
            <span className="h-8 px-3 rounded-lg bg-primary text-white text-[10px] font-black flex items-center">
              {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : `${pagination.page} / ${pagination.totalPages}`}
            </span>
            <button
              disabled={loading || pagination.page >= pagination.totalPages}
              onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))}
              className="px-3 h-8 rounded-lg text-[10px] font-black text-slate-500 hover:neumorphic-raised disabled:opacity-40 disabled:hover:shadow-none"
            >
              Next
            </button>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
};
