import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

// Layouts & Auth
import DashboardLayout from '../layouts/DashboardLayout';
import LoginPage from '../pages/auth/LoginPage';

// Admin Pages
import AdminDashboard from '../pages/admin/AdminDashboard';

// Staff Pages
import StaffDashboard from '../pages/staff/StaffDashboard';

// Student Pages
import StudentDashboard from '../pages/student/StudentDashboard';

interface GuardProps {
  children: React.ReactNode;
  allowedRoles: ('SUPER_ADMIN' | 'STAFF' | 'STUDENT')[];
}

const ProtectedRoute: React.FC<GuardProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loginPath } = useSelector((state: RootState) => state.auth);

  if (!isAuthenticated || !user) {
    const savedLoginPath = loginPath || localStorage.getItem('loginPath');
    const isLiveStudent = localStorage.getItem('studentLiveMode') === 'true' ||
      Boolean(savedLoginPath?.includes('live'));

    if (allowedRoles.includes('SUPER_ADMIN')) {
      return <Navigate to="/admin/login" replace />;
    } else if (allowedRoles.includes('STAFF')) {
      return <Navigate to="/staff/login" replace />;
    } else if (isLiveStudent || savedLoginPath === '/student/live-login') {
      return <Navigate to="/student/live-login" replace />;
    } else {
      return <Navigate to="/student/login" replace />;
    }
  }

  if (!allowedRoles.includes(user.role)) {
    // Graceful redirection to own landing point
    if (user.role === 'SUPER_ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'STAFF') return <Navigate to="/staff" replace />;
    return <Navigate to="/student" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Authentication */}
      <Route path="/" element={<Navigate to="/student/login" replace />} />
      <Route path="/admin/login" element={<LoginPage role="SUPER_ADMIN" />} />
      <Route path="/staff/login" element={<LoginPage role="STAFF" />} />

      {/* Course Student Dedicated Login Routes */}
      <Route path="/student/login" element={<LoginPage role="STUDENT" mode="COURSE" />} />
      <Route path="/course/login" element={<LoginPage role="STUDENT" mode="COURSE" />} />
      <Route path="/course-login" element={<LoginPage role="STUDENT" mode="COURSE" />} />

      {/* Live Student Dedicated Login Routes */}
      <Route path="/student/live-login" element={<LoginPage role="STUDENT" mode="LIVE" />} />
      <Route path="/live/login" element={<LoginPage role="STUDENT" mode="LIVE" />} />
      <Route path="/live-login" element={<LoginPage role="STUDENT" mode="LIVE" />} />
      <Route path="/live-student/login" element={<LoginPage role="STUDENT" mode="LIVE" />} />

      {/* Authenticated Dashboard Core */}
      <Route element={<DashboardLayout />}>
        {/* Super Admin Dashboard Routes */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/staff" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/categories" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/courses" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/modules" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/lessons" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/videos" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/quizzes" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/assignments" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/certificates" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/attendance" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/live" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/recordings" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/live-assignments" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/announcements" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/forum" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/email-templates" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/security" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/profile" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/preferences" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/mentor-assignments" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/admin-manager" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />

        {/* Staff Dashboard Routes */}
        <Route 
          path="/staff" 
          element={
            <ProtectedRoute allowedRoles={['STAFF', 'SUPER_ADMIN']}>
              <StaffDashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="/staff/students" element={<ProtectedRoute allowedRoles={['STAFF', 'SUPER_ADMIN']}><StaffDashboard /></ProtectedRoute>} />
        <Route path="/staff/courses" element={<ProtectedRoute allowedRoles={['STAFF', 'SUPER_ADMIN']}><StaffDashboard /></ProtectedRoute>} />
        <Route path="/staff/categories" element={<ProtectedRoute allowedRoles={['STAFF', 'SUPER_ADMIN']}><StaffDashboard /></ProtectedRoute>} />
        <Route path="/staff/modules" element={<ProtectedRoute allowedRoles={['STAFF', 'SUPER_ADMIN']}><StaffDashboard /></ProtectedRoute>} />
        <Route path="/staff/lessons" element={<ProtectedRoute allowedRoles={['STAFF', 'SUPER_ADMIN']}><StaffDashboard /></ProtectedRoute>} />
        <Route path="/staff/videos" element={<ProtectedRoute allowedRoles={['STAFF', 'SUPER_ADMIN']}><StaffDashboard /></ProtectedRoute>} />
        <Route path="/staff/live" element={<ProtectedRoute allowedRoles={['STAFF', 'SUPER_ADMIN']}><StaffDashboard /></ProtectedRoute>} />
        <Route path="/staff/recordings" element={<ProtectedRoute allowedRoles={['STAFF', 'SUPER_ADMIN']}><StaffDashboard /></ProtectedRoute>} />
        <Route path="/staff/live-assignments" element={<ProtectedRoute allowedRoles={['STAFF', 'SUPER_ADMIN']}><StaffDashboard /></ProtectedRoute>} />
        <Route path="/staff/assignments" element={<ProtectedRoute allowedRoles={['STAFF', 'SUPER_ADMIN']}><StaffDashboard /></ProtectedRoute>} />
        <Route path="/staff/quizzes" element={<ProtectedRoute allowedRoles={['STAFF', 'SUPER_ADMIN']}><StaffDashboard /></ProtectedRoute>} />
        <Route path="/staff/attendance" element={<ProtectedRoute allowedRoles={['STAFF', 'SUPER_ADMIN']}><StaffDashboard /></ProtectedRoute>} />
        <Route path="/staff/certificates" element={<ProtectedRoute allowedRoles={['STAFF', 'SUPER_ADMIN']}><StaffDashboard /></ProtectedRoute>} />
        <Route path="/staff/announcements" element={<ProtectedRoute allowedRoles={['STAFF', 'SUPER_ADMIN']}><StaffDashboard /></ProtectedRoute>} />
        <Route path="/staff/forum" element={<ProtectedRoute allowedRoles={['STAFF', 'SUPER_ADMIN']}><StaffDashboard /></ProtectedRoute>} />
        <Route path="/staff/downloads" element={<ProtectedRoute allowedRoles={['STAFF', 'SUPER_ADMIN']}><StaffDashboard /></ProtectedRoute>} />
        <Route path="/staff/reports" element={<ProtectedRoute allowedRoles={['STAFF', 'SUPER_ADMIN']}><StaffDashboard /></ProtectedRoute>} />
        <Route path="/staff/notifications" element={<ProtectedRoute allowedRoles={['STAFF', 'SUPER_ADMIN']}><StaffDashboard /></ProtectedRoute>} />
        <Route path="/staff/profile" element={<ProtectedRoute allowedRoles={['STAFF', 'SUPER_ADMIN']}><StaffDashboard /></ProtectedRoute>} />
        <Route path="/staff/settings" element={<ProtectedRoute allowedRoles={['STAFF', 'SUPER_ADMIN']}><StaffDashboard /></ProtectedRoute>} />

        {/* Student Dashboard Routes */}
        <Route 
          path="/student" 
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentDashboard />
            </ProtectedRoute>
          } 
        />
        {/* Student Navigation Routes */}
        <Route path="/student/courses" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/live" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/assignments" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/certificates" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/achievements" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/leaderboard" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/forum" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
      </Route>

      {/* Root Fallback */}
      <Route path="/" element={<Navigate to="/student/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
