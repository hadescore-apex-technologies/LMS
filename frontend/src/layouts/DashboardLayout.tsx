import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/shared/Sidebar';
import TopHeader from '../components/shared/TopHeader';

const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 transition-colors duration-200 overflow-x-hidden">
      {/* Sidebar navigation */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content Area */}
      <div className="flex flex-col lg:pl-72 min-h-screen w-full">
        <TopHeader setSidebarOpen={setSidebarOpen} />
        
        <main className="flex-1 p-4 md:px-8 md:py-5 w-full max-w-7xl mx-auto space-y-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
