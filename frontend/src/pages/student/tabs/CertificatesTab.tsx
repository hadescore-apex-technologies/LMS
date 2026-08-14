import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, type Variants } from 'framer-motion';
import api from '../../../services/api';
import { Award, Download, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

interface Certificate {
  id: number;
  course_title: string;
  certificate_code: string;
  file_url: string;
  issued_at: string;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

export const CertificatesTab: React.FC = () => {
  const { data: certificates = [] } = useQuery<Certificate[]>({
    queryKey: ['certificates'],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const res = await api.get('certificates/');
      return res.data;
    }
  });

  return (
    <div className="w-full space-y-3.5 text-xs animate-fade-in">
      {/* ── CLEAN COMPACT HEADER ────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black shadow-md shadow-amber-500/20 border border-amber-400">
            <Award size={18} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
              <span>Academic Certifications & Credentials</span>
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Review, download, and share your industry-recognized course certifications.
            </p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full bg-card border border-border/80 text-[10px] font-extrabold text-amber-400">
          {certificates.length} Verified Credentials
        </span>
      </div>

      {/* ── HIGH-DENSITY CERTIFICATE CARDS GRID ─────────── */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {certificates.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground font-medium bg-card border border-dashed border-border rounded-2xl p-6 shadow-2xs">
            <Award size={32} className="mx-auto text-amber-500/40 mb-1.5" />
            <h3 className="font-extrabold text-sm text-foreground">No certifications earned yet</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs mx-auto">Complete your enrolled course modules and pass required checkpoint quizzes to unlock verified credentials.</p>
          </div>
        ) : (
          certificates.map(cert => (
              <motion.div 
                variants={itemVariants}
                key={cert.id} 
                whileHover={{ y: -3, scale: 1.01 }}
                className="relative rounded-2xl cyber-glass-card border-amber-500/40 hover:border-amber-400 p-4 shadow-sm hover:shadow-[0_0_25px_rgba(245,158,11,0.25)] transition-all duration-200 flex flex-col justify-between group overflow-hidden"
              >
              {/* Gold Ambient Shimmer Glow */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent rounded-full blur-xl group-hover:from-amber-500/25 transition-all pointer-events-none" />

              <div className="space-y-2.5 relative z-10">
                <div className="flex justify-between items-center">
                  <div className="h-9 w-9 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl flex items-center justify-center shadow-sm shadow-amber-500/20 group-hover:scale-105 transition-transform duration-200">
                    <Award size={18} />
                  </div>
                  <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    <ShieldCheck size={11} /> Verified
                  </span>
                </div>

                <div>
                  <span className="text-[8px] uppercase font-black text-amber-400 tracking-wider block">Official Credential</span>
                  <h3 className="font-extrabold text-xs text-foreground leading-snug group-hover:text-amber-400 transition-colors truncate">{cert.course_title}</h3>
                </div>
                
                <div className="bg-muted/40 p-2 rounded-xl border border-border/80">
                  <span className="text-[8px] text-muted-foreground block uppercase font-extrabold tracking-wider">Verification Code</span>
                  <span className="font-mono text-cyan-400 font-black tracking-wider select-all block text-[11px] truncate">{cert.certificate_code}</span>
                </div>
              </div>

              <div className="pt-2.5 border-t border-border/60 flex flex-col gap-2 relative z-10 mt-2">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                  <span>Issued: {new Date(cert.issued_at).toLocaleDateString()}</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 size={10} /> Certified
                  </span>
                </div>
                
                <a
                  href={cert.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-extrabold rounded-xl text-center flex items-center justify-center gap-1.5 shadow-sm shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all text-[11px] cursor-pointer"
                >
                  <Download size={12} />
                  <span>Download PDF</span>
                </a>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
};
