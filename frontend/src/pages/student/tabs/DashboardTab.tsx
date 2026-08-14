import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../../services/api';
import { 
  BookOpen, Radio, FileText, Award, 
  ArrowRight, Sparkles, ChevronDown, Layers
} from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';

interface DashboardStats {
  assigned_courses_count: number;
  upcoming_live_classes: number;
  assignments_submitted: number;
  assignments_graded: number;
  certificates_count: number;
  study_hours?: { day: string; hours: number }[];
  avg_hours?: number;
}

interface CourseItem {
  id: number;
  title: string;
  category_name?: string;
  progress?: number;
  thumbnail?: string;
  total_lessons?: number;
  completed_lessons?: number;
}

interface DashboardTabProps {
  onNavigate: (tab: string) => void;
  onOpenCourse: (courseId: number) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ onNavigate, onOpenCourse }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const isStudentLive = localStorage.getItem('studentLiveMode') === 'true';
  const liveMode = isStudentLive;
  const [activeTooltipIndex, setActiveTooltipIndex] = useState<number>(3); // Default to Thu

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', liveMode],
    placeholderData: (prev) => prev,
    staleTime: 60000,
    queryFn: async () => {
      const res = await api.get(`analytics/dashboard/?live_mode=${liveMode}`);
      return res.data;
    },
  });

  const { data: achievements } = useQuery<{ streak: number }>({
    queryKey: ['user-achievements', liveMode],
    placeholderData: (prev) => prev,
    staleTime: 60000,
    queryFn: async () => {
      const res = await api.get('users/profile/achievements/');
      return res.data;
    },
  });

  const { data: courses = [] } = useQuery<CourseItem[]>({
    queryKey: ['enrolled-courses-preview'],
    queryFn: async () => {
      const res = await api.get('courses/list/');
      return res.data;
    }
  });

  const studentName = user?.name || user?.email?.split('@')[0] || 'Ava';
  const streakDays = achievements?.streak || 14;

  const coursesCount = stats?.assigned_courses_count ?? (courses.length > 0 ? courses.length : 6);
  const liveCount = stats?.upcoming_live_classes ?? 2;
  const assignmentsPending = stats?.assignments_submitted ?? 4;
  const certificatesEarned = stats?.certificates_count ?? 3;

  // Active continue learning course
  const activeCourse = courses[0] || {
    id: 1,
    title: 'Data Structures & Algorithms',
    category_name: 'Intermediate',
    progress: 60,
  };

  // Weekly study data for smooth curved SVG chart
  const weeklyData = [
    { day: 'Mon', hours: 2.5, label: '2h 30m', x: 40, y: 130 },
    { day: 'Tue', hours: 4.8, label: '4h 45m', x: 110, y: 90 },
    { day: 'Wed', hours: 3.2, label: '3h 15m', x: 180, y: 115 },
    { day: 'Thu', hours: 5.75, label: '5h 45m', x: 250, y: 65 },
    { day: 'Fri', hours: 4.2, label: '4h 10m', x: 320, y: 100 },
    { day: 'Sat', hours: 5.3, label: '5h 20m', x: 390, y: 75 },
    { day: 'Sun', hours: 6.1, label: '6h 05m', x: 460, y: 55 },
  ];

  // SVG Spline Path connecting weekly points
  const splinePath = "M 40 130 C 75 110, 85 90, 110 90 C 135 90, 155 115, 180 115 C 205 115, 225 65, 250 65 C 275 65, 295 100, 320 100 C 345 100, 365 75, 390 75 C 415 75, 435 55, 460 55";
  const splineArea = "M 40 130 C 75 110, 85 90, 110 90 C 135 90, 155 115, 180 115 C 205 115, 225 65, 250 65 C 275 65, 295 100, 320 100 C 345 100, 365 75, 390 75 C 415 75, 435 55, 460 55 L 460 170 L 40 170 Z";

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
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-md space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Welcome back, {studentName}</span>
              <span className="text-2xl animate-bounce">👋</span>
            </h1>
            <p className="text-xs text-slate-300/90 leading-relaxed max-w-sm">
              Continue your learning journey and achieve your goals with Hadescore Apex.
            </p>
          </div>

          <div className="relative z-10 pt-4">
            <button
              onClick={() => onNavigate('courses')}
              className="px-4 py-2 bg-slate-950/70 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-95 cursor-pointer group"
            >
              <span>Continue Learning</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* 3D Holographic Graduation Cap Graphic */}
          <div className="absolute right-4 sm:right-10 top-1/2 -translate-y-1/2 pointer-events-none select-none opacity-85 hover:opacity-100 transition-opacity">
            <div className="relative w-36 h-36 flex items-center justify-center">
              {/* Pulsing Neon Halo Rings */}
              <div className="absolute inset-0 rounded-full border border-cyan-400/30 animate-ping opacity-25" />
              <div className="absolute inset-3 rounded-full border border-cyan-400/50 shadow-[0_0_20px_#06b6d4] opacity-60" />
              <div className="absolute inset-8 rounded-full border border-blue-400/40 shadow-[0_0_15px_#3b82f6] opacity-40" />

              {/* Glowing SVG Cap Icon */}
              <svg viewBox="0 0 100 100" className="w-28 h-28 drop-shadow-[0_0_15px_rgba(6,182,212,0.9)]">
                {/* Cap diamond */}
                <polygon 
                  points="50,22 88,38 50,54 12,38" 
                  fill="url(#capGrad)" 
                  stroke="#38bdf8" 
                  strokeWidth="1.8" 
                />
                {/* Skullcap / base */}
                <path 
                  d="M26,45 L26,62 C26,72 74,72 74,62 L74,45" 
                  fill="none" 
                  stroke="#38bdf8" 
                  strokeWidth="2" 
                />
                {/* Tassel & Ribbon */}
                <path 
                  d="M50,38 L78,56 L78,74" 
                  fill="none" 
                  stroke="#38bdf8" 
                  strokeWidth="1.8" 
                  strokeDasharray="2,2"
                />
                <circle cx="78" cy="76" r="3" fill="#38bdf8" />
                
                {/* Gradient Definition */}
                <defs>
                  <linearGradient id="capGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0891b2" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#0284c7" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#0f172a" stopOpacity="0.9" />
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
                stroke="#38bdf8"
                strokeWidth="7"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 * (1 - Math.min(streakDays / 30, 1))}
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 8px #06b6d4)' }}
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
      <div className={`grid gap-3.5 grid-cols-2 ${isStudentLive ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        {/* Card 1: Courses */}
        <motion.div 
          whileHover={{ y: -2 }}
          onClick={() => onNavigate('courses')}
          className="rounded-3xl cyber-glass-card p-4 flex items-center gap-3.5 cursor-pointer group"
        >
          <div className="h-12 w-12 rounded-full border border-cyan-400/40 bg-cyan-950/40 text-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)] group-hover:scale-105 transition-transform shrink-0">
            <BookOpen size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block">Courses</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-white leading-none">{coursesCount}</span>
              <span className="text-[10px] text-slate-400 font-semibold">In Progress</span>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Live Sessions */}
        <motion.div 
          whileHover={{ y: -2 }}
          onClick={() => onNavigate('live')}
          className="rounded-3xl cyber-glass-card p-4 flex items-center gap-3.5 cursor-pointer group"
        >
          <div className="h-12 w-12 rounded-full border border-cyan-400/40 bg-cyan-950/40 text-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)] group-hover:scale-105 transition-transform shrink-0">
            <Radio size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block">{isStudentLive ? 'Live Sessions' : 'Doubt Sessions'}</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-white leading-none">{liveCount}</span>
              <span className="text-[10px] text-slate-400 font-semibold">Scheduled</span>
            </div>
          </div>
        </motion.div>

        {/* Card 3: Assignments (Only in Live Mode) */}
        {isStudentLive && (
          <motion.div 
            whileHover={{ y: -2 }}
            onClick={() => onNavigate('assignments')}
            className="rounded-3xl cyber-glass-card p-4 flex items-center gap-3.5 cursor-pointer group"
          >
            <div className="h-12 w-12 rounded-full border border-cyan-400/40 bg-cyan-950/40 text-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)] group-hover:scale-105 transition-transform shrink-0">
              <FileText size={20} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">Assignments</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-white leading-none">{assignmentsPending}</span>
                <span className="text-[10px] text-slate-400 font-semibold">Pending</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Card 4: Certificates */}
        <motion.div 
          whileHover={{ y: -2 }}
          onClick={() => onNavigate('certificates')}
          className="rounded-3xl cyber-glass-card p-4 flex items-center gap-3.5 cursor-pointer group"
        >
          <div className="h-12 w-12 rounded-full border border-cyan-400/40 bg-cyan-950/40 text-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)] group-hover:scale-105 transition-transform shrink-0">
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
      </div>

      {/* ── ROW 3: WEEKLY STUDY ACTIVITY & CONTINUE LEARNING ───────────── */}
      <div className="grid gap-3.5 lg:grid-cols-12 items-stretch">
        
        {/* Weekly Study Activity Spline Wave Graph (7-8 Cols) */}
        <div className="lg:col-span-7 rounded-3xl cyber-glass-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <h3 className="font-extrabold text-sm text-white tracking-wide">Weekly Study Activity</h3>
            <button className="flex items-center gap-1 text-[11px] text-slate-300 bg-slate-950/60 border border-cyan-500/20 px-2.5 py-1 rounded-xl hover:border-cyan-400 transition-colors">
              <span>This Week</span>
              <ChevronDown size={12} className="text-cyan-400" />
            </button>
          </div>

          {/* SVG Spline Wave Chart */}
          <div className="relative w-full h-44 my-2">
            {/* Active Tooltip Pill */}
            {weeklyData[activeTooltipIndex] && (
              <div 
                className="absolute z-20 -top-1 pointer-events-none transform -translate-x-1/2 px-2.5 py-1 rounded-xl bg-slate-950/90 border border-cyan-400 text-cyan-300 text-[10px] font-mono font-black shadow-[0_0_12px_rgba(6,182,212,0.5)]"
                style={{ left: `${(weeklyData[activeTooltipIndex].x / 500) * 100}%` }}
              >
                {weeklyData[activeTooltipIndex].label}
              </div>
            )}

            <svg viewBox="0 0 500 180" className="w-full h-full overflow-visible">
              <defs>
                {/* Wave Gradient Fill */}
                <linearGradient id="cyberWaveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                  <stop offset="50%" stopColor="#0284c7" stopOpacity="0.15" />
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
              <text x="15" y="34" fill="#64748b" fontSize="9" fontWeight="bold">8h</text>
              <text x="15" y="79" fill="#64748b" fontSize="9" fontWeight="bold">6h</text>
              <text x="15" y="124" fill="#64748b" fontSize="9" fontWeight="bold">4h</text>
              <text x="15" y="168" fill="#64748b" fontSize="9" fontWeight="bold">0</text>

              {/* Glowing Wave Area */}
              <path d={splineArea} fill="url(#cyberWaveGrad)" />

              {/* Spline Wave Line */}
              <path
                d={splinePath}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="3"
                strokeLinecap="round"
                filter="url(#neonGlow)"
              />

              {/* Active Dotted Vertical Marker */}
              {weeklyData[activeTooltipIndex] && (
                <line
                  x1={weeklyData[activeTooltipIndex].x}
                  y1={weeklyData[activeTooltipIndex].y}
                  x2={weeklyData[activeTooltipIndex].x}
                  y2="165"
                  stroke="#38bdf8"
                  strokeWidth="1.2"
                  strokeDasharray="2,2"
                  opacity="0.8"
                />
              )}

              {/* Interactive Data Point Dots */}
              {weeklyData.map((pt, idx) => (
                <g key={pt.day} className="cursor-pointer" onClick={() => setActiveTooltipIndex(idx)}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={activeTooltipIndex === idx ? 6 : 4}
                    fill={activeTooltipIndex === idx ? '#38bdf8' : '#0284c7'}
                    stroke="#ffffff"
                    strokeWidth={activeTooltipIndex === idx ? 2 : 1.5}
                    className="transition-all hover:scale-125"
                    style={{ filter: 'drop-shadow(0 0 6px #06b6d4)' }}
                  />
                  {/* X Axis Day Label */}
                  <text
                    x={pt.x}
                    y="180"
                    fill={activeTooltipIndex === idx ? '#38bdf8' : '#94a3b8'}
                    fontSize="9.5"
                    fontWeight={activeTooltipIndex === idx ? 'bold' : 'normal'}
                    textAnchor="middle"
                  >
                    {pt.day}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <div className="flex justify-end pt-1 border-t border-slate-800/60">
            <span className="text-[11px] text-slate-400 font-semibold">
              Total This Week <span className="text-cyan-400 font-bold font-mono">23h 15m</span>
            </span>
          </div>
        </div>

        {/* Continue Learning Card (4-5 Cols) */}
        <div className="lg:col-span-5 rounded-3xl cyber-glass-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <h3 className="font-extrabold text-sm text-white tracking-wide">Continue Learning</h3>
            <button 
              onClick={() => onNavigate('courses')}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 group"
            >
              <span>View All</span>
              <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Active Course Card Preview */}
          <div 
            onClick={() => onOpenCourse(activeCourse.id)}
            className="p-4 rounded-2xl bg-slate-950/70 border border-cyan-500/30 hover:border-cyan-400 transition-all cursor-pointer group shadow-inner space-y-3"
          >
            <div className="flex items-center gap-3.5">
              {/* 3D Cyber Molecule Graphic matching photo */}
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-slate-950 to-[#061226] border border-cyan-400/50 flex items-center justify-center p-2 shadow-[0_0_18px_rgba(6,182,212,0.4)] group-hover:scale-105 transition-transform shrink-0 relative overflow-hidden">
                <svg viewBox="0 0 60 60" className="w-12 h-12">
                  <line x1="30" y1="30" x2="16" y2="16" stroke="#06b6d4" strokeWidth="1.5" opacity="0.8" />
                  <line x1="30" y1="30" x2="44" y2="16" stroke="#06b6d4" strokeWidth="1.5" opacity="0.8" />
                  <line x1="30" y1="30" x2="16" y2="44" stroke="#06b6d4" strokeWidth="1.5" opacity="0.8" />
                  <line x1="30" y1="30" x2="44" y2="44" stroke="#06b6d4" strokeWidth="1.5" opacity="0.8" />
                  <line x1="16" y1="16" x2="44" y2="16" stroke="#3b82f6" strokeWidth="1" opacity="0.5" />
                  <line x1="16" y1="44" x2="44" y2="44" stroke="#3b82f6" strokeWidth="1" opacity="0.5" />

                  <circle cx="30" cy="30" r="6" fill="#38bdf8" style={{ filter: 'drop-shadow(0 0 6px #06b6d4)' }} />
                  <circle cx="16" cy="16" r="4.5" fill="#06b6d4" style={{ filter: 'drop-shadow(0 0 4px #06b6d4)' }} />
                  <circle cx="44" cy="16" r="4.5" fill="#38bdf8" style={{ filter: 'drop-shadow(0 0 4px #38bdf8)' }} />
                  <circle cx="16" cy="44" r="4" fill="#0284c7" />
                  <circle cx="44" cy="44" r="4" fill="#0284c7" />
                </svg>
              </div>

              <div className="min-w-0 flex-1 space-y-0.5">
                <h4 className="font-black text-xs sm:text-sm text-white group-hover:text-cyan-300 transition-colors truncate">
                  {activeCourse.title}
                </h4>
                <p className="text-[10px] text-slate-400">
                  {activeCourse.category_name || 'Intermediate'} • {activeCourse.progress || 60}% Complete
                </p>
              </div>
            </div>

            {/* Glowing Cyan Capsule Progress Bar */}
            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1 h-2 rounded-full bg-slate-800/80 overflow-hidden p-0.5 border border-slate-700/60">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_10px_#38bdf8] transition-all duration-500"
                  style={{ width: `${activeCourse.progress || 60}%` }}
                />
              </div>
              <span className="text-[11px] font-mono font-black text-cyan-400 shrink-0">
                {activeCourse.progress || 60}%
              </span>
            </div>
          </div>

          <div className="pt-2 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Current Module: Advanced Graph Algorithms</span>
            <span className="text-cyan-400 font-bold">Lesson 4/12</span>
          </div>
        </div>
      </div>
    </div>
  );
};
