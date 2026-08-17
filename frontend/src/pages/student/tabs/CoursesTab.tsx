import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, type Variants } from 'framer-motion';
import api from '../../../services/api';
import { 
  Search, ChevronRight, BookOpen, 
  PlayCircle, CheckCircle2, X
} from 'lucide-react';

interface Course {
  id: number;
  title: string;
  description: string;
  category: number;
  category_name: string;
  status?: string;
  requirements?: string;
  instructor_name?: string;
  instructor_role?: string;
  progress_percentage?: number;
}

interface CoursesTabProps {
  onOpenCourse: (course: Course) => void;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } }
};

export const CoursesTab: React.FC<CoursesTabProps> = ({ onOpenCourse }) => {
  const liveMode = localStorage.getItem('studentLiveMode') === 'true';
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'category' | 'progress'>('title');

  const { data: courses = [], isLoading } = useQuery<Course[]>({
    queryKey: ['courses-list', liveMode],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const res = await api.get(`courses/list/?live_mode=${liveMode}`);
      return res.data;
    }
  });

  const categories = Array.from(new Set(courses.map(c => c.category_name).filter(Boolean)));

  const totalCourses = courses.length;
  const completedCourses = courses.filter(c => Math.round(Number(c.progress_percentage ?? (c as any).progress ?? 0)) === 100).length;
  const inProgressCourses = courses.filter(c => {
    const p = Math.round(Number(c.progress_percentage ?? (c as any).progress ?? 0));
    return p > 0 && p < 100;
  }).length;

  const filteredCourses = courses
    .filter(c => {
      if (!c) return false;
      const titleText = (c.title || '').toLowerCase();
      const descText = (c.description || '').toLowerCase();
      const query = (search || '').toLowerCase().trim();
      const matchesSearch = !query || titleText.includes(query) || descText.includes(query);
      const matchesCategory = !categoryFilter || c.category_name === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'category') {
        return a.category_name.localeCompare(b.category_name);
      } else {
        const pA = Math.round(Number(a.progress_percentage ?? (a as any).progress ?? 0));
        const pB = Math.round(Number(b.progress_percentage ?? (b as any).progress ?? 0));
        return pB - pA;
      }
    });

  return (
    <div className="w-full space-y-3.5 text-xs animate-fade-in">
      {/* ── UNIFIED COMPACT HEADER & CONTROLS BAR ────────────────────────── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-border/50 pb-2.5">
        {/* Title & Metadata */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black shadow-md shadow-emerald-500/20 border border-emerald-400">
            <BookOpen size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-foreground tracking-tight">
                {liveMode ? 'Live Session Recorded Classes' : 'Assigned Training Paths'}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-wider">
                {totalCourses} Tracks
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {liveMode 
                ? 'Replay recorded mentoring webinars and stream curriculum playbacks.' 
                : 'Complete modules, pass quizzes, and earn verifiable certifications.'}
            </p>
          </div>
        </div>

        {/* Integrated Search & Sort Toolbar */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Quick Search */}
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={13} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses or skills..."
              className="w-full h-8 pl-8 pr-7 bg-card/90 border border-border/80 rounded-xl outline-none focus:border-emerald-500/60 text-xs text-foreground placeholder:text-muted-foreground/60 transition-all shadow-2xs"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-8 px-2.5 bg-card border border-border/80 rounded-xl outline-none focus:border-emerald-500/60 text-[11px] font-bold text-foreground cursor-pointer shadow-2xs"
          >
            <option value="title">Sort: Title</option>
            <option value="category">Sort: Domain</option>
            {!liveMode && <option value="progress">Sort: Progress</option>}
          </select>

          {/* Quick Stats Pills */}
          {!liveMode && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-card border border-border/80 rounded-xl text-[10px] font-extrabold text-foreground shadow-2xs">
              <span className="text-amber-400">{inProgressCourses} Active</span>
              <span className="text-border/80">•</span>
              <span className="text-emerald-400">{completedCourses} Done</span>
            </div>
          )}
        </div>
      </div>

      {/* Category Pills Strip (Compact) */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setCategoryFilter('')}
            className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border cursor-pointer ${
              categoryFilter === '' 
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-sm shadow-emerald-500/20 scale-102' 
                : 'bg-card/80 text-muted-foreground border-border/70 hover:bg-muted hover:text-foreground'
            }`}
          >
            All Tracks ({courses.length})
          </button>
          {categories.map(cat => {
            const count = courses.filter(c => c.category_name === cat).length;
            const isSelected = categoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border cursor-pointer ${
                  isSelected 
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-sm shadow-emerald-500/20 scale-102' 
                    : 'bg-card/80 text-muted-foreground border-border/70 hover:bg-muted hover:text-foreground'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* ── COURSE CARDS GRID ────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-64 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="rounded-3xl cyber-glass-card p-12 text-center space-y-3">
          <BookOpen size={36} className="mx-auto text-emerald-400/50" />
          <h3 className="text-base font-extrabold text-white">No courses match your filter</h3>
          <p className="text-[11px] max-w-xs mx-auto text-muted-foreground">Try clearing your search query or choosing another domain.</p>
          <button
            onClick={() => { setSearch(''); setCategoryFilter(''); }}
            className="px-4 py-1.5 bg-slate-900 border border-emerald-500/40 text-emerald-300 font-bold rounded-xl hover:text-white text-xs transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {filteredCourses.map(course => {
            const pct = Math.round(Number(course.progress_percentage ?? (course as any).progress ?? 0));
            const isCompleted = pct === 100;
            return (
              <motion.div 
                variants={itemVariants}
                key={course.id} 
                whileHover={{ y: -3, scale: 1.01 }}
                className="group relative rounded-2xl cyber-glass-card hover:border-emerald-400 p-4 shadow-sm hover:shadow-[0_0_25px_rgba(16,185,129,0.25)] transition-all duration-200 flex flex-col justify-between gap-3.5 overflow-hidden cursor-pointer"
                onClick={() => onOpenCourse(course)}
              >
                {/* Radiant Ambient Corner Glow */}
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-transparent rounded-full blur-xl group-hover:from-emerald-500/35 transition-all pointer-events-none" />

                <div className="space-y-2 relative z-10">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[9px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-extrabold uppercase tracking-wider truncate max-w-[130px]">
                      {course.category_name}
                    </span>
                    {!liveMode && (
                      isCompleted ? (
                        <span className="text-[8px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-black uppercase tracking-wider flex items-center gap-1 shrink-0">
                          <CheckCircle2 size={9} /> Completed
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono text-emerald-300 font-black shrink-0">
                          {pct}%
                        </span>
                      )
                    )}
                  </div>

                  <h3 className="font-extrabold text-sm text-white leading-tight group-hover:text-emerald-300 transition-colors line-clamp-2">
                    {course.title}
                  </h3>

                  <p className="text-[11px] text-slate-300/80 leading-relaxed line-clamp-2 font-normal">
                    {course.description}
                  </p>
                </div>

                {/* Bottom Progress & Action Row */}
                <div className="space-y-2 pt-2 border-t border-emerald-500/20 relative z-10">
                  {!liveMode && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400 font-medium">Progress</span>
                        <span className={`font-mono font-bold ${isCompleted ? 'text-emerald-400' : 'text-emerald-300'}`}>
                          {pct}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-700/60 p-0.5">
                        <div 
                          className={`h-full rounded-full transition-all duration-700 ${
                            isCompleted 
                              ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' 
                              : 'bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_8px_#34d399]'
                          }`}
                          style={{ width: `${Math.max(pct, isCompleted ? 100 : 0)}%` }} 
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-0.5">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold">
                      <PlayCircle size={13} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                      <span>{liveMode ? 'Watch Replay' : isCompleted ? 'Review Content' : 'Open Curriculum'}</span>
                    </div>

                    <button 
                      className={`px-3 py-1 text-white font-extrabold rounded-lg text-[10px] group-hover:brightness-110 transition-all flex items-center gap-1 shadow-sm ${
                        isCompleted
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                          : pct > 0
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                            : 'bg-gradient-to-r from-slate-700 to-slate-800 border border-slate-600/50'
                      }`}
                    >
                      <span>{isCompleted ? 'Review' : pct > 0 ? 'Continue' : 'Start'}</span>
                      <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};
export default CoursesTab;
