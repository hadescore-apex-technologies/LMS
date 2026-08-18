import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../../services/api';
import { 
  BookOpen, Radio, FileText, Award, 
  ArrowRight, Sparkles, ChevronDown, Layers, MessageSquare
} from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';

interface DashboardStats {
  assigned_courses_count: number;
  upcoming_live_classes: number;
  assignments_submitted: number;
  assignments_graded: number;
  certificates_count: number;
  mentee_queries_count?: number;
  study_hours?: { day: string; hours: number }[];
  avg_hours?: number;
}

interface CourseItem {
  id: number;
  title: string;
  category_name?: string;
  progress?: number;
  progress_percentage?: number;
  thumbnail?: string;
  total_lessons?: number;
  completed_lessons?: number;
}

interface DashboardTabProps {
  onNavigate: (tab: string) => void;
  onOpenCourse: (courseId: number) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ onNavigate, onOpenCourse }) => {
  const { user, accessToken } = useSelector((state: RootState) => state.auth);
  const isStudentLive = localStorage.getItem('studentLiveMode') === 'true';
  const liveMode = isStudentLive;
  const [activeTooltipIndex, setActiveTooltipIndex] = useState<number>(3); // Default to 17:00

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', liveMode],
    enabled: Boolean(accessToken && user),
    placeholderData: (prev) => prev,
    refetchInterval: accessToken ? 8000 : false,
    queryFn: async () => {
      const res = await api.get(`analytics/dashboard/?live_mode=${liveMode}`);
      return res.data;
    },
  });

  const { data: achievements } = useQuery<{ streak: number }>({
    queryKey: ['user-achievements', liveMode],
    enabled: Boolean(accessToken && user),
    placeholderData: (prev) => prev,
    staleTime: 10000,
    refetchInterval: 15000,
    queryFn: async () => {
      const res = await api.get('users/profile/achievements/');
      return res.data;
    },
  });

  const { data: courses = [] } = useQuery<CourseItem[]>({
    queryKey: ['enrolled-courses-preview', liveMode],
    enabled: Boolean(accessToken && user),
    placeholderData: (prev) => prev,
    refetchInterval: 10000,
    queryFn: async () => {
      const res = await api.get(`courses/list/?live_mode=${liveMode}`);
      return res.data;
    }
  });

  const { data: liveClasses = [] } = useQuery<any[]>({
    queryKey: ['live-classes-dashboard', liveMode],
    enabled: Boolean(accessToken && user),
    placeholderData: (prev) => prev,
    refetchInterval: 8000,
    queryFn: async () => {
      const res = await api.get(`courses/live/?live_mode=${liveMode}`);
      return res.data;
    }
  });

  const studentFullName = (user?.first_name || user?.last_name)
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
    : (user?.name || '');
  const studentName = studentFullName || user?.first_name || user?.name || user?.email?.split('@')[0] || 'Student';
  const streakDays = achievements?.streak || 14;

  const coursesCount = stats?.assigned_courses_count ?? (courses.length > 0 ? courses.length : 0);
  const liveCount = liveClasses.filter((l: any) => l.status === 'UPCOMING' || l.status === 'LIVE').length || (stats?.upcoming_live_classes ?? 0);
  const assignmentsPending = stats?.assignments_submitted ?? 0;
  const certificatesEarned = stats?.certificates_count ?? 0;

  // Next live class or first course track
  const nextLiveSession = liveClasses.find((lc: any) => lc.status === 'LIVE') || 
                          liveClasses.find((lc: any) => lc.status === 'UPCOMING') || 
                          liveClasses[0];

  // Active continue learning course
  const activeCourse = courses[0] || {
    id: 1,
    title: 'Live Mentoring Curriculum',
    category_name: 'Mentoring Track',
    progress_percentage: 0,
  };

  const activeCourseProgress = activeCourse.progress_percentage !== undefined 
    ? Math.round(activeCourse.progress_percentage)
    : (activeCourse.progress !== undefined ? Math.round(activeCourse.progress) : 0);

  // Daily study data (Hours of the day) for smooth curved SVG chart
  const dailyData = [
    { time: '08:00', hours: 0.75, label: '45m study', x: 40, y: 135 },
    { time: '11:00', hours: 1.5, label: '1h 30m study', x: 125, y: 95 },
    { time: '14:00', hours: 1.2, label: '1h 10m study', x: 210, y: 115 },
    { time: '17:00', hours: 2.8, label: '2h 45m study', x: 295, y: 60 },
    { time: '20:00', hours: 2.1, label: '2h 05m study', x: 380, y: 85 },
    { time: '23:00', hours: 1.0, label: '1h 00m study', x: 460, y: 125 },
  ];

  // SVG Spline Path connecting daily points
  const splinePath = "M 40 135 C 80 115, 95 95, 125 95 C 155 95, 180 115, 210 115 C 240 115, 265 60, 295 60 C 325 60, 350 85, 380 85 C 410 85, 435 125, 460 125";
  const splineArea = "M 40 135 C 80 115, 95 95, 125 95 C 155 95, 180 115, 210 115 C 240 115, 265 60, 295 60 C 325 60, 350 85, 380 85 C 410 85, 435 125, 460 125 L 460 170 L 40 170 Z";

  return (
    <div className="w-full space-y-3.5 animate-fade-in text-xs">
      {/* ── ROW 1: HERO WELCOME & CIRCULAR STREAK WIDGET ──────────────── */}
      <div className="grid gap-3.5 lg:grid-cols-12 items-stretch">
        
        {/* Welcome Card (8 Cols) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-8 rounded-3xl cyber-glass-card p-6 relative overflow-hidden flex flex-col justify-between min-h-[175px]"
        >
          {/* Ambient Glow */}
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-md space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Welcome back, {studentName}</span>
              <span className="text-2xl animate-bounce">👋</span>
            </h1>
            <p className="text-xs text-slate-300/90 leading-relaxed max-w-sm">
              {liveMode 
                ? 'Join interactive live class mentoring, review assignments, and access practical session replays.' 
                : 'Continue your learning journey and achieve your goals with Hadescore Apex & Technology.'}
            </p>
          </div>

          <div className="relative z-10 pt-4">
            <button
              onClick={() => onNavigate(liveMode ? 'live' : 'courses')}
              className="px-4 py-2 bg-slate-950/70 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 hover:text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95 cursor-pointer group"
            >
              {liveMode ? <Radio size={14} className="text-emerald-400 animate-pulse" /> : null}
              <span>{liveMode ? 'Join Live Mentoring' : 'Continue Learning'}</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* 3D Holographic Graduation Cap Graphic */}
          <div className="absolute right-4 sm:right-10 top-1/2 -translate-y-1/2 pointer-events-none select-none opacity-85 hover:opacity-100 transition-opacity">
            <div className="relative w-36 h-36 flex items-center justify-center">
              {/* Pulsing Neon Halo Rings */}
              <div className="absolute inset-0 rounded-full border border-emerald-400/30 animate-ping opacity-25" />
              <div className="absolute inset-3 rounded-full border border-emerald-400/50 shadow-[0_0_20px_#10b981] opacity-60" />
              <div className="absolute inset-8 rounded-full border border-teal-400/40 shadow-[0_0_15px_#14b8a6] opacity-40" />

              {/* Glowing SVG Cap Icon */}
              <svg viewBox="0 0 100 100" className="w-28 h-28 drop-shadow-[0_0_15px_rgba(16,185,129,0.9)]">
                {/* Cap diamond */}
                <polygon 
                  points="50,22 88,38 50,54 12,38" 
                  fill="url(#capGrad)" 
                  stroke="#34d399" 
                  strokeWidth="1.8" 
                />
                {/* Skullcap / base */}
                <path 
                  d="M26,45 L26,62 C26,72 74,72 74,62 L74,45" 
                  fill="none" 
                  stroke="#34d399" 
                  strokeWidth="2" 
                />
                {/* Tassel & Ribbon */}
                <path 
                  d="M50,38 L78,56 L78,74" 
                  fill="none" 
                  stroke="#34d399" 
                  strokeWidth="1.8" 
                  strokeDasharray="2,2"
                />
                <circle cx="78" cy="76" r="3" fill="#34d399" />
                
                {/* Gradient Definition */}
                <defs>
                  <linearGradient id="capGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#059669" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#0d9488" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#061a14" stopOpacity="0.9" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </motion.div>

        {/* Circular Radial Learning Streak Card (4 Cols) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-4 rounded-3xl cyber-glass-card p-5 flex flex-col items-center justify-center text-center relative overflow-hidden"
        >
          {/* Radial Ring Gauge */}
          <div className="relative w-24 h-24 mb-2 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              {/* Background Track */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="rgba(30, 41, 59, 0.6)"
                strokeWidth="7"
              />
              {/* Animated Glowing Progress Ring */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#10b981"
                strokeWidth="7"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 * (1 - Math.min(streakDays / 30, 1))}
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 8px #10b981)' }}
              />
            </svg>

            {/* Center Value */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black text-white leading-none tracking-tight">{streakDays}</span>
              <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider mt-0.5">days</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <h3 className="font-extrabold text-sm text-white">Learning Streak</h3>
            <p className="text-[11px] text-slate-400 max-w-[200px] leading-snug">
              Keep it up! You're building great momentum.
            </p>
          </div>
        </motion.div>
      </div>

      {/* ── ROW 2: GLOWING STAT METRICS CARDS ───────────────────────── */}
      <div className={`grid gap-3.5 grid-cols-2 lg:grid-cols-4`}>
        {/* Card 1: Courses / Live Videos */}
        <motion.div 
          whileHover={{ y: -2 }}
          onClick={() => onNavigate('courses')}
          className="rounded-3xl cyber-glass-card p-4 flex items-center gap-3.5 cursor-pointer group"
        >
          <div className="h-12 w-12 rounded-full border border-emerald-400/40 bg-emerald-950/40 text-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform shrink-0">
            <BookOpen size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block">{liveMode ? 'Live Videos' : 'Courses'}</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-white leading-none">{coursesCount}</span>
              <span className="text-[10px] text-slate-400 font-semibold">{liveMode ? 'Tracks' : 'In Progress'}</span>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Live Sessions */}
        <motion.div 
          whileHover={{ y: -2 }}
          onClick={() => onNavigate('live')}
          className="rounded-3xl cyber-glass-card p-4 flex items-center gap-3.5 cursor-pointer group"
        >
          <div className="h-12 w-12 rounded-full border border-emerald-400/40 bg-emerald-950/40 text-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform shrink-0">
            <Radio size={20} className={liveClasses.some((l: any) => l.status === 'LIVE') ? 'animate-pulse text-rose-400' : ''} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block">{liveMode ? 'Live Sessions' : 'Doubt Sessions'}</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-white leading-none">{liveCount}</span>
              <span className="text-[10px] text-slate-400 font-semibold">Scheduled</span>
            </div>
          </div>
        </motion.div>

        {/* Card 3: Assignments */}
        <motion.div 
          whileHover={{ y: -2 }}
          onClick={() => onNavigate('assignments')}
          className="rounded-3xl cyber-glass-card p-4 flex items-center gap-3.5 cursor-pointer group"
        >
          <div className="h-12 w-12 rounded-full border border-emerald-400/40 bg-emerald-950/40 text-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block">Assignments</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-white leading-none">{assignmentsPending}</span>
              <span className="text-[10px] text-slate-400 font-semibold">{liveMode ? 'Tasks' : 'Pending'}</span>
            </div>
          </div>
        </motion.div>

        {/* Card 4: Q&A Doubts (Live Mode) or Certificates (Course Mode) */}
        {liveMode ? (
          <motion.div 
            whileHover={{ y: -2 }}
            onClick={() => onNavigate('forum')}
            className="rounded-3xl cyber-glass-card p-4 flex items-center gap-3.5 cursor-pointer group"
          >
            <div className="h-12 w-12 rounded-full border border-emerald-400/40 bg-emerald-950/40 text-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform shrink-0">
              <MessageSquare size={20} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">Mentee Doubts</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-white leading-none">{stats?.mentee_queries_count ?? 0}</span>
                <span className="text-[10px] text-slate-400 font-semibold">Q&A Forum</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            whileHover={{ y: -2 }}
            onClick={() => onNavigate('certificates')}
            className="rounded-3xl cyber-glass-card p-4 flex items-center gap-3.5 cursor-pointer group"
          >
            <div className="h-12 w-12 rounded-full border border-emerald-400/40 bg-emerald-950/40 text-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform shrink-0">
              <Award size={20} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">Certificates</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-white leading-none">{certificatesEarned}</span>
                <span className="text-[10px] text-slate-400 font-semibold">Earned</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── ROW 3: DAILY STUDY ACTIVITY & CONTINUE LEARNING ───────────── */}
      <div className="grid gap-3.5 lg:grid-cols-12 items-stretch">
        
        {/* Daily Study Activity Spline Wave Graph (7-8 Cols) */}
        <div className="lg:col-span-7 rounded-3xl cyber-glass-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <h3 className="font-extrabold text-sm text-white tracking-wide">Daily Study Activity</h3>
            <span className="flex items-center gap-1 text-[11px] text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-xl font-bold">
              <span>Today</span>
            </span>
          </div>

          {/* SVG Spline Wave Chart */}
          <div className="relative w-full h-44 my-2">
            {/* Active Tooltip Pill */}
            {dailyData[activeTooltipIndex] && (
              <div 
                className="absolute z-20 -top-1 pointer-events-none transform -translate-x-1/2 px-2.5 py-1 rounded-xl bg-slate-950/90 border border-emerald-400 text-emerald-300 text-[10px] font-mono font-black shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                style={{ left: `${(dailyData[activeTooltipIndex].x / 500) * 100}%` }}
              >
                {dailyData[activeTooltipIndex].label}
              </div>
            )}

            <svg viewBox="0 0 500 180" className="w-full h-full overflow-visible">
              <defs>
                {/* Wave Gradient Fill */}
                <linearGradient id="cyberWaveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                  <stop offset="50%" stopColor="#059669" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#020617" stopOpacity="0.0" />
                </linearGradient>

                {/* Neon Glow Filter */}
                <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Horizontal grid guide lines */}
              <line x1="30" y1="30" x2="480" y2="30" stroke="rgba(30, 41, 59, 0.4)" strokeDasharray="3,3" />
              <line x1="30" y1="75" x2="480" y2="75" stroke="rgba(30, 41, 59, 0.4)" strokeDasharray="3,3" />
              <line x1="30" y1="120" x2="480" y2="120" stroke="rgba(30, 41, 59, 0.4)" strokeDasharray="3,3" />
              <line x1="30" y1="165" x2="480" y2="165" stroke="rgba(30, 41, 59, 0.8)" />

              {/* Y Axis Labels */}
              <text x="15" y="34" fill="#64748b" fontSize="9" fontWeight="bold">3h</text>
              <text x="15" y="79" fill="#64748b" fontSize="9" fontWeight="bold">2h</text>
              <text x="15" y="124" fill="#64748b" fontSize="9" fontWeight="bold">1h</text>
              <text x="15" y="168" fill="#64748b" fontSize="9" fontWeight="bold">0</text>

              {/* Glowing Wave Area */}
              <path d={splineArea} fill="url(#cyberWaveGrad)" />

              {/* Spline Wave Line */}
              <path
                d={splinePath}
                fill="none"
                stroke="#34d399"
                strokeWidth="3"
                strokeLinecap="round"
                filter="url(#neonGlow)"
              />

              {/* Active Dotted Vertical Marker */}
              {dailyData[activeTooltipIndex] && (
                <line
                  x1={dailyData[activeTooltipIndex].x}
                  y1={dailyData[activeTooltipIndex].y}
                  x2={dailyData[activeTooltipIndex].x}
                  y2="165"
                  stroke="#34d399"
                  strokeWidth="1.2"
                  strokeDasharray="2,2"
                  opacity="0.8"
                />
              )}

              {/* Interactive Data Point Dots */}
              {dailyData.map((pt, idx) => (
                <g key={pt.time} className="cursor-pointer" onClick={() => setActiveTooltipIndex(idx)}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={activeTooltipIndex === idx ? 6 : 4}
                    fill={activeTooltipIndex === idx ? '#34d399' : '#059669'}
                    stroke="#ffffff"
                    strokeWidth={activeTooltipIndex === idx ? 2 : 1.5}
                    className="transition-all hover:scale-125"
                    style={{ filter: 'drop-shadow(0 0 6px #10b981)' }}
                  />
                  {/* X Axis Time Label */}
                  <text
                    x={pt.x}
                    y="180"
                    fill={activeTooltipIndex === idx ? '#34d399' : '#94a3b8'}
                    fontSize="9.5"
                    fontWeight={activeTooltipIndex === idx ? 'bold' : 'normal'}
                    textAnchor="middle"
                  >
                    {pt.time}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <div className="flex justify-end pt-1 border-t border-slate-800/60">
            <span className="text-[11px] text-slate-400 font-semibold">
              Total Today <span className="text-emerald-400 font-bold font-mono">3h 45m</span>
            </span>
          </div>
        </div>

        {/* Continue Learning / Live Mentoring Card (4-5 Cols) */}
        {liveMode ? (
          <div className="lg:col-span-5 rounded-3xl cyber-glass-card p-5 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between pb-1">
              <h3 className="font-extrabold text-sm text-white tracking-wide flex items-center gap-2">
                <span>Live Mentoring & Schedule</span>
                {liveClasses.some((l: any) => l.status === 'LIVE') && (
                  <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 rounded-full animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    Live
                  </span>
                )}
              </h3>
              <button 
                onClick={() => onNavigate('live')}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 group cursor-pointer"
              >
                <span>Full Schedule</span>
                <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Next / Active Live Class Card */}
            {nextLiveSession ? (
              <div 
                onClick={() => onNavigate('live')}
                className="p-3.5 rounded-2xl bg-slate-950/80 border border-emerald-500/30 hover:border-emerald-400 transition-all cursor-pointer group shadow-inner space-y-2.5"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                    <Radio size={17} className={nextLiveSession.status === 'LIVE' ? 'animate-pulse text-rose-400' : 'text-emerald-400'} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <h4 className="font-extrabold text-sm text-white group-hover:text-emerald-300 transition-colors truncate">
                      {nextLiveSession.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 truncate">
                      <span className="text-emerald-400 font-semibold">{nextLiveSession.course_title || 'Dedicated Live Track'}</span>
                      <span>•</span>
                      <span>{new Date(nextLiveSession.scheduled_time).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-emerald-500/10">
                  <span className="font-medium flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${nextLiveSession.status === 'LIVE' ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
                    <span className="text-[10px]">{nextLiveSession.status === 'LIVE' ? 'Class In Progress (Live Now)' : 'Upcoming Scheduled Session'}</span>
                  </span>
                  <button className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg font-bold text-[10px] group-hover:bg-emerald-500 group-hover:text-black transition-all">
                    {nextLiveSession.status === 'LIVE' ? 'Join Live Stream' : 'View Session'}
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => onNavigate('courses')}
                className="p-3.5 rounded-2xl bg-slate-950/80 border border-emerald-500/30 hover:border-emerald-400 transition-all cursor-pointer group shadow-inner space-y-2.5"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                    <BookOpen size={17} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <h4 className="font-extrabold text-sm text-white group-hover:text-emerald-300 transition-colors truncate">
                      {activeCourse.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Live Video Library & Practical Replays
                    </p>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-emerald-500/10">
                  <span className="font-medium text-emerald-400 text-[10px]">Live Mentoring Track</span>
                  <button className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg font-bold text-[10px] group-hover:bg-emerald-500 group-hover:text-black transition-all">
                    Watch Replays
                  </button>
                </div>
              </div>
            )}

            {/* Quick Mentee Replays & Doubts Action Bar to fill height perfectly */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div 
                onClick={() => onNavigate('courses')}
                className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer group flex items-center gap-2.5"
              >
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <BookOpen size={14} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-white font-bold block truncate group-hover:text-emerald-300">Video Library</span>
                  <span className="text-[9px] text-slate-400 block truncate">{courses.length} Replay Tracks</span>
                </div>
              </div>

              <div 
                onClick={() => onNavigate('forum')}
                className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer group flex items-center gap-2.5"
              >
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <MessageSquare size={14} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-white font-bold block truncate group-hover:text-emerald-300">Ask Mentor</span>
                  <span className="text-[9px] text-slate-400 block truncate">1-on-1 Q&A Forum</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-5 rounded-3xl cyber-glass-card p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2">
              <h3 className="font-extrabold text-sm text-white tracking-wide">Continue Learning</h3>
              <button 
                onClick={() => onNavigate('courses')}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 group"
              >
                <span>View All</span>
                <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Active Course Card Preview */}
            <div 
              onClick={() => onOpenCourse(activeCourse.id)}
              className="p-4 rounded-2xl bg-slate-950/70 border border-emerald-500/30 hover:border-emerald-400 transition-all cursor-pointer group shadow-inner space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                  <BookOpen size={17} />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <h4 className="font-extrabold text-sm text-white group-hover:text-emerald-300 transition-colors truncate">
                    {activeCourse.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {activeCourse.category_name && activeCourse.category_name.toLowerCase() !== activeCourse.title.toLowerCase()
                      ? `${activeCourse.category_name} • `
                      : 'Training Track • '}
                    <span className={activeCourseProgress === 100 ? "text-emerald-400 font-semibold" : "text-slate-300"}>
                      {activeCourseProgress}% Completed
                    </span>
                  </p>
                </div>
              </div>

              {/* Glowing Emerald Capsule Progress Bar */}
              <div className="flex items-center gap-3 pt-1">
                <div className="flex-1 h-2 rounded-full bg-slate-800/80 overflow-hidden p-0.5 border border-slate-700/60">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_#34d399] transition-all duration-500"
                    style={{ width: `${activeCourseProgress}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono font-black text-emerald-400 shrink-0">
                  {activeCourseProgress}%
                </span>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-emerald-500/10">
              <span className="font-medium">
                {activeCourseProgress === 100 
                  ? "Status: Curriculum Completed" 
                  : "Active Track: Ongoing Module"}
              </span>
              <span className="text-emerald-400 font-bold">
                {activeCourseProgress === 100 
                  ? "100% Finished" 
                  : "In Progress"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
