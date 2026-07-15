import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import { Download, FileText, Archive, Search } from 'lucide-react';

interface Lesson {
  id: number;
  title: string;
  pdf_ppt_url?: string;
  zip_source_url?: string;
  module_title?: string;
}

interface Assignment {
  id: number;
  title: string;
  file_attachment?: string;
  module_title?: string;
}

export const DownloadsTab: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'pdf' | 'zip'>('all');

  const { data: lessons = [], isLoading: lessonsLoading } = useQuery<Lesson[]>({
    queryKey: ['downloads-lessons'],
    queryFn: async () => {
      const res = await api.get('lessons/');
      return res.data;
    }
  });

  const { data: assignments = [], isLoading: assignLoading } = useQuery<Assignment[]>({
    queryKey: ['downloads-assignments'],
    queryFn: async () => {
      const res = await api.get('assignments/list/');
      return res.data;
    }
  });

  // Extract all download resources
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
        name: `${l.title} - Code Snippets / templates`,
        type: 'zip',
        url: l.zip_source_url,
        category: 'Lesson Materials'
      });
    }
  });

  assignments.forEach(a => {
    if (a.file_attachment) {
      resources.push({
        name: `${a.title} - Guideline Instructions`,
        type: 'pdf',
        url: a.file_attachment,
        category: 'Assignment Details'
      });
    }
  });

  const filteredResources = resources.filter(res => {
    const matchesSearch = res.name.toLowerCase().includes(search.toLowerCase()) || res.category.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterType === 'all' || res.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const isLoading = lessonsLoading || assignLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-muted/40 animate-pulse rounded-2xl border border-border/30" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Downloads Center</h1>
        <p className="text-muted-foreground text-sm mt-1">Acquire technical reference guides, slide decks (PPT/PDF), and codebase templates (ZIP).</p>
      </div>

      {/* Filtering panel */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/20 border border-border/50 p-4 rounded-2xl">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-3 text-muted-foreground" size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search downloads..."
            className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-xl outline-none focus:border-primary/45 text-xs transition-all"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="w-full sm:w-48 h-10 px-3 bg-background border border-border rounded-xl outline-none focus:border-primary/45 text-xs transition-all font-semibold"
        >
          <option value="all">All File Types</option>
          <option value="pdf">PDF / PPT slides</option>
          <option value="zip">ZIP codebase / code scripts</option>
        </select>
      </div>

      {/* Resources list */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="divide-y divide-border">
          {filteredResources.map((res, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="p-2.5 bg-muted/40 border border-border/60 rounded-xl text-primary shrink-0">
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
                className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl flex items-center gap-1 hover:brightness-110 shadow-md shadow-primary/10 transition-all text-[11px] shrink-0 transform active:scale-95"
              >
                <Download size={11} />
                <span>Download</span>
              </a>
            </div>
          ))}
          {filteredResources.length === 0 && (
            <div className="py-20 text-center text-muted-foreground font-medium">
              No files or attachments matched your search details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
