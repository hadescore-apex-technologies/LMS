import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { MessageSquare, Send, Search, HelpCircle, Trash2, User, Users, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

export const ForumTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  // Comment states
  const [activePostId, setActivePostId] = useState<number | null>(null);
  const [newCommentContent, setNewCommentContent] = useState('');

  // 1. Fetch Posts for Staff (Backend automatically filters by assigned mentees)
  const { data: posts = [], isLoading } = useQuery<DiscussionPost[]>({
    queryKey: ['staff-discussion-posts'],
    queryFn: async () => {
      const res = await api.get('courses/discussions/posts/');
      return res.data;
    }
  });

  // Reply Mutation
  const createCommentMutation = useMutation({
    mutationFn: async (postId: number) => {
      if (!newCommentContent.trim()) return;
      await api.post('courses/discussions/comments/', {
        post: postId,
        content: newCommentContent
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-discussion-posts'] });
      setNewCommentContent('');
      toast.success('Reply submitted to mentee.');
    },
    onError: () => {
      toast.error('Failed to post reply.');
    }
  });

  // Delete Post Mutation (Moderator Action)
  const deletePostMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`courses/discussions/posts/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-discussion-posts'] });
      toast.success('Question thread deleted.');
    },
    onError: () => {
      toast.error('Failed to delete thread.');
    }
  });

  // Delete Comment Mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`courses/discussions/comments/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-discussion-posts'] });
      toast.success('Reply deleted.');
    },
    onError: () => {
      toast.error('Failed to delete comment.');
    }
  });

  // Filter posts by search text
  const filteredPosts = posts.filter(p => {
    const userEmail = p.user_details?.email || '';
    const userName = p.user_details?.name || '';
    return (
      (p.title || '').toLowerCase().includes(search.toLowerCase()) || 
      (p.content || '').toLowerCase().includes(search.toLowerCase()) ||
      userEmail.toLowerCase().includes(search.toLowerCase()) ||
      userName.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 text-xs animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Mentee Queries & Doubt Resolution</h1>
          <p className="text-muted-foreground text-sm mt-1">Review and resolve doubt clearing questions asked specifically by your assigned live mentees.</p>
          <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 text-[10px] font-extrabold uppercase tracking-wider shadow-xs">
            <Users size={11} className="text-emerald-600 dark:text-emerald-400" />
            Dedicated Assigned Mentees Only
          </span>
        </div>
      </div>

      {/* Filter and search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/20 border border-border/50 p-4 rounded-2xl">
        <span className="font-bold text-muted-foreground block">
          Total Mentee Questions: {posts.length} threads
        </span>
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-3 text-muted-foreground" size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search queries by mentee name, title or email..."
            className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-xl outline-none focus:border-primary/45 font-medium"
          />
        </div>
      </div>

      {/* Main content pane */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="font-bold">Loading mentee questions...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground bg-card border border-dashed border-border rounded-2xl">
            <p>Your assigned mentees have not posted any open questions yet.</p>
          </div>
        ) : (
          filteredPosts.map(post => (
            <div key={post.id} className="p-6 bg-card border border-border rounded-2xl shadow-sm space-y-4 hover:border-primary/25 transition-all">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 items-center text-[10px] text-muted-foreground">
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-200 dark:border-emerald-800/50">
                    Mentee Query
                  </span>
                  <span>Student: <span className="text-foreground font-bold">{post.user_details?.name || post.user_details?.email}</span></span>
                  <span>&bull;</span>
                  <span>Asked on: {new Date(post.created_at).toLocaleString()}</span>
                  <button 
                    onClick={() => { if (window.confirm('Delete this question thread?')) deletePostMutation.mutate(post.id); }} 
                    className="text-destructive hover:underline ml-auto flex items-center gap-1 font-semibold"
                  >
                    <Trash2 size={12} /> <span>Delete Thread</span>
                  </button>
                </div>

                <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                  <HelpCircle size={15} className="text-primary shrink-0" />
                  <span>{post.title}</span>
                </h3>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/20 p-3 rounded-xl border border-border/50 font-sans">
                  {post.content}
                </p>
              </div>

              {/* Replies Toggle */}
              <div className="pt-2 flex items-center justify-between border-t border-border/60">
                <button
                  onClick={() => setActivePostId(activePostId === post.id ? null : post.id)}
                  className="flex items-center gap-1.5 text-primary font-bold hover:underline"
                >
                  <MessageSquare size={13} />
                  <span>{post.comments ? post.comments.length : 0} Mentoring Answers & Discussion</span>
                </button>
              </div>

              {/* Comments drawer */}
              {activePostId === post.id && (
                <div className="space-y-4 pt-3 border-t border-border pl-2 sm:pl-4 bg-muted/10 -mx-6 -mb-6 p-6 rounded-b-2xl">
                  <div className="space-y-3">
                    {post.comments && post.comments.map(comment => (
                      <div key={comment.id} className="p-3 bg-card border border-border/60 rounded-xl space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                          <span className="flex items-center gap-1.5">
                            <span className="text-foreground font-bold">{comment.user_details?.name || comment.user_details?.email || 'Anonymous'}</span>
                            {(comment.user_details?.role === 'STAFF' || comment.user_details?.role === 'SUPER_ADMIN') && (
                              <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 rounded-md font-bold uppercase text-[8px]">
                                Mentor / Staff
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-2">
                            <span>{new Date(comment.created_at).toLocaleString()}</span>
                            <button 
                              onClick={() => { if (window.confirm('Delete reply?')) deleteCommentMutation.mutate(comment.id); }} 
                              className="text-destructive hover:opacity-80"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                      </div>
                    ))}
                    {(!post.comments || post.comments.length === 0) && (
                      <p className="text-[11px] italic text-muted-foreground">No answers logged yet. Write your guidance answer below for your mentee.</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCommentContent}
                      onChange={(e) => setNewCommentContent(e.target.value)}
                      placeholder="Write your mentoring answer / clarification..."
                      className="h-10 px-3 text-xs bg-card border border-border rounded-xl outline-none flex-1 focus:border-primary/45 font-medium"
                    />
                    <button
                      onClick={() => createCommentMutation.mutate(post.id)}
                      disabled={createCommentMutation.isPending || !newCommentContent.trim()}
                      className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-1.5 hover:brightness-110 disabled:opacity-50 transition-all"
                    >
                      {createCommentMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      <span>Send Reply</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ForumTab;
