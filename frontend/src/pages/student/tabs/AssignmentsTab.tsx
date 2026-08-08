import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { 
  FileText, Upload, Download, 
  Loader2, X, Trash2 
} from 'lucide-react';

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

export const AssignmentsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [localUrls, setLocalUrls] = useState<Record<number, string>>({});
  const [localNotes, setLocalNotes] = useState<Record<number, string>>({});
  const [uploadingId, setUploadingId] = useState<number | null>(null);

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
      toast.success('Submission deleted successfully.');
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.error || 'Failed to delete submission.';
      toast.error(errMsg);
    }
  });

  const handleDeleteSubmission = (id: number) => {
    if (window.confirm('Are you sure you want to delete your submission?')) {
      deleteSubmissionMutation.mutate(id);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, assignId: number) => {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Homework Tracker</h1>
        <p className="text-muted-foreground text-sm mt-1">Submit deliverables and check grading reports.</p>
      </div>

      <div className="space-y-6">
        {assignments.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground bg-card border border-dashed border-border rounded-2xl">
            No assignments have been assigned to your course modules yet.
          </div>
        ) : (
          assignments.map(assign => {
            const submission = submissions.find(s => s.assignment === assign.id);
            const uUrl = localUrls[assign.id] || '';
            const uNotes = localNotes[assign.id] || '';

            return (
              <div key={assign.id} className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4 hover:border-primary/20 transition-all flex flex-col justify-between">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border pb-3">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-primary uppercase tracking-wider block">
                      {assign.course_title || 'Apex Track'} &rsaquo; {assign.module_title || 'Module'}
                    </span>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base leading-snug">{assign.title}</h3>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 font-extrabold uppercase tracking-wider">
                        Open Submission • No Deadline
                      </span>
                    </div>
                  </div>

                  <div>
                    {!submission ? (
                      <span className="text-[9px] px-2.5 py-1 rounded-xl bg-muted border border-border text-muted-foreground font-bold uppercase tracking-wider">
                        Not Submitted
                      </span>
                    ) : submission.status === 'PENDING' ? (
                      <span className="text-[9px] px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-500 font-bold uppercase tracking-wider">
                        Pending Review
                      </span>
                    ) : submission.status === 'GRADED' ? (
                      <span className="text-[9px] px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 font-bold uppercase tracking-wider">
                        Graded ({submission.grade})
                      </span>
                    ) : (
                      <span className="text-[9px] px-2.5 py-1 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive font-bold uppercase tracking-wider">
                        Needs Revision
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{assign.description}</p>

                {assign.file_attachment && (
                  <a
                    href={assign.file_attachment}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] text-primary font-semibold hover:underline bg-primary/5 border border-primary/10 px-3 py-1.5 rounded-xl transition-all self-start"
                  >
                    <Download size={11} />
                    <span>Download Assignment Guidelines</span>
                  </a>
                )}

                {/* Submissions & reviews */}
                {submission && (
                  <div className="p-4 bg-muted/40 border border-border/80 rounded-xl space-y-3 text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-border/50">
                      <span className="text-[10px] font-bold text-muted-foreground block uppercase">Submission Details</span>
                      {submission.status !== 'GRADED' && (
                        <button
                          onClick={() => handleDeleteSubmission(submission.id)}
                          disabled={deleteSubmissionMutation.isPending}
                          className="px-2 py-1 text-[10px] text-destructive hover:bg-destructive/10 disabled:opacity-50 rounded-lg transition-all font-bold flex items-center gap-1"
                        >
                          <Trash2 size={12} />
                          <span>Delete Submission</span>
                        </button>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground block uppercase">Submission File</span>
                        <a href={submission.file_submission} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium truncate block">
                          {submission.file_submission.split('/').pop() || 'Submitted Homework File'}
                        </a>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground block uppercase">Submitted At</span>
                        <span className="text-foreground/90 font-medium">{new Date(submission.submitted_at).toLocaleString()}</span>
                      </div>
                    </div>



                    {submission.notes && (
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground block uppercase">Submission Notes</span>
                        <p className="text-muted-foreground italic mt-0.5">"{submission.notes}"</p>
                      </div>
                    )}

                    {(submission.feedback || submission.grade) && (
                      <div className="pt-2.5 border-t border-border/60 bg-primary/5 -mx-4 -mb-4 p-4 rounded-b-xl space-y-1">
                        <span className="text-[10px] font-bold text-primary uppercase block">Instructor Review Verdict</span>
                        {submission.grade && <p className="font-bold text-foreground">Score / Grade: <span className="text-primary">{submission.grade}</span></p>}
                        {submission.feedback && <p className="text-muted-foreground leading-relaxed mt-1 italic">"{submission.feedback}"</p>}
                      </div>
                    )}
                  </div>
                )}

                {(!submission || submission.status === 'REJECTED') && (
                  <div className="space-y-3 pt-3 border-t border-border/50">
                    <h5 className="font-bold text-xs text-foreground/80">{submission ? 'Submit Revised Deliverable' : 'Upload Deliverable'}</h5>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Assignment File</label>
                        {uUrl ? (
                          <div className="flex items-center gap-2 h-10 px-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl">
                            <FileText size={13} className="shrink-0" />
                            <span className="text-[10px] truncate flex-1">{uUrl.split('/').pop()}</span>
                            <button onClick={() => setLocalUrls(prev => ({ ...prev, [assign.id]: '' }))} className="text-destructive"><X size={12} /></button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-2 h-10 px-3 bg-muted/40 border border-dashed border-border rounded-xl cursor-pointer hover:border-primary/45 transition-all text-muted-foreground">
                            {uploadingId === assign.id ? <Loader2 size={13} className="animate-spin text-primary" /> : <Upload size={13} />}
                            <span>Select Deliverable (.zip, .pdf, .docx...)</span>
                            <input type="file" onChange={(e) => handleFileUpload(e, assign.id)} className="hidden" />
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
                          className="w-full h-10 px-3 text-xs bg-muted/40 border border-border rounded-xl outline-none focus:border-primary/45 focus:bg-background transition-all"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => submitHomeworkMutation.mutate({ assignId: assign.id, url: uUrl, notes: uNotes })}
                      disabled={!uUrl || submitHomeworkMutation.isPending}
                      className="py-2.5 px-4 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2 self-start transform active:scale-95"
                    >
                      <Upload size={12} />
                      <span>{submission ? 'Resubmit Deliverable' : 'Push Submission'}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
