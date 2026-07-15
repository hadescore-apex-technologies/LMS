import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import { Search, RefreshCw, Loader2, Play } from 'lucide-react';

interface Lesson {
  id: number;
  module: number;
  title: string;
  order: number;
}

export const LessonsTab: React.FC = () => {
  const [search, setSearch] = useState('');

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
      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">
          <Loader2 className="animate-spin text-primary mx-auto mb-2" size={20} />
          <span>Syncing Lessons...</span>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(les => (
            <div key={les.id} className="p-4 bg-card border border-border rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0"><Play size={14} /></div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-foreground truncate">{les.title}</h4>
                  <span className="text-[10px] text-muted-foreground font-semibold">Module ID: {les.module}</span>
                </div>
              </div>
              <span className="font-mono text-muted-foreground font-semibold">Seq #{les.order}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-20 text-center text-muted-foreground font-medium bg-card border border-border border-dashed rounded-2xl">
              No lessons registry found in catalog database.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default LessonsTab;
