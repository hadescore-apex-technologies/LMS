import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import { Video, Clock, ExternalLink, CalendarDays } from 'lucide-react';
import CalendarView from '../../../components/student/CalendarView';

interface LiveClass {
  id: number;
  course: number;
  course_title?: string;
  title: string;
  scheduled_time: string;
  meeting_url: string;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED';
}

export const LiveClassesTab: React.FC = () => {
  const { data: liveClasses = [], isLoading } = useQuery<LiveClass[]>({
    queryKey: ['live-classes-timeline'],
    queryFn: async () => {
      const res = await api.get('courses/live/');
      return res.data;
    }
  });

  const upcomingClasses = liveClasses.filter(lc => lc.status !== 'COMPLETED' && new Date(lc.scheduled_time).getTime() > Date.now());
  const activeLive = liveClasses.filter(lc => lc.status === 'LIVE' || (lc.status === 'UPCOMING' && Math.abs(new Date(lc.scheduled_time).getTime() - Date.now()) < 1000 * 60 * 15)); // Started or starts in 15 mins
  const pastClasses = liveClasses.filter(lc => lc.status === 'COMPLETED' || new Date(lc.scheduled_time).getTime() < Date.now());

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-60 bg-muted/40 animate-pulse rounded-2xl border border-border/30" />
        <div className="h-40 bg-muted/40 animate-pulse rounded-2xl border border-border/30" />
      </div>
    );
  }

  return (
    <div className="space-y-8 text-xs">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Live Classrooms</h1>
        <p className="text-muted-foreground text-sm mt-1 font-medium">Join scheduled training webinars, interactive coding events, and Q&A streams.</p>
      </div>

      {/* Grid: Interactive Calendar & Timetable */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar Widget */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-base text-foreground flex items-center gap-2">
            <CalendarDays size={16} className="text-primary" />
            <span>Interactive Timetable</span>
          </h3>
          <CalendarView />
        </div>

        {/* Live / Upcoming Schedules Panel */}
        <div className="space-y-5">
          <h3 className="font-bold text-base text-foreground flex items-center gap-2">
            <Video size={16} className="text-primary" />
            <span>Upcoming Streams</span>
          </h3>

          <div className="space-y-4">
            {activeLive.map(lc => (
              <div key={lc.id} className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 shadow-sm space-y-3 relative overflow-hidden animate-pulse">
                <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-400" />
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-emerald-500 tracking-wide block">{lc.course_title || 'Apex Course'}</span>
                  <h4 className="font-extrabold text-sm text-foreground">{lc.title}</h4>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock size={11} /> Starts in a few minutes</span>
                </div>
                <a
                  href={lc.meeting_url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2 bg-emerald-500 text-white font-bold rounded-xl text-center flex items-center justify-center gap-1 hover:brightness-110 transition-all text-xs"
                >
                  <ExternalLink size={12} />
                  <span>Join Classroom Now</span>
                </a>
              </div>
            ))}

            {upcomingClasses.map(lc => (
              <div key={lc.id} className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-3">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-primary tracking-wide block">{lc.course_title || 'Apex Course'}</span>
                  <h4 className="font-extrabold text-sm text-foreground">{lc.title}</h4>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock size={11} /> {new Date(lc.scheduled_time).toLocaleString()}</span>
                </div>
                <a
                  href={lc.meeting_url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2 bg-secondary border border-border/50 hover:bg-primary hover:text-primary-foreground text-foreground font-semibold rounded-xl text-center flex items-center justify-center gap-1 transition-all text-xs"
                >
                  <span>Room Details</span>
                  <ExternalLink size={11} />
                </a>
              </div>
            ))}

            {upcomingClasses.length === 0 && activeLive.length === 0 && (
              <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl bg-card font-medium">
                No upcoming live classes scheduled.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Past classes list */}
      <div className="space-y-4 pt-4">
        <h3 className="font-bold text-base text-foreground">Concluded Classrooms</h3>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="divide-y divide-border">
            {pastClasses.map(lc => (
              <div key={lc.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-muted/15 transition-colors">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block">{lc.course_title || 'Apex Course'}</span>
                  <h4 className="font-extrabold text-sm">{lc.title}</h4>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock size={10} /> Concluded: {new Date(lc.scheduled_time).toLocaleString()}</span>
                </div>
                <button disabled className="px-4 py-1.5 rounded-xl border border-border/60 bg-muted/30 text-muted-foreground cursor-not-allowed font-semibold text-[10px]">
                  Webinar Ended
                </button>
              </div>
            ))}
            {pastClasses.length === 0 && (
              <div className="py-10 text-center text-muted-foreground font-medium">
                No past live classrooms on record.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
