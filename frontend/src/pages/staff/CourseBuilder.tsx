import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { 
  Plus, Trash2, Video, ChevronRight, ChevronDown, 
  X, PlusCircle, Edit, Upload, Loader2,
  ClipboardList, FileText, HelpCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UniversalVideoPlayer } from '../../components/UniversalVideoPlayer';

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
  video_id?: number;
  cf_stream_id?: string;
  video_status?: string;
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

const CourseBuilder: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Editing State Handlers
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  // Active builder targets
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [expandedModuleId, setExpandedModuleId] = useState<number | null>(null);

  // Course Modals
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
  const [coursePath, setCoursePath] = useState('');

  // Module Modals
  const [showModModal, setShowModModal] = useState(false);
  const [modTitle, setModTitle] = useState('');

  // Lesson Modals
  const [showLesModal, setShowLesModal] = useState(false);
  const [lesTitle, setLesTitle] = useState('');
  const [lesContent, setLesContent] = useState('');
  const [lesVideoId, setLesVideoId] = useState('');
  const [lesThumbnail, setLesThumbnail] = useState('');
  const [lesPdf, setLesPdf] = useState('');
  const [lesZip, setLesZip] = useState('');
  const [lesNotes, setLesNotes] = useState('');
  const [lesLinks, setLesLinks] = useState('');
  const [targetModuleId, setTargetModuleId] = useState<number | null>(null);

  // Assignment state
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [assignModuleId, setAssignModuleId] = useState<number | null>(null);
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDesc, setAssignDesc] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [assignFileUrl, setAssignFileUrl] = useState('');

  // File Upload Handlers
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Quiz State
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizModuleId, setQuizModuleId] = useState<number | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<any | null>(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [passingScore, setPassingScore] = useState(50); // Pass score default: 50%
  const [timerMinutes, setTimerMinutes] = useState(15);
  const [maxRetries, setMaxRetries] = useState(3);
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);

  // Question State
  const [questions, setQuestions] = useState<any[]>([]);
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<'MCQ' | 'TF' | 'MSQ'>('MCQ');
  const [qOptions, setQOptions] = useState(''); // Comma-separated
  const [qCorrect, setQCorrect] = useState('');
  const [savingQuizSettings, setSavingQuizSettings] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: 'thumbnail' | 'lesThumbnail' | 'video' | 'pdf' | 'zip' | 'attachment') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingFile(targetField);
    setUploadProgress(0);
    try {
      const res = await api.post('core/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const pct = progressEvent.total ? Math.round((progressEvent.loaded * 100) / progressEvent.total) : 0;
          setUploadProgress(pct);
        },
      });
      const fileUrl = res.data.url;
      
      if (targetField === 'thumbnail') {
        setCourseThumb(fileUrl);
      } else if (targetField === 'lesThumbnail') {
        setLesThumbnail(fileUrl);
      } else if (targetField === 'video') {
        setLesVideoId(fileUrl);
      } else if (targetField === 'pdf') {
        setLesPdf(fileUrl);
      } else if (targetField === 'zip') {
        setLesZip(fileUrl);
      } else if (targetField === 'attachment') {
        setAssignFileUrl(fileUrl);
      }
      toast.success(`${targetField} uploaded successfully!`);
    } catch (err) {
      toast.error(`Failed to upload ${targetField}.`);
    } finally {
      setUploadingFile(null);
      setUploadProgress(0);
    }
  };

  const loadBaseData = async () => {
    try {
      setLoading(true);
      const [courseRes, catRes, assignRes] = await Promise.all([
        api.get('courses/list/'),
        api.get('courses/categories/'),
        api.get('assignments/list/')
      ]);
      setCourses(courseRes.data);
      setCategories(catRes.data);
      setAssignments(assignRes.data);
      if (catRes.data.length > 0) {
        setCourseCategory(catRes.data[0].id);
      }
    } catch (err) {
      toast.error("Failed to load course builder resources.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBaseData();
  }, []);

  const loadCourseOutline = async (course: Course) => {
    try {
      setSelectedCourse(course);
      const [modRes, lesRes, quizzesRes] = await Promise.all([
        api.get(`modules/?course=${course.id}`),
        api.get(`lessons/?course=${course.id}`),
        api.get(`quizzes/list/?course=${course.id}`)
      ]);
      setModules(modRes.data);
      setLessons(lesRes.data);
      setQuizzes(quizzesRes.data);
    } catch (err) {
      toast.error("Failed to compile course outline.");
    }
  };

  const openQuizModal = async (moduleId: number) => {
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
      toast.error("Failed to load quiz details.");
    }
  };

  const handleCreateQuiz = async () => {
    if (!quizModuleId) return;
    try {
      await api.post('quizzes/list/', {
        module: quizModuleId,
        title: `Module Checkpoint Quiz`,
        passing_score: passingScore,
        timer_minutes: timerMinutes,
        max_retries: maxRetries,
        randomize_questions: randomizeQuestions
      });
      toast.success("Module quiz checkpoint created!");
      if (selectedCourse) {
        loadCourseOutline(selectedCourse);
      }
      openQuizModal(quizModuleId);
    } catch {
      toast.error("Failed to create quiz.");
    }
  };

  const handleDeleteQuiz = async () => {
    if (!activeQuiz) return;
    if (!window.confirm("WARNING: This will permanently delete this module's checkpoint quiz and all of its questions. Proceed?")) return;
    try {
      await api.delete(`quizzes/list/${activeQuiz.id}/`);
      toast.success("Quiz checkpoint deleted successfully.");
      setShowQuizModal(false);
      if (selectedCourse) {
        loadCourseOutline(selectedCourse);
      }
    } catch {
      toast.error("Failed to delete quiz checkpoint.");
    }
  };

  const handleDeleteQuizDirect = async (quizId: number) => {
    if (!window.confirm("WARNING: This will permanently delete this module's checkpoint quiz and all of its questions. Proceed?")) return;
    try {
      await api.delete(`quizzes/list/${quizId}/`);
      toast.success("Quiz checkpoint deleted successfully.");
      if (selectedCourse) {
        loadCourseOutline(selectedCourse);
      }
    } catch {
      toast.error("Failed to delete quiz checkpoint.");
    }
  };

  const handleSaveQuizSettings = async () => {
    if (!activeQuiz) return;
    setSavingQuizSettings(true);
    try {
      await api.put(`quizzes/list/${activeQuiz.id}/`, {
        module: activeQuiz.module,
        title: quizTitle,
        passing_score: passingScore,
        timer_minutes: timerMinutes,
        max_retries: maxRetries,
        randomize_questions: randomizeQuestions
      });
      toast.success("Quiz configurations updated.");
      if (selectedCourse) {
        loadCourseOutline(selectedCourse);
      }
    } catch {
      toast.error("Failed to update quiz settings.");
    } finally {
      setSavingQuizSettings(false);
    }
  };

  const refreshQuizDetails = async () => {
    if (!activeQuiz) return;
    try {
      const detailRes = await api.get(`quizzes/list/${activeQuiz.id}/`);
      setQuestions(detailRes.data.questions || []);
    } catch {
      toast.error("Failed to refresh quiz questions.");
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuiz) return;
    if (!qText || !qCorrect) {
      toast.error("Please fill in question text and correct answer.");
      return;
    }

    const optionsList = qType === 'TF' 
      ? ['True', 'False'] 
      : qOptions.split(',').map(o => o.trim()).filter(Boolean);

    if (qType !== 'TF' && optionsList.length === 0) {
      toast.error("Please provide comma-separated options.");
      return;
    }

    try {
      await api.post('quizzes/questions/', {
        quiz: activeQuiz.id,
        question_text: qText,
        question_type: qType,
        options: optionsList,
        correct_answer: qCorrect.trim()
      });
      toast.success("Question added successfully!");
      setQText('');
      setQOptions('');
      setQCorrect('');
      refreshQuizDetails();
    } catch (err: any) {
      const errMsg = err.response?.data
        ? Object.entries(err.response.data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' | ')
        : "Failed to add question.";
      toast.error(errMsg);
    }
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!window.confirm("Delete this question?")) return;
    try {
      await api.delete(`quizzes/questions/${id}/`);
      toast.success("Question deleted.");
      refreshQuizDetails();
    } catch {
      toast.error("Failed to delete question.");
    }
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle.trim() || !courseCategory) return;

    const slug = courseTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const payload = {
      title: courseTitle,
      slug,
      description: courseDesc,
      category: courseCategory,
      thumbnail: courseThumb,
      status: courseStatus,
      requirements: courseReqs,
      outcomes: courseOuts,
      learning_path: coursePath,
      instructor_name: instructorName || undefined,
      instructor_role: instructorRole || undefined
    };

    try {
      if (editingCourse) {
        const res = await api.put(`courses/list/${editingCourse.id}/`, payload);
        toast.success("Course outline updated.");
        setCourses(prev => prev.map(c => c.id === editingCourse.id ? res.data : c));
        if (selectedCourse && selectedCourse.id === editingCourse.id) {
          setSelectedCourse(res.data);
        }
      } else {
        const res = await api.post('courses/list/', payload);
        toast.success("New course syllabus created.");
        setCourses(prev => [...prev, res.data]);
      }

      setShowCourseModal(false);
      setEditingCourse(null);
      // Reset course states
      setCourseTitle('');
      setCourseDesc('');
      setCourseThumb('');
      setInstructorName('');
      setInstructorRole('');
      setCourseStatus('PUBLISHED');
      setCourseReqs('');
      setCourseOuts('');
      setCoursePath('');
    } catch (err) {
      toast.error("Failed to save course.");
    }
  };

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !modTitle.trim()) return;

    const prevModules = [...modules];
    const tempId = Date.now();

    if (editingModule) {
      // Optimistic Update
      setModules(prev => prev.map(m => m.id === editingModule.id ? { ...m, title: modTitle } : m));
      toast.success("Module outline updated.");
      setShowModModal(false);
      try {
        const res = await api.put(`modules/${editingModule.id}/`, {
          course: selectedCourse.id,
          title: modTitle,
          order: editingModule.order
        });
        setModules(prev => prev.map(m => m.id === editingModule.id ? res.data : m));
      } catch {
        setModules(prevModules);
        toast.error("Failed to save module.");
      }
    } else {
      // Optimistic Update
      const optimisticModule = {
        id: tempId,
        course: selectedCourse.id,
        title: modTitle,
        order: modules.length + 1
      };
      setModules(prev => [...prev, optimisticModule]);
      toast.success("Outline module added.");
      setShowModModal(false);
      try {
        const res = await api.post('modules/', {
          course: selectedCourse.id,
          title: modTitle,
          order: modules.length + 1
        });
        setModules(prev => prev.map(m => m.id === tempId ? res.data : m));
      } catch {
        setModules(prevModules);
        toast.error("Failed to save module.");
      }
    }
    setEditingModule(null);
    setModTitle('');
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !targetModuleId || !lesTitle.trim()) return;

    const prevLessons = [...lessons];
    const tempId = Date.now();
    const parsedLinks = lesLinks.split(',').map(l => l.trim()).filter(Boolean);
    const payload = {
      module: targetModuleId,
      title: lesTitle,
      content: lesContent,
      thumbnail: lesThumbnail || undefined,
      pdf_ppt_url: lesPdf || undefined,
      zip_source_url: lesZip || undefined,
      additional_notes: lesNotes || undefined,
      external_links: parsedLinks,
      order: editingLesson ? editingLesson.order : lessons.filter(l => l.module === targetModuleId).length + 1
    };

    if (editingLesson) {
      // Optimistic Update
      setLessons(prev => prev.map(l => l.id === editingLesson.id ? { ...l, ...payload } : l));
      toast.success("Lesson outline updated.");
      setShowLesModal(false);
      try {
        let lessonId = editingLesson.id;
        await api.put(`lessons/${editingLesson.id}/`, payload);
        if (lesVideoId.trim()) {
          if (editingLesson.video_id) {
            await api.put(`videos/${editingLesson.video_id}/`, {
              lesson: lessonId,
              cf_stream_id: lesVideoId,
              status: 'ready'
            });
          } else {
            await api.post('videos/', {
              lesson: lessonId,
              cf_stream_id: lesVideoId,
              status: 'ready'
            });
          }
        } else if (editingLesson.video_id) {
          await api.delete(`videos/${editingLesson.video_id}/`);
        }
        const finalLessonRes = await api.get(`lessons/${lessonId}/`);
        setLessons(prev => prev.map(l => l.id === lessonId ? finalLessonRes.data : l));
      } catch {
        setLessons(prevLessons);
        toast.error("Failed to save lesson.");
      }
    } else {
      // Optimistic Update
      const optimisticLesson = {
        id: tempId,
        ...payload,
        cf_stream_id: lesVideoId || undefined,
        video_status: 'ready'
      };
      setLessons(prev => [...prev, optimisticLesson]);
      toast.success("Outline lesson compiled.");
      setShowLesModal(false);
      try {
        const lessonRes = await api.post('lessons/', payload);
        const lessonId = lessonRes.data.id;
        if (lesVideoId.trim()) {
          await api.post('videos/', {
            lesson: lessonId,
            cf_stream_id: lesVideoId,
            status: 'ready'
          });
        }
        const finalLessonRes = await api.get(`lessons/${lessonId}/`);
        setLessons(prev => prev.map(l => l.id === tempId ? finalLessonRes.data : l));
      } catch {
        setLessons(prev => prev.filter(l => l.id !== tempId));
        toast.error("Failed to save lesson.");
      }
    }

    setEditingLesson(null);
    setLesTitle('');
    setLesContent('');
    setLesVideoId('');
    setLesThumbnail('');
    setLesPdf('');
    setLesZip('');
    setLesNotes('');
    setLesLinks('');
  };

  const openEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseTitle(course.title);
    setCourseDesc(course.description);
    setCourseCategory(course.category);
    setCourseThumb(course.thumbnail || '');
    setInstructorName(course.instructor_name || '');
    setInstructorRole(course.instructor_role || '');
    setCourseStatus(course.status || 'PUBLISHED');
    setCourseReqs(course.requirements || '');
    setCourseOuts(course.outcomes || '');
    setCoursePath(course.learning_path || '');
    setShowCourseModal(true);
  };

  const openEditModule = (mod: Module) => {
    setEditingModule(mod);
    setModTitle(mod.title);
    setShowModModal(true);
  };

  const openEditLesson = (les: Lesson) => {
    setEditingLesson(les);
    setLesTitle(les.title);
    setLesContent(les.content || '');
    setLesVideoId(les.cf_stream_id || '');
    setLesThumbnail(les.thumbnail || '');
    setLesPdf(les.pdf_ppt_url || '');
    setLesZip(les.zip_source_url || '');
    setLesNotes(les.additional_notes || '');
    setLesLinks(les.external_links ? les.external_links.join(', ') : '');
    setTargetModuleId(les.module);
    setShowLesModal(true);
  };

  const handleDeleteCourse = async (id: number) => {
    if (!window.confirm("Are you sure? All modules and lessons inside this course will be deleted.")) return;
    const prevCourses = [...courses];
    const prevSelected = selectedCourse;
    
    // Optimistic Update
    setCourses(prev => prev.filter(c => c.id !== id));
    if (selectedCourse && selectedCourse.id === id) {
      setSelectedCourse(null);
    }
    toast.success("Course deleted.");

    try {
      await api.delete(`courses/list/${id}/`);
    } catch (err) {
      // Rollback
      setCourses(prevCourses);
      setSelectedCourse(prevSelected);
      toast.error("Failed to delete course.");
    }
  };

  const handleDeleteModule = async (id: number) => {
    if (!window.confirm("Are you sure? All lessons inside this module will be deleted.")) return;
    const prevModules = [...modules];
    const prevLessons = [...lessons];

    // Optimistic Update
    setModules(prev => prev.filter(m => m.id !== id));
    setLessons(prev => prev.filter(l => l.module !== id));
    toast.success("Module deleted.");

    try {
      await api.delete(`modules/${id}/`);
    } catch {
      // Rollback
      setModules(prevModules);
      setLessons(prevLessons);
      toast.error("Failed to delete module.");
    }
  };

  const handleDeleteLesson = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this lesson?")) return;
    const prevLessons = [...lessons];

    // Optimistic Update
    setLessons(prev => prev.filter(l => l.id !== id));
    toast.success("Lesson deleted.");

    try {
      await api.delete(`lessons/${id}/`);
    } catch {
      // Rollback
      setLessons(prevLessons);
      toast.error("Failed to delete lesson.");
    }
  };

  // ---- Assignment CRUD ----
  const openAssignModal = (moduleId: number) => {
    setAssignModuleId(moduleId);
    setEditingAssignment(null);
    setAssignTitle('');
    setAssignDesc('');
    setAssignDueDate('');
    setAssignFileUrl('');
    setShowAssignModal(true);
  };

  const openEditAssignment = (assign: Assignment) => {
    setEditingAssignment(assign);
    setAssignModuleId(assign.module);
    setAssignTitle(assign.title);
    setAssignDesc(assign.description);
    setAssignDueDate(assign.due_date ? assign.due_date.slice(0, 16) : '');
    setAssignFileUrl(assign.file_attachment || '');
    setShowAssignModal(true);
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModuleId || !assignTitle.trim()) return;

    const payload: any = {
      module: assignModuleId,
      title: assignTitle,
      description: assignDesc,
      due_date: assignDueDate || undefined,
      file_attachment: assignFileUrl || undefined
    };

    try {
      if (editingAssignment) {
        const res = await api.put(`assignments/list/${editingAssignment.id}/`, payload);
        toast.success("Module assignment updated.");
        setAssignments(prev => prev.map(a => a.id === editingAssignment.id ? res.data : a));
      } else {
        const res = await api.post('assignments/list/', payload);
        toast.success("Module assignment created.");
        setAssignments(prev => [...prev, res.data]);
      }
      setShowAssignModal(false);
      setEditingAssignment(null);
    } catch {
      toast.error("Failed to save assignment.");
    }
  };

  const handleDeleteAssignment = async (id: number) => {
    if (!window.confirm("Delete this assignment? All student submissions will also be removed.")) return;
    const prevAssignments = [...assignments];

    setAssignments(prev => prev.filter(a => a.id !== id));
    toast.success("Assignment deleted.");

    try {
      await api.delete(`assignments/list/${id}/`);
    } catch {
      setAssignments(prevAssignments);
      toast.error("Failed to delete assignment.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Syllabus Builder</h1>
          <p className="text-muted-foreground text-sm mt-1">Publish courses, structure training modules, compile markdown lessons and upload Cloudflare videos.</p>
        </div>
        {!selectedCourse && (
          <button
            onClick={() => setShowCourseModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:brightness-110 active:brightness-95 rounded-xl text-sm font-semibold transition-all shadow-md shadow-primary/10"
          >
            <Plus size={16} />
            <span>Create Course Syllabus</span>
          </button>
        )}
      </div>

      {/* Grid: Course select or Canvas outline editor */}
      {!selectedCourse ? (
        // Catalog list
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <div key={course.id} className="rounded-2xl glass-card overflow-hidden shadow-sm flex flex-col justify-between hover:border-primary/40 hover:-translate-y-1 transition-all duration-300">
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-muted border border-border text-muted-foreground font-semibold uppercase tracking-wider">
                    {course.category_name}
                  </span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    course.status === 'ARCHIVED' ? 'bg-destructive/10 text-destructive border border-destructive/20' :
                    course.status === 'DRAFT' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                    'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  }`}>
                    {course.status || 'PUBLISHED'}
                  </span>
                </div>
                <h3 className="font-semibold text-base tracking-tight">{course.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{course.description || 'No description provided.'}</p>
              </div>

              <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
                <button
                  onClick={() => loadCourseOutline(course)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs rounded-lg transition-all border border-primary/20"
                >
                  <span>Build Curriculum</span>
                  <ChevronRight size={14} />
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditCourse(course)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20 rounded-lg transition-all text-[11px] font-semibold"
                    title="Edit Course"
                  >
                    <Edit size={12} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteCourse(course.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 rounded-lg transition-all text-[11px] font-semibold"
                    title="Delete Course"
                  >
                    <Trash2 size={12} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
          {courses.length === 0 && (
            <div className="col-span-full py-16 text-center text-muted-foreground font-medium bg-card rounded-2xl border border-dashed border-border/80">
              No courses registered. Click "Create Course Syllabus" to build your first catalog.
            </div>
          )}
        </div>
      ) : (
        // Curriculum Builder Canvas
        <div className="grid gap-6 lg:grid-cols-3 items-start">
          {/* Sidebar Modules navigation */}
          <div className="rounded-2xl glass-panel p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setSelectedCourse(null)}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  &larr; Catalog
                </button>
              </div>
              <button
                onClick={() => setShowModModal(true)}
                className="flex items-center gap-1 text-[11px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 px-2.5 py-1 rounded-lg transition-colors"
              >
                <Plus size={12} />
                <span>Add Module</span>
              </button>
            </div>

            <div className="space-y-1">
              <h2 className="font-bold font-display text-base leading-snug">{selectedCourse.title}</h2>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{selectedCourse.description}</p>
            </div>

            {/* Modules list */}
            <div className="space-y-2.5 pt-3">
              {modules.map((mod) => {
                const isExpanded = expandedModuleId === mod.id;
                const modLessons = lessons.filter(l => l.module === mod.id);
                return (
                  <div key={mod.id} className="border border-border/60 rounded-xl overflow-hidden">
                    <div 
                      className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${isExpanded ? 'bg-muted/40' : 'hover:bg-muted/20'}`}
                      onClick={() => setExpandedModuleId(isExpanded ? null : mod.id)}
                    >
                      <div className="min-w-0 flex-1 pr-2 space-y-0.5">
                        <span className="text-xs font-bold text-foreground break-words leading-relaxed block">{mod.title}</span>
                        <span className="text-[9px] font-medium text-muted-foreground block font-mono">{modLessons.length} Lessons</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openEditModule(mod)}
                          className="p-1 hover:bg-blue-500/10 text-blue-500 rounded transition-all"
                          title="Edit Module Name"
                        >
                          <Edit size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteModule(mod.id)}
                          className="p-1 hover:bg-destructive/10 text-destructive rounded transition-all"
                          title="Delete Module"
                        >
                          <Trash2 size={12} />
                        </button>
                        <div onClick={() => setExpandedModuleId(isExpanded ? null : mod.id)} className="cursor-pointer p-0.5 hover:bg-muted rounded ml-1">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="bg-background/40 p-2 border-t border-border/40 space-y-1 text-xs">
                        {modLessons.map(les => {
                          return (
                          <div key={les.id} className="p-2 hover:bg-muted/30 rounded-lg flex items-center justify-between gap-2">
                            <span className="text-[11px] truncate font-medium text-foreground/80">{les.title}</span>
                            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                              {les.cf_stream_id && <Video size={10} className="text-primary" />}
                              <span className="text-[10px] text-muted-foreground font-mono">#{les.order}</span>
                            </div>
                          </div>
                          );
                        })}

                        {(() => {
                          const modAssign = assignments.find(a => a.module === mod.id);
                          if (!modAssign) return null;
                          return (
                            <div className="flex items-center justify-between p-2 mt-1 bg-amber-500/5 border border-amber-500/15 rounded-lg text-[11px]" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2 truncate">
                                <ClipboardList size={11} className="text-amber-500 shrink-0" />
                                <span className="font-bold text-amber-500 shrink-0">Homework:</span>
                                <span className="truncate font-medium text-foreground">{modAssign.title}</span>
                              </div>
                            </div>
                          );
                        })()}

                        {(() => {
                          const quizObj = quizzes.find(q => q.module === mod.id);
                          if (!quizObj) return null;
                          return (
                            <div className="flex items-center justify-between p-2 mt-1 bg-emerald-500/5 border border-emerald-500/15 rounded-lg text-[11px]" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2 truncate">
                                <HelpCircle size={11} className="text-emerald-500 shrink-0" />
                                <span className="font-bold text-emerald-500 shrink-0">Quiz:</span>
                                <span className="truncate font-medium text-foreground">{quizObj.title}</span>
                              </div>
                            </div>
                          );
                        })()}

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 mt-2">
                          <button
                            onClick={() => { setTargetModuleId(mod.id); setShowLesModal(true); }}
                            className="text-center py-2 border border-dashed border-border/80 hover:border-primary/50 text-[10px] font-semibold rounded-lg text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-1 col-span-2 animate-none"
                          >
                            <PlusCircle size={10} />
                            <span>Add Lesson Outline</span>
                          </button>
                          
                          {!quizzes.some(q => q.module === mod.id) && (
                            <button
                              onClick={() => openQuizModal(mod.id)}
                              className="text-center py-1.5 border border-dashed border-emerald-500/40 hover:border-emerald-500 text-[9px] font-semibold rounded-lg text-emerald-500 hover:bg-emerald-500/5 transition-all flex items-center justify-center gap-1"
                            >
                              <HelpCircle size={10} />
                              <span>Add Quiz</span>
                            </button>
                          )}
                          
                          {!assignments.some(a => a.module === mod.id) && (
                            <button
                              onClick={() => openAssignModal(mod.id)}
                              className="text-center py-1.5 border border-dashed border-amber-500/40 hover:border-amber-500 text-[9px] font-semibold rounded-lg text-amber-500 hover:bg-amber-500/5 transition-all flex items-center justify-center gap-1"
                            >
                              <ClipboardList size={10} />
                              <span>Add Homework</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {modules.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">No modules added yet. Create one to begin structuring courses.</p>
              )}
            </div>
          </div>

          {/* Builder Canvas / Preview Area */}
          <div className="lg:col-span-2 rounded-2xl glass-panel p-6 shadow-sm space-y-4">
            <h3 className="font-semibold text-lg">Curriculum Blueprint</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Below is the structured learning path visible to enrolled students. Students automatically view this blueprint once published to their mapped categories.
            </p>

            <div className="border border-border/60 rounded-2xl divide-y divide-border/60">
              {modules.map((mod) => (
                <div key={mod.id} className="p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-2.5">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground break-words leading-relaxed">{mod.title}</h4>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openQuizModal(mod.id)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-lg transition-all text-[10px] font-semibold"
                        title="Manage Module Quiz Checkpoint"
                      >
                        <HelpCircle size={11} />
                        <span>Module Quiz</span>
                      </button>
                      <button
                        onClick={() => openAssignModal(mod.id)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded-lg transition-all text-[10px] font-semibold"
                        title="Manage Module Assignment"
                      >
                        <ClipboardList size={11} />
                        <span>Module Assignment</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {lessons.filter(l => l.module === mod.id).map(les => {
                      return (
                      <div key={les.id} className="p-3 bg-muted/20 border border-border rounded-xl flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <h5 className="font-semibold text-xs text-foreground">{les.title}</h5>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openEditLesson(les)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20 rounded-lg transition-all text-[10px] font-semibold"
                              title="Edit Lesson"
                            >
                              <Edit size={11} />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteLesson(les.id)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 rounded-lg transition-all text-[10px] font-semibold"
                              title="Delete Lesson"
                            >
                              <Trash2 size={11} />
                              <span>Delete</span>
                            </button>
                            <span className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded border border-border/60 ml-1">Order: {les.order}</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{les.content}</p>
                        
                        {les.cf_stream_id && (
                          <div className="space-y-2 mt-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Video Preview Checkpoint</span>
                            <div className="relative aspect-video rounded-xl bg-black overflow-hidden border border-border/80 shadow max-w-xs">
                              <UniversalVideoPlayer
                                src={les.cf_stream_id}
                                className="w-full h-full object-contain"
                                poster={les.thumbnail || undefined}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      );
                    })}

                    {(() => {
                      const modAssign = assignments.find(a => a.module === mod.id);
                      if (!modAssign) return null;
                      return (
                        <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-center justify-between gap-3 transition-all mt-2">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg shrink-0">
                              <ClipboardList size={14} />
                            </div>
                            <div className="min-w-0">
                              <h5 className="font-bold text-xs text-foreground truncate">{modAssign.title}</h5>
                              <p className="text-[10px] text-muted-foreground truncate">{modAssign.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => openEditAssignment(modAssign)}
                              className="p-1.5 hover:bg-blue-500/10 text-blue-500 rounded-lg transition-all"
                              title="Edit Homework Checkpoint"
                            >
                              <Edit size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteAssignment(modAssign.id)}
                              className="p-1.5 hover:bg-destructive/10 text-destructive rounded-lg transition-all"
                              title="Delete Homework Checkpoint"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {(() => {
                      const quizObj = quizzes.find(q => q.module === mod.id);
                      if (!quizObj) return null;
                      return (
                        <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center justify-between gap-3 transition-all mt-2">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg shrink-0">
                              <HelpCircle size={14} />
                            </div>
                            <div className="min-w-0">
                              <h5 className="font-bold text-xs text-foreground truncate">{quizObj.title}</h5>
                              <p className="text-[10px] text-muted-foreground truncate">{quizObj.questions?.length || 0} Questions Checkpoint</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => openQuizModal(mod.id)}
                              className="p-1.5 hover:bg-blue-500/10 text-blue-500 rounded-lg transition-all"
                              title="Edit Quiz Configuration / Questions"
                            >
                              <Edit size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteQuizDirect(quizObj.id)}
                              className="p-1.5 hover:bg-destructive/10 text-destructive rounded-lg transition-all"
                              title="Delete Quiz Checkpoint"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {lessons.filter(l => l.module === mod.id).length === 0 && (
                      <p className="text-[11px] text-muted-foreground italic">No lessons compiled in this module.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Course Modal */}
      <AnimatePresence>
        {showCourseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card text-card-foreground border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-semibold text-lg">{editingCourse ? 'Edit Course Details' : 'Create Course Outline'}</h3>
                <button onClick={() => { setShowCourseModal(false); setEditingCourse(null); }} className="p-1 hover:bg-muted rounded-lg"><X size={16} /></button>
              </div>

              <form onSubmit={handleSaveCourse} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Course Title *</label>
                  <input 
                    type="text" 
                    value={courseTitle} 
                    onChange={(e) => setCourseTitle(e.target.value)}
                    className="w-full h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all"
                    placeholder="e.g. Django Enterprise Deployment"
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">Category Track *</label>
                    <select
                      value={courseCategory}
                      onChange={(e) => setCourseCategory(Number(e.target.value))}
                      className="w-full h-10 px-2 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">Outline Status</label>
                    <select
                      value={courseStatus}
                      onChange={(e: any) => setCourseStatus(e.target.value)}
                      className="w-full h-10 px-2 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all font-semibold"
                    >
                      <option value="PUBLISHED">Published</option>
                      <option value="DRAFT">Draft Outline</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Thumbnail</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={courseThumb} 
                      onChange={(e) => setCourseThumb(e.target.value)}
                      className="flex-1 h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all text-xs"
                      placeholder="Paste R2 URL or click upload"
                    />
                    <label className="h-10 w-10 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 rounded-xl flex items-center justify-center cursor-pointer transition-all shrink-0" title="Upload Thumbnail">
                      {uploadingFile === 'thumbnail' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      <input 
                        type="file" 
                        accept="image/*"
                        className="sr-only" 
                        onChange={(e) => handleFileUpload(e, 'thumbnail')} 
                        disabled={uploadingFile !== null}
                      />
                    </label>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">Instructor Name</label>
                    <input 
                      type="text" 
                      value={instructorName} 
                      onChange={(e) => setInstructorName(e.target.value)}
                      className="w-full h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all"
                      placeholder="e.g. Sarah Instructor"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">Instructor Role</label>
                    <input 
                      type="text" 
                      value={instructorRole} 
                      onChange={(e) => setInstructorRole(e.target.value)}
                      className="w-full h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all"
                      placeholder="e.g. Instructor / Coordinator"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Syllabus Overview</label>
                  <textarea 
                    value={courseDesc} 
                    onChange={(e) => setCourseDesc(e.target.value)}
                    rows={2}
                    className="w-full p-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all resize-none"
                    placeholder="Describe course objectives and expected outputs..."
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">Course Requirements</label>
                    <textarea 
                      value={courseReqs} 
                      onChange={(e) => setCourseReqs(e.target.value)}
                      rows={2}
                      className="w-full p-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all resize-none"
                      placeholder="e.g. Basic Python familiarity, VS Code installed"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">Target Outcomes</label>
                    <textarea 
                      value={courseOuts} 
                      onChange={(e) => setCourseOuts(e.target.value)}
                      rows={2}
                      className="w-full p-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all resize-none"
                      placeholder="e.g. Build backend servers, validate custom JWT tokens"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Recommended Learning Path</label>
                  <textarea 
                    value={coursePath} 
                    onChange={(e) => setCoursePath(e.target.value)}
                    rows={2}
                    className="w-full p-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all resize-none"
                    placeholder="Describe target training timeline, milestones, or homework intervals..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button type="button" onClick={() => { setShowCourseModal(false); setEditingCourse(null); }} className="px-4 py-2 bg-muted rounded-xl font-medium">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:brightness-110">
                    {editingCourse ? 'Save Changes' : 'Save Syllabus'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Module Modal */}
      <AnimatePresence>
        {showModModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card text-card-foreground border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-semibold text-lg">{editingModule ? 'Edit Module Title' : 'Add Training Module'}</h3>
                <button onClick={() => { setShowModModal(false); setEditingModule(null); }} className="p-1 hover:bg-muted rounded-lg"><X size={16} /></button>
              </div>

              <form onSubmit={handleAddModule} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Module Title</label>
                  <input 
                    type="text" 
                    value={modTitle} 
                    onChange={(e) => setModTitle(e.target.value)}
                    className="w-full h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all"
                    placeholder="e.g. Module 1: Introduction to Models"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button type="button" onClick={() => { setShowModModal(false); setEditingModule(null); }} className="px-4 py-2 bg-muted rounded-xl font-medium">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:brightness-110">
                    {editingModule ? 'Save Changes' : 'Add Module'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Lesson Modal */}
      <AnimatePresence>
        {showLesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card text-card-foreground border border-border w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 my-8"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-semibold text-lg">{editingLesson ? 'Edit Lesson Details' : 'Compile Lesson outline'}</h3>
                <button onClick={() => { setShowLesModal(false); setEditingLesson(null); }} className="p-1 hover:bg-muted rounded-lg"><X size={16} /></button>
              </div>

              <form onSubmit={handleAddLesson} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Lesson Title *</label>
                  <input 
                    type="text" 
                    value={lesTitle} 
                    onChange={(e) => setLesTitle(e.target.value)}
                    className="w-full h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40"
                    placeholder="e.g. Lesson 1.1: Custom User Hashing"
                    required
                  />
                </div>

                 <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">Lesson Thumbnail Cover</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={lesThumbnail} 
                        onChange={(e) => setLesThumbnail(e.target.value)}
                        className="flex-1 h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 text-xs"
                        placeholder="https://R2-link/cover.jpg"
                      />
                      <label className="h-10 w-10 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 rounded-xl flex items-center justify-center cursor-pointer transition-all shrink-0" title="Upload Cover Image">
                        {uploadingFile === 'lesThumbnail' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        <input 
                          type="file" 
                          accept="image/*"
                          className="sr-only" 
                          onChange={(e) => handleFileUpload(e, 'lesThumbnail')} 
                          disabled={uploadingFile !== null}
                        />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">Cloudflare Video ID / URL</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={lesVideoId} 
                        onChange={(e) => setLesVideoId(e.target.value)}
                        className="flex-1 h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 text-xs"
                        placeholder="CF ID or video link"
                      />
                      <label className="h-10 w-10 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 rounded-xl flex items-center justify-center cursor-pointer transition-all shrink-0" title="Upload Video">
                        {uploadingFile === 'video' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        <input 
                          type="file" 
                          accept="video/*"
                          className="sr-only" 
                          onChange={(e) => handleFileUpload(e, 'video')} 
                          disabled={uploadingFile !== null}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">PDF/PPT R2 Slide URL</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={lesPdf} 
                        onChange={(e) => setLesPdf(e.target.value)}
                        className="flex-1 h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 text-xs"
                        placeholder="https://R2-link/slides.pdf"
                      />
                      <label className="h-10 w-10 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 rounded-xl flex items-center justify-center cursor-pointer transition-all shrink-0" title="Upload PDF/PPT">
                        {uploadingFile === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        <input 
                          type="file" 
                          accept=".pdf,.ppt,.pptx"
                          className="sr-only" 
                          onChange={(e) => handleFileUpload(e, 'pdf')} 
                          disabled={uploadingFile !== null}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">ZIP Source Code URL</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={lesZip} 
                        onChange={(e) => setLesZip(e.target.value)}
                        className="flex-1 h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 text-xs"
                        placeholder="https://R2-link/src.zip"
                      />
                      <label className="h-10 w-10 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 rounded-xl flex items-center justify-center cursor-pointer transition-all shrink-0" title="Upload ZIP">
                        {uploadingFile === 'zip' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        <input 
                          type="file" 
                          accept=".zip,.rar,.tar,.gz"
                          className="sr-only" 
                          onChange={(e) => handleFileUpload(e, 'zip')} 
                          disabled={uploadingFile !== null}
                        />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">External Links (Comma-separated)</label>
                    <input 
                      type="text" 
                      value={lesLinks} 
                      onChange={(e) => setLesLinks(e.target.value)}
                      className="w-full h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 text-xs"
                      placeholder="https://github.com/hadescore, https://docs.django.org"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Lesson Content (Markdown Editor)</label>
                  <textarea 
                    value={lesContent} 
                    onChange={(e) => setLesContent(e.target.value)}
                    rows={4}
                    className="w-full p-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 font-mono"
                    placeholder="### Lesson Objectives..."
                  />
                </div>

                <div>
                  <label className="block font-bold text-primary mb-1 flex items-center gap-1">
                    <span>AI Tutor Knowledge Base / Transcripts (Used for AI Training)</span>
                  </label>
                  <textarea 
                    value={lesNotes} 
                    onChange={(e) => setLesNotes(e.target.value)}
                    rows={3}
                    className="w-full p-3 bg-muted/50 border border-primary/30 rounded-xl outline-none focus:border-primary font-mono text-xs placeholder:text-muted-foreground/50"
                    placeholder="Paste lecture transcript, study notes, Q&A pairs, formulas, or key concepts here to train the AI tutor for this lesson..."
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">The AI Tutor dynamically reads this knowledge base to answer student questions accurately for this video lesson.</p>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button type="button" onClick={() => { setShowLesModal(false); setEditingLesson(null); }} className="px-4 py-2 bg-muted rounded-xl font-medium">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:brightness-110">
                    {editingLesson ? 'Save Changes' : 'Compile Outline'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assignment Modal */}
      <AnimatePresence>
        {showAssignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card text-card-foreground border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 my-8"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                    <ClipboardList size={16} className="text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{editingAssignment ? 'Edit Homework' : 'New Module Homework'}</h3>
                    {assignModuleId && (
                      <span className="text-[10px] text-muted-foreground">
                        Module: {modules.find(m => m.id === assignModuleId)?.title || `#${assignModuleId}`}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => { setShowAssignModal(false); setEditingAssignment(null); }} className="p-1 hover:bg-muted rounded-lg"><X size={16} /></button>
              </div>

              <form onSubmit={handleSaveAssignment} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Assignment Title *</label>
                  <input 
                    type="text" 
                    value={assignTitle} 
                    onChange={(e) => setAssignTitle(e.target.value)}
                    className="w-full h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all"
                    placeholder="e.g. Week 1 Homework - Build a REST API"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Description *</label>
                  <textarea 
                    value={assignDesc} 
                    onChange={(e) => setAssignDesc(e.target.value)}
                    rows={3}
                    className="w-full p-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all resize-none"
                    placeholder="Describe assignment objectives, deliverables, and grading criteria..."
                    required
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 font-semibold text-muted-foreground mb-1">
                    <Upload size={11} />
                    Attachment File
                  </label>
                    {assignFileUrl ? (
                      <div className="flex items-center gap-2 h-10 px-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <FileText size={13} className="text-emerald-500 shrink-0" />
                        <span className="text-[10px] text-emerald-500 font-medium truncate flex-1">{assignFileUrl.split('/').pop()}</span>
                        <button
                          type="button"
                          onClick={() => setAssignFileUrl('')}
                          className="p-0.5 hover:bg-destructive/10 text-destructive/60 hover:text-destructive rounded transition-all"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col gap-1.5 bg-muted/50 border border-dashed border-border rounded-xl cursor-pointer hover:border-primary/40 hover:bg-muted/80 transition-all overflow-hidden">
                        <div className="flex items-center justify-center gap-2 h-10 px-3">
                          {uploadingFile === 'attachment' ? (
                            <>
                              <Loader2 size={13} className="animate-spin text-primary" />
                              <span className="text-[11px] text-primary font-semibold">{uploadProgress}% Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Upload size={13} className="text-muted-foreground" />
                              <span className="text-[11px] text-muted-foreground font-medium">Choose file (PDF, DOC, ZIP...)</span>
                            </>
                          )}
                        </div>
                        {uploadingFile === 'attachment' && (
                          <div className="w-full h-1 bg-muted">
                            <div className="h-full bg-primary transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }} />
                          </div>
                        )}
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.rar,.txt,.png,.jpg,.jpeg"
                          onChange={(e) => handleFileUpload(e, 'attachment')}
                          className="hidden"
                          disabled={uploadingFile === 'attachment'}
                        />
                      </label>
                    )}
                  </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button type="button" onClick={() => { setShowAssignModal(false); setEditingAssignment(null); }} className="px-4 py-2 bg-muted rounded-xl font-medium">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-amber-500 text-white rounded-xl font-semibold hover:brightness-110 transition-all flex items-center gap-1.5">
                    <ClipboardList size={13} />
                    {editingAssignment ? 'Save Changes' : 'Create & Assign'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manage Quiz Modal */}
      <AnimatePresence>
        {showQuizModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card text-card-foreground border border-border w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-5 my-8 text-xs"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="font-semibold text-lg">Manage Lesson Checkpoint Quiz</h3>
                  <span className="text-xs text-muted-foreground">Setup automated quiz checkpoints and pass parameters</span>
                </div>
                <button onClick={() => setShowQuizModal(false)} className="p-1 hover:bg-muted rounded-lg"><X size={16} /></button>
              </div>

              {!activeQuiz ? (
                <div className="py-12 text-center space-y-4">
                  <div className="h-12 w-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                    <HelpCircle size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">No Quiz Checkpoint Found</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">This lesson does not have a checkpoint quiz yet. Create one to lock subsequent training progress until passed.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateQuiz}
                    className="px-5 py-2.5 bg-emerald-500 text-white font-semibold rounded-xl text-xs hover:brightness-110 transition-all shadow-md shadow-emerald-500/10"
                  >
                    Create Quiz Checkpoint
                  </button>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 text-xs divide-y md:divide-y-0 md:divide-x divide-border">
                  {/* Left: Quiz settings */}
                  <div className="space-y-4 pr-0 md:pr-4">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Quiz Configurations</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-semibold">Quiz Title *</label>
                        <input
                          type="text"
                          value={quizTitle}
                          onChange={(e) => setQuizTitle(e.target.value)}
                          className="w-full h-9 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 font-medium">
                        <div>
                          <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-semibold">
                            Min Correct Answers *
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="1"
                              max={questions.length > 0 ? questions.length : 100}
                              value={
                                questions.length > 0
                                  ? Math.max(1, Math.min(questions.length, Math.ceil((passingScore / 100) * questions.length)))
                                  : passingScore
                              }
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                if (questions.length > 0) {
                                  const clamped = Math.max(1, Math.min(questions.length, val));
                                  setPassingScore(Math.round((clamped / questions.length) * 100));
                                } else {
                                  setPassingScore(val);
                                }
                              }}
                              className="w-full h-9 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all font-mono font-bold text-xs"
                              required
                            />
                            <span className="text-[10px] font-bold text-muted-foreground shrink-0 whitespace-nowrap">
                              {questions.length > 0 ? `/ ${questions.length}` : 'answers'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-semibold">Timer (Minutes) *</label>
                          <input
                            type="number"
                            min="1"
                            value={timerMinutes}
                            onChange={(e) => setTimerMinutes(parseInt(e.target.value))}
                            className="w-full h-9 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all"
                            required
                          />
                        </div>
                      </div>

                      {questions.length > 0 && (
                        <div className="p-2.5 bg-primary/5 border border-primary/20 rounded-xl space-y-1 mt-2">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-muted-foreground uppercase">Pass Requirement Target:</span>
                            <span className="text-primary font-extrabold">
                              {Math.ceil((passingScore / 100) * questions.length)} / {questions.length} Correct ({passingScore}%)
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase mr-1">Quick Presets:</span>
                            {Array.from({ length: questions.length }, (_, idx) => {
                              const count = idx + 1;
                              const pct = Math.round((count / questions.length) * 100);
                              const isCurrent = Math.ceil((passingScore / 100) * questions.length) === count;
                              return (
                                <button
                                  key={count}
                                  type="button"
                                  onClick={() => setPassingScore(pct)}
                                  className={`px-2 py-0.5 rounded text-[9px] font-extrabold transition-all ${
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

                      <div className="grid grid-cols-2 gap-3 font-medium">
                        <div>
                          <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-semibold">Max Attempts *</label>
                          <input
                            type="number"
                            min="1"
                            value={maxRetries}
                            onChange={(e) => setMaxRetries(parseInt(e.target.value))}
                            className="w-full h-9 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all"
                            required
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-5">
                          <input
                            type="checkbox"
                            id="randomize"
                            checked={randomizeQuestions}
                            onChange={(e) => setRandomizeQuestions(e.target.checked)}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 accent-primary"
                          />
                          <label htmlFor="randomize" className="font-semibold text-muted-foreground select-none">Randomize Sequence</label>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveQuizSettings}
                        disabled={savingQuizSettings}
                        className="w-full py-2 bg-emerald-500 hover:brightness-110 text-white font-semibold rounded-xl transition-all shadow-md shadow-emerald-500/10 animate-fade-in"
                      >
                        {savingQuizSettings ? 'Saving...' : 'Save Configurations'}
                      </button>

                      <button
                        type="button"
                        onClick={handleDeleteQuiz}
                        className="w-full py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive font-semibold border border-destructive/20 rounded-xl transition-all animate-fade-in"
                      >
                        Delete Quiz Checkpoint
                      </button>
                    </div>

                    {/* Question List */}
                    <div className="space-y-2 pt-2">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Active Questions ({questions.length})</h4>
                      <div className="max-h-52 overflow-y-auto space-y-2 border border-border rounded-xl p-2 bg-muted/10 divide-y divide-border/60">
                        {questions.length === 0 ? (
                          <p className="text-center text-muted-foreground italic py-8">No questions compiled yet. Add questions below.</p>
                        ) : (
                          questions.map((q, idx) => (
                            <div key={q.id} className="pt-2 first:pt-0 flex items-start justify-between gap-3 text-xs">
                              <div className="space-y-0.5">
                                <span className="font-semibold text-foreground/80">Q{idx + 1}. {q.question_text}</span>
                                <div className="text-[10px] text-muted-foreground flex flex-wrap gap-1 items-center">
                                  <span className="font-semibold uppercase bg-muted px-1.5 py-0.25 rounded border border-border">{q.question_type}</span>
                                  <span>Ans: <strong className="text-emerald-500 font-bold">{q.correct_answer}</strong></span>
                                  {q.options && q.options.length > 0 && (
                                    <span className="italic">[{q.options.join(' | ')}]</span>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-colors shrink-0"
                                title="Delete Question"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Add new question */}
                  <div className="space-y-4 pl-0 md:pl-4 pt-4 md:pt-0">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Create New Question</h4>
                    
                    <form onSubmit={handleAddQuestion} className="space-y-3">
                      <div>
                        <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-semibold">Question Prompt *</label>
                        <textarea
                          rows={2}
                          value={qText}
                          onChange={(e) => setQText(e.target.value)}
                          className="w-full p-2.5 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all resize-none"
                          placeholder="e.g. Which keyword is used to start a transaction in PostgreSQL?"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-semibold">Question Type *</label>
                          <select
                            value={qType}
                            onChange={(e: any) => { setQType(e.target.value); if (e.target.value === 'TF') setQCorrect('True'); else setQCorrect(''); }}
                            className="w-full h-9 px-2 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40"
                          >
                            <option value="MCQ" className="font-semibold">Multiple Choice (MCQ)</option>
                            <option value="TF" className="font-semibold">True / False (TF)</option>
                            <option value="MSQ" className="font-semibold">Multiple Select (MSQ)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-semibold">Correct Answer *</label>
                          {qType === 'TF' ? (
                            <select
                              value={qCorrect}
                              onChange={(e) => setQCorrect(e.target.value)}
                              className="w-full h-9 px-2 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40"
                            >
                              <option value="True">True</option>
                              <option value="False">False</option>
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={qCorrect}
                              onChange={(e) => setQCorrect(e.target.value)}
                              className="w-full h-9 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all font-semibold"
                              placeholder="e.g. SELECT (or SELECT,BEGIN for MSQ)"
                              required
                            />
                          )}
                        </div>
                      </div>

                      {qType !== 'TF' && (
                        <div>
                          <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-semibold">Answer Options * (Comma-Separated)</label>
                          <input
                            type="text"
                            value={qOptions}
                            onChange={(e) => setQOptions(e.target.value)}
                            className="w-full h-9 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all text-xs"
                            placeholder="e.g. SELECT, BEGIN, COMMIT, ROLLBACK"
                            required
                          />
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">Enter options exactly. Correct Answer input must match one of these options exactly (or match multiple separated by commas for MSQ).</p>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:brightness-110 transition-all shadow-md shadow-primary/10 flex items-center justify-center gap-1.5 text-xs"
                      >
                        <PlusCircle size={13} />
                        <span>Add Question to Quiz</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CourseBuilder;
