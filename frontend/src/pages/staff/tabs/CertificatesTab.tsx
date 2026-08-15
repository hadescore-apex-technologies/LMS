import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { Award, Trash2, Download, Search, Loader2 } from 'lucide-react';
import { downloadFileDirectly } from '../../../utils/downloadHelper';

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

export const CertificatesTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  // Queries
  const { data: certificates = [] } = useQuery<Certificate[]>({
    queryKey: ['certificates-list'],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const res = await api.get('certificates/');
      return res.data;
    }
  });

  const revokeCertificateMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`certificates/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates-list'] });
      toast.success('Certificate credentials revoked.');
    }
  });

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
          <p className="text-muted-foreground text-sm mt-1">Track, verify, and revoke course completion certificates.</p>
        </div>
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
    </div>
  );
};
export default CertificatesTab;
