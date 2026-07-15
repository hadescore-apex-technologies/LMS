import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FileText, Search, Edit2, Trash2, Save, X, Loader2 } from 'lucide-react';

interface Note {
  id: number;
  lesson: number;
  lesson_title: string;
  course_id: number;
  course_title: string;
  text: string;
  created_at: string;
}

const NotesManager: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Editing Note State
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const res = await api.get('lessons/notes/');
      setNotes(res.data);
    } catch (err) {
      toast.error('Failed to load notes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this study note?')) return;
    try {
      await api.delete(`lessons/notes/${id}/`);
      toast.success('Note deleted!');
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      toast.error('Failed to delete note.');
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editText.trim()) return;
    try {
      setSaving(true);
      await api.patch(`lessons/notes/${id}/`, { text: editText });
      toast.success('Note updated!');
      setNotes(prev => prev.map(n => n.id === id ? { ...n, text: editText } : n));
      setEditingNoteId(null);
    } catch (err) {
      toast.error('Failed to update note.');
    } finally {
      setSaving(false);
    }
  };

  const filteredNotes = notes.filter(note => {
    const query = searchQuery.toLowerCase();
    return (
      note.text.toLowerCase().includes(query) ||
      note.lesson_title.toLowerCase().includes(query) ||
      note.course_title.toLowerCase().includes(query)
    );
  });

  // Group notes by course
  const notesByCourse = filteredNotes.reduce((groups, note) => {
    const title = note.course_title;
    if (!groups[title]) {
      groups[title] = [];
    }
    groups[title].push(note);
    return groups;
  }, {} as Record<string, Note[]>);

  if (loading && notes.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in text-xs">
      {/* Search Header */}
      <div className="glass-panel p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <FileText className="text-primary" size={16} />
          <span>My Lesson Study Notes ({filteredNotes.length})</span>
        </h3>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={14} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes content or lesson title..."
            className="w-full h-9 pl-9 pr-4 bg-background border border-border rounded-xl outline-none focus:border-primary/40 text-xs transition-all"
          />
        </div>
      </div>

      {/* Notes list grouped by course */}
      <div className="space-y-6">
        {Object.entries(notesByCourse).map(([courseTitle, courseNotes]) => (
          <div key={courseTitle} className="space-y-3">
            <h4 className="font-extrabold text-sm border-l-2 border-primary pl-2 uppercase tracking-wide text-foreground/80">
              {courseTitle}
            </h4>

            <div className="grid gap-4 sm:grid-cols-2">
              {courseNotes.map((note) => (
                <div key={note.id} className="p-4 glass-card rounded-xl shadow-sm border border-border/50 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded uppercase">
                      {note.lesson_title}
                    </span>
                    {editingNoteId === note.id ? (
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full p-2 bg-background border border-border rounded-lg outline-none text-xs leading-normal resize-none"
                        rows={3}
                      />
                    ) : (
                      <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">{note.text}</p>
                    )}
                  </div>

                  <div className="flex justify-between items-center border-t border-border/30 pt-2 text-[9px] text-muted-foreground font-semibold">
                    <span>{new Date(note.created_at).toLocaleDateString()}</span>
                    <div className="flex items-center gap-2">
                      {editingNoteId === note.id ? (
                        <>
                          <button
                            onClick={() => handleUpdate(note.id)}
                            disabled={saving}
                            className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded"
                          >
                            <Save size={12} />
                          </button>
                          <button
                            onClick={() => setEditingNoteId(null)}
                            className="p-1 text-muted-foreground hover:bg-muted rounded"
                          >
                            <X size={12} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => { setEditingNoteId(note.id); setEditText(note.text); }}
                            className="p-1 text-primary hover:bg-primary/10 rounded"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(note.id)}
                            className="p-1 text-destructive hover:bg-destructive/10 rounded"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredNotes.length === 0 && (
          <div className="py-16 text-center text-muted-foreground font-medium bg-muted/15 border border-dashed border-border rounded-2xl">
            No saved notes match your query. Write notes inside the lesson video player!
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesManager;
