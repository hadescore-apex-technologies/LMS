import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { MessageSquare, Send, Search, HelpCircle, X, Plus, Loader2, Sparkles, User, MessageCircle } from 'lucide-react';
import { useFormDraft } from '../../../hooks/useFormDraft';

interface UserShort {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface DiscussionPost {
  id: number;
  course: number;
  course_title?: string;
  mentor_name?: string | null;
  user_details?: UserShort;
  title: string;
  content: string;
  created_at: string;
  comments: Array<{
    id: number;
    user_details?: UserShort;
    content: string;
    created_at: string;
  }>;
}

interface Course {
  id: number;
  title: string;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } }
};

export const DiscussionTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  
  // Post states with auto-save drafts
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [newPostTitle, setNewPostTitle, clearPostTitleDraft] = useFormDraft('student_post_title', '');
  const [newPostContent, setNewPostContent, clearPostContentDraft] = useFormDraft('student_post_content', '');
  const [newPostCourseId, setNewPostCourseId] = useState('');

  // Comment states
  const [activePostId, setActivePostId] = useState<number | null>(null);
  const [newCommentContent, setNewCommentContent] = useState('');

  // 1. Fetch Enrolled Courses for dropdown selection
  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses-dropdown'],
    queryFn: async () => {
      const res = await api.get('courses/list/');
      return res.data;
    }
  });

  const [liveMode, setLiveMode] = React.useState(localStorage.getItem('studentLiveMode') === 'true');

  React.useEffect(() => {
    const handleStorage = () => {
      setLiveMode(localStorage.getItem('studentLiveMode') === 'true');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  React.useEffect(() => {
    if (courses.length > 0 && !newPostCourseId) {
      setNewPostCourseId(courses[0].id.toString());
    }
  }, [courses, newPostCourseId]);


  // 2. Fetch Discussion Posts
  const { data: posts = [], isLoading } = useQuery<DiscussionPost[]>({
    queryKey: ['discussion-posts', selectedCourse, liveMode],
    placeholderData: (prev) => prev,
    refetchInterval: 8000,
    queryFn: async () => {
      let url = `courses/discussions/posts/?live_mode=${liveMode}`;
      if (selectedCourse) {
        url += `&course=${selectedCourse}`;
      }
      const res = await api.get(url);
      return res.data;
    }
  });

  // Create Post Mutation
  const createPostMutation = useMutation({
    mutationFn: async () => {
      if (!newPostTitle.trim() || !newPostContent.trim()) {
        throw new Error('Please fill in both query title and detailed question.');
      }
      const payload: any = {
        title: newPostTitle.trim(),
        content: newPostContent.trim()
      };
      if (newPostCourseId) {
        payload.course = Number(newPostCourseId);
      } else if (courses.length > 0) {
        payload.course = courses[0].id;
      }
      await api.post('courses/discussions/posts/', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-posts'] });
      setIsCreatingPost(false);
      clearPostTitleDraft();
      clearPostContentDraft();
      setNewPostCourseId('');
      toast.success('Query submitted to your mentor successfully!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || err.message || 'Failed to post query.');
    }
  });

  // Create Comment Mutation
  const createCommentMutation = useMutation({
    mutationFn: async (postId: number) => {
      if (!newCommentContent.trim()) return;
      await api.post('courses/discussions/comments/', {
        post: postId,
        content: newCommentContent
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-posts'] });
      setNewCommentContent('');
      toast.success('Reply submitted.');
    },
    onError: () => {
      toast.error('Failed to post reply.');
    }
  });

  const filteredPosts = posts.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) || 
    p.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full space-y-3.5 text-xs animate-fade-in">
      {/* ── UNIFIED COMPACT HEADER & ACTIONS BAR ────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-black shadow-md shadow-cyan-500/20 border border-cyan-400">
            <MessageSquare size={18} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
              <span>Academic Queries & Mentor Forum</span>
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Interact with your mentor, clarify technical doubts, and discuss topics with peers.
            </p>
          </div>
        </div>

        {/* Integrated Search & Post Action */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={13} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search discussion threads..."
              className="w-full h-8 pl-8 pr-7 bg-card border border-border/80 rounded-xl outline-none focus:border-cyan-500/60 text-xs text-foreground placeholder:text-muted-foreground/60 transition-all shadow-2xs"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground">
                <X size={12} />
              </button>
            )}
          </div>

          <button
            onClick={() => setIsCreatingPost(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-extrabold rounded-xl flex items-center gap-1.5 shadow-sm shadow-cyan-500/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0 text-xs"
          >
            <Plus size={14} />
            <span>Ask Query</span>
          </button>
        </div>
      </div>

      {/* Create Post Modal */}
      <AnimatePresence>
        {isCreatingPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card text-card-foreground border border-border/90 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-border/60 pb-3">
                <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                  <MessageSquare size={16} className="text-cyan-600" />
                  <span>Submit a Question to Mentor</span>
                </h3>
                <button onClick={() => setIsCreatingPost(false)} className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-lg"><X size={16} /></button>
              </div>
              
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase font-bold mb-1">Query Subject</label>
                  <input
                    type="text"
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                    placeholder="e.g. How to structure async state in Django?"
                    className="w-full h-11 px-3.5 bg-muted/30 border border-border/80 rounded-2xl outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase font-bold mb-1">Question Details</label>
                  <textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    rows={4}
                    placeholder="Provide full context, errors, and what you have tried so far..."
                    className="w-full p-3.5 bg-muted/30 border border-border/80 rounded-2xl outline-none text-xs resize-none"
                  />
                </div>

                <button
                  onClick={() => createPostMutation.mutate()}
                  disabled={createPostMutation.isPending}
                  className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-extrabold rounded-2xl shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {createPostMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  <span>Submit Question</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Posts list */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-5"
      >
        {isLoading && posts.length === 0 ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="p-4 bg-card/60 border border-border/50 rounded-2xl animate-pulse space-y-2">
                <div className="h-3 bg-muted/50 rounded-lg w-1/4" />
                <div className="h-5 bg-muted/60 rounded-xl w-2/3" />
                <div className="h-3 bg-muted/40 rounded-lg w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground font-medium bg-card border border-dashed border-border rounded-2xl p-6 shadow-2xs">
            <MessageCircle size={32} className="mx-auto opacity-40 text-cyan-400 mb-1.5" />
            <h3 className="font-extrabold text-sm text-foreground">No questions found</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Be the first to post a query for this course.</p>
          </div>
        ) : (
          filteredPosts.map(post => (
            <motion.div 
              variants={itemVariants}
              key={post.id} 
              className="p-4 cyber-glass-card rounded-2xl shadow-2xs space-y-3 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-2 items-center text-[10px] text-muted-foreground">
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-extrabold uppercase tracking-wider">{post.course_title || 'Apex Course'}</span>
                  <span>By: <span className="text-foreground font-bold">{post.user_details?.name || post.user_details?.email}</span></span>
                  {post.mentor_name && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-400 font-bold">Mentor: {post.mentor_name}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>{new Date(post.created_at).toLocaleDateString()}</span>
                </div>

                <h3 className="font-black text-sm text-foreground leading-snug">{post.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{post.content}</p>
              </div>

              {/* Comments / Answers */}
              <div className="pt-2 border-t border-border/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <MessageSquare size={11} className="text-cyan-400" />
                    <span>Replies ({post.comments?.length || 0})</span>
                  </span>

                  <button
                    onClick={() => setActivePostId(activePostId === post.id ? null : post.id)}
                    className="text-cyan-400 hover:text-cyan-300 font-black text-[11px] cursor-pointer"
                  >
                    {activePostId === post.id ? 'Close Replies' : 'Reply to Query'}
                  </button>
                </div>

                {post.comments && post.comments.length > 0 && (
                  <div className="space-y-2 pl-3 border-l-2 border-cyan-500/30">
                    {post.comments.map(c => (
                      <div key={c.id} className="p-2.5 bg-muted/40 rounded-xl space-y-0.5 border border-border/50">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-foreground">{c.user_details?.name || 'Mentor / Peer'}</span>
                          <span className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{c.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {activePostId === post.id && (
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={newCommentContent}
                      onChange={(e) => setNewCommentContent(e.target.value)}
                      placeholder="Write your reply or clarification..."
                      className="flex-1 h-9 px-3 bg-muted/30 border border-border/80 rounded-xl outline-none focus:border-cyan-500 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          createCommentMutation.mutate(post.id);
                        }
                      }}
                    />
                    <button
                      onClick={() => createCommentMutation.mutate(post.id)}
                      disabled={createCommentMutation.isPending || !newCommentContent.trim()}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-extrabold rounded-xl disabled:opacity-50 flex items-center gap-1.5 cursor-pointer text-xs"
                    >
                      <Send size={12} />
                      <span>Send</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
};
