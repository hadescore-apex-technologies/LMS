import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { 
  Plus, Trash2, Video, ChevronRight, ChevronDown, 
  X, PlusCircle, Edit3, Upload, Loader2,
  ClipboardList, FileText, HelpCircle, Layers, Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Course {
  id: number;
  title: string;
  slug: string;
  description: string;
  thumbnail: string;
  category: number;
  category_name: string;
  mentor: number | null;
  mentor_name: string | null;
  is_published: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  requirements?: string;
  outcomes?: string;
  learning_path?: string;
  instructor_name?: string;
  instructor_role?: string;
}

interface Mentor {
  id: number;
  name: string;
  email: string;
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
  order: number;
  thumbnail?: string;
  cf_stream_id?: string;
  pdf_ppt_url?: string;
  zip_source_url?: string;
  external_links?: string[];
  additional_notes?: string;
}

interface Assignment {
  id: number;
  module: number;
  title: string;
  description: string;
  file_attachment?: string;
  due_date?: string;
  created_at: string;
}

interface Quiz {
  id: number;
  module: number;
  title: string;
  passing_score: number;
  timer_minutes: number;
  max_retries: number;
  randomize_questions: boolean;
}

export const CoursesTab: React.FC = () => {
  const queryClient = useQueryClient();

  // Selection state
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [expandedModuleId, setExpandedModuleId] = useState<number | null>(null);

  // Modals & fields
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseCategory, setCourseCategory] = useState<number>(0);
  const [courseThumb, setCourseThumb] = useState('');
  const [courseMentor, setCourseMentor] = useState<number | ''>('');
  const [instructorName, setInstructorName] = useState('');
  const [instructorRole, setInstructorRole] = useState('');
  const [courseStatus, setCourseStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('PUBLISHED');
  const [courseReqs, setCourseReqs] = useState('');
  const [courseOuts, setCourseOuts] = useState('');

  // Module modal
  const [showModModal, setShowModModal] = useState(false);
  const [modTitle, setModTitle] = useState('');
  const [editingModule, setEditingModule] = useState<Module | null>(null);

  // Lesson modal
  const [showLesModal, setShowLesModal] = useState(false);
  const [lesTitle, setLesTitle] = useState('');
  const [lesContent, setLesContent] = useState('');
  const [lesVideoUrl, setLesVideoUrl] = useState('');
  const [lesPdf, setLesPdf] = useState('');
  const [lesZip, setLesZip] = useState('');
  const [lesNotes, setLesNotes] = useState('');
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [targetModuleId, setTargetModuleId] = useState<number | null>(null);

  // Assignment modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDesc, setAssignDesc] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [assignFileUrl, setAssignFileUrl] = useState('');
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [assignModuleId, setAssignModuleId] = useState<number | null>(null);

  // Quiz modal
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizModuleId, setQuizModuleId] = useState<number | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<any | null>(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [passingScore, setPassingScore] = useState(70);
  const [timerMinutes, setTimerMinutes] = useState(15);
  const [maxRetries, setMaxRetries] = useState(3);
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);

  // Questions within quiz state
  const [questions, setQuestions] = useState<any[]>([]);
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<'MCQ' | 'TF' | 'MSQ'>('MCQ');
  const [qOptions, setQOptions] = useState('');
  const [qCorrect, setQCorrect] = useState('');

  // Upload loaders
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  // Queries
  const { data: courses = [], isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ['courses-list'],
    queryFn: async () => {
      const res = await api.get('courses/list/');
      return res.data;
    }
  });

  const { data: mentors = [] } = useQuery<Mentor[]>({
    queryKey: ['mentors-list'],
    queryFn: async () => {
      const res = await api.get('users/mentors/');
      return res.data;
    }
  });

  const { data: modules = [], refetch: refetchModules } = useQuery<Module[]>({
    queryKey: ['modules', selectedCourse?.id],
    enabled: !!selectedCourse,
    queryFn: async () => {
      const res = await api.get(`modules/?course=${selectedCourse?.id}`);
      return res.data;
    }
  });

  const { data: lessons = [], refetch: refetchLessons } = useQuery<Lesson[]>({
    queryKey: ['lessons', selectedCourse?.id],
    enabled: !!selectedCourse,
    queryFn: async () => {
      const res = await api.get(`lessons/?course=${selectedCourse?.id}`);
      return res.data;
    }
  });

  const { data: assignments = [], refetch: refetchAssignments } = useQuery<Assignment[]>({
    queryKey: ['assignments', selectedCourse?.id],
    enabled: !!selectedCourse,
    queryFn: async () => {
      const res = await api.get('assignments/list/');
      return res.data.filter((a: any) => a.course === selectedCourse?.id || modules.some(m => m.id === a.module));
    }
  });

  const { data: quizzes = [], refetch: refetchQuizzes } = useQuery<Quiz[]>({
    queryKey: ['quizzes', selectedCourse?.id],
    enabled: !!selectedCourse,
    queryFn: async () => {
      const res = await api.get(`quizzes/list/?course=${selectedCourse?.id}`);
      return res.data;
    }
  });

  // Uploader helper
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingField(targetField);
    try {
      const res = await api.post('core/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const fileUrl = res.data.url;
      if (targetField === 'thumbnail') setCourseThumb(fileUrl);
      else if (targetField === 'video') setLesVideoUrl(fileUrl);
      else if (targetField === 'pdf') setLesPdf(fileUrl);
      else if (targetField === 'zip') setLesZip(fileUrl);
      else if (targetField === 'attachment') setAssignFileUrl(fileUrl);

      toast.success('Upload complete.');
    } catch {
      toast.error('Failed to upload file.');
    } finally {
      setUploadingField(null);
    }
  };

  // Course CRUD
  const saveCourseMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: courseTitle,
        description: courseDesc,
        mentor: courseMentor || null,
        thumbnail: courseThumb,
        instructor_name: instructorName,
        instructor_role: instructorRole,
        status: courseStatus,
        requirements: courseReqs,
        outcomes: courseOuts,
        slug: courseTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
      };
      if (selectedCourse) {
        await api.put(`courses/list/${selectedCourse.id}/`, payload);
      } else {
        await api.post('courses/list/', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses-list'] });
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
      setShowCourseModal(false);
      resetCourseForm();
      toast.success('Course profile saved.');
    },
    onError: () => {
      toast.error('Failed to save course.');
    }
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`courses/list/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses-list'] });
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
      setSelectedCourse(null);
      toast.success('Course layout wiped.');
    }
  });

  // Module CRUD
  const saveModuleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCourse) return;
      if (editingModule) {
        await api.put(`modules/${editingModule.id}/`, { title: modTitle, course: selectedCourse.id });
      } else {
        await api.post('modules/', { title: modTitle, course: selectedCourse.id, order: modules.length + 1 });
      }
    },
    onSuccess: () => {
      refetchModules();
      setShowModModal(false);
      setModTitle('');
      setEditingModule(null);
      toast.success('Module saved.');
    }
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`modules/${id}/`);
    },
    onSuccess: () => {
      refetchModules();
      toast.success('Module removed.');
    }
  });

  // Lesson CRUD
  const saveLessonMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCourse || !targetModuleId) return;
      const payload = {
        title: lesTitle,
        content: lesContent,
        module: targetModuleId,
        cf_stream_id: lesVideoUrl || undefined,
        pdf_ppt_url: lesPdf || undefined,
        zip_source_url: lesZip || undefined,
        additional_notes: lesNotes || undefined,
        order: lessons.filter(l => l.module === targetModuleId).length + 1
      };
      if (editingLesson) {
        await api.put(`lessons/${editingLesson.id}/`, payload);
      } else {
        await api.post('lessons/', payload);
      }
    },
    onSuccess: () => {
      refetchLessons();
      setShowLesModal(false);
      resetLessonForm();
      toast.success('Lesson saved.');
    }
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`lessons/${id}/`);
    },
    onSuccess: () => {
      refetchLessons();
      toast.success('Lesson deleted.');
    }
  });

  // Homework Assignment CRUD
  const saveAssignmentMutation = useMutation({
    mutationFn: async () => {
      if (!assignModuleId) return;
      const payload = {
        title: assignTitle,
        description: assignDesc,
        module: assignModuleId,
        due_date: assignDueDate || undefined,
        file_attachment: assignFileUrl || undefined
      };
      if (editingAssignment) {
        await api.put(`assignments/list/${editingAssignment.id}/`, payload);
      } else {
        await api.post('assignments/list/', payload);
      }
    },
    onSuccess: () => {
      refetchAssignments();
      setShowAssignModal(false);
      resetAssignForm();
      toast.success('Homework assignment saved.');
    }
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`assignments/list/${id}/`);
    },
    onSuccess: () => {
      refetchAssignments();
      toast.success('Homework task removed.');
    }
  });

  // Quiz Checkpoints CRUD
  const loadQuizDetails = async (moduleId: number) => {
    setQuizModuleId(moduleId);
    setActiveQuiz(null);
    setQuestions([]);
    setQText('');
    setQOptions('');
    setQCorrect('');
    setShowQuizModal(true);

    try {
      const res = await api.get(`quizzes/list/?module=${moduleId}`);
      const quiz = res.data.find((q: any) => q.module === moduleId);
      if (quiz) {
        const detailRes = await api.get(`quizzes/list/${quiz.id}/`);
        setActiveQuiz(detailRes.data);
        setQuizTitle(detailRes.data.title);
        setPassingScore(detailRes.data.passing_score);
        setTimerMinutes(detailRes.data.timer_minutes);
        setMaxRetries(detailRes.data.max_retries);
        setRandomizeQuestions(detailRes.data.randomize_questions);
        setQuestions(detailRes.data.questions || []);
      }
    } catch {
      toast.error('Quiz metadata details not found.');
    }
  };

  const handleSaveQuizSettings = async () => {
    if (!quizModuleId) return;
    try {
      const payload = {
        module: quizModuleId,
        title: quizTitle || 'Module Checkpoint',
        passing_score: passingScore,
        timer_minutes: timerMinutes,
        max_retries: maxRetries,
        randomize_questions: randomizeQuestions
      };
      if (activeQuiz) {
        const res = await api.put(`quizzes/list/${activeQuiz.id}/`, payload);
        setActiveQuiz(res.data);
      } else {
        const res = await api.post('quizzes/list/', payload);
        setActiveQuiz(res.data);
      }
      refetchQuizzes();
      toast.success('Quiz checkpoint parameters saved.');
    } catch {
      toast.error('Failed to configure quiz.');
    }
  };

  const handleAddQuestion = async () => {
    if (!activeQuiz || !qText.trim() || !qCorrect.trim()) {
      toast.error('Please fill in question prompt and correct match answer.');
      return;
    }
    const opts = qType === 'TF' ? ['True', 'False'] : qOptions.split(',').map(x => x.trim()).filter(Boolean);
    if (qType !== 'TF' && opts.length === 0) {
      toast.error('Please provide comma-separated options.');
      return;
    }
    try {
      const res = await api.post('quizzes/questions/', {
        quiz: activeQuiz.id,
        question_text: qText,
        question_type: qType,
        options: opts,
        correct_answer: qCorrect.trim()
      });
      setQuestions(prev => [...prev, res.data]);
      setQText('');
      setQOptions('');
      setQCorrect('');
      toast.success('Question added to database.');
    } catch {
      toast.error('Failed to save question.');
    }
  };

  const handleDeleteQuestion = async (qId: number) => {
    try {
      await api.delete(`quizzes/questions/${qId}/`);
      setQuestions(prev => prev.filter(q => q.id !== qId));
      toast.success('Question removed.');
    } catch {
      toast.error('Failed to delete question.');
    }
  };

  const handleDeleteQuiz = async () => {
    if (!activeQuiz) return;
    if (!window.confirm('Delete quiz checkpoint?')) return;
    try {
      await api.delete(`quizzes/list/${activeQuiz.id}/`);
      toast.success('Quiz deleted.');
      setShowQuizModal(false);
      refetchQuizzes();
    } catch {
      toast.error('Failed to delete quiz.');
    }
  };

  const resetCourseForm = () => {
    setCourseTitle('');
    setCourseDesc('');
    setCourseCategory(0);
    setCourseThumb('');
    setCourseMentor('');
    setInstructorName('');
    setInstructorRole('');
    setCourseStatus('PUBLISHED');
    setCourseReqs('');
    setCourseOuts('');
  };

  const openEditCourse = (course: Course) => {
    setSelectedCourse(course);
    setCourseTitle(course.title);
    setCourseDesc(course.description || '');
    setCourseCategory(course.category);
    setCourseThumb(course.thumbnail || '');
    setCourseMentor(course.mentor || '');
    setInstructorName(course.instructor_name || '');
    setInstructorRole(course.instructor_role || '');
    setCourseStatus(course.status);
    setCourseReqs(course.requirements || '');
    setCourseOuts(course.outcomes || '');
    setShowCourseModal(true);
  };

  const openCreateLesson = (modId: number) => {
    setTargetModuleId(modId);
    setEditingLesson(null);
    resetLessonForm();
    setShowLesModal(true);
  };

  const openEditLesson = (lesson: Lesson) => {
    setTargetModuleId(lesson.module);
    setEditingLesson(lesson);
    setLesTitle(lesson.title);
    setLesContent(lesson.content || '');
    setLesVideoUrl(lesson.cf_stream_id || '');
    setLesPdf(lesson.pdf_ppt_url || '');
    setLesZip(lesson.zip_source_url || '');
    setLesNotes(lesson.additional_notes || '');
    setShowLesModal(true);
  };

  const resetLessonForm = () => {
    setLesTitle('');
    setLesContent('');
    setLesVideoUrl('');
    setLesPdf('');
    setLesZip('');
    setLesNotes('');
  };

  const openCreateAssign = (modId: number) => {
    setAssignModuleId(modId);
    setEditingAssignment(null);
    resetAssignForm();
    setShowAssignModal(true);
  };

  const openEditAssign = (assign: Assignment) => {
    setAssignModuleId(assign.module);
    setEditingAssignment(assign);
    setAssignTitle(assign.title);
    setAssignDesc(assign.description || '');
    setAssignDueDate(assign.due_date ? assign.due_date.slice(0, 10) : '');
    setAssignFileUrl(assign.file_attachment || '');
    setShowAssignModal(true);
  };

  const resetAssignForm = () => {
    setAssignTitle('');
    setAssignDesc('');
    setAssignDueDate('');
    setAssignFileUrl('');
  };

  return (
    <div className="space-y-6 text-xs flex flex-col lg:flex-row gap-6 items-start">
      {/* Left Column: Courses list */}
      <div className="w-full lg:w-80 space-y-4 shrink-0">
        <div className="flex justify-between items-center">
          <h2 className="font-extrabold text-base">Course Tracks</h2>
          <button 
            onClick={() => { resetCourseForm(); setSelectedCourse(null); setShowCourseModal(true); }}
            className="p-2 bg-primary text-primary-foreground rounded-xl"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {coursesLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading tracks...</div>
          ) : (
            courses.map(c => (
              <div 
                key={c.id}
                onClick={() => setSelectedCourse(c)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex justify-between items-center gap-3 ${selectedCourse?.id === c.id ? 'bg-[#0f172a] border-primary/30 text-primary font-bold shadow-sm' : 'bg-card border-border hover:bg-muted/30'}`}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block">{c.category_name}</span>
                  <h4 className="font-extrabold text-sm truncate">{c.title}</h4>
                </div>
                <ChevronRight size={14} className="text-muted-foreground shrink-0" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Column: Outline Builder */}
      <div className="flex-1 w-full space-y-6">
        {selectedCourse ? (
          <div className="space-y-6">
            <div className="bg-card border border-border p-6 rounded-2xl flex justify-between items-start gap-4">
              <div>
                <span className="text-[9px] px-2.5 py-1 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold uppercase tracking-wide">
                  {selectedCourse.category_name}
                </span>
                <h2 className="text-2xl font-extrabold mt-3">{selectedCourse.title}</h2>
                <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{selectedCourse.description}</p>
              </div>

              <div className="flex gap-2">
                <button onClick={() => openEditCourse(selectedCourse)} className="p-2 hover:bg-muted border border-border rounded-xl font-semibold flex items-center gap-1">
                  <Edit3 size={13} />
                  <span>Edit Track</span>
                </button>
                <button 
                  onClick={() => { if (window.confirm('Wipe course catalog template?')) deleteCourseMutation.mutate(selectedCourse.id); }}
                  className="p-2 hover:bg-destructive/10 border border-border hover:text-destructive rounded-xl"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Modules Outline */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Layers size={16} className="text-primary" />
                  <span>Modules Outline Builder</span>
                </h3>
                <button 
                  onClick={() => { setModTitle(''); setEditingModule(null); setShowModModal(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground font-bold rounded-xl"
                >
                  <Plus size={12} />
                  <span>Add Module</span>
                </button>
              </div>

              <div className="space-y-3">
                {modules.map(mod => {
                  const modLessons = lessons.filter(l => l.module === mod.id);
                  const isExpanded = expandedModuleId === mod.id;
                  const modQuiz = quizzes.find(q => q.module === mod.id);
                  const modAssign = assignments.find(a => a.module === mod.id);

                  return (
                    <div key={mod.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                      <div 
                        onClick={() => setExpandedModuleId(isExpanded ? null : mod.id)}
                        className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-muted/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-1 bg-muted rounded">
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-foreground">{mod.title}</h4>
                            <span className="text-[10px] text-muted-foreground font-semibold">{modLessons.length} lessons, {modQuiz ? '1 quiz' : 'no quiz'}, {modAssign ? '1 assignment' : 'no assignment'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => { setEditingModule(mod); setModTitle(mod.title); setShowModModal(true); }} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"><Edit3 size={12} /></button>
                          <button onClick={() => { if (window.confirm('Delete module?')) deleteModuleMutation.mutate(mod.id); }} className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-border bg-muted/5 p-4 space-y-4 pl-8">
                          {/* Lessons sub list */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-muted-foreground block text-[10px] uppercase">Lessons List</span>
                              <button onClick={() => openCreateLesson(mod.id)} className="text-primary font-bold flex items-center gap-0.5 hover:underline">
                                <Plus size={11} /> Add Lesson
                              </button>
                            </div>
                            <div className="space-y-1.5">
                              {modLessons.map(les => (
                                <div key={les.id} className="p-3 bg-card border border-border/80 rounded-xl flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Play size={12} className="text-primary" />
                                    <span className="font-semibold truncate">{les.title}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => openEditLesson(les)} className="text-muted-foreground hover:text-foreground"><Edit3 size={11} /></button>
                                    <button onClick={() => { if (window.confirm('Delete lesson?')) deleteLessonMutation.mutate(les.id); }} className="text-muted-foreground hover:text-destructive"><Trash2 size={11} /></button>
                                  </div>
                                </div>
                              ))}
                              {modLessons.length === 0 && <p className="italic text-muted-foreground">No lessons created in this module.</p>}
                            </div>
                          </div>

                          {/* Checkpoint Quiz */}
                          <div className="space-y-2 border-t border-border/50 pt-3">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-muted-foreground block text-[10px] uppercase">Module Checkpoint Quiz</span>
                              {!modQuiz && (
                                <button onClick={() => loadQuizDetails(mod.id)} className="text-primary font-bold flex items-center gap-0.5 hover:underline">
                                  <Plus size={11} /> Create Quiz
                                </button>
                              )}
                            </div>
                            {modQuiz ? (
                              <div className="p-3 bg-card border border-emerald-500/10 rounded-xl flex items-center justify-between gap-4 text-emerald-500">
                                <div className="flex items-center gap-2">
                                  <HelpCircle size={12} />
                                  <span className="font-semibold">{modQuiz.title} ({modQuiz.passing_score}% Pass)</span>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => loadQuizDetails(mod.id)} className="text-muted-foreground hover:text-foreground"><Edit3 size={11} /></button>
                                </div>
                              </div>
                            ) : (
                              <p className="italic text-muted-foreground">No quiz checkpoint scheduled.</p>
                            )}
                          </div>

                          {/* Assignments */}
                          <div className="space-y-2 border-t border-border/50 pt-3">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-muted-foreground block text-[10px] uppercase">Homework Assignment</span>
                              {!modAssign && (
                                <button onClick={() => openCreateAssign(mod.id)} className="text-primary font-bold flex items-center gap-0.5 hover:underline">
                                  <Plus size={11} /> Create Assignment
                                </button>
                              )}
                            </div>
                            {modAssign ? (
                              <div className="p-3 bg-card border border-border/80 rounded-xl flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <ClipboardList size={12} className="text-primary" />
                                  <span className="font-semibold">{modAssign.title}</span>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => openEditAssign(modAssign)} className="text-muted-foreground hover:text-foreground"><Edit3 size={11} /></button>
                                  <button onClick={() => { if (window.confirm('Delete assignment?')) deleteAssignmentMutation.mutate(modAssign.id); }} className="text-muted-foreground hover:text-destructive"><Trash2 size={11} /></button>
                                </div>
                              </div>
                            ) : (
                              <p className="italic text-muted-foreground">No homework assignment checklist posted.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {modules.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl bg-card">
                    No curriculum modules outline established yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-24 text-center text-muted-foreground bg-card border border-border rounded-2xl">
            Choose a training track course from the catalog drawer to design its layout.
          </div>
        )}
      </div>

      {/* Course Edit/Create Modal */}
      <AnimatePresence>
        {showCourseModal && (
          <div onClick={() => setShowCourseModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-bold text-sm">{selectedCourse ? 'Modify Course Layout' : 'Create Course Layout'}</h3>
                <button onClick={() => setShowCourseModal(false)}><X size={16} /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); saveCourseMutation.mutate(); }} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Course Title *</label>
                  <input type="text" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} required className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                </div>

                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Course Briefing / Description *</label>
                  <textarea value={courseDesc} onChange={(e) => setCourseDesc(e.target.value)} required rows={3} className="w-full p-3 bg-muted/40 border border-border rounded-xl outline-none resize-none" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Instructor Name</label>
                    <input type="text" value={instructorName} onChange={(e) => setInstructorName(e.target.value)} className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Instructor Role</label>
                    <input type="text" value={instructorRole} onChange={(e) => setInstructorRole(e.target.value)} className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Catalog Status</label>
                  <select value={courseStatus} onChange={(e) => setCourseStatus(e.target.value as any)} className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none">
                    <option value="DRAFT">Draft Mode</option>
                    <option value="PUBLISHED">Published Catalog</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Pre-requisites</label>
                  <input type="text" value={courseReqs} onChange={(e) => setCourseReqs(e.target.value)} className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                </div>
                <button type="submit" disabled={saveCourseMutation.isPending} className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl">Save Track Configuration</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Module Edit/Create Modal */}
      <AnimatePresence>
        {showModModal && (
          <div onClick={() => setShowModModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-bold text-sm">{editingModule ? 'Modify Module Title' : 'New Outline Module'}</h3>
                <button onClick={() => setShowModModal(false)}><X size={16} /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); saveModuleMutation.mutate(); }} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Module Title *</label>
                  <input type="text" value={modTitle} onChange={(e) => setModTitle(e.target.value)} required className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                </div>
                <button type="submit" disabled={saveModuleMutation.isPending} className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl">Save Module</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lesson Edit/Create Modal */}
      <AnimatePresence>
        {showLesModal && (
          <div onClick={() => setShowLesModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-bold text-sm">{editingLesson ? 'Edit Lesson Parameters' : 'Add Module Lesson'}</h3>
                <button onClick={() => setShowLesModal(false)}><X size={16} /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); saveLessonMutation.mutate(); }} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Lesson Title *</label>
                  <input type="text" value={lesTitle} onChange={(e) => setLesTitle(e.target.value)} required className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Markdown Lesson Content *</label>
                  <textarea value={lesContent} onChange={(e) => setLesContent(e.target.value)} required rows={6} className="w-full p-3 bg-muted/40 border border-border rounded-xl outline-none resize-none font-mono text-[11px]" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Cloudflare Stream Video</label>
                    {lesVideoUrl ? (
                      <div className="flex items-center gap-2 h-10 px-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 rounded-xl">
                        <Video size={13} className="shrink-0" />
                        <span className="truncate flex-1">{lesVideoUrl.split('/').pop()}</span>
                        <button onClick={() => setLesVideoUrl('')} className="text-destructive"><X size={12} /></button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-1.5 h-10 px-3 bg-muted/40 border border-dashed border-border rounded-xl cursor-pointer">
                        {uploadingField === 'video' ? <Loader2 size={13} className="animate-spin text-primary" /> : <Upload size={13} />}
                        <span>Select Video/Media File</span>
                        <input type="file" onChange={(e) => handleFileUpload(e, 'video')} className="hidden" />
                      </label>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Lesson PDF Slides</label>
                    {lesPdf ? (
                      <div className="flex items-center gap-2 h-10 px-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 rounded-xl">
                        <FileText size={13} className="shrink-0" />
                        <span className="truncate flex-1">{lesPdf.split('/').pop()}</span>
                        <button onClick={() => setLesPdf('')} className="text-destructive"><X size={12} /></button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-1.5 h-10 px-3 bg-muted/40 border border-dashed border-border rounded-xl cursor-pointer">
                        {uploadingField === 'pdf' ? <Loader2 size={13} className="animate-spin text-primary" /> : <Upload size={13} />}
                        <span>Select Slides/Document</span>
                        <input type="file" onChange={(e) => handleFileUpload(e, 'pdf')} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Project template (.zip files)</label>
                  {lesZip ? (
                    <div className="flex items-center gap-2 h-10 px-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 rounded-xl">
                      <Layers size={13} className="shrink-0" />
                      <span className="truncate flex-1">{lesZip.split('/').pop()}</span>
                      <button onClick={() => setLesZip('')} className="text-destructive"><X size={12} /></button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-1.5 h-10 px-3 bg-muted/40 border border-dashed border-border rounded-xl cursor-pointer">
                      {uploadingField === 'zip' ? <Loader2 size={13} className="animate-spin text-primary" /> : <Upload size={13} />}
                      <span>Select Code/Project template</span>
                      <input type="file" onChange={(e) => handleFileUpload(e, 'zip')} className="hidden" />
                    </label>
                  )}
                </div>
                <button type="submit" disabled={saveLessonMutation.isPending} className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl">Save Lesson</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assignment Edit/Create Modal */}
      <AnimatePresence>
        {showAssignModal && (
          <div onClick={() => setShowAssignModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-bold text-sm">{editingAssignment ? 'Modify Homework details' : 'Post Homework Assignment'}</h3>
                <button onClick={() => setShowAssignModal(false)}><X size={16} /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); saveAssignmentMutation.mutate(); }} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Assignment Title *</label>
                  <input type="text" value={assignTitle} onChange={(e) => setAssignTitle(e.target.value)} required className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Guidelines / Rubrics Instructions *</label>
                  <textarea value={assignDesc} onChange={(e) => setAssignDesc(e.target.value)} required rows={4} className="w-full p-3 bg-muted/40 border border-border rounded-xl outline-none resize-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Deadline Date</label>
                  <input type="date" value={assignDueDate} onChange={(e) => setAssignDueDate(e.target.value)} className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Guideline file attachment</label>
                  {assignFileUrl ? (
                    <div className="flex items-center gap-2 h-10 px-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 rounded-xl">
                      <FileText size={13} className="shrink-0" />
                      <span className="truncate flex-1">{assignFileUrl.split('/').pop()}</span>
                      <button onClick={() => setAssignFileUrl('')} className="text-destructive"><X size={12} /></button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-1.5 h-10 px-3 bg-muted/40 border border-dashed border-border rounded-xl cursor-pointer">
                      {uploadingField === 'attachment' ? <Loader2 size={13} className="animate-spin text-primary" /> : <Upload size={13} />}
                      <span>Select Homework guidelines</span>
                      <input type="file" onChange={(e) => handleFileUpload(e, 'attachment')} className="hidden" />
                    </label>
                  )}
                </div>
                <button type="submit" disabled={saveAssignmentMutation.isPending} className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl">Save Homework Task</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quiz Checkpoint Modal */}
      <AnimatePresence>
        {showQuizModal && (
          <div onClick={() => setShowQuizModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-bold text-sm">Quiz Checkpoint Designer</h3>
                <div className="flex gap-2">
                  {activeQuiz && (
                    <button onClick={handleDeleteQuiz} className="text-destructive font-semibold hover:underline">Delete Quiz</button>
                  )}
                  <button onClick={() => setShowQuizModal(false)}><X size={16} /></button>
                </div>
              </div>

              {/* Top half: configurations */}
              <div className="grid gap-4 sm:grid-cols-2 bg-muted/10 p-4 border border-border rounded-xl">
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Quiz Title</label>
                    <input type="text" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} className="w-full h-8 px-2 bg-card border border-border rounded-lg" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Timer Minutes</label>
                      <input type="number" value={timerMinutes} onChange={(e) => setTimerMinutes(Number(e.target.value))} className="w-full h-8 px-2 bg-card border border-border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Passing Score %</label>
                      <input type="number" value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} className="w-full h-8 px-2 bg-card border border-border rounded-lg" />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Retries Limit</label>
                      <input type="number" value={maxRetries} onChange={(e) => setMaxRetries(Number(e.target.value))} className="w-full h-8 px-2 bg-card border border-border rounded-lg" />
                    </div>
                    <div className="pt-5 flex items-center gap-1.5">
                      <input type="checkbox" id="rand" checked={randomizeQuestions} onChange={(e) => setRandomizeQuestions(e.target.checked)} className="accent-primary" />
                      <label htmlFor="rand" className="font-bold text-[10px] uppercase text-muted-foreground cursor-pointer">Randomize Seq</label>
                    </div>
                  </div>
                  <button onClick={handleSaveQuizSettings} className="w-full h-9 mt-1 bg-primary text-primary-foreground font-bold rounded-lg shadow">
                    Save Quiz Parameters
                  </button>
                </div>
              </div>

              {/* Bottom half: Add questions (only if activeQuiz exists) */}
              {activeQuiz ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  {/* Left: Add question form */}
                  <div className="sm:col-span-1 space-y-3 bg-muted/20 p-4 border border-border rounded-xl">
                    <h5 className="font-bold text-xs uppercase text-muted-foreground border-b border-border pb-1.5">Add Question</h5>
                    <div>
                      <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Question Prompt *</label>
                      <input type="text" value={qText} onChange={(e) => setQText(e.target.value)} placeholder="e.g. What is Django?" className="w-full h-8 px-2 bg-card border border-border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Question Type</label>
                      <select value={qType} onChange={(e) => setQType(e.target.value as any)} className="w-full h-8 px-2 bg-card border border-border rounded-lg">
                        <option value="MCQ">Multiple Choice</option>
                        <option value="TF">True / False</option>
                        <option value="MSQ">Multiple Select</option>
                      </select>
                    </div>
                    {qType !== 'TF' && (
                      <div>
                        <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Options (Comma separated) *</label>
                        <input type="text" value={qOptions} onChange={(e) => setQOptions(e.target.value)} placeholder="A, B, C, D" className="w-full h-8 px-2 bg-card border border-border rounded-lg" />
                      </div>
                    )}
                    {qType === 'TF' ? (
                      <div>
                        <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Correct Option Match *</label>
                        <select value={qCorrect} onChange={(e) => setQCorrect(e.target.value)} className="w-full h-8 px-2 bg-card border border-border rounded-lg text-xs">
                          <option value="">Select Correct Answer</option>
                          <option value="True">True</option>
                          <option value="False">False</option>
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Correct Option Match *</label>
                        <input type="text" value={qCorrect} onChange={(e) => setQCorrect(e.target.value)} placeholder="A" className="w-full h-8 px-2 bg-card border border-border rounded-lg" />
                      </div>
                    )}
                    <button onClick={handleAddQuestion} className="w-full py-2 bg-primary text-primary-foreground font-bold rounded-lg flex items-center justify-center gap-1">
                      <PlusCircle size={12} />
                      <span>Push Question</span>
                    </button>
                  </div>

                  {/* Right: Questions list */}
                  <div className="sm:col-span-2 space-y-3">
                    <h5 className="font-bold text-xs uppercase text-muted-foreground border-b border-border pb-1.5 flex justify-between">
                      <span>Questions database ({questions.length})</span>
                    </h5>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {questions.map((q, i) => (
                        <div key={q.id || i} className="p-3 bg-card border border-border rounded-xl flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <span className="font-mono text-[9px] text-muted-foreground">{i + 1}. [{q.question_type}]</span>
                            <p className="font-bold">{q.question_text}</p>
                            <div className="flex flex-wrap gap-1 text-[9px]">
                              {q.options && q.options.map((opt: string, oIdx: number) => (
                                <span key={oIdx} className="bg-muted px-1.5 py-0.5 rounded border border-border/40 font-semibold">{opt}</span>
                              ))}
                            </div>
                            <span className="text-[10px] text-emerald-500 font-bold block mt-1">Answer: {q.correct_answer}</span>
                          </div>
                          <button onClick={() => handleDeleteQuestion(q.id)} className="text-destructive"><Trash2 size={12} /></button>
                        </div>
                      ))}
                      {questions.length === 0 && (
                        <p className="italic text-muted-foreground text-center py-10">No questions currently in this checkpoint quiz.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground bg-muted/20 border border-dashed border-border rounded-xl font-semibold">
                  <span>Save Quiz Parameters above to enable Question Designer.</span>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default CoursesTab;
