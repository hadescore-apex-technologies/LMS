import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import { Search, Wifi, Clock, Sun, Bell, Menu, BookOpen } from 'lucide-react';
import NotificationCenter from './NotificationCenter';
import { getInitials } from '../../utils/stringUtils';

interface StudentCyberHeaderProps {
  onToggleSidebar: () => void;
}

export const StudentCyberHeader: React.FC<StudentCyberHeaderProps> = ({ onToggleSidebar }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState<string>('');

  const [isStudentLive, setIsStudentLive] = useState<boolean>(() => {
    return localStorage.getItem('studentLiveMode') === 'true' ||
      Boolean(localStorage.getItem('loginPath')?.includes('live')) ||
      (user as any)?.student_type === 'LIVE_CLASS' ||
      (Boolean(localStorage.getItem('user')) && JSON.parse(localStorage.getItem('user') || '{}')?.student_type === 'LIVE_CLASS');
  });

  const toggleStudentMode = () => {
    const nextVal = !isStudentLive;
    setIsStudentLive(nextVal);
    localStorage.setItem('studentLiveMode', String(nextVal));
    window.dispatchEvent(new Event('storage'));
    if (nextVal) {
      navigate('/live-student');
    } else {
      navigate('/student');
    }
  };

  useEffect(() => {
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
          className="lg:hidden p-2 rounded-2xl cyber-glass-pill text-emerald-400 hover:text-white"
        >
          <Menu size={18} />
        </button>

        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400" size={16} />
          <input
            type="text"
            placeholder="Search courses, topics, or skills..."
            className="w-full h-10 pl-10 pr-4 bg-slate-950/90 border border-emerald-500/40 rounded-2xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 text-xs text-white placeholder:text-slate-400 font-medium transition-all backdrop-blur-2xl shadow-inner"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                navigate('/student/courses');
              }
            }}
          />
        </div>
      </div>

      {/* Right side status indicators (Mode, Time, Weather, Bell, Avatar) */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mode Indicator: Course Mode vs Live Mode (Clickable toggle) */}
        <button 
          onClick={toggleStudentMode}
          title="Click to toggle Course/Live Mode"
          className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer ${
            isStudentLive 
              ? 'bg-slate-950/80 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
              : 'bg-slate-950/80 border-teal-500/30 text-teal-400 shadow-[0_0_10px_rgba(20,184,166,0.2)]'
          }`}
        >
          {isStudentLive ? (
            <>
              <Wifi size={13} className="text-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-300 font-extrabold tracking-wide">Live Mode</span>
            </>
          ) : (
            <>
              <BookOpen size={13} className="text-teal-400" />
              <span className="text-[10px] text-teal-300 font-extrabold tracking-wide">Course Mode</span>
            </>
          )}
        </button>

        {/* Live Clock */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 text-slate-200 text-xs font-mono font-bold shadow-[0_0_10px_rgba(16,185,129,0.15)]">
          <Clock size={13} className="text-emerald-400" />
          <span>{currentTime || '9:41 AM'}</span>
        </div>

        {/* Weather Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 text-slate-200 text-xs font-bold shadow-[0_0_10px_rgba(16,185,129,0.15)]">
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
          <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 p-0.5 shadow-[0_0_12px_rgba(16,185,129,0.4)] group-hover:scale-105 transition-transform">
            <div className="h-full w-full rounded-[14px] bg-slate-950 flex items-center justify-center text-emerald-300 font-extrabold text-xs">
              {getInitials(user?.name || user?.first_name, 'ST')}
            </div>
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-950 rounded-full shadow-[0_0_6px_#34d399]" />
        </div>
      </div>
    </header>
  );
};
