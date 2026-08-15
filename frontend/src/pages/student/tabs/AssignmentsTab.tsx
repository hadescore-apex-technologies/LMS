import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, type Variants } from 'framer-motion';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { 
  FileText, Upload, Download, 
  Loader2, X, Trash2, CheckCircle2, Clock, 
  AlertCircle, Sparkles, Filter, FileCheck 
} from 'lucide-react';
import { downloadFileDirectly } from '../../../utils/downloadHelper';

interface Assignment {
  id: number;
  module: number;
  module_title: string;
  course_title: string;
  title: string;
  description: string;
  file_attachment?: string;
  due_date?: string;
}

interface Submission {
  id: number;
  assignment: number;
  file_submission: string;
  notes?: string;
  status: 'PENDING' | 'GRADED' | 'REJECTED';
  grade?: string;
  feedback?: string;
  plagiarism_score?: number;
  submitted_at: string;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } }
};

export const AssignmentsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [localUrls, setLocalUrls] = useState<Record<number, string>>({});
  const [localNotes, setLocalNotes] = useState<Record<number, string>>({});
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'NOT_SUBMITTED' | 'PENDING' | 'GRADED'>('ALL');

  // 1. Fetch Assignments
  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ['assignments-tracker'],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const res = await api.get('assignments/list/');
      return res.data;
    }
  });

  // 2. Fetch Submissions
  const { data: submissions = [] } = useQuery<Submission[]>({
    queryKey: ['submissions-tracker'],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const res = await api.get('assignments/submissions/');
      return res.data;
    }
  });

  // Submit Homework Mutation
  const submitHomeworkMutation = useMutation({
    mutationFn: async ({ assignId, url, notes }: { assignId: number; url: string; notes: string }) => {
      await api.post('assignments/submissions/', {
        assignment: assignId,
        file_submission: url,
        notes: notes
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['submissions-tracker'] });
      setLocalUrls(prev => ({ ...prev, [variables.assignId]: '' }));
      setLocalNotes(prev => ({ ...prev, [variables.assignId]: '' }));
      toast.success('Homework uploaded successfully!');
    },
    onError: () => {
      toast.error('Failed to upload homework.');
    }
  });

  // Delete Submission Mutation
  const deleteSubmissionMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`assignments/submissions/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions-tracker'] });
      toast.success('Submission removed.');
    },
    onError: () => {
      toast.error('Failed to delete submission.');
    }
  });

  const handleDeleteSubmission = (id: number) => {
    if (window.confirm('Are you sure you want to delete your submission?')) {
      deleteSubmissionMutation.mutate(id);
    }
  };

  const handleFileUpload = async (assignId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingId(assignId);
    try {
      const res = await api.post('core/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setLocalUrls(prev => ({ ...prev, [assignId]: res.data.url }));
      toast.success(`Uploaded: ${file.name}`);
    } catch {
      toast.error('File upload failed.');
    } finally {
      setUploadingId(null);
    }
  };

  const filteredAssignments = assignments.filter(assign => {
    const sub = submissions.find(s => s.assignment === assign.id);
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'NOT_SUBMITTED') return !sub;
    if (filterStatus === 'PENDING') return sub?.status === 'PENDING';
    if (filterStatus === 'GRADED') return sub?.status === 'GRADED';
    return true;
  });

  return (
    <div className="w-full space-y-3.5 text-xs animate-fade-in">
      {/* ── UNIFIED COMPACT HEADER & FILTERS BAR ────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black shadow-md shadow-emerald-500/20 border border-emerald-400">
            <FileCheck size={18} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
              <span>Academic Homework & Deliverables</span>
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Submit coursework deliverables, track grading verdicts, and view mentor feedback.
            </p>
          </div>
        </div>

        {/* Filter Pills (Integrated in header row) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {[
            { label: `All (${assignments.length})`, val: 'ALL' },
            { label: `Pending (${assignments.filter(a => !submissions.some(s => s.assignment === a.id)).length})`, val: 'NOT_SUBMITTED' },
            { label: `Review (${submissions.filter(s => s.status === 'PENDING').length})`, val: 'PENDING' },
            { label: `Graded (${submissions.filter(s => s.status === 'GRADED').length})`, val: 'GRADED' },
          ].map(tab => (
            <button
              key={tab.val}
              onClick={() => setFilterStatus(tab.val as any)}
              className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border cursor-pointer ${
                filterStatus === tab.val
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-sm shadow-emerald-500/20 scale-102'
                  : 'bg-card text-muted-foreground border-border/80 hover:bg-muted hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {filteredAssignments.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground bg-card border border-dashed border-border rounded-3xl p-8 shadow-xs">
            No assignments match the selected status filter.
          </div>
        ) : (
          filteredAssignments.map(assign => {
            const submission = submissions.find(s => s.assignment === assign.id);
            const uUrl = localUrls[assign.id] || '';
            const uNotes = localNotes[assign.id] || '';

            return (
              <motion.div 
                variants={itemVariants}
                key={assign.id} 
                className="rounded-3xl cyber-glass-card p-5 shadow-sm space-y-4 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all flex flex-col justify-between"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-cyan-500/20 pb-3">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-cyan-400 uppercase tracking-wider block">
                      {assign.course_title || 'Apex Track'} &rsaquo; {assign.module_title || 'Module'}
                    </span>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-extrabold text-sm leading-snug text-white">{assign.title}</h3>
                      <span className="text-[9px] px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-extrabold uppercase tracking-wider">
                        Open Submission • No Deadline
                      </span>
                    </div>
                  </div>

                  <div>
                    {!submission ? (
                      <span className="text-[9px] px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-400 font-black uppercase tracking-wider">
                        Not Submitted
                      </span>
                    ) : submission.status === 'PENDING' ? (
                      <span className="text-[9px] px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-black uppercase tracking-wider flex items-center gap-1">
                        <Clock size={11} /> Pending Review
                      </span>
                    ) : submission.status === 'GRADED' ? (
                      <span className="text-[9px] px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-black uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 size={11} /> Graded ({submission.grade})
                      </span>
                    ) : (
                      <span className="text-[9px] px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-black uppercase tracking-wider flex items-center gap-1">
                        <AlertCircle size={11} /> Needs Revision
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{assign.description}</p>

                {assign.file_attachment && (
                  <button
                    type="button"
                    onClick={() => downloadFileDirectly(assign.file_attachment!, `${assign.title || 'Assignment'}_Guidelines.pdf`)}
                    className="inline-flex items-center gap-1.5 text-[11px] text-cyan-600 font-bold hover:underline bg-cyan-500/5 border border-cyan-500/15 px-3.5 py-2 rounded-2xl transition-all self-start cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Download Assignment Guidelines</span>
                  </button>
                )}

                {/* Submissions & reviews */}
                {submission && (
                  <div className="p-5 bg-muted/30 border border-border/80 rounded-2xl space-y-3 text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-border/50">
                      <span className="text-[10px] font-extrabold text-muted-foreground block uppercase tracking-wider">Submission Details</span>
                      {submission.status !== 'GRADED' && (
                        <button
                          onClick={() => handleDeleteSubmission(submission.id)}
                          disabled={deleteSubmissionMutation.isPending}
                          className="px-2.5 py-1 text-[10px] text-rose-600 hover:bg-rose-50 disabled:opacity-50 rounded-xl transition-all font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={12} />
                          <span>Delete Submission</span>
                        </button>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground block uppercase">Submission File</span>
                        <button
                          type="button"
                          onClick={() => downloadFileDirectly(submission.file_submission, `Submission_${submission.id || 'Homework'}.pdf`)}
                          className="text-cyan-600 hover:underline font-bold truncate block text-left cursor-pointer flex items-center gap-1.5 mt-0.5"
                        >
                          <Download size={12} className="shrink-0" />
                          <span className="truncate">{submission.file_submission.split('/').pop() || 'Submitted Homework File'}</span>
                        </button>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground block uppercase">Submitted At</span>
                        <span className="text-foreground font-semibold">{new Date(submission.submitted_at).toLocaleString()}</span>
                      </div>
                    </div>

                    {submission.notes && (
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground block uppercase">Submission Notes</span>
                        <p className="text-muted-foreground italic mt-0.5">"{submission.notes}"</p>
                      </div>
                    )}

                    {(submission.feedback || submission.grade) && (
                      <div className="pt-3 border-t border-border/60 bg-cyan-500/5 -mx-5 -mb-5 p-5 rounded-b-2xl space-y-1">
                        <span className="text-[10px] font-extrabold text-cyan-700 uppercase block tracking-wider">Mentor Review Verdict</span>
                        {submission.grade && <p className="font-bold text-foreground">Score / Grade: <span className="text-cyan-600 font-extrabold">{submission.grade}</span></p>}
                        {submission.feedback && <p className="text-muted-foreground leading-relaxed mt-1 italic">"{submission.feedback}"</p>}
                      </div>
                    )}
                  </div>
                )}

                {(!submission || submission.status === 'REJECTED') && (
                  <div className="space-y-3 pt-3 border-t border-border/50">
                    <h5 className="font-extrabold text-xs text-foreground">{submission ? 'Submit Revised Deliverable' : 'Upload Deliverable'}</h5>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Assignment File</label>
                        {uUrl ? (
                          <div className="flex items-center gap-2 h-11 px-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-2xl">
                            <FileText size={14} className="shrink-0" />
                            <span className="text-[10px] truncate flex-1 font-semibold">{uUrl.split('/').pop()}</span>
                            <button onClick={() => setLocalUrls(prev => ({ ...prev, [assign.id]: '' }))} className="text-rose-500 cursor-pointer"><X size={13} /></button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-2 h-11 px-3 bg-muted/40 border border-dashed border-border/80 rounded-2xl cursor-pointer hover:border-cyan-500 hover:bg-cyan-50/30 transition-all text-muted-foreground font-semibold">
                            {uploadingId === assign.id ? <Loader2 size={14} className="animate-spin text-cyan-600" /> : <Upload size={14} />}
                            <span>Select Deliverable (.zip, .pdf, .docx...)</span>
                            <input type="file" onChange={(e) => handleFileUpload(assign.id, e)} className="hidden" />
                          </label>
                        )}
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Notes for Grader</label>
                        <input
                          type="text"
                          value={uNotes}
                          onChange={(e) => setLocalNotes(prev => ({ ...prev, [assign.id]: e.target.value }))}
                          placeholder="Provide details on your answer..."
                          className="w-full h-11 px-3.5 text-xs bg-muted/30 border border-border/80 rounded-2xl outline-none focus:border-cyan-500 focus:bg-background transition-all"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => submitHomeworkMutation.mutate({ assignId: assign.id, url: uUrl, notes: uNotes })}
                      disabled={!uUrl || submitHomeworkMutation.isPending}
                      className="py-2.5 px-5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-extrabold text-xs rounded-2xl hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2 self-start transform active:scale-95 shadow-md shadow-cyan-500/20 cursor-pointer"
                    >
                      <Upload size={13} />
                      <span>{submission ? 'Resubmit Deliverable' : 'Push Submission'}</span>
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </motion.div>
    </div>
  );
};
