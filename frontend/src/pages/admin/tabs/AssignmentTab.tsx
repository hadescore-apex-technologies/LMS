import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { 
  FileText, Download, Trash2, Search, X, Save, Loader2, ArrowLeft,
  Plus, Settings, Upload, CheckCircle, Users, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  module: number;
  module_title?: string;
  course_title?: string;
  title: string;
  description: string;
  file_attachment?: string;
  due_date?: string;
  created_by?: number;
  created_by_name?: string;
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

export const AssignmentTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<'submissions' | 'manage'>('submissions');
  const [subSearch, setSubSearch] = useState('');
  const [selectedStudentEmail, setSelectedStudentEmail] = useState<string | null>(null);

  const [liveMode, setLiveMode] = React.useState(localStorage.getItem('super_adminLiveMode') === 'true');
  React.useEffect(() => {
    const handleStorage = () => setLiveMode(localStorage.getItem('super_adminLiveMode') === 'true');
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

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
    queryFn: async () => {
      const res = await api.get('assignments/submissions/');
      return res.data;
    }
  });

  // 2. Fetch Assignments list
  const { data: assignments = [], refetch: refetchAssignments } = useQuery<Assignment[]>({
    queryKey: ['admin-assignments-list'],
    enabled: activeSubTab === 'manage',
    queryFn: async () => {
      const res = await api.get('assignments/list/');
      return res.data;
    }
  });

  // 3. Fetch Courses Dropdown
  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses-dropdown-list', liveMode],
    enabled: showAssignModal,
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
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['staff-submissions-list'] });
      const previousSubmissions = queryClient.getQueryData(['staff-submissions-list']);
      queryClient.setQueryData(['staff-submissions-list'], (old: any) =>
        (old || []).filter((s: any) => s.id !== id)
      );
      return { previousSubmissions };
    },
    onError: (err, id, context: any) => {
      if (context?.previousSubmissions) {
        queryClient.setQueryData(['staff-submissions-list'], context.previousSubmissions);
      }
      toast.error('Failed to delete submission.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-submissions-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
      toast.success('Submission deleted.');
    }
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`assignments/list/${id}/`);
    },
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['admin-assignments-list'] });
      const previousAssignments = queryClient.getQueryData(['admin-assignments-list']);
      queryClient.setQueryData(['admin-assignments-list'], (old: any) =>
        (old || []).filter((a: any) => a.id !== id)
      );
      return { previousAssignments };
    },
    onError: (err, id, context: any) => {
      if (context?.previousAssignments) {
        queryClient.setQueryData(['admin-assignments-list'], context.previousAssignments);
      }
      toast.error('Failed to delete assignment.');
    },
    onSuccess: () => {
      refetchAssignments();
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
      toast.success('Assignment deleted.');
    }
  });

  const saveAssignmentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedModuleId) {
        throw new Error('Please select a module for this assignment.');
      }
      const payload: any = {
        title: assignTitle,
        description: assignDesc,
        module: Number(selectedModuleId),
        due_date: assignDueDate ? new Date(assignDueDate).toISOString() : null,
        file_attachment: assignFileUrl || null
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
      toast.success(editingAssignment ? 'Assignment updated.' : 'Assignment created.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || 'Failed to save assignment.');
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploadingField(field);

    try {
      const res = await api.post('core/upload-media/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAssignFileUrl(res.data.url);
      toast.success('File uploaded successfully.');
    } catch {
      toast.error('Upload failed. Please try again.');
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

  const handleDeleteStudentSubmissions = async (email: string, name: string) => {
    if (!window.confirm(`Delete all submissions from ${name}?`)) return;
    try {
      await api.delete(`assignments/submissions/delete_student/?email=${encodeURIComponent(email)}`);
      queryClient.invalidateQueries({ queryKey: ['staff-submissions-list'] });
      toast.success(`Deleted all submissions for ${name}`);
      if (selectedStudentEmail === email) {
        setSelectedStudentEmail(null);
      }
    } catch {
      toast.error('Failed to delete student submissions.');
    }
  };

  const handleOpenCreateAssign = () => {
    setEditingAssignment(null);
    setAssignTitle('');
    setAssignDesc('');
    setAssignDueDate('');
    setAssignFileUrl('');
    setSelectedCourseId('');
    setSelectedModuleId('');
    setShowAssignModal(true);
  };

  const handleOpenEditAssign = async (assign: Assignment) => {
    setEditingAssignment(assign);
    setAssignTitle(assign.title);
    setAssignDesc(assign.description);
    setAssignDueDate(assign.due_date ? assign.due_date.slice(0, 16) : '');
    setAssignFileUrl(assign.file_attachment || '');
    setSelectedModuleId(String(assign.module));

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
    category: string;
    submissions: Submission[];
  }>();

  submissions.forEach(sub => {
    const email = sub.student_email;
    if (!email) return;
    const name = sub.student_first_name || sub.student_last_name 
      ? `${sub.student_first_name || ''} ${sub.student_last_name || ''}`.trim()
      : sub.student_name || 'Student';
    const category = sub.student_category || 'General Domain';
    
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
    a.course_title?.toLowerCase().includes(subSearch.toLowerCase()) ||
    a.created_by_name?.toLowerCase().includes(subSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 text-xs animate-fade-in">
      {/* Header and Toggle Control */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Assignment Command Center</h1>
          <p className="text-muted-foreground text-sm mt-1">Review, grade deliverables, and monitor assignments across all student domains.</p>
          {activeSubTab === 'submissions' && (
            <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-[10px] font-extrabold uppercase tracking-wider">
              <Users size={11} />
              All Student Submissions — Global Multi-Domain View
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
          {activeSubTab === 'manage' && liveMode && (
            <button
              onClick={handleOpenCreateAssign}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-xl font-bold hover:brightness-110 transition-all"
            >
              <Plus size={14} />
              <span>Create Assignment</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/20 border border-border/50 p-4 rounded-2xl">
        <span className="font-bold text-muted-foreground block">
          {activeSubTab === 'submissions' ? (
            selectedStudentData 
              ? `Student: ${selectedStudentData.name} • Domain: ${selectedStudentData.category} (${filteredSubsForStudent.length} tasks)`
              : `Total Enrolled Students: ${studentsList.length} across all domains`
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
                ? (selectedStudentData ? "Search tasks..." : "Search student by name, email, or domain...")
                : "Search assignments, courses, or creator..."
            }
            className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-xl outline-none focus:border-primary/45"
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
                <span>Back to All Students</span>
              </button>
              <span className="text-xs font-bold px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full">
                Domain: {selectedStudentData.category}
              </span>
            </div>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground uppercase font-bold text-[10px] tracking-wider bg-muted/20">
                      <th className="py-3 px-4">Homework Task</th>
                      <th className="py-3 px-4">Assignment Creator</th>
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
                          {sub.assignment_created_by || 'Admin / Mentor'}
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
                        <span className="inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                          Domain: {stu.category}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
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
                No students found matching your search across all domains.
              </div>
            )}
          </div>
        )
      )}

      {/* Manage Tasks Tab View */}
      {activeSubTab === 'manage' && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase font-bold text-[10px] tracking-wider bg-muted/20">
                  <th className="py-3 px-4">Assignment Title</th>
                  <th className="py-3 px-4">Created By</th>
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
                    <td className="py-3.5 px-4 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {assign.created_by_name || 'Admin / Mentor'}
                    </td>
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
                    <td colSpan={6} className="py-12 text-center text-muted-foreground font-medium">No homework tasks matched search filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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

      {/* Assignment Create/Edit Modal */}
      <AnimatePresence>
        {showAssignModal && (
          <div onClick={() => setShowAssignModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-extrabold text-sm">{editingAssignment ? 'Edit Assignment' : 'Create Assignment Task'}</h3>
                <button onClick={() => setShowAssignModal(false)}><X size={16} /></button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Course Selection *</label>
                  <select 
                    value={selectedCourseId} 
                    onChange={(e) => { setSelectedCourseId(e.target.value); setSelectedModuleId(''); }} 
                    className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl font-medium"
                  >
                    <option value="">Select Target Course</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Target Module *</label>
                  <select 
                    value={selectedModuleId} 
                    onChange={(e) => setSelectedModuleId(e.target.value)} 
                    disabled={!selectedCourseId} 
                    className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl font-medium disabled:opacity-50"
                  >
                    <option value="">Select Course Module</option>
                    {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Task Title *</label>
                  <input 
                    type="text" 
                    value={assignTitle} 
                    onChange={(e) => setAssignTitle(e.target.value)} 
                    placeholder="e.g. Build Responsive Landing Page" 
                    className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl font-semibold" 
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Task Instructions & Criteria</label>
                  <textarea 
                    value={assignDesc} 
                    onChange={(e) => setAssignDesc(e.target.value)} 
                    rows={3} 
                    placeholder="Describe deliverables and expectations..." 
                    className="w-full p-3 bg-muted/40 border border-border rounded-xl outline-none" 
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Submission Deadline</label>
                  <input 
                    type="datetime-local" 
                    value={assignDueDate} 
                    onChange={(e) => setAssignDueDate(e.target.value)} 
                    className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl font-mono text-xs" 
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">PDF / Attachment Document</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={assignFileUrl} 
                      onChange={(e) => setAssignFileUrl(e.target.value)} 
                      placeholder="https://... or upload local file" 
                      className="flex-1 h-10 px-3 bg-muted/40 border border-border rounded-xl font-mono text-xs" 
                    />
                    <label className="h-10 px-3 bg-muted hover:bg-muted/80 rounded-xl border border-border flex items-center justify-center cursor-pointer gap-1 font-bold">
                      <Upload size={13} />
                      <input type="file" onChange={(e) => handleFileUpload(e, 'assignFile')} className="hidden" />
                      <span>{uploadingField === 'assignFile' ? 'Uploading...' : 'Browse'}</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => setShowAssignModal(false)} 
                    className="flex-1 py-2.5 bg-muted rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => saveAssignmentMutation.mutate()} 
                    disabled={saveAssignmentMutation.isPending} 
                    className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:brightness-110 flex items-center justify-center gap-1.5"
                  >
                    {saveAssignmentMutation.isPending && <Loader2 size={13} className="animate-spin" />}
                    <span>{editingAssignment ? 'Save Changes' : 'Create Assignment'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default AssignmentTab;
