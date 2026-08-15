import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { 
  HelpCircle, Upload, Download, Trash2, 
  FileText, Award, BookOpen, Bookmark, Edit3,
  ClipboardList, Loader2, X, AlertCircle, Layers, CheckCircle2,
  Bot, Lightbulb, Lock
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { ApexAITutorCore } from '../../../components/ApexAITutorCore';
import { UniversalVideoPlayer } from '../../../components/UniversalVideoPlayer';

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
  const maxTimeWatchedRef = useRef(0);

  const isLiveStudent = localStorage.getItem('studentLiveMode') === 'true' ||
                        Boolean(localStorage.getItem('loginPath')?.includes('live')) ||
                        (Boolean(localStorage.getItem('user')) && JSON.parse(localStorage.getItem('user') || '{}')?.student_type === 'LIVE_CLASS');

  // States
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);

  useEffect(() => {
    if (activeLesson) {
      maxTimeWatchedRef.current = activeLesson.resume_time || 0;
    }
  }, [activeLesson]);
  
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizResult, setQuizResult] = useState<any>(null);
  const [quizTimeLeft, setQuizTimeLeft] = useState<number | null>(null);
  const [forceRetakeQuizId, setForceRetakeQuizId] = useState<number | null>(null);

  const [fileUrl, setFileUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submittingFile, setSubmittingFile] = useState(false);

  const [activeTab, setActiveTab] = useState<'content' | 'attachments' | 'study-notes' | 'bookmarks'>('content');
  const [rightPanelTab, setRightPanelTab] = useState<'playlist' | 'ai-tutor'>('playlist');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [autoplayNext, setAutoplayNext] = useState(true);

  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(100);

  const [newBookmarkNote, setNewBookmarkNote] = useState('');
  const [newNoteText, setNewNoteText] = useState('');

  // Inline AI Tutor State
  const [aiMessages, setAiMessages] = useState<{ id: string; sender: 'student' | 'ai'; text: string; timestamp: string }[]>([
    {
      id: 'init-1',
      sender: 'ai',
      text: 'Hello! I am your **Apex AI Tutor**. I am directly connected to this video lesson context. Ask me questions or tap a quick action below to summarize, test yourself, or build flashcards!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [copiedAiId, setCopiedAiId] = useState<string | null>(null);

  // 1. Fetch Course Modules
  const { data: modules = [] } = useQuery<Module[]>({
    queryKey: ['modules', course.id, isLiveStudent],
    refetchInterval: 10000,
    queryFn: async () => {
      const res = await api.get(`modules/?course=${course.id}&live_mode=${isLiveStudent}`);
      return res.data;
    }
  });

  // 2. Fetch Lessons
  const { data: lessons = [], refetch: refetchLessons } = useQuery<Lesson[]>({
    queryKey: ['lessons', course.id, isLiveStudent],
    refetchInterval: 10000,
    queryFn: async () => {
      const res = await api.get(`lessons/?course=${course.id}&live_mode=${isLiveStudent}`);
      return res.data;
    }
  });

  // 3. Fetch Quizzes
  const { data: courseQuizzes = [] } = useQuery<Quiz[]>({
    queryKey: ['quizzes', course.id, isLiveStudent],
    refetchInterval: 10000,
    queryFn: async () => {
      const res = await api.get(`quizzes/list/?course=${course.id}&live_mode=${isLiveStudent}`);
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
    refetchInterval: 10000,
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
        setActiveLesson(prev => prev ? { ...prev, completed: true } : null);
        queryClient.setQueryData(['lessons', course.id], (old: any) => 
          (old || []).map((l: any) => l.id === activeLesson?.id ? { ...l, completed: true } : l)
        );
        refetchLessons();
        queryClient.invalidateQueries({ queryKey: ['lessons', course.id] });
        queryClient.invalidateQueries({ queryKey: ['certificates'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['user-achievements'] });
        queryClient.invalidateQueries({ queryKey: ['student-achievements-tab'] });
      }
    }
  });

  const handleTimeUpdate = () => {
    if (!videoRef.current || !activeLesson) return;
    const currentTime = videoRef.current.currentTime;
    const duration = videoRef.current.duration || 1;
    const pct = (currentTime / duration) * 100;
    
    // Prevent forward seeking
    if (currentTime > maxTimeWatchedRef.current + 2 && !activeLesson.completed) {
      videoRef.current.currentTime = maxTimeWatchedRef.current;
      toast.error('Seeking forward is disabled for learning integrity. Please watch the lesson fully.', {
        id: 'no-seeking' // prevents duplicate toasts
      });
      return;
    }
    
    // Update maximum time watched
    maxTimeWatchedRef.current = Math.max(maxTimeWatchedRef.current, currentTime);

    setVideoProgress(currentTime);
    if (duration > 1) {
      setVideoDuration(duration);
    }
    
    // Auto-mark complete when reaching near the end (>= 95% or remaining <= 2s)
    if (duration > 4 && (pct >= 95 || duration - currentTime <= 2) && !activeLesson.completed) {
      syncProgressMutation.mutate({ current: duration, pct: 100, completed: true });
      return;
    }

    if (Math.floor(currentTime) % 10 === 0) {
      syncProgressMutation.mutate({ current: currentTime, pct, completed: false });
    }
  };

  const handleNextItem = () => {
    const courseItems: { type: 'lesson' | 'quiz' | 'assignment', id: number, item: any, title: string }[] = [];
    modules.forEach((mod) => {
      lessons.filter(l => l.module === mod.id).forEach(l => courseItems.push({ type: 'lesson', id: l.id, item: l, title: l.title }));
      courseQuizzes.filter(q => q.module === mod.id).forEach(q => courseItems.push({ type: 'quiz', id: q.id, item: q, title: q.title }));
      assignments.filter(a => a.module === mod.id).forEach(a => courseItems.push({ type: 'assignment', id: a.id, item: a, title: a.title }));
    });

    let currentIdx = -1;
    if (activeLesson) currentIdx = courseItems.findIndex(i => i.type === 'lesson' && i.id === activeLesson.id);
    else if (activeQuiz) currentIdx = courseItems.findIndex(i => i.type === 'quiz' && i.id === activeQuiz.id);
    else if (activeAssignment) currentIdx = courseItems.findIndex(i => i.type === 'assignment' && i.id === activeAssignment.id);

    if (currentIdx !== -1 && currentIdx + 1 < courseItems.length) {
      const nextItem = courseItems[currentIdx + 1];
      if (nextItem.type === 'lesson' && nextItem.item.locked) return; // Drip locked
      toast.loading(`Next up: ${nextItem.title}`, { duration: 2000 });
      setTimeout(() => {
        if (nextItem.type === 'lesson') {
          setActiveLesson(nextItem.item);
          setActiveQuiz(null);
          setActiveAssignment(null);
        } else if (nextItem.type === 'quiz') {
          setActiveQuiz(nextItem.item);
          setActiveLesson(null);
          setActiveAssignment(null);
          setQuizTimeLeft(15 * 60);
        } else if (nextItem.type === 'assignment') {
          setActiveAssignment(nextItem.item);
          setActiveLesson(null);
          setActiveQuiz(null);
        }
      }, 2000);
    }
  };

  const handleVideoEnded = () => {
    if (!activeLesson) return;
    toast.success('Lesson completed!');
    syncProgressMutation.mutate({ current: videoDuration, pct: 100, completed: true });

    if (autoplayNext) {
      handleNextItem();
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

  // Inline AI Tutor Mutation
  const inlineTutorMutation = useMutation({
    mutationFn: async ({ prompt, action }: { prompt: string; action: string }) => {
      const res = await api.post('courses/ai-tutor/', {
        action,
        prompt,
        lesson_id: activeLesson?.id,
        course_id: course.id
      });
      return res.data;
    },
    onSuccess: (data) => {
      setAiMessages(prev => [...prev, {
        id: Math.random().toString(36).substring(2),
        sender: 'ai',
        text: data.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.error || 'Failed to communicate with AI Tutor.';
      toast.error(errMsg);
      setAiMessages(prev => [...prev, {
        id: Math.random().toString(36).substring(2),
        sender: 'ai',
        text: `⚠️ **Error:** ${errMsg}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  });

  
  const handleInlineQuickAction = (action: 'summarize' | 'notes' | 'flashcards' | 'quiz' | 'explain') => {
    if (inlineTutorMutation.isPending) return;
    let actionLabel = '';
    if (action === 'summarize') actionLabel = 'Summarize lesson in bullet points';
    else if (action === 'notes') actionLabel = 'Generate structured study notes';
    else if (action === 'flashcards') actionLabel = 'Build practice flashcards';
    else if (action === 'quiz') actionLabel = 'Create 3-question practice quiz';
    else if (action === 'explain') actionLabel = 'Explain key technical concepts';

    setAiMessages(prev => [...prev, {
      id: Math.random().toString(36).substring(2),
      sender: 'student',
      text: actionLabel,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    inlineTutorMutation.mutate({ prompt: '', action });
  };

  
  const handleSaveAiToNotes = async (text: string) => {
    if (!activeLesson) return;
    try {
      await api.post('lessons/notes/', {
        lesson: activeLesson.id,
        text: `[AI Insight] ${text.substring(0, 400)}${text.length > 400 ? '...' : ''}`
      });
      refetchNotes();
      toast.success('Saved to your Study Notes!');
    } catch {
      toast.error('Failed to save to study notes.');
    }
  };

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

      queryClient.setQueryData(['quiz-attempts'], (old: any) => [
        ...(old || []),
        { quiz: activeQuiz.id, passed: res.data.passed, score: res.data.score }
      ]);

      refetchAttempts();
      refetchLessons();
      setActiveQuiz(null);
      setQuizAnswers({});
      setQuizTimeLeft(null);
      setForceRetakeQuizId(null);
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['user-achievements'] });
      queryClient.invalidateQueries({ queryKey: ['certificates'] });

      if (res.data.passed && autoplayNext) {
        handleNextItem();
      }
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
      queryClient.setQueryData(['submissions'], (old: any) => [
        ...(old || []),
        { assignment: activeAssignment.id }
      ]);
      refetchSubmissions();
      refetchLessons();
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['user-achievements'] });
      
      if (autoplayNext) {
        handleNextItem();
      }
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
          {activeQuiz ? (() => {
            const attempts = quizAttempts.filter(att => att.quiz === activeQuiz.id);
            const passAttempt = attempts.find(att => att.passed);
            
            if (passAttempt && forceRetakeQuizId !== activeQuiz.id) {
              return (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-sm space-y-5 text-center">
                  <div className="flex justify-between items-center border-b border-border/40 pb-3 text-left">
                    <h4 className="font-semibold text-sm text-foreground">Checkpoint: {activeQuiz.title}</h4>
                    <button onClick={() => { setActiveQuiz(null); setQuizTimeLeft(null); setForceRetakeQuizId(null); }} className="text-xs text-muted-foreground hover:text-foreground font-semibold">Exit</button>
                  </div>
                  
                  <div className="py-6 space-y-4">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm">
                      <CheckCircle2 size={28} />
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Checkpoint Passed!</h3>
                      <p className="text-[11px] text-muted-foreground">You have successfully cleared this curriculum checkpoint.</p>
                    </div>

                    <div className="max-w-xs mx-auto grid grid-cols-2 gap-4 p-4 rounded-xl bg-card border border-border mt-4 text-left">
                      <div>
                        <span className="block text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Your Score</span>
                        <span className="text-base font-extrabold text-foreground">{passAttempt.score}%</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Passing Score</span>
                        <span className="text-base font-semibold text-muted-foreground">{activeQuiz.passing_score}%</span>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button 
                        onClick={() => {
                          setQuizAnswers({});
                          setForceRetakeQuizId(activeQuiz.id);
                          setQuizTimeLeft(15 * 60);
                        }}
                        className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs hover:brightness-110 shadow-md shadow-primary/20 transition-all"
                      >
                        Retake Checkpoint
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h4 className="font-semibold text-sm">Required Checkpoint: {activeQuiz.title}</h4>
                  <div className="flex items-center gap-3">
                    {quizTimeLeft !== null && (
                      <div className="px-2.5 py-1 rounded bg-destructive/10 border border-destructive/20 text-destructive font-bold font-mono">
                        {Math.floor(quizTimeLeft / 60)}:{(quizTimeLeft % 60).toString().padStart(2, '0')}
                      </div>
                    )}
                    <button onClick={() => { setActiveQuiz(null); setQuizTimeLeft(null); setForceRetakeQuizId(null); }} className="text-xs text-muted-foreground hover:text-foreground font-semibold">Exit</button>
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
            );
          })() : activeAssignment ? (
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
                {(() => {
                  const sub = submissions.find(s => s.assignment === activeAssignment.id);
                  if (sub) {
                    return (
                      <div className="space-y-4">
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl">
                          <p className="font-bold">✓ Assignment submitted successfully.</p>
                        </div>
                        
                        {sub.status === 'GRADED' && (
                          <div className="p-5 bg-card border border-border shadow-sm rounded-2xl space-y-3">
                            <h5 className="font-extrabold text-sm border-b border-border pb-2">Instructor Feedback</h5>
                            <div className="flex gap-4 items-center">
                              <div className="flex-1 bg-muted/30 p-3 rounded-xl border border-border">
                                <span className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Grade / Score</span>
                                <span className="text-xl font-black text-primary">{sub.grade || 'N/A'}</span>
                              </div>
                              <div className="flex-1 bg-muted/30 p-3 rounded-xl border border-border">
                                <span className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Status</span>
                                <span className="text-sm font-bold text-emerald-500">Graded</span>
                              </div>
                            </div>
                            {sub.feedback && (
                              <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 mt-2">
                                <span className="block text-[10px] uppercase font-bold text-primary mb-1">Comments</span>
                                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{sub.feedback}</p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {sub.status === 'REJECTED' && (
                          <div className="p-5 bg-destructive/5 border border-destructive/20 text-destructive rounded-2xl space-y-3">
                            <h5 className="font-extrabold text-sm border-b border-destructive/20 pb-2">Needs Revision</h5>
                            <p className="text-xs font-semibold">Your submission requires changes. Please review the feedback below:</p>
                            {sub.feedback && (
                              <div className="bg-destructive/10 p-3 rounded-xl mt-2">
                                <p className="text-xs leading-relaxed whitespace-pre-wrap">{sub.feedback}</p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {sub.status === 'PENDING' && (
                          <div className="p-4 bg-muted/20 border border-border text-muted-foreground rounded-xl flex items-center justify-between text-xs">
                            <span className="font-bold uppercase tracking-wide text-[10px]">Pending Review</span>
                            <span>Waiting for instructor to grade...</span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return (
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
                  );
                })()}
              </div>
            </div>
          ) : activeLesson ? (
            <div className="space-y-6">
              {/* Custom secured stream player */}
              <div className="relative aspect-video rounded-2xl bg-black overflow-hidden border border-cyan-500/30 shadow-2xl shadow-cyan-950/40">
                {activeLesson.cf_stream_id ? (
                  <UniversalVideoPlayer
                    videoRef={videoRef}
                    src={activeLesson.cf_stream_id}
                    title={activeLesson.title}
                    poster={activeLesson.thumbnail || undefined}
                    className="w-full h-full object-cover"
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleVideoEnded}
                    disableForwardSeeking={isLiveStudent ? false : !activeLesson.completed}
                    initialResumeTime={activeLesson.resume_time || 0}
                    onLoadedMetadata={() => {
                      if (videoRef.current && activeLesson.resume_time) {
                        videoRef.current.currentTime = activeLesson.resume_time;
                      }
                    }}
                    playbackSpeed={playbackSpeed}
                    onSpeedChange={setPlaybackSpeed}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle size={30} className="text-muted-foreground/60" />
                      <span>No video file matches this lesson segment.</span>
                    </div>
                    {!activeLesson.completed && (
                      <button 
                        onClick={() => {
                          toast.success('Lesson completed!');
                          syncProgressMutation.mutate({ current: 0, pct: 100, completed: true });
                          if (autoplayNext) handleNextItem();
                        }}
                        className="px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg hover:brightness-110"
                      >
                        Mark as Completed
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Video Player Meta & Completion Bar */}
              <div className="cyber-glass-card p-3 px-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg border border-cyan-500/20">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    Active Stream
                  </span>
                  <h3 className="text-xs font-bold text-white truncate max-w-xs sm:max-w-md">
                    {activeLesson.title}
                  </h3>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Status / Mark Completed Action */}
                  {activeLesson.completed ? (
                    <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                      <CheckCircle2 size={13} /> Completed
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        toast.success('Lesson marked as completed!');
                        syncProgressMutation.mutate({ current: videoDuration || 100, pct: 100, completed: true });
                        if (autoplayNext) handleNextItem();
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-[11px] shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    >
                      <CheckCircle2 size={13} /> Mark as Completed
                    </button>
                  )}

                  {/* Autoplay Next Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer group pl-2 border-l border-slate-700/60">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        checked={autoplayNext} 
                        onChange={(e) => setAutoplayNext(e.target.checked)} 
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-slate-800 rounded-full peer-checked:bg-cyan-500 transition-all duration-300 border border-slate-700 peer-checked:border-cyan-400"></div>
                      <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 peer-checked:translate-x-4 shadow-md"></div>
                    </div>
                    <span className="text-[11px] font-bold text-slate-300 group-hover:text-white transition-colors">Autoplay Next</span>
                  </label>
                </div>
              </div>

              {/* Lesson Info Tabs Drawer */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                <div className="flex flex-wrap gap-2 border-b border-border/50 pb-3">
                  {[
                    { id: 'content', label: 'Lesson Content', icon: BookOpen },
                    { id: 'attachments', label: 'Slides & Guides', icon: FileText },
                    { id: 'bookmarks', label: 'Saved Bookmarks', icon: Bookmark },
                    { id: 'study-notes', label: 'Lesson Study Notes', icon: Edit3 }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-3.5 py-2 rounded-xl border text-[11px] font-bold tracking-wide uppercase transition-all flex items-center gap-1.5 ${activeTab === tab.id ? 'bg-primary border-transparent text-primary-foreground shadow-md' : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'}`}
                    >
                      <tab.icon size={13} />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                <div className="text-xs leading-relaxed space-y-4">
                  {activeTab === 'content' && (
                    <div className="prose prose-sm max-w-none">
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
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Saved Video Bookmarks</span>
                        <span className="text-[10px] font-semibold text-primary">{bookmarks.length} saved</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newBookmarkNote}
                          onChange={(e) => setNewBookmarkNote(e.target.value)}
                          placeholder="Add bookmark description..."
                          className="h-9 px-3 text-[11px] bg-muted/50 border border-border rounded-xl outline-none flex-1 focus:border-primary"
                        />
                        <button onClick={() => addBookmarkMutation.mutate()} className="px-4 h-9 bg-primary text-primary-foreground font-bold rounded-xl text-[10px] shadow-sm hover:brightness-110">
                          Save at {Math.floor(videoProgress)}s
                        </button>
                      </div>
                      <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pt-1">
                        {bookmarks.map((bm: any) => (
                          <div key={bm.id} className="flex items-center justify-between bg-card p-3 border border-border/80 rounded-xl text-[11px] shadow-2xs hover:border-primary/40 transition-colors">
                            <span className="font-medium text-foreground">
                              Bookmark: <button onClick={() => { if (videoRef.current) videoRef.current.currentTime = bm.position_seconds; }} className="text-primary hover:underline font-extrabold font-mono bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">{Math.floor(bm.position_seconds)}s</button> — {bm.note}
                            </span>
                          </div>
                        ))}
                        {bookmarks.length === 0 && (
                          <p className="text-[11px] italic text-muted-foreground py-4 text-center">No video bookmarks saved yet for this lesson.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'study-notes' && (
                    <div className="space-y-4 pt-1">
                      <div className="flex items-center justify-between border-b border-border/40 pb-2">
                        <div>
                          <h5 className="font-extrabold text-xs text-foreground flex items-center gap-1.5">
                            <Edit3 size={13} className="text-primary" />
                            <span>Lesson Study Notes Module</span>
                          </h5>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Save personal revision notes for this video lesson segment.</p>
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{notesList.length} Notes</span>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newNoteText}
                          onChange={(e) => setNewNoteText(e.target.value)}
                          placeholder="Type your study note or concept takeaway..."
                          className="h-9 px-3.5 text-[11px] bg-muted/40 border border-border rounded-xl outline-none flex-1 focus:border-primary"
                        />
                        <button onClick={() => addNoteMutation.mutate()} className="px-4 h-9 bg-primary text-primary-foreground font-bold rounded-xl text-[10px] shadow-sm hover:brightness-110">
                          Save Note
                        </button>
                      </div>

                      <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
                        {notesList.map((n: any) => (
                          <div key={n.id} className="flex items-center justify-between bg-card p-3 border border-border/80 rounded-xl text-[11px] shadow-2xs hover:border-border transition-colors">
                            <div className="space-y-0.5">
                              <p className="text-foreground font-medium">{n.text}</p>
                              {n.created_at && (
                                <span className="text-[9px] text-muted-foreground block">{new Date(n.created_at).toLocaleString()}</span>
                              )}
                            </div>
                            <button onClick={() => deleteNoteMutation.mutate(n.id)} className="text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition-colors" title="Delete note">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                        {notesList.length === 0 && (
                          <div className="py-6 text-center text-muted-foreground italic text-[11px] border border-dashed border-border/60 rounded-xl">
                            No study notes created for this lesson yet. Type above to add your first note!
                          </div>
                        )}
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

        {/* Right Column: Module & Lessons Playlist Panel / AI Tutor Panel */}
        <div className="w-full lg:w-96 space-y-6 shrink-0">
          <div className="rounded-2xl bg-card border border-border p-5 shadow-md space-y-4">
            {/* Right Panel View Selector */}
            <div className="flex bg-muted/40 p-1 rounded-xl border border-border/60 gap-1">
              <button
                onClick={() => setRightPanelTab('playlist')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${rightPanelTab === 'playlist' ? 'bg-card text-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Layers size={12} className={rightPanelTab === 'playlist' ? 'text-primary' : ''} />
                <span>Course Playlist</span>
              </button>

              <button
                onClick={() => setRightPanelTab('ai-tutor')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${rightPanelTab === 'ai-tutor' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Bot size={12} />
                <span>Apex AI Tutor</span>
              </button>
            </div>

            {rightPanelTab === 'playlist' ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                <h3 className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border pb-2">Modules & Lessons</h3>
                {(() => {
                  let allPreviousCompleted = true;
                  return modules.map((mod, index) => {
                    const modLessons = lessons.filter(l => l.module === mod.id);
                    const modQuizzes = courseQuizzes.filter(q => q.module === mod.id);
                    const modAssignments = assignments.filter(a => a.module === mod.id);
                    
                    const allLessonsCompleted = modLessons.every(l => l.completed);
                    const allQuizzesPassed = modQuizzes.every(q => quizAttempts.some(att => att.quiz === q.id && att.passed));
                    const allAssignmentsSubmitted = modAssignments.every(a => submissions.some(s => s.assignment === a.id));

                    const isCompleted = allLessonsCompleted && allQuizzesPassed && allAssignmentsSubmitted;
                    const isLocked = isLiveStudent ? false : (index === 0 ? false : !allPreviousCompleted);
                    
                    if (!isCompleted) {
                      allPreviousCompleted = false;
                    }

                    return (
                      <div key={mod.id} className={`space-y-1.5 ${isLocked ? 'opacity-50' : ''}`}>
                        <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-foreground border-l-2 border-primary/50 pl-2 py-0.5 bg-muted/20 rounded-r flex items-center justify-between">
                          <span>{mod.title}</span>
                          {isLocked && <Lock size={10} className="text-muted-foreground mr-2" />}
                        </h4>
                        <div className="space-y-1 pl-1">
                          {modLessons.map((les, i) => {
                            const isCurrent = activeLesson?.id === les.id;
                            const buttonLocked = isLiveStudent ? false : (isLocked || les.locked);
                            return (
                              <button
                                key={les.id}
                                disabled={buttonLocked}
                                onClick={() => handleSelectLesson(les)}
                                className={`w-full text-left p-2.5 rounded-xl text-[11px] flex items-center gap-2.5 border transition-all ${isCurrent ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm' : buttonLocked ? 'opacity-40 cursor-not-allowed border-transparent text-muted-foreground' : 'hover:bg-muted/50 border-transparent text-muted-foreground'}`}
                              >
                                <span className="font-mono text-[10px] text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                                <span className="truncate flex-1 font-semibold">{les.title}</span>
                                {les.completed ? <CheckCircle2 size={12} className="text-emerald-500 shrink-0" /> : (buttonLocked && <Lock size={10} className="shrink-0 text-muted-foreground" />)}
                              </button>
                            );
                          })}

                          {/* Quizzes list inside modules */}
                          {modQuizzes.map(quiz => {
                            const attempts = quizAttempts.filter(att => att.quiz === quiz.id);
                            const hasPassed = attempts.some(att => att.passed);
                            const attemptsCount = attempts.length;
                            const quizLocked = isLiveStudent ? false : isLocked;
                            return (
                              <button
                                key={quiz.id}
                                disabled={quizLocked}
                                onClick={() => {
                                  setActiveQuiz(quiz);
                                  setActiveLesson(null);
                                  setActiveAssignment(null);
                                  setForceRetakeQuizId(null);
                                  if (!hasPassed) {
                                    setQuizAnswers({});
                                    setQuizTimeLeft(15 * 60);
                                  } else {
                                    setQuizTimeLeft(null);
                                  }
                                }}
                                className={`w-full text-left p-2 rounded-lg text-[11px] flex items-center gap-2 border transition-all ${hasPassed ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10 font-bold' : quizLocked ? 'opacity-40 cursor-not-allowed text-muted-foreground border-transparent' : 'text-primary border-transparent hover:bg-muted/40'}`}
                              >
                                <HelpCircle size={10} />
                                <span className="truncate flex-1 font-semibold">
                                  {hasPassed 
                                    ? `Checkpoint: ${quiz.title} - Passed (${attempts.find(att => att.passed)?.score}%)` 
                                    : `Checkpoint: ${quiz.title} (${attemptsCount}/${quiz.max_retries} attempts)`
                                  }
                                </span>
                                {quizLocked && <Lock size={10} className="shrink-0 text-muted-foreground" />}
                              </button>
                            );
                          })}

                          {/* Assignments list inside modules */}
                          {modAssignments.map(assign => {
                            const hasSub = submissions.some(s => s.assignment === assign.id);
                            const assignLocked = isLiveStudent ? false : isLocked;
                            return (
                              <button
                                key={assign.id}
                                disabled={assignLocked}
                                onClick={() => {
                                  setActiveAssignment(assign);
                                  setActiveLesson(null);
                                  setActiveQuiz(null);
                                  setForceRetakeQuizId(null);
                                }}
                                className={`w-full text-left p-2 rounded-lg text-[11px] flex items-center gap-2 border transition-all ${hasSub ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/10' : assignLocked ? 'opacity-40 cursor-not-allowed text-muted-foreground border-transparent' : 'text-primary border-transparent hover:bg-muted/40'}`}
                              >
                                <ClipboardList size={10} />
                                <span className="truncate flex-1 font-semibold">{hasSub ? 'Homework Submitted' : `Homework: ${assign.title}`}</span>
                                {assignLocked && <Lock size={10} className="shrink-0 text-muted-foreground" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            ) : (
              /* Embedded AI Tutor Interface in Right Sidebar */
              <div className="h-[430px] border border-border/80 rounded-2xl overflow-hidden shadow-sm">
                <ApexAITutorCore
                  lessonId={activeLesson?.id || null}
                  courseId={course.id}
                  lessonTitle={activeLesson?.title || course.title}
                  compact={true}
                />
              </div>
            )}
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
