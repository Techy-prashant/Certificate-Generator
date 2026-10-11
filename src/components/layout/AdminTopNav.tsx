import React from 'react';
import { Menu, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../contexts/AuthContext';

interface TopNavProps {
  onToggleSidebar: () => void;
}

export const AdminTopNav: React.FC<TopNavProps> = ({ onToggleSidebar }) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const displayName = profile?.displayName || 'Administrator';
  const roleDisplay = (profile?.role || 'reviewer').replace('_', ' ');

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs border-b border-neutral-subtle h-14 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 rounded-md text-neutral-secondary hover:text-neutral-main hover:bg-neutral-surface focus-visible:outline-2 focus-visible:outline-brand-violet"
          aria-label="Open sidebar navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center space-x-2">
          <span className="hidden sm:inline-block text-xs font-semibold text-neutral-secondary">
            Namdapha House Admin Portal
          </span>
          <Badge variant="gold" size="sm">
            IIT Madras BS
          </Badge>
        </div>
      </div>

      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* User Profile display */}
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-full bg-brand-midnight text-brand-gold flex items-center justify-center text-xs font-semibold">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-neutral-main leading-tight">
              {displayName}
            </span>
            <span className="text-[10px] text-neutral-secondary leading-tight capitalize">
              {roleDisplay}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="p-1.5 rounded-md text-neutral-secondary hover:text-[#A52A2A] hover:bg-[#FBE5E5]/50 transition-colors"
          title="Sign out of Admin Session"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
