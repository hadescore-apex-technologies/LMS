import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { MessageSquare, Send, Search, HelpCircle, Trash2, Loader2, ArrowLeft, User } from 'lucide-react';

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

export const ForumTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');

  // Comment states
  const [activePostId, setActivePostId] = useState<number | null>(null);
  const [newCommentContent, setNewCommentContent] = useState('');

  // 1. Fetch Courses
  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses-dropdown-list'],
    queryFn: async () => {
      const res = await api.get('courses/list/');
      return res.data;
    }
  });

  // 2. Fetch Posts
  const { data: posts = [], isLoading } = useQuery<DiscussionPost[]>({
    queryKey: ['discussion-posts', selectedCourse],
    queryFn: async () => {
      const url = selectedCourse ? `courses/discussions/posts/?course=${selectedCourse}` : 'courses/discussions/posts/';
      const res = await api.get(url);
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
      queryClient.invalidateQueries({ queryKey: ['discussion-posts'] });
      setNewCommentContent('');
      toast.success('Reply submitted.');
    },
    onError: () => {
      toast.error('Failed to post reply.');
    }
  });

  // Delete Post Mutation (Spam Moderator option)
  const deletePostMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`courses/discussions/posts/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-posts'] });
      toast.success('Question deleted (Moderator Action).');
    },
    onError: () => {
      toast.error('Failed to delete thread.');
    }
  });

  // Delete Comment Mutation (Spam Moderator option)
  const deleteCommentMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`courses/discussions/comments/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-posts'] });
      toast.success('Reply deleted (Moderator Action).');
    },
    onError: () => {
      toast.error('Failed to delete comment.');
    }
  });

  // Filter posts by course/search text
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
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Discussion Boards Moderation</h1>
          <p className="text-muted-foreground text-sm mt-1">Audit student question boards, delete spam replies, and post clarifications.</p>
        </div>
      </div>

      {/* Filter and search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/20 border border-border/50 p-4 rounded-2xl">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-3 text-muted-foreground" size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search threads by student, title or email..."
            className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-xl outline-none focus:border-primary/45"
          />
        </div>
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="w-full sm:w-56 h-10 px-3 bg-background border border-border rounded-xl outline-none focus:border-primary/45 font-semibold"
        >
          <option value="">All Course Discussions</option>
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>

      {/* Main content pane */}
      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">
          <Loader2 className="animate-spin text-primary mx-auto mb-2" size={20} />
          <span>Loading Forums...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredPosts.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground font-medium bg-card border border-dashed border-border rounded-2xl">
              No active discussion threads matching filters.
            </div>
          ) : (
            filteredPosts.map(post => (
              <div key={post.id} className="p-6 bg-card border border-border rounded-2xl shadow-sm space-y-4 hover:border-primary/25 transition-all">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap gap-2 items-center text-[10px] text-muted-foreground">
                    <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-bold uppercase tracking-wider">{post.course_title || 'Apex Course'}</span>
                    <span>Asked by: <span className="text-foreground/80 font-semibold">{post.user_details?.name || post.user_details?.email}</span></span>
                    {post.mentor_name && (
                      <>
                        <span>&bull;</span>
                        <span>Assigned Mentor: <span className="text-primary font-bold">{post.mentor_name}</span></span>
                      </>
                    )}
                    <span>&bull;</span>
                    <span>Asked on: {new Date(post.created_at).toLocaleString()}</span>
                    <button onClick={() => { if (window.confirm('Delete spam post?')) deletePostMutation.mutate(post.id); }} className="text-destructive hover:underline ml-auto flex items-center gap-0.5">
                      <Trash2 size={11} /> <span>Delete thread</span>
                    </button>
                  </div>
                  <h3 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                    <HelpCircle size={14} className="text-primary" />
                    <span>{post.title}</span>
                  </h3>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/20 p-3 rounded-xl border border-border/50">{post.content}</p>
                </div>

                {/* Replies Toggle */}
                <div className="pt-2 flex items-center justify-between border-t border-border/60">
                  <button
                    onClick={() => setActivePostId(activePostId === post.id ? null : post.id)}
                    className="flex items-center gap-1.5 text-primary font-bold hover:underline"
                  >
                    <MessageSquare size={13} />
                    <span>{post.comments ? post.comments.length : 0} Replies</span>
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
                              <span>User: <span className="text-foreground/90 font-bold">{comment.user_details?.name || comment.user_details?.email || 'Anonymous'}</span></span>
                              {(comment.user_details?.role === 'STAFF' || comment.user_details?.role === 'SUPER_ADMIN') && (
                                <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 rounded-md font-bold uppercase text-[7px]">
                                  Mentor / Staff
                                </span>
                              )}
                            </span>
                            <div className="flex items-center gap-2">
                              <span>{new Date(comment.created_at).toLocaleString()}</span>
                              <button onClick={() => { if (window.confirm('Delete comment?')) deleteCommentMutation.mutate(comment.id); }} className="text-destructive"><Trash2 size={11} /></button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                        </div>
                      ))}
                      {(!post.comments || post.comments.length === 0) && (
                        <p className="text-[11px] italic text-muted-foreground">No responses logged. Write an answer below.</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCommentContent}
                        onChange={(e) => setNewCommentContent(e.target.value)}
                        placeholder="Write your moderation answer..."
                        className="h-9 px-3 text-xs bg-card border border-border rounded-xl outline-none flex-1 focus:border-primary/45"
                      />
                      <button
                        onClick={() => createCommentMutation.mutate(post.id)}
                        disabled={createCommentMutation.isPending || !newCommentContent.trim()}
                        className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-1 hover:brightness-110 disabled:opacity-50"
                      >
                        <Send size={11} />
                        <span>Reply</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
export default ForumTab;
