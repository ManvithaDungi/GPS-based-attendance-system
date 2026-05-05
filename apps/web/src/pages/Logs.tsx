import React, { useEffect, useState } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Fingerprint, 
  Cpu, 
  Globe,
  Navigation
} from 'lucide-react';
import api from '../lib/api';
import { NeumorphicCard } from '../components/common/NeumorphicCard';
import { cn } from '../lib/utils';

export const Logs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/fraud');
        const mappedLogs = res.data.data.map((log: any) => ({
          id: log.id,
          student: log.student?.name || 'Unknown',
          type: log.type,
          risk: log.riskLevel,
          details: log.details,
          timestamp: new Date(log.createdAt).toLocaleString(),
        }));
        setLogs(mappedLogs);
      } catch (err) {
        console.error('Error fetching logs', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'high': return 'text-danger bg-danger/10 border-danger/20';
      case 'medium': return 'text-warning bg-warning/10 border-warning/20';
      case 'low': return 'text-primary bg-primary/10 border-primary/20';
      default: return 'text-slate-500 bg-slate-100 border-slate-200';
    }
  };

  const getFraudIcon = (type: string) => {
    if (type.includes('Location')) return <Navigation className="w-4 h-4" />;
    if (type.includes('Device')) return <Cpu className="w-4 h-4" />;
    return <Fingerprint className="w-4 h-4" />;
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-1000">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 font-headline tracking-tight">Security & Fraud Logs</h2>
          <p className="text-slate-500 mt-2 font-medium">Identify and review anomalies in attendance verification patterns.</p>
        </div>
        <div className="flex gap-4">
          <div className="px-6 py-3 rounded-2xl bg-danger/10 text-danger border border-danger/20 flex items-center gap-3">
             <AlertTriangle className="w-5 h-5" />
             <div>
                <p className="text-[10px] font-black uppercase leading-none">Critical Alerts</p>
                <p className="text-lg font-black leading-none mt-1">12 Pending</p>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
           <NeumorphicCard className="p-6">
              <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 font-headline">Advanced Search</h4>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" placeholder="Student ID or IP..." className="w-full bg-bg-light dark:bg-bg-dark neumorphic-inset border-none rounded-xl pl-12 pr-4 py-3 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <select className="bg-bg-light dark:bg-bg-dark neumorphic-inset border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-500 focus:ring-0">
                      <option>All Risk Levels</option>
                      <option>High</option>
                      <option>Medium</option>
                   </select>
                   <select className="bg-bg-light dark:bg-bg-dark neumorphic-inset border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-500 focus:ring-0">
                      <option>All Types</option>
                      <option>Mock Location</option>
                      <option>Rooted Device</option>
                   </select>
                </div>
                <button className="w-full py-4 bg-slate-800 dark:bg-slate-100 dark:text-slate-900 text-white font-black rounded-xl text-xs uppercase tracking-widest hover:opacity-90 transition-all">
                   Filter Events
                </button>
              </div>
           </NeumorphicCard>

           <NeumorphicCard className="p-6 bg-slate-900 text-white">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                   <ShieldAlert className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold">Auto-Protect</h4>
                  <p className="text-xs text-slate-400">Threat mitigation active</p>
                </div>
              </div>
              <div className="space-y-3">
                 <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Suspicious IPs blocked</span>
                    <span className="font-bold">428</span>
                 </div>
                 <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Emulator detections</span>
                    <span className="font-bold">15</span>
                 </div>
                 <div className="w-full h-8 bg-white/5 rounded-lg mt-4 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">View Security Rules</span>
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
                ) : logs.map((log) => (
                  <div key={log.id} className="transition-all">
                    <div 
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                      className={cn(
                        "p-6 flex items-center justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-all",
                        expandedId === log.id && "bg-black/5 dark:bg-white/5"
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
                         <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border", getRiskColor(log.risk))}>
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
                            <div className="mt-6 flex gap-4">
                               <button className="flex-1 py-3 bg-red-500/10 text-danger border border-red-500/20 rounded-xl text-xs font-bold hover:bg-danger hover:text-white transition-all">Flag User Account</button>
                               <button className="flex-1 py-3 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:neumorphic-raised transition-all">Dismiss Warning</button>
                            </div>
                         </div>
                      </div>
                    )}
                  </div>
                ))}
             </div>
             <div className="p-6 bg-slate-50 dark:bg-bg-dark/50 text-center">
                <button className="text-primary font-bold text-xs uppercase tracking-widest hover:underline">Download full security audit (.pdf)</button>
             </div>
          </NeumorphicCard>
        </div>
      </div>
    </div>
  );
};

// Internal icon import fix

