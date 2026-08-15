import React, { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../services/api';
import {
  Sparkles, Mic, MicOff, Copy, Check,
  RefreshCw, X, RotateCcw, ArrowUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export interface Message {
  id: string;
  sender: 'student' | 'ai';
  text: string;
  timestamp: string;
}

interface ApexAITutorCoreProps {
  lessonId: number | null;
  courseId: number;
  lessonTitle?: string;
  compact?: boolean;
  onClose?: () => void;
}

// Helper for inline markdown: **bold** and `code`
function renderInlineText(text: string): React.ReactNode {
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-extrabold text-foreground">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 font-mono text-[10px] text-primary font-semibold mx-0.5 inline-block">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

// Rich & Clean Markdown Component
const FormattedMessage: React.FC<{ text: string }> = ({ text }) => {
  const [codeCopiedIdx, setCodeCopiedIdx] = useState<number | null>(null);

  // Separate code blocks ``` ... ``` from standard text
  const blocks = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-1.5 text-[11px] leading-relaxed">
      {blocks.map((block, bIdx) => {
        if (block.startsWith('```') && block.endsWith('```')) {
          const raw = block.slice(3, -3).trim();
          const firstNewline = raw.indexOf('\n');
          let lang = 'code';
          let codeContent = raw;

          if (firstNewline !== -1) {
            const possibleLang = raw.slice(0, firstNewline).trim();
            if (/^[a-zA-Z0-9_+-]+$/.test(possibleLang)) {
              lang = possibleLang;
              codeContent = raw.slice(firstNewline + 1);
            }
          }

          return (
            <div key={bIdx} className="my-2 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 overflow-hidden shadow-sm font-mono text-[10px]">
              <div className="flex items-center justify-between px-3 py-1 bg-zinc-900 border-b border-zinc-800 text-[9px] font-bold text-zinc-400">
                <span className="uppercase tracking-wider text-primary">{lang}</span>
                {/* Copy button removed for student security */}
              </div>
              <pre className="p-2.5 overflow-x-auto whitespace-pre leading-normal font-mono text-[10.5px] text-zinc-200">
                <code>{codeContent}</code>
              </pre>
            </div>
          );
        }

        // Normal text block
        const lines = block.split('\n');
        return (
          <div key={bIdx} className="space-y-1">
            {lines.map((line, lIdx) => {
              const trimmed = line.trim();
              if (!trimmed) return null;

              if (line.startsWith('### ')) {
                return (
                  <h4 key={lIdx} className="font-extrabold text-xs text-primary mt-2 mb-1 pb-0.5 border-b border-border/40">
                    {renderInlineText(line.replace('### ', ''))}
                  </h4>
                );
              }
              if (line.startsWith('#### ') || line.startsWith('🔹') || line.startsWith('🔸')) {
                return (
                  <h5 key={lIdx} className="font-bold text-[11px] text-foreground mt-1.5 mb-0.5">
                    {renderInlineText(line.replace(/^(####|🔹|🔸)\s*/, ''))}
                  </h5>
                );
              }
              if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                const itemText = trimmed.replace(/^[-*]\s*/, '');
                return (
                  <div key={lIdx} className="flex items-start gap-1.5 my-0.5 pl-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    <span className="flex-1 text-foreground/95 leading-relaxed">
                      {renderInlineText(itemText)}
                    </span>
                  </div>
                );
              }

              return (
                <p key={lIdx} className="leading-relaxed text-foreground/95 mb-1">
                  {renderInlineText(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export const ApexAITutorCore: React.FC<ApexAITutorCoreProps> = ({
  lessonId,
  courseId,
  lessonTitle,
  compact = false,
  onClose
}) => {
  const initialGreeting: Message = {
    id: 'init-1',
    sender: 'ai',
    text: 'Hello! Ask me any doubt about this lesson.',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  const [messages, setMessages] = useState<Message[]>([initialGreeting]);
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Speech Recognition Setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(prev => (prev ? `${prev} ${transcript}` : transcript));
          setIsListening(false);
          toast.success('Voice captured!');
        };

        recognition.onerror = () => {
          setIsListening(false);
          toast.error('Voice recognition error. Please try speaking again.');
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition is not supported in your browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast('Listening... Speak your question clearly.', { icon: '🎤' });
      } catch (err) {
        setIsListening(false);
      }
    }
  };

  // AI Tutor Mutation
  const tutorMutation = useMutation({
    mutationFn: async ({ prompt, action }: { prompt: string; action: string }) => {
      const res = await api.post('courses/ai-tutor/', {
        action,
        prompt,
        lesson_id: lessonId,
        course_id: courseId,
        history: messages.slice(-6).map(m => ({ sender: m.sender, text: m.text }))
      });
      return res.data;
    },
    onSuccess: (data) => {
      const aiResponse = data.answer || 'I have processed your request.';
      setMessages(prev => [...prev, {
        id: Math.random().toString(36).substring(2),
        sender: 'ai',
        text: aiResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.error || 'Failed to connect to Apex AI.';
      toast.error(errMsg);
      setMessages(prev => [...prev, {
        id: Math.random().toString(36).substring(2),
        sender: 'ai',
        text: `⚠️ **System Notice**: ${errMsg}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  });

  const handleSend = () => {
    const query = input.trim();
    if (!query || tutorMutation.isPending) return;

    setInput('');

    setMessages(prev => [...prev, {
      id: Math.random().toString(36).substring(2),
      sender: 'student',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);

    tutorMutation.mutate({ prompt: query, action: 'ask' });
  };

  const handleClearChat = () => {
    setMessages([initialGreeting]);
    toast.success('Chat history cleared');
  };

  return (
    <div className={`flex flex-col h-full bg-background/95 text-foreground ${compact ? 'text-[11px]' : 'text-xs'} overflow-hidden rounded-2xl border border-border/60 shadow-xl`}>
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-card/80 backdrop-blur-xl border-b border-border/50 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 via-primary to-purple-600 text-white shadow-xs">
            <Sparkles size={14} />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-xs tracking-tight text-foreground flex items-center gap-1.5">
              <span>Apex AI Mentor</span>
            </h3>
            <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">
              {lessonTitle ? lessonTitle : 'Instant Doubt Solver'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleClearChat}
            title="Clear Chat"
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors"
          >
            <RotateCcw size={13} />
          </button>
          <button
            onClick={() => tutorMutation.mutate({ prompt: 'Refresh context', action: 'ask' })}
            disabled={tutorMutation.isPending}
            title="Refresh Context"
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors disabled:opacity-40"
          >
            <RefreshCw size={13} className={tutorMutation.isPending ? 'animate-spin' : ''} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Chat Feed */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3">
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-2.5 ${msg.sender === 'student' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-primary to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <Sparkles size={11} />
                  </div>
                )}

                <div className={`space-y-1 max-w-[88%] ${msg.sender === 'student' ? 'items-end' : 'items-start'}`}>
                  {/* Message Card */}
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-[11px] leading-relaxed shadow-xs ${
                      msg.sender === 'student'
                        ? 'bg-primary text-primary-foreground font-medium rounded-tr-xs'
                        : 'bg-card border border-border/80 text-foreground rounded-tl-xs backdrop-blur-xs'
                    }`}
                  >
                    <FormattedMessage text={msg.text} />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          {tutorMutation.isPending && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-muted-foreground p-1.5"
            >
              <div className="h-6 w-6 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center animate-spin">
                <Sparkles size={11} />
              </div>
              <span className="text-[10px] font-semibold text-primary/90 animate-pulse">
                Apex AI is generating answer...
              </span>
            </motion.div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input Box */}
      <div className="p-2 bg-background/80 backdrop-blur-md border-t border-border/40 shrink-0">
        <div className="flex items-center gap-1.5 p-1 bg-card border border-border/80 rounded-xl shadow-md focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <button
            onClick={toggleListening}
            className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all shrink-0 ${
              isListening
                ? 'bg-red-500 text-white animate-pulse shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
            title="Voice Search"
          >
            {isListening ? <MicOff size={13} /> : <Mic size={13} />}
          </button>

          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={isListening ? 'Listening...' : 'Type your doubt or question here...'}
            className="flex-1 bg-transparent text-[11px] outline-none placeholder:text-muted-foreground/70 px-1"
            disabled={tutorMutation.isPending}
          />

          <button
            onClick={handleSend}
            disabled={tutorMutation.isPending || !input.trim()}
            className="h-7 w-7 bg-gradient-to-r from-primary to-indigo-600 text-primary-foreground rounded-lg flex items-center justify-center shadow-sm hover:opacity-95 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all shrink-0"
          >
            <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
