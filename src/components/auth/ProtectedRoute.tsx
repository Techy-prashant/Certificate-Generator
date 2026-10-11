import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { LoadingState } from '../ui/LoadingState';
import { Button } from '../ui/Button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, profile, isLoading, isConfigured } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-ivory flex items-center justify-center p-6">
        <LoadingState message="Verifying session and role permissions..." />
      </div>
    );
  }

  // If Supabase is configured and user is not signed in
  if (isConfigured && !user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Role authorization check
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-[#FBE5E5] text-[#A52A2A] flex items-center justify-center mx-auto border border-[#F4AFAF]">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-neutral-main">Access Restricted</h2>
          <p className="text-xs sm:text-sm text-neutral-secondary max-w-md mx-auto mt-1">
            Your current account role (<strong className="capitalize">{profile.role.replace('_', ' ')}</strong>) does not have permission to view or manage this section.
          </p>
        </div>
        <div className="pt-2">
          <Link to="/admin">
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Return to Admin Overview
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
