import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { Search, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import NotificationCenter from '../student/NotificationCenter';

interface TopHeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

const TopHeader: React.FC<TopHeaderProps> = ({ setSidebarOpen }) => {
  const { user } = useSelector((state: RootState) => state.auth);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/90 backdrop-blur-xl px-6 shadow-sm">
      {/* Search and Mobile Button */}
      <div className="flex flex-1 items-center gap-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-xl p-2 hover:bg-slate-100 lg:hidden text-slate-600 transition-colors"
        >
          <Menu size={20} />
        </button>

        {/* Search Input */}
        <div className="relative hidden max-w-md w-full sm:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search catalog, lessons, modules, students..."
            className="h-10 w-full rounded-xl bg-slate-100/70 pl-10 pr-4 text-xs font-medium outline-none border border-slate-200/60 focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/10 transition-all text-slate-800 placeholder:text-slate-400"
          />
        </div>
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
