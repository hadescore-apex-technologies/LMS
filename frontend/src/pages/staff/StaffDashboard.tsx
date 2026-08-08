import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Staff tabs
import { DashboardTab } from './tabs/DashboardTab';
import { StudentsTab } from './tabs/StudentsTab';
import { CoursesTab } from './tabs/CoursesTab';
import { LiveClassesTab } from './tabs/LiveClassesTab';
import { LiveAssignmentsTab } from './tabs/LiveAssignmentsTab';
import { AttendanceTab } from './tabs/AttendanceTab';
import { AnnouncementsTab } from './tabs/AnnouncementsTab';
import { ForumTab } from './tabs/ForumTab';
import { DownloadsTab } from './tabs/DownloadsTab';
import { ReportsTab } from './tabs/ReportsTab';
import { NotificationsTab } from './tabs/NotificationsTab';
import { ProfileTab } from './tabs/ProfileTab';
import { SettingsTab } from './tabs/SettingsTab';

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
    </div>
  );
};

export default StaffDashboard;
