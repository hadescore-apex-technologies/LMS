import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { 
  BarChart2, Download, Search, BookOpen, GraduationCap, CheckCircle2, 
  TrendingUp, Award, HelpCircle, FileCheck, Layers, Filter
} from 'lucide-react';
import { ReportsTab as StaffReportsTab } from '../../staff/tabs/ReportsTab';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell
} from 'recharts';

interface CourseAnalyticsItem {
  id: number;
  title: string;
  category_name: string;
  is_mentoring_track: boolean;
  total_lessons: number;
  total_quizzes: number;
  total_assignments: number;
  total_items: number;
  enrolled_students_count: number;
  avg_completion_pct: number;
  quiz_pass_rate: number;
  assignment_submission_rate: number;
}

interface StudentReport {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  course_duration: number | null;
  lessons_completed: number;
  completion_percentage: number;
  enrolled_courses_count?: number;
}

interface ReportsData {
  avg_course_completion: number;
  total_lessons_completed: number;
  total_lessons_in_platform: number;
  total_students_count: number;
  total_courses_count: number;
  courses_analytics: CourseAnalyticsItem[];
  top_performing_courses: CourseAnalyticsItem[];
  completion_distribution: {
    '0_25': number;
    '26_50': number;
    '51_75': number;
    '76_100': number;
  };
  students: StudentReport[];
}

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border p-3 rounded-xl shadow-xl flex flex-col gap-1 z-50">
        <span className="text-[11px] font-bold text-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
          <span className="text-xs font-black text-foreground">
            {payload[0].value}% <span className="text-[10px] text-muted-foreground font-normal">Avg Completion</span>
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export const ReportsTab: React.FC = () => {
  const [activeView, setActiveView] = useState<'COURSES' | 'STUDENTS'>('COURSES');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  
  const [liveMode, setLiveMode] = React.useState(localStorage.getItem('super_adminLiveMode') === 'true');

  React.useEffect(() => {
    const handleStorage = () => {
      setLiveMode(localStorage.getItem('super_adminLiveMode') === 'true');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // 1. Fetch Real Academic Reports Data
  const { data, isLoading } = useQuery<ReportsData>({
    queryKey: ['admin-academic-reports', liveMode],
    queryFn: async () => {
      const res = await api.get(`analytics/reports/?live_mode=${liveMode}`);
      return res.data;
    }
  });

  const students = data?.students || [];
  const coursesAnalytics = data?.courses_analytics || [];
  const categories = Array.from(new Set(coursesAnalytics.map(c => c.category_name).filter(Boolean)));

  const handleExportCSV = async () => {
    try {
      if (activeView === 'STUDENTS') {
        const res = await api.get('students/bulk-export/', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'student_academic_report.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('Student roster exported successfully.');
      } else {
        // Export Course Analytics
        const headers = ['Course ID', 'Course Title', 'Category', 'Enrolled Mentees', 'Total Lessons', 'Total Quizzes', 'Total Assignments', 'Avg Completion %', 'Quiz Pass Rate %', 'Submission Rate %'];
        const csvRows = [headers.join(',')];
        coursesAnalytics.forEach(c => {
          csvRows.push([
            c.id,
            `"${c.title.replace(/"/g, '""')}"`,
            `"${c.category_name}"`,
            c.enrolled_students_count,
            c.total_lessons,
            c.total_quizzes,
            c.total_assignments,
            c.avg_completion_pct,
            c.quiz_pass_rate,
            c.assignment_submission_rate
          ].join(','));
        });
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'course_analytics_report.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('Course performance analytics exported.');
      }
    } catch {
      toast.error('Failed to export metrics report.');
    }
  };

  // If in Live Mentoring Administration Mode, reuse Staff Mentoring Reports view
  if (liveMode) {
    return <StaffReportsTab />;
  }

  const filteredCourses = coursesAnalytics.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
                          c.category_name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || c.category_name === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredStudents = students.filter(s => 
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.first_name.toLowerCase().includes(search.toLowerCase()) ||
    s.last_name.toLowerCase().includes(search.toLowerCase())
  );

  // Distribution chart data
  const distData = [
    { range: '0-25%', count: data?.completion_distribution?.['0_25'] || 0, fill: '#f43f5e' },
    { range: '26-50%', count: data?.completion_distribution?.['26_50'] || 0, fill: '#f59e0b' },
    { range: '51-75%', count: data?.completion_distribution?.['51_75'] || 0, fill: '#06b6d4' },
    { range: '76-100%', count: data?.completion_distribution?.['76_100'] || 0, fill: '#10b981' },
  ];

  return (
    <div className="space-y-6 text-xs pb-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Course Analytics & Completion</h1>
          <p className="text-muted-foreground text-sm mt-1 font-medium">
            Analyze curriculum completion rates, student progression ratios, and course performance metrics.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-md transition-all hover:brightness-110 active:scale-95 cursor-pointer"
          >
            <Download size={13} />
            <span>{activeView === 'COURSES' ? 'Export Course Metrics' : 'Export Roster CSV'}</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards Row */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="p-4 bg-card border border-border rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Avg Course Completion</span>
            <span className="text-2xl font-black text-foreground">{data?.avg_course_completion ?? 0}%</span>
            <span className="text-[9px] text-muted-foreground block">Platform-wide average</span>
          </div>
          <div className="p-2.5 rounded-xl text-primary bg-primary/10"><TrendingUp size={18} /></div>
        </div>

        <div className="p-4 bg-card border border-border rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Active Courses</span>
            <span className="text-2xl font-black text-sky-500">{data?.total_courses_count ?? coursesAnalytics.length}</span>
            <span className="text-[9px] text-muted-foreground block">Published training tracks</span>
          </div>
          <div className="p-2.5 rounded-xl text-sky-500 bg-sky-500/10"><BookOpen size={18} /></div>
        </div>

        <div className="p-4 bg-card border border-border rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Topics Passed</span>
            <span className="text-2xl font-black text-emerald-500">{data?.total_lessons_completed ?? 0}</span>
            <span className="text-[9px] text-muted-foreground block">Out of {data?.total_lessons_in_platform ?? 0} total</span>
          </div>
          <div className="p-2.5 rounded-xl text-emerald-500 bg-emerald-500/10"><CheckCircle2 size={18} /></div>
        </div>

        <div className="p-4 bg-card border border-border rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Audited Mentees</span>
            <span className="text-2xl font-black text-amber-500">{data?.total_students_count ?? 0}</span>
            <span className="text-[9px] text-muted-foreground block">Registered student profiles</span>
          </div>
          <div className="p-2.5 rounded-xl text-amber-500 bg-amber-500/10"><GraduationCap size={18} /></div>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Course Performance Bar Chart (8 Cols) */}
        <div className="lg:col-span-8 rounded-2xl border border-border bg-card shadow-sm p-4 flex flex-col h-[340px]">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <BarChart2 size={16} className="text-primary" />
                <span>Course Completion Comparison</span>
              </h3>
              <p className="text-[11px] text-muted-foreground">Average completion rate percentage per course track</p>
            </div>
          </div>

          <div className="h-[260px] w-full">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center animate-pulse text-muted-foreground">Loading chart...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={coursesAnalytics.slice(0, 8)} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#0d9488" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="title" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    unit="%"
                    domain={[0, 100]}
                  />
                  <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.15 }} />
                  <Bar dataKey="avg_completion_pct" radius={[6, 6, 0, 0]} barSize={32} fill="url(#barGrad)">
                    {coursesAnalytics.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.avg_completion_pct >= 75 ? '#10b981' : entry.avg_completion_pct >= 50 ? '#06b6d4' : '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Completion Distribution Donut/Bar Chart (4 Cols) */}
        <div className="lg:col-span-4 rounded-2xl border border-border bg-card shadow-sm p-4 flex flex-col h-[340px]">
          <div className="mb-3">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Layers size={16} className="text-amber-500" />
              <span>Progress Distribution</span>
            </h3>
            <p className="text-[11px] text-muted-foreground">Mentee count by progress bracket</p>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-3">
            {distData.map((d, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-muted-foreground">{d.range} Progress</span>
                  <span className="text-foreground font-mono">{d.count} Mentees</span>
                </div>
                <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden p-0.5 border border-border/40">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{ 
                      width: `${(data?.total_students_count ? (d.count / data.total_students_count) * 100 : 0)}%`,
                      backgroundColor: d.fill
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation View Switcher & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-muted/20 border border-border p-3.5 rounded-2xl">
        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 bg-background p-1 rounded-xl border border-border">
          <button
            onClick={() => setActiveView('COURSES')}
            className={`px-4 py-1.5 rounded-lg font-extrabold text-xs transition-all cursor-pointer ${
              activeView === 'COURSES'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Course Performance ({coursesAnalytics.length})
          </button>
          <button
            onClick={() => setActiveView('STUDENTS')}
            className={`px-4 py-1.5 rounded-lg font-extrabold text-xs transition-all cursor-pointer ${
              activeView === 'STUDENTS'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Student Roster ({students.length})
          </button>
        </div>

        {/* Search & Category Filter Toolbar */}
        <div className="flex items-center gap-2 flex-1 sm:max-w-md">
          {activeView === 'COURSES' && categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 px-3 bg-background border border-border rounded-xl outline-none text-xs font-bold text-foreground cursor-pointer"
            >
              <option value="ALL">All Domains</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}

          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={14} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeView === 'COURSES' ? "Search course title or domain..." : "Search mentee name or email..."}
              className="w-full h-9 pl-9 pr-4 bg-background border border-border rounded-xl outline-none focus:border-primary/45 text-xs text-foreground"
            />
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        {activeView === 'COURSES' ? (
          /* Course-by-Course Performance Analytics Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-muted-foreground uppercase font-black text-[9px] tracking-widest">
                  <th className="py-3 px-4">Course Title & Domain</th>
                  <th className="py-3 px-4 text-center">Enrolled Mentees</th>
                  <th className="py-3 px-4 text-center">Curriculum Size</th>
                  <th className="py-3 px-4 text-center w-1/4">Avg Student Completion</th>
                  <th className="py-3 px-4 text-center">Quiz Pass Rate</th>
                  <th className="py-3 px-4 text-center">Submissions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCourses.map(course => (
                  <tr key={course.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-foreground text-sm">{course.title}</div>
                      <span className="inline-block mt-0.5 text-[9px] font-black uppercase px-2 py-0.5 bg-primary/10 text-primary rounded-md border border-primary/20">
                        {course.category_name}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-black text-foreground text-sm bg-muted/40 px-2.5 py-1 rounded-lg">
                        {course.enrolled_students_count}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="text-[11px] font-semibold text-foreground">
                        {course.total_lessons} Lessons • {course.total_quizzes} Quizzes • {course.total_assignments} Tasks
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="space-y-1.5 w-full">
                        <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground">
                          <span>Average Progress</span>
                          <span className="font-mono text-primary font-black">{course.avg_completion_pct}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden border border-border/30 p-0.5">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${course.avg_completion_pct >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-primary to-indigo-500'}`}
                            style={{ width: `${Math.min(course.avg_completion_pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold">
                      <span className={`px-2.5 py-1 rounded-lg text-xs ${course.quiz_pass_rate >= 75 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        {course.quiz_pass_rate}%
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold">
                      <span className="text-foreground text-xs">
                        {course.assignment_submission_rate}%
                      </span>
                    </td>
                  </tr>
                ))}

                {filteredCourses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted-foreground font-medium italic">
                      No course performance records match this query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Student Performance Roster Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-muted-foreground uppercase font-black text-[9px] tracking-widest">
                  <th className="py-3 px-4">Mentee Details</th>
                  <th className="py-3 px-4">Account Duration</th>
                  <th className="py-3 px-4 text-center">Lessons Completed</th>
                  <th className="py-3 px-4 text-center">Completion %</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStudents.map(s => (
                  <tr key={s.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-foreground">{s.first_name} {s.last_name}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{s.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-bold text-foreground bg-muted/40 px-2 py-1 rounded-lg">
                        {s.course_duration ?? 0} Months
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-black text-foreground">
                      {s.lessons_completed ?? 0}
                    </td>
                    <td className="py-3 px-4 text-center w-1/4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground w-3/4 mx-auto">
                          <span>Progress</span>
                          <span className="font-mono text-primary font-extrabold">{s.completion_percentage ?? 0}%</span>
                        </div>
                        <div className="h-2 w-3/4 mx-auto bg-muted/60 rounded-full overflow-hidden border border-border/30 p-0.5">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${(s.completion_percentage ?? 0) >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-primary to-indigo-500'}`}
                            style={{ width: `${Math.min(s.completion_percentage ?? 0, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {s.is_active ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-wider">Active</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500 text-[9px] font-black uppercase tracking-wider">Locked</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground font-medium italic">
                      No student records match this query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default ReportsTab;

