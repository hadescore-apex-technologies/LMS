import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import { Award, Download, Share2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

interface Certificate {
  id: number;
  course_title: string;
  certificate_code: string;
  file_url: string;
  issued_at: string;
}

export const CertificatesTab: React.FC = () => {
  const { data: certificates = [], isLoading } = useQuery<Certificate[]>({
    queryKey: ['certificates'],
    queryFn: async () => {
      const res = await api.get('certificates/');
      return res.data;
    }
  });

  const handleShare = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Certificate code copied to clipboard!');
  };

  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-44 bg-muted/40 animate-pulse rounded-2xl border border-border/30" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Academic Certifications</h1>
        <p className="text-muted-foreground text-sm mt-1">Review, download, and verify your achieved course certifications and training badges.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {certificates.length === 0 ? (
          <div className="col-span-full py-20 text-center text-muted-foreground font-medium bg-card border border-dashed border-border rounded-2xl">
            No certifications have been registered to your profile yet. Finish your course modules and checkpoint quizzes to unlock them.
          </div>
        ) : (
          certificates.map(cert => (
            <div key={cert.id} className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4 hover:border-primary/30 transition-all flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="h-10 w-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                  <Award size={20} />
                </div>
                <h3 className="font-extrabold text-base leading-snug">{cert.course_title}</h3>
                
                <div className="space-y-1 bg-muted/30 p-2.5 rounded-lg border border-border/50">
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold">Verification ID</span>
                  <span className="font-mono text-primary font-bold tracking-wider select-all block text-xs">{cert.certificate_code}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
                  <span>Issued: {new Date(cert.issued_at).toLocaleDateString()}</span>
                  <span className="flex items-center gap-0.5 text-emerald-500">
                    <ShieldCheck size={12} /> Verified
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <a
                    href={cert.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-center flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 hover:brightness-110 transition-all text-[11px]"
                  >
                    <Download size={12} />
                    <span>Download PDF</span>
                  </a>
                  
                  <button
                    onClick={() => handleShare(cert.certificate_code)}
                    className="p-2 bg-muted/60 border border-border text-foreground hover:bg-muted rounded-xl transition-all"
                    title="Copy verification code"
                  >
                    <Share2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
