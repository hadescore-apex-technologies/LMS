import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { Award, Plus, Trash2, X, Download, Search, Loader2, Check } from 'lucide-react';
import { downloadFileDirectly } from '../../../utils/downloadHelper';
import { motion, AnimatePresence } from 'framer-motion';

interface Certificate {
  id: number;
  student_email: string;
  student_name: string;
  course_title: string;
  certificate_code: string;
  issued_at: string;
  file_url?: string;
  is_issued: boolean;
}

interface Course {
  id: number;
  title: string;
}

interface Student {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export const CertificateTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const [liveMode, setLiveMode] = React.useState(localStorage.getItem('super_adminLiveMode') === 'true');
  React.useEffect(() => {
    const handleStorage = () => setLiveMode(localStorage.getItem('super_adminLiveMode') === 'true');
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Modal States
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [customCertCode, setCustomCertCode] = useState('');
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [lockRelease, setLockRelease] = useState(true);

  // Queries
  const { data: certificates = [], isLoading } = useQuery<Certificate[]>({
    queryKey: ['certificates-list'],
    queryFn: async () => {
      const res = await api.get('certificates/');
      return res.data;
    }
  });

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses-dropdown-list', liveMode],
    queryFn: async () => {
      const res = await api.get(`courses/list/?is_mentoring_track=${liveMode}`);
      return res.data;
    }
  });

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['students-dropdown-list'],
    queryFn: async () => {
      const res = await api.get('students/');
      return res.data;
    }
  });

  // Mutations
  const issueCertificateMutation = useMutation({
    mutationFn: async () => {
      await api.post('certificates/', {
        student: Number(selectedStudent),
        course: Number(selectedCourse),
        certificate_code: customCertCode || undefined,
        file_url: uploadedFileUrl,
        is_issued: !lockRelease
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates-list'] });
      setShowIssueModal(false);
      resetForm();
      toast.success('Certificate issued successfully.');
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.error || err.response?.data?.certificate_code?.[0] || 'Failed to issue certificate.';
      toast.error(errMsg);
    }
  });

  const revokeCertificateMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`certificates/${id}/`);
    },
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['certificates-list'] });
      const previousCerts = queryClient.getQueryData<Certificate[]>(['certificates-list']);
      if (previousCerts) {
        queryClient.setQueryData<Certificate[]>(
          ['certificates-list'],
          previousCerts.filter(c => c.id !== id)
        );
      }
      return { previousCerts };
    },
    onError: (err, id, context) => {
      if (context?.previousCerts) {
        queryClient.setQueryData(['certificates-list'], context.previousCerts);
      }
      toast.error('Failed to revoke certificate.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Certificate credentials revoked.');
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingFile(true);
    try {
      const res = await api.post('core/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadedFileUrl(res.data.url);
      toast.success('Certificate file uploaded.');
    } catch {
      toast.error('Failed to upload file.');
    } finally {
      setUploadingFile(false);
    }
  };

  const resetForm = () => {
    setSelectedStudent('');
    setSelectedCourse('');
    setCustomCertCode('');
    setUploadedFileUrl('');
    setLockRelease(true);
  };

  const filteredCerts = certificates.filter(c => 
    c.student_email?.toLowerCase().includes(search.toLowerCase()) ||
    c.course_title?.toLowerCase().includes(search.toLowerCase()) ||
    c.certificate_code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Certificate Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Issue, track, verify, and revoke course completion certificates.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowIssueModal(true); }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-md transition-all hover:brightness-110 active:scale-95"
        >
          <Plus size={14} />
          <span>Issue Certificate</span>
        </button>
      </div>

      {/* Filter and search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/20 border border-border/50 p-4 rounded-2xl">
        <span className="font-bold text-muted-foreground block">Issued records: {certificates.length} certs</span>
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-3 text-muted-foreground" size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student, course, or code..."
            className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-xl outline-none focus:border-primary/45"
          />
        </div>
      </div>

      {/* Credentials list */}
      
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCerts.map(cert => (
            <div key={cert.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl flex-shrink-0">
                  <Award size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm leading-tight text-foreground">{cert.student_name || cert.student_email}</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{cert.course_title}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="font-mono text-[9px] text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">{cert.certificate_code}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border uppercase ${cert.is_issued ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse'}`}>
                      {cert.is_issued ? 'Released' : 'Locked (Pending 100%)'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{new Date(cert.issued_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {cert.file_url && (
                  <button
                    type="button"
                    onClick={() => downloadFileDirectly(cert.file_url!, `Certificate_${cert.certificate_code || cert.student_name || 'Certificate'}.pdf`)}
                    className="p-1.5 bg-muted hover:bg-muted/80 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Download Certificate"
                  >
                    <Download size={13} />
                  </button>
                )}
                <button onClick={() => { if (window.confirm('Revoke certificate?')) revokeCertificateMutation.mutate(cert.id); }} className="p-1.5 hover:bg-destructive/10 rounded-xl text-muted-foreground hover:text-destructive">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
          {filteredCerts.length === 0 && (
            <div className="col-span-full py-16 text-center text-muted-foreground bg-card border border-border border-dashed rounded-2xl font-medium">
              No certificates matched.
            </div>
          )}
        </div>

      {/* Issue Modal */}
      <AnimatePresence>
        {showIssueModal && (
          <div onClick={() => setShowIssueModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-bold text-sm">Issue Custom Certificate</h3>
                <button onClick={() => setShowIssueModal(false)}><X size={16} /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); issueCertificateMutation.mutate(); }} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Select Student *</label>
                  <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} required className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none font-semibold">
                    <option value="">Choose student</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.first_name || s.last_name ? `${s.first_name} ${s.last_name} (${s.email})` : s.email}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Select Course *</label>
                  <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} required className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none font-semibold">
                    <option value="">Choose course</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Custom Certificate Code (Optional)</label>
                  <input type="text" value={customCertCode} onChange={(e) => setCustomCertCode(e.target.value)} placeholder="e.g. APEX-CERT-102" className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Upload Credential Certificate * (PDF or Image)</label>
                  {uploadedFileUrl ? (
                    <div className="flex items-center gap-2 h-10 px-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 rounded-xl">
                      <Check size={13} className="shrink-0" />
                      <span className="truncate flex-1">{uploadedFileUrl.split('/').pop()}</span>
                      <button onClick={() => setUploadedFileUrl('')} className="text-destructive"><X size={12} /></button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-1.5 h-10 px-3 bg-muted/40 border border-dashed border-border rounded-xl cursor-pointer">
                      {uploadingFile ? <Loader2 size={13} className="animate-spin text-primary" /> : <Plus size={13} />}
                      <span>Select Certificate File (.pdf)</span>
                      <input type="file" onChange={handleFileUpload} className="hidden" />
                    </label>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="lockRelease"
                    checked={lockRelease}
                    onChange={(e) => setLockRelease(e.target.checked)}
                    className="accent-primary rounded"
                  />
                  <label htmlFor="lockRelease" className="text-[11px] font-semibold text-muted-foreground cursor-pointer">
                    Lock Release (Auto-release only when student completes 100% of Course)
                  </label>
                </div>
                <button type="submit" disabled={issueCertificateMutation.isPending || uploadingFile} className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-1.5 font-bold">
                  <Award size={12} />
                  <span>Issue Certificate</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default CertificateTab;
