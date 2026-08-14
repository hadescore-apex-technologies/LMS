import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../../services/api';
import { Video, Clock, ExternalLink, CalendarDays, PlayCircle, ArrowLeft, Radio, Sparkles } from 'lucide-react';
import CalendarView from '../../../components/student/CalendarView';
import { UniversalVideoPlayer } from '../../../components/UniversalVideoPlayer';

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
          className="flex items-center gap-2 text-muted-foreground hover:text-cyan-600 font-bold text-xs transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Live Sessions</span>
        </button>
        
        <div className="space-y-1">
          <span className="text-cyan-600 font-extrabold text-[10px] uppercase tracking-wider">{activeRecording.course}</span>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">{activeRecording.title}</h1>
        </div>

        <div className="rounded-3xl overflow-hidden border border-cyan-500/30 shadow-2xl shadow-cyan-950/40 bg-black aspect-video relative group">
          <UniversalVideoPlayer 
            src={activeRecording.url} 
            title={activeRecording.title}
            className="w-full h-full object-cover" 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 text-xs animate-fade-in">
      {/* ── CLEAN COMPACT HEADER ────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white font-black shadow-md shadow-rose-500/20 border border-rose-400">
            <Radio className="animate-pulse" size={18} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
              <span>{liveMode ? 'Live Mentoring Sessions & Doubt Clearing' : 'Course Doubt Clearing Streams'}</span>
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {liveMode 
                ? 'Join interactive live mentoring sessions and access recorded playbacks.' 
                : 'Join live scheduled doubt sessions with mentors.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeLive.length > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>{activeLive.length} Live Now</span>
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full bg-card border border-border/80 text-muted-foreground text-[10px] font-bold">
            {upcomingClasses.length} Scheduled
          </span>
        </div>
      </div>

      {/* ── 2-COLUMN WORKSPACE: CALENDAR & SESSIONS ──────────────────── */}
      <div className="grid gap-3.5 lg:grid-cols-3">
        {/* Calendar Widget */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-xs text-foreground flex items-center gap-1.5">
              <CalendarDays size={14} className="text-cyan-400" />
              <span>Live Schedule Calendar</span>
            </h3>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-sm">
            <CalendarView />
          </div>
        </div>

        {/* Active & Upcoming Schedules Panel */}
        <div className="space-y-2">
          <h3 className="font-extrabold text-xs text-white flex items-center gap-1.5">
            <Radio size={14} className="text-cyan-400" />
            <span>Active & Upcoming Sessions</span>
          </h3>

          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {activeLive.map(lc => (
              <motion.div 
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                key={lc.id} 
                className="p-3.5 rounded-2xl cyber-glass-card border-emerald-500/50 bg-gradient-to-br from-emerald-500/15 via-teal-500/5 to-transparent shadow-lg shadow-emerald-500/15 space-y-2 relative overflow-hidden"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[8px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white tracking-wider flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    <span>BROADCASTING NOW</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <Clock size={10} /> Active
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase font-extrabold text-cyan-400 tracking-wider block">{lc.course_title || 'Apex Course'}</span>
                  <h4 className="font-black text-xs text-white">{lc.title}</h4>
                  {lc.created_by_name && (
                    <span className="text-[10px] text-slate-400 font-semibold block">Mentor: {lc.created_by_name}</span>
                  )}
                </div>

                <a
                  href={lc.meeting_url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold rounded-xl text-center flex items-center justify-center gap-1.5 hover:brightness-110 active:scale-95 shadow-sm shadow-emerald-500/30 transition-all text-xs"
                >
                  <ExternalLink size={12} />
                  <span>Join Session Now</span>
                </a>
              </motion.div>
            ))}

            {upcomingClasses.map(lc => (
              <div key={lc.id} className="p-3 rounded-2xl cyber-glass-card shadow-2xs space-y-2 hover:border-cyan-400 transition-all">
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase font-extrabold text-cyan-400 tracking-wider block">{lc.course_title || 'Apex Course'}</span>
                  <h4 className="font-extrabold text-xs text-white">{lc.title}</h4>
                  {lc.created_by_name && (
                    <span className="text-[10px] text-slate-400 font-semibold block">Mentor: {lc.created_by_name}</span>
                  )}
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono pt-0.5">
                    <Clock size={10} /> {new Date(lc.scheduled_time).toLocaleString()}
                  </span>
                </div>
                <a
                  href={lc.meeting_url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-1 bg-slate-900/80 hover:bg-cyan-600 hover:text-white text-slate-200 font-bold rounded-lg text-center flex items-center justify-center gap-1.5 transition-all text-[11px] border border-cyan-500/30"
                >
                  <span>Room Details</span>
                  <ExternalLink size={11} />
                </a>
              </div>
            ))}

            {upcomingClasses.length === 0 && activeLive.length === 0 && (
              <div className="py-8 text-center text-slate-400 border border-dashed border-slate-700/60 rounded-2xl cyber-glass-card font-medium p-4 text-[11px]">
                No upcoming doubt sessions scheduled right now.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CLASS RECORDINGS & VIDEO REPLAYS (Compact Grid) ──────────── */}
      <div className="space-y-2 pt-1 border-t border-cyan-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-xs text-white flex items-center gap-1.5">
              <PlayCircle size={14} className="text-cyan-400" />
              <span>Class Recordings & Video Replays</span>
            </h3>
            <p className="text-slate-400 text-[10px]">Watch mentor session replays and doubt resolutions anytime.</p>
          </div>
          <span className="text-[10px] font-bold text-cyan-400">{pastClasses.length} Replays</span>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {pastClasses.map(lc => (
            <div key={lc.id} className="p-3 rounded-2xl cyber-glass-card hover:border-cyan-400 transition-all flex flex-col justify-between gap-2 shadow-2xs">
              <div className="space-y-0.5">
                <span className="text-[8px] uppercase font-black text-cyan-400 tracking-wider block">{lc.course_title || 'Apex Course'}</span>
                <h4 className="font-extrabold text-xs text-white truncate">{lc.title}</h4>
                <span className="text-[9px] text-slate-400 flex items-center gap-1 font-mono">
                  <Clock size={9} /> {new Date(lc.scheduled_time).toLocaleDateString()}
                </span>
              </div>
              
              {lc.recording_url ? (
                <button 
                  onClick={() => setActiveRecording({ url: lc.recording_url!, title: lc.title, course: lc.course_title || 'Apex Course' })}
                  className="w-full py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-extrabold text-[11px] flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.3)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                >
                  <PlayCircle size={13} />
                  <span>Watch Playback</span>
                </button>
              ) : (
                <span className="w-full py-1 text-center rounded-lg border border-slate-700/60 bg-slate-900/60 text-slate-400 font-bold text-[9px]">
                  Processing Replay
                </span>
              )}
            </div>
          ))}

          {pastClasses.length === 0 && (
            <div className="col-span-full py-6 text-center text-slate-400 font-medium text-[11px] cyber-glass-card border border-dashed border-slate-700/60 rounded-2xl">
              No class recordings uploaded yet. Recorded sessions will appear here automatically.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
