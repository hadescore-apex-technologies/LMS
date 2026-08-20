import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import { logout } from '../../features/authSlice';
import { Menu, User, Settings, Award, Trophy, LogOut, ChevronDown, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationCenter from '../student/NotificationCenter';
import { getInitials } from '../../utils/stringUtils';

interface TopHeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const TopHeader: React.FC<TopHeaderProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    const role = user?.role;
    const isLive = localStorage.getItem('studentLiveMode') === 'true' ||
      Boolean(localStorage.getItem('loginPath')?.includes('live')) ||
      (user as any)?.student_type === 'LIVE_CLASS';
    dispatch(logout());
    if (role === 'SUPER_ADMIN') navigate('/admin/login');
    else if (role === 'STAFF') navigate('/staff/login');
    else if (isLive) navigate('/student/live-login');
    else navigate('/student/login');
  };

  const getProfilePath = () => {
    if (user?.role === 'SUPER_ADMIN') return '/admin/profile';
    if (user?.role === 'STAFF') return '/staff/profile';
    return '/student/profile';
  };

  const isStudentLive = localStorage.getItem('studentLiveMode') === 'true';

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between admin-glass-header px-4 sm:px-6 text-slate-200">
      {/* Left side: Toggle Button for Staff & Admin */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-xl p-2 hover:bg-white/10 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Right side Actions & Profile Dropdown */}
      <div className="flex items-center gap-3" ref={dropdownRef}>
        {/* Notification Bell */}
        <NotificationCenter />

        {/* User Profile Dropdown Button (Top Right) */}
        <div className="relative">
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-2xl border border-emerald-500/30 bg-slate-950/80 hover:bg-slate-900/80 hover:border-emerald-400/50 hover:shadow-[0_0_12px_rgba(16,185,129,0.2)] transition-all duration-200 group cursor-pointer text-slate-200"
          >
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black text-xs shadow-sm border border-emerald-400/40 group-hover:scale-105 transition-transform">
                {getInitials(user?.first_name ? `${user.first_name} ${user.last_name || ''}` : '', 'A')}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-slate-950 shadow-[0_0_6px_#34d399]" />
            </div>

            <div className="hidden text-left sm:block max-w-[130px] overflow-hidden">
              <p className="text-xs font-black text-slate-200 truncate group-hover:text-emerald-400 transition-colors leading-tight">
                {user?.first_name || 'Admin'}
              </p>
            </div>

            <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180 text-emerald-400' : ''}`} />
          </button>

          {/* Profile Dropdown Menu */}
          <AnimatePresence>
            {profileDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-950 border border-emerald-500/30 shadow-xl shadow-black/50 p-2 z-50 overflow-hidden text-slate-200"
              >
                {/* Header Summary inside dropdown */}
                <div className="p-3 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-500/25 rounded-xl text-white mb-2 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white font-black text-sm border border-emerald-400">
                      {getInitials(user?.first_name ? `${user.first_name} ${user.last_name || ''}` : '', 'A')}
                    </div>
                    <div className="overflow-hidden min-w-0">
                      <h4 className="font-extrabold text-xs text-white truncate">
                        {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : 'Administrator'}
                      </h4>
                      <p className="text-[10px] text-emerald-300 font-mono truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Dropdown Options List */}
                <div className="space-y-1">
                  <Link
                    to={getProfilePath()}
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-emerald-500/15 hover:text-emerald-400 rounded-xl transition-colors"
                  >
                    <User size={14} className="text-slate-400" />
                    <span>My Profile</span>
                  </Link>

                  <div className="h-px bg-emerald-500/15 my-1" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/15 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
