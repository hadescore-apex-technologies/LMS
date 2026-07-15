import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Import Tabs
import { DashboardTab } from './tabs/DashboardTab';
import { StaffManagementTab } from './tabs/StaffManagementTab';
import { StudentManagementTab } from './tabs/StudentManagementTab';
import { CategoriesTab } from './tabs/CategoriesTab';
import { CoursesTab } from './tabs/CoursesTab';
import { ModulesTab } from './tabs/ModulesTab';
import { LessonsTab } from './tabs/LessonsTab';
import { VideoLibraryTab } from './tabs/VideoLibraryTab';
import { QuizTab } from './tabs/QuizTab';
import { AssignmentTab } from './tabs/AssignmentTab';
import { CertificateTab } from './tabs/CertificateTab';
import { AttendanceTab } from './tabs/AttendanceTab';
import { LiveClassesTab } from './tabs/LiveClassesTab';
import { AnnouncementsTab } from './tabs/AnnouncementsTab';
import { NotificationsTab } from './tabs/NotificationsTab';
import { DiscussionTab } from './tabs/DiscussionTab';
import { ReportsTab } from './tabs/ReportsTab';
import { SystemSettingsTab } from './tabs/SystemSettingsTab';
import { EmailTemplatesTab } from './tabs/EmailTemplatesTab';
import { SecurityCenterTab } from './tabs/SecurityCenterTab';
import { ProfileTab } from './tabs/ProfileTab';
import { SettingsTab } from './tabs/SettingsTab';

const AdminDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigate = (tab: string) => {
    navigate(`/admin/${tab}`);
  };

  const renderActiveTab = () => {
    const path = location.pathname.replace(/\/$/, '');
    switch (path) {
      case '/admin/staff':
        return <StaffManagementTab />;
      case '/admin/students':
        return <StudentManagementTab />;
      case '/admin/categories':
        return <CategoriesTab />;
      case '/admin/courses':
        return <CoursesTab />;
      case '/admin/modules':
        return <ModulesTab />;
      case '/admin/lessons':
        return <LessonsTab />;
      case '/admin/videos':
        return <VideoLibraryTab />;
      case '/admin/quizzes':
        return <QuizTab />;
      case '/admin/assignments':
        return <AssignmentTab />;
      case '/admin/certificates':
        return <CertificateTab />;
      case '/admin/attendance':
        return <AttendanceTab />;
      case '/admin/live':
        return <LiveClassesTab />;
      case '/admin/announcements':
        return <AnnouncementsTab />;
      case '/admin/notifications':
        return <NotificationsTab />;
      case '/admin/forum':
        return <DiscussionTab />;
      case '/admin/reports':
        return <ReportsTab />;
      case '/admin/settings':
        return <SystemSettingsTab />;
      case '/admin/email-templates':
        return <EmailTemplatesTab />;
      case '/admin/security':
        return <SecurityCenterTab />;
      case '/admin/profile':
        return <ProfileTab />;
      case '/admin/preferences':
        return <SettingsTab />;
      case '/admin':
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

export default AdminDashboard;
