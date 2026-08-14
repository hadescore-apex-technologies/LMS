import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import UniversalVideoPlayer from '../../../components/UniversalVideoPlayer';
import { Search, RefreshCw, Loader2, Play, Video, X } from 'lucide-react';

interface Lesson {
  id: number;
  module: number;
  title: string;
  order: number;
  cf_stream_id?: string;
}

export const LessonsTab: React.FC = () => {
  const [search, setSearch] = useState('');
  const [previewVideoLesson, setPreviewVideoLesson] = useState<{ id: number; title: string; url: string } | null>(null);

  // Fetch Lessons
  const { data: lessons = [], isLoading, refetch } = useQuery<Lesson[]>({
    queryKey: ['admin-all-lessons'],
    queryFn: async () => {
      const res = await api.get('lessons/');
      return res.data;
    }
  });

  const filtered = lessons.filter(l => 
    l.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Lessons Directory</h1>
          <p className="text-muted-foreground text-sm mt-1">Audit active lessons index registers across all curriculum chapters.</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-2 px-4 py-2.5 bg-muted hover:bg-muted/80 rounded-xl font-bold border border-border">
          <RefreshCw size={12} />
          <span>Sync Lessons</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/20 border border-border/50 p-4 rounded-2xl">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-3 text-muted-foreground" size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lessons..."
            className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-xl outline-none focus:border-primary/45"
          />
        </div>
      </div>

      {/* List logs */}
      <div className="space-y-3">
        {filtered.map(les => {
          const hasVideo = !!les.cf_stream_id;
          const isPlaying = previewVideoLesson?.id === les.id;

          return (
            <div key={les.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0"><Play size={14} /></div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-foreground truncate">{les.title}</h4>
                    <span className="text-[10px] text-muted-foreground font-semibold">Module ID: {les.module}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {hasVideo && (
                    <button 
                      onClick={() => setPreviewVideoLesson(isPlaying ? null : { id: les.id, title: les.title, url: les.cf_stream_id || '' })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isPlaying 
                          ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/30' 
                          : 'bg-primary/10 text-primary hover:bg-primary/20'
                      }`}
                    >
                      <Video size={13} />
                      <span>{isPlaying ? 'Hide Video' : 'Watch Video'}</span>
                    </button>
                  )}
                  <span className="font-mono text-muted-foreground font-semibold">Seq #{les.order}</span>
                </div>
              </div>

              {/* Video Preview Box */}
              {isPlaying && (
                <div className="border-t border-border bg-slate-950 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-bold flex items-center gap-1.5 text-cyan-400">
                      <Video size={14} /> {les.title} (Video Preview)
                    </span>
                    <button 
                      onClick={() => setPreviewVideoLesson(null)} 
                      className="px-2 py-0.5 text-[10px] bg-slate-800 text-slate-300 hover:text-white rounded-md flex items-center gap-1"
                    >
                      <X size={11} /> Close Player
                    </button>
                  </div>
                  <div className="relative aspect-video max-w-lg mx-auto rounded-xl overflow-hidden bg-black border border-cyan-500/30 shadow-2xl">
                    <UniversalVideoPlayer src={les.cf_stream_id || ''} title={les.title} autoPlay={true} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-20 text-center text-muted-foreground font-medium bg-card border border-border border-dashed rounded-2xl">
            No lessons registry found in catalog database.
          </div>
        )}
      </div>
    </div>
  );
};
export default LessonsTab;
