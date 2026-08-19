import React, { Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';

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

const DashboardTabWrapper: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isLive = location.pathname.startsWith('/admin/live');

  return (
    <DashboardTab
      onNavigate={(tab) => {
        const prefix = isLive ? '/admin/live' : '/admin/course';
        navigate(`${prefix}/${tab}`);
      }}
    />
  );
};

const CategoriesTabWrapper: React.FC = () => {
  const location = useLocation();
  const isLivePath = location.pathname.startsWith('/admin/live');
  const [isLiveClassMode, setIsLiveClassMode] = React.useState(
    isLivePath || localStorage.getItem('super_adminLiveMode') === 'true'
  );

  React.useEffect(() => {
    const handleStorage = () => {
      setIsLiveClassMode(isLivePath || localStorage.getItem('super_adminLiveMode') === 'true');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [isLivePath]);

  return <CategoriesTab type={isLiveClassMode ? 'LIVE' : 'COURSE'} />;
};

const RootRedirect: React.FC = () => {
  const isLiveClassMode = localStorage.getItem('super_adminLiveMode') === 'true';
  return <Navigate to={isLiveClassMode ? '/admin/live/dashboard' : '/admin/course/dashboard'} replace />;
};

const AdminDashboard: React.FC = () => {
  React.useEffect(() => {
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
  }, []);

  return (
    <div className="relative">
      <Suspense fallback={<TabFallback />}>
        <Routes>
          {/* Default Root Redirect */}
          <Route index element={<RootRedirect />} />

          {/* Dedicated Course Admin Routes */}
          <Route path="course" element={<DashboardTabWrapper />} />
          <Route path="course/dashboard" element={<DashboardTabWrapper />} />
          <Route path="course/students" element={<StudentManagementTab />} />
          <Route path="course/attendance" element={<AttendanceTab />} />
          <Route path="course/categories" element={<CategoriesTab type="COURSE" />} />
          <Route path="course/courses" element={<CoursesTab isRecordingsMode={false} />} />
          <Route path="course/modules" element={<ModulesTab />} />
          <Route path="course/lessons" element={<LessonsTab />} />
          <Route path="course/videos" element={<VideoLibraryTab />} />
          <Route path="course/live" element={<LiveClassesTab />} />
          <Route path="course/quizzes" element={<QuizTab />} />
          <Route path="course/assignments" element={<AssignmentTab />} />
          <Route path="course/certificates" element={<CertificateTab />} />
          <Route path="course/forum" element={<DiscussionTab />} />
          <Route path="course/reports" element={<ReportsTab />} />
          <Route path="course/email-templates" element={<EmailTemplatesTab />} />
          <Route path="course/admin-manager" element={<AdminManagerTab />} />

          {/* Dedicated Live Admin Routes */}
          <Route path="live" element={<DashboardTabWrapper />} />
          <Route path="live/dashboard" element={<DashboardTabWrapper />} />
          <Route path="live/staff" element={<StaffManagementTab />} />
          <Route path="live/categories" element={<CategoriesTab type="LIVE" />} />
          <Route path="live/students" element={<StudentManagementTab />} />
          <Route path="live/sessions" element={<LiveClassesTab />} />
          <Route path="live/recordings" element={<CoursesTab isRecordingsMode={true} />} />
          <Route path="live/assignments" element={<LiveAssignmentsTab />} />
          <Route path="live/attendance" element={<AttendanceTab />} />
          <Route path="live/mentor-assignments" element={<MentorAssignmentsTab />} />
          <Route path="live/forum" element={<DiscussionTab />} />
          <Route path="live/email-templates" element={<EmailTemplatesTab />} />

          {/* Shared / General Admin Routes */}
          <Route path="profile" element={<ProfileTab />} />
          <Route path="settings" element={<SystemSettingsTab />} />
          <Route path="security" element={<SecurityCenterTab />} />
          <Route path="preferences" element={<SettingsTab />} />

          {/* Legacy Fallbacks */}
          <Route path="staff" element={<StaffManagementTab />} />
          <Route path="students" element={<StudentManagementTab />} />
          <Route path="categories" element={<CategoriesTabWrapper />} />
          <Route path="courses" element={<CoursesTab />} />
          <Route path="modules" element={<ModulesTab />} />
          <Route path="lessons" element={<LessonsTab />} />
          <Route path="videos" element={<VideoLibraryTab />} />
          <Route path="quizzes" element={<QuizTab />} />
          <Route path="assignments" element={<AssignmentTab />} />
          <Route path="certificates" element={<CertificateTab />} />
          <Route path="attendance" element={<AttendanceTab />} />
          <Route path="recordings" element={<CoursesTab isRecordingsMode={true} />} />
          <Route path="live-assignments" element={<LiveAssignmentsTab />} />
          <Route path="announcements" element={<AnnouncementsTab />} />
          <Route path="notifications" element={<NotificationsTab />} />
          <Route path="forum" element={<DiscussionTab />} />
          <Route path="reports" element={<ReportsTab />} />
          <Route path="email-templates" element={<EmailTemplatesTab />} />
          <Route path="admin-manager" element={<AdminManagerTab />} />

          {/* Wildcard Fallback */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </Suspense>
    </div>
  );
};

export default AdminDashboard;
