import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { 
  Calendar, Search, CheckCircle2, XCircle, Users, 
  FileSpreadsheet, Download, X, Mail, ChevronRight, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AttendanceLogItem {
  date: string;
  status: 'PRESENT' | 'ABSENT';
  first_login?: string | null;
}

interface Student {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  student_type?: string;
  attendance_status?: 'PRESENT' | 'ABSENT' | null;
  attendance_logs?: AttendanceLogItem[];
}

export const AttendanceTab: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [liveMode, setLiveMode] = React.useState(localStorage.getItem('super_adminLiveMode') === 'true');

  React.useEffect(() => {
    const handleStorage = () => {
      setLiveMode(localStorage.getItem('super_adminLiveMode') === 'true');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Fetch Students with attendance_logs
  const { data: students = [], isLoading, refetch } = useQuery<Student[]>({
    queryKey: ['students-attendance-roster', liveMode],
    queryFn: async () => {
      const res = await api.get(`students/?live_mode=${liveMode}`);
      return res.data;
    }
  });

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteLog = async (studentId: number, date: string) => {
    if (!window.confirm(`Are you sure you want to delete the attendance log for ${date}?`)) return;
    
    setIsDeleting(true);
    try {
      await api.delete(`students/${studentId}/delete-attendance/`, {
        data: { date } // Axios uses 'data' for DELETE request body, or we can use params
      });
      toast.success('Attendance record deleted successfully');
      
      // Update local state to avoid full refetch delay
      if (selectedStudent) {
        setSelectedStudent(prev => prev ? {
          ...prev,
          attendance_logs: (prev.attendance_logs || []).filter(l => l.date !== date)
        } : prev);
      }
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete attendance record');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter students based on search query and live mode
  const filteredStudents = students.filter(s => {
    if (liveMode) {
      if (s.student_type !== 'LIVE_CLASS' && s.student_type !== 'BOTH') return false;
    } else {
      if (s.student_type !== 'COURSE' && s.student_type !== 'BOTH') return false;
    }
    const fullName = `${s.first_name || ''} ${s.last_name || ''} ${s.email}`.toLowerCase();
    return fullName.includes(search.toLowerCase());
  });

  // Download Individual Student's Complete Attendance Report as CSV
  const handleExportStudentAttendanceCSV = (student: Student) => {
    const fullName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Student';
    const logs = student.attendance_logs || [];

    if (logs.length === 0) {
      toast.error(`No attendance history records found for ${fullName}.`);
      return;
    }

    const headers = ['Date', 'Status', 'Student Name', 'Email Address'];
    const rows = logs.map(log => [
      log.date,
      log.status,
      `"${fullName}"`,
      `"${student.email}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const safeFileName = fullName.replace(/[^a-zA-Z0-9]/g, '_');
    link.setAttribute('download', `${safeFileName}_Attendance_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${logs.length} attendance records for ${fullName}!`);
  };

  return (
    <div className="space-y-5 text-xs">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
            <span>Student Attendance Roster</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-extrabold border border-emerald-500/20">
              Auto-Logged On Login
            </span>
          </h1>
          <p className="text-muted-foreground text-[11px] mt-0.5">
            Click any student card to view full attendance logs and download individual reports.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-2.5 text-muted-foreground" size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student name or email..."
            className="w-full h-9 pl-9 pr-3 bg-background border border-border rounded-xl outline-none focus:border-primary/50 text-xs shadow-sm"
          />
        </div>
      </div>

      {/* Student Cards Grid View (Minimal Outer Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredStudents.map((student) => {
          const fullName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Student';
          const initials = `${(student.first_name?.[0] || 'S')}${(student.last_name?.[0] || '')}`.toUpperCase();

          return (
            <motion.div
              key={student.id}
              layout
              onClick={() => setSelectedStudent(student)}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="p-4 glass-card rounded-3xl border border-border/80 hover:border-emerald-500/40 flex flex-col justify-between space-y-3 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden bg-gradient-to-b from-card to-card/60 cursor-pointer group"
            >
              {/* Card Header: Avatar & Name & Email */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20 border border-emerald-400/30">
                  {initials}
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <h4 className="font-black text-sm text-foreground truncate group-hover:text-primary transition-colors">
                    {fullName}
                  </h4>
                  <p className="text-[10px] text-muted-foreground truncate font-mono">
                    {student.email}
                  </p>
                </div>
              </div>

              {/* View Action Footer */}
              <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground font-semibold group-hover:text-primary transition-colors">
                <span>View Attendance Logs</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredStudents.length === 0 && (
        <div className="p-12 glass-card rounded-2xl border border-dashed border-border text-center space-y-2">
          <Users className="mx-auto text-muted-foreground/50" size={32} />
          <h4 className="font-bold text-sm text-foreground">No students found</h4>
          <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
            No student records matching your search query.
          </p>
        </div>
      )}

      {/* ── STUDENT ATTENDANCE LOGS DETAIL MODAL (ON CARD CLICK) ───────────────────────── */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-5 relative overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20 border border-emerald-400/40">
                    {`${selectedStudent.first_name?.[0] || 'S'}${selectedStudent.last_name?.[0] || ''}`.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-black text-base text-foreground">
                      {selectedStudent.first_name} {selectedStudent.last_name}
                    </h3>
                    <p className="text-[11px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                      <Mail size={12} />
                      <span>{selectedStudent.email}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedStudent(null)}
                  className="p-1.5 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Attendance Quick Stats inside Modal */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px] flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span>{(selectedStudent.attendance_logs || []).filter(l => l.status === 'PRESENT').length} Days Present</span>
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 font-extrabold text-[11px] flex items-center gap-1.5">
                  <XCircle size={13} className="text-rose-500" />
                  <span>{(selectedStudent.attendance_logs || []).filter(l => l.status === 'ABSENT').length} Days Absent</span>
                </span>
              </div>

              {/* Attendance Log Stream inside Modal */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-extrabold uppercase text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-primary" />
                    <span>Attendance Log Stream</span>
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {(selectedStudent.attendance_logs || []).length} Total Logs
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-border/40">
                  {(selectedStudent.attendance_logs || []).length === 0 ? (
                    <p className="text-[11px] text-muted-foreground italic py-4 text-center">
                      No attendance records registered yet for this student.
                    </p>
                  ) : (
                    (selectedStudent.attendance_logs || []).map((logItem, idx) => (
                      <div key={idx} className="pt-2 flex items-center justify-between text-xs group/log">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-foreground/80">{logItem.date}</span>
                          {logItem.status === 'PRESENT' && logItem.first_login && (
                            <span className="text-[9px] text-muted-foreground font-mono">
                              First Login: {logItem.first_login}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {logItem.status === 'PRESENT' ? (
                            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-black text-[10px] border border-emerald-500/25 flex items-center gap-1">
                              <CheckCircle2 size={11} className="text-emerald-500" />
                              <span>PRESENT</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/10 text-rose-500 font-bold text-[10px] border border-rose-500/20 flex items-center gap-1">
                              <XCircle size={11} className="text-rose-500" />
                              <span>ABSENT</span>
                            </span>
                          )}
                          <button
                            onClick={() => handleDeleteLog(selectedStudent.id, logItem.date)}
                            disabled={isDeleting}
                            className="p-1 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors opacity-0 group-hover/log:opacity-100 disabled:opacity-50"
                            title="Delete Attendance Log"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Download CSV Button Footer inside Modal */}
              <div className="pt-2">
                <button
                  onClick={() => handleExportStudentAttendanceCSV(selectedStudent)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 hover:scale-102 active:scale-98 cursor-pointer"
                >
                  <FileSpreadsheet size={15} />
                  <span>Download Attendance Report (.csv)</span>
                  <Download size={13} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AttendanceTab;
