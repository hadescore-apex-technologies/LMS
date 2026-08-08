import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import { Layers, Search, RefreshCw, Loader2 } from 'lucide-react';

interface Module {
  id: number;
  title: string;
  course: number;
  course_title?: string;
  order: number;
}

export const ModulesTab: React.FC = () => {
  const [search, setSearch] = useState('');

  // Fetch Modules
  const { data: modules = [], isLoading, refetch } = useQuery<Module[]>({
    queryKey: ['admin-all-modules'],
    queryFn: async () => {
      const res = await api.get('modules/');
      return res.data;
    }
  });

  const filtered = modules.filter(m => 
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Curriculum Modules</h1>
          <p className="text-muted-foreground text-sm mt-1">Audit chapter structures across active course training tracks.</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-2 px-4 py-2.5 bg-muted hover:bg-muted/80 rounded-xl font-bold border border-border">
          <RefreshCw size={12} />
          <span>Sync Modules</span>
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
            placeholder="Search modules..."
            className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-xl outline-none focus:border-primary/45"
          />
        </div>
      </div>

      {/* Grid */}
      
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(mod => (
            <div key={mod.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
              <div className="p-2 bg-primary/10 text-primary w-fit rounded-lg"><Layers size={16} /></div>
              <h4 className="font-extrabold text-sm text-foreground">{mod.title}</h4>
              <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1.5 border-t border-border/50">
                <span>Course ID: {mod.course}</span>
                <span>Sequence: #{mod.order}</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center text-muted-foreground bg-card border border-border border-dashed rounded-2xl font-medium">
              No modules logged in database.
            </div>
          )}
        </div>
    </div>
  );
};
export default ModulesTab;
