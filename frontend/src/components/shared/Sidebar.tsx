import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import { logout } from '../../features/authSlice';
import { toggleTheme } from '../../features/themeSlice';
import api from '../../services/api';
import { 
  Users, BookOpen, Layers, Video, FileCheck, Award, 
  LogOut, Sun, Moon, 
  X, Home, FileText, MessageSquare,
  HelpCircle, BarChart2, Mail
} from 'lucide-react';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { mode } = useSelector((state: RootState) => state.theme);
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  const [studentCategories, setStudentCategories] = React.useState<string[]>(user?.categories || []);
  const [staffCategoryName, setStaffCategoryName] = React.useState<string | null>(user?.category_name || null);

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
    dispatch(logout());
    navigate('/login');
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
      { label: 'Course Builder', path: '/staff/courses', icon: BookOpen },
      { label: 'Live Classes', path: '/staff/live', icon: Video },
      { label: 'Student Submissions', path: '/staff/assignments', icon: FileCheck },
      { label: 'Quizzes Evaluation', path: '/staff/quizzes', icon: HelpCircle },
      { label: 'Issue Certificates', path: '/staff/certificates', icon: Award },
      { label: 'Discussion Forum', path: '/staff/forum', icon: MessageSquare },
      { label: 'Reports & Analytics', path: '/staff/reports', icon: BarChart2 },
    ];

    if (user?.role === 'SUPER_ADMIN') {
      return [
        { label: 'Admin Home', path: '/admin', icon: Home },
        { label: 'Staff Management', path: '/admin/staff', icon: Users },
        { label: 'Student Management', path: '/admin/students', icon: Users },
        { label: 'Course Categories', path: '/admin/categories', icon: Layers },
        { label: 'Courses catalog', path: '/admin/courses', icon: BookOpen },
        { label: 'Quiz Management', path: '/admin/quizzes', icon: HelpCircle },
        { label: 'Assignment Inbox', path: '/admin/assignments', icon: FileCheck },
        { label: 'Certificates issued', path: '/admin/certificates', icon: Award },
        { label: 'Live Classes slots', path: '/admin/live', icon: Video },
        { label: 'Forum moderation', path: '/admin/forum', icon: MessageSquare },
        { label: 'Reports reports', path: '/admin/reports', icon: FileText },
        { label: 'Email Templates', path: '/admin/email-templates', icon: Mail },
      ];
    } else if (user.role === 'STAFF') {
      return staffMenu;
    } else {
      // Student Menu
      return [
        { label: 'Student Home', path: '/student', icon: Home },
        { label: 'My Courses', path: '/student/courses', icon: BookOpen },
        { label: 'Live Classes', path: '/student/live', icon: Video },
        { label: 'Certificates', path: '/student/certificates', icon: Award },
        { label: 'Study Notes', path: '/student/notes', icon: FileText },
        { label: 'Discussion Board', path: '/student/forum', icon: MessageSquare },
      ];
    }
  }, [user]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 dark:bg-indigo-500/20 dark:text-indigo-400';
      case 'STAFF':
        return 'bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 dark:bg-cyan-500/20 dark:text-cyan-400';
      default:
        return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400';
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
          className="fixed inset-0 z-40 bg-black/60 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside className={`
        fixed bottom-0 top-0 left-0 z-50 flex w-72 flex-col
        glass-panel border-r border-border/50 transition-transform duration-300 ease-in-out lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-border">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png?v=2" alt="Hadescore Logo" className="h-9 w-9 object-contain" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,200,255,0.3))' }} />
            <div>
              <span className="font-display font-bold text-xs tracking-tight block whitespace-nowrap">HADESCORE APEX & TECHNOLOGIES</span>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 hover:bg-muted lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Profile Card Summary */}
        <div className="p-5 border-b border-border">
          {profilePath ? (
            <Link 
              to={profilePath} 
              className="flex items-center gap-3 bg-muted/40 p-3.5 rounded-xl border border-border/50 hover:bg-primary/5 hover:border-primary/30 transition-all duration-300 group block"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-primary/20 to-primary/10 text-primary font-semibold text-sm border border-primary/20 group-hover:scale-105 transition-transform">
                {user?.first_name?.charAt(0) || 'U'}
              </div>
              <div className="overflow-hidden flex-1">
                <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{user?.first_name} {user?.last_name}</h4>
                <span className={`inline-block text-[10px] px-2 py-0.5 mt-1 rounded-full font-medium ${getRoleBadge(user?.role || '')}`}>
                  {getRoleLabel(user?.role || '')}
                </span>
                {user?.role === 'STUDENT' && studentCategories.length > 0 && (
                  <div className="text-[11px] text-muted-foreground mt-1 truncate font-medium" title={studentCategories.join(', ')}>
                    {studentCategories.join(', ')}
                  </div>
                )}
                {user?.role === 'STAFF' && staffCategoryName && (
                  <div className="text-[11px] text-muted-foreground mt-1 truncate font-medium" title={staffCategoryName}>
                    {staffCategoryName}
                  </div>
                )}
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-3 bg-muted/40 p-3.5 rounded-xl border border-border/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-primary/20 to-primary/10 text-primary font-semibold text-sm border border-primary/20">
                {user?.first_name?.charAt(0) || 'U'}
              </div>
              <div className="overflow-hidden flex-1">
                <h4 className="font-semibold text-sm truncate">{user?.first_name} {user?.last_name}</h4>
                <span className={`inline-block text-[10px] px-2 py-0.5 mt-1 rounded-full font-medium ${getRoleBadge(user?.role || '')}`}>
                  {getRoleLabel(user?.role || '')}
                </span>
                {user?.role === 'STAFF' && staffCategoryName && (
                  <div className="text-[11px] text-muted-foreground mt-1 truncate font-medium" title={staffCategoryName}>
                    {staffCategoryName}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Nav list */}
        <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = (item.path === '/admin' || item.path === '/staff' || item.path === '/student')
              ? location.pathname === item.path
              : location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                  ${active 
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]' 
                    : 'text-muted-foreground hover:bg-white/10 dark:hover:bg-white/5 hover:text-foreground hover:translate-x-1'}
                `}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t border-border space-y-2">
          {/* Theme switcher */}
          <button 
            onClick={() => dispatch(toggleTheme())}
            className="flex w-full items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <div className="flex items-center gap-3">
              {mode === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
              <span>{mode === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
            </div>
            <div className="h-5 w-9 rounded-full bg-muted border border-border relative flex items-center px-0.5">
              <div className={`h-4 w-4 rounded-full bg-foreground shadow-sm transition-transform duration-200 ${mode === 'dark' ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
