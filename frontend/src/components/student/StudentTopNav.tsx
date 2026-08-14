import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Home, BookOpen, Video, FileCheck, Award, 
  MessageSquare, Sparkles 
} from 'lucide-react';

interface StudentTopNavProps {
  isLiveMode: boolean;
}

export const StudentTopNav: React.FC<StudentTopNavProps> = ({ isLiveMode }) => {
  const location = useLocation();
  const currentPath = location.pathname.replace(/\/$/, '') || '/student';

  const courseNavItems = [
    { label: 'Dashboard', path: '/student', icon: Home },
    { label: 'My Courses', path: '/student/courses', icon: BookOpen },
    { label: 'Live Doubt Sessions', path: '/student/live', icon: Video },
    { label: 'Certifications', path: '/student/certificates', icon: Award },
    { label: 'Queries & Forum', path: '/student/forum', icon: MessageSquare },
  ];

  const liveNavItems = [
    { label: 'Live Dashboard', path: '/student', icon: Home },
    { label: 'Recorded Classes', path: '/student/courses', icon: Video },
    { label: 'Live Sessions', path: '/student/live', icon: Video },
    { label: 'Assignments', path: '/student/assignments', icon: FileCheck },
    { label: 'Live Q&A Forum', path: '/student/forum', icon: MessageSquare },
  ];

  const navItems = isLiveMode ? liveNavItems : courseNavItems;

  return (
    <nav className="w-full bg-[#060a14] border-b border-slate-800/80 px-4 sm:px-6 shadow-md sticky top-16 z-20 overflow-x-auto scrollbar-none">
      <div className="w-full flex items-center gap-2 py-2.5 min-w-max">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path || (item.path !== '/student' && currentPath.startsWith(item.path));
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex items-center gap-2.5 px-4 py-2 rounded-2xl text-xs font-extrabold transition-all duration-200 cursor-pointer group ${
                isActive 
                  ? 'text-white' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeStudentTopNav"
                  className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 shadow-lg shadow-cyan-500/25"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Icon size={15} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-cyan-400 transition-colors'} />
                <span className="tracking-wide">{item.label}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default StudentTopNav;
