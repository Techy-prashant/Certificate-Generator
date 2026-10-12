import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopNav } from './AdminTopNav';
import { DemoDataBanner } from '../ui/DemoDataBanner';

export const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isStudioRoute = location.pathname.includes('/studio');

  return (
    <div className="min-h-screen bg-brand-ivory text-neutral-main flex flex-col">
      <DemoDataBanner />
      <div className="flex-1 flex">
        {!isStudioRoute && <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
        <div className={`flex-1 flex flex-col ${!isStudioRoute ? 'lg:pl-64' : ''} min-w-0`}>
          <AdminTopNav onToggleSidebar={() => setSidebarOpen(true)} />
          <main className={isStudioRoute ? "flex-1 flex flex-col min-w-0 w-full overflow-hidden" : "flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto"}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
