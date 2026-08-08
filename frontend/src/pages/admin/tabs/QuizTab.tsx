import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { 
  HelpCircle, RefreshCw, Search, Loader2, ArrowLeft, 
  Plus, Edit3, Trash2, X, Save, Layers, PlusCircle, CheckCircle, Settings, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuizAttempt {
  id: number;
  student_email: string;
  student_first_name?: string;
  student_last_name?: string;
  student_name?: string;
  quiz_title: string;
  score: number;
  passed: boolean;
  completed_at: string;
}

interface Quiz {
  id: number;
  module: number;
  module_title?: string;
  course_title?: string;
  title: string;
  passing_score: number;
  timer_minutes: number;
  max_retries: number;
  randomize_questions: boolean;
}

interface Course {
  id: number;
  title: string;
}

interface Module {
  id: number;
  course: number;
  title: string;
}

export const QuizTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<'ledger' | 'manage'>('ledger');
  const [search, setSearch] = useState('');
  const [selectedStudentEmail, setSelectedStudentEmail] = useState<string | null>(null);

  const [liveMode, setLiveMode] = React.useState(localStorage.getItem('super_adminLiveMode') === 'true');
  React.useEffect(() => {
    const handleStorage = () => setLiveMode(localStorage.getItem('super_adminLiveMode') === 'true');
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Quiz creation/edit states
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [passingScore, setPassingScore] = useState(70);
  const [timerMinutes, setTimerMinutes] = useState(15);
  const [maxRetries, setMaxRetries] = useState(3);
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');

  // Question Designer states
  const [questions, setQuestions] = useState<any[]>([]);
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<'MCQ' | 'TF' | 'MSQ'>('MCQ');
  const [qOptions, setQOptions] = useState('');
  const [qCorrect, setQCorrect] = useState('');

  // 1. Fetch Quiz Attempts
  const { data: attempts = [], isLoading: attemptsLoading, refetch: refetchAttempts } = useQuery<QuizAttempt[]>({
    queryKey: ['staff-quiz-attempts-list'],
    queryFn: async () => {
      const res = await api.get('quizzes/attempts/');
      return res.data;
    }
  });

  // 2. Fetch Quizzes List
  const { data: quizzes = [], isLoading: quizzesLoading, refetch: refetchQuizzes } = useQuery<Quiz[]>({
    queryKey: ['admin-quizzes-list'],
    enabled: activeSubTab === 'manage',
    queryFn: async () => {
      const res = await api.get('quizzes/list/');
      return res.data;
    }
  });

  // 3. Fetch Courses Dropdown
  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses-dropdown-list', liveMode],
    enabled: showQuizModal,
    queryFn: async () => {
      const res = await api.get(`courses/list/?is_mentoring_track=${liveMode}`);
      return res.data;
    }
  });

  // 4. Fetch Modules Dropdown based on Course selection
  const { data: modules = [] } = useQuery<Module[]>({
    queryKey: ['modules-dropdown-list', selectedCourseId],
    enabled: !!selectedCourseId,
    queryFn: async () => {
      const res = await api.get(`modules/?course=${selectedCourseId}`);
      return res.data;
    }
  });

  // Mutation to Create/Update Quiz
  const saveQuizMutation = useMutation({
    mutationFn: async () => {
      if (!selectedModuleId) {
        toast.error('Please select a module');
        return;
      }
      const payload = {
        module: Number(selectedModuleId),
        title: quizTitle || 'Checkpoint Quiz',
        passing_score: passingScore,
        timer_minutes: timerMinutes,
        max_retries: maxRetries,
        randomize_questions: randomizeQuestions
      };
      if (activeQuiz) {
        const res = await api.put(`quizzes/list/${activeQuiz.id}/`, payload);
        return res.data;
      } else {
        const res = await api.post('quizzes/list/', payload);
        return res.data;
      }
    },
    onSuccess: (data) => {
      if (data) {
        setActiveQuiz(data);
        // Refresh questions for this saved/updated quiz
        setQuestions(data.questions || []);
      }
      refetchQuizzes();
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
      toast.success('Quiz configuration saved.');
    },
    onError: () => {
      toast.error('Failed to save quiz configuration.');
    }
  });

  // Mutation to Delete Quiz
  const deleteQuizMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`quizzes/list/${id}/`);
    },
    onSuccess: () => {
      refetchQuizzes();
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
      toast.success('Quiz checkpoint deleted.');
    },
    onError: () => {
      toast.error('Failed to delete quiz.');
    }
  });

  // Mutation to Delete Quiz Attempt
  const deleteAttemptMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`quizzes/attempts/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-quiz-attempts-list'] });
      toast.success('Quiz attempt record deleted.');
    },
    onError: () => {
      toast.error('Failed to delete attempt.');
    }
  });

  const deleteStudentAttemptsMutation = useMutation({
    mutationFn: async (email: string) => {
      await api.delete(`quizzes/attempts/delete_student/?email=${email}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-quiz-attempts-list'] });
      toast.success('Student quiz attempts deleted.');
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.error || 'Failed to delete student attempts.';
      toast.error(errMsg);
    }
  });

  const handleDeleteStudentAttempts = (email: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete all quiz attempts for ${name}?`)) {
      deleteStudentAttemptsMutation.mutate(email);
    }
  };

  // Load quiz details to edit/view questions
  const handleOpenEditQuiz = async (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setQuizTitle(quiz.title);
    setPassingScore(quiz.passing_score);
    setTimerMinutes(quiz.timer_minutes);
    setMaxRetries(quiz.max_retries);
    setRandomizeQuestions(quiz.randomize_questions);
    setSelectedModuleId(String(quiz.module));
    
    // Find course of this module
    try {
      const modRes = await api.get(`modules/${quiz.module}/`);
      setSelectedCourseId(String(modRes.data.course));
    } catch {
      setSelectedCourseId('');
    }

    try {
      const detailRes = await api.get(`quizzes/list/${quiz.id}/`);
      setQuestions(detailRes.data.questions || []);
    } catch {
      setQuestions([]);
    }

    setShowQuizModal(true);
  };

  const handleOpenCreateQuiz = () => {
    setActiveQuiz(null);
    setQuizTitle('');
    setPassingScore(50);
    setTimerMinutes(15);
    setMaxRetries(3);
    setRandomizeQuestions(true);
    setSelectedCourseId('');
    setSelectedModuleId('');
    setQuestions([]);
    setShowQuizModal(true);
  };

  // Add Question to active quiz
  const handleAddQuestion = async () => {
    if (!activeQuiz || !qText.trim() || !qCorrect.trim()) {
      toast.error('Fill in question prompt and correct match answer.');
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
      toast.success('Question pushed to quiz database.');
    } catch {
      toast.error('Failed to create question.');
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (qId: number) => {
    try {
      await api.delete(`quizzes/questions/${qId}/`);
      setQuestions(prev => prev.filter(q => q.id !== qId));
      toast.success('Question removed.');
    } catch {
      toast.error('Failed to delete question.');
    }
  };

  // Group attempts by student email for Ledger tab
  const studentMap = new Map<string, {
    email: string;
    name: string;
    attempts: QuizAttempt[];
  }>();

  attempts.forEach(att => {
    const email = att.student_email;
    if (!email) return;
    const name = att.student_first_name || att.student_last_name 
      ? `${att.student_first_name || ''} ${att.student_last_name || ''}`.trim()
      : att.student_name || 'Student';
    
    if (!studentMap.has(email)) {
      studentMap.set(email, {
        email,
        name,
        attempts: []
      });
    }
    studentMap.get(email)!.attempts.push(att);
  });

  const studentsList = Array.from(studentMap.values());

  // Filter student attempts or quizzes list based on search
  let filteredStudents = studentsList;
  const selectedStudentData = selectedStudentEmail ? studentMap.get(selectedStudentEmail) : null;
  let filteredAttemptsForStudent: QuizAttempt[] = [];

  if (selectedStudentEmail && selectedStudentData) {
    filteredAttemptsForStudent = selectedStudentData.attempts.filter(att =>
      att.quiz_title?.toLowerCase().includes(search.toLowerCase())
    );
  } else {
    filteredStudents = studentsList.filter(stu =>
      stu.name.toLowerCase().includes(search.toLowerCase()) ||
      stu.email.toLowerCase().includes(search.toLowerCase())
    );
  }

  const filteredQuizzes = quizzes.filter(q =>
    q.title?.toLowerCase().includes(search.toLowerCase()) ||
    q.course_title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-xs">
      {/* Header and Toggle Control */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-[13px]">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Quiz Control Portal</h1>
          <p className="text-muted-foreground text-sm mt-1">Review student performance metrics or configure training evaluation quizzes.</p>
          {activeSubTab === 'ledger' && (
            <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-[10px] font-extrabold uppercase tracking-wider">
              <Users size={11} />
              All Students — Global View
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-muted p-1 rounded-xl flex border border-border">
            <button 
              onClick={() => { setActiveSubTab('ledger'); setSearch(''); }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${activeSubTab === 'ledger' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Attempts Ledger
            </button>
            <button 
              onClick={() => { setActiveSubTab('manage'); setSearch(''); }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${activeSubTab === 'manage' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Manage Quizzes
            </button>
          </div>
        </div>
      </div>

      {/* Filter and search */}
      <div className="flex flex-col sm:flex-row gap-[13px] items-center justify-between bg-muted/20 border border-border/50 p-4 rounded-2xl">
        <span className="font-bold text-muted-foreground block">
          {activeSubTab === 'ledger' ? (
            selectedStudentData 
              ? `Student: ${selectedStudentData.name} (${filteredAttemptsForStudent.length} attempts)`
              : `Total Students: ${studentsList.length} profiles`
          ) : (
            `Total Quizzes Configured: ${quizzes.length} Checkpoints`
          )}
        </span>
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-3 text-muted-foreground" size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              activeSubTab === 'ledger'
                ? (selectedStudentData ? "Search quiz checkpoints..." : "Search student by name or email...")
                : "Search quizzes or courses..."
            }
            className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-xl outline-none focus:border-primary/45"
          />
        </div>
      </div>

      {/* Attempts Ledger Tab View */}
      {activeSubTab === 'ledger' && (
        selectedStudentData ? (
          <div className="space-y-4">
            <div className="flex items-center">
              <button
                onClick={() => { setSelectedStudentEmail(null); setSearch(''); }}
                className="flex items-center gap-1 text-primary font-bold hover:underline"
              >
                <ArrowLeft size={13} />
                <span>Back to Student Roster</span>
              </button>
            </div>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground uppercase font-bold text-[10px] tracking-wider bg-muted/20">
                      <th className="py-3 px-4">Checkpoint Quiz</th>
                      <th className="py-3 px-4">Score</th>
                      <th className="py-3 px-4">Outcome</th>
                      <th className="py-3 px-4">Completed At</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredAttemptsForStudent.map(att => (
                      <tr key={att.id} className="hover:bg-muted/10 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-foreground/80">{att.quiz_title}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-xs">{att.score}%</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${att.passed ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-500' : 'bg-destructive/10 border-destructive/25 text-destructive'}`}>
                            <span>{att.passed ? 'Passed' : 'Failed'}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-muted-foreground">
                          {new Date(att.completed_at).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => { if (window.confirm('Delete this quiz attempt record?')) deleteAttemptMutation.mutate(att.id); }}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            title="Delete Attempt"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredAttemptsForStudent.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-muted-foreground font-medium">No quiz attempts matching search query found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-[13px] sm:grid-cols-2 lg:grid-cols-3">
            {filteredStudents.map(stu => {
              const initial = stu.name.charAt(0).toUpperCase();
              const totalAtts = stu.attempts.length;
              const passedAtts = stu.attempts.filter(a => a.passed).length;
              const passRate = totalAtts > 0 ? Math.round((passedAtts / totalAtts) * 100) : 100;
              const avgScore = totalAtts > 0 ? (stu.attempts.reduce((acc, curr) => acc + curr.score, 0) / totalAtts).toFixed(1) : '0.0';

              return (
                <div
                  key={stu.email}
                  className="p-[17px] bg-card border border-border/80 hover:border-primary/45 hover:shadow-md rounded-2xl flex flex-col justify-between space-y-4 transition-all duration-300 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div 
                      className="flex items-center gap-3"
                      onClick={() => { setSelectedStudentEmail(stu.email); setSearch(''); }}
                    >
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary/10 to-accent/15 border border-primary/10 flex items-center justify-center text-primary font-bold text-sm shadow-sm group-hover:scale-105 transition-transform duration-300">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">{stu.name}</h4>
                        <p className="text-[10px] text-muted-foreground truncate font-mono">{stu.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-extrabold text-primary bg-primary/5 border border-primary/15 px-2.5 py-1 rounded-xl">
                        {totalAtts} {totalAtts === 1 ? 'Att' : 'Atts'}
                      </span>
                      {totalAtts > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStudentAttempts(stu.email, stu.name);
                          }}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          title="Delete all attempts"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-[10px]">
                    <div className="p-2 bg-muted/20 rounded-lg">
                      <span className="text-muted-foreground block text-[9px] uppercase font-extrabold tracking-wider">Pass Rate</span>
                      <span className={`text-xs font-bold block mt-0.5 ${passRate >= 50 ? 'text-emerald-500' : 'text-destructive'}`}>{passRate}%</span>
                    </div>
                    <div className="p-2 bg-muted/20 rounded-lg">
                      <span className="text-muted-foreground block text-[9px] uppercase font-extrabold tracking-wider">Avg Score</span>
                      <span className="text-xs font-bold text-foreground block mt-0.5">{avgScore}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredStudents.length === 0 && (
              <div className="sm:col-span-2 lg:col-span-3 py-16 text-center text-muted-foreground bg-card border border-dashed border-border rounded-2xl">
                No students found matching your search.
              </div>
            )}
          </div>
        )
      )}

      {/* Manage Quizzes Tab View */}
      {activeSubTab === 'manage' && (
        (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted-foreground uppercase font-bold text-[10px] tracking-wider bg-muted/20">
                    <th className="py-3 px-4">Quiz Title</th>
                    <th className="py-3 px-4">Course / Module</th>
                    <th className="py-3 px-4">Pass Target</th>
                    <th className="py-3 px-4">Timer</th>
                    <th className="py-3 px-4">Max Retries</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredQuizzes.map(quiz => (
                    <tr key={quiz.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-foreground/85">{quiz.title}</td>
                      <td className="py-3.5 px-4 font-medium text-muted-foreground">
                        <div className="space-y-0.5">
                          <span className="block text-foreground/80 font-bold">{quiz.course_title || 'N/A'}</span>
                          <span className="block text-[10px] text-muted-foreground font-mono">{quiz.module_title || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-foreground/75">{quiz.passing_score}%</td>
                      <td className="py-3.5 px-4 text-muted-foreground font-mono">{quiz.timer_minutes} Mins</td>
                      <td className="py-3.5 px-4 text-muted-foreground font-mono">{quiz.max_retries}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex gap-1.5">
                          <button
                            onClick={() => handleOpenEditQuiz(quiz)}
                            className="p-1.5 hover:bg-blue-500/10 hover:text-blue-500 rounded-lg text-muted-foreground"
                            title="Configure Quiz"
                          >
                            <Settings size={13} />
                          </button>
                          <button
                            onClick={() => { if (window.confirm('Wipe quiz checkpoint?')) deleteQuizMutation.mutate(quiz.id); }}
                            className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg text-muted-foreground"
                            title="Delete Quiz"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredQuizzes.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground font-medium">No quiz checkpoints matched search filter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Configuration / Question Designer Modal */}
      <AnimatePresence>
        {showQuizModal && (
          <div onClick={() => setShowQuizModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border w-full max-w-4xl rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-extrabold text-sm">{activeQuiz ? `Configure Quiz Checkpoint: ${activeQuiz.title}` : 'Build Checkpoint Quiz'}</h3>
                <button onClick={() => setShowQuizModal(false)}><X size={16} /></button>
              </div>

              {/* Quiz settings settings */}
              <div className="grid gap-[13px] sm:grid-cols-3 bg-muted/10 p-4 border border-border rounded-xl">
                <div className="sm:col-span-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Select Course Track *</label>
                    <select 
                      value={selectedCourseId} 
                      onChange={(e) => { setSelectedCourseId(e.target.value); setSelectedModuleId(''); }} 
                      disabled={!!activeQuiz}
                      className="w-full h-10 px-3 bg-card border border-border rounded-xl font-bold"
                    >
                      <option value="">Choose course</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Select Course Module *</label>
                    <select 
                      value={selectedModuleId} 
                      onChange={(e) => setSelectedModuleId(e.target.value)} 
                      disabled={!selectedCourseId || !!activeQuiz}
                      className="w-full h-10 px-3 bg-card border border-border rounded-xl font-bold"
                    >
                      <option value="">Choose module</option>
                      {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-3 grid gap-3 sm:grid-cols-4 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Quiz Title *</label>
                    <input type="text" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} placeholder="Checkpoint Quiz Title" className="w-full h-10 px-3 bg-card border border-border rounded-xl font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Passing Threshold (%) *</label>
                    <input type="number" value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} className="w-full h-10 px-3 bg-card border border-border rounded-xl font-mono" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Time Limit (Mins) *</label>
                    <input type="number" value={timerMinutes} onChange={(e) => setTimerMinutes(Number(e.target.value))} className="w-full h-10 px-3 bg-card border border-border rounded-xl font-mono" />
                  </div>
                </div>

                {/* Interactive Pass Condition Calculator & Presets */}
                <div className="sm:col-span-3 p-3.5 bg-cyan-500/5 border border-cyan-500/20 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
                      <span className="text-[11px] font-extrabold uppercase tracking-wide text-cyan-700">Pass Condition Helper</span>
                    </div>
                    {questions.length > 0 ? (
                      <span className="text-xs font-bold text-foreground">
                        Require <span className="text-cyan-600 font-extrabold">{Math.ceil((passingScore / 100) * questions.length)}</span> out of <span className="font-extrabold">{questions.length}</span> correct ({passingScore}%)
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground font-medium">Add questions below to enable question-by-question pass presets</span>
                    )}
                  </div>

                  {questions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase mr-1">Quick Presets:</span>
                      {Array.from({ length: questions.length }, (_, index) => {
                        const count = index + 1;
                        const pct = Math.round((count / questions.length) * 100);
                        const isCurrent = Math.ceil((passingScore / 100) * questions.length) === count;
                        return (
                          <button
                            key={count}
                            type="button"
                            onClick={() => setPassingScore(pct)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all ${isCurrent ? 'bg-cyan-600 text-white shadow-sm scale-105' : 'bg-card border border-border hover:border-cyan-400 text-foreground'}`}
                          >
                            {count} / {questions.length} ({pct}%)
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="sm:col-span-3 flex items-center justify-between pt-2">
                  <div className="flex gap-[13px]">
                    <div>
                      <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Max Attempts *</label>
                      <input type="number" value={maxRetries} onChange={(e) => setMaxRetries(Number(e.target.value))} className="w-16 h-8 text-center bg-card border border-border rounded-lg" />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer pt-4 font-bold text-muted-foreground">
                      <input type="checkbox" checked={randomizeQuestions} onChange={(e) => setRandomizeQuestions(e.target.checked)} className="h-4 w-4 accent-primary" />
                      <span>Shuffle Questions</span>
                    </label>
                  </div>
                  <button onClick={() => saveQuizMutation.mutate()} className="h-10 px-6 bg-primary text-primary-foreground font-extrabold rounded-xl flex items-center gap-1.5 shadow-md shadow-primary/10">
                    <Save size={14} />
                    <span>Save Quiz Configuration</span>
                  </button>
                </div>
              </div>

              {/* Bottom half: Add questions (only if activeQuiz exists) */}
              {activeQuiz ? (
                <div className="grid gap-[13px] sm:grid-cols-3 pt-2">
                  {/* Left: Add question form */}
                  <div className="sm:col-span-1 space-y-3 bg-muted/20 p-4 border border-border rounded-xl">
                    <h5 className="font-bold text-xs uppercase text-primary border-b border-border pb-1.5 flex items-center gap-1">
                      <PlusCircle size={14} />
                      <span>Add Question</span>
                    </h5>
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
                        <input type="text" value={qCorrect} onChange={(e) => setQCorrect(e.target.value)} placeholder="e.g. A" className="w-full h-8 px-2 bg-card border border-border rounded-lg" />
                      </div>
                    )}
                    <button onClick={handleAddQuestion} className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 font-bold rounded-lg flex items-center justify-center gap-1">
                      <PlusCircle size={12} />
                      <span>Push Question</span>
                    </button>
                  </div>

                  {/* Right: Questions list */}
                  <div className="sm:col-span-2 space-y-3">
                    <h5 className="font-bold text-xs uppercase text-muted-foreground border-b border-border pb-1.5 flex justify-between">
                      <span>Questions Database ({questions.length})</span>
                    </h5>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {questions.map((q, i) => (
                        <div key={q.id || i} className="p-3 bg-card border border-border rounded-xl flex items-start justify-between gap-3 shadow-sm">
                          <div className="space-y-1">
                            <span className="font-mono text-[9px] text-muted-foreground">{i + 1}. [{q.question_type}]</span>
                            <p className="font-bold text-foreground/90">{q.question_text}</p>
                            <div className="flex flex-wrap gap-1 text-[9px]">
                              {q.options && q.options.map((opt: string, oIdx: number) => (
                                <span key={oIdx} className="bg-muted px-1.5 py-0.5 rounded border border-border/40 font-semibold">{opt}</span>
                              ))}
                            </div>
                            <span className="text-[10px] text-emerald-500 font-bold block mt-1">Answer: {q.correct_answer}</span>
                          </div>
                          <button onClick={() => handleDeleteQuestion(q.id)} className="text-destructive p-1 hover:bg-destructive/10 rounded-lg"><Trash2 size={12} /></button>
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
                  <span>Save Quiz Configuration above to enable Question Designer.</span>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default QuizTab;
