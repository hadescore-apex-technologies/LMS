import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Upload, Trash2, Video, Search, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoRecord {
  id: number;
  title: string;
  cf_stream_id: string;
  duration?: number;
  status: 'READY' | 'PROCESSING' | 'FAILED';
  created_at: string;
}

export const VideoLibraryTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [streamId, setStreamId] = useState('');
  const [duration, setDuration] = useState('180');

  // Queries
  const { data: videos = [], isLoading } = useQuery<VideoRecord[]>({
    queryKey: ['admin-videos-list'],
    queryFn: async () => {
      const saved = localStorage.getItem('apex_videos');
      if (saved) return JSON.parse(saved);
      const defaultVideos: VideoRecord[] = [
        { id: 1, title: 'Introduction to Django ORM', cf_stream_id: 'cf-stream-9012', duration: 320, status: 'READY', created_at: new Date().toISOString() },
        { id: 2, title: 'Redux Toolkit Global Store Setup', cf_stream_id: 'cf-stream-4581', duration: 480, status: 'READY', created_at: new Date().toISOString() }
      ];
      localStorage.setItem('apex_videos', JSON.stringify(defaultVideos));
      return defaultVideos;
    }
  });

  const uploadVideoMutation = useMutation({
    mutationFn: async () => {
      const list = [...videos];
      list.push({
        id: Date.now(),
        title: videoTitle,
        cf_stream_id: streamId || `cf-stream-${Math.floor(Math.random() * 10000)}`,
        duration: Number(duration),
        status: 'READY',
        created_at: new Date().toISOString()
      });
      localStorage.setItem('apex_videos', JSON.stringify(list));
      return list;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-videos-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      setShowUploadModal(false);
      setVideoTitle('');
      setStreamId('');
      setDuration('180');
      toast.success('Video registered in Stream library.');
    }
  });

  const deleteVideoMutation = useMutation({
    mutationFn: async (id: number) => {
      const updated = videos.filter(v => v.id !== id);
      localStorage.setItem('apex_videos', JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-videos-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Video record removed.');
    }
  });

  const filtered = videos.filter(v => 
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    v.cf_stream_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Cloudflare Stream Library</h1>
          <p className="text-muted-foreground text-sm mt-1">Audit, upload, sync, and review class recording stream parameters.</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-md transition-all hover:brightness-110 active:scale-95"
        >
          <Upload size={14} />
          <span>Upload Stream Video</span>
        </button>
      </div>

      {/* Control filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/20 border border-border/50 p-4 rounded-2xl">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-3 text-muted-foreground" size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by video title or Cloudflare Stream ID..."
            className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-xl outline-none focus:border-primary/45"
          />
        </div>
      </div>

      {/* Roster list grid */}
      
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(v => (
            <div key={v.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="p-2 bg-primary/10 text-primary rounded-xl"><Video size={16} /></div>
                  <div className="flex gap-2">
                    <span className="text-[9px] px-2 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">{v.status}</span>
                    <button onClick={() => { if (window.confirm('Delete stream item?')) deleteVideoMutation.mutate(v.id); }} className="text-muted-foreground hover:text-destructive"><Trash2 size={13} /></button>
                  </div>
                </div>
                <h4 className="font-extrabold text-sm leading-tight text-foreground/90">{v.title}</h4>
                <p className="font-mono text-[9px] text-muted-foreground mt-1.5 truncate">Stream ID: {v.cf_stream_id}</p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-3 mt-4 border-t border-border/50 font-semibold">
                <Clock size={11} />
                <span>Duration: {v.duration ? Math.floor(v.duration / 60) : 3} mins</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center text-muted-foreground border border-dashed border-border rounded-2xl">
              No stream records matching search metrics.
            </div>
          )}
        </div>

      {/* Upload modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div onClick={() => setShowUploadModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-bold text-sm">Upload Video to Stream Library</h3>
                <button onClick={() => setShowUploadModal(false)}><X size={16} /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); uploadVideoMutation.mutate(); }} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Video Title *</label>
                  <input type="text" value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} required placeholder="e.g. Docker Containarization" className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Cloudflare Stream ID (Optional)</label>
                  <input type="text" value={streamId} onChange={(e) => setStreamId(e.target.value)} placeholder="e.g. cf-stream-uuid" className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Duration (Seconds) *</label>
                  <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} required className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                </div>
                <button type="submit" disabled={uploadVideoMutation.isPending} className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-primary/10">
                  <Upload size={12} />
                  <span>Register Video</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default VideoLibraryTab;
