/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Upload,
  RefreshCw,
  CheckCircle,
  XCircle,
  FileJson,
  ChevronLeft,
  ChevronRight,
  Search,
  ShieldOff,
  ShieldCheck,
} from 'lucide-react';
import api from '../lib/api';
import { NeumorphicCard } from '../components/common/NeumorphicCard';
import { cn } from '../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Student = {
  id: string;
  name: string;
  email: string;
  studentCode: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type BulkResult = {
  name: string;
  email: string;
  success: boolean;
  message?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LIMIT = 10;

// ─── Students ─────────────────────────────────────────────────────────────────

export const Students = () => {
  // ── Table state ──
  const [students, setStudents] = useState<Student[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: LIMIT, total: 0, totalPages: 1 });
  const [tableLoading, setTableLoading] = useState(true);
  const [tableError, setTableError] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // ── Single register state ──
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regStudentCode, setRegStudentCode] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState('');
  const [regError, setRegError] = useState('');

  // ── Bulk upload state ──
  const fileRef = useRef<HTMLInputElement>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
  const [bulkFileName, setBulkFileName] = useState('');

  // ─── Fetch students ───────────────────────────────────────────────────────

  const fetchStudents = useCallback(async (page: number, searchVal: string) => {
    setTableLoading(true);
    setTableError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        ...(searchVal ? { search: searchVal } : {}),
      });
      const res = await api.get(`/admin/students?${params}`);

      // Normalise various response shapes
      const data: Student[] =
        res.data?.data?.data ??
        res.data?.data ??
        res.data?.students ??
        res.data ??
        [];

      const pag: Pagination =
        res.data?.data?.pagination ??
        res.data?.pagination ??
        { page, limit: LIMIT, total: data.length, totalPages: 1 };

      setStudents(data);
      setPagination(pag);
    } catch {
      setTableError('Failed to load students.');
    } finally {
      setTableLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents(pagination.page, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, search]);

  // ─── Single Register ──────────────────────────────────────────────────────

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    setRegSuccess('');
    setRegError('');
    try {
      await api.post('/admin/students', {
        name: regName,
        email: regEmail,
        password: regPassword,
        ...(regStudentCode ? { studentCode: regStudentCode } : {}),
        role: 'STUDENT',
      });
      setRegSuccess(`Student "${regName}" registered successfully.`);
      setRegName(''); setRegEmail(''); setRegPassword(''); setRegStudentCode('');
      // Refresh table to page 1
      setPagination(p => ({ ...p, page: 1 }));
      fetchStudents(1, search);
    } catch (err: any) {
      setRegError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setRegLoading(false);
    }
  };

  // ─── Bulk Upload ──────────────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFileName(file.name);
    setBulkResults([]);
    setBulkLoading(true);

    try {
      const text = await file.text();
      const parsed: { name: string; email: string; password: string; studentCode?: string }[] = JSON.parse(text);

      if (!Array.isArray(parsed)) throw new Error('JSON must be an array.');

      const results: BulkResult[] = [];

      for (const student of parsed) {
        try {
          await api.post('/admin/students', { ...student, role: 'STUDENT' });
          results.push({ name: student.name, email: student.email, success: true });
        } catch (err: any) {
          results.push({
            name: student.name ?? '—',
            email: student.email ?? '—',
            success: false,
            message: err.response?.data?.message || 'Failed',
          });
        }
      }

      setBulkResults(results);
      fetchStudents(1, search);
      setPagination(p => ({ ...p, page: 1 }));
    } catch (err: any) {
      setBulkResults([{ name: '—', email: '—', success: false, message: err.message || 'Invalid JSON file.' }]);
    } finally {
      setBulkLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // ─── Status toggle ────────────────────────────────────────────────────────

  const handleToggleStatus = async (student: Student) => {
    const newStatus = student.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.patch(`/admin/students/${student.id}/status`, { status: newStatus });
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, status: newStatus } : s));
    } catch {
      // silent — table will show stale state
    }
  };

  // ─── Search ───────────────────────────────────────────────────────────────

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPagination(p => ({ ...p, page: 1 }));
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-10 animate-in fade-in duration-700">

      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 font-headline tracking-tight">
          Student Management
        </h2>
        <p className="text-slate-500 mt-1">Register students individually or in bulk, and manage their accounts.</p>
      </div>

      {/* Top row: Single Register + Bulk Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ── Single Register ── */}
        <NeumorphicCard className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-headline">Register Student</h4>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-4">Full Name</label>
              <input
                type="text"
                value={regName}
                onChange={e => setRegName(e.target.value)}
                required
                placeholder="Jane Doe"
                className="w-full bg-bg-light dark:bg-bg-dark neumorphic-inset border-none rounded-2xl px-4 py-3.5 text-sm focus:ring-0 placeholder:text-slate-400"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-4">Email Address</label>
              <input
                type="email"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                required
                placeholder="jane@college.edu"
                className="w-full bg-bg-light dark:bg-bg-dark neumorphic-inset border-none rounded-2xl px-4 py-3.5 text-sm focus:ring-0 placeholder:text-slate-400"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-4">Password</label>
              <input
                type="password"
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-bg-light dark:bg-bg-dark neumorphic-inset border-none rounded-2xl px-4 py-3.5 text-sm focus:ring-0 placeholder:text-slate-400"
              />
            </div>

            {/* Student Code (optional) */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-4">Student Code <span className="normal-case font-normal">(optional)</span></label>
              <input
                type="text"
                value={regStudentCode}
                onChange={e => setRegStudentCode(e.target.value)}
                placeholder="CS2024001"
                className="w-full bg-bg-light dark:bg-bg-dark neumorphic-inset border-none rounded-2xl px-4 py-3.5 text-sm focus:ring-0 placeholder:text-slate-400"
              />
            </div>

            {regSuccess && (
              <div className="flex items-center gap-2 text-success text-xs font-bold">
                <CheckCircle className="w-4 h-4" /> {regSuccess}
              </div>
            )}
            {regError && (
              <div className="flex items-center gap-2 text-danger text-xs font-bold">
                <XCircle className="w-4 h-4" /> {regError}
              </div>
            )}

            <button
              type="submit"
              disabled={regLoading}
              className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-[0_10px_20px_rgba(79,142,247,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
            >
              {regLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Register Student'}
            </button>
          </form>
        </NeumorphicCard>

        {/* ── Bulk Upload ── */}
        <NeumorphicCard className="p-8 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <Upload className="w-5 h-5 text-warning" />
            </div>
            <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-headline">Bulk Import</h4>
          </div>

          {/* Format hint */}
          <div className="bg-bg-light dark:bg-bg-dark neumorphic-inset rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <FileJson className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Required JSON Format</span>
            </div>
            <pre className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed overflow-x-auto">{`[
  {
    "name": "Jane Doe",
    "email": "jane@college.edu",
    "password": "secure123",
    "studentCode": "CS2024001"
  },
  {
    "name": "John Smith",
    "email": "john@college.edu",
    "password": "secure456"
  }
]`}</pre>
            <p className="text-[10px] text-slate-400 mt-2"><span className="font-bold">studentCode</span> is optional. All other fields are required.</p>
          </div>

          {/* Drop zone / upload button */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={bulkLoading}
            className="w-full border-2 border-dashed border-primary/30 hover:border-primary/60 rounded-2xl py-8 flex flex-col items-center justify-center gap-3 transition-all hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {bulkLoading
              ? <RefreshCw className="w-8 h-8 text-primary animate-spin" />
              : <Upload className="w-8 h-8 text-primary/60" />
            }
            <span className="text-sm font-bold text-slate-500">
              {bulkLoading ? 'Importing...' : bulkFileName ? bulkFileName : 'Click to upload JSON file'}
            </span>
          </button>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFileChange} />

          {/* Bulk results */}
          {bulkResults.length > 0 && (
            <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Import Results</p>
              {bulkResults.map((r, i) => (
                <div key={i} className={cn(
                  'flex items-center gap-2 text-xs rounded-xl px-3 py-2',
                  r.success ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                )}>
                  {r.success
                    ? <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    : <XCircle className="w-3.5 h-3.5 shrink-0" />
                  }
                  <span className="font-bold truncate">{r.name}</span>
                  <span className="text-slate-400 truncate">({r.email})</span>
                  {!r.success && <span className="ml-auto shrink-0">{r.message}</span>}
                </div>
              ))}
            </div>
          )}
        </NeumorphicCard>
      </div>

      {/* ── Student Table ── */}
      <NeumorphicCard className="p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-success" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-headline">All Students</h4>
              <p className="text-xs text-slate-400">{pagination.total} total records</p>
            </div>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search name or email..."
                className="bg-bg-light dark:bg-bg-dark neumorphic-inset border-none rounded-xl pl-9 pr-4 py-2.5 text-sm focus:ring-0 placeholder:text-slate-400 w-56"
              />
            </div>
            <button type="submit" className="px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all">
              Search
            </button>
          </form>
        </div>

        {tableLoading ? (
          <div className="flex justify-center py-16">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : tableError ? (
          <div className="flex justify-center py-16">
            <p className="text-danger text-sm font-bold">{tableError}</p>
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Users className="w-10 h-10 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-400 text-sm">No students found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/5 dark:border-white/5">
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 pb-3 pl-2">#</th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 pb-3">Name</th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 pb-3">Email</th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 pb-3">Student Code</th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 pb-3">Status</th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 pb-3">Joined</th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
                  {students.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-primary/5 transition-colors group">
                      <td className="py-3.5 pl-2 text-slate-400 font-medium">
                        {(pagination.page - 1) * LIMIT + idx + 1}
                      </td>
                      <td className="py-3.5 font-bold text-slate-800 dark:text-slate-100">{s.name}</td>
                      <td className="py-3.5 text-slate-500">{s.email}</td>
                      <td className="py-3.5 text-slate-500 font-mono text-xs">{s.studentCode ?? '—'}</td>
                      <td className="py-3.5">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide',
                          s.status === 'ACTIVE'
                            ? 'bg-success/10 text-success'
                            : 'bg-danger/10 text-danger'
                        )}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', s.status === 'ACTIVE' ? 'bg-success' : 'bg-danger')} />
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-400 text-xs">
                        {new Date(s.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3.5">
                        <button
                          onClick={() => handleToggleStatus(s)}
                          title={s.status === 'ACTIVE' ? 'Suspend student' : 'Activate student'}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95',
                            s.status === 'ACTIVE'
                              ? 'bg-danger/10 text-danger hover:bg-danger/20'
                              : 'bg-success/10 text-success hover:bg-success/20'
                          )}
                        >
                          {s.status === 'ACTIVE'
                            ? <><ShieldOff className="w-3.5 h-3.5" /> Suspend</>
                            : <><ShieldCheck className="w-3.5 h-3.5" /> Activate</>
                          }
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-black/5 dark:border-white/5">
                <p className="text-xs text-slate-400">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                    className="p-2 rounded-xl bg-bg-light dark:bg-bg-dark neumorphic-raised disabled:opacity-40 hover:text-primary transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                    className="p-2 rounded-xl bg-bg-light dark:bg-bg-dark neumorphic-raised disabled:opacity-40 hover:text-primary transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </NeumorphicCard>
    </div>
  );
};