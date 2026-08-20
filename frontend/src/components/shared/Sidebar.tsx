import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { RootState } from '../../store';
import { logout } from '../../features/authSlice';
import api from '../../services/api';
import { 
  Users, BookOpen, Layers, Video, FileCheck, Award, 
  LogOut, UserCheck, Film, Crown,
  X, Home, FileText, MessageSquare,
  HelpCircle, BarChart2, Mail, Calendar, FileEdit
} from 'lucide-react';


interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { user } = useSelector((state: RootState) => state.auth);

  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handlePrefetch = (path: string) => {
    try {
      if (path === '/admin/students' || path === '/staff/students') {
        queryClient.prefetchQuery({ queryKey: ['admin-students'], queryFn: async () => (await api.get('students/')).data, staleTime: 1000 * 60 * 5 });
      } else if (path.includes('courses')) {
        queryClient.prefetchQuery({ queryKey: ['courses'], queryFn: async () => (await api.get('courses/')).data, staleTime: 1000 * 60 * 5 });
      } else if (user?.role === 'SUPER_ADMIN' && path === '/admin/staff') {
        queryClient.prefetchQuery({ queryKey: ['staff'], queryFn: async () => (await api.get('users/staff/')).data, staleTime: 1000 * 60 * 5 });
      } else if (path.includes('categories')) {
        queryClient.prefetchQuery({ queryKey: ['categories'], queryFn: async () => (await api.get('categories/')).data, staleTime: 1000 * 60 * 5 });
      } else if (path.includes('assignments')) {
        queryClient.prefetchQuery({ queryKey: ['assignments'], queryFn: async () => (await api.get('assignments/')).data, staleTime: 1000 * 60 * 5 });
      } else if (path.includes('quizzes')) {
        queryClient.prefetchQuery({ queryKey: ['quizzes'], queryFn: async () => (await api.get('quizzes/')).data, staleTime: 1000 * 60 * 5 });
      }
    } catch {
      // Ignore background errors
    }
  };

  const [, setStudentCategories] = React.useState<string[]>(user?.categories || []);
  const [, setStaffCategoryName] = React.useState<string | null>(user?.category_name || null);
  
  const liveModeKey = user?.role === 'SUPER_ADMIN' ? 'super_adminLiveMode' : 'staffLiveMode';

  const [isLiveClassMode, setIsLiveClassMode] = React.useState<boolean>(
    localStorage.getItem(liveModeKey) === 'true'
  );

  const toggleLiveClassMode = () => {
    const newVal = !isLiveClassMode;
    setIsLiveClassMode(newVal);
    localStorage.setItem(liveModeKey, String(newVal));
    window.dispatchEvent(new Event('storage'));
    if (user?.role === 'SUPER_ADMIN') {
      navigate(newVal ? '/admin/live/dashboard' : '/admin/course/dashboard');
    }
  };

  React.useEffect(() => {
    const handleStorage = () => {
      setIsLiveClassMode(localStorage.getItem(liveModeKey) === 'true');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [liveModeKey]);

  React.useEffect(() => {
    if (user?.role === 'STUDENT' && (!user.categories || user.categories.length === 0)) {
      api.get('users/profile/')
        .then(res => {
          if (res.data && res.data.categories) {
            setStudentCategories(res.data.categories);
            const updatedUser = { ...user, categories: res.data.categories };
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
        })
        .catch(err => console.error("Failed to load user profile in sidebar", err));
    } else if (user?.categories) {
      setStudentCategories(user.categories);
    } else {
      setStudentCategories([]);
    }

    if (user?.role === 'STAFF' && !user.category_name) {
      api.get('users/profile/')
        .then(res => {
          if (res.data && res.data.category_name) {
            setStaffCategoryName(res.data.category_name);
            const updatedUser = { ...user, category_name: res.data.category_name };
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
        })
        .catch(err => console.error("Failed to load staff profile in sidebar", err));
    } else if (user?.category_name) {
      setStaffCategoryName(user.category_name);
    }
  }, [user]);

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

  const profilePath = React.useMemo(() => {
    if (!user) return '';
    if (user.role === 'STUDENT') return '/student/profile';
    if (user.role === 'STAFF') return '/staff/profile';
    if (user.role === 'SUPER_ADMIN') return '/admin/profile';
    return '';
  }, [user]);

  const menuItems = React.useMemo(() => {
    if (!user) return [];
    
    const staffMenu = [
      { label: 'Dashboard', path: '/staff', icon: Home },
      { label: 'Students', path: '/staff/students', icon: Users },
      { label: 'Attendance', path: '/staff/attendance', icon: Calendar },
      { label: 'Course Builder', path: '/staff/courses', icon: BookOpen },
      { label: 'Doubt Clearing Sessions', path: '/staff/live', icon: Video },
      { label: 'Assignments', path: '/staff/assignments', icon: FileCheck },
      { label: 'Quizzes', path: '/staff/quizzes', icon: HelpCircle },
      { label: 'Certificates', path: '/staff/certificates', icon: Award },
      { label: 'Discussions & Q&A', path: '/staff/forum', icon: MessageSquare },
      { label: 'Analytics & Reports', path: '/staff/reports', icon: BarChart2 },
    ];

    const liveClassStaffMenu = [
      { label: 'Dashboard', path: '/staff', icon: Home },
      { label: 'Students', path: '/staff/students', icon: Users },
      { label: 'Live Sessions', path: '/staff/live', icon: Video },
      { label: 'Recordings', path: '/staff/recordings', icon: Film },
      { label: 'Assignments', path: '/staff/live-assignments', icon: FileEdit },
      { label: 'Attendance', path: '/staff/attendance', icon: Calendar },
      { label: 'Discussions & Q&A', path: '/staff/forum', icon: MessageSquare },
    ];

    const liveClassAdminMenu = [
      { label: 'Dashboard', path: '/admin/live/dashboard', icon: Home },
      { label: 'Staff / Mentors', path: '/admin/live/staff', icon: Users },
      { label: 'Categories', path: '/admin/live/categories', icon: Layers },
      { label: 'Students', path: '/admin/live/students', icon: Users },
      { label: 'Live Sessions', path: '/admin/live/sessions', icon: Video },
      { label: 'Recordings', path: '/admin/live/recordings', icon: Film },
      { label: 'Assignments', path: '/admin/live/assignments', icon: FileEdit },
      { label: 'Attendance', path: '/admin/live/attendance', icon: Calendar },
      { label: 'Mentor Assignments', path: '/admin/live/mentor-assignments', icon: UserCheck },
      { label: 'Discussions & Q&A', path: '/admin/live/forum', icon: MessageSquare },
      { label: 'Email Templates', path: '/admin/live/email-templates', icon: Mail },
    ];

    const courseAdminMenu = [
      { label: 'Dashboard', path: '/admin/course/dashboard', icon: Home },
      { label: 'Students', path: '/admin/course/students', icon: Users },
      { label: 'Attendance', path: '/admin/course/attendance', icon: Calendar },
      { label: 'Categories', path: '/admin/course/categories', icon: Layers },
      { label: 'Courses', path: '/admin/course/courses', icon: BookOpen },
      { label: 'Doubt Clearing Sessions', path: '/admin/course/live', icon: Video },
      { label: 'Quizzes', path: '/admin/course/quizzes', icon: HelpCircle },
      { label: 'Assignments', path: '/admin/course/assignments', icon: FileCheck },
      { label: 'Certificates', path: '/admin/course/certificates', icon: Award },
      { label: 'Discussions & Q&A', path: '/admin/course/forum', icon: MessageSquare },
      { label: 'Analytics & Reports', path: '/admin/course/reports', icon: FileText },
      { label: 'Email Templates', path: '/admin/course/email-templates', icon: Mail },
    ];

    if (user?.role === 'SUPER_ADMIN') {
      const isRoot = user?.email?.toLowerCase().trim() === 'hadescore.apex.technologies@gmail.com';
      if (isLiveClassMode) {
        return liveClassAdminMenu;
      }
      // Course admin mode
      if (isRoot) {
        return [...courseAdminMenu, { label: 'Admin Accounts', path: '/admin/course/admin-manager', icon: Crown }];
      }
      return courseAdminMenu;
    } else if (user?.role === 'STAFF') {
      return liveClassStaffMenu;
    } else {
      // Student Menu
      const isStudentLive = localStorage.getItem('studentLiveMode') === 'true';
      const courseMenu = [
        { label: 'Dashboard', path: '/student', icon: Home },
        { label: 'My Courses', path: '/student/courses', icon: BookOpen },
        { label: 'Certificates', path: '/student/certificates', icon: Award },
        { label: 'Doubt Clearing Sessions', path: '/student/live', icon: Video },
        { label: 'Discussions & Q&A', path: '/student/forum', icon: MessageSquare },
      ];
      const liveMenu = [
        { label: 'Dashboard', path: '/student', icon: Home },
        { label: 'Live Videos', path: '/student/courses', icon: Video },
        { label: 'Live Sessions', path: '/student/live', icon: Video },
        { label: 'Assignments', path: '/student/assignments', icon: FileCheck },
        { label: 'Discussions & Q&A', path: '/student/forum', icon: MessageSquare },
      ];
      return isStudentLive ? liveMenu : courseMenu;
    }
  }, [user, isLiveClassMode]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold';
      case 'STAFF':
        return 'bg-teal-500/15 text-teal-400 border border-teal-500/30 font-bold';
      default:
        return 'bg-sky-500/15 text-sky-400 border border-sky-500/30 font-bold';
    }
  };

  const getRoleLabel = (role: string) => {
    if (role === 'SUPER_ADMIN') return 'Super Admin';
    if (role === 'STAFF') return 'Mentor';
    return 'Student';
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar container — Dark Emerald Glass */}
      <aside className={`
        fixed bottom-0 top-0 left-0 z-50 flex w-72 flex-col
        admin-glass-sidebar transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header - Centered Logo & 3-Line Branding */}
        <div className="relative flex flex-col items-center justify-center text-center pt-5 pb-4 px-4 border-b border-emerald-500/20">
          <button 
            onClick={() => setSidebarOpen(false)}
            className="absolute top-3 right-3 rounded-lg p-1.5 hover:bg-white/10 text-slate-400 hover:text-white lg:hidden"
          >
            <X size={18} />
          </button>

          {/* Logo Emblem with Emerald Glow */}
          <div className="relative flex items-center justify-center h-16 w-16 mb-2">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
            <img 
              src="/logo.png" 
              alt="Hadescore Apex Logo" 
              className="h-14 w-14 object-contain drop-shadow-[0_0_15px_rgba(16,185,129,0.85)] relative z-10 hover:scale-105 transition-transform"
            />
          </div>

          {/* Typography — White/Emerald on Dark */}
          <div className="space-y-0.5">
            <h2 className="font-display font-black text-sm tracking-wider uppercase text-white leading-tight">
              HADESCORE
            </h2>
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-black text-[11px] tracking-widest uppercase">
              <span className="w-3.5 h-px bg-emerald-400/60" />
              <span>APEX</span>
              <span className="w-3.5 h-px bg-emerald-400/60" />
            </div>
            <span className="text-[8.5px] text-emerald-400/90 font-black uppercase tracking-[0.2em] block pt-0.5">
              &amp; TECHNOLOGIES
            </span>
          </div>
        </div>

        {/* Nav list */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path || 
              (item.path !== '/admin' && item.path !== '/staff' && item.path !== '/student' && item.path !== '/' && location.pathname.startsWith(`${item.path}/`));
            return (
              <Link
                key={item.label}
                to={item.path}
                onMouseEnter={() => handlePrefetch(item.path)}
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    setSidebarOpen(false);
                  }
                }}
                className={`
                  flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 group relative
                  ${active 
                    ? 'admin-active-nav font-extrabold text-emerald-300' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/60 hover:border hover:border-emerald-500/30'}
                `}
              >
                <Icon size={17} className={`transition-transform duration-200 group-hover:scale-110 ${active ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {active && (
                  <span className="absolute right-2.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t border-emerald-500/20 space-y-2">
          {user?.role === 'SUPER_ADMIN' && (
            <button
              onClick={toggleLiveClassMode}
              className={`flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm ${
                isLiveClassMode 
                  ? 'text-white bg-violet-600 hover:bg-violet-700 shadow-violet-500/25 border border-violet-500/40' 
                  : 'text-violet-300 bg-violet-500/15 border border-violet-500/30 hover:bg-violet-500/25'
              }`}
            >
              <Video size={15} />
              <span>{isLiveClassMode ? 'Exit Live Class Mode' : 'Live Class Mentoring'}</span>
            </button>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-red-500/20 hover:border-red-500/40 border border-transparent transition-all active:scale-95"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
