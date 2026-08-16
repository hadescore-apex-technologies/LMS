import React, { useState, Suspense, lazy } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

// Smooth skeleton fallback
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

// Dynamic Lazy Student tabs
const DashboardTab = lazy(() => import('./tabs/DashboardTab').then(m => ({ default: m.DashboardTab })));
const CoursesTab = lazy(() => import('./tabs/CoursesTab').then(m => ({ default: m.CoursesTab })));
const CoursePlayer = lazy(() => import('./tabs/CoursePlayer').then(m => ({ default: m.CoursePlayer })));
const LiveClassesTab = lazy(() => import('./tabs/LiveClassesTab').then(m => ({ default: m.LiveClassesTab })));
const AssignmentsTab = lazy(() => import('./tabs/AssignmentsTab').then(m => ({ default: m.AssignmentsTab })));
const CertificatesTab = lazy(() => import('./tabs/CertificatesTab').then(m => ({ default: m.CertificatesTab })));
const DiscussionTab = lazy(() => import('./tabs/DiscussionTab').then(m => ({ default: m.DiscussionTab })));
const AITutorDrawer = lazy(() => import('./tabs/AITutorDrawer').then(m => ({ default: m.AITutorDrawer })));

// Reusable components
const StudentProfile = lazy(() => import('../../components/student/StudentProfile'));
const Leaderboard = lazy(() => import('../../components/student/Leaderboard'));
const AchievementsBadges = lazy(() => import('../../components/student/AchievementsBadges'));

interface Course {
  id: number;
  title: string;
  description: string;
}

const StudentDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeCourse, setActiveCourse] = useState<Course | null>(null);

  // AI Tutor Drawer States
  const [aiTutorOpen, setAiTutorOpen] = useState(false);
  const [aiTutorLessonId, setAiTutorLessonId] = useState<number | null>(null);
  const [aiTutorCourseId, setAiTutorCourseId] = useState<number | null>(null);

  const isLive = localStorage.getItem('studentLiveMode') === 'true' ||
                 Boolean(localStorage.getItem('loginPath')?.includes('live'));

  const handleNavigate = (path: string) => {
    if (isLive) {
      if (path === 'courses') navigate('/live-student/videos');
      else if (path === 'live') navigate('/live-student/sessions');
      else navigate(`/live-student/${path}`);
    } else {
      navigate(`/student/${path}`);
    }
  };

  const handleOpenAITutor = (lessonId: number | null, courseId: number) => {
    setAiTutorLessonId(lessonId);
    setAiTutorCourseId(courseId);
    setAiTutorOpen(true);
  };

  const renderActiveTab = () => {
    const path = location.pathname.replace(/\/$/, '');
    
    switch (path) {
      // Course Player & Video Replays
      case '/student/courses':
      case '/live-student/videos':
      case '/live-student/courses':
      case '/live/videos':
      case '/live/courses':
        if (activeCourse) {
          return (
            <CoursePlayer 
              course={activeCourse} 
              onBack={() => setActiveCourse(null)}
              onOpenAITutor={handleOpenAITutor}
            />
          );
        }
        return <CoursesTab onOpenCourse={(c) => setActiveCourse(c)} />;
      
      // Live Sessions / Mentoring Calendar
      case '/student/live':
      case '/live-student/sessions':
      case '/live-student/live':
      case '/live/sessions':
      case '/live/live':
        return <LiveClassesTab />;
      
      // Assignments
      case '/student/assignments':
      case '/live-student/assignments':
      case '/live/assignments':
        return <AssignmentsTab />;
      
      // Certificates (Course students)
      case '/student/certificates':
      case '/live-student/certificates':
        return <CertificatesTab />;
      
      // Profile & Settings
      case '/student/profile':
      case '/live-student/profile':
      case '/live/profile':
        return <StudentProfile />;
      
      // Achievements
      case '/student/achievements':
      case '/live-student/achievements':
      case '/live/achievements':
        return <AchievementsBadges />;
      
      // Leaderboard
      case '/student/leaderboard':
      case '/live-student/leaderboard':
      case '/live/leaderboard':
        return <Leaderboard />;
      
      // Q&A Discussion Forum
      case '/student/forum':
      case '/live-student/forum':
      case '/live/forum':
        return <DiscussionTab />;
      
      // Dashboard Home
      case '/student':
      case '/live-student':
      case '/live-student/dashboard':
      case '/live':
      case '/live/dashboard':
      default:
        return (
          <DashboardTab 
            onNavigate={handleNavigate}
            onOpenCourse={(cId) => {
              api.get(`courses/list/${cId}/`).then(res => {
                setActiveCourse(res.data);
                navigate(isLive ? '/live-student/videos' : '/student/courses');
              });
            }}
          />
        );
    }
  };

  return (
    <div className="relative">
      <Suspense fallback={<TabFallback />}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname + (activeCourse ? `-course-${activeCourse.id}` : '')}
            initial={{ opacity: 0, y: 14, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.99 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {renderActiveTab()}
          </motion.div>
        </AnimatePresence>

        {/* AI Tutor Drawer slide-out */}
        {aiTutorCourseId && (
          <AITutorDrawer 
            isOpen={aiTutorOpen}
            onClose={() => setAiTutorOpen(false)}
            lessonId={aiTutorLessonId}
            courseId={aiTutorCourseId}
          />
        )}
      </Suspense>
    </div>
  );
};

export default StudentDashboard;
