import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../../services/api';
import { 
  BookOpen, Award, FileCheck, RefreshCw, Calendar, Clock, 
  TrendingUp, Compass, ArrowRight, Zap, Target, BookOpenCheck 
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DashboardStats {
  assigned_courses_count: number;
  upcoming_live_classes: number;
  assignments_submitted: number;
  assignments_graded: number;
  certificates_count: number;
  study_hours?: { day: string; hours: number }[];
  avg_hours?: number;
}

interface UserProfile {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone?: string;
  profile_photo?: string;
  course_duration?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  categories: string[];
  attendance_marked?: boolean;
}

interface Achievements {
  streak: number;
  lessons_completed: number;
  quizzes_passed: number;
  assignments_submitted: number;
  badges: Array<{
    id: string;
    title: string;
    description: string;
    unlocked: boolean;
    unlocked_at: string | null;
  }>;
}

interface DashboardTabProps {
  onNavigate: (tab: string) => void;
  onOpenCourse: (courseId: number) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ onNavigate }) => {
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('analytics/dashboard/');
      return res.data;
    }
  });

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const res = await api.get('users/profile/');
      return res.data;
    }
  });

  const { data: achievements } = useQuery<Achievements>({
    queryKey: ['user-achievements'],
    queryFn: async () => {
      const res = await api.get('users/profile/achievements/');
      return res.data;
    }
  });

  useEffect(() => {
    if (profile?.attendance_marked) {
      toast.success('Daily Attendance Marked: Present', { id: 'daily-attendance' });
    }
  }, [profile]);

  const handleSync = async () => {
    toast.promise(
      refetchStats(),
      {
        loading: 'Syncing dashboard insights...',
        success: 'Insights refreshed successfully!',
        error: 'Failed to sync insights.',
      }
    );
  };

  const isLoading = statsLoading || profileLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-32 w-full bg-muted/40 animate-pulse rounded-2xl border border-border/30" />
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

  // Weekly study hours data from API
  const studyHours = stats?.study_hours || [
    { day: 'Mon', hours: 0.0 },
    { day: 'Tue', hours: 0.0 },
    { day: 'Wed', hours: 0.0 },
    { day: 'Thu', hours: 0.0 },
    { day: 'Fri', hours: 0.0 },
    { day: 'Sat', hours: 0.0 },
    { day: 'Sun', hours: 0.0 },
  ];

  const maxHours = Math.max(...studyHours.map(d => d.hours), 1.0);

  return (
    <div className="space-y-8">
      {/* Welcome Card Banner */}
      <div className="relative overflow-hidden glass-panel bg-gradient-to-r from-primary/10 via-primary/5 to-card/50 p-6 md:p-8 rounded-2xl border border-primary/10 shadow-sm">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-accent/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 z-10">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-primary-foreground font-display font-extrabold text-xl shadow-lg shadow-primary/20">
                {profile?.first_name?.charAt(0) || 'S'}
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-primary bg-clip-text text-transparent">
                  Welcome back, {profile?.first_name || 'Scholar'}!
                </h1>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Apex Academic Portal</p>
              </div>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xl">
              Track your corporate domain learning paths, submit checkpoints, complete practical assignments, and earn certifications.
            </p>
            {profile?.categories && profile.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {profile.categories.map((cat: string) => (
                  <span key={cat} className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors">
                    🎓 Domain: {cat}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          <button 
            onClick={handleSync}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:brightness-110 shadow-lg shadow-primary/10 hover:shadow-primary/20 border border-transparent text-xs font-semibold rounded-xl transition-all duration-300 transform active:scale-95 shrink-0"
          >
            <RefreshCw size={12} />
            <span>Sync Dashboard</span>
          </button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Assigned Courses', value: `${stats?.assigned_courses_count || 0}`, desc: 'Active curriculums', icon: BookOpen, color: 'text-blue-500 bg-blue-500/10' },
          { label: 'Live Classes Today', value: `${stats?.upcoming_live_classes || 0}`, desc: 'Webinars & Coding rooms', icon: Calendar, color: 'text-amber-500 bg-amber-500/10' },
          { label: 'Assignments Submitted', value: `${stats?.assignments_submitted || 0}`, desc: 'Deliverables pushed', icon: FileCheck, color: 'text-emerald-500 bg-emerald-500/10' },
          { label: 'Certificates Earned', value: `${stats?.certificates_count || 0}`, desc: 'Verifiable credentials', icon: Award, color: 'text-indigo-500 bg-indigo-500/10' }
        ].map((stat, i) => (
          <div key={i} className="p-5 glass-card rounded-2xl flex items-center justify-between hover:shadow-md hover:border-primary/20 transition-all duration-300 group cursor-default">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">{stat.label}</span>
              <span className="text-2xl font-bold tracking-tight text-foreground block">{stat.value}</span>
              <span className="text-[10px] text-muted-foreground/80 block font-medium">{stat.desc}</span>
            </div>
            <div className={`p-3 rounded-xl ${stat.color} group-hover:scale-105 transition-transform duration-300 shadow-sm`}><stat.icon size={18} /></div>
          </div>
        ))}
      </div>

      {/* Center Layout: Analytics and Side Widget */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Study Hours Trend - Interactive SVG Chart */}
        <div className="lg:col-span-2 p-6 glass-card rounded-2xl border border-border/50 flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div className="space-y-0.5">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <TrendingUp size={16} className="text-primary" />
                <span>Weekly Study Hours Trend</span>
              </h3>
              <p className="text-[10px] text-muted-foreground">Track learning persistence and efforts daily.</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-primary/15 border border-primary/25 text-primary">Avg: {stats?.avg_hours || 0.0} hrs</span>
          </div>

          {/* Bar Chart Container */}
          <div className="h-44 flex items-end justify-between px-2 pt-4">
            {studyHours.map((d, idx) => {
              const heightPct = (d.hours / maxHours) * 100;
              return (
                <div key={idx} className="flex flex-col items-center gap-2 group w-full">
                  <div className="text-[10px] font-bold text-foreground font-mono opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/5 shadow-md -translate-y-1">
                    {d.hours}h
                  </div>
                  <div className="w-8 sm:w-10 bg-muted/30 rounded-t-lg overflow-hidden h-32 relative">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPct}%` }}
                      transition={{ duration: 1, delay: idx * 0.05 }}
                      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary to-accent rounded-t-lg group-hover:brightness-110 transition-all"
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-semibold">{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Learning Streak & Streak Progress */}
        <div className="p-6 glass-card rounded-2xl border border-border/50 flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-2 border-b border-border/50 pb-3">
            <Zap className="text-orange-500 fill-orange-500" size={16} />
            <h3 className="font-bold text-sm text-foreground">Learning Persistence</h3>
          </div>

          <div className="text-center py-4 space-y-2">
            <div className="text-5xl font-extrabold text-orange-500 font-mono flex items-center justify-center gap-1.5 animate-bounce">
              <span>{achievements?.streak || 0}</span>
              <span className="text-xl">Days</span>
            </div>
            <p className="text-xs text-muted-foreground">Continuous learning streak! Maintain daily logins.</p>
          </div>

          <div className="p-3 bg-muted/20 border border-border/60 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between items-center text-[10px] text-muted-foreground font-bold">
              <span>Streak Level: {achievements?.streak && achievements.streak >= 3 ? 'Scholar' : 'Novice'}</span>
              <span>Next Goal: 7 Days</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border/30">
              <div 
                className="h-full bg-orange-500 transition-all duration-500" 
                style={{ width: `${Math.min(((achievements?.streak || 0) / 7) * 100, 100)}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="space-y-4">
        <h3 className="font-bold text-base flex items-center gap-2 text-foreground/90">
          <Target className="text-primary" size={16} />
          <span>Quick Actions Menu</span>
        </h3>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: 'Resume Lecture', desc: 'Pick up last active lesson', target: 'courses', color: 'border-blue-500/20 hover:border-blue-500', icon: BookOpenCheck },
            { title: 'Live Rooms', desc: 'Join online streams', target: 'live', color: 'border-amber-500/20 hover:border-amber-500', icon: Clock },
            { title: 'Homework Logs', desc: 'Review submission feedback', target: 'assignments', color: 'border-emerald-500/20 hover:border-emerald-500', icon: FileCheck },
            { title: 'Discussion Boards', desc: 'Post issues and help peers', target: 'forum', color: 'border-purple-500/20 hover:border-purple-500', icon: Compass }
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
                <span>Navigate</span>
                <ArrowRight size={10} />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
