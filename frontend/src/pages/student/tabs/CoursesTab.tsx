import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import { Search, ChevronRight, Award } from 'lucide-react';

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
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'category'>('title');

  const { data: courses = [], isLoading } = useQuery<Course[]>({
    queryKey: ['courses-list'],
    queryFn: async () => {
      const res = await api.get('courses/list/');
      return res.data;
    }
  });

  const categories = Array.from(new Set(courses.map(c => c.category_name).filter(Boolean)));

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
      } else {
        return a.category_name.localeCompare(b.category_name);
      }
    });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-14 w-full bg-muted/40 animate-pulse rounded-2xl border border-border/30" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 bg-muted/40 animate-pulse rounded-2xl border border-border/30" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Assigned Training Paths</h1>
        <p className="text-muted-foreground text-sm mt-1">Explore all curriculum tracks, courses, and modules allocated to your profile.</p>
      </div>

      {/* Search, Filter, and Sort Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-muted/20 border border-border/50 p-4 rounded-2xl">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-3 text-muted-foreground" size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search course tracks..."
            className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-xl outline-none focus:border-primary/45 text-xs transition-all"
          />
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full md:w-44 h-10 px-3 bg-background border border-border rounded-xl outline-none focus:border-primary/45 text-xs transition-all font-semibold"
          >
            <option value="">All Domains</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'title' | 'category')}
            className="w-full md:w-44 h-10 px-3 bg-background border border-border rounded-xl outline-none focus:border-primary/45 text-xs transition-all font-semibold"
          >
            <option value="title">Sort by Title</option>
            <option value="category">Sort by Domain</option>
          </select>
        </div>
      </div>

      {/* Course Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCourses.length === 0 ? (
          <div className="col-span-full py-20 text-center text-muted-foreground font-medium bg-card border border-dashed border-border rounded-2xl">
            No course curriculums found matching your filters.
          </div>
        ) : (
          filteredCourses.map(course => (
            <div key={course.id} className="rounded-2xl glass-card p-6 shadow-sm hover:shadow-lg hover:border-primary/40 hover:-translate-y-1 transition-all flex flex-col justify-between gap-5 group">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] px-2.5 py-1 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold uppercase tracking-wider">
                    {course.category_name}
                  </span>
                  {course.status && (
                    <span className="text-[9px] px-2 py-0.5 rounded bg-muted border border-border text-foreground font-semibold uppercase tracking-wider">
                      {course.status}
                    </span>
                  )}
                </div>
                <h3 className="font-extrabold text-lg text-foreground leading-snug group-hover:text-primary transition-colors">{course.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{course.description}</p>
                
                {course.requirements && (
                  <div className="text-[11px] text-muted-foreground pt-3 border-t border-border/50">
                    <span className="font-semibold block text-foreground mb-0.5">Pre-requisites:</span>
                    <span className="line-clamp-2">{course.requirements}</span>
                  </div>
                )}

                {/* Progress bar visual indicator */}
                {course.progress_percentage !== undefined && course.progress_percentage !== null && (
                  <div className="space-y-1.5 pt-2 border-t border-border/30">
                    <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground">
                      <span>Course Progress</span>
                      <span className="font-mono text-primary">{course.progress_percentage}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border/30">
                      <div 
                        className="h-full bg-primary transition-all duration-500" 
                        style={{ width: `${course.progress_percentage}%` }} 
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold">
                  <Award size={12} className="text-primary" />
                  <span>Certificate Eligible Track</span>
                </div>
                
                <button
                  onClick={() => onOpenCourse(course)}
                  className="w-full py-2.5 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:brightness-110 transition-all shadow-md shadow-primary/10 flex items-center justify-center gap-1.5 transform active:scale-95"
                >
                  <span>Resume Curriculum</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
