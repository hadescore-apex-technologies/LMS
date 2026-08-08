import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { Download, FileText, Archive, Search, Plus, Loader2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Lesson {
  id: number;
  title: string;
  pdf_ppt_url?: string;
  zip_source_url?: string;
}

interface Assignment {
  id: number;
  title: string;
  file_attachment?: string;
}

export const DownloadsTab: React.FC = () => {
  const [search, setSearch] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  // Queries
  const { data: lessons = [], isLoading: lessonsLoading } = useQuery<Lesson[]>({
    queryKey: ['downloads-lessons-list'],
    queryFn: async () => {
      const res = await api.get('lessons/');
      return res.data;
    }
  });

  const { data: assignments = [], isLoading: assignLoading } = useQuery<Assignment[]>({
    queryKey: ['downloads-assignments-list'],
    queryFn: async () => {
      const res = await api.get('assignments/list/');
      return res.data;
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await api.post('core/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadedUrl(res.data.url);
      toast.success('Core resource uploaded successfully!');
    } catch {
      toast.error('Failed to upload file.');
    } finally {
      setUploading(false);
    }
  };

  const resources: Array<{ name: string; type: 'pdf' | 'zip'; url: string; category: string }> = [];

  lessons.forEach(l => {
    if (l.pdf_ppt_url) {
      resources.push({
        name: `${l.title} - Slide Deck Notes`,
        type: 'pdf',
        url: l.pdf_ppt_url,
        category: 'Lesson Slides'
      });
    }
    if (l.zip_source_url) {
      resources.push({
        name: `${l.title} - Code templates`,
        type: 'zip',
        url: l.zip_source_url,
        category: 'Lesson Source Files'
      });
    }
  });

  assignments.forEach(a => {
    if (a.file_attachment) {
      resources.push({
        name: `${a.title} - Guidelines Document`,
        type: 'pdf',
        url: a.file_attachment,
        category: 'Assignment Guidelines'
      });
    }
  });

  const filteredResources = resources.filter(res => 
    res.name.toLowerCase().includes(search.toLowerCase()) || 
    res.category.toLowerCase().includes(search.toLowerCase())
  );

  const isLoading = lessonsLoading || assignLoading;

  return (
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Downloads Center</h1>
          <p className="text-muted-foreground text-sm mt-1">Audit uploaded reference documents, slide decks (PDF), and code templates (ZIP).</p>
        </div>
        <button
          onClick={() => { setUploadedUrl(''); setShowUploadModal(true); }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-md transition-all hover:brightness-110 active:scale-95"
        >
          <Plus size={14} />
          <span>Upload File</span>
        </button>
      </div>

      {/* Search Filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/20 border border-border/50 p-4 rounded-2xl">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-3 text-muted-foreground" size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search downloads directory..."
            className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-xl outline-none focus:border-primary/45"
          />
        </div>
      </div>

      {/* Directory log list */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        
          <div className="divide-y divide-border">
            {filteredResources.map((res, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-2.5 bg-muted/40 border border-border rounded-xl text-primary shrink-0">
                    {res.type === 'pdf' ? <FileText size={16} /> : <Archive size={16} />}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block">{res.category}</span>
                    <h4 className="font-extrabold text-sm text-foreground/90 truncate">{res.name}</h4>
                  </div>
                </div>

                <a
                  href={res.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl flex items-center gap-1 hover:brightness-110 shadow-md shadow-primary/10 text-[11px] shrink-0"
                >
                  <Download size={11} />
                  <span>Download</span>
                </a>
              </div>
            ))}
            {filteredResources.length === 0 && (
              <div className="py-20 text-center text-muted-foreground font-medium">
                No files match your searching description.
              </div>
            )}
          </div>
      </div>

      {/* Upload modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div onClick={() => setShowUploadModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-bold text-sm">Upload Core File</h3>
                <button onClick={() => setShowUploadModal(false)}><X size={16} /></button>
              </div>
              <div className="space-y-4">
                <div className="p-5 bg-muted/20 border border-dashed border-border rounded-xl text-center">
                  {uploadedUrl ? (
                    <div className="space-y-2">
                      <Check className="mx-auto text-emerald-500" size={24} />
                      <span className="font-bold text-emerald-500 block">File uploaded successfully!</span>
                      <p className="font-mono text-[9px] truncate bg-card p-2 rounded border border-border">{uploadedUrl}</p>
                    </div>
                  ) : (
                    <label className="cursor-pointer block space-y-2">
                      {uploading ? <Loader2 className="animate-spin text-primary mx-auto" size={20} /> : <Plus className="mx-auto text-primary" size={20} />}
                      <span className="font-semibold block">Select PDF or ZIP template</span>
                      <input type="file" onChange={handleFileUpload} className="hidden" />
                    </label>
                  )}
                </div>
                <button onClick={() => setShowUploadModal(false)} className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl">
                  Close Drawer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default DownloadsTab;
