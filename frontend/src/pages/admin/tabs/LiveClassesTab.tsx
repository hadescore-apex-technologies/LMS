import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit3, Trash2, X, Save, Calendar, Clock, ExternalLink, Users, CheckSquare, Square, Search, PlayCircle, UploadCloud, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveClass {
  id: number;
  title: string;
  course: number;
  course_title?: string;
  scheduled_time: string;
  meeting_url: string;
  recording_url?: string;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED';
  created_by_name?: string;
  students?: number[];
  students_details?: Array<{ id: number; name: string; email: string }>;
}

interface Course {
  id: number;
  title: string;
}

interface Student {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export const LiveClassesTab: React.FC<{ defaultFilter?: 'ALL' | 'UPCOMING' | 'LIVE' | 'COMPLETED' }> = ({ defaultFilter = 'ALL' }) => {
  const isRecordingsView = defaultFilter === 'COMPLETED';
  const queryClient = useQueryClient();

  const getInitialLiveMode = () => {
    try {
      const raw = localStorage.getItem('user');
      const u = (raw && raw !== 'undefined' && raw !== 'null') ? JSON.parse(raw) : null;
      const key = u?.role === 'SUPER_ADMIN' ? 'super_adminLiveMode' : 'staffLiveMode';
      return localStorage.getItem(key) === 'true';
    } catch {
      return false;
    }
  };

  const [isLiveMode, setIsLiveMode] = useState(getInitialLiveMode);

  React.useEffect(() => {
    const handleStorage = () => {
      setIsLiveMode(getInitialLiveMode());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const [liveFilter, setLiveFilter] = useState<'ALL' | 'UPCOMING' | 'LIVE' | 'COMPLETED'>(defaultFilter);

  // Modal States
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [liveTitle, setLiveTitle] = useState('');
  const [liveCourse, setLiveCourse] = useState('');
  const [liveTime, setLiveTime] = useState('');
  const [liveMeetingUrl, setLiveMeetingUrl] = useState('');
  const [liveRecordingUrl, setLiveRecordingUrl] = useState('');
  const [liveStatus, setLiveStatus] = useState<'UPCOMING' | 'LIVE' | 'COMPLETED'>('UPCOMING');
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [editingLiveClass, setEditingLiveClass] = useState<LiveClass | null>(null);

  // 1. Fetch Live Classes
  const { data: liveClasses = [], isLoading } = useQuery<LiveClass[]>({
    queryKey: ['live-classes-list', isLiveMode],
    placeholderData: (prev) => prev,
    staleTime: 0,
    refetchOnMount: true,
    queryFn: async () => {
      const res = await api.get(`courses/live/?live_mode=${isLiveMode}`);
      return res.data;
    }
  });

  // 2. Fetch Courses
  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses-dropdown-list', isLiveMode],
    queryFn: async () => {
      const res = await api.get(`courses/list/?is_mentoring_track=${isLiveMode}`);
      return res.data;
    }
  });

  // 3. Fetch All Students
  const { data: studentsList = [] } = useQuery<Student[]>({
    queryKey: ['admin-students-list', isLiveMode],
    queryFn: async () => {
      const res = await api.get(`students/?live_mode=${isLiveMode}`);
      return Array.isArray(res.data) ? res.data : (res.data.results || []);
    }
  });

  const safeLiveClasses = Array.isArray(liveClasses) ? liveClasses : [];
  const safeCourses = Array.isArray(courses) ? courses : [];
  const safeStudents = Array.isArray(studentsList) ? studentsList : [];

  // Filtered Students list based on search query
  const filteredStudents = safeStudents.filter(st => {
    if (!st) return false;
    const query = studentSearch.toLowerCase().trim();
    if (!query) return true;
    const fullName = `${st.first_name || ''} ${st.last_name || ''}`.toLowerCase();
    return fullName.includes(query) || (st.email || '').toLowerCase().includes(query);
  });

  const isAllSelected = safeStudents.length > 0 && selectedStudentIds.length === safeStudents.length;

  const toggleSelectAll = () => {
    const targetList = studentSearch ? filteredStudents : safeStudents;
    const targetIds = targetList.map(s => s.id);
    const allTargetSelected = targetIds.length > 0 && targetIds.every(id => selectedStudentIds.includes(id));

    if (allTargetSelected) {
      setSelectedStudentIds(selectedStudentIds.filter(id => !targetIds.includes(id)));
    } else {
      const newSet = new Set([...selectedStudentIds, ...targetIds]);
      setSelectedStudentIds(Array.from(newSet));
    }
  };

  const toggleStudent = (id: number) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter(sId => sId !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  React.useEffect(() => {
    if (safeCourses.length > 0 && !liveCourse) {
      setLiveCourse(safeCourses[0].id.toString());
    }
  }, [safeCourses, liveCourse]);

  // Mutations
  const saveLiveClassMutation = useMutation({
    mutationFn: async (overrideData?: { title: string; scheduled_time: string; meeting_url: string, recording_url?: string }) => {
      const finalTitle = overrideData?.title ?? liveTitle;
      const finalTime = overrideData?.scheduled_time ?? liveTime;
      const finalUrl = overrideData?.meeting_url ?? liveMeetingUrl;
      const finalRecordingUrl = overrideData?.recording_url ?? liveRecordingUrl;
      const payload = {
        title: finalTitle,
        course: liveCourse ? Number(liveCourse) : null,
        scheduled_time: finalTime,
        meeting_url: finalUrl,
        recording_url: finalRecordingUrl,
        status: editingLiveClass ? liveStatus : 'UPCOMING',
        students: selectedStudentIds
      };
      if (editingLiveClass) {
        await api.put(`courses/live/${editingLiveClass.id}/`, payload);
      } else {
        await api.post('courses/live/', payload);
      }
    },
    onMutate: async (overrideData) => {
      const courseId = liveCourse ? Number(liveCourse) : null;
      const finalTitle = overrideData?.title ?? liveTitle;
      const finalTime = overrideData?.scheduled_time ?? liveTime;
      const finalUrl = overrideData?.meeting_url ?? liveMeetingUrl;
      const finalRecordingUrl = overrideData?.recording_url ?? liveRecordingUrl;
      const payload = {
        title: finalTitle,
        course: courseId,
        scheduled_time: finalTime,
        meeting_url: finalUrl,
        recording_url: finalRecordingUrl,
        status: editingLiveClass ? liveStatus : 'UPCOMING',
        students: selectedStudentIds
      };
      await queryClient.cancelQueries({ queryKey: ['live-classes-list'] });
      const previousLiveClasses = queryClient.getQueryData<LiveClass[]>(['live-classes-list']);
      
      const newLiveClass: any = {
        id: editingLiveClass ? editingLiveClass.id : Math.random(),
        ...payload,
        course_title: safeCourses.find(c => c.id === courseId)?.title || '',
        created_by_name: 'Me',
        students_details: safeStudents.filter(s => selectedStudentIds.includes(s.id)).map(s => ({
          id: s.id,
          name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.email,
          email: s.email
        }))
      };
      
      queryClient.setQueryData<LiveClass[]>(['live-classes-list'], (old) => {
        if (editingLiveClass) {
          return (old || []).map(lc => lc.id === editingLiveClass.id ? newLiveClass : lc);
        } else {
          return [newLiveClass, ...(old || [])];
        }
      });
      setShowLiveModal(false);
      return { previousLiveClasses };
    },
    onError: (err: any, variables, context) => {
      if (context?.previousLiveClasses) {
        queryClient.setQueryData(['live-classes-list'], context.previousLiveClasses);
      }
      const data = err.response?.data;
      let msg = 'Failed to configure live session.';
      if (data) {
        if (typeof data === 'string') msg = data;
        else if (data.detail) msg = data.detail;
        else if (data.meeting_url) msg = `Meeting URL: ${data.meeting_url[0]}`;
        else if (data.course) msg = `Course: ${data.course[0]}`;
        else if (data.scheduled_time) msg = `Scheduled Time: ${data.scheduled_time[0]}`;
        else if (data.title) msg = `Title: ${data.title[0]}`;
      }
      toast.error(msg);
    },
    onSuccess: () => {
      resetForm();
      toast.success(editingLiveClass ? 'Live session modified.' : 'Live session scheduled.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['live-classes-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
    }
  });

  const deleteLiveClassMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`courses/live/${id}/`);
    },
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['live-classes-list'] });
      const previousLiveClasses = queryClient.getQueryData<LiveClass[]>(['live-classes-list']);
      if (previousLiveClasses) {
        queryClient.setQueryData(['live-classes-list'], previousLiveClasses.filter(lc => lc.id !== id));
      }
      return { previousLiveClasses };
    },
    onError: (err, id, context) => {
      if (context?.previousLiveClasses) {
        queryClient.setQueryData(['live-classes-list'], context.previousLiveClasses);
      }
      toast.error('Failed to delete live class.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['live-classes-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
      toast.success('Live class session deleted.');
    }
  });

  const formatDateTimeLocal = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const tzoffset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
    } catch {
      return '';
    }
  };

  const openEdit = (lc: LiveClass) => {
    if (!lc) return;
    setEditingLiveClass(lc);
    setLiveTitle(lc.title || '');
    setLiveCourse(lc.course ? lc.course.toString() : '');
    setLiveTime(formatDateTimeLocal(lc.scheduled_time));
    setLiveMeetingUrl(lc.meeting_url || '');
    setLiveRecordingUrl(lc.recording_url || '');
    setLiveStatus(lc.status || 'UPCOMING');
    setSelectedStudentIds(Array.isArray(lc.students) ? lc.students : (lc.students_details ? lc.students_details.map(s => s.id) : []));
    setStudentSearch('');
    setShowLiveModal(true);
  };

  const resetForm = () => {
    setLiveTitle('');
    setLiveCourse(safeCourses.length > 0 ? safeCourses[0].id.toString() : '');
    setLiveTime('');
    setLiveMeetingUrl('');
    setLiveRecordingUrl('');
    setLiveStatus('UPCOMING');
    setSelectedStudentIds([]);
    setStudentSearch('');
    setEditingLiveClass(null);
  };

  const filteredLive = safeLiveClasses.filter(l => {
    if (!l) return false;
    return liveFilter === 'ALL' ? true : l.status === liveFilter;
  });

  return (
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {isRecordingsView 
              ? 'Recorded Sessions Catalog' 
              : (isLiveMode ? 'Live Mentoring Sessions Hub' : 'Course Doubt Clearing Sessions Hub')}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isRecordingsView 
              ? 'Browse and manage your uploaded live session recordings in a beautiful catalog.' 
              : (isLiveMode 
                  ? 'Schedule live mentoring classes specifically for assigned live mentees with zero course dependency.' 
                  : 'Schedule and manage course-specific live doubt clearing webinars for enrolled course students.')}
          </p>
          <span className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shadow-xs ${
            isLiveMode 
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60' 
              : 'bg-primary/10 text-primary border-primary/25'
          }`}>
            <Video size={11} className={isLiveMode ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'} />
            {isLiveMode ? 'Live Class Mode — Dedicated Mentoring' : 'Course Mode — Doubt Clearing Webinars'}
          </span>
        </div>

        {!isRecordingsView && !isLiveMode && (
          <button
            onClick={() => {
              resetForm();
              setShowLiveModal(true);
            }}
            className="px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all text-xs"
          >
            <Plus size={15} />
            <span>Schedule Doubt Session</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      {!isRecordingsView && (
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
      )}

      {/* Grid List */}
      <div className={`grid gap-6 ${isRecordingsView ? 'sm:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'}`}>
        {filteredLive.map(lc => {
          if (isRecordingsView) {
            return (
              <div key={lc.id} className="group rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative flex flex-col">
                {/* Thumbnail Header */}
                <div className="h-40 bg-muted/60 relative flex items-center justify-center border-b border-border shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent" />
                  <PlayCircle size={48} className="text-primary/40 group-hover:text-primary transition-colors group-hover:scale-110 duration-300" />
                  <div className="absolute top-3 right-3 bg-card/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-border text-[10px] font-bold">
                    {new Date(lc.scheduled_time).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="p-5 flex flex-col flex-1 justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-extrabold uppercase tracking-widest truncate">
                        {lc.course_title || 'General Session'}
                      </span>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => openEdit(lc)} className="p-1.5 bg-muted rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors" title="Edit"><Edit3 size={12}/></button>
                        <button onClick={() => { if (window.confirm('Delete recording?')) deleteLiveClassMutation.mutate(lc.id); }} className="p-1.5 bg-destructive/10 rounded-lg text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors" title="Delete"><Trash2 size={12}/></button>
                      </div>
                    </div>
                    
                    <h3 className="font-extrabold text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">{lc.title}</h3>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mt-1">
                      <Users size={12} className="text-primary/60 shrink-0" />
                      <span className="truncate">{lc.students_details && lc.students_details.length > 0 ? `${lc.students_details.length} Students Assigned` : 'Open to All Enrolled'}</span>
                    </div>
                  </div>

                  {lc.recording_url ? (
                    <a
                      href={lc.recording_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex items-center justify-center gap-1.5 w-full py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all"
                    >
                      <PlayCircle size={14} />
                      <span>Play Recording</span>
                    </a>
                  ) : (
                    <button
                      onClick={() => openEdit(lc)}
                      className="mt-2 flex items-center justify-center gap-1.5 w-full py-2.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-xl text-xs font-bold hover:bg-amber-500 hover:text-white transition-all"
                    >
                      <UploadCloud size={14} />
                      <span>Upload Recording Link</span>
                    </button>
                  )}
                </div>
              </div>
            );
          }

          return (
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
              <span className="text-[10px] text-muted-foreground font-semibold mt-1 block">{lc.course_title || `Course Track: None`}</span>
              {lc.created_by_name && (
                <span className="text-[10px] text-primary/80 font-bold block mt-1">Host/Creator: {lc.created_by_name}</span>
              )}
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

              {/* Allotted Students Details */}
              <div className="mt-4 pt-3 border-t border-border/60">
                <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Users size={12} className="text-primary" />
                  <span>Allotted Students ({lc.students_details ? lc.students_details.length.toLocaleString() : 'All'}):</span>
                </div>
                {lc.students_details && lc.students_details.length > 0 ? (
                  lc.students_details.length <= 4 ? (
                    <div className="flex flex-wrap gap-1">
                      {lc.students_details.map(st => (
                        <span key={st.id} className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-semibold border border-primary/20">
                          {st.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-bold border border-primary/20">
                        {lc.students_details.length.toLocaleString()} Target Students Selected
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        ({lc.students_details.slice(0, 2).map(s => s.name).join(', ')} +{lc.students_details.length - 2} more)
                      </span>
                    </div>
                  )
                ) : (
                  <span className="text-[10px] text-muted-foreground font-medium italic">
                    All Enrolled Students
                  </span>
                )}
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
            {lc.status === 'COMPLETED' && lc.recording_url && (
              <a
                href={lc.recording_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 flex items-center justify-center gap-1.5 w-full py-2.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white rounded-xl text-xs font-bold transition-all"
              >
                <ExternalLink size={13} />
                <span>Watch Recording</span>
              </a>
            )}
          </div>
        )})}
        {filteredLive.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground bg-card border border-dashed border-border rounded-2xl flex flex-col items-center justify-center p-8 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Video size={28} />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="font-extrabold text-base text-foreground">
                {isLiveMode ? 'No Live Mentoring Sessions Yet' : 'No Doubt Clearing Sessions Yet'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isLiveMode 
                  ? 'Schedule live classes and 1-on-1 mentoring sessions for your assigned live students.' 
                  : 'Schedule course-specific doubt clearing webinars with Google Meet or Zoom links for enrolled students.'}
              </p>
            </div>
            {!isRecordingsView && !isLiveMode && (
              <button
                onClick={() => {
                  resetForm();
                  setShowLiveModal(true);
                }}
                className="px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all text-xs mt-2"
              >
                <Plus size={15} />
                <span>Schedule First Doubt Session</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Schedule Live Class Modal */}
      <AnimatePresence>
        {showLiveModal && (
          <div onClick={() => setShowLiveModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-bold text-sm">
                  {editingLiveClass 
                    ? 'Modify Session' 
                    : (isLiveMode ? 'Schedule Dedicated Live Mentoring Class' : 'Schedule Course Doubt Clearing Session')}
                </h3>
                <button onClick={() => setShowLiveModal(false)}><X size={16} /></button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const titleVal = ((formData.get('title') as string) || liveTitle).trim();
                const timeVal = (formData.get('scheduled_time') as string) || liveTime;
                const urlVal = ((formData.get('meeting_url') as string) || liveMeetingUrl).trim();
                const recordingUrlVal = ((formData.get('recording_url') as string) || liveRecordingUrl).trim();

                if (!titleVal) {
                  toast.error("Please enter session title.");
                  return;
                }
                if (!timeVal) {
                  toast.error("Please select meeting date & time.");
                  return;
                }
                if (!urlVal) {
                  toast.error("Please enter meeting URL link.");
                  return;
                }

                saveLiveClassMutation.mutate({
                  title: titleVal,
                  scheduled_time: timeVal,
                  meeting_url: urlVal,
                  recording_url: recordingUrlVal
                });
              }} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Session Title *</label>
                  <input name="title" type="text" value={liveTitle} onChange={(e) => setLiveTitle(e.target.value)} required placeholder="e.g. Live Doubt Clearing & Q&A Stream" className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                </div>

                {/* Target Student Selection with Search & Scroll */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                      <Users size={12} className="text-primary" />
                      <span>Allot to Students ({selectedStudentIds.length} Selected)</span>
                    </label>
                    {studentsList.length > 0 && (
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        {isAllSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                        <span>Select All {studentSearch ? `Filtered (${filteredStudents.length})` : `(${studentsList.length})`}</span>
                      </button>
                    )}
                  </div>

                  {/* Search Bar for Students */}
                  {studentsList.length > 0 && (
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search student by name or email..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="w-full h-8 pl-8 pr-7 bg-muted/40 border border-border rounded-lg text-xs outline-none focus:border-primary transition-all"
                      />
                      {studentSearch && (
                        <button
                          type="button"
                          onClick={() => setStudentSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Scrollable Container */}
                  <div className="max-h-48 overflow-y-auto border border-border rounded-xl bg-muted/20 p-2 space-y-1.5">
                    {filteredStudents.map(st => {
                      const isChecked = selectedStudentIds.includes(st.id);
                      const studentName = `${st.first_name} ${st.last_name}`.trim() || st.email;
                      return (
                        <div
                          key={st.id}
                          onClick={() => toggleStudent(st.id)}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-primary/10 border-primary/40 text-foreground font-semibold'
                              : 'border-border/50 hover:bg-muted/40 text-muted-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                            />
                            <span className="truncate">{studentName}</span>
                          </div>
                          <span className="text-[10px] opacity-70 ml-2">{st.email}</span>
                        </div>
                      );
                    })}
                    {studentsList.length === 0 && (
                      <p className="text-center py-4 text-[11px] text-muted-foreground">
                        No students found.
                      </p>
                    )}
                    {studentsList.length > 0 && filteredStudents.length === 0 && (
                      <p className="text-center py-4 text-[11px] text-muted-foreground">
                        No students matching "{studentSearch}".
                      </p>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    * Check specific students or use "Select All". If no students are checked, session will be accessible to all students.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Meeting Date & Time *</label>
                  <input name="scheduled_time" type="datetime-local" value={liveTime} onChange={(e) => setLiveTime(e.target.value)} required className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Meeting URL Link *</label>
                  <input name="meeting_url" type="text" value={liveMeetingUrl} onChange={(e) => setLiveMeetingUrl(e.target.value)} required placeholder="https://zoom.us/j/... or meet.google.com/..." className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
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
                {liveStatus === 'COMPLETED' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <label className="block text-[10px] text-primary uppercase mb-1 font-bold">Class Recording URL</label>
                    <input name="recording_url" type="text" value={liveRecordingUrl} onChange={(e) => setLiveRecordingUrl(e.target.value)} placeholder="https://youtube.com/... or Google Drive Link" className="w-full h-10 px-3 bg-primary/5 border border-primary/20 rounded-xl outline-none focus:border-primary/50" />
                  </motion.div>
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
