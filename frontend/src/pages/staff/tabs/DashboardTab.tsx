import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import { 
  Users, BookOpen, Layers, FileCheck, Award, 
  AlertTriangle, RefreshCw, Plus, TrendingUp, 
  Clock, BookOpenCheck, Video, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

interface StaffStats {
  total_students: number;
  active_students: number;
  expired_students: number;
  categories_count: number;
  courses_count: number;
  pending_assignments: number;
  today_live_classes: number;
  upcoming_expiry_students: { email: string; name: string; end_date: string }[];
  student_growth?: { week: string; count: number }[];
}

interface DashboardTabProps {
  onNavigate: (tab: string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ onNavigate }) => {
  const liveMode = true; // Forced to true for Staff

  const { data: stats, isLoading, refetch } = useQuery<StaffStats>({
    queryKey: ['staff-dashboard-stats', liveMode],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const res = await api.get(`analytics/dashboard/?live_mode=${liveMode}`);
      return res.data;
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  const handleSync = () => {
    toast.promise(
      refetch(),
      {
        loading: 'Syncing metrics...',
        success: 'Metrics updated!',
        error: 'Failed to sync.',
      }
    );
  };

  const studentGrowth = stats?.student_growth || [
    { week: 'W1', count: 0 },
    { week: 'W2', count: 0 },
    { week: 'W3', count: 0 },
    { week: 'W4', count: 0 },
    { week: 'W5', count: 0 },
  ];

  const maxGrowth = Math.max(...studentGrowth.map(d => d.count), 5);

  return (
    <div className="space-y-3.5 text-xs">
      {/* Welcome & Sync */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight">{liveMode ? 'Live Class Mentoring Dashboard' : 'Operational Dashboard'}</h1>
          <p className="text-muted-foreground text-[11px] mt-0.5">{liveMode ? 'Monitor your live mentees and upcoming webinar sessions.' : 'Configure student enrollments, course architectures, and live class webinars.'}</p>
        </div>
        <button 
          onClick={handleSync}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground font-semibold rounded-xl text-xs transition-all shadow-sm hover:brightness-110 active:scale-95 shrink-0"
        >
          <RefreshCw size={12} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Aggregate Cards */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: liveMode ? 'Total Live Mentees' : 'Total Enrolled', value: `${stats?.total_students || 0}`, desc: `${stats?.active_students || 0} active accounts`, icon: Users, color: 'text-blue-500 bg-blue-500/10' },
          { label: liveMode ? 'Active Mentees' : 'Training Domains', value: liveMode ? `${stats?.active_students || 0}` : `${stats?.categories_count || 0}`, desc: liveMode ? 'Currently active' : 'Course categories', icon: liveMode ? BookOpenCheck : Layers, color: 'text-indigo-500 bg-indigo-500/10' },
          { label: liveMode ? "Today's Classes" : 'Active Curriculums', value: liveMode ? `${stats?.today_live_classes || 0}` : `${stats?.courses_count || 0}`, desc: liveMode ? 'Scheduled today' : 'Assigned courses', icon: liveMode ? Video : BookOpen, color: 'text-teal-500 bg-teal-500/10' },
          { label: 'Pending Evaluations', value: `${stats?.pending_assignments || 0}`, desc: 'Awaiting review', icon: FileCheck, color: 'text-amber-500 bg-amber-500/10' }
        ].map((stat, i) => (
          <div key={i} className="p-3.5 sm:p-4 glass-card rounded-2xl flex items-center justify-between hover:shadow-md border-l-4 border-l-cyan-500 transition-all cursor-default">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">{stat.label}</span>
              <span className="text-2xl sm:text-[1.65rem] font-black tracking-tight text-foreground block">{stat.value}</span>
              <span className="text-[10px] text-muted-foreground block font-medium">{stat.desc}</span>
            </div>
            <div className={`p-2.5 rounded-xl ${stat.color} shadow-sm`}><stat.icon size={18} /></div>
          </div>
        ))}
      </div>

      {/* Middle Grid: Growth Trend & Expiry Log */}
      <div className="grid gap-3.5 lg:grid-cols-3">
        {/* Weekly Student Growth Chart */}
        <div className="lg:col-span-2 p-5 glass-card rounded-3xl border border-indigo-500/20 flex flex-col justify-between space-y-4 shadow-[0_8px_32px_rgba(99,102,241,0.08)] relative overflow-hidden bg-gradient-to-b from-card/90 via-card/50 to-card/90 backdrop-blur-xl">
          {/* Futuristic ambient background glows */}
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gradient-to-br from-indigo-500/15 to-cyan-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

          {/* Card Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3.5 relative z-10">
            <div className="space-y-1">
              <h3 className="font-black text-sm sm:text-base text-foreground flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-cyan-400 text-white shadow-md shadow-indigo-500/25">
                  <TrendingUp size={16} />
                </div>
                <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
                  Weekly Student Enrollment & Activity
                </span>
              </h3>
              <p className="text-[11px] text-muted-foreground font-medium">New student registrations tracked across the past 5 weeks.</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-extrabold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>LIVE METRICS</span>
              </div>
              <span className="text-[10px] font-extrabold px-3 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 shadow-sm">
                Cumulative: {stats?.total_students || 0}
              </span>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 shadow-sm">
                Active: {stats?.active_students || 0}
              </span>
            </div>
          </div>

          {/* Bar Chart Visualizer */}
          <div className="space-y-3 relative z-10">
            <div className="h-44 flex items-end justify-between px-2 pt-6 gap-2 relative">
              {/* Subtle dotted grid */}
              <div className="absolute inset-0 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:18px_18px] opacity-[0.07] pointer-events-none rounded-xl" />

              {/* Y-axis guide lines */}
              {[0, 0.5, 1].map((ratio, i) => {
                const pct = ratio * 100;
                const label = Math.round(ratio * maxGrowth);
                return (
                  <div
                    key={i}
                    className="absolute left-0 right-0 flex items-center gap-1 pointer-events-none"
                    style={{ bottom: `calc(${pct}% + 24px)` }}
                  >
                    <span className="text-[9px] font-mono font-bold text-muted-foreground/60 w-6 text-right shrink-0">{label}</span>
                    <div className="flex-1 border-t border-dashed border-border/30" />
                  </div>
                );
              })}

              {studentGrowth.map((d: any, idx: number) => {
                const count = d.count;
                const hasCount = count > 0;
                const rawPct = maxGrowth > 0 ? (count / maxGrowth) * 100 : 0;
                const displayPct = hasCount ? rawPct : 5;
                const dayName = d.week;

                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5 group flex-1 relative z-10 h-full justify-end">
                    {/* Count badge — only show if > 0 */}
                    <div className="h-6 flex items-center justify-center">
                      {hasCount && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: idx * 0.06 }}
                          className="text-[10px] font-black font-mono px-2 py-0.5 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-md shadow-indigo-500/30"
                        >
                          {count}
                        </motion.div>
                      )}
                    </div>

                    {/* Bar */}
                    <div className="w-full max-w-[44px] bg-muted/20 rounded-2xl overflow-hidden relative border border-border/30 flex items-end p-1 shadow-inner group-hover:border-indigo-500/40 transition-colors" style={{ height: '7rem' }}>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${displayPct}%` }}
                        transition={{ duration: 0.7, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
                        className={`w-full rounded-xl relative transition-all duration-300 ${
                          hasCount
                            ? 'bg-gradient-to-t from-indigo-700 via-sky-500 to-cyan-400 shadow-[0_0_14px_rgba(99,102,241,0.5)] group-hover:brightness-110'
                            : 'bg-muted-foreground/10 group-hover:bg-indigo-500/20'
                        }`}
                      >
                        {/* Gloss cap */}
                        {hasCount && <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-b from-white/50 to-transparent rounded-t-xl" />}
                      </motion.div>
                    </div>

                    {/* Day label */}
                    <span className={`text-[10px] font-extrabold transition-colors ${
                      hasCount ? 'text-indigo-500 dark:text-indigo-400' : 'text-muted-foreground group-hover:text-foreground'
                    }`}>
                      {dayName}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Chart Footer — Stats & CTA */}
            <div className="pt-2 flex flex-wrap items-center justify-between px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-sky-500/5 to-cyan-500/10 border border-indigo-500/20 text-xs gap-3">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                {/* Legend dot */}
                <span className="font-semibold text-foreground/80 flex items-center gap-1.5 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 shadow shadow-indigo-500/40" />
                  Enrollment Trend
                </span>

                {/* Growth indicator */}
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 shrink-0">
                  <TrendingUp size={12} />
                  {studentGrowth.reduce((a, d) => a + d.count, 0)} this week
                </span>

                {/* Pulse live dot */}
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live
                </span>
              </div>

              {/* CTA — Enrol new student */}
              <button
                onClick={() => onNavigate('students')}
                className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-extrabold rounded-xl shadow-md shadow-indigo-500/20 flex items-center gap-1.5 shrink-0 transition-all hover:scale-105 active:scale-95 cursor-pointer text-xs"
              >
                <Plus size={12} />
                <span>Enrol Student</span>
              </button>
            </div>
          </div>
        </div>

        {/* Approaching Expiry Alerts */}
        <div className="p-3.5 sm:p-4 glass-card rounded-2xl border border-border/50 flex flex-col justify-between space-y-2.5">
          <div className="flex items-center gap-1.5 border-b border-border/50 pb-2.5">
            <AlertTriangle className="text-amber-500 animate-pulse" size={15} />
            <h3 className="font-bold text-xs sm:text-sm text-foreground">Approaching Expirations</h3>
          </div>

          <div className="flex-1 space-y-1.5 overflow-hidden">
            {(stats?.upcoming_expiry_students ?? []).length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic text-center py-6">No students approaching registration expiration.</p>
            ) : (
              stats?.upcoming_expiry_students.slice(0, 3).map((std, i) => (
                <div key={i} className="p-2 bg-muted/30 border border-border/60 rounded-xl flex items-center justify-between gap-2 hover:bg-muted/50 transition-colors">
                  <div className="min-w-0">
                    <h5 className="font-bold text-foreground/90 truncate text-[11px]">{std.name}</h5>
                    <span className="text-[9px] text-muted-foreground truncate block">{std.email}</span>
                  </div>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-500 shrink-0">
                    {new Date(std.end_date).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="space-y-2.5">
        <h3 className="font-bold text-xs sm:text-sm flex items-center gap-1.5 text-foreground/90">
          <Plus className="text-primary" size={15} />
          <span>Operational Quick Menu</span>
        </h3>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: 'Enrol Student', desc: 'Register student credentials', target: 'students', color: 'border-blue-500/20 hover:border-blue-500', icon: Users },
            { title: 'Create Course', desc: 'Establish curriculum outlines', target: 'courses', color: 'border-teal-500/20 hover:border-teal-500', icon: BookOpenCheck },
            { title: 'Schedule Seminar', desc: 'Set up Zoom/Teams rooms', target: 'live', color: 'border-amber-500/20 hover:border-amber-500', icon: Clock },
            { title: 'Issue Certificate', desc: 'Deliver verifiable credentials', target: 'certificates', color: 'border-emerald-500/20 hover:border-emerald-500', icon: Award }
          ].map((act, i) => (
            <button
              key={i}
              onClick={() => onNavigate(act.target)}
              className={`p-3.5 sm:p-4 glass-card text-left rounded-2xl border ${act.color} flex flex-col justify-between items-start gap-2 hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer h-22`}
            >
              <div className="p-2 bg-muted/40 rounded-lg text-foreground/80 group-hover:scale-105 transition-transform"><act.icon size={15} /></div>
              <div className="space-y-0.5">
                <h4 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">{act.title}</h4>
                <p className="text-[9.5px] text-muted-foreground leading-normal">{act.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
export default DashboardTab;
