import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { 
  LayoutDashboard, BookOpen, Radio, 
  FileText, MessageSquare, Award,
  Settings, X, LogOut
} from 'lucide-react';
import { logout } from '../../features/authSlice';

interface StudentCyberSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StudentCyberSidebar: React.FC<StudentCyberSidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const handlePrefetch = (path: string) => {
    try {
      if (path.includes('courses')) {
        queryClient.prefetchQuery({ queryKey: ['courses'], queryFn: async () => (await api.get('courses/')).data, staleTime: 1000 * 60 * 5 });
      } else if (path.includes('assignments')) {
        queryClient.prefetchQuery({ queryKey: ['student-assignments'], queryFn: async () => (await api.get('assignments/')).data, staleTime: 1000 * 60 * 5 });
      } else if (path.includes('certificates')) {
        queryClient.prefetchQuery({ queryKey: ['certificates'], queryFn: async () => (await api.get('certificates/')).data, staleTime: 1000 * 60 * 5 });
      } else if (path.includes('live')) {
        queryClient.prefetchQuery({ queryKey: ['live-classes'], queryFn: async () => (await api.get('courses/live/')).data, staleTime: 1000 * 60 * 5 });
      }
    } catch {
      // Background prefetch fail silently
    }
  };

  const [isStudentLive, setIsStudentLive] = React.useState<boolean>(() => {
    return localStorage.getItem('studentLiveMode') === 'true' ||
      Boolean(localStorage.getItem('loginPath')?.includes('live')) ||
      (user as any)?.student_type === 'LIVE_CLASS' ||
      (Boolean(localStorage.getItem('user')) && JSON.parse(localStorage.getItem('user') || '{}')?.student_type === 'LIVE_CLASS');
  });

  React.useEffect(() => {
    const handleStorage = () => {
      setIsStudentLive(
        localStorage.getItem('studentLiveMode') === 'true' ||
        Boolean(localStorage.getItem('loginPath')?.includes('live')) ||
        (user as any)?.student_type === 'LIVE_CLASS' ||
        (Boolean(localStorage.getItem('user')) && JSON.parse(localStorage.getItem('user') || '{}')?.student_type === 'LIVE_CLASS')
      );
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [user]);

  const handleLogout = () => {
    const isLive = isStudentLive;
    dispatch(logout());
    if (isLive) {
      navigate('/student/live-login');
    } else {
      navigate('/student/login');
    }
  };

  const navItems = isStudentLive
    ? [
        { label: 'Dashboard', path: '/live-student', icon: LayoutDashboard, exact: true },
        { label: 'Live Videos', path: '/live-student/videos', icon: BookOpen },
        { label: 'Live Sessions', path: '/live-student/sessions', icon: Radio },
        { label: 'Assignments', path: '/live-student/assignments', icon: FileText },
        { label: 'Q&A Forum', path: '/live-student/forum', icon: MessageSquare },
        { label: 'Settings', path: '/live-student/profile', icon: Settings },
      ]
    : [
        { label: 'Dashboard', path: '/student', icon: LayoutDashboard, exact: true },
        { label: 'Courses', path: '/student/courses', icon: BookOpen },
        { label: 'Doubt Sessions', path: '/student/live', icon: Radio },
        { label: 'Certificates', path: '/student/certificates', icon: Award },
        { label: 'Q&A Forum', path: '/student/forum', icon: MessageSquare },
        { label: 'Settings', path: '/student/profile', icon: Settings },
      ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md lg:hidden"
        />
      )}

      {/* Cyber-Glass Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 lg:w-72 m-0 lg:m-3 h-full lg:h-[calc(100vh-1.5rem)] rounded-none lg:rounded-3xl cyber-glass-sidebar p-4 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex-1 space-y-4">
          {/* ── TOP CENTERED LOGO & BRANDING ── */}
          <div className="relative flex flex-col items-center justify-center text-center pt-2 pb-2">
            {/* Mobile close button */}
            <button 
              onClick={onClose}
              className="lg:hidden absolute top-0 right-0 text-slate-400 hover:text-white p-1"
            >
              <X size={18} />
            </button>

            {/* Glowing Hologram Emblem */}
            <div className="relative flex items-center justify-center h-20 w-20 mb-2">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
              <img 
                src="/logo.png" 
                alt="Hadescore Apex Logo" 
                className="h-16 w-16 object-contain drop-shadow-[0_0_15px_rgba(16,185,129,0.85)] relative z-10 hover:scale-105 transition-transform"
              />
            </div>

            {/* Brand Typography */}
            <div className="space-y-0.5">
              <h2 className="font-display font-black text-sm tracking-wider uppercase text-white leading-tight">
                HADESCORE
              </h2>
              <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-black text-[11px] tracking-widest uppercase">
                <span className="w-3 h-px bg-emerald-400/60" />
                <span>APEX</span>
                <span className="w-3 h-px bg-emerald-400/60" />
              </div>
              <span className="text-[8px] text-emerald-400/90 font-extrabold uppercase tracking-[0.2em] block pt-0.5">
                &amp; TECHNOLOGIES
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 pt-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.exact}
                  onClick={() => onClose()}
                  onMouseEnter={() => handlePrefetch(item.path)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 group ${
                      isActive
                        ? 'cyber-active-nav font-extrabold text-emerald-300'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900/60 hover:border hover:border-emerald-500/30'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon 
                        size={17} 
                        className={`transition-transform duration-200 group-hover:scale-110 ${
                          isActive ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'text-slate-400'
                        }`} 
                      />
                      <span className="flex-1 tracking-wide">{item.label}</span>
                      {isActive && (
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Logout Button */}
        <div className="mt-auto pt-4 border-t border-emerald-500/20">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold w-full text-slate-300 hover:text-white hover:bg-red-500/20 hover:border hover:border-red-500/40 transition-all duration-200 group"
          >
            <LogOut 
              size={17} 
              className="text-slate-400 group-hover:text-red-400 transition-colors duration-200" 
            />
            <span className="flex-1 tracking-wide text-left">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};
