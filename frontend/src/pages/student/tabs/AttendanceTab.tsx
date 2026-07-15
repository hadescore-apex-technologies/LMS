import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import { Calendar, CheckCircle2, AlertCircle, Clock, BarChart2 } from 'lucide-react';

interface AttendanceResponse {
  present_count: number;
  absent_count: number;
  late_count: number;
  total_days: number;
  attendance_percentage: number;
  records: Array<{
    id: number;
    date: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE';
  }>;
}

export const AttendanceTab: React.FC = () => {
  const { data: attendanceData, isLoading } = useQuery<AttendanceResponse>({
    queryKey: ['student-attendance'],
    queryFn: async () => {
      const res = await api.get('users/profile/attendance/');
      return res.data;
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-muted/40 animate-pulse rounded-2xl border border-border/30" />
          ))}
        </div>
        <div className="h-80 bg-muted/40 animate-pulse rounded-2xl border border-border/30" />
      </div>
    );
  }

  const records = attendanceData?.records || [];

  return (
    <div className="space-y-8 text-xs">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Attendance Ledger</h1>
        <p className="text-muted-foreground text-sm mt-1">Monitor classroom presence logs, punctuality metrics, and overall attendance trends.</p>
      </div>

      {/* Aggregate Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Attendance Ratio', value: `${attendanceData?.attendance_percentage || 100}%`, desc: 'Target: >75%', icon: BarChart2, color: 'text-primary bg-primary/10' },
          { label: 'Days Present', value: `${attendanceData?.present_count || 0} Days`, desc: 'Full active classrooms', icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-500/10' },
          { label: 'Days Tardy', value: `${attendanceData?.late_count || 0} Days`, desc: 'Late joins', icon: Clock, color: 'text-amber-500 bg-amber-500/10' },
          { label: 'Days Absent', value: `${attendanceData?.absent_count || 0} Days`, desc: 'Missed lectures', icon: AlertCircle, color: 'text-destructive bg-destructive/10' }
        ].map((stat, i) => (
          <div key={i} className="p-5 glass-card rounded-2xl flex items-center justify-between shadow-sm cursor-default hover:border-primary/20 transition-all duration-300">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">{stat.label}</span>
              <span className="text-2xl font-bold tracking-tight text-foreground block">{stat.value}</span>
              <span className="text-[10px] text-muted-foreground/80 block font-medium">{stat.desc}</span>
            </div>
            <div className={`p-3 rounded-xl ${stat.color}`}><stat.icon size={18} /></div>
          </div>
        ))}
      </div>

      {/* Detailed logs */}
      <div className="space-y-4">
        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
          <Calendar size={16} className="text-primary" />
          <span>Attendance logs archive</span>
        </h3>

        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="divide-y divide-border">
            {records.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground font-medium">
                No attendance logs registered on the database yet.
              </div>
            ) : (
              records.map(rec => (
                <div key={rec.id} className="p-4 flex items-center justify-between hover:bg-muted/15 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-muted/40 border border-border rounded-xl">
                      <Calendar size={14} className="text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-foreground">{new Date(rec.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h4>
                    </div>
                  </div>

                  <div>
                    {rec.status === 'PRESENT' && (
                      <span className="text-[9px] px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 font-bold uppercase tracking-wider">
                        Attended
                      </span>
                    )}
                    {rec.status === 'LATE' && (
                      <span className="text-[9px] px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-500 font-bold uppercase tracking-wider">
                        Tardy / Late
                      </span>
                    )}
                    {rec.status === 'ABSENT' && (
                      <span className="text-[9px] px-2.5 py-1 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive font-bold uppercase tracking-wider">
                        Absent
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
