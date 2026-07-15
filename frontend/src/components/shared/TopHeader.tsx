import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { Bell, Search, Menu, Check, Sun, Moon } from 'lucide-react';
import api from '../../services/api';
import { useDispatch } from 'react-redux';
import { toggleTheme } from '../../features/themeSlice';
import { Link } from 'react-router-dom';

interface TopHeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const TopHeader: React.FC<TopHeaderProps> = ({ setSidebarOpen }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { mode } = useSelector((state: RootState) => state.theme);
  const dispatch = useDispatch();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const fetchNotifications = async () => {
    try {
      const res = await api.get('notifications/');
      setNotifications(res.data);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (id: number) => {
    try {
      await api.post(`notifications/${id}/mark-read/`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('notifications/mark-all-read/');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-6">
      {/* Search and Mobile Button */}
      <div className="flex flex-1 items-center gap-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg p-2 hover:bg-muted lg:hidden text-muted-foreground transition-colors"
        >
          <Menu size={20} />
        </button>
 
        {/* Search Input */}
        <div className="relative hidden max-w-md w-full sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Search classes, courses, grades..."
            className="h-10 w-full rounded-xl bg-muted/60 pl-10 pr-4 text-sm outline-none border border-transparent focus:border-primary/20 focus:bg-background transition-all"
          />
        </div>
      </div>
 
      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Greetings */}
        <div className="hidden text-right md:block">
          <p className="text-xs text-muted-foreground font-medium">System Status Active</p>
          {user?.role === 'STUDENT' ? (
            <Link 
              to="/student/profile" 
              className="text-xs font-semibold text-foreground hover:text-primary transition-colors block"
              title="View Profile Settings"
            >
              {user.first_name ? `${user.first_name} ${user.last_name}` : user.email}
            </Link>
          ) : (
            <p className="text-xs font-semibold">{user?.email}</p>
          )}
        </div>

        {/* Theme switcher toggle */}
        <button
          onClick={() => dispatch(toggleTheme())}
          className="rounded-xl p-2.5 bg-muted/40 hover:bg-muted border border-border/50 text-muted-foreground hover:text-foreground transition-all"
          title="Toggle theme"
        >
          {mode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
 
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="relative rounded-xl p-2.5 bg-muted/40 hover:bg-muted border border-border/50 text-muted-foreground hover:text-foreground transition-all"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-white ring-2 ring-background">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifDropdown && (
            <>
              <div 
                className="fixed inset-0 z-40 bg-transparent"
                onClick={() => setShowNotifDropdown(false)}
              />
              <div className="absolute right-0 mt-2 z-50 w-80 rounded-2xl border border-border bg-card p-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-border pb-3 mb-2">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={handleMarkAllRead}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">No new notifications</p>
                  ) : (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        className={`p-2.5 rounded-xl border text-xs relative group transition-colors ${notif.is_read ? 'bg-background border-border/40 text-muted-foreground' : 'bg-primary/5 border-primary/10 text-foreground font-medium'}`}
                      >
                        <h4 className="font-semibold mb-0.5">{notif.title}</h4>
                        <p className="text-[11px] leading-relaxed">{notif.message}</p>
                        {!notif.is_read && (
                          <button
                            onClick={() => handleMarkRead(notif.id)}
                            className="absolute right-2 top-2 p-1 bg-primary/10 hover:bg-primary/20 rounded-md text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Check size={10} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
