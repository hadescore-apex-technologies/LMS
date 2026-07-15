import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { Calendar, Search, CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react';

interface Student {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  attendance_status?: 'PRESENT' | 'ABSENT' | 'LATE' | null;
}

export const AttendanceTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');

  // 1. Fetch Students
  const { data: students = [], isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ['students-attendance-roster', selectedDate],
    queryFn: async () => {
      const res = await api.get('students/', { params: { date: selectedDate } });
      return res.data;
    }
  });

  // Log Attendance Mutation
  const logAttendanceMutation = useMutation({
    mutationFn: async ({ studentId, status }: { studentId: number; status: 'PRESENT' | 'ABSENT' | 'LATE' }) => {
      await api.post(`students/${studentId}/log-attendance/`, {
        date: selectedDate,
        status: status
      });
    },
    onSuccess: () => {
      toast.success('Attendance state saved.');
      queryClient.invalidateQueries({ queryKey: ['students-attendance-roster', selectedDate] });
    },
    onError: () => {
      toast.error('Failed to save attendance record.');
    }
  });

  const filteredStudents = students.filter(s => 
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.first_name.toLowerCase().includes(search.toLowerCase()) ||
    s.last_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Attendance Ledger</h1>
          <p className="text-muted-foreground text-sm mt-1">Audit daily presence parameters and record class attendance checkpoints.</p>
        </div>
      </div>

      {/* Control filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/20 border border-border/50 p-4 rounded-2xl">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Calendar size={15} className="text-primary" />
          <span className="font-bold text-muted-foreground uppercase">Target Date:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-9 px-3 bg-background border border-border rounded-xl outline-none font-semibold focus:border-primary/45"
          />
        </div>

        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-3 text-muted-foreground" size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students..."
            className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-xl outline-none focus:border-primary/45"
          />
        </div>
      </div>

      {/* Roster list */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        {studentsLoading ? (
          <div className="py-20 text-center text-muted-foreground">
            <Loader2 className="animate-spin text-primary mx-auto mb-2" size={20} />
            <span>Loading Roster...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase font-bold text-[10px] tracking-wider bg-muted/20">
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4 text-center">Log Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-foreground">
                      {student.first_name} {student.last_name}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-muted-foreground">
                      {student.email}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => logAttendanceMutation.mutate({ studentId: student.id, status: 'PRESENT' })}
                          className={`px-3 py-1.5 font-bold rounded-xl flex items-center gap-1 transition-all ${
                            student.attendance_status === 'PRESENT'
                              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                          }`}
                        >
                          <CheckCircle2 size={11} />
                          <span>Present</span>
                        </button>
                        <button
                          onClick={() => logAttendanceMutation.mutate({ studentId: student.id, status: 'LATE' })}
                          className={`px-3 py-1.5 font-bold rounded-xl flex items-center gap-1 transition-all ${
                            student.attendance_status === 'LATE'
                              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                              : 'bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-white'
                          }`}
                        >
                          <Clock size={11} />
                          <span>Late</span>
                        </button>
                        <button
                          onClick={() => logAttendanceMutation.mutate({ studentId: student.id, status: 'ABSENT' })}
                          className={`px-3 py-1.5 font-bold rounded-xl flex items-center gap-1 transition-all ${
                            student.attendance_status === 'ABSENT'
                              ? 'bg-destructive text-white shadow-md shadow-destructive/20'
                              : 'bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive hover:text-white'
                          }`}
                        >
                          <XCircle size={11} />
                          <span>Absent</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-muted-foreground font-medium">No students registered in directory.</td>
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
export default AttendanceTab;
