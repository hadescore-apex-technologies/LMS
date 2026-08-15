import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import Sidebar from '../components/shared/Sidebar';
import TopHeader from '../components/shared/TopHeader';
import { StudentCyberSidebar } from '../components/student/StudentCyberSidebar';
import { StudentCyberHeader } from '../components/student/StudentCyberHeader';
import { useStudentSecurity } from '../hooks/useStudentSecurity';

const DashboardLayout: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const isStudent = user?.role === 'STUDENT';

  // Security: Disable right-click & developer shortcut keys for Students ONLY
  useStudentSecurity(isStudent);

  const [sidebarOpen, setSidebarOpen] = useState(() => !isStudent && window.innerWidth >= 1024);
  const [studentSidebarOpen, setStudentSidebarOpen] = useState(false);

  return (
    <div className={`min-h-screen transition-colors duration-300 overflow-x-hidden relative ${
      isStudent 
        ? 'student-ambient-bg bg-black text-slate-100 dark' 
        : 'bg-slate-50 text-slate-900'
    }`}>

      {/* Student Cyber Glass Sidebar */}
      {isStudent && (
        <StudentCyberSidebar 
          isOpen={studentSidebarOpen} 
          onClose={() => setStudentSidebarOpen(false)} 
        />
      )}

      {/* Staff & Admin Sidebar */}
      {!isStudent && (
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      )}

      {/* Main Content Area */}
      <div className={`flex flex-col min-h-screen w-full transition-all duration-300 ${
        isStudent ? 'lg:pl-72' : sidebarOpen ? 'lg:pl-72' : 'lg:pl-0'
      }`}>
        {isStudent ? (
          <div className="w-full px-3 sm:px-6 pt-3 pb-6 flex-1 flex flex-col">
            <StudentCyberHeader onToggleSidebar={() => setStudentSidebarOpen(!studentSidebarOpen)} />
            <main className="flex-1 w-full">
              <Outlet />
            </main>
          </div>
        ) : (
          <>
            <TopHeader sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            <main className="flex-1 w-full px-4 sm:px-6 py-3.5">
              <Outlet />
            </main>
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardLayout;
