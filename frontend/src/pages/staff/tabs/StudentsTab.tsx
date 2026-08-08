import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { 
  Edit3, Key, ShieldCheck, 
  ShieldAlert, X, Upload, Download, 
  Search, Eye, EyeOff, Loader2, ExternalLink, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Student {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  date_joined: string;
  phone: string;
  profile_photo: string;
  course_duration: string;
  start_date: string;
  end_date: string;
  notes: string;
  courses: number[];
  assigned_staff?: number | null;
  assigned_staff_name?: string | null;
}


export const StudentsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const liveMode = true;

  // Modals States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [courseDuration, setCourseDuration] = useState('90');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [certFileUrl, setCertFileUrl] = useState('');
  const [certCode, setCertCode] = useState('');
  const [uploadingCert, setUploadingCert] = useState(false);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showEnrollPassword, setShowEnrollPassword] = useState(false);

  // Bulk Import
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  // Detailed profile sub-view state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileTab, setProfileTab] = useState<'overview' | 'logins' | 'attendance' | 'progress'>('overview');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileDetails, setProfileDetails] = useState<any>(null);

  // 1. Fetch Students
  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['students-list', liveMode],
    placeholderData: (prev) => prev,
    staleTime: 0,
    queryFn: async () => {
      const res = await api.get(`students/?live_mode=${liveMode}`);
      return res.data;
    }
  });


  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ['courses-dropdown-list'],
    placeholderData: (prev) => prev,
    staleTime: 60000,
    queryFn: async () => {
      const res = await api.get('courses/list/');
      return res.data;
    }
  });

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

  // Mutations
  const createStudentMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        email,
        first_name: firstName,
        last_name: lastName,
        password: password || undefined,
        phone,
        profile_photo: profilePhoto,
        course_duration: courseDuration,
        start_date: startDate || undefined,
        end_date: courseDuration === 'CUSTOM' ? endDate : undefined,
        notes,
        courses: selectedCourseIds,
        student_type: liveMode ? 'LIVE_CLASS' : 'COURSE'
      };
      const res = await api.post(`students/?live_mode=${liveMode}`, payload);
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
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData<Student[]>(['students-list', liveMode], (old) =>
          old ? [data, ...old] : [data]
        );
      }
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
      setShowAddModal(false);
      resetForm();
      toast.success('Student enrolled successfully.');
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.email?.[0] || 'Enrollment failed.';
      toast.error(errMsg);
    }
  });

  const updateStudentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudent) return;
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const payload = {
        email,
        first_name: firstName,
        last_name: lastName,
        is_active: selectedStudent.is_active,
        phone,
        profile_photo: profilePhoto,
        course_duration: courseDuration,
        start_date: startDate || undefined,
        end_date: courseDuration === 'CUSTOM' ? (endDate || undefined) : undefined,
        notes,
        courses: selectedCourseIds,
        assigned_staff: selectedStudent.assigned_staff ?? undefined,
        assigned_live_staff: selectedStudent.assigned_live_staff ?? (liveMode ? user?.id : undefined),
        student_type: selectedStudent.student_type || (liveMode ? 'LIVE_CLASS' : 'COURSE')
      };
      const res = await api.put(`students/${selectedStudent.id}/?live_mode=${liveMode}`, payload);

      if (certFileUrl) {
        const courseIdToUse = selectedCourseId ? Number(selectedCourseId) : (selectedCourseIds[0] || selectedStudent.courses?.[0] || null);
        if (courseIdToUse) {
          await api.post('certificates/', {
            student: selectedStudent.id,
            course: courseIdToUse,
            certificate_code: certCode || undefined,
            file_url: certFileUrl,
            is_issued: false
          });
        }
      } else {
        try {
          const cRes = await api.get(`certificates/?student=${selectedStudent.id}`);
          const unissuedCert = cRes.data.find((c: any) => !c.is_issued);
          if (unissuedCert) {
            await api.delete(`certificates/${unissuedCert.id}/`);
          }
        } catch {
          // Ignore
        }
      }
      return res.data;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData<Student[]>(['students-list', liveMode], (old) =>
          old ? old.map(s => s.id === selectedStudent?.id ? data : s) : [data]
        );
      }
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
      setShowEditModal(false);
      resetForm();
      toast.success('Student details updated.');
    },
    onError: (err: any) => {
      const data = err.response?.data;
      const errMsg = data?.detail || 
                     (typeof data === 'object' ? Object.values(data).flat().join(', ') : null) || 
                     'Failed to update student profile.';
      toast.error(errMsg);
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudent) return;
      await api.post(`students/${selectedStudent.id}/reset-password/`, { password: newPassword });
    },
    onSuccess: () => {
      setShowPassModal(false);
      resetForm();
      toast.success('Password updated successfully.');
    },
    onError: () => {
      toast.error('Failed to reset password.');
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (student: Student) => {
      await api.post(`students/${student.id}/toggle-status/`);
    },
    onMutate: async (student) => {
      await queryClient.cancelQueries({ queryKey: ['students-list', liveMode] });
      queryClient.setQueryData<Student[]>(['students-list', liveMode], (old) =>
        old ? old.map(s => s.id === student.id ? { ...s, is_active: !s.is_active } : s) : []
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
      toast.success('Access privilege toggled.');
    },
    onError: () => {
      toast.error('Failed to toggle status.');
    }
  });
  const resetForm = () => {
    setEmail('');
    setFirstName('');
    setLastName('');
    setPhone('');
    setProfilePhoto('');
    setCourseDuration('90');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setNotes('');
    setSelectedCourseIds([]);
    setPassword('');
    setNewPassword('');
    setSelectedStudent(null);
    setSelectedCourseId('');
    setCertFileUrl('');
    setCertCode('');
  };

  const openEdit = async (student: Student) => {
    setSelectedStudent(student);
    setEmail(student.email);
    setFirstName(student.first_name);
    setLastName(student.last_name);
    setPhone(student.phone || '');
    setProfilePhoto(student.profile_photo || '');
    setCourseDuration(student.course_duration);
    setStartDate(student.start_date || '');
    setEndDate(student.end_date || '');
    setNotes(student.notes || '');
    setSelectedCourseIds(student.courses || []);

    try {
      const res = await api.get(`certificates/?student=${student.id}`);
      const certs = res.data || [];
      if (certs.length > 0) {
        const cert = certs.find((c: any) => !c.is_issued) || certs[0];
        setSelectedCourseId(String(cert.course));
        setCertCode(cert.certificate_code || '');
        setCertFileUrl(cert.file_url || '');
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

  const handleCourseCheckbox = (courseId: number) => {
    setSelectedCourseIds(prev => 
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    );
  };

  const handleExport = async () => {
    try {
      const res = await api.get('students/bulk-export/', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'students_directory.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('CSV Directory exported.');
    } catch {
      toast.error('Failed to export directory.');
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    const formData = new FormData();
    formData.append('file', importFile);

    try {
      await api.post('students/bulk-import/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Bulk student accounts created successfully!');
      setShowImportModal(false);
      setImportFile(null);
      queryClient.invalidateQueries({ queryKey: ['students-list'] });
    } catch (err: any) {
      const errors = err.response?.data?.errors || ['Failed to import spreadsheet records.'];
      setImportErrors(errors);
    }
  };

  const fetchProfileDetails = async (student: Student) => {
    setSelectedStudent(student);
    setShowProfileModal(true);
    setProfileLoading(true);
    try {
      const res = await api.get(`students/${student.id}/progress/`);
      setProfileDetails(res.data);
    } catch {
      toast.error('Failed to fetch detailed profile logs.');
      setShowProfileModal(false);
    } finally {
      setProfileLoading(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.email.toLowerCase().includes(search.toLowerCase()) || 
                          s.first_name.toLowerCase().includes(search.toLowerCase()) || 
                          s.last_name.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Student Directory</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage active student logins, adjust curriculum durations, and audit progress.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 bg-muted hover:bg-muted/80 rounded-xl font-bold border border-border">
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Search control */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/20 border border-border/50 p-4 rounded-2xl">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-3 text-muted-foreground" size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students by email or name..."
            className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-xl outline-none focus:border-primary/45"
          />
        </div>
      </div>

      {/* Directory List Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase font-bold text-[10px] tracking-wider bg-muted/20">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                          {student.first_name.charAt(0) || 'S'}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-foreground leading-none">{student.first_name} {student.last_name}</h4>
                          <span className="text-[10px] text-muted-foreground block mt-1">{student.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-muted-foreground">{student.course_duration} Days</td>
                    <td className="py-3.5 px-4 font-mono font-semibold">
                      {student.end_date ? new Date(student.end_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span 
                        className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${student.is_active ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-500' : 'bg-destructive/10 border-destructive/25 text-destructive'}`}
                      >
                        {student.is_active ? <ShieldCheck size={10} /> : <ShieldAlert size={10} />}
                        <span>{student.is_active ? 'Active' : 'Locked'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => fetchProfileDetails(student)}
                          className="p-1.5 hover:bg-muted border border-transparent rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                          title="View Logs & Audit"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          onClick={() => openEdit(student)}
                          className="p-1.5 hover:bg-muted border border-transparent rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit Details"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => { setSelectedStudent(student); setNewPassword(''); setShowPassModal(true); }}
                          className="p-1.5 hover:bg-muted border border-transparent rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                          title="Reset Password"
                        >
                          <Key size={13} />
                        </button>
                        <button
                          onClick={() => toggleStatusMutation.mutate(student)}
                          disabled={toggleStatusMutation.isPending}
                          className={`p-1.5 hover:bg-muted border border-transparent rounded-lg transition-colors ${student.is_active ? 'text-emerald-500 hover:text-amber-500' : 'text-amber-500 hover:text-emerald-500'}`}
                          title={student.is_active ? "Lock Access" : "Unlock Access"}
                        >
                          {student.is_active ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground font-medium">No students enrolled matching your criteria.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
      </div>

      {/* Modals & Dialogs */}
      {/* Create / Enroll Student Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div onClick={() => setShowAddModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-bold text-sm">Enroll New Student</h3>
                <button onClick={() => setShowAddModal(false)}><X size={16} /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); createStudentMutation.mutate(); }} className="space-y-4">
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
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Email Address *</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Password <span className="text-muted-foreground/60 normal-case">(leave blank → default: apex123)</span></label>
                  <div className="relative">
                    <input
                      id="enroll-password"
                      type={showEnrollPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Set custom password or leave blank"
                      className="w-full h-10 px-3 pr-10 bg-muted/40 border border-border rounded-xl outline-none text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEnrollPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showEnrollPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Course Expiry Duration *</label>
                  <select value={courseDuration} onChange={(e) => setCourseDuration(e.target.value)} className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none">
                    <option value="30">30 Days</option>
                    <option value="60">60 Days</option>
                    <option value="90">90 Days</option>
                    <option value="180">180 Days</option>
                    <option value="365">365 Days</option>
                    <option value="CUSTOM">Custom Date</option>
                  </select>
                </div>
                {courseDuration === 'CUSTOM' && (
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Custom Expiry Date</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                  </div>
                )}
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Assigned Courses</label>
                  <div className="grid gap-2 sm:grid-cols-2 p-3 bg-muted/20 border border-border rounded-xl max-h-32 overflow-y-auto">
                    {courses.map(c => (
                      <label key={c.id} className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                        <input type="checkbox" checked={selectedCourseIds.includes(c.id)} onChange={() => handleCourseCheckbox(c.id)} className="accent-primary" />
                        <span>{c.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {/* Pre-upload certificate section */}
                {!liveMode && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
                    <h5 className="font-bold text-[10px] uppercase text-primary">Pre-upload Certificate for 100% Release</h5>
                    <div>
                      <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Select Course Track</label>
                      <select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)} className="w-full h-10 px-3 bg-card border border-border rounded-xl outline-none text-[11px] font-semibold">
                        <option value="">No pre-uploaded certificate</option>
                        {courses.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                    </div>
                    {selectedCourseId && (
                      <>
                        <div>
                          <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Custom Certificate Code (Optional)</label>
                          <input type="text" value={certCode} onChange={(e) => setCertCode(e.target.value)} placeholder="e.g. APEX-CERT-123" className="w-full h-10 px-3 bg-card border border-border rounded-xl outline-none text-[11px]" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Upload Certificate File *</label>
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
                      </>
                    )}
                  </div>
                )}
                <button type="submit" disabled={createStudentMutation.isPending} className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl">Enroll Student</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Student Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div onClick={() => setShowEditModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-bold text-sm">Modify Student Details</h3>
                <button onClick={() => setShowEditModal(false)}><X size={16} /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); updateStudentMutation.mutate(); }} className="space-y-4">
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
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Course Expiry Duration *</label>
                  <select value={courseDuration} onChange={(e) => setCourseDuration(e.target.value)} className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none">
                    <option value="30">30 Days</option>
                    <option value="60">60 Days</option>
                    <option value="90">90 Days</option>
                    <option value="180">180 Days</option>
                    <option value="365">365 Days</option>
                    <option value="CUSTOM">Custom Date</option>
                  </select>
                </div>
                {courseDuration === 'CUSTOM' && (
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Custom Expiry Date</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                  </div>
                )}
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Assigned Courses</label>
                  <div className="grid gap-2 sm:grid-cols-2 p-3 bg-muted/20 border border-border rounded-xl max-h-32 overflow-y-auto">
                    {courses.map(c => (
                      <label key={c.id} className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                        <input type="checkbox" checked={selectedCourseIds.includes(c.id)} onChange={() => handleCourseCheckbox(c.id)} className="accent-primary" />
                        <span>{c.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {/* Pre-upload certificate section */}
                {!liveMode && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
                    <h5 className="font-bold text-[10px] uppercase text-primary">Pre-upload Certificate for 100% Release</h5>
                    <div>
                      <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Select Course Track</label>
                      <select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)} className="w-full h-10 px-3 bg-card border border-border rounded-xl outline-none text-[11px] font-semibold">
                        <option value="">No pre-uploaded certificate</option>
                        {courses.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                    </div>
                    {selectedCourseId && (
                      <>
                        <div>
                          <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Custom Certificate Code (Optional)</label>
                          <input type="text" value={certCode} onChange={(e) => setCertCode(e.target.value)} placeholder="e.g. APEX-CERT-123" className="w-full h-10 px-3 bg-card border border-border rounded-xl outline-none text-[11px]" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Upload Certificate File *</label>
                          {certFileUrl ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 h-10 px-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 rounded-xl text-[11px] font-semibold">
                                <CheckCircle size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <span className="truncate flex-1 font-mono">{certFileUrl.split('/').pop()}</span>
                                <a href={certFileUrl} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400 transition-colors" title="View Uploaded File">
                                  <ExternalLink size={13} />
                                </a>
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
                      </>
                    )}
                  </div>
                )}
                <button type="submit" disabled={updateStudentMutation.isPending} className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl">Save Changes</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Password Reset Modal */}
      <AnimatePresence>
        {showPassModal && (
          <div onClick={() => setShowPassModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-border pb-2.5">
                <h3 className="font-bold text-sm">Force Password Reset</h3>
                <button onClick={() => setShowPassModal(false)}><X size={16} /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); resetPasswordMutation.mutate(); }} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">New Security Password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="••••••••" autoComplete="new-password" className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                </div>
                <button type="submit" disabled={resetPasswordMutation.isPending} className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl">Update Password</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Excel/CSV Spreadsheets Bulk Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <div onClick={() => setShowImportModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-bold text-sm">Bulk Accounts Import</h3>
                <button onClick={() => setShowImportModal(false)}><X size={16} /></button>
              </div>

              {/* Template Download Banner */}
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-3 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground">Step 1: Download the CSV Template</p>
                  <p className="text-muted-foreground mt-0.5 text-[10px]">Use this template to fill in student data with the correct columns.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const csvContent = [
                      'email,first_name,last_name,phone,course_duration',
                      'john.doe@example.com,John,Doe,9876543210,90',
                      'jane.smith@example.com,Jane,Smith,9123456789,180',
                      'alex.kumar@example.com,Alex,Kumar,9000000001,30',
                    ].join('\n');
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'student_bulk_import_template.csv';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                  }}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-[10px] hover:brightness-110 transition-all"
                >
                  <Download size={12} />
                  Template
                </button>
              </div>

              <form onSubmit={handleImport} className="space-y-4">
                {/* CSV Column Reference */}
                <div className="p-3 bg-muted/20 border border-border/50 rounded-xl space-y-2 text-[10px]">
                  <p className="font-bold text-muted-foreground uppercase tracking-wider">Step 2: Fill in your data — Required columns:</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { col: 'email', req: true, desc: 'Student email (unique)' },
                      { col: 'first_name', req: true, desc: 'First name' },
                      { col: 'last_name', req: false, desc: 'Last name (optional)' },
                      { col: 'phone', req: false, desc: 'Phone number' },
                      { col: 'course_duration', req: false, desc: 'Days: 30, 60, 90, 180, 365' },
                    ].map(f => (
                      <div key={f.col} className="flex items-start gap-1.5 p-1.5 bg-card border border-border rounded-lg">
                        <code className={`shrink-0 text-[9px] px-1 py-0.5 rounded font-bold ${f.req ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{f.col}</code>
                        <span className="text-muted-foreground leading-tight">{f.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-muted/20 border border-dashed border-border rounded-xl text-center">
                  <label className="cursor-pointer block space-y-2">
                    <Upload size={20} className="mx-auto text-primary" />
                    <span className="font-semibold block text-sm">Step 3: Upload Completed CSV</span>
                    <span className="text-[10px] text-muted-foreground block">Only .csv files accepted</span>
                    <input type="file" accept=".csv" onChange={(e) => setImportFile(e.target.files?.[0] || null)} className="hidden" />
                  </label>
                  {importFile && <p className="text-[10px] text-emerald-500 font-bold mt-2">✓ Selected: {importFile.name}</p>}
                </div>
                {importErrors.length > 0 && (
                  <div className="p-3 bg-destructive/10 border border-destructive/25 text-destructive rounded-xl space-y-1 text-xs">
                    <p className="font-bold text-[10px] uppercase">Upload Problems:</p>
                    {importErrors.slice(0, 4).map((err, i) => (
                      <p key={i}>&bull; {err}</p>
                    ))}
                  </div>
                )}
                <button type="submit" disabled={!importFile} className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl">Import Spreadsheet</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* View logs / profile audit Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div onClick={() => setShowProfileModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-bold text-sm">Student Logs: {selectedStudent?.first_name} {selectedStudent?.last_name}</h3>
                <button onClick={() => setShowProfileModal(false)}><X size={16} /></button>
              </div>

              {profileLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                  <Loader2 size={24} className="animate-spin text-primary" />
                  <span className="text-xs font-semibold">Loading student profile logs...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Tabs */}
                  <div className="flex gap-2 border-b border-border/50 pb-2">
                    {[
                      { id: 'overview', label: 'Overall Progress' },
                      { id: 'logins', label: 'Login Logs' },
                      { id: 'attendance', label: 'Attendance' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setProfileTab(tab.id as any)}
                        className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold tracking-wide uppercase transition-all ${profileTab === tab.id ? 'bg-primary border-transparent text-primary-foreground' : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab Body */}
                  <div className="text-[11px] leading-relaxed min-h-60">
                    {profileTab === 'overview' && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="bg-muted/20 border border-border rounded-xl p-4 space-y-3">
                          <h5 className="font-bold text-xs border-b border-border pb-2">Courses Completion Ratios</h5>
                          <div className="space-y-2">
                            {profileDetails?.courses?.map((c: any, i: number) => (
                              <div key={i} className="space-y-1">
                                <div className="flex justify-between font-bold text-[10px]">
                                  <span>{c.title}</span>
                                  <span>{c.progress_percentage}%</span>
                                </div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden border border-border/30">
                                  <div className="h-full bg-primary" style={{ width: `${c.progress_percentage}%` }} />
                                </div>
                              </div>
                            ))}
                            {(!profileDetails?.courses || profileDetails.courses.length === 0) && (
                              <p className="italic text-muted-foreground">No course activity logged.</p>
                            )}
                          </div>
                        </div>

                        <div className="bg-muted/20 border border-border rounded-xl p-4 space-y-3">
                          <h5 className="font-bold text-xs border-b border-border pb-2">Issued Certifications</h5>
                          <div className="space-y-2">
                            {profileDetails?.certificates?.map((c: any, i: number) => (
                              <div key={i} className="p-2 bg-card border border-border rounded-lg flex items-center justify-between">
                                <div>
                                  <span className="font-bold block">{c.course_title}</span>
                                  <span className="font-mono text-[9px] text-muted-foreground">{c.certificate_code}</span>
                                </div>
                                <span className="text-[9px] font-bold text-emerald-500">✓ Verified</span>
                              </div>
                            ))}
                            {(!profileDetails?.certificates || profileDetails.certificates.length === 0) && (
                              <p className="italic text-muted-foreground">No certifications issued on record.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {profileTab === 'logins' && (
                      <div className="rounded-xl border border-border overflow-hidden bg-card">
                        <div className="divide-y divide-border">
                          {profileDetails?.login_history?.map((log: any) => (
                            <div key={log.id} className="p-3 flex items-center justify-between hover:bg-muted/15">
                              <div>
                                <span className="font-bold text-foreground">IP: {log.ip_address || 'Localhost'}</span>
                                <span className="text-[9px] text-muted-foreground block">{log.user_agent}</span>
                              </div>
                              <span className="font-mono font-semibold text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</span>
                            </div>
                          ))}
                          {(!profileDetails?.login_history || profileDetails.login_history.length === 0) && (
                            <p className="p-4 text-center text-muted-foreground italic">No login sessions recorded.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {profileTab === 'attendance' && (
                      <div className="rounded-xl border border-border overflow-hidden bg-card">
                        <div className="divide-y divide-border">
                          {profileDetails?.attendance?.map((att: any) => (
                            <div key={att.id} className="p-3 flex items-center justify-between hover:bg-muted/15">
                              <span className="font-bold">{new Date(att.date).toLocaleDateString()}</span>
                              <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded ${att.status === 'PRESENT' ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-500' : 'bg-destructive/10 border border-destructive/25 text-destructive'}`}>
                                {att.status}
                              </span>
                            </div>
                          ))}
                          {(!profileDetails?.attendance || profileDetails.attendance.length === 0) && (
                            <p className="p-4 text-center text-muted-foreground italic">No attendance records logged.</p>
                          )}
                        </div>
                      </div>
                    )}
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
