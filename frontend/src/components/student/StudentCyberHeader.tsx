import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import { Search, Wifi, Clock, Sun, Bell, Menu } from 'lucide-react';
import NotificationCenter from './NotificationCenter';

interface StudentCyberHeaderProps {
  onToggleSidebar: () => void;
}

export const StudentCyberHeader: React.FC<StudentCyberHeaderProps> = ({ onToggleSidebar }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="w-full h-14 flex items-center justify-between gap-3 px-1 py-1 mb-3">
      {/* Mobile Toggle & Search Bar */}
      <div className="flex items-center gap-2 flex-1 max-w-xl">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-2xl cyber-glass-pill text-cyan-400 hover:text-white"
        >
          <Menu size={18} />
        </button>

        <div className="relative w-full">
          <Search className="absolute left-3.5 top-2.5 text-cyan-400/70" size={15} />
          <input
            type="text"
            placeholder="Search courses, topics, or skills..."
            className="w-full h-10 pl-10 pr-4 bg-slate-950/80 border border-cyan-500/35 rounded-2xl outline-none focus:border-cyan-400 focus:shadow-[0_0_18px_rgba(6,182,212,0.35)] text-xs text-white placeholder:text-slate-400/70 transition-all backdrop-blur-2xl shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                navigate('/student/courses');
              }
            }}
          />
        </div>
      </div>

      {/* Right side status indicators (Wi-Fi, Time, Weather, Bell, Avatar) */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Wi-Fi Status */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-cyan-500/30 text-cyan-400 text-[11px] font-bold shadow-[0_0_10px_rgba(6,182,212,0.15)]">
          <Wifi size={13} className="text-cyan-400 animate-pulse" />
          <span className="text-[10px] text-slate-300">Live</span>
        </div>

        {/* Live Clock */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-cyan-500/30 text-slate-200 text-xs font-mono font-bold shadow-[0_0_10px_rgba(6,182,212,0.15)]">
          <Clock size={13} className="text-cyan-400" />
          <span>{currentTime || '9:41 AM'}</span>
        </div>

        {/* Weather Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-cyan-500/30 text-slate-200 text-xs font-bold shadow-[0_0_10px_rgba(6,182,212,0.15)]">
          <Sun size={13} className="text-amber-400" />
          <span>22°C</span>
        </div>

        {/* Notification Bell */}
        <NotificationCenter />

        {/* Student Avatar */}
        <div
          onClick={() => navigate('/student/profile')}
          className="relative cursor-pointer group"
          title="My Profile"
        >
          <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shadow-[0_0_12px_rgba(6,182,212,0.4)] group-hover:scale-105 transition-transform">
            <div className="h-full w-full rounded-[14px] bg-slate-950 flex items-center justify-center text-cyan-300 font-extrabold text-xs">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'ST'}
            </div>
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-950 rounded-full shadow-[0_0_6px_#34d399]" />
        </div>
      </div>
    </header>
  );
};
