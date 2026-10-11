import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { PublicLayout } from './components/layout/PublicLayout';
import { AdminLayout } from './components/layout/AdminLayout';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { VerifyPage } from './pages/public/VerifyPage';

// Admin Pages
import { LoginPage } from './pages/admin/LoginPage';
import { DashboardPage } from './pages/admin/DashboardPage';
import { EventsPage } from './pages/admin/EventsPage';
import { TemplatesPage } from './pages/admin/TemplatesPage';
import { SignatoriesPage } from './pages/admin/SignatoriesPage';
import { CertificatesPage } from './pages/admin/CertificatesPage';
import { BulkIssuePage } from './pages/admin/BulkIssuePage';
import { TeamPage } from './pages/admin/TeamPage';
import { AuditPage } from './pages/admin/AuditPage';

// 404 Fallback
const NotFoundPage: React.FC = () => (
  <div className="min-h-screen bg-brand-ivory flex flex-col items-center justify-center p-6 text-center space-y-4">
    <div className="w-12 h-12 rounded-xl bg-brand-midnight text-brand-gold flex items-center justify-center font-bold text-lg">
      N
    </div>
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

        {/* Admin Workspace */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="signatories" element={<SignatoriesPage />} />
          <Route path="certificates" element={<CertificatesPage />} />
          <Route path="bulk-issue" element={<BulkIssuePage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="audit" element={<AuditPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
