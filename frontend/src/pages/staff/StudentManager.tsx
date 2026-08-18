import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { 
  UserPlus, Trash2, Edit3, Key, ShieldCheck, 
  ShieldAlert, X, Save, Upload, Download, Activity,
  Eye, EyeOff
} from 'lucide-react';
import { downloadFileDirectly } from '../../utils/downloadHelper';
import { motion, AnimatePresence } from 'framer-motion';

interface Student {
  courses: any;
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
  categories: number[];
}

interface Category {
  id: number;
  name: string;
}

const StudentManager: React.FC = () => {
  const liveMode = true;
  const [students, setStudents] = useState<Student[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [uploadingCertCourseId, setUploadingCertCourseId] = useState<number | null>(null);
  const [pendingCerts, setPendingCerts] = useState<{[courseId: number]: string}>({});
  const [loading, setLoading] = useState(true);

  // Modal States
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
  const [selectedCatIds, setSelectedCatIds] = useState<number[]>([]);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showEnrollPassword, setShowEnrollPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Bulk Import / Export States
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSuccessMessage, setImportSuccessMessage] = useState('');

  // Progress modal state
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressData, setProgressData] = useState<any>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'logins' | 'attendance' | 'assignments'>('overview');

  // Attendance logging form fields
  const [attStatus, setAttStatus] = useState<'PRESENT' | 'ABSENT' | 'LATE'>('PRESENT');
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);

  const loadData = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const liveModeKey = user?.role === 'SUPER_ADMIN' ? 'super_adminLiveMode' : 'staffLiveMode';
      const liveMode = localStorage.getItem(liveModeKey) === 'true';
      const [studentsRes, categoriesRes, coursesRes, certificatesRes] = await Promise.all([
        api.get(`students/?live_mode=${liveMode}`),
        api.get('courses/categories/'),
        api.get('courses/list/'),
        api.get('certificates/')
      ]);
      setStudents(studentsRes.data);
      setCategories(categoriesRes.data);
      setCourses(coursesRes.data);
      setCertificates(certificatesRes.data);
    } catch (err) {
      toast.error("Failed to load student records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setEmail('');
    setFirstName('');
    setLastName('');
    setProfilePhoto('');
    setCourseDuration('90');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setNotes('');
    setSelectedCatIds([]);
    setPassword('');
    setNewPassword('');
    setSelectedStudent(null);
    setPendingCerts({});
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const submittedEmail = ((formData.get('email') as string) || email).trim().toLowerCase();
    const submittedFirstName = ((formData.get('first_name') as string) || firstName).trim();
    const submittedLastName = ((formData.get('last_name') as string) || lastName).trim();
    const submittedPassword = ((formData.get('password') as string) || password).trim();

    if (!submittedEmail || !submittedEmail.includes('@') || submittedEmail.endsWith('@')) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!submittedFirstName) {
      toast.error("Please enter first name.");
      return;
    }
    if (!submittedLastName) {
      toast.error("Please enter last name.");
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const liveModeKey = user?.role === 'SUPER_ADMIN' ? 'super_adminLiveMode' : 'staffLiveMode';
      const liveMode = localStorage.getItem(liveModeKey) === 'true';
      const res = await api.post(`students/?live_mode=${liveMode}`, {
        email: submittedEmail,
        first_name: submittedFirstName,
        last_name: submittedLastName,
        password: submittedPassword ? submittedPassword : undefined,
        profile_photo: profilePhoto,
        course_duration: courseDuration,
        start_date: startDate || undefined,
        end_date: courseDuration === 'CUSTOM' ? endDate : undefined,
        notes,
        courses: selectedCatIds,
        categories: selectedCatIds,
        student_type: liveMode ? 'LIVE_CLASS' : 'COURSE'
      });
      
      const newStudent = res.data;
      const newStudentId = newStudent.id;

      // Issue all uploaded certificates for the new student
      const certPromises = Object.entries(pendingCerts).map(([courseId, certUrl]) => {
        return api.post('certificates/', {
          student: newStudentId,
          course: Number(courseId),
          file_url: certUrl,
          is_issued: true
        });
      });

      let newCerts: any[] = [];
      if (certPromises.length > 0) {
        const certResponses = await Promise.all(certPromises);
        newCerts = certResponses.map(r => r.data);
      }

      setStudents(prev => [...prev, newStudent]);
      if (newCerts.length > 0) {
        setCertificates(prev => [...prev, ...newCerts]);
      }

      toast.success("Student enrolled and certificates attached successfully.");
      setShowAddModal(false);
      resetForm();
    } catch (err: any) {
      const emailErr = err.response?.data?.email?.[0];
      const passErr = err.response?.data?.password?.[0];
      const detailErr = err.response?.data?.detail;
      toast.error(emailErr || passErr || detailErr || "Enrollment failed.");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !email || !firstName || !lastName) return;

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const liveModeKey = user?.role === 'SUPER_ADMIN' ? 'super_adminLiveMode' : 'staffLiveMode';
      const liveMode = localStorage.getItem(liveModeKey) === 'true';
      const res = await api.put(`students/${selectedStudent.id}/?live_mode=${liveMode}`, {
        email,
        first_name: firstName,
        last_name: lastName,
        is_active: selectedStudent.is_active,
        profile_photo: profilePhoto,
        course_duration: courseDuration,
        start_date: startDate,
        end_date: courseDuration === 'CUSTOM' ? endDate : undefined,
        notes,
        courses: selectedCatIds,
        categories: selectedCatIds,
        assigned_staff: (selectedStudent as any).assigned_staff ?? undefined,
        assigned_live_staff: (selectedStudent as any).assigned_live_staff ?? (liveMode ? user?.id : undefined),
        student_type: (selectedStudent as any).student_type || (liveMode ? 'LIVE_CLASS' : 'COURSE')
      });
      toast.success("Student details updated.");
      setShowEditModal(false);
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? res.data : s));
      resetForm();
    } catch (err: any) {
      if (err?.response?.status === 404) {
        toast.error("Student not found or has been deleted. Refreshing list...");
        // Remove the non-existent student from local state and close modal
        setStudents(prev => prev.filter(s => s.id !== selectedStudent.id));
        setShowEditModal(false);
        resetForm();
      } else {
        toast.error("Failed to update student profile.");
      }
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !newPassword) return;

    try {
      await api.post(`students/${selectedStudent.id}/reset-password/`, {
        password: newPassword
      });
      toast.success(`Password reset for ${selectedStudent.email}`);
      setShowPassModal(false);
      resetForm();
    } catch (err) {
      toast.error("Failed to reset password.");
    }
  };

  const handleToggleStatus = async (student: Student) => {
    const originalStudents = [...students];
    setStudents(prev => prev.map(s => s.id === student.id ? { ...s, is_active: !s.is_active } : s));
    toast.success(`Account status updated for ${student.email}`);
    try {
      await api.post(`students/${student.id}/toggle-status/`);
    } catch (err) {
      setStudents(originalStudents);
      toast.error("Failed to toggle status.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Permanently delete this student? Access locks, course logs and certifications will be wiped.")) return;
    const originalStudents = [...students];
    setStudents(prev => prev.filter(s => s.id !== id));
    try {
      await api.delete(`students/${id}/`);
      toast.success("Student account deleted.");
    } catch (err: any) {
      setStudents(originalStudents);
      if (err?.response?.status === 404) {
        toast.error("Student not found or has already been deleted.");
        // Refresh the students list to get current state
        loadData();
      } else {
        toast.error("Failed to delete student account.");
      }
    }
  };

  const openEdit = (student: Student) => {
    // Validate that student exists in current students list
    const currentStudent = students.find(s => s.id === student.id);
    if (!currentStudent) {
      toast.error("Student no longer exists. Refreshing list...");
      // Refresh the student list seamlessly
      loadData();
      return;
    }
    
    setSelectedStudent(currentStudent);
    setEmail(currentStudent.email);
    setFirstName(currentStudent.first_name);
    setLastName(currentStudent.last_name);
    setPhone(currentStudent.phone || '');
    setProfilePhoto(currentStudent.profile_photo || '');
    setCourseDuration(currentStudent.course_duration);
    setStartDate(currentStudent.start_date || '');
    setEndDate(currentStudent.end_date || '');
    setNotes(currentStudent.notes || '');
    setSelectedCatIds(currentStudent.courses || (currentStudent as any).categories || []);
    setShowEditModal(true);
  };

  const handleCatCheckbox = (catId: number) => {
    setSelectedCatIds(prev => 
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  return (
    <>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {liveMode ? 'Live Mentoring Student Roster' : 'Course Mode Student Directory'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {liveMode 
              ? 'Manage your assigned Live Class mentees and mentoring track progress.'
              : 'Operational view to create student accounts, modify durations, and configure training mappings.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              try {
                const res = await api.get('students/bulk-export/', { responseType: 'blob' });
                const url = window.URL.createObjectURL(new Blob([res.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'students_directory.csv');
                document.body.appendChild(link);
                link.click();
                link.remove();
                toast.success("Student directory exported.");
              } catch {
                toast.error("Failed to export student directory.");
              }
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-muted hover:bg-muted/80 rounded-xl text-xs font-semibold border border-border text-foreground transition-all"
            title="Download CSV database of students"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => { setImportFile(null); setImportErrors([]); setImportSuccessMessage(''); setShowImportModal(true); }}
            className="flex items-center gap-2 px-3.5 py-2 bg-muted hover:bg-muted/80 rounded-xl text-xs font-semibold border border-border text-foreground transition-all"
            title="Upload CSV to bulk enroll students"
          >
            <Upload size={14} />
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:brightness-110 active:brightness-95 rounded-xl text-sm font-semibold transition-all shadow-md shadow-primary/10"
          >
            <UserPlus size={16} />
            <span>Enroll New Student</span>
          </button>
        </div>
      </div>

      {/* Directory Table */}
      <div className="rounded-2xl glass-panel p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-muted-foreground uppercase font-semibold">
                <th className="py-3 px-4">Student Profile</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Mapped Topics</th>
                <th className="py-3 px-4">Course Bounds</th>
                <th className="py-3 px-4">Access Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground font-medium">
                    No student records found. Enroll a student to display.
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const isExpired = student.end_date && new Date(student.end_date) <= new Date();
                  return (
                    <tr key={student.id} className="hover:bg-muted/30">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-semibold text-primary">
                            {student.first_name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground/80">{student.first_name} {student.last_name}</h4>
                            <span className="text-[10px] text-muted-foreground">{student.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground font-mono">{student.phone || '--'}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(student.categories || []).map(catId => {
                            const c = categories.find(x => x.id === catId);
                            return c ? (
                              <span key={catId} className="text-[9px] px-2 py-0.5 rounded bg-muted border border-border text-muted-foreground font-medium">
                                {c.name}
                              </span>
                            ) : null;
                          })}
                          {(!student.categories || student.categories.length === 0) && <span className="text-muted-foreground italic text-[10px]">None</span>}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-muted-foreground block">{student.course_duration} Days Access</span>
                          <span className="font-semibold text-[10px] block">
                            {student.start_date} to {student.end_date}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleStatus(student)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold border text-[9px] uppercase transition-all ${student.is_active && !isExpired
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                            : 'bg-destructive/10 text-destructive border-destructive/20'}`}
                        >
                          {student.is_active && !isExpired ? (
                            <>
                              <ShieldCheck size={9} />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <ShieldAlert size={9} />
                              <span>{isExpired ? 'Expired' : 'Locked'}</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={async () => {
                              setSelectedStudent(student);
                              setProgressLoading(true);
                              setShowProgressModal(true);
                              setActiveTab('overview');
                              try {
                                const res = await api.get(`students/${student.id}/progress/`);
                                setProgressData(res.data);
                              } catch {
                                toast.error("Failed to load student progress.");
                              } finally {
                                setProgressLoading(false);
                              }
                            }}
                            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                            title="View Student Progress Logs"
                          >
                            <Activity size={12} />
                          </button>
                          <button
                            onClick={() => openEdit(student)}
                            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit Student"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={() => { setSelectedStudent(student); setShowPassModal(true); }}
                            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                            title="Reset Credentials"
                          >
                            <Key size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(student.id)}
                            className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                            title="De-enroll Student"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div 
            onClick={() => setShowAddModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div 
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card text-card-foreground border border-border w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 my-8"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-semibold text-lg">Enroll New Student</h3>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-2.5 py-1 text-[10px] bg-muted hover:bg-muted/80 rounded-lg font-medium transition-colors">Cancel</button>
                  <button type="button" onClick={() => setShowAddModal(false)} className="p-1 hover:bg-muted rounded-lg text-muted-foreground"><X size={16} /></button>
                </div>
              </div>

              <form onSubmit={handleCreate} className="space-y-4 text-xs">
                {/* Basic info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">First Name *</label>
                    <input 
                      name="first_name"
                      type="text" 
                      value={firstName} 
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all"
                      placeholder="John"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">Last Name *</label>
                    <input 
                      name="last_name"
                      type="text" 
                      value={lastName} 
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all"
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">Email Address *</label>
                    <input 
                      name="email"
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="off"
                      className="w-full h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all"
                      placeholder="student@apex.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">Contact Phone</label>
                    <input 
                      type="text" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="off"
                      className="w-full h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all"
                      placeholder="+15550199"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">Credentials Password</label>
                    <div className="relative">
                      <input 
                        name="password"
                        type={showEnrollPassword ? 'text' : 'password'} 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        className="w-full h-10 px-3 pr-10 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all"
                        placeholder="Defaults to: apex123"
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
                    <label className="block font-semibold text-muted-foreground mb-1">Profile Photo URL</label>
                    <input 
                      type="text" 
                      value={profilePhoto} 
                      onChange={(e) => setProfilePhoto(e.target.value)}
                      className="w-full h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all"
                      placeholder="https://R2-link/photo.png"
                    />
                  </div>
                </div>

                {/* Duration Config */}
                <div className="grid gap-4 sm:grid-cols-3 border-t border-border pt-4">
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">Access Duration</label>
                    <select
                      value={courseDuration}
                      onChange={(e) => setCourseDuration(e.target.value)}
                      className="w-full h-10 px-2 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all"
                    >
                      <option value="30">30 Days</option>
                      <option value="60">60 Days</option>
                      <option value="90">90 Days</option>
                      <option value="180">180 Days</option>
                      <option value="365">365 Days</option>
                      <option value="CUSTOM">Custom Dates</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">Start Date</label>
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">End Date {courseDuration !== 'CUSTOM' && '(Auto Calculated)'}</label>
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)}
                      disabled={courseDuration !== 'CUSTOM'}
                      className="w-full h-10 px-3 bg-muted border border-border rounded-xl outline-none text-muted-foreground disabled:cursor-not-allowed disabled:bg-muted/30"
                    />
                  </div>
                </div>

                {/* Category selectors */}
                <div className="border-t border-border pt-4">
                  <label className="block font-semibold text-muted-foreground mb-2">Category Assignments (Select Topic Tracks)</label>
                  <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto bg-muted/30 p-3.5 border border-border rounded-xl">
                    {categories.map((cat) => (
                      <label key={cat.id} className="flex items-center gap-2 cursor-pointer font-medium hover:text-foreground">
                        <input
                          type="checkbox"
                          checked={selectedCatIds.includes(cat.id)}
                          onChange={() => handleCatCheckbox(cat.id)}
                          className="accent-primary"
                        />
                        <span>{cat.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Course Certificates section in Enroll Modal */}
                <div className="border-t border-border pt-4 space-y-3">
                  <label className="block font-semibold text-muted-foreground">Course Certificates</label>
                  <p className="text-[10px] text-muted-foreground">Upload certificate files for the student's assigned courses. They will be locked until the student completes 100% of the course.</p>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {courses.filter(c => selectedCatIds.includes(c.category)).map(course => {
                      const pendingUrl = pendingCerts[course.id];
                      return (
                        <div key={course.id} className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-xl">
                          <div className="space-y-1">
                            <span className="font-semibold text-foreground/80 block">{course.title}</span>
                            {pendingUrl ? (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase bg-amber-500/10 text-amber-500">
                                Certificate Uploaded & Ready
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">No certificate uploaded yet</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {pendingUrl ? (
                              <div className="flex items-center gap-1.5">
                                <button type="button" onClick={() => downloadFileDirectly(pendingUrl, `Certificate_${course.title || 'Course'}.pdf`)} className="p-1.5 bg-muted hover:bg-muted/80 rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer" title="Download Certificate File">
                                  <Download size={11} />
                                </button>
                                <button type="button" onClick={() => {
                                  const updated = { ...pendingCerts };
                                  delete updated[course.id];
                                  setPendingCerts(updated);
                                  toast.success("Certificate file removed.");
                                }} className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            ) : (
                              <div className="relative">
                                <input
                                  type="file"
                                  accept=".pdf,image/*"
                                  disabled={uploadingCertCourseId === course.id}
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const formData = new FormData();
                                    formData.append('file', file);
                                    try {
                                      setUploadingCertCourseId(course.id);
                                      const uploadRes = await api.post('core/upload/', formData, {
                                        headers: { 'Content-Type': 'multipart/form-data' }
                                      });
                                      setPendingCerts({ ...pendingCerts, [course.id]: uploadRes.data.url });
                                      toast.success("Certificate file uploaded successfully.");
                                    } catch {
                                      toast.error("Failed to upload certificate file.");
                                    } finally {
                                      setUploadingCertCourseId(null);
                                    }
                                  }}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
                                />
                                <button type="button" disabled={uploadingCertCourseId === course.id} className="flex items-center gap-1 px-2.5 py-1.5 bg-primary text-primary-foreground font-semibold rounded-lg text-[10px] hover:brightness-110 disabled:opacity-50 transition-all">
                                  <Upload size={10} />
                                  <span>{uploadingCertCourseId === course.id ? 'Uploading...' : 'Upload Certificate'}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {courses.filter(c => selectedCatIds.includes(c.category)).length === 0 && (
                      <p className="text-[10px] text-muted-foreground italic text-center py-2">No courses belong to the assigned categories. Assign categories to see course options.</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Administrative Notes</label>
                  <textarea 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full p-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all resize-none"
                    placeholder="Enter student comments or organization parameters..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-muted rounded-xl hover:bg-muted/80 font-medium">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:brightness-110">Enroll Student</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Student Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div 
            onClick={() => setShowEditModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div 
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card text-card-foreground border border-border w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 my-8"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-semibold text-lg">Modify Student Profile</h3>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setShowEditModal(false)} className="px-2.5 py-1 text-[10px] bg-muted hover:bg-muted/80 rounded-lg font-medium transition-colors">Cancel</button>
                  <button type="button" onClick={() => setShowEditModal(false)} className="p-1 hover:bg-muted rounded-lg text-muted-foreground"><X size={16} /></button>
                </div>
              </div>

              <form onSubmit={handleUpdate} className="space-y-4 text-xs">
                {/* Basic info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">First Name *</label>
                    <input 
                      type="text" 
                      value={firstName} 
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">Last Name *</label>
                    <input 
                      type="text" 
                      value={lastName} 
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">Email Address *</label>
                    <input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">Contact Phone</label>
                    <input 
                      type="text" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Profile Photo URL</label>
                  <input 
                    type="text" 
                    value={profilePhoto} 
                    onChange={(e) => setProfilePhoto(e.target.value)}
                    className="w-full h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40"
                  />
                </div>

                {/* Duration Config */}
                <div className="grid gap-4 sm:grid-cols-3 border-t border-border pt-4">
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">Access Duration</label>
                    <select
                      value={courseDuration}
                      onChange={(e) => setCourseDuration(e.target.value)}
                      className="w-full h-10 px-2 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all"
                    >
                      <option value="30">30 Days</option>
                      <option value="60">60 Days</option>
                      <option value="90">90 Days</option>
                      <option value="180">180 Days</option>
                      <option value="365">365 Days</option>
                      <option value="CUSTOM">Custom Dates</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">Start Date</label>
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">End Date {courseDuration !== 'CUSTOM' && '(Auto Calculated)'}</label>
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)}
                      disabled={courseDuration !== 'CUSTOM'}
                      className="w-full h-10 px-3 bg-muted border border-border rounded-xl outline-none text-muted-foreground disabled:cursor-not-allowed disabled:bg-muted/30"
                    />
                  </div>
                </div>

                {/* Category selectors */}
                <div className="border-t border-border pt-4">
                  <label className="block font-semibold text-muted-foreground mb-2">Category Assignments</label>
                  <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto bg-muted/30 p-3.5 border border-border rounded-xl">
                    {categories.map((cat) => (
                      <label key={cat.id} className="flex items-center gap-2 cursor-pointer font-medium hover:text-foreground">
                        <input
                          type="checkbox"
                          checked={selectedCatIds.includes(cat.id)}
                          onChange={() => handleCatCheckbox(cat.id)}
                          className="accent-primary"
                        />
                        <span>{cat.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Course Certificates section */}
                <div className="border-t border-border pt-4 space-y-3">
                  <label className="block font-semibold text-muted-foreground">Course Certificates</label>
                  <p className="text-[10px] text-muted-foreground">Upload certificate files for the student's assigned courses. They will be locked until the student completes 100% of the course.</p>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {courses.filter(c => selectedCatIds.includes(c.category)).map(course => {
                      const studentCert = certificates.find(cert => cert.student === selectedStudent?.id && cert.course === course.id);
                      return (
                        <div key={course.id} className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-xl">
                          <div className="space-y-1">
                            <span className="font-semibold text-foreground/80 block">{course.title}</span>
                            {studentCert ? (
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase ${studentCert.is_issued ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                  {studentCert.is_issued ? 'Completed & Issued' : 'Certificate Uploaded & Locked'}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">{studentCert.certificate_code}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">No certificate uploaded yet</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {studentCert ? (
                              <div className="flex items-center gap-1.5">
                                <button type="button" onClick={() => downloadFileDirectly(studentCert.file_url || `/api/certificates/${studentCert.id}/download/`, `Certificate_${course.title || 'Course'}.pdf`)} className="p-1.5 bg-muted hover:bg-muted/80 rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer" title="Download Certificate File">
                                  <Download size={13} />
                                </button>
                                <button type="button" onClick={async () => {
                                  if (!window.confirm("Remove this certificate? This cannot be undone.")) return;
                                  const originalCerts = [...certificates];
                                  setCertificates(prev => prev.filter(c => c.id !== studentCert.id));
                                  toast.success("Certificate removed.");
                                  try {
                                    await api.delete(`certificates/${studentCert.id}/`);
                                  } catch {
                                    setCertificates(originalCerts);
                                    toast.error("Failed to delete certificate.");
                                  }
                                }} className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            ) : (
                              <div className="relative">
                                <input
                                  type="file"
                                  accept=".pdf,image/*"
                                  disabled={uploadingCertCourseId === course.id}
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const formData = new FormData();
                                    formData.append('file', file);
                                    try {
                                      setUploadingCertCourseId(course.id);
                                      const uploadRes = await api.post('core/upload/', formData, {
                                        headers: { 'Content-Type': 'multipart/form-data' }
                                      });
                                      const certRes = await api.post('certificates/', {
                                        student: selectedStudent?.id,
                                        course: course.id,
                                        file_url: uploadRes.data.url,
                                        is_issued: true
                                      });
                                      toast.success("Certificate uploaded & locked successfully.");
                                      setCertificates(prev => [...prev, certRes.data]);
                                    } catch (err: any) {
                                      if (err?.response?.status === 404) {
                                        toast.error("Student not found. Cannot upload certificate.");
                                      } else {
                                        toast.error("Failed to upload certificate.");
                                      }
                                      console.error('Certificate upload error:', err);
                                    } finally {
                                      setUploadingCertCourseId(null);
                                    }
                                  }}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
                                />
                                <button type="button" disabled={uploadingCertCourseId === course.id} className="flex items-center gap-1 px-2.5 py-1.5 bg-primary text-primary-foreground font-semibold rounded-lg text-[10px] hover:brightness-110 disabled:opacity-50 transition-all">
                                  <Upload size={10} />
                                  <span>{uploadingCertCourseId === course.id ? 'Uploading...' : 'Upload Certificate'}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {courses.filter(c => selectedCatIds.includes(c.category)).length === 0 && (
                      <p className="text-[10px] text-muted-foreground italic text-center py-2">No courses belong to the assigned categories. Assign categories to see course options.</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Administrative Notes</label>
                  <textarea 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full p-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 bg-muted rounded-xl font-medium">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:brightness-110 flex items-center gap-1">
                    <Save size={12} />
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset password modal */}
      <AnimatePresence>
        {showPassModal && (
          <div 
            onClick={() => setShowPassModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card text-card-foreground border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-semibold text-lg">Reset Student Password</h3>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setShowPassModal(false)} className="px-2.5 py-1 text-[10px] bg-muted hover:bg-muted/80 rounded-lg font-medium transition-colors">Cancel</button>
                  <button type="button" onClick={() => setShowPassModal(false)} className="p-1 hover:bg-muted rounded-lg text-muted-foreground"><X size={16} /></button>
                </div>
              </div>

              <form onSubmit={handlePasswordReset} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Student Account</label>
                  <input 
                    type="text" 
                    value={selectedStudent?.email || ''} 
                    disabled
                    className="w-full h-10 px-3 bg-muted border border-border rounded-xl outline-none text-muted-foreground cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">New Secure Password</label>
                  <div className="relative">
                    <input 
                      type={showResetPassword ? "text" : "password"} 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full h-10 pl-3 pr-10 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      title={showResetPassword ? "Hide password" : "Show password"}
                    >
                      {showResetPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button type="button" onClick={() => setShowPassModal(false)} className="px-4 py-2 bg-muted rounded-xl hover:bg-muted/80 font-medium">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:brightness-110">Update Password</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>

      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card text-card-foreground border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-semibold text-lg">Bulk Student Import</h3>
                <button onClick={() => setShowImportModal(false)} className="p-1 hover:bg-muted rounded-lg"><X size={16} /></button>
              </div>

              {/* Template Download Banner */}
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-3 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground">Step 1: Download the CSV Template</p>
                  <p className="text-muted-foreground mt-0.5 text-[10px]">Open in Excel or Google Sheets, fill in student data, and save as CSV.</p>
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

              {/* Column reference guide */}
              <div className="p-3 bg-muted/20 border border-border/50 rounded-xl space-y-2 text-[10px]">
                <p className="font-bold text-muted-foreground uppercase tracking-wider">Step 2: Fill in your data — Column reference:</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { col: 'email', req: true, desc: 'Student email (unique login)' },
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
                <p className="text-muted-foreground/70 text-[9px] pt-1">Default password for all imported students: <code className="bg-muted px-1 rounded font-bold">apex123</code></p>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!importFile) {
                  toast.error("Please select a file.");
                  return;
                }
                const fData = new FormData();
                fData.append('file', importFile);
                try {
                  const res = await api.post('students/bulk-import/', fData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                  });
                  toast.success(res.data.message);
                  setImportSuccessMessage(res.data.message);
                  setImportErrors(res.data.errors || []);
                  loadData();
                } catch (err: any) {
                  toast.error(err.response?.data?.error || "Bulk import failed.");
                }
              }} className="space-y-4 text-xs">
                <div className="bg-muted/40 p-4 border border-dashed border-border rounded-xl text-center space-y-2">
                  <p className="font-semibold">Step 3: Upload your filled CSV</p>
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="w-full text-center cursor-pointer pt-2"
                  />
                  {importFile && <p className="text-[10px] text-emerald-500 font-bold">✓ Selected: {importFile.name}</p>}
                </div>

                {importSuccessMessage && (
                  <div className="bg-emerald-500/10 text-emerald-500 p-3 rounded-xl border border-emerald-500/20">
                    {importSuccessMessage}
                  </div>
                )}

                {importErrors.length > 0 && (
                  <div className="max-h-24 overflow-y-auto bg-destructive/10 text-destructive p-3 rounded-xl border border-destructive/20 space-y-1">
                    <p className="font-semibold">Errors encountered:</p>
                    {importErrors.map((err, i) => <p key={i}>• {err}</p>)}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button type="button" onClick={() => setShowImportModal(false)} className="px-4 py-2 bg-muted rounded-xl hover:bg-muted/80 font-medium">Close</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:brightness-110">Upload CSV</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Progress & Log Details Modal */}
      <AnimatePresence>
        {showProgressModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card text-card-foreground border border-border w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4 my-8"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="font-semibold text-lg">Student Performance Profile</h3>
                  <span className="text-xs text-muted-foreground">{selectedStudent?.first_name} {selectedStudent?.last_name} ({selectedStudent?.email})</span>
                </div>
                <button onClick={() => setShowProgressModal(false)} className="p-1 hover:bg-muted rounded-lg"><X size={16} /></button>
              </div>

              {progressLoading ? (
                <div className="h-60 flex items-center justify-center">
                  <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  {/* Tabs */}
                  <div className="flex border-b border-border gap-1">
                    {(['overview', 'logins', 'attendance', 'assignments'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 font-semibold capitalize border-b-2 transition-all ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* Tab Contents */}
                  {activeTab === 'overview' && progressData && (
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="p-4 bg-muted/40 rounded-xl border border-border">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Course Progress</span>
                        <h4 className="text-2xl font-bold mt-1 text-primary">{progressData.lessons_completed} Lessons</h4>
                        <p className="text-[10px] text-muted-foreground mt-1">Total completed content elements.</p>
                      </div>
                      <div className="p-4 bg-muted/40 rounded-xl border border-border">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Registration Date</span>
                        <h4 className="text-base font-bold mt-1 text-foreground">{progressData.start_date || '--'}</h4>
                        <span className="text-[10px] text-muted-foreground block">Expires: {progressData.end_date || '--'}</span>
                      </div>
                      <div className="p-4 bg-muted/40 rounded-xl border border-border">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Access Duration</span>
                        <h4 className="text-2xl font-bold mt-1 text-foreground">{progressData.course_duration} Days</h4>
                        <p className="text-[10px] text-muted-foreground mt-1">Calculated from start date.</p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'logins' && progressData && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-foreground/80 mb-1">Session Logs</h4>
                      <div className="max-h-52 overflow-y-auto border border-border rounded-xl divide-y divide-border">
                        {progressData.logins?.length === 0 ? (
                          <div className="p-4 text-center text-muted-foreground italic">No login sessions logged.</div>
                        ) : (
                          progressData.logins?.map((log: any, i: number) => (
                            <div key={i} className="p-2.5 flex items-center justify-between hover:bg-muted/10 font-mono text-[10px]">
                              <span>{new Date(log.timestamp).toLocaleString()}</span>
                              <span className="bg-muted px-2 py-0.5 rounded text-foreground">{log.ip_address || 'Unknown'}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'attendance' && progressData && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* Left: Attendance Logging */}
                      <div className="space-y-3 p-4 bg-muted/20 border border-border rounded-xl">
                        <h4 className="font-semibold text-foreground/80">Log Daily Attendance</h4>
                        <div className="space-y-2">
                          <div>
                            <label className="block text-[10px] text-muted-foreground mb-1">Date</label>
                            <input 
                              type="date" 
                              value={attDate} 
                              onChange={(e) => setAttDate(e.target.value)} 
                              className="w-full h-8 px-3 bg-muted border border-border rounded-lg outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-muted-foreground mb-1">Status</label>
                            <select 
                              value={attStatus} 
                              onChange={(e: any) => setAttStatus(e.target.value)}
                              className="w-full h-8 px-2 bg-muted border border-border rounded-lg outline-none"
                            >
                              <option value="PRESENT">Present</option>
                              <option value="ABSENT">Absent</option>
                              <option value="LATE">Late</option>
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await api.post(`students/${selectedStudent?.id}/log-attendance/`, {
                                  date: attDate,
                                  status: attStatus
                                });
                                toast.success(res.data.message);
                                // Refresh progress logs
                                const refreshed = await api.get(`students/${selectedStudent?.id}/progress/`);
                                setProgressData(refreshed.data);
                              } catch {
                                toast.error("Failed to record attendance.");
                              }
                            }}
                            className="w-full h-8 bg-primary text-primary-foreground font-semibold rounded-lg hover:brightness-110"
                          >
                            Save Attendance Record
                          </button>
                        </div>
                      </div>

                      {/* Right: Daily Registry */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-foreground/80">Check-in History</h4>
                        <div className="max-h-48 overflow-y-auto border border-border rounded-xl divide-y divide-border">
                          {progressData.attendance?.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground italic">No attendance records found.</div>
                          ) : (
                            progressData.attendance?.map((att: any, i: number) => (
                              <div key={i} className="p-2.5 flex items-center justify-between hover:bg-muted/10">
                                <span className="font-mono">{att.date}</span>
                                <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-semibold ${att.status === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-500' : att.status === 'LATE' ? 'bg-amber-500/10 text-amber-500' : 'bg-destructive/10 text-destructive'}`}>
                                  {att.status}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'assignments' && progressData && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-foreground/80 mb-1">Homework Submissions</h4>
                      <div className="max-h-52 overflow-y-auto border border-border rounded-xl divide-y divide-border">
                        {progressData.assignments?.length === 0 ? (
                          <div className="p-4 text-center text-muted-foreground italic font-medium">No homework logs submitted yet.</div>
                        ) : (
                          progressData.assignments?.map((sub: any, i: number) => (
                            <div key={i} className="p-3 hover:bg-muted/10 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-foreground/80">{sub.assignment_title}</span>
                                <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-semibold ${sub.status === 'GRADED' ? 'bg-emerald-500/10 text-emerald-500' : sub.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500' : 'bg-destructive/10 text-destructive'}`}>
                                  {sub.status}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span>Grade: {sub.score ? sub.score : 'Not Graded'}</span>
                                <span className="italic">{sub.feedback || 'No feedback logged.'}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-border">
                <button type="button" onClick={() => setShowProgressModal(false)} className="px-4 py-2 bg-muted rounded-xl hover:bg-muted/80 font-medium text-xs">Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default StudentManager;
