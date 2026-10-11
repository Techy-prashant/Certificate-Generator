import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ShieldCheck, LogIn } from 'lucide-react';
import { DemoDataBanner } from '../ui/DemoDataBanner';

export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-brand-ivory text-neutral-main flex flex-col selection:bg-brand-violet-light">
      <DemoDataBanner />
      
      {/* Public Header */}
      <header className="bg-white border-b border-neutral-subtle sticky top-0 z-20 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-lg bg-brand-midnight text-brand-gold flex items-center justify-center font-bold text-sm border border-brand-gold/30 shadow-xs group-hover:scale-102 transition-transform">
              N
            </div>
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

      {/* Public Institutional Footer */}
      <footer className="bg-white border-t border-neutral-subtle py-8 text-center text-xs text-neutral-secondary">
        <div className="max-w-4xl mx-auto px-4 space-y-2">
          <div className="flex items-center justify-center space-x-2 text-neutral-main font-semibold">
            <ShieldCheck className="w-4 h-4 text-brand-violet" />
            <span>Official Certificate Verification Portal</span>
          </div>
          <p className="max-w-xl mx-auto text-neutral-secondary/80">
            Maintained by Namdapha House student administration for IIT Madras BS Degree Programme.
            All verification records are matched cryptographically against official registry records.
          </p>
          <div className="pt-2 text-[11px] text-neutral-secondary/60">
            © 2026 Namdapha House, IIT Madras BS. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
