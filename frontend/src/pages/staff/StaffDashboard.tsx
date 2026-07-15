import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Staff tabs
import { DashboardTab } from './tabs/DashboardTab';
import { StudentsTab } from './tabs/StudentsTab';
import { CoursesTab } from './tabs/CoursesTab';
import { LiveClassesTab } from './tabs/LiveClassesTab';
import { AssignmentsTab } from './tabs/AssignmentsTab';
import { QuizzesTab } from './tabs/QuizzesTab';
import { AttendanceTab } from './tabs/AttendanceTab';
import { CertificatesTab } from './tabs/CertificatesTab';
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

  const renderActiveTab = () => {
    const path = location.pathname.replace(/\/$/, '');
    switch (path) {
      case '/staff/students':
        return <StudentsTab />;
      case '/staff/courses':
      case '/staff/modules':
      case '/staff/lessons':
      case '/staff/videos':
        return <CoursesTab />;
      case '/staff/live':
        return <LiveClassesTab />;
      case '/staff/assignments':
        return <AssignmentsTab />;
      case '/staff/quizzes':
        return <QuizzesTab />;
      case '/staff/attendance':
        return <AttendanceTab />;
      case '/staff/certificates':
        return <CertificatesTab />;
      case '/staff/announcements':
        return <AnnouncementsTab />;
      case '/staff/forum':
        return <ForumTab />;
      case '/staff/downloads':
        return <DownloadsTab />;
      case '/staff/reports':
        return <ReportsTab />;
      case '/staff/notifications':
        return <NotificationsTab />;
      case '/staff/profile':
        return <ProfileTab />;
      case '/staff/settings':
        return <SettingsTab />;
      case '/staff':
      default:
        return <DashboardTab onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="relative">
      {renderActiveTab()}
    </div>
  );
};

export default StaffDashboard;
