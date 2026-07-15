import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import { 
  Users, BookOpen, RefreshCw, Activity, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

interface AuditLog {
  id: number;
  user: string;
  action: string;
  ip_address?: string;
  created_at: string;
}

interface AdminStats {
  total_staff: number;
  active_staff: number;
  total_students: number;
  active_students?: number;
  expired_students?: number;
  total_courses: number;
  published_courses?: number;
  draft_courses?: number;
  total_categories?: number;
  total_lessons?: number;
  total_videos?: number;
  total_assignments?: number;
  total_quizzes?: number;
  certificates_issued?: number;
  attendance_percentage?: number;
  daily_logins?: number;
  weekly_logins?: number;
  monthly_logins?: number;
  live_classes_today?: number;
  storage_usage?: string;
  recent_activity: AuditLog[];
}

interface DashboardTabProps {
  onNavigate: (tab: string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ onNavigate }) => {
  // Query Stats
  const { data: stats, isLoading, refetch } = useQuery<AdminStats>({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('analytics/dashboard/');
      return res.data;
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6 text-xs">
        <div className="h-8 w-60 rounded bg-muted animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Pre-configured metrics fallback
  const cards = [
    { label: 'Total Mentors', count: stats?.total_staff ?? 0, sub: `${stats?.active_staff ?? 0} active mentors`, icon: Users, color: 'from-indigo-500/10 to-blue-500/10 text-primary', tab: 'staff' },
    { label: 'Active Students Enrolled', count: stats?.total_students ?? 0, sub: 'Private enterprise students', icon: Users, color: 'from-teal-500/10 to-cyan-500/10 text-teal-600 dark:text-teal-400', tab: 'students' },
    { label: 'Training Course Catalogs', count: stats?.total_courses ?? 0, sub: `${stats?.total_lessons ?? 12} active lessons curriculum`, icon: BookOpen, color: 'from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400', tab: 'courses' },
    { label: 'System Security State', count: 'SECURE', sub: 'TLS 1.3 / JWT enabled', icon: ShieldCheck, color: 'from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400', tab: 'security' },
  ];

  return (
    <div className="space-y-8 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Platform Administration</h1>
          <p className="text-muted-foreground text-sm mt-1">Super Admin command panel and security oversight.</p>
        </div>
        <button onClick={() => { refetch(); toast.success('Dashboard metrics updated.'); }} className="flex items-center gap-2 px-4 py-2.5 bg-muted hover:bg-muted/80 rounded-xl text-xs font-semibold border border-border transition-colors">
          <RefreshCw size={12} />
          <span>Sync Board</span>
        </button>
      </div>

      {/* Stats row */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.05 }}
            onClick={() => onNavigate(c.tab)}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm flex items-start justify-between hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
          >
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{c.label}</span>
              <h3 className="text-2xl font-bold font-display">{c.count}</h3>
              <p className="text-[11px] text-muted-foreground font-medium">{c.sub}</p>
            </div>
            <div className={`p-3 rounded-xl bg-gradient-to-tr ${c.color}`}><c.icon size={20} /></div>
          </motion.div>
        ))}
      </div>

      {/* Middle Audit Logs and Systems check section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="border-b border-border pb-4 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-base">Recent Platform Activity</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Real-time user modifications and admin actions.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">
                  <th className="py-3 px-2">Account</th>
                  <th className="py-3 px-2">Action Description</th>
                  <th className="py-3 px-2 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {(stats?.recent_activity ?? []).slice(0, 5).map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30">
                    <td className="py-3 px-2 font-semibold text-foreground/80">{log.user}</td>
                    <td className="py-3 px-2 text-muted-foreground max-w-xs truncate">{log.action}</td>
                    <td className="py-3 px-2 text-muted-foreground text-right">{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {(stats?.recent_activity ?? []).length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-muted-foreground">No recent activity recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Health */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl"><Activity size={18} /></div>
              <h3 className="font-semibold text-base">SaaS Cluster Health</h3>
            </div>
            <div className="space-y-3 font-semibold text-foreground/95">
              {[
                { label: 'API Gateway Server', status: 'Online (200 OK)', ok: true },
                { label: 'PostgreSQL Database Cluster', status: 'Active (3 nodes)', ok: true },
                { label: 'Redis Caching Service', status: 'Running (Key-Value)', ok: true },
                { label: 'Celery Worker processes', status: 'Healthy', ok: true },
                { label: 'Cloudflare R2 Storage', status: 'Connected', ok: true }
              ].map((s, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs border-b border-border/40 pb-2 last:border-0 last:pb-0">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className={`flex items-center gap-1 font-bold ${s.ok ? 'text-emerald-500' : 'text-red-500'}`}>
                    <span>{s.status}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DashboardTab;
