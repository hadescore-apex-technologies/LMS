import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import { 
  Users, BookOpen, Layers, FileCheck, Award, 
  AlertTriangle, RefreshCw, Plus, TrendingUp, 
  ArrowRight, Clock, BookOpenCheck 
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
  const { data: stats, isLoading, refetch } = useQuery<StaffStats>({
    queryKey: ['staff-dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('analytics/dashboard/');
      return res.data;
    }
  });

  const handleSync = () => {
    toast.promise(
      refetch(),
      {
        loading: 'Syncing dashboard insights...',
        success: 'Operational metrics updated!',
        error: 'Failed to sync insights.',
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-muted/40 animate-pulse rounded-2xl border border-border/30" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 h-80 bg-muted/40 animate-pulse rounded-2xl border border-border/30" />
          <div className="h-80 bg-muted/40 animate-pulse rounded-2xl border border-border/30" />
        </div>
      </div>
    );
  }

  // Student Growth data from API
  const studentGrowth = stats?.student_growth || [
    { week: 'W1', count: 0 },
    { week: 'W2', count: 0 },
    { week: 'W3', count: 0 },
    { week: 'W4', count: 0 },
    { week: 'W5', count: 0 },
  ];

  const maxGrowth = Math.max(...studentGrowth.map(d => d.count), 1);

  return (
    <div className="space-y-8 text-xs">
      {/* Welcome & Sync */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Operational Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure student enrollments, course architectures, and live class webinars.</p>
        </div>
        <button 
          onClick={handleSync}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl transition-all shadow-md shadow-primary/10 hover:brightness-110 active:scale-95"
        >
          <RefreshCw size={12} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Aggregate Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Enrolled', value: `${stats?.total_students || 0}`, desc: `${stats?.active_students || 0} active student accounts`, icon: Users, color: 'text-blue-500 bg-blue-500/10' },
          { label: 'Training Domains', value: `${stats?.categories_count || 0}`, desc: 'Course categories', icon: Layers, color: 'text-indigo-500 bg-indigo-500/10' },
          { label: 'Active Curriculums', value: `${stats?.courses_count || 0}`, desc: 'Assigned courses list', icon: BookOpen, color: 'text-teal-500 bg-teal-500/10' },
          { label: 'Pending Evaluations', value: `${stats?.pending_assignments || 0}`, desc: 'Awaiting homework review', icon: FileCheck, color: 'text-amber-500 bg-amber-500/10' }
        ].map((stat, i) => (
          <div key={i} className="p-5 glass-card rounded-2xl flex items-center justify-between hover:shadow-md hover:border-primary/20 transition-all duration-300 group cursor-default">
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">{stat.label}</span>
              <span className="text-2xl font-bold tracking-tight text-foreground block">{stat.value}</span>
              <span className="text-[10px] text-muted-foreground/80 block font-medium">{stat.desc}</span>
            </div>
            <div className={`p-3 rounded-xl ${stat.color} group-hover:scale-105 transition-transform duration-300 shadow-sm`}><stat.icon size={18} /></div>
          </div>
        ))}
      </div>

      {/* Middle Grid: Growth Trend & Expiry Log */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Weekly Student Growth Chart */}
        <div className="lg:col-span-2 p-6 glass-card rounded-2xl border border-border/50 flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div className="space-y-0.5">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <TrendingUp size={16} className="text-primary" />
                <span>Weekly Student Registration Growth</span>
              </h3>
              <p className="text-[10px] text-muted-foreground font-medium">Visualizing student enrollments over the past 5 weeks.</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-primary/15 border border-primary/25 text-primary">Cumulative: {stats?.total_students || 0}</span>
          </div>

          {/* Pure HTML/Tailwind Growth Chart */}
          <div className="h-44 flex items-end justify-between px-2 pt-4">
            {studentGrowth.map((d, idx) => {
              const heightPct = (d.count / maxGrowth) * 100;
              return (
                <div key={idx} className="flex flex-col items-center gap-2 group w-full">
                  <div className="text-[10px] font-bold text-foreground font-mono opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/5 shadow-md -translate-y-1">
                    {d.count}
                  </div>
                  <div className="w-8 sm:w-10 bg-muted/30 rounded-t-lg overflow-hidden h-32 relative">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPct}%` }}
                      transition={{ duration: 1, delay: idx * 0.05 }}
                      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary to-accent rounded-t-lg group-hover:brightness-110 transition-all"
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-semibold">{d.week}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Approaching Expiry Alerts */}
        <div className="p-6 glass-card rounded-2xl border border-border/50 flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-2 border-b border-border/50 pb-3">
            <AlertTriangle className="text-amber-500 animate-pulse" size={16} />
            <h3 className="font-bold text-sm text-foreground">Approaching Expirations</h3>
          </div>

          <div className="flex-1 max-h-48 overflow-y-auto pr-1 space-y-2.5">
            {(stats?.upcoming_expiry_students ?? []).length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic text-center py-6">No students approaching registration expiration.</p>
            ) : (
              stats?.upcoming_expiry_students.map((std, i) => (
                <div key={i} className="p-2.5 bg-muted/30 border border-border rounded-xl flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors">
                  <div className="min-w-0">
                    <h5 className="font-bold text-foreground/90 truncate">{std.name}</h5>
                    <span className="text-[10px] text-muted-foreground truncate block">{std.email}</span>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 select-all shrink-0">
                    {new Date(std.end_date).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="space-y-4">
        <h3 className="font-bold text-base flex items-center gap-2 text-foreground/90">
          <Plus className="text-primary" size={16} />
          <span>Operational Quick Menu</span>
        </h3>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: 'Enrol Student', desc: 'Register student credentials', target: 'students', color: 'border-blue-500/20 hover:border-blue-500', icon: Users },
            { title: 'Create Course', desc: 'Establish training curriculum outlines', target: 'courses', color: 'border-teal-500/20 hover:border-teal-500', icon: BookOpenCheck },
            { title: 'Schedule Seminar', desc: 'Set up Zoom/Teams rooms', target: 'live', color: 'border-amber-500/20 hover:border-amber-500', icon: Clock },
            { title: 'Issue Certificate', desc: 'Deliver verifiable training credentials', target: 'certificates', color: 'border-emerald-500/20 hover:border-emerald-500', icon: Award }
          ].map((act, i) => (
            <button
              key={i}
              onClick={() => onNavigate(act.target)}
              className={`p-5 glass-card text-left rounded-2xl border ${act.color} flex flex-col justify-between items-start gap-4 hover:-translate-y-1 transition-all duration-300 group`}
            >
              <div className="p-3 bg-muted/30 rounded-xl text-foreground/80 group-hover:scale-105 transition-transform"><act.icon size={16} /></div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{act.title}</h4>
                <p className="text-[10px] text-muted-foreground leading-normal">{act.desc}</p>
              </div>
              <span className="text-[10px] font-bold text-primary flex items-center gap-0.5 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Configure</span>
                <ArrowRight size={10} />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
