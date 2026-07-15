import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { 
  HelpCircle, Upload, Download, Trash2, 
  FileText, Award, 
  ClipboardList, Loader2, X, AlertCircle
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

interface Course {
  id: number;
  title: string;
  description: string;
}

interface Module {
  id: number;
  course: number;
  title: string;
  order: number;
}

interface Lesson {
  id: number;
  module: number;
  title: string;
  content: string;
  thumbnail?: string;
  cf_stream_id?: string;
  video_status?: string;
  pdf_ppt_url?: string;
  zip_source_url?: string;
  external_links?: string[];
  additional_notes?: string;
  faqs?: { q: string; a: string }[];
  estimated_duration?: number;
  locked?: boolean;
  completed?: boolean;
  resume_time?: number;
}

interface Quiz {
  id: number;
  module: number;
  title: string;
  passing_score: number;
  max_retries?: number;
  questions: { id: number; question_text: string; question_type: string; options: string[] }[];
}

interface Assignment {
  id: number;
  module: number;
  category: number;
  title: string;
  description: string;
  file_attachment?: string;
  due_date?: string;
}

interface CoursePlayerProps {
  course: Course;
  onBack: () => void;
  onOpenAITutor: (lessonId: number | null, courseId: number) => void;
}

export const CoursePlayer: React.FC<CoursePlayerProps> = ({ course, onBack, onOpenAITutor }) => {
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);

  // States
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizResult, setQuizResult] = useState<any>(null);
  const [quizTimeLeft, setQuizTimeLeft] = useState<number | null>(null);

  const [fileUrl, setFileUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submittingFile, setSubmittingFile] = useState(false);

  const [activeTab, setActiveTab] = useState<'content' | 'attachments' | 'links' | 'notes' | 'faqs' | 'bookmarks' | 'study-notes'>('content');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [autoplayNext, setAutoplayNext] = useState(true);

  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(100);

  const [newBookmarkNote, setNewBookmarkNote] = useState('');
  const [newNoteText, setNewNoteText] = useState('');

  // 1. Fetch Course Modules
  const { data: modules = [] } = useQuery<Module[]>({
    queryKey: ['modules', course.id],
    queryFn: async () => {
      const res = await api.get(`modules/?course=${course.id}`);
      return res.data;
    }
  });

  // 2. Fetch Lessons
  const { data: lessons = [], refetch: refetchLessons } = useQuery<Lesson[]>({
    queryKey: ['lessons', course.id],
    queryFn: async () => {
      const res = await api.get(`lessons/?course=${course.id}`);
      return res.data;
    }
  });

  // 3. Fetch Quizzes
  const { data: courseQuizzes = [] } = useQuery<Quiz[]>({
    queryKey: ['quizzes', course.id],
    queryFn: async () => {
      const res = await api.get(`quizzes/list/?course=${course.id}`);
      return res.data;
    }
  });

  // 4. Fetch Quiz Attempts
  const { data: quizAttempts = [], refetch: refetchAttempts } = useQuery<any[]>({
    queryKey: ['quiz-attempts'],
    queryFn: async () => {
      const res = await api.get('quizzes/attempts/');
      return res.data;
    }
  });

  // 5. Fetch Assignments
  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ['assignments', course.id],
    queryFn: async () => {
      const res = await api.get(`assignments/list/?course=${course.id}`);
      return res.data;
    }
  });

  // 6. Fetch Submissions
  const { data: submissions = [], refetch: refetchSubmissions } = useQuery<any[]>({
    queryKey: ['submissions'],
    queryFn: async () => {
      const res = await api.get('assignments/submissions/');
      return res.data;
    }
  });

  // 7. Fetch Lesson Bookmarks
  const { data: bookmarks = [], refetch: refetchBookmarks } = useQuery<any[]>({
    queryKey: ['bookmarks', activeLesson?.id],
    enabled: !!activeLesson,
    queryFn: async () => {
      const res = await api.get(`lessons/bookmarks/?lesson=${activeLesson?.id}`);
      return res.data;
    }
  });

  // 8. Fetch Lesson Study Notes
  const { data: notesList = [], refetch: refetchNotes } = useQuery<any[]>({
    queryKey: ['lesson-notes', activeLesson?.id],
    enabled: !!activeLesson,
    queryFn: async () => {
      const res = await api.get(`lessons/notes/?lesson=${activeLesson?.id}`);
      return res.data;
    }
  });

  // Auto-select first uncompleted lesson
  useEffect(() => {
    if (lessons.length > 0 && !activeLesson && !activeQuiz && !activeAssignment) {
      const firstUncompleted = lessons.find(l => !l.completed && !l.locked);
      setActiveLesson(firstUncompleted || lessons[0]);
    }
  }, [lessons, activeLesson, activeQuiz, activeAssignment]);

  // Quiz timer count down
  useEffect(() => {
    if (quizTimeLeft === null) return;
    if (quizTimeLeft <= 0) {
      toast.error('Quiz timer expired! Auto-submitting.');
      handleQuizSubmit();
      return;
    }
    const timer = setTimeout(() => setQuizTimeLeft(quizTimeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [quizTimeLeft]);

  // Sync Progress Mutation
  const syncProgressMutation = useMutation({
    mutationFn: async ({ current, pct, completed }: { current: number; pct: number; completed: boolean }) => {
      if (!activeLesson) return;
      await api.post(`lessons/${activeLesson.id}/progress/`, {
        completed,
        resume_time: current,
        watch_percentage: pct,
        watch_time: Math.floor(current)
      });
    },
    onSuccess: (_, variables) => {
      if (variables.completed) {
        refetchLessons();
        queryClient.invalidateQueries({ queryKey: ['certificates'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['user-achievements'] });
      }
    }
  });

  const handleTimeUpdate = () => {
    if (!videoRef.current || !activeLesson) return;
    const currentTime = videoRef.current.currentTime;
    const duration = videoRef.current.duration || 1;
    const pct = (currentTime / duration) * 100;
    
    setVideoProgress(currentTime);
    if (duration > 1) {
      setVideoDuration(duration);
    }
    
    if (Math.floor(currentTime) % 10 === 0) {
      syncProgressMutation.mutate({ current: currentTime, pct, completed: false });
    }
  };

  const handleVideoEnded = () => {
    if (!activeLesson) return;
    toast.success('Lesson completed!');
    syncProgressMutation.mutate({ current: videoDuration, pct: 100, completed: true });

    if (autoplayNext) {
      const currentIdx = lessons.findIndex(l => l.id === activeLesson.id);
      const nextLes = lessons.slice(currentIdx + 1).find(l => !l.locked);
      if (nextLes) {
        toast.loading(`Next up: ${nextLes.title}`, { duration: 2000 });
        setTimeout(() => handleSelectLesson(nextLes), 2000);
      }
    }
  };

  const handleSelectLesson = (lesson: Lesson) => {
    if (lesson.locked) {
      toast.error('This lesson is currently locked.');
      return;
    }
    setActiveLesson(lesson);
    setActiveQuiz(null);
    setActiveAssignment(null);
  };

  // Bookmark Mutation
  const addBookmarkMutation = useMutation({
    mutationFn: async () => {
      if (!activeLesson) return;
      await api.post('lessons/bookmarks/', {
        lesson: activeLesson.id,
        position_seconds: videoProgress,
        note: newBookmarkNote || 'Bookmark Point'
      });
    },
    onSuccess: () => {
      refetchBookmarks();
      setNewBookmarkNote('');
      toast.success('Bookmark saved.');
    }
  });

  // Note Mutation
  const addNoteMutation = useMutation({
    mutationFn: async () => {
      if (!activeLesson) return;
      await api.post('lessons/notes/', {
        lesson: activeLesson.id,
        text: newNoteText
      });
    },
    onSuccess: () => {
      refetchNotes();
      setNewNoteText('');
      toast.success('Note saved.');
    }
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`lessons/notes/${id}/`);
    },
    onSuccess: () => {
      refetchNotes();
      toast.success('Note removed.');
    }
  });

  // Quiz submission
  const handleQuizSubmit = async () => {
    if (!activeQuiz) return;
    try {
      const formattedAnswers = activeQuiz.questions.map(q => ({
        question_id: q.id,
        answer: quizAnswers[q.id] || ""
      }));

      const res = await api.post(`quizzes/list/${activeQuiz.id}/submit/`, {
        answers: formattedAnswers
      });

      setQuizResult({
        correct: res.data.correct_count,
        total: res.data.total_questions,
        passed: res.data.passed,
        score: res.data.score,
        passingScore: res.data.passing_score
      });

      refetchAttempts();
      refetchLessons();
      setActiveQuiz(null);
      setQuizAnswers({});
      setQuizTimeLeft(null);
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['user-achievements'] });
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit quiz.');
    }
  };

  // Assignment upload deliverable
  const handleAssignmentSubmit = async () => {
    if (!activeAssignment || !fileUrl.trim()) {
      toast.error('Please upload a file first.');
      return;
    }
    setSubmittingFile(true);
    try {
      await api.post('assignments/submissions/', {
        assignment: activeAssignment.id,
        file_submission: fileUrl,
        notes: notes
      });
      toast.success('Assignment submitted!');
      setFileUrl('');
      setNotes('');
      refetchSubmissions();
      refetchLessons();
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['user-achievements'] });
    } catch {
      toast.error('Failed to submit assignment.');
    } finally {
      setSubmittingFile(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setSubmittingFile(true);
    try {
      const res = await api.post('core/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFileUrl(res.data.url);
      toast.success('File uploaded.');
    } catch {
      toast.error('Failed to upload file.');
    } finally {
      setSubmittingFile(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in text-xs">
      {/* Breadcrumb Path */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-muted-foreground border-b border-border/40 pb-3">
        <button onClick={onBack} className="hover:text-foreground transition-colors">{course.title}</button>
        <span>/</span>
        <span className="text-muted-foreground">Course Player</span>
        <span>/</span>
        <span className="text-primary font-bold">
          {activeQuiz ? `Quiz: ${activeQuiz.title}` : activeAssignment ? `Homework: ${activeAssignment.title}` : (activeLesson ? activeLesson.title : 'Overview')}
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Column: Player & Detail panel */}
        <div className="flex-1 w-full space-y-6">
          {activeQuiz ? (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h4 className="font-semibold text-sm">Required Checkpoint: {activeQuiz.title}</h4>
                <div className="flex items-center gap-3">
                  {quizTimeLeft !== null && (
                    <div className="px-2.5 py-1 rounded bg-destructive/10 border border-destructive/20 text-destructive font-bold font-mono">
                      {Math.floor(quizTimeLeft / 60)}:{(quizTimeLeft % 60).toString().padStart(2, '0')}
                    </div>
                  )}
                  <button onClick={() => { setActiveQuiz(null); setQuizTimeLeft(null); }} className="text-xs text-muted-foreground hover:text-foreground font-semibold">Exit</button>
                </div>
              </div>
              <div className="space-y-4">
                {activeQuiz.questions.map((q, idx) => {
                  const isMsq = q.question_type === 'MSQ';
                  const currentVal = quizAnswers[q.id] || '';
                  const currentList = currentVal.split(',').map(x => x.trim()).filter(Boolean);

                  return (
                    <div key={q.id} className="space-y-2">
                      <p className="font-semibold text-foreground/80">{idx + 1}. {q.question_text}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {q.options.map((opt, oIdx) => {
                          const isChecked = isMsq ? currentList.includes(opt) : currentVal === opt;
                          return (
                            <label key={oIdx} className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${isChecked ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-border hover:bg-muted/30'}`}>
                              {isMsq ? (
                                <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isChecked ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                                  {isChecked && <div className="h-1.5 w-1.5 bg-primary-foreground rounded-sm" />}
                                </div>
                              ) : (
                                <div className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${isChecked ? 'border-primary' : 'border-muted-foreground'}`}>
                                  {isChecked && <div className="h-2 w-2 rounded-full bg-primary" />}
                                </div>
                              )}
                              <input
                                type={isMsq ? 'checkbox' : 'radio'}
                                name={`question-${q.id}`}
                                value={opt}
                                checked={isChecked}
                                onChange={(e) => {
                                  if (isMsq) {
                                    const checked = e.target.checked;
                                    const list = checked ? [...currentList, opt] : currentList.filter(x => x !== opt);
                                    setQuizAnswers(prev => ({ ...prev, [q.id]: list.sort().join(', ') }));
                                  } else {
                                    setQuizAnswers(prev => ({ ...prev, [q.id]: opt }));
                                  }
                                }}
                                className="sr-only"
                              />
                              <span>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button onClick={handleQuizSubmit} className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:brightness-110">Submit Quiz Checkpoint</button>
                </div>
              </div>
            </div>
          ) : activeAssignment ? (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h4 className="font-bold text-sm">Homework Checklist: {activeAssignment.title}</h4>
                <button onClick={() => setActiveAssignment(null)} className="text-muted-foreground hover:text-foreground">Exit</button>
              </div>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{activeAssignment.description}</p>
              
              {activeAssignment.file_attachment && (
                <a href={activeAssignment.file_attachment} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-xl font-semibold">
                  <Download size={11} /> Download Guidelines
                </a>
              )}

              <div className="space-y-4 pt-3 border-t border-border">
                {submissions.find(s => s.assignment === activeAssignment.id) ? (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl">
                    <p className="font-bold">✓ Assignment submitted successfully.</p>
                  </div>
                ) : (
                  <div className="space-y-3 bg-muted/20 p-4 border border-border rounded-xl">
                    <div>
                      <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Upload Deliverable</label>
                      {fileUrl ? (
                        <div className="flex items-center gap-2 h-10 px-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl">
                          <span className="truncate flex-1">{fileUrl.split('/').pop()}</span>
                          <button onClick={() => setFileUrl('')}><X size={12} /></button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center gap-2 h-10 px-3 bg-card border border-dashed border-border rounded-xl cursor-pointer hover:border-primary/40 transition-all">
                          {submittingFile ? <Loader2 className="animate-spin text-primary" size={14} /> : <Upload size={14} />}
                          <span>Upload homework file</span>
                          <input type="file" onChange={handleFileUpload} className="hidden" />
                        </label>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Student Notes</label>
                      <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Describe your solution..." className="w-full h-10 px-3 bg-card border border-border rounded-xl outline-none" />
                    </div>
                    <button onClick={handleAssignmentSubmit} disabled={!fileUrl} className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl">Submit Homework</button>
                  </div>
                )}
              </div>
            </div>
          ) : activeLesson ? (
            <div className="space-y-6">
              {/* Custom secured stream player */}
              <div className="relative aspect-video rounded-2xl bg-black overflow-hidden border border-border shadow-xl">
                <div className="absolute top-4 left-4 text-[9px] font-mono text-white/80 z-20 bg-black/60 backdrop-blur px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span>SECURED • {localStorage.getItem('user_email') || 'Apex Student'}</span>
                </div>
                
                {activeLesson.cf_stream_id ? (
                  <video
                    ref={videoRef}
                    src={activeLesson.cf_stream_id}
                    className="w-full h-full object-cover"
                    controls
                    controlsList="nodownload"
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleVideoEnded}
                    onLoadedMetadata={() => {
                      if (videoRef.current && activeLesson.resume_time) {
                        videoRef.current.currentTime = activeLesson.resume_time;
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <AlertCircle size={30} className="text-muted-foreground/60" />
                    <span>No video file matches this lesson segment.</span>
                  </div>
                )}
              </div>

              {/* Playback speed controls */}
              <div className="bg-card border border-border p-3 rounded-xl flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-muted-foreground">Speed:</span>
                  <select
                    value={playbackSpeed}
                    onChange={(e) => {
                      const speed = Number(e.target.value);
                      setPlaybackSpeed(speed);
                      if (videoRef.current) videoRef.current.playbackRate = speed;
                    }}
                    className="bg-muted border border-border rounded p-1"
                  >
                    <option value="0.5">0.5x</option>
                    <option value="1">1x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2x</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <label className="flex items-center gap-1 text-muted-foreground font-semibold">
                    <input type="checkbox" checked={autoplayNext} onChange={(e) => setAutoplayNext(e.target.checked)} className="accent-primary" />
                    <span>Autoplay Next</span>
                  </label>
                  <button 
                    onClick={() => onOpenAITutor(activeLesson.id, course.id)}
                    className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-lg font-bold text-[10px] hover:bg-primary/20"
                  >
                    🤖 Ask AI Tutor
                  </button>
                </div>
              </div>

              {/* Lesson Tabs Drawer */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                <div className="flex flex-wrap gap-2 border-b border-border/50 pb-3">
                  {[
                    { id: 'content', label: 'Content' },
                    { id: 'attachments', label: 'Slides & Guides' },
                    { id: 'study-notes', label: 'Take Notes' },
                    { id: 'bookmarks', label: 'Video Bookmarks' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold tracking-wide uppercase transition-all ${activeTab === tab.id ? 'bg-primary border-transparent text-primary-foreground' : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="text-xs leading-relaxed space-y-4">
                  {activeTab === 'content' && (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <h4 className="text-sm font-extrabold text-foreground mb-2">{activeLesson.title}</h4>
                      <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">{activeLesson.content || 'No text content listed for this lesson.'}</p>
                    </div>
                  )}

                  {activeTab === 'attachments' && (
                    <div className="flex flex-col gap-2">
                      {activeLesson.pdf_ppt_url && (
                        <a href={activeLesson.pdf_ppt_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2.5 bg-muted/20 border border-border rounded-xl font-semibold hover:bg-muted/40">
                          <FileText size={14} className="text-primary" /> Slide Deck Presentation Slides
                        </a>
                      )}
                      {activeLesson.zip_source_url && (
                        <a href={activeLesson.zip_source_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2.5 bg-muted/20 border border-border rounded-xl font-semibold hover:bg-muted/40">
                          <Download size={14} className="text-primary" /> Core Resource files (.zip template)
                        </a>
                      )}
                      {!activeLesson.pdf_ppt_url && !activeLesson.zip_source_url && (
                        <p className="text-[11px] italic text-muted-foreground">No downloadable files attached to this module lesson.</p>
                      )}
                    </div>
                  )}

                  {activeTab === 'bookmarks' && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newBookmarkNote}
                          onChange={(e) => setNewBookmarkNote(e.target.value)}
                          placeholder="Bookmark note..."
                          className="h-8 px-3 text-[11px] bg-muted/50 border border-border rounded-lg outline-none flex-1"
                        />
                        <button onClick={() => addBookmarkMutation.mutate()} className="px-3 h-8 bg-primary text-primary-foreground font-semibold rounded-lg text-[10px]">
                          Save at {Math.floor(videoProgress)}s
                        </button>
                      </div>
                      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                        {bookmarks.map((bm: any) => (
                          <div key={bm.id} className="flex items-center justify-between bg-muted/20 p-2 border border-border rounded-xl text-[11px]">
                            <span>Bookmark: <button onClick={() => { if (videoRef.current) videoRef.current.currentTime = bm.position_seconds; }} className="text-primary hover:underline font-bold font-mono">{Math.floor(bm.position_seconds)}s</button> — {bm.note}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'study-notes' && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newNoteText}
                          onChange={(e) => setNewNoteText(e.target.value)}
                          placeholder="Write down a note..."
                          className="h-8 px-3 text-[11px] bg-muted/50 border border-border rounded-lg outline-none flex-1"
                        />
                        <button onClick={() => addNoteMutation.mutate()} className="px-3 h-8 bg-primary text-primary-foreground font-semibold rounded-lg text-[10px]">Save Note</button>
                      </div>
                      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                        {notesList.map((n: any) => (
                          <div key={n.id} className="flex justify-between bg-muted/20 p-2.5 border border-border rounded-xl">
                            <span>{n.text}</span>
                            <button onClick={() => deleteNoteMutation.mutate(n.id)} className="text-destructive"><Trash2 size={11} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-muted-foreground font-medium bg-card border border-border rounded-2xl">
              Choose a module lesson from the sidebar playlist to begin.
            </div>
          )}
        </div>

        {/* Right Column: Module & Lessons Playlist Panel */}
        <div className="w-full lg:w-80 space-y-6 shrink-0">
          <div className="rounded-2xl glass-panel p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-xs uppercase border-b border-border pb-3">Course Contents</h3>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {modules.map(mod => {
                const modLessons = lessons.filter(l => l.module === mod.id);
                return (
                  <div key={mod.id} className="space-y-1.5">
                    <h4 className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground border-l-2 border-primary/40 pl-1.5">{mod.title}</h4>
                    <div className="space-y-1 pl-1">
                      {modLessons.map((les, index) => {
                        const isCurrent = activeLesson?.id === les.id;
                        return (
                          <button
                            key={les.id}
                            onClick={() => handleSelectLesson(les)}
                            className={`w-full text-left p-2 rounded-lg text-[11px] flex items-center gap-2 border transition-all ${isCurrent ? 'bg-[#0f172a] border-primary/25 text-primary font-bold shadow-sm' : les.locked ? 'opacity-40 cursor-not-allowed border-transparent text-muted-foreground' : 'hover:bg-muted/40 border-transparent text-muted-foreground'}`}
                          >
                            <span className="font-mono text-[9px] text-slate-500 w-3">{index + 1}</span>
                            <span className="truncate flex-1">{les.title}</span>
                            {les.completed && <Award size={10} className="text-emerald-500" />}
                          </button>
                        );
                      })}

                      {/* Quizzes list inside modules */}
                      {courseQuizzes.filter(q => q.module === mod.id).map(quiz => {
                        const attempts = quizAttempts.filter(att => att.quiz === quiz.id);
                        const hasPassed = attempts.some(att => att.passed);
                        const attemptsCount = attempts.length;
                        return (
                          <button
                            key={quiz.id}
                            disabled={hasPassed}
                            onClick={() => { setActiveQuiz(quiz); setQuizTimeLeft(15 * 60); }}
                            className={`w-full text-left p-2 rounded-lg text-[11px] flex items-center gap-2 border transition-all ${hasPassed ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/10' : 'text-primary border-transparent hover:bg-muted/40'}`}
                          >
                            <HelpCircle size={10} />
                            <span className="truncate flex-1 font-semibold">{hasPassed ? 'Passed Checkpoint' : `Checkpoint: ${quiz.title} (${attemptsCount}/${quiz.max_retries} attempts)`}</span>
                          </button>
                        );
                      })}

                      {/* Assignments list inside modules */}
                      {assignments.filter(a => a.module === mod.id).map(assign => {
                        const hasSub = submissions.some(s => s.assignment === assign.id);
                        return (
                          <button
                            key={assign.id}
                            onClick={() => setActiveAssignment(assign)}
                            className={`w-full text-left p-2 rounded-lg text-[11px] flex items-center gap-2 border transition-all ${hasSub ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/10' : 'text-primary border-transparent hover:bg-muted/40'}`}
                          >
                            <ClipboardList size={10} />
                            <span className="truncate flex-1 font-semibold">{hasSub ? 'Homework Submitted' : `Homework: ${assign.title}`}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Quiz Result Modal */}
      <AnimatePresence>
        {quizResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4 text-center text-xs">
              <div className={`mx-auto h-12 w-12 rounded-full flex items-center justify-center border font-bold text-lg ${quizResult.passed ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}>
                {quizResult.passed ? <Award size={20} /> : <X size={20} />}
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-base">{quizResult.passed ? 'Checkpoint Cleared!' : 'Checkpoint Failed'}</h3>
                <p className="text-muted-foreground leading-normal">
                  {quizResult.passed ? 'Excellent work! You unlocked the next modules.' : `You scored ${quizResult.score}%. Retake to pass.`}
                </p>
              </div>
              <button onClick={() => setQuizResult(null)} className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl">Continue Training</button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
