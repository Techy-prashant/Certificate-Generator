import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopNav } from './AdminTopNav';
import { DemoDataBanner } from '../ui/DemoDataBanner';
import { CommandPalette } from '../ui/CommandPalette';
import { IssueCertificateModal } from '../admin/IssueCertificateModal';
import { useToast } from '../../contexts/ToastContext';
import { smoothScrollToElement } from '../../utils/scrollUtils';

export const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const { success } = useToast();
  const navigate = useNavigate();

  // Desktop default is compact floating navigation rail (w-[72px])
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('namdapha_sidebar_collapsed');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('namdapha_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Global keyboard shortcut for Command Palette (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Global smooth scroll delegation: whenever someone clicks any dropdown button across any tab
  useEffect(() => {
    const handleGlobalDropdownClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const dropdownBtn = target.closest<HTMLElement>(
        'button[data-dropdown-button], button[aria-label*="Expand"], button[aria-label*="Details"], [data-dropdown-scroll="true"], button:has(svg.lucide-chevron-down), tr[data-expandable="true"]'
      );
      if (!dropdownBtn) return;

      // Find the closest table row, card, or container to scroll to
      const container =
        dropdownBtn.closest<HTMLElement>('tr[id], [data-scroll-anchor], .mac-card, article') ||
        dropdownBtn;

      if (container) {
        smoothScrollToElement(container, {
          offset: 85,
          duration: 800,
          delay: 75,
        });
      }
    };

    document.addEventListener('click', handleGlobalDropdownClick, true);
    return () => document.removeEventListener('click', handleGlobalDropdownClick, true);
  }, []);

  const location = useLocation();
  const isStudioRoute = location.pathname.includes('/studio');

  return (
    <div className="min-h-screen bg-brand-ivory text-neutral-main flex flex-col selection:bg-brand-violet-light selection:text-brand-midnight">
      <DemoDataBanner />
      <div className="flex-1 flex">
        {!isStudioRoute && (
          <AdminSidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            isCollapsed={isCollapsed}
            onToggleCollapse={handleToggleCollapse}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          />
        )}
        <div
          className={`flex-1 flex flex-col ${
            !isStudioRoute ? (isCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64') : ''
          } min-w-0 transition-all duration-300 ease-mac-spring motion-reduce:transition-none`}
        >
          <AdminTopNav
            onToggleSidebar={() => setSidebarOpen(true)}
            isCollapsed={isCollapsed}
            onToggleCollapse={handleToggleCollapse}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          />
          <main
            className={
              isStudioRoute
                ? 'flex-1 flex flex-col min-w-0 w-full overflow-hidden'
                : 'flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-[1600px] mx-auto min-w-0 animate-in fade-in duration-200'
            }
          >
            <Outlet />
          </main>
        </div>
      </div>

      {/* Raycast-Inspired Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenIssueModal={() => setIsIssueModalOpen(true)}
      />

      {/* Global Quick Action: Issue Single Certificate Modal */}
      {isIssueModalOpen && (
        <IssueCertificateModal
          isOpen={isIssueModalOpen}
          onClose={() => setIsIssueModalOpen(false)}
          onSuccess={() => {
            setIsIssueModalOpen(false);
            success('Certificate successfully issued!');
            navigate('/admin/certificates');
          }}
        />
      )}
    </div>
  );
};
