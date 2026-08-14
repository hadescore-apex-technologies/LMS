import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import { logout } from '../../features/authSlice';
import { Menu, User, Settings, Award, Trophy, LogOut, ChevronDown, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationCenter from '../student/NotificationCenter';

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
    dispatch(logout());
    if (role === 'SUPER_ADMIN') navigate('/admin/login');
    else if (role === 'STAFF') navigate('/staff/login');
    else navigate('/student/login');
  };

  const getProfilePath = () => {
    if (user?.role === 'SUPER_ADMIN') return '/admin/profile';
    if (user?.role === 'STAFF') return '/staff/profile';
    return '/student/profile';
  };

  const isStudentLive = localStorage.getItem('studentLiveMode') === 'true';

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/90 bg-white/95 backdrop-blur-xl px-4 sm:px-6 shadow-xs text-slate-800">
      {/* Left side: Toggle Button for Staff & Admin */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-xl p-2 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
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
            className="flex items-center gap-2.5 p-1.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-cyan-400 hover:shadow-xs transition-all duration-200 group cursor-pointer text-slate-800"
          >
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-black text-xs shadow-sm border border-cyan-400/40 group-hover:scale-105 transition-transform">
                {user?.first_name ? user.first_name.charAt(0).toUpperCase() : 'A'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white" />
            </div>

            <div className="hidden text-left sm:block max-w-[130px] overflow-hidden">
              <p className="text-xs font-black text-slate-800 truncate group-hover:text-cyan-600 transition-colors leading-tight">
                {user?.first_name || 'Admin'}
              </p>
            </div>

            <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180 text-cyan-600' : ''}`} />
          </button>

          {/* Profile Dropdown Menu */}
          <AnimatePresence>
            {profileDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-2 z-50 overflow-hidden text-slate-800"
              >
                {/* Header Summary inside dropdown */}
                <div className="p-3 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-800 rounded-xl text-white mb-2 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500 text-white font-black text-sm border border-cyan-400">
                      {user?.first_name ? user.first_name.charAt(0).toUpperCase() : 'A'}
                    </div>
                    <div className="overflow-hidden min-w-0">
                      <h4 className="font-extrabold text-xs text-white truncate">
                        {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : 'Administrator'}
                      </h4>
                      <p className="text-[10px] text-cyan-300 font-mono truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Dropdown Options List */}
                <div className="space-y-1">
                  <Link
                    to={getProfilePath()}
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 rounded-xl transition-colors"
                  >
                    <User size={14} className="text-slate-400" />
                    <span>My Profile</span>
                  </Link>

                  <div className="h-px bg-slate-100 my-1" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer text-left"
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
