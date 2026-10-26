import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UploadCloud,
  FileSpreadsheet,
  ArrowRight,
  Plus,
  ExternalLink,
  Copy,
  Check,
  Award
} from 'lucide-react';
import { portalService } from '../../services';
import { Certificate, Event, SpreadsheetConfig } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingState } from '../../components/ui/LoadingState';
import { IssueCertificateModal } from '../../components/admin/IssueCertificateModal';
import { useToast } from '../../contexts/ToastContext';

export const DashboardPage: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [sheetsConfig, setSheetsConfig] = useState<SpreadsheetConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { success } = useToast();

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [certs, evts, cfg] = await Promise.all([
        portalService.getCertificates(),
        portalService.getEvents(),
        portalService.getSpreadsheetConfig().catch(() => null),
      ]);
      setCertificates(certs);
      setEvents(evts);
      setSheetsConfig(cfg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    success(`Verification code ${code} copied!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (isLoading) {
    return <LoadingState message="Loading administrative overview..." />;
  }

  const issuedCount = certificates.filter((c) => c.status === 'issued').length;
  const revokedCount = certificates.filter((c) => c.status === 'revoked').length;
  const activeEvents = events.filter((e) => e.status === 'active' || e.status === 'completed');
  const isSheetsConnected = !!sheetsConfig?.isActive && (!!sheetsConfig?.spreadsheetId || !!sheetsConfig?.webhookUrl);

  return (
    <div className="space-y-6 w-full min-w-0 pb-16">
      {/* macOS Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl border border-neutral-subtle p-6 sm:p-7 shadow-mac-panel">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-violet-light text-brand-midnight">
                <Award className="w-3 h-3 text-brand-violet" />
                <span>Namdapha House Council</span>
              </span>
              <span className="text-xs text-neutral-secondary font-mono">IIT Madras BS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-main">
              Executive Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-neutral-secondary max-w-xl">
              Issue, verify, and synchronize official student credentials for competitions, cultural meets, and sports.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link to="/admin/bulk-issue">
              <Button
                variant="outline"
                size="md"
                leftIcon={<UploadCloud className="w-4 h-4" />}
                className="rounded-xl mac-hover-lift"
              >
                Bulk Issuance
              </Button>
            </Link>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsIssueModalOpen(true)}
              className="rounded-xl mac-hover-lift"
            >
              Issue Certificate
            </Button>
          </div>
        </div>

        {/* Ambient background blur accent */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-brand-violet/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Two Prominent Primary Hero Action Cards (Raycast/Linear Inspired) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Hero Card 1: Issue Single Certificate */}
        <div
          onClick={() => setIsIssueModalOpen(true)}
          className="group relative p-5 rounded-2xl bg-white/90 backdrop-blur-md border border-neutral-subtle/80 hover:border-brand-violet/40 shadow-xs hover:shadow-spotlight transition-all duration-200 cursor-pointer mac-hover-lift overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-brand-violet text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-main group-hover:text-brand-violet transition-colors">
                  Issue Single Certificate
                </h3>
                <p className="text-xs text-neutral-secondary mt-0.5">
                  Instant issuance for individual winners or council heads
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-secondary/60 group-hover:text-brand-violet group-hover:translate-x-1 transition-all" />
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-subtle/60 flex items-center justify-between text-[11px] text-neutral-secondary">
            <span>Generates PDF, verification code & QR link</span>
            <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-neutral-surface border border-neutral-subtle text-neutral-main">
              ⌘N
            </kbd>
          </div>
        </div>

        {/* Hero Card 2: Bulk Certificate Issuance */}
        <Link
          to="/admin/bulk-issue"
          className="group relative p-5 rounded-2xl bg-white/90 backdrop-blur-md border border-neutral-subtle/80 hover:border-emerald-400/40 shadow-xs hover:shadow-mac-panel transition-all duration-200 block mac-hover-lift overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-main group-hover:text-emerald-700 transition-colors">
                  Bulk Certificate Issuance
                </h3>
                <p className="text-xs text-neutral-secondary mt-0.5">
                  Guided 5-step wizard for small teams (5–20) or large CSVs (100+)
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-secondary/60 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-subtle/60 flex items-center justify-between text-[11px] text-neutral-secondary">
            <span>Includes spreadsheet grid, Excel paste & ZIP export</span>
            <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-neutral-surface border border-neutral-subtle text-neutral-main">
              ⌘B
            </kbd>
          </div>
        </Link>
      </div>

      {/* Operational Metric Summary (Clean, concise macOS depth) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-neutral-subtle/90 shadow-xs mac-hover-lift">
          <div className="flex items-center justify-between text-xs text-neutral-secondary font-medium">
            <span>Issued Certificates</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-2xs" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-neutral-main tracking-tight">
            {issuedCount}
          </div>
          <span className="text-[11px] text-neutral-secondary block mt-0.5">Authoritative in PostgreSQL</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-neutral-subtle/90 shadow-xs mac-hover-lift">
          <div className="flex items-center justify-between text-xs text-neutral-secondary font-medium">
            <span>House Competitions</span>
            <div className="w-2 h-2 rounded-full bg-brand-violet shadow-2xs" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-neutral-main tracking-tight">
            {activeEvents.length}
          </div>
          <span className="text-[11px] text-neutral-secondary block mt-0.5">Active or completed</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-neutral-subtle/90 shadow-xs mac-hover-lift">
          <div className="flex items-center justify-between text-xs text-neutral-secondary font-medium">
            <span>Google Sheets Sync</span>
            <div className={`w-2 h-2 rounded-full ${isSheetsConnected ? 'bg-emerald-500' : 'bg-neutral-subtle'}`} />
          </div>
          <div className="mt-2 text-base font-bold text-neutral-main flex items-center gap-1.5">
            <FileSpreadsheet className={`w-4 h-4 ${isSheetsConnected ? 'text-emerald-600' : 'text-neutral-secondary'}`} />
            <span>{isSheetsConnected ? 'Live Mirror' : 'Offline'}</span>
          </div>
          <span className="text-[11px] text-neutral-secondary block mt-0.5">
            {sheetsConfig?.lastSyncAt ? `Synced ${new Date(sheetsConfig.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Mirror inactive'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-neutral-subtle/90 shadow-xs mac-hover-lift">
          <div className="flex items-center justify-between text-xs text-neutral-secondary font-medium">
            <span>Revoked Credentials</span>
            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-2xs" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-neutral-main tracking-tight">
            {revokedCount}
          </div>
          <span className="text-[11px] text-neutral-secondary block mt-0.5">Audited & voided</span>
        </div>
      </div>

      {/* Main Grid: Recent Certificates & Active Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Registry Issuances */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl bg-white/90 backdrop-blur-md border border-neutral-subtle/90 shadow-mac-panel overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-neutral-subtle/80 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-main">Recent Certificate Registry</h3>
                <p className="text-xs text-neutral-secondary mt-0.5">
                  Latest official credentials issued by Namdapha House council
                </p>
              </div>
              <Link to="/admin/certificates">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />} className="rounded-xl">
                  Full Registry
                </Button>
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-neutral-surface/60 text-neutral-secondary uppercase tracking-wider text-[11px] font-semibold border-b border-neutral-subtle">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Recipient</th>
                    <th className="py-2.5 px-4 font-semibold">Event</th>
                    <th className="py-2.5 px-4 font-semibold font-mono">Code</th>
                    <th className="py-2.5 px-4 font-semibold">Status</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-subtle/80">
                  {certificates.slice(0, 5).map((cert) => (
                    <tr key={cert.id} className="hover:bg-neutral-surface/30 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-neutral-main">
                        <div>{cert.recipientName}</div>
                        <div className="text-[11px] font-normal text-neutral-secondary truncate max-w-[140px]">
                          {cert.achievement}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-neutral-main max-w-[160px] truncate">
                        {cert.eventName}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-brand-violet">
                        <button
                          type="button"
                          onClick={() => handleCopyCode(cert.verificationCode)}
                          className="inline-flex items-center gap-1 hover:underline"
                          title="Click to copy code"
                        >
                          <span>{cert.verificationCode}</span>
                          {copiedCode === cert.verificationCode ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 opacity-60" />
                          )}
                        </button>
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge
                          variant={cert.status === 'issued' ? 'success' : 'error'}
                          size="sm"
                        >
                          {cert.status === 'issued' ? 'Issued' : 'Revoked'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <Link
                          to={`/verify/${cert.verificationCode}`}
                          target="_blank"
                          className="inline-flex items-center text-xs text-neutral-secondary hover:text-brand-violet font-medium gap-1 p-1 rounded-lg hover:bg-neutral-surface"
                          title="Verify credential online"
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
          </div>
        </div>

        {/* Right 1 Col: Active Events & Fast Access */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-white/90 backdrop-blur-md border border-neutral-subtle/90 shadow-mac-panel overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-neutral-subtle/80 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-main">Active Competitions</h3>
                <p className="text-xs text-neutral-secondary mt-0.5">Namdapha House schedule</p>
              </div>
              <Link to="/admin/events" className="text-xs font-semibold text-brand-violet hover:underline">
                All Events
              </Link>
            </div>
            <div className="p-3.5 space-y-2.5">
              {activeEvents.slice(0, 4).map((evt) => (
                <Link
                  key={evt.id}
                  to={`/admin/events/${evt.id}`}
                  className="p-3 rounded-xl border border-neutral-subtle/80 hover:border-brand-violet/40 hover:bg-neutral-surface/40 transition-all block text-xs space-y-1.5 mac-hover-lift"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-main truncate max-w-[180px]">{evt.name}</span>
                    <Badge variant="neutral" size="sm" className="text-[10px] rounded-md">
                      {evt.category}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-neutral-secondary flex items-center justify-between">
                    <span>{evt.scope}</span>
                    <span className="font-mono text-[10px]">{evt.eventDate}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Single Certificate Issuance Modal */}
      <IssueCertificateModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        onSuccess={() => {
          setIsIssueModalOpen(false);
          loadDashboardData();
        }}
      />
    </div>
  );
};
