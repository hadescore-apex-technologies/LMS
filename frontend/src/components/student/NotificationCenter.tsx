import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import api from '../../services/api';
import { Bell, Check, CheckCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Notification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const NotificationCenter: React.FC = () => {
  const { accessToken, user } = useSelector((state: RootState) => state.auth);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = async (isFirstLoad = false) => {
    // Don't poll if not authenticated — avoids 401 spam from the interval
    if (!accessToken || user?.role === 'SUPER_ADMIN') return;
    
    // Additional check: if user is not properly authenticated, stop polling
    if (!user?.email) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    
    try {
      const res = await api.get('notifications/');
      const fetched = res.data;

      // Only trigger screen toast if it is a new unread notification
      if (!isFirstLoad && notifications.length > 0) {
        const previousIds = new Set(notifications.map(n => n.id));
        const newUnread = fetched.filter((n: Notification) => !n.is_read && !previousIds.has(n.id));
        
        newUnread.forEach((n: Notification) => {
          toast.success(
            <div className="flex flex-col gap-0.5 text-left text-xs">
              <span className="font-extrabold text-slate-800">{n.title}</span>
              <span className="text-slate-600 text-[10px]">{n.message}</span>
            </div>,
            { duration: 6000, icon: '🔔' }
          );
        });
      }

      setNotifications(fetched);
      setUnreadCount(fetched.filter((n: Notification) => !n.is_read).length);
    } catch (err: any) {
      // If 401, stop polling immediately to prevent spam
      if (err?.response?.status === 401) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        // Clear notifications on auth failure
        setNotifications([]);
        setUnreadCount(0);
      } else if (err?.response?.status !== 401) {
        console.error('Failed to load notifications', err);
      }
    }
  };

  useEffect(() => {
    if (!accessToken) {
      // Clear everything if no token
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Don't start polling if user doesn't have proper authentication
    if (!user?.email || user?.role === 'SUPER_ADMIN') {
      return;
    }

    fetchNotifications(true);

    // Poll for notifications every 30 seconds - store in ref for cleanup
    intervalRef.current = setInterval(() => fetchNotifications(false), 30000);

    // Close on click outside
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);

    // Listen for logout events to immediately stop polling
    const handleLogout = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setNotifications([]);
      setUnreadCount(0);
    };
    window.addEventListener('auth-logout', handleLogout);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('auth-logout', handleLogout);
    };
  }, [accessToken, user?.email, user?.role]); // Re-run when token or user changes

  const handleMarkAllRead = async () => {
    try {
      setLoading(true);
      await api.post('notifications/mark-all-read/');
      toast.success('All notifications marked as read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      toast.error('Failed to mark all read.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await api.post(`notifications/${id}/mark-read/`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification read', err);
    }
  };

  if (user?.role === 'SUPER_ADMIN') {
    return null;
  }

  return (
    <div className="relative text-xs" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-10 w-10 flex items-center justify-center bg-muted/40 hover:bg-muted/80 border border-border/50 hover:border-border rounded-xl transition-all"
        title="Notifications"
      >
        <Bell size={16} className={unreadCount > 0 ? "animate-swing" : ""} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-white text-[9px] font-bold rounded-full border-2 border-background flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 glass-panel rounded-2xl shadow-2xl border border-border/60 py-3 z-50 space-y-2 animate-scale-up">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-2 border-b border-border/40">
            <h4 className="font-bold text-xs">Notifications</h4>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={loading}
                className="text-[10px] text-primary hover:underline flex items-center gap-1 font-semibold"
              >
                {loading ? <Loader2 className="animate-spin" size={10} /> : <CheckCheck size={10} />}
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[300px] overflow-y-auto divide-y divide-border/30 px-2 space-y-1">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.is_read && handleMarkRead(n.id)}
                className={`p-2.5 rounded-xl transition-all text-[11px] flex gap-2 justify-between items-start cursor-pointer ${
                  n.is_read 
                    ? 'opacity-65 hover:bg-muted/20' 
                    : 'bg-primary/5 hover:bg-primary/10 border-l-2 border-primary'
                }`}
              >
                <div className="space-y-0.5 min-w-0 flex-1">
                  <h5 className="font-bold text-foreground leading-snug">{n.title}</h5>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{n.message}</p>
                  <span className="text-[8px] text-muted-foreground block pt-1 font-semibold">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
                {!n.is_read && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }}
                    className="p-1 text-primary hover:bg-primary/10 rounded-lg shrink-0"
                    title="Mark as Read"
                  >
                    <Check size={10} />
                  </button>
                )}
              </div>
            ))}

            {notifications.length === 0 && (
              <p className="text-[10px] text-muted-foreground italic text-center py-8">No notifications received yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
