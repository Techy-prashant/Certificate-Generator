import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { PublicLayout } from './components/layout/PublicLayout';
import { AdminLayout } from './components/layout/AdminLayout';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { VerifyPage } from './pages/public/VerifyPage';

// Admin Pages
import { LoginPage } from './pages/admin/LoginPage';
import { DashboardPage } from './pages/admin/DashboardPage';
import { EventsPage } from './pages/admin/EventsPage';
import { EventDetailPage } from './pages/admin/EventDetailPage';
import { TemplatesPage } from './pages/admin/TemplatesPage';
import { TemplateStudioPage } from './pages/admin/TemplateStudioPage';
import { SignatoriesPage } from './pages/admin/SignatoriesPage';
import { CertificatesPage } from './pages/admin/CertificatesPage';
import { BulkIssuePage } from './pages/admin/BulkIssuePage';
import { TeamPage } from './pages/admin/TeamPage';
import { AuditPage } from './pages/admin/AuditPage';

// 404 Fallback
const NotFoundPage: React.FC = () => (
  <div className="min-h-screen bg-brand-ivory flex flex-col items-center justify-center p-6 text-center space-y-4">
    <img
      src="/logo/Namdapha_bg_colored_rect.png"
      alt="Namdapha House Logo"
      className="h-14 w-auto max-w-[180px] rounded-2xl object-contain shadow-xs"
    />
    <h1 className="text-2xl font-bold text-neutral-main">Page Not Found</h1>
    <p className="text-xs text-neutral-secondary max-w-sm">
      The requested route does not exist in the Namdapha Certificate Portal.
    </p>
    <div className="flex gap-3 pt-2">
      <Link
        to="/"
        className="text-xs font-semibold px-4 py-2 bg-brand-violet text-white rounded-md hover:bg-brand-violet-hover transition-colors"
      >
        Public Verification Portal
      </Link>
      <Link
        to="/admin"
        className="text-xs font-semibold px-4 py-2 bg-white text-neutral-main border border-neutral-subtle rounded-md hover:bg-neutral-surface transition-colors"
      >
        Admin Dashboard
      </Link>
    </div>
  </div>
);

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/verify/:code" element={<VerifyPage />} />
          </Route>

          {/* Admin Login */}
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/login" element={<Navigate to="/admin/login" replace />} />

          {/* Admin Workspace - Protected */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="events/:id" element={<EventDetailPage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="templates/:id/studio" element={<TemplateStudioPage />} />
            <Route path="signatories" element={<SignatoriesPage />} />
            <Route path="certificates" element={<CertificatesPage />} />
            <Route path="bulk-issue" element={<BulkIssuePage />} />
            <Route
              path="team"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <TeamPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="audit"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <AuditPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
