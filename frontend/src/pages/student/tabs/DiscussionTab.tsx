import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { MessageSquare, Send, Search, HelpCircle, X, Plus, Loader2 } from 'lucide-react';

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

export const DiscussionTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  
  // Post states
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
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
      setNewPostTitle('');
      setNewPostContent('');
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
    <div className="space-y-6 text-xs">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Queries</h1>
          <p className="text-muted-foreground text-sm mt-1">Interact with your peers, clarify technical concepts, and review staff feedbacks.</p>
        </div>
        <button
          onClick={() => setIsCreatingPost(true)}
          className="px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-primary/10 hover:brightness-110 transition-all transform active:scale-95"
        >
          <Plus size={14} />
          <span>Submit a Query</span>
        </button>
      </div>

      {/* Filter and search inputs */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-muted/20 border border-border/50 p-4 rounded-2xl">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-3 text-muted-foreground" size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search queries..."
            className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-xl outline-none focus:border-primary/45 text-xs transition-all"
          />
        </div>
      </div>

      {/* Create Post Modal */}
      {isCreatingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card text-card-foreground border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-2.5">
              <h3 className="font-bold text-sm">Submit a Query</h3>
              <button onClick={() => setIsCreatingPost(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>
            
              <div className="space-y-3">
              
              <div>
                <label className="block text-[10px] text-muted-foreground uppercase font-bold mb-1">Query Title</label>
                <input
                  type="text"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder="What is the concept behind...?"
                  className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] text-muted-foreground uppercase font-bold mb-1">Details</label>
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  rows={4}
                  placeholder="Describe your query in details. Include any code blocks or terminal errors..."
                  className="w-full p-3 bg-muted/40 border border-border rounded-xl outline-none text-xs resize-none"
                />
              </div>

              <button
                onClick={() => createPostMutation.mutate()}
                disabled={createPostMutation.isPending}
                className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                {createPostMutation.isPending && <Loader2 size={13} className="animate-spin" />}
                <span>Submit Query</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Posts list */}
      <div className="space-y-6">
        {isLoading && posts.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-6 bg-card/60 border border-border/50 rounded-2xl animate-pulse space-y-3">
                <div className="h-4 bg-muted/50 rounded-lg w-1/3" />
                <div className="h-6 bg-muted/60 rounded-xl w-3/4" />
                <div className="h-4 bg-muted/40 rounded-lg w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground font-medium bg-card border border-dashed border-border rounded-2xl">
            No questions posted yet in this queries channel. Be the first to ask!
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
                  <span>{new Date(post.created_at).toLocaleString()}</span>
                </div>
                <h3 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                  <HelpCircle size={14} className="text-primary" />
                  <span>{post.title}</span>
                </h3>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/20 p-3 rounded-xl border border-border/50">{post.content}</p>
              </div>

              {/* Toggle replies view */}
              <div className="pt-2 flex items-center justify-between border-t border-border/60">
                <button
                  onClick={() => setActivePostId(activePostId === post.id ? null : post.id)}
                  className="flex items-center gap-1.5 text-primary font-bold hover:underline"
                >
                  <MessageSquare size={13} />
                  <span>{post.comments ? post.comments.length : 0} Replies</span>
                </button>
              </div>

              {/* Replies/Comments Panel */}
              {activePostId === post.id && (
                <div className="space-y-4 pt-3 border-t border-border pl-2 sm:pl-4 bg-muted/10 -mx-6 -mb-6 p-6 rounded-b-2xl">
                  <div className="space-y-3">
                    {post.comments && post.comments.map(comment => (
                      <div key={comment.id} className="p-3 bg-card border border-border/60 rounded-xl space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                          <span className="flex items-center gap-1.5">
                            <span><span className="text-foreground/90 font-bold">{comment.user_details?.name || comment.user_details?.email}</span></span>
                            {(comment.user_details?.role === 'STAFF' || comment.user_details?.role === 'SUPER_ADMIN') && (
                              <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 rounded-md font-bold uppercase text-[7px]">
                                Mentor / Staff
                              </span>
                            )}
                          </span>
                          <span>{new Date(comment.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                      </div>
                    ))}
                    {(!post.comments || post.comments.length === 0) && (
                      <p className="text-[11px] italic text-muted-foreground">No replies yet. Be the first to answer!</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCommentContent}
                      onChange={(e) => setNewCommentContent(e.target.value)}
                      placeholder="Write your answer..."
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
    </div>
  );
};
