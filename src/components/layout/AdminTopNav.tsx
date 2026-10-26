import React, { useEffect, useState } from 'react';
import {
  Menu,
  User,
  LogOut,
  FileSpreadsheet,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { portalService } from '../../services';
import { SpreadsheetConfig } from '../../types';

interface TopNavProps {
  onToggleSidebar: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenCommandPalette?: () => void;
}

export const AdminTopNav: React.FC<TopNavProps> = ({
  onToggleSidebar,
  isCollapsed: _isCollapsed = true,
  onToggleCollapse: _onToggleCollapse,
  onOpenCommandPalette: _onOpenCommandPalette,
}) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sheetsConfig, setSheetsConfig] = useState<SpreadsheetConfig | null>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  useEffect(() => {
    portalService.getSpreadsheetConfig().then(setSheetsConfig).catch(() => {});
  }, [location.pathname]);

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const displayName = profile?.displayName || 'Administrator';
  const roleDisplay = (profile?.role || 'reviewer').replace('_', ' ');

  // Compute breadcrumb trail from location
  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/admin') return 'Overview';
    if (path.startsWith('/admin/events')) return 'Events';
    if (path.startsWith('/admin/templates')) return 'Templates';
    if (path.startsWith('/admin/signatories')) return 'Signatures';
    if (path.startsWith('/admin/certificates')) return 'Certificate Registry';
    if (path.startsWith('/admin/bulk-issue')) return 'Bulk Issuance';
    if (path.startsWith('/admin/spreadsheet')) return 'Spreadsheet Mirror';
    if (path.startsWith('/admin/team')) return 'Team & Permissions';
    if (path.startsWith('/admin/audit')) return 'Audit Logs';
    return 'Admin';
  };

  // onToggleCollapse supported via interface
  const isSheetsConnected = !!sheetsConfig?.isActive && (!!sheetsConfig?.spreadsheetId || !!sheetsConfig?.webhookUrl);

  return (
    <header className="sticky top-0 z-20 mac-glass backdrop-blur-md border-b border-neutral-subtle/80 h-14 flex items-center justify-between px-4 sm:px-6 select-none transition-all duration-200">
      {/* Left toolbar cluster */}
      <div className="flex items-center space-x-3">
        {/* Mobile menu trigger */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 rounded-xl text-neutral-secondary hover:text-neutral-main hover:bg-neutral-surface/80 transition-colors"
          aria-label="Open navigation drawer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Dynamic Breadcrumbs */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-neutral-secondary font-medium hidden sm:inline">Admin</span>
          <ChevronRight className="w-3 h-3 text-neutral-secondary/50 hidden sm:inline" />
          <span className="font-semibold text-neutral-main tracking-tight">{getBreadcrumb()}</span>
          <Badge variant="gold" size="sm" className="hidden md:inline-flex text-[10px] px-1.5 py-0.5 rounded-md">
            IIT Madras BS
          </Badge>
        </div>
      </div>

      {/* Right toolbar cluster */}
      <div className="flex items-center space-x-2.5 sm:space-x-3.5">
        {/* Google Sheets Live Status Chip */}
        <Link
          to="/admin/spreadsheet"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium bg-white/80 border border-neutral-subtle/80 hover:bg-white transition-all mac-hover-lift shadow-2xs"
          title="Google Spreadsheet Mirror Health"
        >
          <FileSpreadsheet className={`w-3.5 h-3.5 ${isSheetsConnected ? 'text-emerald-600' : 'text-neutral-secondary'}`} />
          <span className="text-neutral-secondary">Spreadsheet Mirror:</span>
          <span className="flex items-center gap-1 font-semibold">
            {isSheetsConnected ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-700">Live</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                <span className="text-neutral-secondary">Offline</span>
              </>
            )}
          </span>
        </Link>

        {/* Profile Pill Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center space-x-2 p-1 pl-2 pr-2.5 rounded-xl bg-white border border-neutral-subtle/80 hover:bg-neutral-surface/60 transition-all mac-hover-lift shadow-2xs"
            aria-label="User profile options"
          >
            <div className="w-6 h-6 rounded-lg bg-brand-violet-light text-brand-violet flex items-center justify-center font-bold text-xs">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="text-left hidden md:block">
              <span className="text-xs font-semibold text-neutral-main block leading-tight truncate max-w-[110px]">
                {displayName}
              </span>
              <span className="text-[10px] text-neutral-secondary capitalize block leading-tight">
                {roleDisplay}
              </span>
            </div>
          </button>

          {/* Profile Dropdown */}
          {isProfileMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsProfileMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-mac-floating border border-neutral-subtle p-2 z-40 animate-in zoom-in-95 fade-in duration-150">
                <div className="px-3 py-2 border-b border-neutral-subtle/70 mb-1">
                  <p className="text-xs font-bold text-neutral-main truncate">{displayName}</p>
                  <p className="text-[10px] text-neutral-secondary truncate">{profile?.email}</p>
                  <span className="inline-block mt-1 text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-violet-light text-brand-violet">
                    {roleDisplay}
                  </span>
                </div>

                <Link
                  to="/admin/team"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-neutral-main hover:bg-neutral-surface transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-neutral-secondary" />
                  <span>Account & Team</span>
                </Link>

                <Link
                  to="/admin/audit"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-neutral-main hover:bg-neutral-surface transition-colors"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-neutral-secondary" />
                  <span>Security & Audit</span>
                </Link>

                <div className="border-t border-neutral-subtle/70 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-600 hover:bg-rose-50 transition-colors font-medium text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
