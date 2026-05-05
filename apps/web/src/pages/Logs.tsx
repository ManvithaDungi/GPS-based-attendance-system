import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Cpu, Fingerprint, Navigation, RefreshCw, Search } from 'lucide-react';
import api from '../lib/api';
import { NeumorphicCard } from '../components/common/NeumorphicCard';
import { cn } from '../lib/utils';

type FraudLog = {
  id: string;
  student: string;
  studentCode: string;
  type: string;
  risk: string;
  details: unknown;
  timestamp: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export const Logs = () => {
  const [logs, setLogs] = useState<FraudLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      if (localStorage.getItem('userRole') !== 'ADMIN') {
        setError('Admin access is required to view fraud logs');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const res = await api.get('/fraud', {
          params: { page: pagination.page, limit: pagination.limit },
        });
        const mappedLogs = (res.data.data ?? []).map((log: any) => ({
          id: log.id,
          student: log.student?.name || 'Unknown',
          studentCode: log.student?.studentCode || 'N/A',
          type: log.type || 'Unknown',
          risk: log.riskLevel || 'LOW',
          details: log.details ?? {},
          timestamp: log.createdAt ? new Date(log.createdAt).toLocaleString('en-IN') : '-',
        }));

        setLogs(mappedLogs);
        setPagination((current) => ({
          page: res.data.pagination?.page ?? current.page,
          limit: res.data.pagination?.limit ?? current.limit,
          total: res.data.pagination?.total ?? 0,
          totalPages: res.data.pagination?.totalPages ?? 1,
        }));
      } catch (err) {
        console.error('Error fetching logs', err);
        setError('Failed to load fraud logs');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [pagination.page, pagination.limit]);

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesSearch = !query ||
        log.student.toLowerCase().includes(query) ||
        log.studentCode.toLowerCase().includes(query) ||
        log.type.toLowerCase().includes(query);
      const matchesRisk = riskFilter === 'ALL' || log.risk.toUpperCase() === riskFilter;
      const matchesType = typeFilter === 'ALL' || log.type === typeFilter;

      return matchesSearch && matchesRisk && matchesType;
    });
  }, [logs, riskFilter, search, typeFilter]);

  const uniqueTypes = useMemo(() => Array.from(new Set(logs.map((log) => log.type))).filter(Boolean), [logs]);
  const highRiskCount = logs.filter((log) => log.risk.toLowerCase() === 'high').length;

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'high': return 'text-danger bg-danger/10 border-danger/20';
      case 'medium': return 'text-warning bg-warning/10 border-warning/20';
      case 'low': return 'text-primary bg-primary/10 border-primary/20';
      default: return 'text-slate-500 bg-slate-100 border-slate-200';
    }
  };

  const getFraudIcon = (type: string) => {
    if (type.toLowerCase().includes('location')) return <Navigation className="w-4 h-4" />;
    if (type.toLowerCase().includes('device')) return <Cpu className="w-4 h-4" />;
    return <Fingerprint className="w-4 h-4" />;
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-1000">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 font-headline tracking-tight">Security & Fraud Logs</h2>
          <p className="text-slate-500 mt-2 font-medium">Identify and review anomalies in attendance verification patterns.</p>
        </div>
        <div className="px-6 py-3 rounded-2xl bg-danger/10 text-danger border border-danger/20 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          <div>
            <p className="text-[10px] font-black uppercase leading-none">High Risk On Page</p>
            <p className="text-lg font-black leading-none mt-1">{highRiskCount}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <NeumorphicCard className="p-6">
            <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 font-headline">Search</h4>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Student, code, or event type..."
                  className="w-full bg-bg-light dark:bg-bg-dark neumorphic-inset border-none rounded-xl pl-12 pr-4 py-3 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={riskFilter}
                  onChange={(event) => setRiskFilter(event.target.value)}
                  className="bg-bg-light dark:bg-bg-dark neumorphic-inset border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-500 focus:ring-0"
                >
                  <option value="ALL">All Risks</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="bg-bg-light dark:bg-bg-dark neumorphic-inset border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-500 focus:ring-0"
                >
                  <option value="ALL">All Types</option>
                  {uniqueTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          </NeumorphicCard>
        </div>

        <div className="md:col-span-2">
          <NeumorphicCard className="p-0 overflow-hidden">
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <div key={i} className="h-20 w-full bg-slate-100/50 dark:bg-slate-800/50 animate-pulse"></div>
                ))
              ) : error ? (
                <div className="p-10 text-center text-danger font-bold">{error}</div>
              ) : filteredLogs.length === 0 ? (
                <div className="p-10 text-center text-slate-500 font-bold">No fraud logs found</div>
              ) : filteredLogs.map((log) => (
                <div key={log.id} className="transition-all">
                  <div
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    className={cn(
                      'p-6 flex items-center justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-all',
                      expandedId === log.id && 'bg-black/5 dark:bg-white/5'
                    )}
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-10 h-10 rounded-full neumorphic-inset flex items-center justify-center text-slate-400">
                        {getFraudIcon(log.type)}
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-800 dark:text-slate-100">{log.student}</h5>
                        <p className="text-xs text-slate-500 font-medium">{log.type}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      <span className={cn('px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border', getRiskColor(log.risk))}>
                        {log.risk} Risk
                      </span>
                      <span className="text-xs text-slate-400 font-medium hidden sm:block">{log.timestamp}</span>
                      {expandedId === log.id ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </div>

                  {expandedId === log.id && (
                    <div className="px-6 pb-6 pt-2 bg-black/5 dark:bg-white/5 animate-in slide-in-from-top-2 duration-300">
                      <div className="p-6 rounded-2xl bg-bg-light dark:bg-bg-dark neumorphic-inset">
                        <h6 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Anomalous Metadata</h6>
                        <pre className="text-xs font-mono text-primary dark:text-blue-400 overflow-x-auto p-4 rounded-xl bg-black/5 block">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="p-6 bg-slate-50 dark:bg-bg-dark/50 flex items-center justify-between">
              <p className="text-xs text-slate-500 font-medium">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total.toLocaleString('en-IN')} total logs
              </p>
              <div className="flex gap-2">
                <button
                  disabled={loading || pagination.page <= 1}
                  onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))}
                  className="px-3 h-8 rounded-lg text-[10px] font-black text-slate-500 hover:neumorphic-raised disabled:opacity-40 disabled:hover:shadow-none"
                >
                  Previous
                </button>
                <button
                  disabled={loading || pagination.page >= pagination.totalPages}
                  onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))}
                  className="px-3 h-8 rounded-lg text-[10px] font-black text-slate-500 hover:neumorphic-raised disabled:opacity-40 disabled:hover:shadow-none"
                >
                  {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Next'}
                </button>
              </div>
            </div>
          </NeumorphicCard>
        </div>
      </div>
    </div>
  );
};
