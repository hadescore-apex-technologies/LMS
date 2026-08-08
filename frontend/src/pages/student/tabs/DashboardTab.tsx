import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../../services/api';
import { 
  BookOpen, Award, FileCheck, RefreshCw, Calendar, Clock, 
  TrendingUp, Compass, Zap, Target, BookOpenCheck, Video
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
  const liveMode = localStorage.getItem('studentLiveMode') === 'true';
  
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', liveMode],
    placeholderData: (prev) => prev,
    staleTime: 0,
    refetchOnMount: true,
    queryFn: async () => {
      const res = await api.get(`analytics/dashboard/?live_mode=${liveMode}`);
      return res.data;
    },
  });

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ['user-profile'],
    placeholderData: (prev) => prev,
    staleTime: 600000,
    queryFn: async () => {
      const res = await api.get('users/profile/');
      return res.data;
    },
  });

  const { data: achievements } = useQuery<Achievements>({
    queryKey: ['user-achievements', liveMode],
    placeholderData: (prev) => prev,
    staleTime: 0,
    refetchOnMount: true,
    queryFn: async () => {
      const res = await api.get('users/profile/achievements/');
      return res.data;
    },
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
        loading: 'Syncing...',
        success: 'Refreshed!',
        error: 'Failed to sync.',
      }
    );
  };

  const studyHours = stats?.study_hours || [
    { day: 'Mon', hours: 0.0 },
    { day: 'Tue', hours: 0.0 },
    { day: 'Wed', hours: 0.0 },
    { day: 'Thu', hours: 0.0 },
    { day: 'Fri', hours: 0.0 },
    { day: 'Sat', hours: 0.0 },
    { day: 'Sun', hours: 0.0 },
  ];

  const studyMinutes = studyHours.map((d: any) => ({
    day: d.day,
    minutes: typeof d.minutes === 'number' ? d.minutes : Math.round((d.hours || 0) * 60)
  }));

  const maxMinutes = Math.max(...studyMinutes.map(d => d.minutes), 120);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-2.5 text-xs">
      {/* Clean Welcome Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-none items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-sm"
      >
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
            {profile?.first_name?.charAt(0) || 'S'}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome back, {profile?.first_name || 'Student'}!
            </h1>
            <p className="text-muted-foreground text-xs font-medium mt-0.5 flex items-center gap-2">
              Academic Learning Portal 
              {profile?.categories && profile.categories.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-semibold text-muted-foreground border border-border">
                  Domain: {profile.categories.join(', ')}
                </span>
              )}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleSync}
          className="flex items-center gap-2 px-5 py-2.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw size={14} />
          <span>Sync Board</span>
        </button>
      </motion.div>

      {/* Quick Stats Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className={`grid flex-none gap-2.5 sm:grid-cols-2 ${liveMode ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}
      >
        {[
          { label: liveMode ? 'Live Videos' : 'Courses', value: `${stats?.assigned_courses_count || 0}`, desc: liveMode ? 'Recorded playbacks' : 'Enrolled curriculums', icon: liveMode ? Video : BookOpen, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: liveMode ? 'Live Sessions' : 'Live Q&A', value: `${stats?.upcoming_live_classes || 0}`, desc: liveMode ? 'Scheduled webinars' : 'Scheduled webinars', icon: Calendar, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: liveMode ? 'Submissions' : 'Assignments', value: `${stats?.assignments_submitted || 0}`, desc: liveMode ? 'Homework submitted' : 'Completed tasks', icon: FileCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          ...(!liveMode ? [{ label: 'Certificates', value: `${stats?.certificates_count || 0}`, desc: 'Verified credentials', icon: Award, color: 'text-indigo-500', bg: 'bg-indigo-500/10' }] : [])
        ].map((stat, i) => (
          <motion.div
            variants={itemVariants}
            key={i}
            className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md hover:border-border/80 transition-all cursor-pointer flex flex-col justify-between h-[96px]"
          >
            <div className="flex justify-between items-start mb-1">
              <div className="flex items-center gap-2.5">
                <stat.icon size={18} className={`${stat.color} shrink-0`} />
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  {stat.label}
                </span>
              </div>
            </div>

            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-bold text-foreground leading-none">
                {stat.value}
              </h3>
              <p className="text-[10px] text-muted-foreground font-medium">
                {stat.desc}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Center Layout: Analytics and Streak */}
      <motion.div variants={itemVariants} className="grid flex-1 min-h-0 gap-2.5 lg:grid-cols-3">
        {/* Study Hours Trend & Activity Visualizer */}
        <div className="lg:col-span-2 p-4 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between relative overflow-hidden h-full">
          {/* Card Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 relative z-10">
            <div>
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <TrendingUp size={16} className="text-muted-foreground" />
                <span>Weekly Study Hours Activity</span>
              </h3>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Daily learning duration logged across lectures & exercises.</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-primary/10 text-primary">
                Avg: {Math.round((stats?.avg_hours || 0.0) * 60)} mins/day
              </span>
              <span className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-muted text-muted-foreground">
                Active: {studyMinutes.filter(d => d.minutes > 0).length}/7 Days
              </span>
            </div>
          </div>

          {/* Bar Chart Visualizer */}
          <div className="flex-1 min-h-0 flex flex-col relative z-10">
            <div className="flex-1 flex items-end justify-between px-2 pt-4 gap-2 relative min-h-0">
              {/* Y-axis guide lines */}
              {[0, 0.5].map((ratio, i) => {
                const pct = ratio * 100;
                const label = Math.round(ratio * maxMinutes);
                return (
                  <div
                    key={i}
                    className="absolute left-0 right-0 flex items-center gap-1 pointer-events-none"
                    style={{ bottom: `calc(${pct}% + 24px)` }}
                  >
                    <span className="text-[9px] font-bold text-muted-foreground/60 w-7 text-right shrink-0">{label}m</span>
                    <div className="flex-1 border-t border-dashed border-border/50" />
                  </div>
                );
              })}

              {studyMinutes.map((d, idx) => {
                const hasMinutes = d.minutes > 0;
                const rawPct = maxMinutes > 0 ? (d.minutes / maxMinutes) * 100 : 0;
                const displayPct = hasMinutes ? rawPct : 5;

                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5 group flex-1 relative z-10 h-full justify-end">
                    {/* Minute badge */}
                    <div className="h-6 flex items-center justify-center">
                      {hasMinutes && (
                        <div className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-foreground">
                          {d.minutes}m
                        </div>
                      )}
                    </div>

                    {/* Bar */}
                    <div className="w-full max-w-[40px] bg-muted/50 rounded-t-sm overflow-hidden relative flex items-end justify-center" style={{ height: '7rem' }}>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${displayPct}%` }}
                        transition={{ duration: 0.7, delay: idx * 0.06 }}
                        className={`w-full relative transition-all duration-300 ${
                          hasMinutes ? 'bg-primary' : 'bg-transparent'
                        }`}
                      />
                    </div>

                    {/* Day label */}
                    <span className={`text-[10px] font-bold mt-1 ${
                      hasMinutes ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {d.day}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Bottom Callout Banner when study hours are low */}
            <div className="pt-3 flex flex-wrap items-center justify-between px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-xs gap-3 mt-3">
              <div className="flex items-center gap-2.5 text-foreground font-medium min-w-0 flex-1">
                <BookOpenCheck size={16} className="text-muted-foreground shrink-0" />
                <span className="truncate">
                  {studyMinutes.some(d => d.minutes > 0)
                    ? (liveMode ? 'Great momentum! Keep replaying class recordings and video sessions.' : 'Great momentum! Resume lecture videos to increase your weekly study minutes.')
                    : (liveMode ? 'No watch minutes logged today. Click below to watch recorded live classes.' : 'No study minutes logged today. Click below to start your active lesson track.')}
                </span>
              </div>
              <button 
                onClick={() => onNavigate('courses')}
                className="px-4 py-1.5 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:bg-primary/90 transition-colors shrink-0"
              >
                {liveMode ? 'Watch Recordings' : 'Study Now'}
              </button>
            </div>
          </div>
        </div>

        {/* Learning Streak */}
        <div className="p-4 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between space-y-2 h-full">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Zap className="text-amber-500" size={16} />
            <h3 className="font-bold text-sm text-foreground">Learning Streak</h3>
          </div>

          <div className="text-center py-2 space-y-1">
            <div className="text-4xl font-bold text-foreground flex items-center justify-center gap-2">
              <span>{achievements?.streak || 0}</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-2">Days</span>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">Continuous daily learning streak</p>
          </div>

          <div className="p-3 bg-muted/50 border border-border rounded-xl space-y-2 text-xs">
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span className="text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                Level: {achievements?.streak && achievements.streak >= 3 ? 'Scholar 🔥' : 'Novice ⭐'}
              </span>
              <span className="text-muted-foreground">Target: 7 Days</span>
            </div>
            <div className="h-2 w-full bg-border/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 transition-all duration-700" 
                style={{ width: `${Math.min(((achievements?.streak || 0) / 7) * 100, 100)}%` }} 
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Action Navigation Grid */}
      <div className="space-y-2 flex-none">
        <h3 className="font-bold text-[11px] sm:text-xs flex items-center gap-1.5 text-muted-foreground">
          <Target size={14} />
          <span>Quick Actions</span>
        </h3>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: liveMode ? 'Play Recordings' : 'Resume Lecture', desc: liveMode ? 'Watch missed class playbacks' : 'Pick up last active lesson', target: 'courses', icon: BookOpenCheck },
            { title: liveMode ? 'Live Sessions' : 'Q&A Streams', desc: liveMode ? 'Join scheduled webinars' : 'Join live doubt rooms', target: 'live', icon: Clock },
            { title: liveMode ? 'Submissions' : 'Homework Logs', desc: liveMode ? 'Review mentor feedback' : 'Review submission feedback', target: 'assignments', icon: FileCheck },
            { title: liveMode ? 'Live Q&A Forum' : 'Queries', desc: liveMode ? 'Discuss questions with mentors' : 'Ask questions and get help', target: 'forum', icon: Compass }
          ].map((act, i) => (
            <button
              key={i}
              onClick={() => onNavigate(act.target)}
              className="p-3 bg-card rounded-xl border border-border flex items-center gap-3 hover:border-primary/50 hover:bg-muted/30 transition-all text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <act.icon size={16} className="text-muted-foreground" />
              </div>
              <div>
                <h4 className="font-bold text-[11px] text-foreground">{act.title}</h4>
                <p className="text-[9px] text-muted-foreground mt-0.5">{act.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
export default DashboardTab;
