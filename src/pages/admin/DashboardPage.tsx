import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Calendar,
  UploadCloud,
  Clock,
  ArrowRight,
  Plus,
  ShieldAlert,
  ExternalLink
} from 'lucide-react';
import { portalService } from '../../services';
import { Certificate, Event, IssuanceBatch, AuditLog } from '../../types';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingState } from '../../components/ui/LoadingState';

export const DashboardPage: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [batches, setBatches] = useState<IssuanceBatch[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadDashboardData = async () => {
      try {
        const [certs, evts, bts, logs] = await Promise.all([
          portalService.getCertificates(),
          portalService.getEvents(),
          portalService.getIssuanceBatches(),
          portalService.getAuditLogs(),
        ]);
        if (isMounted) {
          setCertificates(certs);
          setEvents(evts);
          setBatches(bts);
          setAuditLogs(logs);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return <LoadingState message="Loading administrative dashboard..." />;
  }

  const issuedCount = certificates.filter(c => c.status === 'issued').length;
  const revokedCount = certificates.filter(c => c.status === 'revoked').length;
  const activeEventsCount = events.filter(e => e.status === 'active' || e.status === 'completed').length;
  const pendingBatchesCount = batches.filter(b => b.status === 'awaiting_approval').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-subtle">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-main">Administrative Overview</h1>
          <p className="text-xs sm:text-sm text-neutral-secondary mt-0.5">
            Namdapha House Certificate Operations, Registry Status & Batch Approvals
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link to="/admin/bulk-issue">
            <Button variant="outline" size="sm" leftIcon={<UploadCloud className="w-4 h-4" />}>
              Import Batch CSV
            </Button>
          </Link>
          <Link to="/admin/certificates">
            <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              Issue Certificate
            </Button>
          </Link>
        </div>
      </div>

      {/* Operational Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-brand-violet/40 transition-colors">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-secondary uppercase tracking-wider">
                Issued Certificates
              </span>
              <div className="w-8 h-8 rounded-md bg-[#E2F4E9] text-[#17653C] flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-neutral-main">
                {issuedCount}
              </span>
              <span className="text-xs text-neutral-secondary font-medium">
                Live in Registry
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-brand-violet/40 transition-colors">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-secondary uppercase tracking-wider">
                Active Events
              </span>
              <div className="w-8 h-8 rounded-md bg-brand-violet-light text-brand-violet flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-neutral-main">
                {activeEventsCount}
              </span>
              <span className="text-xs text-neutral-secondary font-medium">
                House Competitions
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-brand-violet/40 transition-colors">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-secondary uppercase tracking-wider">
                Awaiting Review
              </span>
              <div className="w-8 h-8 rounded-md bg-[#FFF0D7] text-[#8C5800] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-neutral-main">
                {pendingBatchesCount}
              </span>
              <span className="text-xs text-[#8C5800] font-medium">
                {pendingBatchesCount > 0 ? 'Action Required' : 'All clear'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-brand-violet/40 transition-colors">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-secondary uppercase tracking-wider">
                Revocations
              </span>
              <div className="w-8 h-8 rounded-md bg-[#FBE5E5] text-[#A52A2A] flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-neutral-main">
                {revokedCount}
              </span>
              <span className="text-xs text-[#A52A2A] font-medium">
                Audited & Void
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Recent Certificates & Operational Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Registry Issuances */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title="Recent Certificate Records"
              subtitle="Latest official certificates entered into the Namdapha registry"
              action={
                <Link to="/admin/certificates">
                  <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                    View Registry
                  </Button>
                </Link>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-neutral-surface/60 text-neutral-secondary uppercase tracking-wider text-[11px] font-semibold border-b border-neutral-subtle">
                  <tr>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Event & Award</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-subtle">
                  {certificates.slice(0, 4).map((cert) => (
                    <tr key={cert.id} className="hover:bg-neutral-surface/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-neutral-main">
                        {cert.recipientName}
                        {cert.recipientEmail && (
                          <span className="block text-[11px] font-normal text-neutral-secondary font-mono">
                            {cert.recipientEmail}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-neutral-main block font-medium">{cert.eventName}</span>
                        <span className="text-xs text-neutral-secondary">{cert.achievement}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-brand-violet">
                        {cert.verificationCode}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={cert.status === 'issued' ? 'success' : 'error'}
                          size="sm"
                        >
                          {cert.status === 'issued' ? 'Issued' : 'Revoked'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/verify/${cert.verificationCode}`}
                          target="_blank"
                          className="inline-flex items-center text-xs text-neutral-secondary hover:text-brand-violet font-medium gap-1"
                        >
                          <span>Verify</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Issuance Batches Card */}
          <Card>
            <CardHeader
              title="Recent Bulk Import Batches"
              subtitle="CSV batch uploads, validation status, and approval queues"
              action={
                <Link to="/admin/bulk-issue">
                  <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                    Manage Batches
                  </Button>
                </Link>
              }
            />
            <div className="divide-y divide-neutral-subtle">
              {batches.map((batch) => (
                <div key={batch.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-surface/20 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-sm text-neutral-main">{batch.eventName}</span>
                      <Badge
                        variant={batch.status === 'completed' ? 'success' : 'pending'}
                        size="sm"
                      >
                        {batch.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="text-xs text-neutral-secondary flex flex-wrap gap-x-3 gap-y-1 font-mono">
                      <span>File: {batch.originalFilename}</span>
                      <span>Total: {batch.totalRows}</span>
                      <span>Valid: {batch.validRows}</span>
                      <span>Issued: {batch.issuedCount}</span>
                    </div>
                  </div>
                  <div className="text-xs text-neutral-secondary sm:text-right shrink-0">
                    <span>Uploaded by {batch.createdByName}</span>
                    <span className="block text-[11px] text-neutral-secondary/80">
                      {new Date(batch.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Col: Events & Audit Trail */}
        <div className="space-y-6">
          {/* Active Events Quick List */}
          <Card>
            <CardHeader
              title="House Events"
              subtitle="Scheduled & Completed Competitions"
              action={
                <Link to="/admin/events">
                  <Button variant="ghost" size="sm">
                    All Events
                  </Button>
                </Link>
              }
            />
            <div className="p-4 space-y-3">
              {events.slice(0, 3).map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 rounded-lg border border-neutral-subtle bg-neutral-surface/30 space-y-1 hover:border-brand-violet/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs sm:text-sm text-neutral-main truncate max-w-[180px]">
                      {evt.name}
                    </span>
                    <Badge variant={evt.status === 'completed' ? 'neutral' : 'info'} size="sm">
                      {evt.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-neutral-secondary">
                    <span>Category: {evt.category}</span>
                    <span>{evt.eventDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Audit Activity Card */}
          <Card>
            <CardHeader
              title="Recent Security Audit Logs"
              subtitle="Immutable action ledger"
              action={
                <Link to="/admin/audit">
                  <Button variant="ghost" size="sm">
                    View Logs
                  </Button>
                </Link>
              }
            />
            <div className="p-4 space-y-3">
              {auditLogs.slice(0, 3).map((log) => (
                <div key={log.id} className="text-xs space-y-1 border-l-2 border-brand-violet pl-3 py-0.5">
                  <div className="flex items-center justify-between text-neutral-secondary">
                    <span className="font-semibold text-neutral-main">{log.actorName}</span>
                    <span className="text-[10px]">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-neutral-secondary text-[11px] leading-tight">
                    {log.targetDescription}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
