import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { UserPlus, Trash2, Edit3, Key, ShieldCheck, ShieldAlert, X, Save, Search, Loader2, Download, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StaffMentor {
  id: number;
  name: string;
  email: string;
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
  const [newPassword, setNewPassword] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [certFileUrl, setCertFileUrl] = useState('');
  const [certCode, setCertCode] = useState('');
  const [uploadingCert, setUploadingCert] = useState(false);
  const [duration, setDuration] = useState('30');
  const [assignedStaffId, setAssignedStaffId] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ['courses-dropdown-list'],
    queryFn: async () => {
      const res = await api.get('courses/list/');
      return res.data;
    }
  });

  const { data: staffMentors = [] } = useQuery<StaffMentor[]>({
    queryKey: ['staff-mentors-list'],
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
  const { data: students = [], isLoading } = useQuery<Student[]>({
    queryKey: ['admin-students-roster'],
    queryFn: async () => {
      const res = await api.get('students/');
      return res.data;
    }
  });

  const createStudentMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('students/', {
        email,
        first_name: firstName,
        last_name: lastName,
        password,
        course_duration: Number(duration),
        assigned_staff: assignedStaffId ? Number(assignedStaffId) : null
      });
      const studentId = res.data.id;
      if (studentId && selectedCourseId && certFileUrl) {
        await api.post('certificates/', {
          student: studentId,
          course: Number(selectedCourseId),
          certificate_code: certCode || undefined,
          file_url: certFileUrl,
          is_issued: false
        });
      }
      return res.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['admin-students-roster'] });
      const previousStudents = queryClient.getQueryData<Student[]>(['admin-students-roster']);
      
      const newStudentOpt: Student = {
        id: -Date.now(),
        email,
        first_name: firstName,
        last_name: lastName,
        course_duration: duration,
        is_active: true,
        assigned_staff: assignedStaffId ? Number(assignedStaffId) : null,
        assigned_staff_name: staffMentors.find(m => m.id === Number(assignedStaffId))?.name || null
      };

      if (previousStudents) {
        queryClient.setQueryData<Student[]>(
          ['admin-students-roster'],
          [newStudentOpt, ...previousStudents]
        );
      }
      setShowAddModal(false);
      resetForm();
      return { previousStudents };
    },
    onError: (err: any, variables, context) => {
      if (context?.previousStudents) {
        queryClient.setQueryData(['admin-students-roster'], context.previousStudents);
      }
      toast.error(err.response?.data?.email?.[0] || 'Failed to register student.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-students-roster'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Student account enrolled.');
    }
  });

  const updateStudentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudent) return;
      const res = await api.put(`students/${selectedStudent.id}/`, {
        email,
        first_name: firstName,
        last_name: lastName,
        course_duration: Number(duration),
        is_active: selectedStudent.is_active,
        assigned_staff: assignedStaffId ? Number(assignedStaffId) : null
      });

      if (selectedCourseId && certFileUrl) {
        await api.post('certificates/', {
          student: selectedStudent.id,
          course: Number(selectedCourseId),
          certificate_code: certCode || undefined,
          file_url: certFileUrl,
          is_issued: false
        });
      } else if (!selectedCourseId) {
        const cRes = await api.get(`certificates/?student=${selectedStudent.id}`);
        const cert = cRes.data.find((c: any) => !c.is_issued);
        if (cert) {
          await api.delete(`certificates/${cert.id}/`);
        }
      }
      return res.data;
    },
    onMutate: async () => {
      if (!selectedStudent) return;
      await queryClient.cancelQueries({ queryKey: ['admin-students-roster'] });
      const previousStudents = queryClient.getQueryData<Student[]>(['admin-students-roster']);
      
      const updatedStudent: Student = {
        ...selectedStudent,
        email,
        first_name: firstName,
        last_name: lastName,
        course_duration: duration,
        assigned_staff: assignedStaffId ? Number(assignedStaffId) : null,
        assigned_staff_name: staffMentors.find(m => m.id === Number(assignedStaffId))?.name || null
      };

      if (previousStudents) {
        queryClient.setQueryData<Student[]>(
          ['admin-students-roster'],
          previousStudents.map(item => item.id === selectedStudent.id ? updatedStudent : item)
        );
      }
      setShowEditModal(false);
      resetForm();
      return { previousStudents };
    },
    onError: (err, variables, context) => {
      if (context?.previousStudents) {
        queryClient.setQueryData(['admin-students-roster'], context.previousStudents);
      }
      toast.error('Failed to update student profile.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-students-roster'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
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
      await queryClient.cancelQueries({ queryKey: ['admin-students-roster'] });
      const previousStudents = queryClient.getQueryData<Student[]>(['admin-students-roster']);
      if (previousStudents) {
        queryClient.setQueryData<Student[]>(
          ['admin-students-roster'],
          previousStudents.map(item => item.id === s.id ? { ...item, is_active: !item.is_active } : item)
        );
      }
      return { previousStudents };
    },
    onError: (err, s, context) => {
      if (context?.previousStudents) {
        queryClient.setQueryData(['admin-students-roster'], context.previousStudents);
      }
      toast.error('Failed to toggle status.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-students-roster'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Account state toggled.');
    }
  });

  const deleteStudentMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`students/${id}/`);
    },
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['admin-students-roster'] });
      const previousStudents = queryClient.getQueryData<Student[]>(['admin-students-roster']);
      if (previousStudents) {
        queryClient.setQueryData<Student[]>(
          ['admin-students-roster'],
          previousStudents.filter(s => s.id !== id)
        );
      }
      return { previousStudents };
    },
    onError: (err, id, context) => {
      if (context?.previousStudents) {
        queryClient.setQueryData(['admin-students-roster'], context.previousStudents);
      }
      toast.error('Failed to delete student.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-students-roster'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Student record wiped.');
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
    setAssignedStaffId(s.assigned_staff ? String(s.assigned_staff) : '');

    try {
      const res = await api.get(`certificates/?student=${s.id}`);
      const cert = res.data.find((c: any) => !c.is_issued);
      if (cert) {
        setSelectedCourseId(String(cert.course));
        setCertCode(cert.certificate_code);
        setCertFileUrl(cert.file_url);
      } else {
        setSelectedCourseId('');
        setCertCode('');
        setCertFileUrl('');
      }
    } catch {
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
    setDuration('30');
    setAssignedStaffId('');
    setSelectedStudent(null);
    setSelectedCourseId('');
    setCertFileUrl('');
    setCertCode('');
  };

  const filtered = students.filter(s =>
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.first_name.toLowerCase().includes(search.toLowerCase()) ||
    s.last_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Student Accounts Directory</h1>
          <p className="text-muted-foreground text-sm mt-1">Super Admin CRUD matrix to register students and adjust subscription durations.</p>
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
        <div className="relative w-full sm:max-w-md">
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

      {/* Table grid */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground">
            <Loader2 className="animate-spin text-primary mx-auto mb-2" size={20} />
            <span>Loading Students...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase font-bold text-[10px] tracking-wider bg-muted/20">
                  <th className="py-3 px-4">Student email</th>
                  <th className="py-3 px-4">First Name</th>
                  <th className="py-3 px-4">Last Name</th>
                  <th className="py-3 px-4">Duration limits</th>
                  <th className="py-3 px-4">Assigned Mentor</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-foreground">{s.email}</td>
                    <td className="py-3.5 px-4 font-medium text-muted-foreground">{s.first_name}</td>
                    <td className="py-3.5 px-4 font-medium text-muted-foreground">{s.last_name}</td>
                    <td className="py-3.5 px-4 font-mono font-bold">{s.course_duration} Days</td>
                    <td className="py-3.5 px-4">
                      {s.assigned_staff_name ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full border bg-sky-500/10 text-sky-500 border-sky-500/20">
                          <UserCheck size={9} />
                          {s.assigned_staff_name}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">Unassigned</span>
                      )}
                    </td>
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
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => openPass(s)} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground" title="Password"><Key size={13} /></button>
                        <button onClick={() => openEdit(s)} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground" title="Edit"><Edit3 size={13} /></button>
                        <button onClick={() => { if (window.confirm('Delete student profile?')) deleteStudentMutation.mutate(s.id); }} className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive" title="Delete"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground font-medium">No student matching metrics.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div onClick={() => setShowAddModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-bold text-sm">Add Student Profile</h3>
                <button onClick={() => setShowAddModal(false)}><X size={16} /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); createStudentMutation.mutate(); }} className="space-y-4">
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
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Assigned Mentor (Staff)</label>
                  <select value={assignedStaffId} onChange={(e) => setAssignedStaffId(e.target.value)} className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none font-bold">
                    <option value="">No mentor assigned</option>
                    {staffMentors.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Default Password *</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                </div>
                {/* Pre-upload certificate section */}
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
              className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-bold text-sm">Modify Student Coordinates</h3>
                <button onClick={() => setShowEditModal(false)}><X size={16} /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); updateStudentMutation.mutate(); }} className="space-y-4">
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
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Assigned Mentor (Staff)</label>
                  <select value={assignedStaffId} onChange={(e) => setAssignedStaffId(e.target.value)} className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none font-bold">
                    <option value="">No mentor assigned</option>
                    {staffMentors.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
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
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
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
