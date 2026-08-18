import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import UniversalVideoPlayer from '../../../components/UniversalVideoPlayer';
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
  is_published: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  requirements?: string;
  outcomes?: string;
  learning_path?: string;
  instructor_name?: string;
  instructor_role?: string;
  mentor_name?: string;
  created_by_name?: string;
}

interface Category {
  id: number;
  name: string;
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

interface CoursesTabProps {
  isRecordingsMode?: boolean;
}

export const CoursesTab: React.FC<CoursesTabProps> = ({ isRecordingsMode = false }) => {
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
  const [previewVideoLesson, setPreviewVideoLesson] = useState<{ id: number; title: string; url: string } | null>(null);

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
  const [passingScore, setPassingScore] = useState(0);
  const [minCorrectInput, setMinCorrectInput] = useState<string | number>(0);
  const [timerMinutes, setTimerMinutes] = useState<string | number>(15);
  const [maxRetries, setMaxRetries] = useState<string | number>(10);
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);

  // Questions within quiz state
  const [questions, setQuestions] = useState<any[]>([]);
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<'MCQ' | 'TF' | 'MSQ'>('MCQ');
  const [qOptions, setQOptions] = useState('');
  const [qCorrect, setQCorrect] = useState('');

  // Interactive Question Builder states
  const [customOptions, setCustomOptions] = useState<string[]>(['', '', '', '']);
  const [mcqCorrectIdx, setMcqCorrectIdx] = useState<number>(0);
  const [msqCorrectFlags, setMsqCorrectFlags] = useState<boolean[]>([false, false, false, false]);
  const [tfCorrectVal, setTfCorrectVal] = useState<'True' | 'False'>('True');

  // Upload loaders
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  // Queries
  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses-list', isRecordingsMode],
    queryFn: async () => {
      const res = await api.get(`courses/list/?is_mentoring_track=${isRecordingsMode}`);
      return res.data;
    }
  });

  React.useEffect(() => {
    if (selectedCourse && courses) {
      const updated = courses.find(c => c.id === selectedCourse.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedCourse)) {
        setSelectedCourse(updated);
      }
    }
  }, [courses, selectedCourse]);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories-list', isRecordingsMode],
    queryFn: async () => {
      const type = isRecordingsMode ? 'LIVE' : 'COURSE';
      const res = await api.get(`courses/categories/?type=${type}`);
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
      const res = await api.get(`assignments/list/?course=${selectedCourse?.id}`);
      return res.data;
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
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 0 // Disable timeout for large video uploads
      });
      const fileUrl = res.data.url;
      if (targetField === 'thumbnail') setCourseThumb(fileUrl);
      else if (targetField === 'video') setLesVideoUrl(fileUrl);
      else if (targetField === 'pdf') setLesPdf(fileUrl);
      else if (targetField === 'zip') setLesZip(fileUrl);
      else if (targetField === 'attachment') setAssignFileUrl(fileUrl);

      toast.success('Upload complete.');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to upload file.';
      toast.error(msg);
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
        category: courseCategory ? Number(courseCategory) : null,
        thumbnail: courseThumb,
        instructor_name: instructorName,
        instructor_role: instructorRole,
        status: courseStatus,
        requirements: courseReqs,
        outcomes: courseOuts,
        slug: courseTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || `course-${Date.now()}`,
        is_mentoring_track: isRecordingsMode
      };
      if (selectedCourse) {
        await api.put(`courses/list/${selectedCourse.id}/`, payload);
      } else {
        await api.post('courses/list/', payload);
      }
    },
    onMutate: async () => {
      const payload = {
        title: courseTitle,
        description: courseDesc,
        category: courseCategory ? Number(courseCategory) : null,
        thumbnail: courseThumb,
        instructor_name: instructorName,
        instructor_role: instructorRole,
        status: courseStatus,
        requirements: courseReqs,
        outcomes: courseOuts,
        slug: courseTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || `course-${Date.now()}`,
        is_mentoring_track: isRecordingsMode
      };
      await queryClient.cancelQueries({ queryKey: ['courses-list'] });
      const previousCourses = queryClient.getQueryData<any[]>(['courses-list']);
      
      const newCourse = {
        id: selectedCourse ? selectedCourse.id : Math.random(),
        ...payload,
        category_name: categories.find(c => c.id === courseCategory)?.name || '',
        mentor_name: 'Me',
        progress_percentage: 0,
        created_at: new Date().toISOString()
      };
      
      queryClient.setQueryData<any[]>(['courses-list'], (old) => {
        if (selectedCourse) {
          return (old || []).map(c => c.id === selectedCourse.id ? newCourse : c);
        } else {
          return [...(old || []), newCourse];
        }
      });
      setShowCourseModal(false);
      return { previousCourses };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousCourses) {
        queryClient.setQueryData(['courses-list'], context.previousCourses);
      }
      toast.error('Failed to save course.');
    },
    onSuccess: () => {
      resetCourseForm();
      toast.success('Course profile saved.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['courses-list'] });
      queryClient.invalidateQueries({ queryKey: ['courses-dropdown-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
    }
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`courses/list/${id}/`);
    },
    // Optimistic update: remove course from cache immediately
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['courses-list'] });
      const previous = queryClient.getQueryData<Course[]>(['courses-list']);
      if (previous) {
        queryClient.setQueryData(['courses-list'], previous.filter(c => c.id !== id));
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['courses-list'], context.previous);
      }
      toast.error('Failed to delete course.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['courses-list'] });
      queryClient.invalidateQueries({ queryKey: ['courses-dropdown-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
      setSelectedCourse(null);
      toast.success('Course layout wiped.');
    }
  });

  // Module CRUD
  const saveModuleMutation = useMutation({
    mutationFn: async (payload: { title: string; courseId: number; editingModuleId?: number; isEdit: boolean }) => {
      if (!payload.courseId) throw new Error("Course not selected");
      if (!payload.title.trim()) {
        toast.error("Module title is required");
        throw new Error("Title required");
      }
      if (payload.isEdit) {
        await api.put(`modules/${payload.editingModuleId}/`, { title: payload.title, course: payload.courseId });
      } else {
        await api.post('modules/', { title: payload.title, course: payload.courseId, order: modules.length + 1 });
      }
    },
    onMutate: async (payload) => {
      if (!payload.title.trim()) return;
      await queryClient.cancelQueries({ queryKey: ['modules', payload.courseId] });
      const previousModules = queryClient.getQueryData(['modules', payload.courseId]);
      
      if (payload.isEdit) {
        queryClient.setQueryData(['modules', payload.courseId], (old: any) => 
          (old || []).map((m: any) => m.id === payload.editingModuleId ? { ...m, title: payload.title } : m)
        );
      } else {
        queryClient.setQueryData(['modules', payload.courseId], (old: any) => [
          ...(old || []),
          { id: Math.random(), title: payload.title, course: payload.courseId, order: modules.length + 1 }
        ]);
      }
      
      setShowModModal(false);
      setModTitle('');
      setEditingModule(null);
      return { previousModules, courseId: payload.courseId };
    },
    onError: (err, variables, context: any) => {
      queryClient.setQueryData(['modules', context?.courseId], context?.previousModules);
    },
    onSettled: () => {
      refetchModules();
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
    }
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`modules/${id}/`);
    },
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['modules', selectedCourse?.id] });
      const previousModules = queryClient.getQueryData(['modules', selectedCourse?.id]);
      queryClient.setQueryData(['modules', selectedCourse?.id], (old: any) => 
        (old || []).filter((m: any) => m.id !== id)
      );
      return { previousModules };
    },
    onError: (err, id, context: any) => {
      queryClient.setQueryData(['modules', selectedCourse?.id], context?.previousModules);
      toast.error('Failed to remove module.');
    },
    onSettled: () => {
      refetchModules();
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
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
    onMutate: async () => {
      if (!selectedCourse || !targetModuleId) return;
      await queryClient.cancelQueries({ queryKey: ['lessons', selectedCourse.id] });
      const previousLessons = queryClient.getQueryData(['lessons', selectedCourse.id]);
      
      const newLesson = {
        id: editingLesson ? editingLesson.id : Math.random(),
        title: lesTitle,
        content: lesContent,
        module: targetModuleId,
        cf_stream_id: lesVideoUrl || null,
        pdf_ppt_url: lesPdf || null,
        zip_source_url: lesZip || null,
        additional_notes: lesNotes || null,
        order: lessons.filter(l => l.module === targetModuleId).length + 1
      };
      
      queryClient.setQueryData(['lessons', selectedCourse.id], (old: any) => {
        if (editingLesson) {
          return (old || []).map((l: any) => l.id === editingLesson.id ? newLesson : l);
        } else {
          return [...(old || []), newLesson];
        }
      });
      
      setShowLesModal(false);
      return { previousLessons };
    },
    onError: (err, variables, context: any) => {
      if (context?.previousLessons && selectedCourse) {
        queryClient.setQueryData(['lessons', selectedCourse.id], context.previousLessons);
      }
      toast.error('Failed to save lesson.');
    },
    onSuccess: () => {
      resetLessonForm();
      toast.success('Lesson saved.');
    },
    onSettled: () => {
      refetchLessons();
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
    }
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`lessons/${id}/`);
    },
    onMutate: async (id: number) => {
      if (!selectedCourse) return;
      await queryClient.cancelQueries({ queryKey: ['lessons', selectedCourse.id] });
      const previousLessons = queryClient.getQueryData(['lessons', selectedCourse.id]);
      queryClient.setQueryData(['lessons', selectedCourse.id], (old: any) => 
        (old || []).filter((l: any) => l.id !== id)
      );
      return { previousLessons };
    },
    onError: (err, id, context: any) => {
      if (context?.previousLessons && selectedCourse) {
        queryClient.setQueryData(['lessons', selectedCourse.id], context.previousLessons);
      }
      toast.error('Failed to delete lesson.');
    },
    onSettled: () => {
      refetchLessons();
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
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
    onMutate: async () => {
      if (!selectedCourse || !assignModuleId) return;
      await queryClient.cancelQueries({ queryKey: ['assignments', selectedCourse.id] });
      const previousAssignments = queryClient.getQueryData(['assignments', selectedCourse.id]);
      
      const newAssignment = {
        id: editingAssignment ? editingAssignment.id : Math.random(),
        title: assignTitle,
        description: assignDesc,
        module: assignModuleId,
        due_date: assignDueDate || null,
        file_attachment: assignFileUrl || null,
        course: selectedCourse.id
      };
      
      queryClient.setQueryData(['assignments', selectedCourse.id], (old: any) => {
        if (editingAssignment) {
          return (old || []).map((a: any) => a.id === editingAssignment.id ? newAssignment : a);
        } else {
          return [...(old || []), newAssignment];
        }
      });
      
      setShowAssignModal(false);
      return { previousAssignments };
    },
    onError: (err, variables, context: any) => {
      if (context?.previousAssignments && selectedCourse) {
        queryClient.setQueryData(['assignments', selectedCourse.id], context.previousAssignments);
      }
      toast.error('Failed to save assignment.');
    },
    onSuccess: () => {
      resetAssignForm();
      toast.success('Homework assignment saved.');
    },
    onSettled: () => {
      refetchAssignments();
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
    }
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`assignments/list/${id}/`);
    },
    onMutate: async (id: number) => {
      if (!selectedCourse) return;
      await queryClient.cancelQueries({ queryKey: ['assignments', selectedCourse.id] });
      const previousAssignments = queryClient.getQueryData(['assignments', selectedCourse.id]);
      queryClient.setQueryData(['assignments', selectedCourse.id], (old: any) => 
        (old || []).filter((a: any) => a.id !== id)
      );
      return { previousAssignments };
    },
    onError: (err, id, context: any) => {
      if (context?.previousAssignments && selectedCourse) {
        queryClient.setQueryData(['assignments', selectedCourse.id], context.previousAssignments);
      }
      toast.error('Failed to remove assignment.');
    },
    onSettled: () => {
      refetchAssignments();
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
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
    setQuizTitle('');
    setPassingScore(0);
    setMinCorrectInput(0);
    setTimerMinutes(15);
    setMaxRetries(10);
    setRandomizeQuestions(true);
    setShowQuizModal(true);

    const quiz = quizzes.find((q: any) => q.module === moduleId);
    if (quiz) {
      try {
        const detailRes = await api.get(`quizzes/list/${quiz.id}/`);
        setActiveQuiz(detailRes.data);
        setQuizTitle(detailRes.data.title);
        const pScore = detailRes.data.passing_score ?? 0;
        setPassingScore(pScore);
        const qList = detailRes.data.questions || [];
        const calculatedMin = qList.length > 0 ? Math.round((pScore / 100) * qList.length) : pScore;
        setMinCorrectInput(calculatedMin);
        setTimerMinutes(detailRes.data.timer_minutes);
        setMaxRetries(detailRes.data.max_retries);
        setRandomizeQuestions(detailRes.data.randomize_questions);
        setQuestions(qList);
      } catch {
        toast.error('Quiz metadata details not found.');
      }
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
      let savedQuiz;
      if (activeQuiz) {
        const res = await api.put(`quizzes/list/${activeQuiz.id}/`, payload);
        savedQuiz = res.data;
        setActiveQuiz(savedQuiz);
      } else {
        const res = await api.post('quizzes/list/', payload);
        savedQuiz = res.data;
        setActiveQuiz(savedQuiz);
      }
      if (selectedCourse) {
        queryClient.setQueryData(['quizzes', selectedCourse.id], (old: any) => {
          const oldList = old || [];
          if (oldList.some((q: any) => q.module === quizModuleId)) {
            return oldList.map((q: any) => q.module === quizModuleId ? savedQuiz : q);
          }
          return [...oldList, savedQuiz];
        });
      }
      refetchQuizzes();
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
      toast.success('Quiz checkpoint parameters saved.');
    } catch {
      toast.error('Failed to configure quiz.');
    }
  };

  const handleAddQuestion = async () => {
    if (!activeQuiz || !qText.trim()) {
      toast.error('Please enter the question text/prompt.');
      return;
    }

    let opts: string[] = [];
    let correctAnsVal = '';

    if (qType === 'TF') {
      opts = ['True', 'False'];
      correctAnsVal = tfCorrectVal;
    } else {
      opts = customOptions.map(x => x.trim()).filter(Boolean);
      if (opts.length < 2) {
        toast.error('Please provide at least 2 non-empty options.');
        return;
      }

      if (qType === 'MCQ') {
        if (mcqCorrectIdx < 0 || mcqCorrectIdx >= opts.length) {
          toast.error('Please select a valid correct option.');
          return;
        }
        correctAnsVal = opts[mcqCorrectIdx];
      } else if (qType === 'MSQ') {
        const correctList = opts.filter((_, idx) => msqCorrectFlags[idx]);
        if (correctList.length === 0) {
          toast.error('Please select at least one correct option.');
          return;
        }
        correctAnsVal = correctList.join(', ');
      }
    }

    try {
      const res = await api.post('quizzes/questions/', {
        quiz: activeQuiz.id,
        question_text: qText,
        question_type: qType,
        options: opts,
        correct_answer: correctAnsVal
      });
      setQuestions(prev => [...prev, res.data]);
      setQText('');
      setCustomOptions(['', '', '', '']);
      setMcqCorrectIdx(0);
      setMsqCorrectFlags([false, false, false, false]);
      setTfCorrectVal('True');
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
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
    } catch {
      toast.error('Failed to delete quiz.');
    }
  };

  const resetCourseForm = () => {
    setCourseTitle('');
    setCourseDesc('');
    setCourseCategory(categories[0]?.id || 0);
    setCourseThumb('');
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
          <h2 className="font-extrabold text-base">
            {isRecordingsMode ? 'Mentoring Tracks' : 'Course Tracks'}
          </h2>
          {!isRecordingsMode && (
            <button 
              onClick={() => { resetCourseForm(); setSelectedCourse(null); setShowCourseModal(true); }}
              className="p-2 bg-primary text-primary-foreground rounded-xl"
              title="Create New Track"
            >
              <Plus size={16} />
            </button>
          )}
        </div>

        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {courses.map(c => (
              <div 
                key={c.id}
                onClick={() => setSelectedCourse(c)}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex justify-between items-center gap-3 ${selectedCourse?.id === c.id ? 'bg-primary/10 border-primary shadow-sm' : 'bg-card border-border hover:bg-muted/30'}`}
              >
                <div className="min-w-0 flex-1">
                  <div className={`flex justify-between items-center text-[9px] uppercase font-bold tracking-wider mb-0.5 ${selectedCourse?.id === c.id ? 'text-primary font-extrabold' : 'text-muted-foreground'}`}>
                    <span>{c.category_name}</span>
                    {isRecordingsMode && c.created_by_name && (
                      <span className="text-primary font-extrabold font-mono">Created By: {c.created_by_name}</span>
                    )}
                  </div>
                  <h4 className="font-extrabold text-sm truncate text-foreground">{c.title}</h4>
                </div>
                <ChevronRight size={14} className={`shrink-0 ${selectedCourse?.id === c.id ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
            ))}
        </div>
      </div>

      {/* Right Column: Outline Builder */}
      <div className="flex-1 w-full space-y-6">
        {selectedCourse ? (
          <div className="space-y-6">
            <div className="bg-card border border-border p-6 rounded-2xl flex justify-between items-start gap-4">
              <div>
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-[9px] px-2.5 py-1 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold uppercase tracking-wide">
                    {selectedCourse.category_name}
                  </span>
                  {isRecordingsMode && selectedCourse.created_by_name && (
                    <span className="text-[9px] px-2.5 py-1 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-500 font-bold uppercase tracking-wide">
                      Creator: {selectedCourse.created_by_name}
                    </span>
                  )}
                </div>
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
                  <span>{isRecordingsMode ? 'Recorded Sessions Builder' : 'Modules Outline Builder'}</span>
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
                            {!isRecordingsMode && (
                              <span className="text-[10px] text-muted-foreground font-semibold">{modLessons.length} lessons, {modQuiz ? '1 quiz' : 'no quiz'}, {modAssign ? '1 assignment' : 'no assignment'}</span>
                            )}
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
                            <div className="space-y-2">
                              {modLessons.map(les => {
                                const hasVideo = !!les.cf_stream_id;
                                const isPlaying = previewVideoLesson?.id === les.id;

                                return (
                                  <div key={les.id} className="bg-card border border-border/80 rounded-xl overflow-hidden transition-all">
                                    <div className="p-3 flex items-center justify-between gap-4">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <Play size={12} className="text-primary shrink-0" />
                                        <span className="font-semibold truncate">{les.title}</span>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        {hasVideo && (
                                          <button 
                                            onClick={() => setPreviewVideoLesson(isPlaying ? null : { id: les.id, title: les.title, url: les.cf_stream_id || '' })}
                                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                              isPlaying 
                                                ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/30' 
                                                : 'bg-primary/10 text-primary hover:bg-primary/20'
                                            }`}
                                            title="Preview uploaded lesson video"
                                          >
                                            <Video size={11} />
                                            <span>{isPlaying ? 'Hide Player' : 'Watch Video'}</span>
                                          </button>
                                        )}
                                        <button onClick={() => openEditLesson(les)} title="Edit lesson" className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded"><Edit3 size={11} /></button>
                                        <button onClick={() => { if (window.confirm('Delete lesson?')) deleteLessonMutation.mutate(les.id); }} title="Delete lesson" className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"><Trash2 size={11} /></button>
                                      </div>
                                    </div>

                                    {/* Mini Video Preview Box */}
                                    {isPlaying && (
                                      <div className="border-t border-border bg-slate-950 p-3.5 space-y-2">
                                        <div className="flex items-center justify-between text-xs text-slate-300">
                                          <span className="font-bold flex items-center gap-1.5 text-cyan-400">
                                            <Video size={13} /> {les.title} (Video Preview)
                                          </span>
                                          <button 
                                            onClick={() => setPreviewVideoLesson(null)} 
                                            className="px-2 py-0.5 text-[10px] bg-slate-800 text-slate-300 hover:text-white rounded-md flex items-center gap-1"
                                          >
                                            <X size={11} /> Close Player
                                          </button>
                                        </div>
                                        <div className="relative aspect-video max-w-lg mx-auto rounded-xl overflow-hidden bg-black border border-cyan-500/30 shadow-2xl">
                                          <UniversalVideoPlayer src={les.cf_stream_id || ''} title={les.title} autoPlay={true} />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {modLessons.length === 0 && <p className="italic text-muted-foreground">No lessons created in this module.</p>}
                            </div>
                          </div>

                          {!isRecordingsMode && (
                            <>
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
                            </>
                          )}
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
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Category *</label>
                  <select value={courseCategory} onChange={(e) => setCourseCategory(Number(e.target.value))} required className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none">
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
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
              <form onSubmit={(e) => { 
                e.preventDefault(); 
                if (selectedCourse) {
                  saveModuleMutation.mutate({
                    title: modTitle,
                    courseId: selectedCourse.id,
                    editingModuleId: editingModule?.id,
                    isEdit: !!editingModule
                  });
                }
              }} className="space-y-4">
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
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 h-10 px-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 rounded-xl">
                          <Video size={13} className="shrink-0" />
                          <span className="truncate flex-1">{lesVideoUrl.split('/').pop()}</span>
                          <button onClick={() => setLesVideoUrl('')} className="text-destructive"><X size={12} /></button>
                        </div>
                        {/* Live Mini Preview Box inside modal */}
                        <div className="p-2.5 bg-slate-950 rounded-xl border border-cyan-500/30 space-y-1.5">
                          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                            <Play size={10} /> Video Live Preview
                          </span>
                          <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-slate-800">
                            <UniversalVideoPlayer src={lesVideoUrl} title={lesTitle || 'Lesson Video'} />
                          </div>
                        </div>
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
                <div>
                  <label className="block text-[10px] text-primary uppercase mb-1 font-bold flex items-center gap-1">
                    <span>AI Tutor Knowledge Base / Transcripts (Used to train AI Tutor)</span>
                  </label>
                  <textarea 
                    value={lesNotes} 
                    onChange={(e) => setLesNotes(e.target.value)} 
                    placeholder="Paste lecture transcript, study notes, Q&A pairs, formulas, or key concepts here to train the AI tutor for this lesson..." 
                    rows={3} 
                    className="w-full p-3 bg-muted/40 border border-primary/20 rounded-xl outline-none resize-none text-[11px] placeholder:text-muted-foreground/50" 
                  />
                  <p className="text-[9px] text-muted-foreground mt-0.5">The AI Tutor will automatically read this content to answer student questions for this specific video lesson.</p>
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
                      <input 
                        type="number" 
                        min={0}
                        value={timerMinutes} 
                        onChange={(e) => setTimerMinutes(e.target.value === '' ? '' as any : Number(e.target.value))} 
                        onBlur={() => { if (timerMinutes === '' || isNaN(Number(timerMinutes))) setTimerMinutes(15); }}
                        className="w-full h-8 px-2 bg-card border border-border rounded-lg font-mono font-bold text-xs" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">
                        Min Correct Answers *
                      </label>
                      <div className="flex items-center gap-1">
                        <input 
                          type="number" 
                          min={0}
                          max={questions.length > 0 ? questions.length : 100}
                          value={minCorrectInput} 
                          onChange={(e) => {
                            const rawVal = e.target.value;
                            setMinCorrectInput(rawVal);
                            if (rawVal === '') {
                              setPassingScore(0);
                              return;
                            }
                            const val = Number(rawVal);
                            if (!isNaN(val)) {
                              if (questions.length > 0) {
                                const clamped = Math.max(0, Math.min(questions.length, val));
                                setPassingScore(Math.round((clamped / questions.length) * 100));
                              } else {
                                setPassingScore(val);
                              }
                            }
                          }}
                          onBlur={() => {
                            if (minCorrectInput === '' || isNaN(Number(minCorrectInput))) {
                              setMinCorrectInput(0);
                              setPassingScore(0);
                            }
                          }}
                          className="w-full h-8 px-2 bg-card border border-border rounded-lg font-mono font-bold text-xs" 
                        />
                        <span className="text-[10px] font-bold text-muted-foreground shrink-0 whitespace-nowrap">
                          {questions.length > 0 ? `/ ${questions.length}` : 'answers'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Retries Limit</label>
                      <input 
                        type="number" 
                        min={1}
                        value={maxRetries} 
                        onChange={(e) => setMaxRetries(e.target.value === '' ? '' as any : Number(e.target.value))} 
                        onBlur={() => { if (maxRetries === '' || isNaN(Number(maxRetries))) setMaxRetries(10); }}
                        className="w-full h-8 px-2 bg-card border border-border rounded-lg font-mono font-bold text-xs" 
                      />
                    </div>
                    <div className="pt-5 flex items-center gap-1.5">
                      <input type="checkbox" id="rand" checked={randomizeQuestions} onChange={(e) => setRandomizeQuestions(e.target.checked)} className="accent-primary" />
                      <label htmlFor="rand" className="font-bold text-[10px] uppercase text-muted-foreground cursor-pointer">Randomize Seq</label>
                    </div>
                  </div>

                  {questions.length > 0 && (
                    <div className="p-2 bg-primary/5 border border-primary/20 rounded-lg space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-muted-foreground uppercase">Target:</span>
                        <span className="text-primary font-extrabold">
                          {minCorrectInput} / {questions.length} Correct ({passingScore}%)
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase mr-1">Presets:</span>
                        {Array.from({ length: questions.length + 1 }, (_, idx) => {
                          const count = idx;
                          const pct = Math.round((count / questions.length) * 100);
                          const isCurrent = Number(minCorrectInput) === count;
                          return (
                            <button
                              key={count}
                              type="button"
                              onClick={() => {
                                setMinCorrectInput(count);
                                setPassingScore(pct);
                              }}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold transition-all ${
                                isCurrent ? 'bg-primary text-primary-foreground shadow-sm scale-105' : 'bg-card border border-border hover:border-primary text-foreground'
                              }`}
                            >
                              {count}/{questions.length}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

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
                    {/* Interactive Question Options Configurer */}
                    <div className="space-y-3">
                      <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">
                        {qType === 'TF' ? 'Select Correct Answer *' : 'Configure Options & Mark Correct *'}
                      </label>
                      
                      {qType === 'TF' ? (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setTfCorrectVal('True')}
                            className={`py-2 text-center rounded-xl font-bold border transition-all text-[11px] ${
                              tfCorrectVal === 'True'
                                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 shadow-sm'
                                : 'border-border bg-card text-muted-foreground hover:bg-muted/5'
                            }`}
                          >
                            True
                          </button>
                          <button
                            type="button"
                            onClick={() => setTfCorrectVal('False')}
                            className={`py-2 text-center rounded-xl font-bold border transition-all text-[11px] ${
                              tfCorrectVal === 'False'
                                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 shadow-sm'
                                : 'border-border bg-card text-muted-foreground hover:bg-muted/5'
                            }`}
                          >
                            False
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {customOptions.map((opt, idx) => {
                            const isCorrect = qType === 'MCQ' ? mcqCorrectIdx === idx : msqCorrectFlags[idx];
                            return (
                              <div key={idx} className="flex items-center gap-2">
                                <div className="shrink-0 flex items-center justify-center">
                                  {qType === 'MCQ' ? (
                                    <input 
                                      type="radio" 
                                      name="mcqCorrect" 
                                      checked={mcqCorrectIdx === idx} 
                                      onChange={() => setMcqCorrectIdx(idx)} 
                                      title="Mark as correct answer"
                                      className="h-4 w-4 accent-emerald-600 cursor-pointer"
                                    />
                                  ) : (
                                    <input 
                                      type="checkbox" 
                                      checked={msqCorrectFlags[idx] || false} 
                                      onChange={(e) => {
                                        const copy = [...msqCorrectFlags];
                                        copy[idx] = e.target.checked;
                                        setMsqCorrectFlags(copy);
                                      }} 
                                      title="Mark as correct answer"
                                      className="h-4 w-4 accent-emerald-600 cursor-pointer"
                                    />
                                  )}
                                </div>
                                
                                <input 
                                  type="text" 
                                  value={opt} 
                                  onChange={(e) => {
                                    const copy = [...customOptions];
                                    copy[idx] = e.target.value;
                                    setCustomOptions(copy);
                                  }} 
                                  placeholder={`Option ${String.fromCharCode(65 + idx)}`} 
                                  className={`flex-1 min-w-0 h-8 px-2 bg-card border rounded-lg text-xs font-semibold outline-none transition-all ${
                                    isCorrect 
                                      ? 'border-emerald-500 bg-emerald-500/5 focus:border-emerald-500 ring-1 ring-emerald-500/20' 
                                      : 'border-border focus:border-primary'
                                  }`}
                                />
                                
                                {customOptions.length > 2 && (
                                  <button 
                                    type="button" 
                                    onClick={() => {
                                      setCustomOptions(customOptions.filter((_, i) => i !== idx));
                                      setMsqCorrectFlags(msqCorrectFlags.filter((_, i) => i !== idx));
                                      if (mcqCorrectIdx >= customOptions.length - 1) {
                                        setMcqCorrectIdx(Math.max(0, customOptions.length - 2));
                                      }
                                    }} 
                                    className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg text-muted-foreground"
                                    title="Remove Option"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                          
                          <button 
                            type="button" 
                            onClick={() => {
                              setCustomOptions([...customOptions, '']);
                              setMsqCorrectFlags([...msqCorrectFlags, false]);
                            }} 
                            className="text-[10px] text-primary hover:underline font-bold flex items-center gap-1 mt-1"
                          >
                            <Plus size={10} /> Add Option
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <button onClick={handleAddQuestion} className="w-full py-2 bg-primary text-primary-foreground font-bold rounded-lg flex items-center justify-center gap-1 shadow hover:bg-primary/95 transition-all">
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
