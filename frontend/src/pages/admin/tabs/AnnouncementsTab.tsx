import React, { useState } from 'react';
import { Megaphone, Plus, Trash2, X, Send, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Announcement {
  id: number;
  title: string;
  content: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  scope: string;
  created_at: string;
}

export const AnnouncementsTab: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    const saved = localStorage.getItem('apex_announcements');
    return saved ? JSON.parse(saved) : [
      { id: 1, title: 'Upcoming Server Maintenance', content: 'The LMS database will undergo standard upgrades on Sunday at 02:00 UTC. Course access may be temporarily disabled.', priority: 'HIGH', scope: 'Global Academic Scope', created_at: new Date().toISOString() },
      { id: 2, title: 'New Python Coding Workshop', content: 'A live Q&A room has been scheduled for AI Domain students. Join from the webinar panel.', priority: 'MEDIUM', scope: 'Artificial Intelligence', created_at: new Date().toISOString() }
    ];
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [scope, setScope] = useState('Global Academic Scope');

  const saveAnnouncements = (list: Announcement[]) => {
    setAnnouncements(list);
    localStorage.setItem('apex_announcements', JSON.stringify(list));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const newAnn: Announcement = {
      id: Date.now(),
      title,
      content,
      priority,
      scope,
      created_at: new Date().toISOString()
    };

    const updated = [newAnn, ...announcements];
    saveAnnouncements(updated);
    setShowAddModal(false);
    setTitle('');
    setContent('');
    setPriority('HIGH');
    setScope('Global Academic Scope');
    toast.success('Announcement broadcasted successfully!');
  };

  const handleDelete = (id: number) => {
    const updated = announcements.filter(a => a.id !== id);
    saveAnnouncements(updated);
    toast.success('Announcement removed.');
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Announcements Manager</h1>
          <p className="text-muted-foreground text-sm mt-1">Broadcast high-priority notices, schedule guidelines, and publish core alerts.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-md transition-all hover:brightness-110 active:scale-95"
        >
          <Plus size={14} />
          <span>New Broadcast</span>
        </button>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.map(ann => (
          <div key={ann.id} className="p-5 bg-card border border-border rounded-2xl shadow-sm space-y-3 relative hover:border-primary/20 transition-all">
            <button
              onClick={() => handleDelete(ann.id)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-destructive p-1 hover:bg-destructive/10 rounded-lg transition-colors"
            >
              <Trash2 size={13} />
            </button>

            <div className="flex flex-wrap gap-2 items-center text-[10px] text-muted-foreground">
              <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider ${ann.priority === 'HIGH' ? 'bg-red-500/10 border border-red-500/25 text-red-500' : ann.priority === 'MEDIUM' ? 'bg-amber-500/10 border border-amber-500/25 text-amber-500' : 'bg-muted text-muted-foreground'}`}>
                {ann.priority} Priority
              </span>
              <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-bold uppercase tracking-wider">{ann.scope}</span>
              <span className="flex items-center gap-0.5"><Clock size={10} /> {new Date(ann.created_at).toLocaleString()}</span>
            </div>

            <h3 className="font-extrabold text-sm flex items-center gap-1.5 text-foreground">
              <Megaphone size={14} className="text-primary" />
              <span>{ann.title}</span>
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{ann.content}</p>
          </div>
        ))}
        {announcements.length === 0 && (
          <div className="py-20 text-center text-muted-foreground border border-dashed border-border rounded-2xl bg-card font-medium">
            No notices or announcements currently published.
          </div>
        )}
      </div>

      {/* Add modal */}
      <AnimatePresence>
        {showAddModal && (
          <div onClick={() => setShowAddModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div onClick={(e: React.MouseEvent) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-bold text-sm">Create Broadcast Alert</h3>
                <button onClick={() => setShowAddModal(false)}><X size={16} /></button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Alert Title *</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Schedule Alterations" className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Priority Priority</label>
                    <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none font-semibold">
                      <option value="HIGH">High Priority</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Target Scope Scope</label>
                    <input type="text" value={scope} onChange={(e) => setScope(e.target.value)} required placeholder="Global / Course Name" className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Details Content *</label>
                  <textarea value={content} onChange={(e) => setContent(e.target.value)} required rows={4} placeholder="Describe the notice..." className="w-full p-3 bg-muted/40 border border-border rounded-xl outline-none resize-none" />
                </div>
                <button type="submit" className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-primary/10">
                  <Send size={12} />
                  <span>Broadcast Broadcast</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default AnnouncementsTab;
