import React, { Suspense, lazy } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Smooth skeleton fallback during tab transition
const TabFallback: React.FC = () => (
  <div className="w-full space-y-6 animate-pulse p-6">
    <div className="h-8 w-64 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl"></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="h-32 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl"></div>
      <div className="h-32 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl"></div>
      <div className="h-32 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl"></div>
    </div>
    <div className="h-80 bg-slate-200/40 dark:bg-slate-800/40 rounded-2xl"></div>
  </div>
);

// Dynamic Lazy Tabs
const DashboardTab = lazy(() => import('./tabs/DashboardTab').then(m => ({ default: m.DashboardTab })));
const StudentsTab = lazy(() => import('./tabs/StudentsTab').then(m => ({ default: m.StudentsTab })));
const CoursesTab = lazy(() => import('./tabs/CoursesTab').then(m => ({ default: m.CoursesTab })));
const LiveClassesTab = lazy(() => import('./tabs/LiveClassesTab').then(m => ({ default: m.LiveClassesTab })));
const LiveAssignmentsTab = lazy(() => import('./tabs/LiveAssignmentsTab').then(m => ({ default: m.LiveAssignmentsTab })));
const AttendanceTab = lazy(() => import('./tabs/AttendanceTab').then(m => ({ default: m.AttendanceTab })));
const AnnouncementsTab = lazy(() => import('./tabs/AnnouncementsTab').then(m => ({ default: m.AnnouncementsTab })));
const ForumTab = lazy(() => import('./tabs/ForumTab').then(m => ({ default: m.ForumTab })));
const DownloadsTab = lazy(() => import('./tabs/DownloadsTab').then(m => ({ default: m.DownloadsTab })));
const ReportsTab = lazy(() => import('./tabs/ReportsTab').then(m => ({ default: m.ReportsTab })));
const NotificationsTab = lazy(() => import('./tabs/NotificationsTab').then(m => ({ default: m.NotificationsTab })));
const ProfileTab = lazy(() => import('./tabs/ProfileTab').then(m => ({ default: m.ProfileTab })));
const SettingsTab = lazy(() => import('./tabs/SettingsTab').then(m => ({ default: m.SettingsTab })));

const StaffDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigate = (tab: string) => {
    navigate(`/staff/${tab}`);
  };

  const path = location.pathname.replace(/\/$/, '');

  const isHome = path === '/staff' || path === '/staff/' || path === '';
  const isStudents = path === '/staff/students';
  const isLive = path === '/staff/live';
  const isRecordings = path === '/staff/recordings';
  const isLiveAssignments = path === '/staff/live-assignments';
  const isAttendance = path === '/staff/attendance';
  const isAnnouncements = path === '/staff/announcements';
  const isForum = path === '/staff/forum';
  const isDownloads = path === '/staff/downloads';
  const isReports = path === '/staff/reports';
  const isNotifications = path === '/staff/notifications';
  const isProfile = path === '/staff/profile';
  const isSettings = path === '/staff/settings';

  return (
    <div className="relative">
      <Suspense fallback={<TabFallback />}>
        {isHome && <DashboardTab onNavigate={handleNavigate} />}
        {isStudents && <StudentsTab />}
        {isLive && <LiveClassesTab />}
        {isRecordings && <CoursesTab isRecordingsMode={true} />}
        {isLiveAssignments && <LiveAssignmentsTab />}
        {isAttendance && <AttendanceTab />}
        {isAnnouncements && <AnnouncementsTab />}
        {isForum && <ForumTab />}
        {isDownloads && <DownloadsTab />}
        {isReports && <ReportsTab />}
        {isNotifications && <NotificationsTab />}
        {isProfile && <ProfileTab />}
        {isSettings && <SettingsTab />}
      </Suspense>
    </div>
  );
};

export default StaffDashboard;
