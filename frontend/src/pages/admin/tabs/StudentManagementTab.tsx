import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { UserPlus, Trash2, Edit3, Key, ShieldCheck, ShieldAlert, X, Save, Search, Loader2, Download, UserCheck, ExternalLink, Award, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { downloadFileDirectly } from '../../../utils/downloadHelper';
import { motion, AnimatePresence } from 'framer-motion';

interface StaffMentor {
  id: number;
  name: string;
  email: string;
}

interface Category {
  id: number;
  name: string;
}

interface Student {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  course_duration: string;
  is_active: boolean;
  assigned_staff: number | null;
  assigned_staff_name: string | null;
  assigned_live_staff: number | null;
  assigned_live_staff_name: string | null;
  student_type: string;
  courses: number[];
  courses_names: string[];
  has_certificate?: boolean;
}

export const StudentManagementTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [certFileUrl, setCertFileUrl] = useState('');
  const [certCode, setCertCode] = useState('');
  const [uploadingCert, setUploadingCert] = useState(false);
  const [duration, setDuration] = useState('365');
  const [assignedStaffId, setAssignedStaffId] = useState<string>('');
  const [assignedLiveStaffId, setAssignedLiveStaffId] = useState<string>('');
  const [studentType, setStudentType] = useState<string>('COURSE');
  const [selectedCourses, setSelectedCourses] = useState<number[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [studentCertificates, setStudentCertificates] = useState<any[]>([]);

  const [liveMode, setLiveMode] = React.useState(localStorage.getItem('super_adminLiveMode') === 'true');

  React.useEffect(() => {
    const handleStorage = () => {
      setLiveMode(localStorage.getItem('super_adminLiveMode') === 'true');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ['courses-dropdown-list', liveMode],
    queryFn: async () => {
      const res = await api.get(`courses/list/?is_mentoring_track=${liveMode}`);
      return res.data;
    },
    refetchOnMount: 'always'
  });

  const { data: staffMentors = [] } = useQuery<StaffMentor[]>({
    queryKey: ['staff-mentors-list'],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const res = await api.get('users/mentors/');
      return res.data;
    }
  });


  // Auto-select first course for certificate linking
  React.useEffect(() => {
    if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(String(courses[0].id));
    }
  }, [courses]);

  const handleCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setUploadingCert(true);
    try {
      const res = await api.post('core/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setCertFileUrl(res.data.url);
      toast.success('Certificate file uploaded successfully.');
    } catch {
      toast.error('Failed to upload certificate.');
    } finally {
      setUploadingCert(false);
    }
  };

  // Queries
  const { data: students = [], isLoading: loadingStudents } = useQuery<Student[]>({
    queryKey: ['students-list', liveMode],
    placeholderData: (prev) => prev,
    staleTime: 600000,
    queryFn: async () => {
      const res = await api.get(`students/?live_mode=${liveMode}`);
      return res.data;
    }
  });

  const createStudentMutation = useMutation({
    mutationFn: async (payload: { 
      email: string; 
      firstName: string; 
      lastName: string; 
      password?: string; 
      studentType: string; 
      duration: string; 
      assignedStaffId: string; 
      assignedLiveStaffId: string; 
      courses: number[];
      certFileUrl?: string;
      certCode?: string;
      selectedCourseId?: string;
    }) => {
      console.log("Create Student Mutation Payload:", payload);
      const cleanEmail = payload.email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@') || cleanEmail.endsWith('@')) {
        throw new Error("Please enter a valid email address.");
      }
      if (!payload.firstName || !payload.firstName.trim()) {
        throw new Error("Please enter first name.");
      }
      if (!payload.lastName || !payload.lastName.trim()) {
        throw new Error("Please enter last name.");
      }
      const activeStudentType = liveMode ? 'LIVE_CLASS' : (payload.studentType || 'COURSE');
      const res = await api.post(`students/?live_mode=${liveMode}`, {
        email: cleanEmail,
        first_name: payload.firstName.trim(),
        last_name: payload.lastName.trim(),
        password: payload.password && payload.password.trim() ? payload.password.trim() : undefined,
        course_duration: payload.duration,
        student_type: activeStudentType,
        live_mode: liveMode,
        assigned_staff: payload.assignedStaffId ? Number(payload.assignedStaffId) : null,
        assigned_live_staff: payload.assignedLiveStaffId ? Number(payload.assignedLiveStaffId) : null,
        courses: payload.courses
      });
      const studentId = res.data.id;
      if (studentId && payload.certFileUrl) {
        try {
          await api.post('certificates/', {
            student: studentId,
            course: payload.selectedCourseId ? Number(payload.selectedCourseId) : (payload.courses?.[0] || courses[0]?.id || null),
            certificate_code: payload.certCode || undefined,
            file_url: payload.certFileUrl,
            is_issued: false
          });
        } catch (certErr) {
          console.error("Non-blocking certificate pre-upload error:", certErr);
        }
      }
      return res.data;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['students-list', liveMode] });
      const previousStudents = queryClient.getQueryData<Student[]>(['students-list', liveMode]);
      
      const newStudentOpt: Student = {
        id: -Date.now(),
        email: payload.email.trim(),
        first_name: payload.firstName.trim(),
        last_name: payload.lastName.trim(),
        course_duration: payload.duration,
        is_active: true,
        student_type: payload.studentType || (liveMode ? 'LIVE_CLASS' : 'COURSE'),
        assigned_staff: payload.assignedStaffId ? Number(payload.assignedStaffId) : null,
        assigned_staff_name: staffMentors.find(m => m.id === Number(payload.assignedStaffId))?.name || null,
        assigned_live_staff: payload.assignedLiveStaffId ? Number(payload.assignedLiveStaffId) : null,
        assigned_live_staff_name: staffMentors.find(m => m.id === Number(payload.assignedLiveStaffId))?.name || null,
        courses: payload.courses,
        courses_names: courses.filter(c => payload.courses.includes(c.id)).map(c => c.title),
        has_certificate: !!payload.certFileUrl
      };

      if (previousStudents) {
        queryClient.setQueryData<Student[]>(
          ['students-list', liveMode],
          [newStudentOpt, ...previousStudents]
        );
      }
      setShowAddModal(false);
      resetForm();
      return { previousStudents };
    },
    onError: (err: any, variables, context) => {
      if (context?.previousStudents) {
        queryClient.setQueryData(['students-list', liveMode], context.previousStudents);
      }
      setShowAddModal(true); // Re-open modal on error so user can fix and retry
      const msg = err.message || err.response?.data?.email?.[0] || err.response?.data?.password?.[0] || err.response?.data?.detail || 'Failed to register student.';
      toast.error(msg);
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData<Student[]>(['students-list', liveMode], (old) =>
          old ? [data, ...old.filter(s => s.id > 0)] : [data]
        );
      }
      queryClient.invalidateQueries({ queryKey: ['students-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
      toast.success('Student account enrolled.');
    }
  });

  const updateStudentMutation = useMutation({
    mutationFn: async (payload: { 
      id: number;
      email: string; 
      firstName: string; 
      lastName: string; 
      duration: string; 
      studentType: string; 
      assignedStaffId: string; 
      assignedLiveStaffId: string; 
      courses: number[];
      certFileUrl?: string;
      certCode?: string;
      selectedCourseId?: string;
    }) => {
      const updatePayload: Record<string, any> = {
        email: payload.email,
        first_name: payload.firstName,
        last_name: payload.lastName,
        course_duration: payload.duration,
        student_type: payload.studentType,
        assigned_staff: payload.assignedStaffId ? Number(payload.assignedStaffId) : null,
        assigned_live_staff: payload.assignedLiveStaffId ? Number(payload.assignedLiveStaffId) : null,
        courses: payload.courses
      };
      const res = await api.put(`students/${payload.id}/?live_mode=${liveMode}`, updatePayload);

      if (payload.certFileUrl) {
        try {
          const courseIdToUse = payload.selectedCourseId ? Number(payload.selectedCourseId) : (payload.courses?.[0] || courses[0]?.id || null);
          if (courseIdToUse) {
            await api.post('certificates/', {
              student: payload.id,
              course: courseIdToUse,
              certificate_code: payload.certCode || undefined,
              file_url: payload.certFileUrl,
              is_issued: false
            });
          }
        } catch (certErr) {
          console.error("Non-blocking certificate edit error:", certErr);
        }
      }
      return res.data;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['students-list', liveMode] });
      const previousStudents = queryClient.getQueryData<Student[]>(['students-list', liveMode]);
      const currentItem = previousStudents?.find(s => s.id === payload.id);
      
      const updatedStudent: Student = {
        id: payload.id,
        email: payload.email,
        first_name: payload.firstName,
        last_name: payload.lastName,
        course_duration: payload.duration,
        is_active: currentItem?.is_active ?? true,
        student_type: payload.studentType,
        assigned_staff: payload.assignedStaffId ? Number(payload.assignedStaffId) : null,
        assigned_staff_name: staffMentors.find(m => m.id === Number(payload.assignedStaffId))?.name || null,
        assigned_live_staff: payload.assignedLiveStaffId ? Number(payload.assignedLiveStaffId) : null,
        assigned_live_staff_name: payload.assignedLiveStaffId ? (staffMentors.find(m => m.id === Number(payload.assignedLiveStaffId))?.name || null) : null,
        courses: payload.courses,
        courses_names: courses.filter(c => payload.courses.includes(c.id)).map(c => c.title),
        has_certificate: !!payload.certFileUrl
      };

      if (previousStudents) {
        queryClient.setQueryData<Student[]>(
          ['students-list', liveMode],
          previousStudents.map(item => item.id === payload.id ? updatedStudent : item)
        );
      }
      setShowEditModal(false);
      resetForm();
      return { previousStudents };
    },
    onError: (err, variables, context) => {
      if (context?.previousStudents) {
        queryClient.setQueryData(['students-list', liveMode], context.previousStudents);
      }
      toast.error('Failed to update student profile.');
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData<Student[]>(['students-list', liveMode], (old) =>
          old ? old.map(item => item.id === data.id ? data : item) : [data]
        );
      }
      queryClient.invalidateQueries({ queryKey: ['students-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
      toast.success('Student coordinates modified.');
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudent) return;
      await api.post(`students/${selectedStudent.id}/reset-password/`, {
        password: newPassword
      });
    },
    onSuccess: () => {
      setShowPassModal(false);
      resetForm();
      toast.success('Password update applied.');
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (s: Student) => {
      await api.post(`students/${s.id}/toggle-active/`);
    },
    onMutate: async (s: Student) => {
      await queryClient.cancelQueries({ queryKey: ['students-list', liveMode] });
      const previousStudents = queryClient.getQueryData<Student[]>(['students-list', liveMode]);
      if (previousStudents) {
        queryClient.setQueryData<Student[]>(
          ['students-list', liveMode],
          previousStudents.map(item => item.id === s.id ? { ...item, is_active: !item.is_active } : item)
        );
      }
      return { previousStudents };
    },
    onError: (err, s, context) => {
      if (context?.previousStudents) {
        queryClient.setQueryData(['students-list', liveMode], context.previousStudents);
      }
      toast.error('Failed to toggle status.');
    },
    onSuccess: (data, s) => {
      queryClient.setQueryData<Student[]>(['students-list', liveMode], (old) =>
        old ? old.map(item => item.id === s.id ? { ...item, is_active: !s.is_active } : item) : old
      );
      queryClient.invalidateQueries({ queryKey: ['students-list'] });
      toast.success('Account state toggled.');
    }
  });

  const deleteStudentMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`students/${id}/`);
    },
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['students-list', liveMode] });
      const previousStudents = queryClient.getQueryData<Student[]>(['students-list', liveMode]);
      if (previousStudents) {
        queryClient.setQueryData<Student[]>(
          ['students-list', liveMode],
          previousStudents.filter(s => s.id !== id)
        );
      }
      return { previousStudents };
    },
    onError: (err: any, id, context) => {
      if (context?.previousStudents) {
        queryClient.setQueryData(['students-list', liveMode], context.previousStudents);
      }
      if (err?.response?.status === 404) {
        toast.error('Student not found or has already been deleted.');
        queryClient.invalidateQueries({ queryKey: ['students-list'] });
      } else {
        toast.error('Failed to delete student.');
      }
    },
    onSuccess: (data, id) => {
      queryClient.setQueryData<Student[]>(['students-list', liveMode], (old) =>
        old ? old.filter(s => s.id !== id) : []
      );
      queryClient.invalidateQueries({ queryKey: ['students-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
      toast.success('Student account removed.');
    }
  });

  const handleExportCSV = async () => {
    try {
      const res = await api.get('students/bulk-export/', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'students_ledger.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Roster export compiled.');
    } catch {
      toast.error('Failed to export student roster.');
    }
  };

  const openEdit = async (s: Student) => {
    setSelectedStudent(s);
    setEmail(s.email);
    setFirstName(s.first_name);
    setLastName(s.last_name);
    setDuration(s.course_duration);
    setStudentType(s.student_type);
    setAssignedStaffId(s.assigned_staff ? String(s.assigned_staff) : '');
    setAssignedLiveStaffId(s.assigned_live_staff ? String(s.assigned_live_staff) : '');
    setSelectedCourses(s.courses || []);
    setSelectedStudent(s);

    try {
      const res = await api.get(`certificates/?student=${s.id}`);
      const certs = res.data || [];
      setStudentCertificates(certs); // Store all certificates
      
      if (certs.length > 0) {
        // Show the first certificate by default, but user can see all of them
        const cert = certs.find((c: any) => !c.is_issued) || certs[0];
        setSelectedCourseId(String(cert.course));
        setCertCode(cert.certificate_code || '');
        setCertFileUrl(cert.file_url || '');
      } else {
        setSelectedCourseId('');
        setCertCode('');
        setCertFileUrl('');
      }
    } catch (err) {
      console.error('Error loading certificates for student:', err);
      setStudentCertificates([]);
      setSelectedCourseId('');
      setCertCode('');
      setCertFileUrl('');
    }

    setShowEditModal(true);
  };

  const openPass = (s: Student) => {
    setSelectedStudent(s);
    setShowPassModal(true);
  };

  const resetForm = () => {
    setEmail('');
    setFirstName('');
    setLastName('');
    setPassword('');
    setNewPassword('');
    setDuration('365');
    setStudentType(liveMode ? 'LIVE_CLASS' : 'COURSE');
    setAssignedStaffId('');
    setAssignedLiveStaffId('');
    setSelectedCourses([]);
    setSelectedStudent(null);
    setSelectedCourseId('');
    setCertFileUrl('');
    setCertCode('');
  };

  const displayStudents = students.filter(s => {
    // 1. Filter by liveMode toggle context
    if (liveMode) {
      if (s.student_type !== 'LIVE_CLASS' && s.student_type !== 'BOTH') return false;
    } else {
      if (s.student_type !== 'COURSE' && s.student_type !== 'BOTH') return false;
    }

    const matchesSearch = 
      s.first_name.toLowerCase().includes(search.toLowerCase()) ||
      s.last_name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
      
    return matchesSearch;
  });

  return (
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {liveMode ? 'Live Class Student Roster' : 'Course Mode Student Directory'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {liveMode 
              ? 'Manage Live Mentoring students, assigned mentors, and active live tracks.'
              : 'Manage self-paced course students, enrolled courses, and certificate releases.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-3 py-2 bg-muted hover:bg-muted/80 rounded-xl font-bold border border-border">
            <Download size={13} />
            <span>Export CSV</span>
          </button>
          <button onClick={() => { resetForm(); setShowAddModal(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl shadow shadow-primary/10">
            <UserPlus size={14} />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Control filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/20 border border-border/50 p-4 rounded-2xl">
        <div className="relative w-full sm:max-w-md flex items-center gap-2">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-3 text-muted-foreground" size={14} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students directory..."
              className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-xl outline-none focus:border-primary/45"
            />
          </div>
        </div>
      </div>

      {/* Table grid */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase font-bold text-[10px] tracking-wider bg-muted/20">
                  <th className="py-3 px-4">Student Profile</th>
                  {!liveMode && <th className="py-3 px-4">Courses</th>}
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Duration</th>
                  {liveMode && <th className="py-3 px-4">Live Mentor</th>}
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayStudents.map(s => (
                  <tr key={s.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-foreground">{s.first_name} {s.last_name}</div>
                      <div className="text-[10px] text-muted-foreground">{s.email}</div>
                    </td>
                    {!liveMode && (
                      <td className="py-3.5 px-4 max-w-[150px] truncate">
                        {s.courses_names && s.courses_names.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {s.courses_names.map((cName: string, idx: number) => (
                              <span key={idx} className="inline-flex items-center text-[9px] font-bold uppercase px-2 py-0.5 rounded border bg-indigo-500/10 text-indigo-500 border-indigo-500/20">
                                {cName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">None</span>
                        )}
                      </td>
                    )}
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">
                        {s.student_type === 'COURSE' ? 'Course' : s.student_type === 'LIVE_CLASS' ? 'Live Class' : 'Both'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold">{s.course_duration} Days</td>
                    {liveMode && (
                      <td className="py-3.5 px-4">
                        {s.assigned_live_staff_name ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
                            <UserCheck size={11} />
                            {s.assigned_live_staff_name}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">Unassigned</span>
                        )}
                      </td>
                    )}

                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => toggleStatusMutation.mutate(s)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold border text-[9px] uppercase ${s.is_active ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}
                      >
                        {s.is_active ? <ShieldCheck size={10} /> : <ShieldAlert size={10} />}
                        <span>{s.is_active ? 'Active' : 'Locked'}</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {deleteConfirmId === s.id ? (
                        <div className="inline-flex items-center gap-2">
                          <span className="text-[10px] text-destructive font-bold">Delete?</span>
                          <button
                            onClick={() => { deleteStudentMutation.mutate(s.id); setDeleteConfirmId(null); }}
                            disabled={deleteStudentMutation.isPending}
                            className="px-2.5 py-1 rounded-lg bg-destructive text-white text-[10px] font-bold hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deleteStudentMutation.isPending ? 'Deleting...' : 'Yes'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2.5 py-1 rounded-lg bg-muted text-foreground text-[10px] font-bold hover:bg-muted/80 transition-colors"
                          >No</button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => openPass(s)} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground" title="Password"><Key size={13} /></button>
                          <button onClick={() => openEdit(s)} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground" title="Edit"><Edit3 size={13} /></button>
                          <button onClick={() => setDeleteConfirmId(s.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive" title="Delete"><Trash2 size={13} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {displayStudents.length === 0 && (
                  <tr>
                    <td colSpan={liveMode ? 6 : 7} className="py-12 text-center text-muted-foreground font-medium">No student matching metrics.</td>
                  </tr>
                )}

              </tbody>
            </table>
          </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div onClick={() => setShowAddModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-bold text-sm">Add Student Profile</h3>
                <button onClick={() => setShowAddModal(false)}><X size={16} /></button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (createStudentMutation.isPending) return; // Prevent double-submit
                createStudentMutation.mutate({
                  email: email.trim(),
                  firstName: firstName.trim(),
                  lastName: lastName.trim(),
                  password: password.trim(),
                  studentType,
                  duration,
                  assignedStaffId,
                  assignedLiveStaffId,
                  courses: selectedCourses,
                  certFileUrl,
                  certCode,
                  selectedCourseId
                });
              }} autoComplete="off" className="space-y-4">
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Email Address *</label>
                  <input name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" placeholder="student@example.com" className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">First Name *</label>
                    <input name="first_name" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required autoComplete="off" className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Last Name *</label>
                    <input name="last_name" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required autoComplete="off" className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Duration limit (Days)</label>
                  <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} required className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                </div>

                {/* Assign Live Mentor - only in Live Mode */}
                {liveMode && (
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold flex items-center gap-1">
                      <UserCheck size={11} className="text-primary" />
                      <span>Assign Live Mentor</span>
                    </label>
                    <select
                      value={assignedLiveStaffId}
                      onChange={(e) => setAssignedLiveStaffId(e.target.value)}
                      className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none text-xs"
                    >
                      <option value="">— No mentor assigned —</option>
                      {staffMentors.map(m => (
                        <option key={m.id} value={String(m.id)}>{m.name} ({m.email})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Courses Selection - Course Mode only */}
                {!liveMode && (
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase mb-2 font-bold">Assign Courses</label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-muted/20 border border-border rounded-xl">
                      {courses.map(cat => (
                        <label key={cat.id} className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                          <input 
                            type="checkbox" 
                            checked={selectedCourses.includes(cat.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCourses(prev => [...prev, cat.id]);
                              } else {
                                setSelectedCourses(prev => prev.filter(id => id !== cat.id));
                              }
                            }}
                            className="rounded text-primary focus:ring-primary h-3 w-3"
                          />
                          {cat.title}
                        </label>
                      ))}
                      {courses.length === 0 && <span className="text-muted-foreground text-[10px]">No courses found</span>}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Default Password *</label>
                  <div className="relative">
                    <input 
                      name="password" 
                      type={showPassword ? "text" : "password"} 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      autoComplete="new-password" 
                      placeholder="Defaults to: apex123" 
                      className="w-full h-10 pl-3 pr-10 bg-muted/40 border border-border rounded-xl outline-none" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                {/* Pre-upload certificate section */}
                {!liveMode && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
                    <h5 className="font-bold text-[10px] uppercase text-primary">Pre-upload Certificate for 100% Release</h5>
                    <div>
                      <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Custom Certificate Code (Optional)</label>
                      <input type="text" value={certCode} onChange={(e) => setCertCode(e.target.value)} placeholder="e.g. APEX-CERT-123" className="w-full h-10 px-3 bg-card border border-border rounded-xl outline-none text-[11px]" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Upload Certificate File</label>
                      {certFileUrl ? (
                        <div className="flex items-center gap-2 h-10 px-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 rounded-xl text-[11px]">
                          <span className="truncate flex-1">{certFileUrl.split('/').pop()}</span>
                          <button type="button" onClick={() => setCertFileUrl('')} className="text-destructive font-bold">&times;</button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center gap-1.5 h-10 px-3 bg-card border border-dashed border-border rounded-xl cursor-pointer text-[11px] font-semibold text-muted-foreground hover:border-primary/45 transition-colors">
                          {uploadingCert ? <Loader2 size={12} className="animate-spin text-primary" /> : <span>+ Upload PDF / Image</span>}
                          <input type="file" onChange={handleCertUpload} className="hidden" />
                        </label>
                      )}
                    </div>
                  </div>
                )}
                <button type="submit" disabled={createStudentMutation.isPending} className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-primary/10">
                  <Save size={12} />
                  <span>Enroll Student</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div onClick={() => setShowEditModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-bold text-sm">Modify Student Coordinates</h3>
                <button onClick={() => setShowEditModal(false)}><X size={16} /></button>
              </div>
              <form onSubmit={(e) => { 
                e.preventDefault(); 
                if (!selectedStudent) return;
                updateStudentMutation.mutate({
                  id: selectedStudent.id,
                  email,
                  firstName,
                  lastName,
                  duration,
                  studentType,
                  assignedStaffId,
                  assignedLiveStaffId,
                  courses: selectedCourses,
                  certFileUrl,
                  certCode,
                  selectedCourseId
                }); 
              }} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Email Address *</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">First Name *</label>
                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Last Name *</label>
                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Duration limit (Days)</label>
                  <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} required className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                </div>

                {/* Assign Live Mentor - only in Live Mode */}
                {liveMode && (
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold flex items-center gap-1">
                      <UserCheck size={11} className="text-primary" />
                      <span>Assign Live Mentor</span>
                    </label>
                    <select
                      value={assignedLiveStaffId}
                      onChange={(e) => setAssignedLiveStaffId(e.target.value)}
                      className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none text-xs"
                    >
                      <option value="">— No mentor assigned —</option>
                      {staffMentors.map(m => (
                        <option key={m.id} value={String(m.id)}>{m.name} ({m.email})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Courses Selection - Course Mode only */}
                {!liveMode && (
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase mb-2 font-bold">Assign Courses</label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-muted/20 border border-border rounded-xl">
                      {courses.map(cat => (
                        <label key={cat.id} className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                          <input 
                            type="checkbox" 
                            checked={selectedCourses.includes(cat.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCourses(prev => [...prev, cat.id]);
                              } else {
                                setSelectedCourses(prev => prev.filter(id => id !== cat.id));
                              }
                            }}
                            className="rounded text-primary focus:ring-primary h-3 w-3"
                          />
                          {cat.title}
                        </label>
                      ))}
                      {courses.length === 0 && <span className="text-muted-foreground text-[10px]">No courses found</span>}
                    </div>
                  </div>
                )}
                {!liveMode && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
                    <h5 className="font-bold text-[10px] uppercase text-primary">Pre-upload Certificate for 100% Release</h5>
                    <div>
                      <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Custom Certificate Code (Optional)</label>
                      <input type="text" value={certCode} onChange={(e) => setCertCode(e.target.value)} placeholder="e.g. APEX-CERT-123" className="w-full h-10 px-3 bg-card border border-border rounded-xl outline-none text-[11px]" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Upload Certificate File</label>
                      {certFileUrl ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 h-10 px-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 rounded-xl text-[11px] font-semibold">
                            <CheckCircle size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <span className="truncate flex-1 font-mono">{certFileUrl.split('/').pop()}</span>
                            <button type="button" onClick={() => downloadFileDirectly(certFileUrl, `Certificate_File.pdf`)} className="p-1.5 hover:bg-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer" title="Download Uploaded File">
                              <Download size={13} />
                            </button>
                            <button type="button" onClick={() => setCertFileUrl('')} className="p-1 hover:bg-destructive/20 rounded text-destructive font-bold" title="Remove Certificate">&times;</button>
                          </div>
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold block">✓ Certificate attached & ready for student</span>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center gap-1.5 h-10 px-3 bg-card border border-dashed border-border rounded-xl cursor-pointer text-[11px] font-semibold text-muted-foreground hover:border-primary/45 transition-colors">
                          {uploadingCert ? <Loader2 size={12} className="animate-spin text-primary" /> : <span>+ Upload PDF / Image</span>}
                          <input type="file" onChange={handleCertUpload} className="hidden" />
                        </label>
                      )}
                    </div>
                  </div>
                )}
                <button type="submit" disabled={updateStudentMutation.isPending} className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-primary/10">
                  <Save size={12} />
                  <span>Save Coordinates</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Password Modal */}
      <AnimatePresence>
        {showPassModal && (
          <div onClick={() => setShowPassModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-bold text-sm">Reset Lock Password</h3>
                <button onClick={() => setShowPassModal(false)}><X size={16} /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); resetPasswordMutation.mutate(); }} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">New Security Password *</label>
                  <div className="relative">
                    <input 
                      type={showNewPassword ? "text" : "password"} 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                      required 
                      autoComplete="new-password" 
                      className="w-full h-10 pl-3 pr-10 bg-muted/40 border border-border rounded-xl outline-none" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      title={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={resetPasswordMutation.isPending} className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-primary/10">
                  <Key size={12} />
                  <span>Update Password</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default StudentManagementTab;
