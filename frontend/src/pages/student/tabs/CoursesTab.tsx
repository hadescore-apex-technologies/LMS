import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import { 
  Search, ChevronRight, Award, BookOpen, 
  GraduationCap, PlayCircle, Sparkles, 
  LayoutGrid, List, CheckCircle2, TrendingUp, X
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

export const CoursesTab: React.FC<CoursesTabProps> = ({ onOpenCourse }) => {
  const liveMode = localStorage.getItem('studentLiveMode') === 'true';
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'category' | 'progress'>('title');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: courses = [], isLoading } = useQuery<Course[]>({
    queryKey: ['courses-list'],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const res = await api.get(`courses/list/?live_mode=${liveMode}`);
      return res.data;
    }
  });

  const categories = Array.from(new Set(courses.map(c => c.category_name).filter(Boolean)));

  const totalCourses = courses.length;
  const completedCourses = courses.filter(c => c.progress_percentage === 100).length;
  const inProgressCourses = courses.filter(c => (c.progress_percentage || 0) > 0 && (c.progress_percentage || 0) < 100).length;
  const avgProgress = totalCourses > 0 
    ? Math.round(courses.reduce((acc, c) => acc + (c.progress_percentage || 0), 0) / totalCourses) 
    : 0;

  const filteredCourses = courses
    .filter(c => {
      const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) || 
                            c.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === '' || c.category_name === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'category') {
        return a.category_name.localeCompare(b.category_name);
      } else {
        return (b.progress_percentage || 0) - (a.progress_percentage || 0);
      }
    });

  return (
    <div className="space-y-6 text-xs animate-fade-in">
      {/* Hero Header & Quick Stats */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-primary/20 p-6 md:p-8 shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest">
              <Sparkles size={12} className="animate-pulse text-amber-400" />
              <span>Personalized Learning Hub</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
              {liveMode ? 'Live Session Videos' : 'Assigned Training Paths'}
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              {liveMode 
                ? 'Replay recorded webinar classes, missed mentor sessions, and playback video lectures.' 
                : 'Explore your active curriculum tracks, video modules, and skill certifications allocated for your career growth.'}
            </p>
          </div>

          {/* Quick Metrics Bar */}
          {liveMode ? (
            <div className="grid grid-cols-2 gap-3 bg-white/5 backdrop-blur-md border border-white/10 p-3.5 rounded-2xl shrink-0">
              <div className="space-y-1 p-2 text-center">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Playback Tracks</span>
                <div className="text-lg font-black text-white flex items-center justify-center gap-1">
                  <BookOpen size={14} className="text-primary" />
                  <span>{totalCourses}</span>
                </div>
              </div>
              <div className="space-y-1 p-2 text-center border-l border-white/10">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Access Status</span>
                <div className="text-lg font-black text-emerald-400 flex items-center justify-center gap-1">
                  <CheckCircle2 size={14} />
                  <span>Unlimited</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/5 backdrop-blur-md border border-white/10 p-3.5 rounded-2xl shrink-0">
              <div className="space-y-1 p-2 text-center">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Assigned</span>
                <div className="text-lg font-black text-white flex items-center justify-center gap-1">
                  <BookOpen size={14} className="text-primary" />
                  <span>{totalCourses}</span>
                </div>
              </div>

              <div className="space-y-1 p-2 text-center border-l border-white/10">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">In Progress</span>
                <div className="text-lg font-black text-amber-400 flex items-center justify-center gap-1">
                  <TrendingUp size={14} />
                  <span>{inProgressCourses}</span>
                </div>
              </div>

              <div className="space-y-1 p-2 text-center border-l border-white/10">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Completed</span>
                <div className="text-lg font-black text-emerald-400 flex items-center justify-center gap-1">
                  <CheckCircle2 size={14} />
                  <span>{completedCourses}</span>
                </div>
              </div>

              <div className="space-y-1 p-2 text-center border-l border-white/10">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Avg Progress</span>
                <div className="text-lg font-black text-indigo-400 flex items-center justify-center gap-1 font-mono">
                  <span>{avgProgress}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Domain Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setCategoryFilter('')}
          className={`px-4 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wider transition-all whitespace-nowrap border ${categoryFilter === '' ? 'bg-primary text-primary-foreground border-transparent shadow-lg shadow-primary/20 scale-105' : 'bg-card text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground'}`}
        >
          All Domains ({courses.length})
        </button>
        {categories.map(cat => {
          const count = courses.filter(c => c.category_name === cat).length;
          const isSelected = categoryFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wider transition-all whitespace-nowrap border ${isSelected ? 'bg-primary text-primary-foreground border-transparent shadow-lg shadow-primary/20 scale-105' : 'bg-card text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground'}`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Search, Sort, and View Controls */}
      {!liveMode && (
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card border border-border p-4 rounded-2xl shadow-sm">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-3 text-muted-foreground" size={14} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search course tracks, modules, skills..."
              className="w-full h-10 pl-10 pr-9 bg-muted/30 border border-border rounded-xl outline-none focus:border-primary/50 text-xs transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
                <X size={13} />
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 flex-1 md:flex-initial">
              <span className="text-[10px] font-bold uppercase text-muted-foreground shrink-0">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-10 px-3 bg-muted/30 border border-border rounded-xl outline-none focus:border-primary/50 text-xs font-semibold text-foreground cursor-pointer"
              >
                <option value="title">Course Title</option>
                <option value="category">Domain Category</option>
                <option value="progress">Highest Progress</option>
              </select>
            </div>

            <div className="flex items-center bg-muted/40 border border-border p-1 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                title="Grid View"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                title="List View"
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course List / Grid View */}
      {isLoading && courses.length === 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card/60 border border-border/50 rounded-2xl p-5 animate-pulse space-y-3 h-52">
              <div className="h-4 bg-muted/60 rounded-lg w-1/3" />
              <div className="h-6 bg-muted/80 rounded-xl w-3/4" />
              <div className="h-12 bg-muted/40 rounded-xl w-full" />
            </div>
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground bg-card border border-dashed border-border rounded-2xl p-8 space-y-3">
          <GraduationCap size={40} className="mx-auto text-muted-foreground/40" />
          <h3 className="font-bold text-sm text-foreground">No matching courses found</h3>
          <p className="text-xs max-w-sm mx-auto text-muted-foreground">Try clearing your search query or selecting a different domain category filter.</p>
          <button 
            onClick={() => { setSearch(''); setCategoryFilter(''); }}
            className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 font-bold rounded-xl text-xs hover:bg-primary/20 transition-all"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map(course => {
            const pct = course.progress_percentage || 0;
            const isCompleted = pct === 100;
            return (
              <div 
                key={course.id} 
                className="group relative rounded-2xl bg-card border border-border hover:border-primary/50 p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between gap-5 hover:-translate-y-1 overflow-hidden"
              >
                {/* Background ambient glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/15 transition-all pointer-events-none" />

                <div className="space-y-3 relative z-10">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] px-2.5 py-1 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold uppercase tracking-wider">
                      {course.category_name}
                    </span>
                    {!liveMode && (
                      isCompleted ? (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-extrabold uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 size={10} /> Completed
                        </span>
                      ) : course.status && (
                        <span className="text-[9px] px-2 py-0.5 rounded bg-muted border border-border text-muted-foreground font-semibold uppercase tracking-wider">
                          {course.status}
                        </span>
                      )
                    )}
                  </div>

                  <h3 className="font-extrabold text-base text-foreground leading-snug group-hover:text-primary transition-colors">
                    {course.title}
                  </h3>

                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {course.description}
                  </p>

                  {course.requirements && (
                    <div className="text-[11px] text-muted-foreground pt-3 border-t border-border/50">
                      <span className="font-semibold block text-foreground mb-0.5">Pre-requisites:</span>
                      <span className="line-clamp-2 text-[10px]">{course.requirements}</span>
                    </div>
                  )}

                  {/* Progress Indicator (only if not in Live Mode) */}
                  {!liveMode && (
                    <div className="space-y-1.5 pt-3 border-t border-border/30">
                      <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground">
                        <span>Curriculum Track Progress</span>
                        <span className="font-mono text-primary font-extrabold">{pct}%</span>
                      </div>
                      <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden border border-border/30 p-0.5">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-primary to-indigo-500'}`}
                          style={{ width: `${pct}%` }} 
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2 relative z-10">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                    <div className="flex items-center gap-1 text-primary">
                      <PlayCircle size={13} className="text-emerald-600 dark:text-emerald-400" />
                      <span>{liveMode ? 'Recorded Playbacks' : 'Certified Track'}</span>
                    </div>
                    {course.instructor_name && (
                      <span className="truncate max-w-[120px]">{liveMode ? 'Mentor' : 'By'}: {course.instructor_name}</span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => onOpenCourse(course)}
                    className="w-full py-2.5 bg-primary text-primary-foreground font-extrabold text-xs rounded-xl hover:brightness-110 transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-1.5 group-hover:shadow-primary/30"
                  >
                    <PlayCircle size={14} />
                    <span>{liveMode ? 'Explore Recorded Sessions' : (pct > 0 ? 'Resume Curriculum' : 'Start Learning Track')}</span>
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Compact List View */
        <div className="flex flex-col gap-3">
          {filteredCourses.map(course => {
            const pct = course.progress_percentage || 0;
            const isCompleted = pct === 100;
            return (
              <div 
                key={course.id}
                className="group rounded-2xl bg-card border border-border hover:border-primary/40 p-4 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-bold uppercase tracking-wider">
                      {course.category_name}
                    </span>
                    <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{course.title}</h3>
                    {isCompleted && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold uppercase">Completed</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{course.description}</p>
                </div>

                <div className="flex items-center gap-6 shrink-0 border-t md:border-t-0 border-border pt-3 md:pt-0">
                  {liveMode ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                      <PlayCircle size={14} className="text-primary" />
                      <span>Recorded Playbacks</span>
                    </div>
                  ) : (
                    <div className="w-32 space-y-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-mono text-primary">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => onOpenCourse(course)}
                    className="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:brightness-110 transition-all flex items-center gap-1 shrink-0"
                  >
                    <span>Open</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
