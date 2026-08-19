import React, { Suspense, lazy } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';

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

const DashboardTabWrapper: React.FC = () => {
  const navigate = useNavigate();
  return <DashboardTab onNavigate={(tab) => navigate(`/staff/${tab}`)} />;
};

const StaffDashboard: React.FC = () => {
  React.useEffect(() => {
    // Preload tab chunks in background for 0ms transitions
    import('./tabs/DashboardTab');
    import('./tabs/StudentsTab');
    import('./tabs/CoursesTab');
    import('./tabs/LiveClassesTab');
    import('./tabs/LiveAssignmentsTab');
    import('./tabs/AttendanceTab');
    import('./tabs/AnnouncementsTab');
    import('./tabs/ForumTab');
    import('./tabs/DownloadsTab');
    import('./tabs/ReportsTab');
    import('./tabs/NotificationsTab');
    import('./tabs/ProfileTab');
    import('./tabs/SettingsTab');
  }, []);

  return (
    <div className="relative">
      <Suspense fallback={<TabFallback />}>
        <Routes>
          <Route index element={<DashboardTabWrapper />} />
          <Route path="students" element={<StudentsTab />} />
          <Route path="live" element={<LiveClassesTab />} />
          <Route path="recordings" element={<CoursesTab isRecordingsMode={true} />} />
          <Route path="live-assignments" element={<LiveAssignmentsTab />} />
          <Route path="attendance" element={<AttendanceTab />} />
          <Route path="announcements" element={<AnnouncementsTab />} />
          <Route path="forum" element={<ForumTab />} />
          <Route path="downloads" element={<DownloadsTab />} />
          <Route path="reports" element={<ReportsTab />} />
          <Route path="notifications" element={<NotificationsTab />} />
          <Route path="profile" element={<ProfileTab />} />
          <Route path="settings" element={<SettingsTab />} />
          <Route path="courses" element={<CoursesTab />} />
          <Route path="assignments" element={<LiveAssignmentsTab />} />
        </Routes>
      </Suspense>
    </div>
  );
};

export default StaffDashboard;
