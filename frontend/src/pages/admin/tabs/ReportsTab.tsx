import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { BarChart2, Download, Search, BookOpen, GraduationCap, CheckCircle2 } from 'lucide-react';
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
}

interface ReportsData {
  avg_course_completion: number;
  total_lessons_completed: number;
  total_lessons_in_platform: number;
  total_students_count: number;
  students: StudentReport[];
}

export const ReportsTab: React.FC = () => {
  const [search, setSearch] = useState('');
  
  const [liveMode, setLiveMode] = React.useState(localStorage.getItem('super_adminLiveMode') === 'true');

  React.useEffect(() => {
    const handleStorage = () => {
      setLiveMode(localStorage.getItem('super_adminLiveMode') === 'true');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // 1. Fetch Real Academic Reports Data
  const { data } = useQuery<ReportsData>({
    queryKey: ['admin-academic-reports', liveMode],
    queryFn: async () => {
      const res = await api.get(`analytics/reports/?live_mode=${liveMode}`);
      return res.data;
    }
  });

  const students = data?.students || [];

  const handleExportCSV = async () => {
    try {
      const res = await api.get('students/bulk-export/', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'academic_report.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Operational metrics report exported.');
    } catch {
      toast.error('Failed to export metrics report.');
    }
  };

  // If we are in Live Mentoring Administration Mode, reuse the awesome Staff Mentoring Reports view!
  if (liveMode) {
    return <StaffReportsTab />;
  }

  const filtered = students.filter(s => 
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.first_name.toLowerCase().includes(search.toLowerCase()) ||
    s.last_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Course Analytics & Completion</h1>
          <p className="text-muted-foreground text-sm mt-1 font-medium">Audit academic performance, track curriculum progress, and export student rosters.</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-md transition-all hover:brightness-110 active:scale-95"
        >
          <Download size={13} />
          <span>Export Excel Roster</span>
        </button>
      </div>

      {/* Real Stats Cards Row */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="p-4 bg-card border border-border rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Avg Completion</span>
            <span className="text-xl font-extrabold text-foreground">{data?.avg_course_completion ?? 0}%</span>
            <span className="text-[9px] text-muted-foreground block">Platform-wide average</span>
          </div>
          <div className="p-2.5 rounded-xl text-primary bg-primary/10"><BarChart2 size={16} /></div>
        </div>

        <div className="p-4 bg-card border border-border rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Lessons Passed</span>
            <span className="text-xl font-extrabold text-emerald-500">{data?.total_lessons_completed ?? 0}</span>
            <span className="text-[9px] text-muted-foreground block">Globally completed topics</span>
          </div>
          <div className="p-2.5 rounded-xl text-emerald-500 bg-emerald-500/10"><CheckCircle2 size={16} /></div>
        </div>

        <div className="p-4 bg-card border border-border rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Curriculum Size</span>
            <span className="text-xl font-extrabold text-sky-500">{data?.total_lessons_in_platform ?? 0}</span>
            <span className="text-[9px] text-muted-foreground block">Total available lessons</span>
          </div>
          <div className="p-2.5 rounded-xl text-sky-500 bg-sky-500/10"><BookOpen size={16} /></div>
        </div>

        <div className="p-4 bg-card border border-border rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Audited Mentees</span>
            <span className="text-xl font-extrabold text-amber-500">{data?.total_students_count ?? 0}</span>
            <span className="text-[9px] text-muted-foreground block">Enrolled in Course Program</span>
          </div>
          <div className="p-2.5 rounded-xl text-amber-500 bg-amber-500/10"><GraduationCap size={16} /></div>
        </div>
      </div>

      {/* Table search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/20 border border-border/50 p-4 rounded-2xl">
        <span className="font-bold text-muted-foreground block">Audited student roster: {students.length} profiles</span>
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-3 text-muted-foreground" size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search roster by student name or email..."
            className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-xl outline-none focus:border-primary/45"
          />
        </div>
      </div>

      {/* Report table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-border bg-muted/20 text-muted-foreground uppercase font-black text-[9px] tracking-widest">
                <th className="py-3 px-4">Mentee Details</th>
                <th className="py-3 px-4">Account Duration</th>
                <th className="py-3 px-4 text-center">Lessons Completed</th>
                <th className="py-3 px-4 text-center">Progress %</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(s => (
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
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground font-medium italic">
                    No academic records match this query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default ReportsTab;
