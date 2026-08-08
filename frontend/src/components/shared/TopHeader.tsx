import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import NotificationCenter from '../student/NotificationCenter';

interface TopHeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const TopHeader: React.FC<TopHeaderProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { user } = useSelector((state: RootState) => state.auth);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/90 backdrop-blur-xl px-6 shadow-sm">
      {/* Toggle Button */}
      <div className="flex flex-1 items-center gap-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-xl p-2 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* System Health Badge */}
        <div className="hidden items-center gap-2 px-3 py-1 bg-cyan-50 border border-cyan-200/80 rounded-full md:flex">
          <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700">Live Workspace</span>
        </div>

        {/* Notification Bell */}
        <NotificationCenter />

        {/* User Info */}
        <div className="hidden text-right md:block">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Signed in as</p>
          {user?.role === 'STUDENT' ? (
            <Link 
              to="/student/profile" 
              className="text-xs font-extrabold text-slate-800 hover:text-cyan-600 transition-colors block"
              title="View Profile Settings"
            >
              {user.first_name ? `${user.first_name} ${user.last_name}` : user.email}
            </Link>
          ) : (
            <p className="text-xs font-extrabold text-slate-800">{user?.email}</p>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
