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
const StaffManagementTab = lazy(() => import('./tabs/StaffManagementTab').then(m => ({ default: m.StaffManagementTab })));
const StudentManagementTab = lazy(() => import('./tabs/StudentManagementTab').then(m => ({ default: m.StudentManagementTab })));
const CategoriesTab = lazy(() => import('./tabs/CategoriesTab').then(m => ({ default: m.CategoriesTab })));
const CoursesTab = lazy(() => import('./tabs/CoursesTab').then(m => ({ default: m.CoursesTab })));
const ModulesTab = lazy(() => import('./tabs/ModulesTab').then(m => ({ default: m.ModulesTab })));
const LessonsTab = lazy(() => import('./tabs/LessonsTab').then(m => ({ default: m.LessonsTab })));
const VideoLibraryTab = lazy(() => import('./tabs/VideoLibraryTab').then(m => ({ default: m.VideoLibraryTab })));
const QuizTab = lazy(() => import('./tabs/QuizTab').then(m => ({ default: m.QuizTab })));
const AssignmentTab = lazy(() => import('./tabs/AssignmentTab').then(m => ({ default: m.AssignmentTab })));
const CertificateTab = lazy(() => import('./tabs/CertificateTab').then(m => ({ default: m.CertificateTab })));
const AttendanceTab = lazy(() => import('./tabs/AttendanceTab').then(m => ({ default: m.AttendanceTab })));
const LiveClassesTab = lazy(() => import('./tabs/LiveClassesTab').then(m => ({ default: m.LiveClassesTab })));
const LiveAssignmentsTab = lazy(() => import('./tabs/LiveAssignmentsTab').then(m => ({ default: m.LiveAssignmentsTab })));
const AnnouncementsTab = lazy(() => import('./tabs/AnnouncementsTab').then(m => ({ default: m.AnnouncementsTab })));
const NotificationsTab = lazy(() => import('./tabs/NotificationsTab').then(m => ({ default: m.NotificationsTab })));
const DiscussionTab = lazy(() => import('./tabs/DiscussionTab').then(m => ({ default: m.DiscussionTab })));
const ReportsTab = lazy(() => import('./tabs/ReportsTab').then(m => ({ default: m.ReportsTab })));
const SystemSettingsTab = lazy(() => import('./tabs/SystemSettingsTab').then(m => ({ default: m.SystemSettingsTab })));
const EmailTemplatesTab = lazy(() => import('./tabs/EmailTemplatesTab').then(m => ({ default: m.EmailTemplatesTab })));
const SecurityCenterTab = lazy(() => import('./tabs/SecurityCenterTab').then(m => ({ default: m.SecurityCenterTab })));
const ProfileTab = lazy(() => import('./tabs/ProfileTab').then(m => ({ default: m.ProfileTab })));
const SettingsTab = lazy(() => import('./tabs/SettingsTab').then(m => ({ default: m.SettingsTab })));
const MentorAssignmentsTab = lazy(() => import('./tabs/MentorAssignmentsTab').then(m => ({ default: m.MentorAssignmentsTab })));
const AdminManagerTab = lazy(() => import('./tabs/AdminManagerTab').then(m => ({ default: m.AdminManagerTab })));

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

    // Preload tab chunks in background for 0ms transitions
    import('./tabs/DashboardTab');
    import('./tabs/StaffManagementTab');
    import('./tabs/StudentManagementTab');
    import('./tabs/CategoriesTab');
    import('./tabs/CoursesTab');
    import('./tabs/ModulesTab');
    import('./tabs/LessonsTab');
    import('./tabs/VideoLibraryTab');
    import('./tabs/QuizTab');
    import('./tabs/AssignmentTab');
    import('./tabs/CertificateTab');
    import('./tabs/AttendanceTab');
    import('./tabs/LiveClassesTab');
    import('./tabs/LiveAssignmentsTab');
    import('./tabs/AnnouncementsTab');
    import('./tabs/NotificationsTab');
    import('./tabs/DiscussionTab');
    import('./tabs/ReportsTab');
    import('./tabs/SystemSettingsTab');
    import('./tabs/EmailTemplatesTab');
    import('./tabs/SecurityCenterTab');
    import('./tabs/ProfileTab');
    import('./tabs/SettingsTab');
    import('./tabs/MentorAssignmentsTab');
    import('./tabs/AdminManagerTab');

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
      <Suspense fallback={<TabFallback />}>
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
      </Suspense>
    </div>
  );
};

export default AdminDashboard;
