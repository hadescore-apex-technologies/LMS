import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';

// Student tabs
import { DashboardTab } from './tabs/DashboardTab';
import { CoursesTab } from './tabs/CoursesTab';
import { CoursePlayer } from './tabs/CoursePlayer';
import { LiveClassesTab } from './tabs/LiveClassesTab';
import { AssignmentsTab } from './tabs/AssignmentsTab';
import { CertificatesTab } from './tabs/CertificatesTab';
import { DiscussionTab } from './tabs/DiscussionTab';
import { AITutorDrawer } from './tabs/AITutorDrawer';

// Reusable components
import StudentProfile from '../../components/student/StudentProfile';
import NotesManager from '../../components/student/NotesManager';
import CalendarView from '../../components/student/CalendarView';
import Leaderboard from '../../components/student/Leaderboard';
import AchievementsBadges from '../../components/student/AchievementsBadges';

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

  const handleNavigate = (path: string) => {
    navigate(`/student/${path}`);
  };

  const handleOpenAITutor = (lessonId: number | null, courseId: number) => {
    setAiTutorLessonId(lessonId);
    setAiTutorCourseId(courseId);
    setAiTutorOpen(true);
  };

  const renderActiveTab = () => {
    const path = location.pathname.replace(/\/$/, '');
    
    switch (path) {
      case '/student/courses':
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
      case '/student/live':
        return <LiveClassesTab />;
      case '/student/assignments':
        return <AssignmentsTab />;
      case '/student/certificates':
        return <CertificatesTab />;
      case '/student/profile':
        return <StudentProfile />;
      case '/student/notes':
        return <NotesManager />;
      case '/student/calendar':
        return <CalendarView />;
      case '/student/achievements':
        return <AchievementsBadges />;
      case '/student/leaderboard':
        return <Leaderboard />;
      case '/student/forum':
        return <DiscussionTab />;
      case '/student':
      default:
        return (
          <DashboardTab 
            onNavigate={handleNavigate}
            onOpenCourse={(cId) => {
              api.get(`courses/list/${cId}/`).then(res => {
                setActiveCourse(res.data);
                navigate('/student/courses');
              });
            }}
          />
        );
    }
  };

  return (
    <div className="relative">
      {renderActiveTab()}

      {/* AI Tutor Drawer slide-out */}
      {aiTutorCourseId && (
        <AITutorDrawer 
          isOpen={aiTutorOpen}
          onClose={() => setAiTutorOpen(false)}
          lessonId={aiTutorLessonId}
          courseId={aiTutorCourseId}
        />
      )}
    </div>
  );
};

export default StudentDashboard;
