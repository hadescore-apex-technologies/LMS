import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import { Video, Clock, ExternalLink, CalendarDays, PlayCircle, ArrowLeft } from 'lucide-react';
import CalendarView from '../../../components/student/CalendarView';

interface LiveClass {
  id: number;
  course: number;
  course_title?: string;
  title: string;
  scheduled_time: string;
  meeting_url: string;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED';
  created_by_name?: string;
  recording_url?: string;
}

export const LiveClassesTab: React.FC = () => {
  const [activeRecording, setActiveRecording] = React.useState<{ url: string; title: string, course: string } | null>(null);
  const [liveMode, setLiveMode] = React.useState(localStorage.getItem('studentLiveMode') === 'true');

  React.useEffect(() => {
    const handleStorage = () => {
      setLiveMode(localStorage.getItem('studentLiveMode') === 'true');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const { data: liveClasses = [] } = useQuery<LiveClass[]>({
    queryKey: ['live-classes-timeline', liveMode],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const res = await api.get(`courses/live/?live_mode=${liveMode}`);
      return res.data;
    }
  });

  const activeLive = liveClasses.filter(lc => lc.status === 'LIVE' || (lc.status === 'UPCOMING' && Math.abs(new Date(lc.scheduled_time).getTime() - Date.now()) < 1000 * 60 * 30));
  const upcomingClasses = liveClasses.filter(lc => lc.status === 'UPCOMING' && !activeLive.some(a => a.id === lc.id));
  const pastClasses = liveClasses.filter(lc => lc.status === 'COMPLETED' || Boolean(lc.recording_url));

  if (activeRecording) {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => setActiveRecording(null)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-semibold text-xs"
        >
          <ArrowLeft size={14} />
          <span>Back to Live Sessions</span>
        </button>
        
        <div>
          <h1 className="text-2xl font-black tracking-tight">{activeRecording.title}</h1>
          <p className="text-primary font-bold text-[11px] uppercase tracking-wider">{activeRecording.course}</p>
        </div>

        <div className="rounded-3xl overflow-hidden border border-border shadow-xl bg-black aspect-video relative group">
          {activeRecording.url.includes('youtube') || activeRecording.url.includes('youtu.be') ? (
            <iframe 
              src={activeRecording.url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')} 
              className="w-full h-full" 
              allowFullScreen
            />
          ) : (
            <video 
              src={activeRecording.url} 
              controls 
              autoPlay 
              className="w-full h-full object-cover"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-xs">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          {liveMode ? 'Live Mentoring Sessions' : 'Course Doubt Clearing Sessions'}
        </h1>
        <p className="text-muted-foreground text-sm mt-1 font-medium">
          {liveMode 
            ? 'Join scheduled 1-on-1 and batch live mentoring sessions conducted by your assigned staff mentor.' 
            : 'Join course-specific doubt clearing live streams and Q&A sessions mapped to your enrolled courses.'}
        </p>
        <span className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
          liveMode 
            ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-700/50' 
            : 'bg-primary/10 text-primary border-primary/25'
        }`}>
          <Video size={11} />
          {liveMode ? 'Live Class Mode — Dedicated Mentoring' : 'Course Mode — Doubt Clearing Webinars'}
        </span>
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
            <span>Upcoming Q&A Sessions</span>
          </h3>

          <div className="space-y-4">
            {activeLive.map(lc => (
              <div key={lc.id} className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 shadow-sm space-y-3 relative overflow-hidden animate-pulse">
                <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-400" />
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-emerald-500 tracking-wide block">{lc.course_title || 'Apex Course'}</span>
                  <h4 className="font-extrabold text-sm text-foreground">{lc.title}</h4>
                  {lc.created_by_name && (
                    <span className="text-[10px] text-emerald-600 font-bold block">Mentor: {lc.created_by_name}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock size={11} /> Starts in a few minutes</span>
                </div>
                <a
                  href={lc.meeting_url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2 bg-emerald-500 text-white font-bold rounded-xl text-center flex items-center justify-center gap-1 hover:brightness-110 transition-all text-xs"
                >
                  <ExternalLink size={12} />
                  <span>Join Doubt Session Now</span>
                </a>
              </div>
            ))}

            {upcomingClasses.map(lc => (
              <div key={lc.id} className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-3">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-primary tracking-wide block">{lc.course_title || 'Apex Course'}</span>
                  <h4 className="font-extrabold text-sm text-foreground">{lc.title}</h4>
                  {lc.created_by_name && (
                    <span className="text-[10px] text-primary/80 font-bold block">Mentor: {lc.created_by_name}</span>
                  )}
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
                No upcoming doubt clearing sessions scheduled.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Past classes and recordings list */}
      <div className="space-y-4 pt-4">
        <div>
          <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
            <PlayCircle size={16} className="text-primary" />
            <span>Class Recordings & Video Replays</span>
          </h3>
          <p className="text-muted-foreground text-[11px] mt-0.5">Watch recorded mentor sessions, live class replays, and doubt resolutions anytime.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="divide-y divide-border">
            {pastClasses.map(lc => (
              <div key={lc.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-muted/15 transition-colors">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block">{lc.course_title || 'Apex Course'}</span>
                  <h4 className="font-extrabold text-sm">{lc.title}</h4>
                  {lc.created_by_name && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">Mentor: {lc.created_by_name}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock size={10} /> Session Time: {new Date(lc.scheduled_time).toLocaleString()}</span>
                </div>
                {lc.recording_url ? (
                  <button 
                    onClick={() => setActiveRecording({ url: lc.recording_url!, title: lc.title, course: lc.course_title || 'Apex Course' })}
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 shadow-md shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
                  >
                    <PlayCircle size={14} />
                    <span>Watch Recording</span>
                  </button>
                ) : (
                  <span className="px-3 py-1 rounded-xl border border-border/60 bg-muted/30 text-muted-foreground font-semibold text-[10px]">
                    Recording Processing
                  </span>
                )}
              </div>
            ))}
            {pastClasses.length === 0 && (
              <div className="py-12 text-center text-muted-foreground font-medium space-y-1">
                <PlayCircle size={24} className="mx-auto opacity-20 text-primary" />
                <p>No class recordings uploaded yet. Recorded sessions will appear here automatically.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
