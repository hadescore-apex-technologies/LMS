import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { Download, Search, GraduationCap, CheckCircle2, BookOpen, Loader2, RefreshCw } from 'lucide-react';
import { ReportsTab as StaffReportsTab } from '../../staff/tabs/ReportsTab';

interface StudentReport {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  course_duration: number | null;
  lessons_completed: number;
  completion_percentage: number;
  courses_titles?: string[];
}

interface ReportsData {
  students: StudentReport[];
}

export const ReportsTab: React.FC = () => {
  const [search, setSearch] = useState('');
  const [liveMode, setLiveMode] = useState(localStorage.getItem('super_adminLiveMode') === 'true');

  React.useEffect(() => {
    const handleStorage = () => {
      setLiveMode(localStorage.getItem('super_adminLiveMode') === 'true');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Fetch Academic Reports Data with Real-Time Dynamic Background Polling
  const { data, isLoading, isFetching, refetch } = useQuery<ReportsData>({
    queryKey: ['admin-academic-reports', liveMode],
    queryFn: async () => {
      const res = await api.get(`analytics/reports/?live_mode=${liveMode}`);
      return res.data;
    },
    refetchInterval: 5000, // Dynamic real-time auto-refresh every 5 seconds
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const students = data?.students || [];

  const handleExportCSV = async () => {
    try {
      const res = await api.get('students/bulk-export/', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'student_course_progress_report.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Student course progress exported.');
    } catch {
      toast.error('Failed to export metrics report.');
    }
  };

  // If in Live Mentoring Administration Mode, reuse Staff Mentoring Reports view
  if (liveMode) {
    return <StaffReportsTab />;
  }

  const filteredStudents = students.filter(s => {
    const query = search.toLowerCase();
    const matchesName = s.first_name.toLowerCase().includes(query) || s.last_name.toLowerCase().includes(query);
    const matchesEmail = s.email.toLowerCase().includes(query);
    const matchesCourses = s.courses_titles?.some(c => c.toLowerCase().includes(query));
    return matchesName || matchesEmail || matchesCourses;
  });

  return (
    <div className="space-y-6 text-xs pb-6">
      {/* Simple & Clean Real-Time Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-5 rounded-2xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <GraduationCap className="text-primary" size={24} />
              <span>Course Analytics - Student Progress</span>
            </h1>
            {/* Live Syncing Indicator Badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black border border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Live Syncing</span>
            </span>
          </div>
          <p className="text-muted-foreground text-xs mt-1 font-medium">
            Dynamic real-time student course progress percentage and completed topics.
          </p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search Bar */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={14} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student name, email, or course..."
              className="w-full h-9 pl-9 pr-4 bg-background border border-border rounded-xl outline-none focus:border-primary text-xs text-foreground"
            />
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Force Real-Time Sync"
            className="flex items-center justify-center p-2.5 bg-muted/40 hover:bg-muted text-foreground font-bold rounded-xl border border-border transition-all active:scale-95 cursor-pointer h-9 shrink-0"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin text-primary' : ''} />
          </button>

          {/* CSV Export Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl shadow-md transition-all hover:brightness-110 active:scale-95 cursor-pointer h-9 shrink-0"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Student Progress Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="animate-spin text-primary" size={18} />
            <span className="font-semibold text-xs">Loading real-time student course progress...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground uppercase font-black text-[9px] tracking-widest">
                  <th className="py-3.5 px-4">Student Details</th>
                  <th className="py-3.5 px-4">Enrolled Course</th>
                  <th className="py-3.5 px-4 text-center">Completed Topics</th>
                  <th className="py-3.5 px-4 text-center w-1/3">Course Progress</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStudents.map(s => {
                  const pct = Math.min(s.completion_percentage ?? 0, 100);
                  return (
                    <tr key={s.id} className="hover:bg-muted/10 transition-colors">
                      {/* Student Details */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-foreground text-sm">{s.first_name} {s.last_name}</div>
                        <div className="text-[11px] font-mono text-muted-foreground">{s.email}</div>
                      </td>

                      {/* Enrolled Course */}
                      <td className="py-3.5 px-4">
                        {s.courses_titles && s.courses_titles.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {s.courses_titles.map((title, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-bold">
                                <BookOpen size={11} />
                                <span>{title}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">No Course Enrolled</span>
                        )}
                      </td>

                      {/* Completed Topics */}
                      <td className="py-3.5 px-4 text-center font-black text-foreground text-sm">
                        <div className="inline-flex items-center gap-1 bg-muted/40 px-3 py-1 rounded-lg">
                          <CheckCircle2 size={13} className="text-emerald-500" />
                          <span>{s.lessons_completed ?? 0} Topics</span>
                        </div>
                      </td>

                      {/* Course Progress */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="space-y-1.5 w-4/5 mx-auto">
                          <div className="flex justify-between items-center text-[11px] font-extrabold text-foreground">
                            <span>Course Progress</span>
                            <span className="font-mono text-primary font-black text-xs">{pct}%</span>
                          </div>
                          <div className="h-2.5 w-full bg-muted/70 rounded-full overflow-hidden border border-border/40 p-0.5 shadow-inner">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-primary to-indigo-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {!s.is_active ? (
                          <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-wider border border-rose-500/20">
                            Locked
                          </span>
                        ) : pct >= 100 ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">
                            Completed
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-500 text-[10px] font-black uppercase tracking-wider border border-sky-500/20">
                            In Progress
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground font-medium italic text-xs">
                      No student records match "{search}".
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
