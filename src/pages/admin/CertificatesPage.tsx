import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Search,
  ExternalLink,
  ShieldAlert,
  Eye,
  Plus
} from 'lucide-react';
import { portalService } from '../../services';
import { Certificate, Event } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';

export const CertificatesPage: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Detail Modal
  const [inspectCert, setInspectCert] = useState<Certificate | null>(null);

  // Revoke Modal
  const [revokingCert, setRevokingCert] = useState<Certificate | null>(null);
  const [revocationReason, setRevocationReason] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);

  // Issue New Single Certificate Modal
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [issueRecipient, setIssueRecipient] = useState('');
  const [issueEmail, setIssueEmail] = useState('');
  const [issueEventId, setIssueEventId] = useState('');
  const [issueAchievement, setIssueAchievement] = useState('First Place (Winner)');

  const fetchCertificates = async () => {
    setIsLoading(true);
    try {
      const [certs, evts] = await Promise.all([
        portalService.getCertificates(),
        portalService.getEvents(),
      ]);
      setCertificates(certs);
      setEvents(evts);
      if (evts.length > 0 && !issueEventId) {
        setIssueEventId(evts[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const handleConfirmRevoke = async () => {
    if (!revokingCert || !revocationReason.trim()) return;
    setIsRevoking(true);
    try {
      await portalService.revokeCertificate(revokingCert.id, revocationReason.trim());
      setRevokingCert(null);
      setRevocationReason('');
      await fetchCertificates();
    } finally {
      setIsRevoking(false);
    }
  };

  const filteredCerts = certificates.filter((c) => {
    const matchesSearch =
      c.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.verificationCode.includes(searchTerm) ||
      c.eventName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Certificate Registry' }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-subtle">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-main">Official Certificate Registry</h1>
          <p className="text-xs sm:text-sm text-neutral-secondary mt-0.5">
            The authoritative PostgreSQL record ledger. Certificates are valid only when an active registry record exists.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsIssueModalOpen(true)}
        >
          Issue Single Certificate
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by recipient, 6-digit code, or event name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'issued', label: 'Issued (Valid)' },
              { value: 'revoked', label: 'Revoked (Void)' },
            ]}
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Loading certificate registry records..." />
      ) : filteredCerts.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No certificate records found"
          description={searchTerm ? `No records match "${searchTerm}".` : "No certificates have been issued yet."}
          actionLabel="Issue Single Certificate"
          onAction={() => setIsIssueModalOpen(true)}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-neutral-surface/60 text-neutral-secondary uppercase tracking-wider text-[11px] font-semibold border-b border-neutral-subtle">
                <tr>
                  <th className="py-3 px-4">Recipient Name</th>
                  <th className="py-3 px-4">Event & Achievement</th>
                  <th className="py-3 px-4">Registry Code</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-subtle">
                {filteredCerts.map((cert) => (
                  <tr key={cert.id} className="hover:bg-neutral-surface/30 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-semibold text-neutral-main block">{cert.recipientName}</span>
                      {cert.recipientEmail && (
                        <span className="font-mono text-[11px] text-neutral-secondary">{cert.recipientEmail}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-neutral-main font-medium block">{cert.eventName}</span>
                      <span className="text-xs text-neutral-secondary">{cert.achievement}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-brand-violet text-sm">
                      {cert.verificationCode}
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-secondary text-xs">
                      {cert.issueDate}
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
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setInspectCert(cert)}
                          className="p-1 rounded text-neutral-secondary hover:text-brand-violet hover:bg-neutral-surface transition-colors"
                          title="Inspect Certificate Snapshot"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <Link
                          to={`/verify/${cert.verificationCode}`}
                          target="_blank"
                          className="p-1 rounded text-neutral-secondary hover:text-brand-violet hover:bg-neutral-surface transition-colors"
                          title="Open Public Verification URL"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        {cert.status === 'issued' && (
                          <button
                            onClick={() => {
                              setRevokingCert(cert);
                              setRevocationReason('');
                            }}
                            className="p-1 rounded text-neutral-secondary hover:text-[#A52A2A] hover:bg-[#FBE5E5]/50 transition-colors"
                            title="Revoke Certificate"
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Inspect Certificate Snapshot Modal */}
      {inspectCert && (
        <Modal
          isOpen={!!inspectCert}
          onClose={() => setInspectCert(null)}
          title={`Certificate Record • ${inspectCert.verificationCode}`}
          description="Authoritative snapshot preserved at issuance timestamp"
          maxWidth="md"
          footer={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setInspectCert(null)}>
                Close
              </Button>
              <Link to={`/verify/${inspectCert.verificationCode}`} target="_blank">
                <Button variant="primary" size="sm" leftIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                  Public View
                </Button>
              </Link>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-neutral-surface rounded border border-neutral-subtle space-y-1">
              <span className="text-neutral-secondary uppercase text-[10px] font-bold">Recipient</span>
              <p className="text-sm font-bold text-neutral-main">{inspectCert.recipientName}</p>
              {inspectCert.recipientEmail && (
                <p className="font-mono text-neutral-secondary">{inspectCert.recipientEmail}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-neutral-surface rounded border border-neutral-subtle">
                <span className="text-neutral-secondary block">Event Snapshot</span>
                <span className="font-semibold text-neutral-main">{inspectCert.eventName}</span>
              </div>
              <div className="p-3 bg-neutral-surface rounded border border-neutral-subtle">
                <span className="text-neutral-secondary block">Achievement Award</span>
                <span className="font-semibold text-neutral-main">{inspectCert.achievement}</span>
              </div>
              <div className="p-3 bg-neutral-surface rounded border border-neutral-subtle">
                <span className="text-neutral-secondary block">Template Version</span>
                <span className="font-mono text-neutral-main">v{inspectCert.templateVersion}</span>
              </div>
              <div className="p-3 bg-neutral-surface rounded border border-neutral-subtle">
                <span className="text-neutral-secondary block">Signatories Bound</span>
                <span className="font-semibold text-neutral-main">{inspectCert.signatoriesCount} signers</span>
              </div>
            </div>

            {inspectCert.status === 'revoked' && (
              <div className="p-3 bg-[#FBE5E5] border border-[#F4AFAF] rounded text-[#A52A2A] space-y-1">
                <span className="font-bold uppercase text-[10px]">Revocation Notice</span>
                <p className="text-xs font-medium">{inspectCert.revocationReasonPublic}</p>
                <p className="text-[10px] text-neutral-secondary">Internal audit note: {inspectCert.revocationReasonInternal}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Revoke Certificate Modal */}
      {revokingCert && (
        <Modal
          isOpen={!!revokingCert}
          onClose={() => setRevokingCert(null)}
          title="Revoke Certificate"
          description={`Revoking certificate ${revokingCert.verificationCode} for ${revokingCert.recipientName}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-[#FBE5E5] border border-[#F4AFAF] rounded text-[#A52A2A]">
              <p className="font-semibold">Destructive Action Warning:</p>
              <p className="mt-1 leading-relaxed">
                Revocation marks this certificate as permanently void in the public verification registry. The record is preserved in the database for auditing and cannot be hard-deleted.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-secondary">
                Public Reason for Revocation <span className="text-[#A52A2A]">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
                placeholder="Explain why this certificate is being revoked (e.g. Ineligibility, disciplinary audit, typographical error correction)..."
                className="block w-full rounded-md border border-neutral-subtle bg-white p-2.5 text-xs text-neutral-main placeholder:text-neutral-secondary/60 focus-visible:outline-2 focus-visible:outline-[#A52A2A] transition-colors"
              />
            </div>

            <div className="pt-3 border-t border-neutral-subtle flex justify-end gap-2.5">
              <Button variant="outline" size="sm" onClick={() => setRevokingCert(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                isLoading={isRevoking}
                disabled={!revocationReason.trim()}
                onClick={handleConfirmRevoke}
              >
                Confirm Revocation
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Single Issuance Form Modal */}
      <Modal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        title="Individual Certificate Issuance"
        description="Issue a single official certificate with automatic 6-digit collision-safe code generation."
        maxWidth="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            alert(`Individual issuance demonstration for "${issueRecipient}". In Milestone 5, this executes the atomic PostgreSQL commit, allocates 6-digit code, renders pdf-lib output, and logs the audit event.`);
            setIsIssueModalOpen(false);
          }}
          className="space-y-4 text-xs"
        >
          <Select
            label="Select Event"
            value={issueEventId}
            onChange={(e) => setIssueEventId(e.target.value)}
            options={events.map((evt) => ({ value: evt.id, label: `${evt.name} (${evt.eventDate})` }))}
          />

          <Input
            label="Recipient Full Name"
            placeholder="e.g. Sarthak Mishra"
            required
            value={issueRecipient}
            onChange={(e) => setIssueRecipient(e.target.value)}
          />

          <Input
            label="Recipient IITM BS Email (Optional)"
            placeholder="e.g. 21f1000000@study.iitm.ac.in"
            type="email"
            value={issueEmail}
            onChange={(e) => setIssueEmail(e.target.value)}
          />

          <Input
            label="Award Title / Achievement"
            placeholder="e.g. First Place in Machine Learning Track"
            required
            value={issueAchievement}
            onChange={(e) => setIssueAchievement(e.target.value)}
          />

          <div className="p-3 bg-neutral-surface/60 rounded border border-neutral-subtle text-neutral-secondary text-[11px] space-y-1">
            <span className="font-semibold text-neutral-main block">Issuance Pipeline Guarantee:</span>
            <p>
              Per Section 5 of AGENTS.md, issuance success is committed to the registry database before client-side PDF export begins.
            </p>
          </div>

          <div className="pt-3 border-t border-neutral-subtle flex justify-end gap-2.5">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsIssueModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Issue & Commit Certificate
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
