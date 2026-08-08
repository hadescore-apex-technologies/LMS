import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
    window.location.reload(); // Refresh to apply context
  };

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
    // Capture role BEFORE dispatch clears user from state
    const role = user?.role;
    dispatch(logout());
    if (role === 'SUPER_ADMIN') navigate('/admin/login');
    else if (role === 'STAFF') navigate('/staff/login');
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
      { label: 'Staff Home', path: '/staff', icon: Home },
      { label: 'Student Management', path: '/staff/students', icon: Users },
      { label: 'Student Attendance', path: '/staff/attendance', icon: Calendar },
      { label: 'Course Builder', path: '/staff/courses', icon: BookOpen },
      { label: 'Student Submissions', path: '/staff/assignments', icon: FileCheck },
      { label: 'Quizzes Evaluation', path: '/staff/quizzes', icon: HelpCircle },
      { label: 'Issue Certificates', path: '/staff/certificates', icon: Award },
      { label: 'Queries Manage', path: '/staff/forum', icon: MessageSquare },
      { label: 'Reports & Analytics', path: '/staff/reports', icon: BarChart2 },
    ];

    const liveClassStaffMenu = [
      { label: 'Mentoring Dashboard', path: '/staff', icon: Home },
      { label: 'Live Mentees Roster', path: '/staff/students', icon: Users },
      { label: 'Live Sessions', path: '/staff/live', icon: Video },
      { label: 'Manage Recordings', path: '/staff/recordings', icon: Film },
      { label: 'Assignments', path: '/staff/live-assignments', icon: FileEdit },
      { label: 'Class Attendance', path: '/staff/attendance', icon: Calendar },
      { label: 'Queries Manage', path: '/staff/forum', icon: MessageSquare },
    ];

    const liveClassAdminMenu = [
      { label: 'Admin Home', path: '/admin', icon: Home },
      { label: 'Staff Management', path: '/admin/staff', icon: Users },
      { label: 'Mentoring Domains', path: '/admin/categories', icon: Layers },
      { label: 'Student Management', path: '/admin/students', icon: Users },
      { label: 'Live Mentoring Sessions', path: '/admin/live', icon: Video },
      { label: 'Manage Recordings', path: '/admin/recordings', icon: Film },
      { label: 'Assignments', path: '/admin/live-assignments', icon: FileEdit },
      { label: 'Class Attendance', path: '/admin/attendance', icon: Calendar },
      { label: 'Live Mentor Assignments', path: '/admin/mentor-assignments', icon: UserCheck },
      { label: 'Queries Manage', path: '/admin/forum', icon: MessageSquare },
      { label: 'Email Templates', path: '/admin/email-templates', icon: Mail },
    ];

    const courseAdminMenu = [
      { label: 'Admin Home', path: '/admin', icon: Home },
      { label: 'Student Management', path: '/admin/students', icon: Users },
      { label: 'Student Attendance', path: '/admin/attendance', icon: Calendar },
      { label: 'Course Categories', path: '/admin/categories', icon: Layers },
      { label: 'Courses Catalog', path: '/admin/courses', icon: BookOpen },
      { label: 'Doubt Clearing Sessions', path: '/admin/live', icon: Video },
      { label: 'Quiz Management', path: '/admin/quizzes', icon: HelpCircle },
      { label: 'Assignment Inbox', path: '/admin/assignments', icon: FileCheck },
      { label: 'Certificates Issued', path: '/admin/certificates', icon: Award },
      { label: 'Queries Manage', path: '/admin/forum', icon: MessageSquare },
      { label: 'Course Analytics', path: '/admin/reports', icon: FileText },
      { label: 'Email Templates', path: '/admin/email-templates', icon: Mail },
    ];

    if (user?.role === 'SUPER_ADMIN') {
      const isRoot = user?.email?.toLowerCase().trim() === 'hadescore.apex.technologies@gmail.com';
      if (isLiveClassMode) {
        return liveClassAdminMenu;
      }
      // Course admin mode
      if (isRoot) {
        return [...courseAdminMenu, { label: 'Admin Manager', path: '/admin/admin-manager', icon: Crown }];
      }
      return courseAdminMenu;
    } else if (user?.role === 'STAFF') {
      return liveClassStaffMenu;
    } else {
      // Student Menu
      const isStudentLive = localStorage.getItem('studentLiveMode') === 'true';
      const courseMenu = [
        { label: 'Student Home', path: '/student', icon: Home },
        { label: 'My Courses', path: '/student/courses', icon: BookOpen },
        { label: 'Certificates', path: '/student/certificates', icon: Award },
        { label: 'Doubt Clearing Sessions', path: '/student/live', icon: Video },
        { label: 'Study Notes', path: '/student/notes', icon: FileText },
        { label: 'Queries', path: '/student/forum', icon: MessageSquare },
      ];
      const liveMenu = [
        { label: 'Live Portal Home', path: '/student', icon: Home },
        { label: 'Live Videos', path: '/student/courses', icon: Video },
        { label: 'Live Sessions', path: '/student/live', icon: Video },
        { label: 'Assignments', path: '/student/assignments', icon: FileCheck },
        { label: 'Study Notes', path: '/student/notes', icon: FileText },
        { label: 'Live Q&A Forum', path: '/student/forum', icon: MessageSquare },
      ];
      return isStudentLive ? liveMenu : courseMenu;
    }
  }, [user, isLiveClassMode]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-cyan-50 text-cyan-700 border border-cyan-200/80 font-bold';
      case 'STAFF':
        return 'bg-teal-50 text-teal-700 border border-teal-200/80 font-bold';
      default:
        return 'bg-sky-50 text-sky-700 border border-sky-200/80 font-bold';
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
          className="fixed inset-0 z-40 bg-slate-900/60 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside className={`
        fixed bottom-0 top-0 left-0 z-50 flex w-72 flex-col
        bg-white border-r border-slate-200/80 shadow-sm transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-200/80 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="Hadescore Apex Logo" 
              className="h-9 w-9 object-contain drop-shadow-md"
            />
            <div>
              <span className="font-display font-extrabold text-xs tracking-wider uppercase text-slate-800 block whitespace-nowrap leading-tight">HADESCORE APEX</span>
              <span className="text-[9px] text-cyan-600 font-extrabold uppercase tracking-widest block">&amp; TECHNOLOGIES</span>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 hover:bg-slate-200/60 text-slate-500 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Profile Card Summary */}
        <div className="p-4 border-b border-slate-200/80 bg-gradient-to-b from-cyan-50/30 to-transparent">
          {profilePath ? (
            <Link 
              to={profilePath} 
              className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-cyan-400 transition-all duration-300 group block"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 font-black text-sm border border-cyan-100 group-hover:bg-cyan-600 group-hover:text-white transition-all">
                {user?.first_name?.charAt(0) || 'U'}
              </div>
              <div className="overflow-hidden flex-1">
                <h4 className="font-extrabold text-xs text-slate-800 truncate group-hover:text-cyan-600 transition-colors">{user?.first_name} {user?.last_name}</h4>
                <span className={`inline-block text-[9px] px-2 py-0.5 mt-1 rounded-md font-bold uppercase tracking-wide ${getRoleBadge(user?.role || '')}`}>
                  {getRoleLabel(user?.role || '')}
                </span>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 font-black text-sm border border-cyan-100">
                {user?.first_name?.charAt(0) || 'U'}
              </div>
              <div className="overflow-hidden flex-1">
                <h4 className="font-extrabold text-xs text-slate-800 truncate">{user?.first_name} {user?.last_name}</h4>
                <span className={`inline-block text-[9px] px-2 py-0.5 mt-1 rounded-md font-bold uppercase tracking-wide ${getRoleBadge(user?.role || '')}`}>
                  {getRoleLabel(user?.role || '')}
                </span>
              </div>
            </div>
          )}
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
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    setSidebarOpen(false);
                  }
                }}
                className={`
                  flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group relative
                  ${active 
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/25 font-bold scale-[1.01]' 
                    : 'text-slate-600 hover:bg-cyan-50/70 hover:text-cyan-700'}
                `}
              >
                <Icon size={17} className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-cyan-600'}`} />
                <span>{item.label}</span>
                {active && (
                  <span className="absolute right-2.5 h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-50/40 space-y-2">
          {user?.role === 'SUPER_ADMIN' && (
            <button
              onClick={toggleLiveClassMode}
              className={`flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm ${
                isLiveClassMode 
                  ? 'text-white bg-violet-600 hover:bg-violet-700 shadow-violet-500/25' 
                  : 'text-violet-600 bg-violet-50 border border-violet-200/60 hover:bg-violet-100/80'
              }`}
            >
              <Video size={15} />
              <span>{isLiveClassMode ? 'Exit Live Class Mode' : 'Live Class Mentoring'}</span>
            </button>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/60 transition-all active:scale-95 shadow-sm"
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
