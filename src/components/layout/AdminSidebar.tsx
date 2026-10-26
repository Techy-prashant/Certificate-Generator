import React, { useState, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  FileCode2,
  PenTool,
  Award,
  UploadCloud,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  ExternalLink,
  Search,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenCommandPalette?: () => void;
}

export const AdminSidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  isCollapsed = true,
  onToggleCollapse: _onToggleCollapse,
  onOpenCommandPalette,
}) => {
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === 'super_admin';

  // Desktop hover-expand state with debounced leave
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 200);
  };

  // The sidebar visually expands if pinned open (!isCollapsed) OR hovered
  const visuallyExpanded = !isCollapsed || isHovered;

  const allNavItems = [
    { label: 'Overview', to: '/admin', icon: LayoutDashboard, end: true, show: true },
    { label: 'Events', to: '/admin/events', icon: Calendar, show: true },
    { label: 'Templates', to: '/admin/templates', icon: FileCode2, show: true },
    { label: 'Signatures', to: '/admin/signatories', icon: PenTool, show: profile?.role !== 'reviewer' },
    { label: 'Certificates', to: '/admin/certificates', icon: Award, show: true },
    { label: 'Bulk Issuance', to: '/admin/bulk-issue', icon: UploadCloud, show: true },
    { label: 'Spreadsheet Sync', to: '/admin/spreadsheet', icon: FileSpreadsheet, show: true },
    { label: 'Team & Permissions', to: '/admin/team', icon: Users, show: isSuperAdmin },
    { label: 'Audit Logs', to: '/admin/audit', icon: ShieldCheck, show: isSuperAdmin },
  ];

  const navItems = allNavItems.filter((item) => item.show);

  const renderContent = (expanded: boolean) => (
    <div
      className={`flex flex-col h-full bg-white/95 backdrop-blur-xl border-r border-neutral-subtle/80 select-none transition-[width] duration-300 ease-[cubic-bezier(0.2,0,0,1)] shadow-mac-panel overflow-hidden ${
        expanded ? 'w-64 shadow-mac-floating' : 'w-[72px]'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-3 border-b border-neutral-subtle/70 flex items-center justify-between shrink-0">
        <div className="flex items-center min-w-0 h-full">
          {/* Logo column - strictly fixed 48px width aligned with icons */}
          <div className="w-12 h-10 flex items-center justify-center shrink-0">
            <img
              src="/logo/Namdapha_bg_colored_rect.png"
              alt="Namdapha House Logo"
              className="h-8 w-auto rounded-lg object-contain shadow-2xs"
            />
          </div>
          {/* Brand text - stays in DOM, fades and slides without layout reflow */}
          <div
            className={`min-w-0 pl-2 transition-all duration-200 ease-out whitespace-nowrap overflow-hidden ${
              expanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'
            }`}
          >
            <span className="font-bold tracking-tight text-brand-midnight text-xs uppercase block leading-tight">
              Namdapha
            </span>
            <span className="text-[10px] text-neutral-secondary font-medium tracking-tight block">
              Council Portal
            </span>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="lg:hidden text-neutral-secondary hover:text-neutral-main p-1.5 rounded-lg hover:bg-neutral-surface"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Command Launcher (Centered button alignment, Search icon) */}
      {onOpenCommandPalette && (
        <div className="p-3 shrink-0 flex items-center">
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="w-full h-10 flex items-center rounded-xl bg-neutral-surface/70 hover:bg-neutral-surface border border-neutral-subtle/80 text-neutral-secondary hover:text-neutral-main text-xs font-medium transition-all group overflow-hidden"
            title={!expanded ? 'Command Palette (⌘K)' : undefined}
          >
            {/* Icon column - fixed 48px aligned with navigation */}
            <div className="w-12 h-10 flex items-center justify-center shrink-0">
              <Search className="w-4 h-4 text-brand-violet transition-transform group-hover:scale-110" />
            </div>

            {/* Label and shortcut */}
            <div
              className={`flex-1 min-w-0 flex items-center justify-between pr-2.5 transition-all duration-200 ease-out whitespace-nowrap overflow-hidden ${
                expanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'
              }`}
            >
              <span className="font-medium text-neutral-main truncate">Command Menu</span>
              <kbd className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-neutral-subtle text-neutral-secondary shadow-2xs shrink-0 ml-1">
                ⌘K
              </kbd>
            </div>
          </button>
        </div>
      )}

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-1 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              title={!expanded ? item.label : undefined}
              className={({ isActive }) =>
                `group relative w-full h-10 flex items-center rounded-xl text-xs font-medium transition-colors duration-150 overflow-hidden ${
                  isActive
                    ? 'bg-brand-violet text-white font-semibold shadow-xs'
                    : 'text-neutral-secondary hover:text-neutral-main hover:bg-neutral-surface/70'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Fixed 48px icon column */}
                  <div className="w-12 h-10 flex items-center justify-center shrink-0">
                    <Icon
                      className={`w-4 h-4 transition-transform duration-150 group-hover:scale-105 ${
                        isActive ? 'text-white' : 'text-neutral-secondary group-hover:text-brand-violet'
                      }`}
                    />
                  </div>

                  {/* Label - stays in DOM, fades/slides smoothly */}
                  <div
                    className={`flex-1 min-w-0 pr-2 transition-all duration-200 ease-out whitespace-nowrap overflow-hidden ${
                      expanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'
                    }`}
                  >
                    <span className="truncate block font-medium">
                      {item.label}
                    </span>
                  </div>

                  {/* Collapsed active dot indicator */}
                  {!expanded && isActive && (
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-brand-violet rounded-full shadow-2xs" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Footer Controls */}
      <div className="p-3 border-t border-neutral-subtle/80 bg-neutral-surface/30 shrink-0 space-y-2">
        <NavLink
          to="/"
          target="_blank"
          title={!expanded ? 'Public Verification Portal' : undefined}
          className="w-full h-10 flex items-center rounded-xl text-xs font-medium text-neutral-secondary hover:text-brand-violet hover:bg-white transition-all overflow-hidden"
        >
          <div className="w-12 h-10 flex items-center justify-center shrink-0">
            <ExternalLink className="w-4 h-4 opacity-70" />
          </div>
          <div
            className={`flex-1 min-w-0 pr-2 transition-all duration-200 ease-out whitespace-nowrap overflow-hidden ${
              expanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'
            }`}
          >
            <span className="truncate block">Public Verify Portal</span>
          </div>
        </NavLink>

        <div
          className={`px-3 py-1 text-[10px] text-neutral-secondary/80 flex items-center justify-between transition-all duration-200 whitespace-nowrap overflow-hidden ${
            expanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <span>Namdapha House</span>
          <span className="font-mono text-[9px] bg-white px-1.5 py-0.5 rounded border border-neutral-subtle text-neutral-main shadow-2xs">
            v1.0
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Floating Navigation Rail with Hover Expansion */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`hidden lg:block fixed inset-y-0 left-0 z-40 transition-[width] duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
          visuallyExpanded ? 'w-64' : 'w-[72px]'
        }`}
      >
        {renderContent(visuallyExpanded)}
      </aside>

      {/* Mobile Drawer (Tap to toggle) */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-brand-midnight/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white z-10 animate-in slide-in-from-left duration-250">
            {renderContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
