import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { 
  Plus, Edit3, Trash2, X, Save, Clock, Users, CheckSquare, Square, 
  Search, FileEdit, FileText, Loader2, ArrowLeft, Download 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Student {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

interface Submission {
  id: number;
  student_email: string;
  student_first_name?: string;
  student_last_name?: string;
  student_name?: string;
  student_category?: string;
  assignment_title: string;
  assignment_created_by?: string;
  submitted_at: string;
  status: 'PENDING' | 'GRADED' | 'REJECTED';
  grade?: string;
  feedback?: string;
  file_submission?: string;
  notes?: string;
  plagiarism_score?: number;
}

interface Assignment {
  id: number;
  title: string;
  description: string;
  file_attachment?: string;
  due_date?: string;
  course?: number;
  students?: number[];
  students_details?: Array<{ id: number; email: string; name: string }>;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
}

export const LiveAssignmentsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<'submissions' | 'manage'>('submissions');
  const [subSearch, setSubSearch] = useState('');
  const [selectedStudentEmail, setSelectedStudentEmail] = useState<string | null>(null);

  // Modal states for Create/Edit
  const [showModal, setShowModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  
  // Student selection
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [studentSearch, setStudentSearch] = useState('');

  // Grading Modal states
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [gradeInput, setGradeInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [gradeAction, setGradeAction] = useState<'grade' | 'reject'>('grade');

  // 1. Fetch Submissions for staff
  const { data: submissions = [] } = useQuery<Submission[]>({
    queryKey: ['staff-live-submissions-list'],
    queryFn: async () => {
      const res = await api.get('assignments/submissions/');
      return res.data;
    }
  });

  // 2. Fetch Assignments
  const { data: assignments = [], isLoading: isAssignmentsLoading } = useQuery<Assignment[]>({
    queryKey: ['staff-live-assignments'],
    queryFn: async () => {
      const res = await api.get('assignments/list/');
      return res.data.filter((a: any) => !a.module);
    }
  });

  // 3. Fetch Assigned Mentees
  const { data: students = [], isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ['staff-students-list'],
    queryFn: async () => {
      const res = await api.get('students/?live_mode=true');
      return Array.isArray(res.data) ? res.data : (res.data?.results || []);
    }
  });

  const filteredStudentsForSelect = students.filter(s => 
    s.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
    (s.first_name + ' ' + s.last_name).toLowerCase().includes(studentSearch.toLowerCase())
  );

  const toggleStudent = (id: number) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudentsForSelect.length && filteredStudentsForSelect.length > 0) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudentsForSelect.map(s => s.id));
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<Assignment>) => {
      if (editingAssignment) {
        return api.put(`assignments/list/${editingAssignment.id}/`, payload);
      }
      return api.post('assignments/list/', payload);
    },
    onSuccess: () => {
      toast.success(editingAssignment ? 'Assignment updated!' : 'Assignment assigned!');
      queryClient.invalidateQueries({ queryKey: ['staff-live-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-live-assignments'] });
      setShowModal(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to save assignment');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`assignments/list/${id}/`),
    onSuccess: () => {
      toast.success('Assignment deleted');
      queryClient.invalidateQueries({ queryKey: ['staff-live-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-live-assignments'] });
    }
  });

  const gradeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSub) return;
      await api.post(`assignments/submissions/${selectedSub.id}/grade/`, {
        grade: gradeAction === 'grade' ? gradeInput : undefined,
        feedback: feedbackInput,
        action: gradeAction
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-live-submissions-list'] });
      setShowGradeModal(false);
      setSelectedSub(null);
      setGradeInput('');
      setFeedbackInput('');
      toast.success('Submission evaluated successfully.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to submit grading.');
    }
  });

  const deleteSubmissionMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`assignments/submissions/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-live-submissions-list'] });
      toast.success('Submission deleted.');
    }
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setFileUrl('');
    setSelectedStudentIds([]);
    setStudentSearch('');
    setEditingAssignment(null);
  };

  const openEdit = (a: Assignment) => {
    setEditingAssignment(a);
    setTitle(a.title);
    setDescription(a.description || '');
    setDueDate(a.due_date ? new Date(a.due_date).toISOString().slice(0,16) : '');
    setFileUrl(a.file_attachment || '');
    setSelectedStudentIds(a.students || []);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!title.trim()) return toast.error('Title is required');
    
    const payload: any = {
      title,
      description,
      file_attachment: fileUrl,
      students: selectedStudentIds,
    };
    if (dueDate) payload.due_date = new Date(dueDate).toISOString();

    saveMutation.mutate(payload);
  };

  const openGradeModal = (sub: Submission) => {
    setSelectedSub(sub);
    setGradeInput(sub.grade || '');
    setFeedbackInput(sub.feedback || '');
    setGradeAction(sub.status === 'REJECTED' ? 'reject' : 'grade');
    setShowGradeModal(true);
  };

  // Group submissions by student email
  const studentMap = new Map<string, {
    email: string;
    name: string;
    category: string;
    submissions: Submission[];
  }>();

  submissions.forEach(sub => {
    const email = sub.student_email;
    if (!email) return;
    const name = sub.student_first_name || sub.student_last_name 
      ? `${sub.student_first_name || ''} ${sub.student_last_name || ''}`.trim()
      : sub.student_name || 'Mentee';
    const category = sub.student_category || 'Live Mentoring';
    
    if (!studentMap.has(email)) {
      studentMap.set(email, {
        email,
        name,
        category,
        submissions: []
      });
    }
    studentMap.get(email)!.submissions.push(sub);
  });

  const studentsList = Array.from(studentMap.values());

  // Filter based on search query
  let filteredStudents = studentsList;
  const selectedStudentData = selectedStudentEmail ? studentMap.get(selectedStudentEmail) : null;
  let filteredSubsForStudent: Submission[] = [];

  if (selectedStudentEmail && selectedStudentData) {
    filteredSubsForStudent = selectedStudentData.submissions.filter(sub =>
      sub.assignment_title?.toLowerCase().includes(subSearch.toLowerCase()) ||
      sub.assignment_created_by?.toLowerCase().includes(subSearch.toLowerCase())
    );
  } else {
    filteredStudents = studentsList.filter(stu =>
      stu.name.toLowerCase().includes(subSearch.toLowerCase()) ||
      stu.email.toLowerCase().includes(subSearch.toLowerCase()) ||
      stu.category.toLowerCase().includes(subSearch.toLowerCase())
    );
  }

  const filteredAssignments = assignments.filter(a =>
    a.title?.toLowerCase().includes(subSearch.toLowerCase()) ||
    a.created_by_name?.toLowerCase().includes(subSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 text-xs animate-fade-in">
      {/* Header and Toggle Control */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Live Mentoring Assignments</h1>
          <p className="text-muted-foreground text-sm mt-1">Review mentee homework submissions, grade deliverables, and assign custom tasks.</p>
          {activeSubTab === 'submissions' && (
            <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700/50 text-[10px] font-extrabold uppercase tracking-wider">
              <Users size={11} />
              Mentee Submissions Inbox
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-muted p-1 rounded-xl flex border border-border">
            <button 
              onClick={() => { setActiveSubTab('submissions'); setSubSearch(''); }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${activeSubTab === 'submissions' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Submissions Inbox
            </button>
            <button 
              onClick={() => { setActiveSubTab('manage'); setSubSearch(''); }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${activeSubTab === 'manage' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Manage Tasks
            </button>
          </div>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-md transition-all hover:brightness-110 active:scale-95"
          >
            <Plus size={14} />
            <span>Assign New Task</span>
          </button>
        </div>
      </div>

      {/* Filter and search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/20 border border-border/50 p-4 rounded-2xl">
        <span className="font-bold text-muted-foreground block">
          {activeSubTab === 'submissions' ? (
            selectedStudentData 
              ? `Mentee: ${selectedStudentData.name} • Domain: ${selectedStudentData.category} (${filteredSubsForStudent.length} tasks)`
              : `Total Mentees Submitted: ${studentsList.length} profiles`
          ) : (
            `Total Tasks: ${assignments.length} assignments`
          )}
        </span>
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-3 text-muted-foreground" size={14} />
          <input
            type="text"
            value={subSearch}
            onChange={(e) => setSubSearch(e.target.value)}
            placeholder={
              activeSubTab === 'submissions'
                ? (selectedStudentData ? "Search tasks..." : "Search mentee by name, email, or domain...")
                : "Search assignments or mentor name..."
            }
            className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-xl outline-none focus:border-primary/45 font-medium"
          />
        </div>
      </div>

      {/* Submissions Inbox Tab View */}
      {activeSubTab === 'submissions' && (
        selectedStudentData ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => { setSelectedStudentEmail(null); setSubSearch(''); }}
                className="flex items-center gap-1 text-primary font-bold hover:underline"
              >
                <ArrowLeft size={13} />
                <span>Back to All Mentees</span>
              </button>
              <span className="text-xs font-bold px-3 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/40 rounded-full">
                Domain: {selectedStudentData.category}
              </span>
            </div>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground uppercase font-bold text-[10px] tracking-wider bg-muted/20">
                      <th className="py-3 px-4">Homework Task</th>
                      <th className="py-3 px-4">Created By / Mentor</th>
                      <th className="py-3 px-4">File Deliverable</th>
                      <th className="py-3 px-4">Evaluation Status</th>
                      <th className="py-3 px-4">Grade Score</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredSubsForStudent.map(sub => (
                      <tr key={sub.id} className="hover:bg-muted/10 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-foreground/80">{sub.assignment_title}</td>
                        <td className="py-3.5 px-4 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {sub.assignment_created_by || 'Staff Mentor'}
                        </td>
                        <td className="py-3.5 px-4">
                          {sub.file_submission ? (
                            <a href={sub.file_submission} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary font-bold hover:underline">
                              <Download size={12} />
                              <span>Download PDF</span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground italic">No file attached</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                            sub.status === 'GRADED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                            sub.status === 'REJECTED' ? 'bg-destructive/10 border-destructive/20 text-destructive' :
                            'bg-amber-500/10 border-amber-500/20 text-amber-500'
                          }`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-foreground/75 font-mono">{sub.grade || 'N/A'}</td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex gap-1.5">
                            <button
                              onClick={() => openGradeModal(sub)}
                              className="px-2.5 py-1 bg-primary text-primary-foreground hover:brightness-110 font-bold rounded-lg"
                            >
                              {sub.status === 'PENDING' ? 'Grade' : 'Review'}
                            </button>
                            <button
                              onClick={() => { if (window.confirm('Delete submission?')) deleteSubmissionMutation.mutate(sub.id); }}
                              className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredSubsForStudent.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-muted-foreground font-medium">No submissions matched queries.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStudents.map(stu => {
              const initial = stu.name.charAt(0).toUpperCase();
              const totalSubs = stu.submissions.length;
              const pendingSubs = stu.submissions.filter(s => s.status === 'PENDING').length;

              return (
                <div
                  key={stu.email}
                  className="p-5 bg-card border border-border/80 hover:border-primary/45 hover:shadow-md rounded-2xl flex flex-col justify-between space-y-4 transition-all duration-300 group cursor-pointer"
                  onClick={() => { setSelectedStudentEmail(stu.email); setSubSearch(''); }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary/10 to-accent/15 border border-primary/10 flex items-center justify-center text-primary font-bold text-sm shadow-sm group-hover:scale-105 transition-transform duration-300">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">{stu.name}</h4>
                        <p className="text-[10px] text-muted-foreground truncate font-mono">{stu.email}</p>
                        <span className="inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border border-violet-200 dark:border-violet-800/40">
                          Domain: {stu.category}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                      <span className="text-[10px] font-extrabold text-primary bg-primary/5 border border-primary/15 px-2.5 py-1 rounded-xl">
                        {totalSubs} {totalSubs === 1 ? 'Sub' : 'Subs'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10px]">
                    <span className="text-muted-foreground font-semibold">Pending Evaluation</span>
                    <span className={`font-bold ${pendingSubs > 0 ? 'text-amber-500 font-mono text-xs' : 'text-muted-foreground'}`}>{pendingSubs} Tasks</span>
                  </div>
                </div>
              );
            })}
            {filteredStudents.length === 0 && (
              <div className="sm:col-span-2 lg:col-span-3 py-16 text-center text-muted-foreground bg-card border border-dashed border-border rounded-2xl">
                No mentee submissions found.
              </div>
            )}
          </div>
        )
      )}

      {/* Manage Tasks Tab View */}
      {activeSubTab === 'manage' && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAssignments.map(a => (
            <div key={a.id} className="group rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative flex flex-col justify-between gap-4">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all pointer-events-none" />
              
              <div className="relative z-10 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex gap-1 shrink-0 ml-auto">
                    <button onClick={() => openEdit(a)} className="p-1.5 bg-muted rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"><Edit3 size={12}/></button>
                    <button onClick={() => { if (window.confirm('Delete assignment?')) deleteMutation.mutate(a.id); }} className="p-1.5 bg-destructive/10 rounded-lg text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"><Trash2 size={12}/></button>
                  </div>
                </div>

                <div>
                  <h3 className="font-extrabold text-base leading-snug group-hover:text-primary transition-colors">{a.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.description}</p>
                  {a.created_by_name && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-1.5">
                      Created By / Mentor: {a.created_by_name}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                    <Clock size={12} className="text-primary/70" />
                    <span>Due: {a.due_date ? new Date(a.due_date).toLocaleString() : 'No Due Date'}</span>
                  </div>
                  <div className="flex items-start gap-2 text-[11px] font-medium text-muted-foreground">
                    <Users size={12} className="text-primary/70 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">
                      {a.students_details && a.students_details.length > 0 
                        ? `Target (${a.students_details.length}): ${a.students_details.map(s => s.name).join(', ')}`
                        : (a.students && a.students.length > 0 ? `${a.students.length} Target Students` : 'Open to All Assigned Mentees')}
                    </span>
                  </div>
                </div>
              </div>

              {a.file_attachment && (
                <a
                  href={a.file_attachment}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center justify-center gap-1.5 w-full py-2 bg-muted/50 border border-border text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary rounded-xl text-[11px] font-bold transition-all relative z-10"
                >
                  <FileText size={13} />
                  <span>View Attachment</span>
                </a>
              )}
            </div>
          ))}
          {filteredAssignments.length === 0 && (
            <div className="col-span-full py-20 text-center text-muted-foreground bg-card border border-dashed border-border rounded-2xl">
              <FileEdit size={32} className="mx-auto mb-3 opacity-20" />
              <h3 className="font-bold text-sm text-foreground">No Assignments</h3>
              <p>You haven't assigned any specific tasks yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Grading Evaluation Modal */}
      <AnimatePresence>
        {showGradeModal && selectedSub && (
          <div onClick={() => setShowGradeModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-extrabold text-sm">Grading Evaluation</h3>
                <button onClick={() => setShowGradeModal(false)}><X size={16} /></button>
              </div>

              {/* Plagiarism Scan Report */}
              {selectedSub.plagiarism_score !== undefined && (
                <div className={`p-3 rounded-xl border flex items-center justify-between text-[11px] ${
                  (selectedSub.plagiarism_score || 0) > 15 ? 'bg-destructive/5 border-destructive/20 text-destructive' : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500'
                }`}>
                  <span className="font-bold uppercase">Plagiarism Scan Report:</span>
                  <span className="font-mono font-extrabold">{selectedSub.plagiarism_score}% Matching similarity</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Grading Decision</label>
                  <select 
                    value={gradeAction} 
                    onChange={(e) => setGradeAction(e.target.value as any)} 
                    className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl font-bold"
                  >
                    <option value="grade">Approve & Grade Submission</option>
                    <option value="reject">Reject & Ask for Resubmission</option>
                  </select>
                </div>

                {gradeAction === 'grade' && (
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Grade Marks / Percentage</label>
                    <input 
                      type="text" 
                      value={gradeInput} 
                      onChange={(e) => setGradeInput(e.target.value)} 
                      placeholder="e.g. 95/100 or A+" 
                      className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl font-mono" 
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Feedback / Remarks</label>
                  <textarea 
                    value={feedbackInput} 
                    onChange={(e) => setFeedbackInput(e.target.value)} 
                    rows={3} 
                    placeholder="Provide constructive feedback for student..." 
                    className="w-full p-3 bg-muted/40 border border-border rounded-xl outline-none" 
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => setShowGradeModal(false)} 
                    className="flex-1 py-2.5 bg-muted rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => gradeMutation.mutate()} 
                    disabled={gradeMutation.isPending} 
                    className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:brightness-110 flex items-center justify-center gap-1.5"
                  >
                    {gradeMutation.isPending && <Loader2 size={13} className="animate-spin" />}
                    <span>Submit Evaluation</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assignment Create Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
                <h2 className="text-lg font-black">{editingAssignment ? 'Edit Assignment' : 'Assign New Task'}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-muted rounded-full transition-colors"><X size={16} /></button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1.5">Assignment Title</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary/50 transition-colors" placeholder="e.g. Week 1 Capstone Project" />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1.5">Instructions / Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors min-h-[80px]" placeholder="Explain what the students need to do..." />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1.5">Due Date (Optional)</label>
                    <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary/50 transition-colors" />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1.5">File Attachment (Optional)</label>
                    <div className="flex gap-2">
                      <input type="url" value={fileUrl} onChange={e => setFileUrl(e.target.value)} className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary/50 transition-colors" placeholder="Link to PDF or resource..." />
                      <label className={`flex items-center justify-center px-4 py-2 bg-muted/50 border border-border rounded-xl cursor-pointer hover:bg-muted transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                        {uploading ? <Loader2 size={16} className="animate-spin text-muted-foreground" /> : <FileText size={16} className="text-muted-foreground" />}
                        <input type="file" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploading(true);
                          const formData = new FormData();
                          formData.append('file', file);
                          try {
                            const res = await api.post('core/upload/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                            setFileUrl(res.data.url);
                            toast.success('File uploaded.');
                          } catch {
                            toast.error('Upload failed.');
                          } finally {
                            setUploading(false);
                          }
                        }} />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 border border-border rounded-2xl p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-extrabold text-sm flex items-center gap-2"><Users size={14} className="text-primary"/> Assign to Students</h4>
                      <p className="text-[10px] text-muted-foreground">Select specific students or assign to all.</p>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={12} />
                      <input type="text" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search students..." className="pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs outline-none focus:border-primary" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-background p-2 rounded-xl border border-border">
                    <button onClick={toggleSelectAll} className="p-1.5 text-muted-foreground hover:text-foreground">
                      {selectedStudentIds.length === filteredStudentsForSelect.length && filteredStudentsForSelect.length > 0 ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} />}
                    </button>
                    <span className="font-semibold text-xs">Select All ({filteredStudentsForSelect.length})</span>
                    <span className="ml-auto text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      {selectedStudentIds.length} Selected
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto bg-background rounded-xl border border-border divide-y divide-border/50">
                    {studentsLoading ? (
                      <div className="p-6 flex justify-center items-center">
                        <Loader2 size={18} className="animate-spin text-primary" />
                      </div>
                    ) : filteredStudentsForSelect.length > 0 ? (
                      filteredStudentsForSelect.map(student => (
                        <div key={student.id} onClick={() => toggleStudent(student.id)} className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors">
                          {selectedStudentIds.includes(student.id) ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} className="text-muted-foreground" />}
                          <div>
                            <p className="font-bold text-xs">{student.first_name} {student.last_name}</p>
                            <p className="text-[10px] text-muted-foreground">{student.email}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-5 text-center text-muted-foreground text-xs italic">
                        No assigned students found for your mentor account.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-border bg-muted/20 flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-5 py-2.5 font-bold rounded-xl hover:bg-muted text-muted-foreground transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={saveMutation.isPending} className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50">
                  {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>{editingAssignment ? 'Update Assignment' : 'Publish Assignment'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveAssignmentsTab;
