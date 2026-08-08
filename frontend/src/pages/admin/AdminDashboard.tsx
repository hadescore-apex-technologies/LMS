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
import { LiveAssignmentsTab } from './tabs/LiveAssignmentsTab';
import { AnnouncementsTab } from './tabs/AnnouncementsTab';
import { NotificationsTab } from './tabs/NotificationsTab';
import { DiscussionTab } from './tabs/DiscussionTab';
import { ReportsTab } from './tabs/ReportsTab';
import { SystemSettingsTab } from './tabs/SystemSettingsTab';
import { EmailTemplatesTab } from './tabs/EmailTemplatesTab';
import { SecurityCenterTab } from './tabs/SecurityCenterTab';
import { ProfileTab } from './tabs/ProfileTab';
import { SettingsTab } from './tabs/SettingsTab';
import { MentorAssignmentsTab } from './tabs/MentorAssignmentsTab';
import { AdminManagerTab } from './tabs/AdminManagerTab';

const AdminDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigate = (tab: string) => {
    navigate(`/admin/${tab}`);
  };

  const [isLiveClassMode, setIsLiveClassMode] = React.useState(localStorage.getItem('super_adminLiveMode') === 'true');

  React.useEffect(() => {
    const handleStorage = () => {
      setIsLiveClassMode(localStorage.getItem('super_adminLiveMode') === 'true');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const path = location.pathname.replace(/\/$/, '');

  const isHome = path === '/admin' || path === '/admin/' || path === '';
  const isStaff = path === '/admin/staff' && isLiveClassMode;
  const isStudents = path === '/admin/students';
  const isCategories = path === '/admin/categories';
  const isCourses = path === '/admin/courses';
  const isModules = path === '/admin/modules';
  const isLessons = path === '/admin/lessons';
  const isVideos = path === '/admin/videos';
  const isQuizzes = path === '/admin/quizzes';
  const isAssignments = path === '/admin/assignments';
  const isCertificates = path === '/admin/certificates';
  const isAttendance = path === '/admin/attendance';
  const isLive = path === '/admin/live';
  const isRecordings = path === '/admin/recordings' && isLiveClassMode;
  const isLiveAssignments = path === '/admin/live-assignments' && isLiveClassMode;
  const isAnnouncements = path === '/admin/announcements';
  const isNotifications = path === '/admin/notifications';
  const isForum = path === '/admin/forum';
  const isReports = path === '/admin/reports';
  const isSettings = path === '/admin/settings';
  const isEmailTemplates = path === '/admin/email-templates';
  const isSecurity = path === '/admin/security';
  const isProfile = path === '/admin/profile';
  const isPreferences = path === '/admin/preferences';
  const isMentorAssignments = path === '/admin/mentor-assignments' && isLiveClassMode;
  const isAdminManager = path === '/admin/admin-manager';

  return (
    <div className="relative">
      {isHome && <DashboardTab onNavigate={handleNavigate} />}
      {isStaff && <StaffManagementTab />}
      {isStudents && <StudentManagementTab />}
      {isCategories && <CategoriesTab type={isLiveClassMode ? 'LIVE' : 'COURSE'} />}
      {isCourses && <CoursesTab />}
      {isModules && <ModulesTab />}
      {isLessons && <LessonsTab />}
      {isVideos && <VideoLibraryTab />}
      {isQuizzes && <QuizTab />}
      {isAssignments && <AssignmentTab />}
      {isCertificates && <CertificateTab />}
      {isAttendance && <AttendanceTab />}
      {isLive && <LiveClassesTab />}
      {isRecordings && <CoursesTab isRecordingsMode={true} />}
      {isLiveAssignments && <LiveAssignmentsTab />}
      {isAnnouncements && <AnnouncementsTab />}
      {isNotifications && <NotificationsTab />}
      {isForum && <DiscussionTab />}
      {isReports && <ReportsTab />}
      {isSettings && <SystemSettingsTab />}
      {isEmailTemplates && <EmailTemplatesTab />}
      {isSecurity && <SecurityCenterTab />}
      {isProfile && <ProfileTab />}
      {isPreferences && <SettingsTab />}
      {isMentorAssignments && <MentorAssignmentsTab />}
      {isAdminManager && <AdminManagerTab />}
    </div>
  );
};

export default AdminDashboard;
