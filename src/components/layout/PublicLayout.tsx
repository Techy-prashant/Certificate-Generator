import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { DemoDataBanner } from '../ui/DemoDataBanner';

export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-brand-ivory text-neutral-main flex flex-col selection:bg-brand-violet-light">
      <DemoDataBanner />
      
      {/* Public Header */}
      <header className="bg-white border-b border-neutral-subtle sticky top-0 z-20 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
            <img
              src="/logo/Namdapha_bg_colored_rect.png"
              alt="Namdapha House Logo"
              className="h-10 w-auto max-w-[125px] rounded-xl object-contain shrink-0 group-hover:scale-105 transition-transform shadow-2xs"
            />
            <div>
              <span className="font-bold tracking-tight text-brand-midnight text-sm block leading-tight">
                Namdapha House
              </span>
              <span className="text-[11px] text-neutral-secondary font-medium block leading-tight">
                IIT Madras BS Degree • Official Certificate Registry
              </span>
            </div>
          </Link>

          <div className="flex items-center space-x-3">
            <Link
              to="/admin/login"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-neutral-secondary hover:text-brand-violet px-3 py-1.5 rounded-md hover:bg-neutral-surface border border-neutral-subtle transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      {/* Minimal Public Institutional Footer */}
      <footer className="border-t border-neutral-subtle/60 py-6 text-center text-xs text-neutral-secondary bg-white/40">
        <div className="max-w-4xl mx-auto px-4 space-y-1">
          <p className="font-medium text-neutral-main">
            Namdapha House • IIT Madras BS Degree Programme
          </p>
          <div className="text-[11px] text-neutral-secondary/60">
            © 2026 Namdapha Certificate Registry • All rights reserved
          </div>
        </div>
      </footer>
    </div>
  );
};
