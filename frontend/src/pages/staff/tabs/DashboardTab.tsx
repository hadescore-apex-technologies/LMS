import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import api from '../../../services/api';
import { 
  Users, BookOpen, Layers, FileCheck, Award, 
  RefreshCw, Plus, TrendingUp, 
  Clock, BookOpenCheck, Video, Calendar, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface StaffStats {
  total_students: number;
  active_students: number;
  expired_students: number;
  categories_count: number;
  courses_count: number;
  pending_assignments: number;
  today_live_classes: number;
  total_live_classes?: number;
  upcoming_expiry_students: { email: string; name: string; end_date: string }[];
  student_growth?: { week: string; count: number }[];
}

interface DashboardTabProps {
  onNavigate: (tab: string) => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const color = payload[0].stroke && payload[0].stroke !== 'none' ? payload[0].stroke : payload[0].fill;
    return (
      <div className="bg-card border border-border p-3 rounded-lg shadow-lg flex flex-col gap-1.5 z-50">
        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</span>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-bold text-foreground">
            {payload[0].value} <span className="text-[10px] text-muted-foreground font-medium uppercase">{payload[0].name}</span>
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export const DashboardTab: React.FC<DashboardTabProps> = ({ onNavigate }) => {
  const { user, accessToken } = useSelector((state: RootState) => state.auth);
  const liveMode = true; // Forced to true for Staff

  const { data: stats, isLoading, refetch } = useQuery<StaffStats>({
    queryKey: ['staff-dashboard-stats', liveMode],
    enabled: Boolean(accessToken && user),
    placeholderData: (prev) => prev,
    refetchInterval: 8000,
    queryFn: async () => {
      const res = await api.get(`analytics/dashboard/?live_mode=${liveMode}`);
      return res.data;
    },
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

  const studentGrowth = (stats?.student_growth || [
    { week: 'Week 1', count: 0 },
    { week: 'Week 2', count: 0 },
    { week: 'Week 3', count: 0 },
    { week: 'Week 4', count: 0 },
    { week: 'Week 5', count: 0 },
  ]).map(d => ({
    ...d,
    week: d.week.replace(/^W(\d+)$/, 'Week $1')
  }));

  const cards = [
    { 
      label: 'Live Mentees', 
      count: stats?.total_students ?? 0, 
      sub: `${stats?.active_students || 0} active`, 
      icon: Users, 
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      tab: 'students'
    },
    { 
      label: 'Mentoring Domains', 
      count: stats?.categories_count ?? 0, 
      sub: 'Assigned domains', 
      icon: Layers, 
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      tab: 'recordings'
    },
    { 
      label: 'Live Classes', 
      count: stats?.total_live_classes ?? stats?.today_live_classes ?? 0, 
      sub: `${stats?.today_live_classes || 0} scheduled today`, 
      icon: Video, 
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      tab: 'live'
    },
    { 
      label: 'Pending Reviews', 
      count: stats?.pending_assignments ?? 0, 
      sub: 'Awaiting evaluation', 
      icon: FileCheck, 
      iconBg: 'bg-rose-100 dark:bg-rose-900/30',
      iconColor: 'text-rose-600 dark:text-rose-400',
      tab: 'live-assignments'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="space-y-4">
      {/* Welcome & Sync Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <span>Welcome back, {user?.first_name || 'Instructor'}</span>
            <span className="inline-block animate-bounce">👋</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Monitor your live cohorts, evaluate homework submissions, and coordinate webinar schedules.
          </p>
        </div>
        <button 
          onClick={handleSync}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground font-semibold rounded-xl text-xs transition-all shadow-sm hover:brightness-110 active:scale-95 shrink-0 cursor-pointer"
        >
          <RefreshCw size={12} className="animate-spin-slow" />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Aggregate Cards Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4"
      >
        {cards.map((c, i) => (
          <motion.div 
            variants={itemVariants}
            key={i} 
            onClick={() => onNavigate(c.tab)}
            className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md hover:border-border/80 transition-all cursor-pointer flex flex-col justify-between h-[96px]"
          >
            <div className="flex justify-between items-start mb-1">
              <div className="flex items-center gap-2.5">
                <c.icon size={18} className={`${c.iconColor} shrink-0`} />
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  {c.label}
                </span>
              </div>
              <ChevronRight size={14} className="text-muted-foreground/30 mt-1" />
            </div>

            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-bold text-foreground leading-none">
                {c.count}
              </h3>
              <p className="text-[10px] text-muted-foreground font-medium">
                {c.sub}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Middle Grid: Growth Trend & Quick Menu */}
      <div className="grid gap-4 lg:grid-cols-3 -mt-[5px]">
        {/* Weekly Student Growth Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card shadow-sm p-4 flex flex-col relative overflow-hidden h-[466px]">
          {/* Card Header */}
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <TrendingUp size={16} className="text-muted-foreground" />
                <span>Weekly Student Growth Trend</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                New student registrations tracked across the past 5 weeks
              </p>
            </div>
          </div>

          {/* Recharts Area Chart */}
          <div className="h-[386px] w-full">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <RefreshCw className="animate-spin text-muted-foreground" size={24} />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={studentGrowth} margin={{ top: 10, right: 10, left: -25, bottom: 8 }}>
                  <defs>
                    <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                  <XAxis 
                    dataKey="week" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    dy={8}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    allowDecimals={false}
                    dx={-10}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.15 }} />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    name="Mentees Enrolled"
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#growthGrad)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Operational Quick Menu */}
        <div className="rounded-2xl border border-border bg-card shadow-sm p-4 flex flex-col h-[466px]">
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-border flex-none">
            <Plus size={16} className="text-muted-foreground" />
            <div>
              <h3 className="font-bold text-sm text-foreground">Operational Quick Menu</h3>
              <p className="text-[10px] text-muted-foreground">Quick access actions</p>
            </div>
          </div>

          <div className="flex flex-col gap-3.5 flex-1 justify-center overflow-y-auto scrollbar-none">
            {[
              { title: 'Enrol Student', desc: 'Register student credentials', target: 'students', icon: Users, iconBg: 'bg-indigo-100 dark:bg-indigo-900/30', iconColor: 'text-indigo-600 dark:text-indigo-400' },
              { title: 'Upload Recording', desc: 'Manage session playbacks', target: 'recordings', icon: Video, iconBg: 'bg-teal-100 dark:bg-teal-900/30', iconColor: 'text-teal-600 dark:text-teal-400' },
              { title: 'Schedule Seminar', desc: 'Set up Zoom/Teams rooms', target: 'live', icon: Clock, iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
              { title: 'Mark Attendance', desc: 'Track student presence', target: 'attendance', icon: Calendar, iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400' }
            ].map((act, i) => (
              <button
                key={i}
                onClick={() => onNavigate(act.target)}
                className="p-3.5 rounded-xl border border-border bg-background hover:bg-muted/50 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-lg shrink-0 ${act.iconBg} ${act.iconColor}`}>
                    <act.icon size={15} />
                  </div>
                  <div className="text-left min-w-0">
                    <h4 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">{act.title}</h4>
                    <p className="text-[10px] text-muted-foreground truncate">{act.desc}</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default DashboardTab;
