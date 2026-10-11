import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  FileCode2,
  PenTool,
  Award,
  UploadCloud,
  Users,
  ShieldCheck,
  ExternalLink,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminSidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navItems = [
    { label: 'Overview', to: '/admin', icon: LayoutDashboard, end: true },
    { label: 'Events', to: '/admin/events', icon: Calendar },
    { label: 'Templates', to: '/admin/templates', icon: FileCode2 },
    { label: 'Signatures', to: '/admin/signatories', icon: PenTool },
    { label: 'Certificates', to: '/admin/certificates', icon: Award },
    { label: 'Bulk Issuance', to: '/admin/bulk-issue', icon: UploadCloud },
    { label: 'Team & Permissions', to: '/admin/team', icon: Users },
    { label: 'Audit Logs', to: '/admin/audit', icon: ShieldCheck },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-neutral-subtle w-64 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-neutral-subtle flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-brand-midnight flex items-center justify-center text-brand-gold shadow-xs shrink-0 font-bold text-sm tracking-widest border border-brand-gold/30">
            N
          </div>
          <div>
            <span className="font-bold tracking-tight text-brand-midnight text-sm block uppercase">
              Namdapha
            </span>
            <span className="text-[11px] text-neutral-secondary font-medium tracking-tight block">
              Certificate System
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden text-neutral-secondary hover:text-neutral-main p-1 rounded-md"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-secondary/80">
          Main Workspace
        </div>
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-violet-light text-brand-midnight font-semibold shadow-2xs'
                    : 'text-neutral-secondary hover:text-neutral-main hover:bg-neutral-surface'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0 text-brand-violet" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Footer Info */}
      <div className="p-3 border-t border-neutral-subtle bg-neutral-surface/40 space-y-2">
        <NavLink
          to="/"
          target="_blank"
          className="flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium text-neutral-secondary hover:text-brand-violet hover:bg-white transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <span>Public Verify Portal</span>
          </span>
          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
        </NavLink>
        <div className="px-3 py-1 text-[11px] text-neutral-secondary/80 flex items-center justify-between">
          <span>IIT Madras BS</span>
          <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-neutral-subtle">
            v0.1.0-shell
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 z-30 w-64 pt-0">
        {sidebarContent}
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-brand-midnight/60 backdrop-blur-xs transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
