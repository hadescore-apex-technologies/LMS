import React, { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../../../services/api';
import { 
  X, Send, Bot, Sparkles, BookOpen, 
  HelpCircle, Highlighter, Layers, FileText, Loader2
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface Message {
  sender: 'student' | 'ai';
  text: string;
}

interface AITutorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: number | null;
  courseId: number;
}

export const AITutorDrawer: React.FC<AITutorDrawerProps> = ({ isOpen, onClose, lessonId, courseId }) => {
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'ai', text: 'Hello! I am your **Apex AI Academic Tutor**. How can I help you master the course curriculum today?' }
  ]);
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // AI Tutor Mutation
  const tutorMutation = useMutation({
    mutationFn: async ({ prompt, action }: { prompt: string; action: string }) => {
      const res = await api.post('courses/ai-tutor/', {
        action,
        prompt,
        lesson_id: lessonId,
        course_id: courseId
      });
      return res.data;
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, { sender: 'ai', text: data.answer }]);
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.error || 'Failed to communicate with AI Tutor.';
      toast.error(errMsg);
      setMessages(prev => [...prev, { sender: 'ai', text: `⚠️ **Error:** ${errMsg}` }]);
    }
  });

  const handleSend = () => {
    if (!input.trim() || tutorMutation.isPending) return;
    const userPrompt = input;
    setInput('');
    setMessages(prev => [...prev, { sender: 'student', text: userPrompt }]);
    tutorMutation.mutate({ prompt: userPrompt, action: 'ask' });
  };

  const handleQuickAction = (action: 'summarize' | 'notes' | 'flashcards' | 'quiz' | 'explain') => {
    if (tutorMutation.isPending) return;
    
    let actionLabel = '';
    if (action === 'summarize') actionLabel = 'Summarize this lesson';
    else if (action === 'notes') actionLabel = 'Generate structured study notes';
    else if (action === 'flashcards') actionLabel = 'Generate practice flashcards';
    else if (action === 'quiz') actionLabel = 'Create a short practice quiz';
    else if (action === 'explain') actionLabel = 'Explain core technical concepts';

    setMessages(prev => [...prev, { sender: 'student', text: `[Action] ${actionLabel}` }]);
    tutorMutation.mutate({ prompt: '', action });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay backdrop */}
          <div 
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          {/* Slide-out Panel */}
          <aside className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[480px] bg-card border-l border-border flex flex-col justify-between shadow-2xl animate-slide-in text-xs">
            {/* Header */}
            <div className="h-16 border-b border-border px-5 flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary/10 border border-primary/20 rounded-xl text-primary flex items-center justify-center">
                  <Bot size={18} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm flex items-center gap-1.5">
                    <span>Apex AI Tutor</span>
                    <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 bg-gradient-to-r from-primary to-accent rounded-full text-white font-bold tracking-wide uppercase"><Sparkles size={8} /> Active</span>
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase">Enrolled Course Advisor</p>
                </div>
              </div>

              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-muted border border-transparent hover:border-border rounded-xl transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`flex gap-3 max-w-[85%] ${msg.sender === 'student' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  <div className={`h-8 w-8 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 select-none ${msg.sender === 'student' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-muted/40 border-border text-foreground/80'}`}>
                    {msg.sender === 'student' ? 'S' : <Bot size={14} />}
                  </div>

                  <div className={`p-3.5 rounded-2xl leading-relaxed whitespace-pre-wrap ${msg.sender === 'student' ? 'bg-primary text-primary-foreground font-semibold rounded-tr-none' : 'bg-muted/30 border border-border/80 text-foreground/95 rounded-tl-none prose prose-invert prose-xs'}`}>
                    {/* Basic Markdown rendering for headers & lists */}
                    {msg.text.split('\n').map((line, lIdx) => {
                      if (line.startsWith('###')) {
                        return <h4 key={lIdx} className="font-bold text-xs text-foreground mt-2 mb-1">{line.replace('###', '').trim()}</h4>;
                      }
                      if (line.startsWith('####') || line.startsWith('🔹') || line.startsWith('🔸')) {
                        return <h5 key={lIdx} className="font-bold text-[11px] text-foreground mt-2 mb-1">{line.trim()}</h5>;
                      }
                      if (line.startsWith('-') || line.startsWith('*')) {
                        return <li key={lIdx} className="list-disc list-inside ml-2 text-muted-foreground/95">{line.substring(1).trim()}</li>;
                      }
                      return <p key={lIdx} className="mb-1 leading-relaxed">{line}</p>;
                    })}
                  </div>
                </div>
              ))}

              {tutorMutation.isPending && (
                <div className="flex gap-3 max-w-[85%] mr-auto items-center text-muted-foreground">
                  <div className="h-8 w-8 rounded-lg bg-muted/45 border border-border flex items-center justify-center animate-spin">
                    <Loader2 size={13} />
                  </div>
                  <span>Thinking and analyzing course materials...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Actions Drawer Footer */}
            <div className="p-4 border-t border-border bg-muted/10 space-y-3.5">
              <div className="flex flex-wrap gap-2">
                {[
                  { action: 'summarize', label: 'Summarize', icon: FileText },
                  { action: 'notes', label: 'Make Notes', icon: Highlighter },
                  { action: 'quiz', label: 'Quiz Prep', icon: HelpCircle },
                  { action: 'flashcards', label: 'Flashcards', icon: Layers },
                  { action: 'explain', label: 'Explain Details', icon: BookOpen }
                ].map(act => (
                  <button
                    key={act.action}
                    disabled={tutorMutation.isPending}
                    onClick={() => handleQuickAction(act.action as any)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-card hover:bg-muted border border-border/80 rounded-lg text-[10px] font-bold text-foreground/80 hover:text-foreground transition-all disabled:opacity-50"
                  >
                    <act.icon size={10} />
                    <span>{act.label}</span>
                  </button>
                ))}
              </div>

              {/* Chat Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask AI about enrolled course content..."
                  className="h-10 px-3.5 text-xs bg-card border border-border rounded-xl outline-none flex-1 focus:border-primary/45"
                  disabled={tutorMutation.isPending}
                />
                <button
                  onClick={handleSend}
                  disabled={tutorMutation.isPending || !input.trim()}
                  className="h-10 w-10 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center shadow-md transition-all hover:brightness-110 disabled:opacity-50 shrink-0"
                >
                  <Send size={12} />
                </button>
              </div>
            </div>
          </aside>
        </>
      )}
    </AnimatePresence>
  );
};
