import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();

  if (!isAuthenticated || !user) {
    const savedLoginPath = loginPath || localStorage.getItem('loginPath');
    const isLiveStudent = localStorage.getItem('studentLiveMode') === 'true' ||
      Boolean(savedLoginPath?.includes('live')) ||
      location.pathname.includes('live-student');

    if (location.pathname.startsWith('/admin') || savedLoginPath === '/admin/login') {
      return <Navigate to="/admin/login" replace />;
    } else if (location.pathname.startsWith('/staff') || savedLoginPath === '/staff/login') {
      return <Navigate to="/staff/login" replace />;
    } else if (isLiveStudent || savedLoginPath === '/student/live-login') {
      return <Navigate to="/student/live-login" replace />;
    } else if (savedLoginPath) {
      return <Navigate to={savedLoginPath} replace />;
    } else if (allowedRoles.includes('SUPER_ADMIN') && !allowedRoles.includes('STAFF')) {
      return <Navigate to="/admin/login" replace />;
    } else if (allowedRoles.includes('STAFF')) {
      return <Navigate to="/staff/login" replace />;
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
        <Route path="/admin/*" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />

        {/* Staff Dashboard Routes */}
        <Route 
          path="/staff/*" 
          element={
            <ProtectedRoute allowedRoles={['STAFF', 'SUPER_ADMIN']}>
              <StaffDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Course Student Navigation Routes */}
        <Route path="/student" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/courses" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/live" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/assignments" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/certificates" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/achievements" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/leaderboard" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/forum" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />

        {/* Live Student Dedicated Navigation Routes */}
        <Route path="/live-student" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/live-student/dashboard" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/live-student/videos" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/live-student/sessions" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/live-student/live" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/live-student/assignments" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/live-student/forum" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/live-student/profile" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/live-student/achievements" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/live-student/leaderboard" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />

        {/* Short /live/* Aliases for Live Students */}
        <Route path="/live" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/live/dashboard" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/live/videos" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/live/sessions" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/live/assignments" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/live/forum" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/live/profile" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
      </Route>

      {/* Root Fallback */}
      <Route path="/" element={<Navigate to="/student/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
