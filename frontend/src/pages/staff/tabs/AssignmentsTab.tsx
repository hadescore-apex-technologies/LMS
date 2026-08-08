import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { 
  FileText, Download, Trash2, Search, X, Save, Loader2, ArrowLeft,
  Settings, Upload, CheckCircle, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Submission {
  id: number;
  student_email: string;
  student_first_name?: string;
  student_last_name?: string;
  student_name?: string;
  assignment_title: string;
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
  module: number;
  module_title?: string;
  course_title?: string;
  title: string;
  description: string;
  file_attachment?: string;
  due_date?: string;
  created_at: string;
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

export const AssignmentsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<'submissions' | 'manage'>('submissions');
  const [subSearch, setSubSearch] = useState('');
  const [selectedStudentEmail, setSelectedStudentEmail] = useState<string | null>(null);

  // Grading Modal states
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [gradeInput, setGradeInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [gradeAction, setGradeAction] = useState<'grade' | 'reject'>('grade');

  // Assignment creation/edit states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDesc, setAssignDesc] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [assignFileUrl, setAssignFileUrl] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  // 1. Fetch Submissions
  const { data: submissions = [] } = useQuery<Submission[]>({
    queryKey: ['staff-submissions-list'],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const res = await api.get('assignments/submissions/');
      return res.data;
    }
  });

  // 2. Fetch Assignments list
  const { data: assignments = [], refetch: refetchAssignments } = useQuery<Assignment[]>({
    queryKey: ['staff-assignments-list'],
    placeholderData: (prev) => prev,
    enabled: activeSubTab === 'manage',
    queryFn: async () => {
      const res = await api.get('assignments/list/');
      return res.data;
    }
  });

  // 3. Fetch Courses Dropdown
  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses-dropdown-list'],
    placeholderData: (prev) => prev,
    enabled: showAssignModal,
    queryFn: async () => {
      const res = await api.get('courses/list/');
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

  // Grade/Evaluate Mutation
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
      queryClient.invalidateQueries({ queryKey: ['staff-submissions-list'] });
      setShowGradeModal(false);
      setSelectedSub(null);
      setGradeInput('');
      setFeedbackInput('');
      toast.success('Submission evaluation saved.');
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.error || 'Failed to submit grading.';
      toast.error(errMsg);
    }
  });

  const deleteSubmissionMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`assignments/submissions/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-submissions-list'] });
      toast.success('Submission record deleted.');
    }
  });

  const deleteStudentSubmissionsMutation = useMutation({
    mutationFn: async (email: string) => {
      await api.delete(`assignments/submissions/delete_student/?email=${email}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-submissions-list'] });
      toast.success('Student submissions deleted.');
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.error || 'Failed to delete student submissions.';
      toast.error(errMsg);
    }
  });

  const handleDeleteStudentSubmissions = (email: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete all submissions for ${name}?`)) {
      deleteStudentSubmissionsMutation.mutate(email);
    }
  };

  // Save Assignment Mutation
  const saveAssignmentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedModuleId) {
        toast.error('Please select a module');
        return;
      }
      const payload = {
        title: assignTitle,
        description: assignDesc,
        module: Number(selectedModuleId),
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
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
      setShowAssignModal(false);
      resetAssignForm();
      toast.success('Homework assignment saved successfully.');
    },
    onError: () => {
      toast.error('Failed to save assignment.');
    }
  });

  // Delete Assignment Mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`assignments/list/${id}/`);
    },
    onSuccess: () => {
      refetchAssignments();
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
      toast.success('Homework assignment deleted.');
    },
    onError: () => {
      toast.error('Failed to delete assignment.');
    }
  });

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
      setAssignFileUrl(res.data.url);
      toast.success('Attachment uploaded.');
    } catch {
      toast.error('Upload failed.');
    } finally {
      setUploadingField(null);
    }
  };

  const openGradeModal = (sub: Submission) => {
    setSelectedSub(sub);
    setGradeInput(sub.grade || '');
    setFeedbackInput(sub.feedback || '');
    setGradeAction(sub.status === 'REJECTED' ? 'reject' : 'grade');
    setShowGradeModal(true);
  };

  
  const handleOpenEditAssign = async (assign: Assignment) => {
    setEditingAssignment(assign);
    setAssignTitle(assign.title);
    setAssignDesc(assign.description);
    setAssignDueDate(assign.due_date ? assign.due_date.slice(0, 16) : '');
    setAssignFileUrl(assign.file_attachment || '');
    setSelectedModuleId(String(assign.module));

    // Find course of this module
    try {
      const modRes = await api.get(`modules/${assign.module}/`);
      setSelectedCourseId(String(modRes.data.course));
    } catch {
      setSelectedCourseId('');
    }

    setShowAssignModal(true);
  };

  const resetAssignForm = () => {
    setEditingAssignment(null);
    setAssignTitle('');
    setAssignDesc('');
    setAssignDueDate('');
    setAssignFileUrl('');
    setSelectedCourseId('');
    setSelectedModuleId('');
  };

  // Group submissions by student email
  const studentMap = new Map<string, {
    email: string;
    name: string;
    submissions: Submission[];
  }>();

  submissions.forEach(sub => {
    const email = sub.student_email;
    if (!email) return;
    const name = sub.student_first_name || sub.student_last_name 
      ? `${sub.student_first_name || ''} ${sub.student_last_name || ''}`.trim()
      : sub.student_name || 'Student';
    
    if (!studentMap.has(email)) {
      studentMap.set(email, {
        email,
        name,
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
      sub.assignment_title?.toLowerCase().includes(subSearch.toLowerCase())
    );
  } else {
    filteredStudents = studentsList.filter(stu =>
      stu.name.toLowerCase().includes(subSearch.toLowerCase()) ||
      stu.email.toLowerCase().includes(subSearch.toLowerCase())
    );
  }

  const filteredAssignments = assignments.filter(a =>
    a.title?.toLowerCase().includes(subSearch.toLowerCase()) ||
    a.course_title?.toLowerCase().includes(subSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 text-xs">
      {/* Header and Toggle Control */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Assignment Command Center</h1>
          <p className="text-muted-foreground text-sm mt-1">Review, run plagiarism scan and grade homework deliverables or configure tasks.</p>
          {activeSubTab === 'submissions' && (
            <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500 text-[10px] font-extrabold uppercase tracking-wider">
              <UserCheck size={11} />
              My Assigned Students Only
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
        </div>
      </div>

      {/* Filter and search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/20 border border-border/50 p-4 rounded-2xl">
        <span className="font-bold text-muted-foreground block">
          {activeSubTab === 'submissions' ? (
            selectedStudentData 
              ? `Student: ${selectedStudentData.name} (${filteredSubsForStudent.length} tasks)`
              : `Total Students: ${studentsList.length} profiles`
          ) : (
            `Total Assignments: ${assignments.length} tasks`
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
                ? (selectedStudentData ? "Search tasks..." : "Search student by name or email...")
                : "Search assignments or courses..."
            }
            className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-xl outline-none focus:border-primary/45"
          />
        </div>
      </div>

      {/* Submissions Inbox Tab View */}
      {activeSubTab === 'submissions' && (
        selectedStudentData ? (
          <div className="space-y-4">
            <div className="flex items-center">
              <button
                onClick={() => { setSelectedStudentEmail(null); setSubSearch(''); }}
                className="flex items-center gap-1 text-primary font-bold hover:underline"
              >
                <ArrowLeft size={13} />
                <span>Back to Student Index</span>
              </button>
            </div>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground uppercase font-bold text-[10px] tracking-wider bg-muted/20">
                      <th className="py-3 px-4">Homework Task</th>
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
                        <td colSpan={5} className="py-12 text-center text-muted-foreground font-medium">No submissions matched queries.</td>
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
                  className="p-5 bg-card border border-border/80 hover:border-primary/45 hover:shadow-md rounded-2xl flex flex-col justify-between space-y-4 transition-all duration-300 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div 
                      className="flex items-center gap-3"
                      onClick={() => { setSelectedStudentEmail(stu.email); setSubSearch(''); }}
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
                        {totalSubs} {totalSubs === 1 ? 'Sub' : 'Subs'}
                      </span>
                      {totalSubs > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStudentSubmissions(stu.email, stu.name);
                          }}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          title="Delete all submissions"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
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
                No students found matching your search.
              </div>
            )}
          </div>
        )
      )}

      {/* Manage Tasks Tab View */}
      {activeSubTab === 'manage' && (
        (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted-foreground uppercase font-bold text-[10px] tracking-wider bg-muted/20">
                    <th className="py-3 px-4">Assignment Title</th>
                    <th className="py-3 px-4">Course / Module</th>
                    <th className="py-3 px-4">Deadline</th>
                    <th className="py-3 px-4">Attachment</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAssignments.map(assign => (
                    <tr key={assign.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-foreground/85">{assign.title}</td>
                      <td className="py-3.5 px-4 font-medium text-muted-foreground">
                        <div className="space-y-0.5">
                          <span className="block text-foreground/80 font-bold">{assign.course_title || 'N/A'}</span>
                          <span className="block text-[10px] text-muted-foreground font-mono">{assign.module_title || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-foreground/75 font-mono">
                        {assign.due_date ? new Date(assign.due_date).toLocaleDateString() : 'No Limit'}
                      </td>
                      <td className="py-3.5 px-4">
                        {assign.file_attachment ? (
                          <a href={assign.file_attachment} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary font-bold hover:underline">
                            <Download size={11} />
                            <span>Attachment</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">None</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex gap-1.5">
                          <button
                            onClick={() => handleOpenEditAssign(assign)}
                            className="p-1.5 hover:bg-blue-500/10 hover:text-blue-500 rounded-lg text-muted-foreground"
                            title="Edit Assignment"
                          >
                            <Settings size={13} />
                          </button>
                          <button
                            onClick={() => { if (window.confirm('Delete this homework task?')) deleteAssignmentMutation.mutate(assign.id); }}
                            className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg text-muted-foreground"
                            title="Delete Assignment"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredAssignments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-muted-foreground font-medium">No homework tasks matched search filter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
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

              {/* Plagiarism Scan Tool Mock/Indicator */}
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
                    <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Awarded Grade / Score (e.g. A+, 95/100) *</label>
                    <input 
                      type="text" 
                      value={gradeInput} 
                      onChange={(e) => setGradeInput(e.target.value)} 
                      required 
                      className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" 
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Feedback Remarks for Student</label>
                  <textarea 
                    value={feedbackInput} 
                    onChange={(e) => setFeedbackInput(e.target.value)} 
                    rows={4} 
                    className="w-full p-3 bg-muted/40 border border-border rounded-xl outline-none resize-none" 
                  />
                </div>

                <button 
                  onClick={() => gradeMutation.mutate()} 
                  disabled={gradeMutation.isPending}
                  className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-1 shadow-md shadow-primary/10"
                >
                  <CheckCircle size={13} />
                  <span>{gradeMutation.isPending ? 'Submitting...' : 'Save Evaluation'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create / Edit Assignment Modal */}
      <AnimatePresence>
        {showAssignModal && (
          <div onClick={() => setShowAssignModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-extrabold text-sm">{editingAssignment ? 'Modify Homework Details' : 'Post Homework Assignment'}</h3>
                <button onClick={() => setShowAssignModal(false)}><X size={16} /></button>
              </div>
              
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Select Course Track *</label>
                    <select 
                      value={selectedCourseId} 
                      onChange={(e) => { setSelectedCourseId(e.target.value); setSelectedModuleId(''); }} 
                      disabled={!!editingAssignment}
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
                      disabled={!selectedCourseId || !!editingAssignment}
                      className="w-full h-10 px-3 bg-card border border-border rounded-xl font-bold"
                    >
                      <option value="">Choose module</option>
                      {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                    </select>
                  </div>
                </div>

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
                <button onClick={() => saveAssignmentMutation.mutate()} disabled={saveAssignmentMutation.isPending} className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-primary/10">
                  <Save size={13} />
                  <span>{saveAssignmentMutation.isPending ? 'Saving...' : 'Save Assignment'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default AssignmentsTab;
