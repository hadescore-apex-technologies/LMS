import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit3, Trash2, X, Save, Calendar, Clock, ExternalLink, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveClass {
  id: number;
  title: string;
  course: number;
  course_title?: string;
  scheduled_time: string;
  meeting_url: string;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED';
}

interface Course {
  id: number;
  title: string;
}

export const LiveClassesTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [liveFilter, setLiveFilter] = useState<'ALL' | 'UPCOMING' | 'LIVE' | 'COMPLETED'>('ALL');

  // Modal States
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [liveTitle, setLiveTitle] = useState('');
  const [liveCourse, setLiveCourse] = useState('');
  const [liveTime, setLiveTime] = useState('');
  const [liveMeetingUrl, setLiveMeetingUrl] = useState('');
  const [liveStatus, setLiveStatus] = useState<'UPCOMING' | 'LIVE' | 'COMPLETED'>('UPCOMING');
  const [editingLiveClass, setEditingLiveClass] = useState<LiveClass | null>(null);

  // 1. Fetch Live Classes
  const { data: liveClasses = [], isLoading } = useQuery<LiveClass[]>({
    queryKey: ['live-classes-list'],
    queryFn: async () => {
      const res = await api.get('courses/live/');
      return res.data;
    }
  });

  // 2. Fetch Courses
  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses-dropdown-list'],
    queryFn: async () => {
      const res = await api.get('courses/list/');
      return res.data;
    }
  });

  // Mutations
  const saveLiveClassMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: liveTitle,
        course: Number(liveCourse),
        scheduled_time: liveTime,
        meeting_url: liveMeetingUrl,
        status: editingLiveClass ? liveStatus : 'UPCOMING'
      };
      if (editingLiveClass) {
        await api.put(`courses/live/${editingLiveClass.id}/`, payload);
      } else {
        await api.post('courses/live/', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-classes-list'] });
      setShowLiveModal(false);
      resetForm();
      toast.success(editingLiveClass ? 'Live session modified.' : 'Live session scheduled.');
    },
    onError: () => {
      toast.error('Failed to configure live session.');
    }
  });

  const deleteLiveClassMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`courses/live/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-classes-list'] });
      toast.success('Live class session deleted.');
    },
    onError: () => {
      toast.error('Failed to delete live class.');
    }
  });

  const formatDateTimeLocal = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const tzoffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
  };

  const openEdit = (lc: LiveClass) => {
    setEditingLiveClass(lc);
    setLiveTitle(lc.title);
    setLiveCourse(lc.course.toString());
    setLiveTime(formatDateTimeLocal(lc.scheduled_time));
    setLiveMeetingUrl(lc.meeting_url);
    setLiveStatus(lc.status);
    setShowLiveModal(true);
  };

  const resetForm = () => {
    setLiveTitle('');
    setLiveCourse('');
    setLiveTime('');
    setLiveMeetingUrl('');
    setLiveStatus('UPCOMING');
    setEditingLiveClass(null);
  };

  const filteredLive = liveFilter === 'ALL' ? liveClasses : liveClasses.filter(l => l.status === liveFilter);

  return (
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Live Class Scheduler</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure interactive webinars, map learning streams, and direct access URL logs.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowLiveModal(true); }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-md transition-all hover:brightness-110 active:scale-95"
        >
          <Plus size={14} />
          <span>Schedule Live Class</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['ALL', 'UPCOMING', 'LIVE', 'COMPLETED'] as const).map(f => (
          <button
            key={f}
            onClick={() => setLiveFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${liveFilter === f ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/60 text-muted-foreground hover:bg-muted'}`}
          >
            {f === 'ALL' ? 'All Sessions' : f.charAt(0) + f.slice(1).toLowerCase()}
            {f !== 'ALL' && <span className="ml-1 opacity-70">({liveClasses.filter(l => l.status === f).length})</span>}
          </button>
        ))}
      </div>

      {/* Grid List */}
      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">
          <Loader2 className="animate-spin text-primary mx-auto mb-2" size={20} />
          <span>Syncing Live Rooms...</span>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredLive.map(lc => (
            <div key={lc.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider ${lc.status === 'LIVE' ? 'bg-red-500/10 text-red-500 animate-pulse' : lc.status === 'UPCOMING' ? 'bg-amber-500/10 text-amber-500' : 'bg-muted text-muted-foreground'}`}>
                    {lc.status === 'LIVE' && '● '} {lc.status}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openEdit(lc)} className="p-1.5 hover:bg-muted border border-transparent rounded-lg text-muted-foreground hover:text-foreground" title="Edit"><Edit3 size={13} /></button>
                    <button onClick={() => { if (window.confirm('Delete Live webinar room?')) deleteLiveClassMutation.mutate(lc.id); }} className="p-1.5 hover:bg-destructive/10 border border-transparent rounded-lg text-muted-foreground hover:text-destructive" title="Delete"><Trash2 size={13} /></button>
                  </div>
                </div>
                <h3 className="font-bold text-base leading-snug">{lc.title}</h3>
                <span className="text-[10px] text-muted-foreground font-semibold mt-1 block">Course ID: {lc.course}</span>

                <div className="space-y-1.5 text-xs text-muted-foreground mt-4">
                  <div className="flex items-center gap-2 font-medium">
                    <Calendar size={12} className="text-primary" />
                    <span>Scheduled Date: {new Date(lc.scheduled_time).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-2 font-medium">
                    <Clock size={12} className="text-primary" />
                    <span>Scheduled Time: {new Date(lc.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>

              {lc.status !== 'COMPLETED' && (
                <a
                  href={lc.meeting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 flex items-center justify-center gap-1.5 w-full py-2.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground rounded-xl text-xs font-bold transition-all"
                >
                  <ExternalLink size={13} />
                  <span>Open Meeting Link</span>
                </a>
              )}
            </div>
          ))}
          {filteredLive.length === 0 && (
            <div className="col-span-full py-16 text-center text-muted-foreground bg-card border border-dashed border-border rounded-2xl">
              No live classroom streams found matching the selection.
            </div>
          )}
        </div>
      )}

      {/* Schedule Live Class Modal */}
      <AnimatePresence>
        {showLiveModal && (
          <div onClick={() => setShowLiveModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-bold text-sm">{editingLiveClass ? 'Modify Webinar' : 'Schedule Webinar Session'}</h3>
                <button onClick={() => setShowLiveModal(false)}><X size={16} /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); saveLiveClassMutation.mutate(); }} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Session Title *</label>
                  <input type="text" value={liveTitle} onChange={(e) => setLiveTitle(e.target.value)} required placeholder="e.g. Django Advanced ORM Optimization" className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Course Track Mapping *</label>
                  <select value={liveCourse} onChange={(e) => setLiveCourse(e.target.value)} required className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none">
                    <option value="">Choose Course</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Meeting Date & Time *</label>
                  <input type="datetime-local" value={liveTime} onChange={(e) => setLiveTime(e.target.value)} required className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Meeting URL Link *</label>
                  <input type="url" value={liveMeetingUrl} onChange={(e) => setLiveMeetingUrl(e.target.value)} required placeholder="https://zoom.us/j/..." className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                </div>
                {editingLiveClass && (
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Active Status</label>
                    <select value={liveStatus} onChange={(e) => setLiveStatus(e.target.value as any)} required className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none">
                      <option value="UPCOMING">Upcoming</option>
                      <option value="LIVE">Live</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                )}
                <button type="submit" disabled={saveLiveClassMutation.isPending} className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-primary/10">
                  <Save size={12} />
                  <span>{editingLiveClass ? 'Save Changes' : 'Schedule webinar'}</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default LiveClassesTab;
