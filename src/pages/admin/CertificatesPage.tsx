import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Search,
  ExternalLink,
  ShieldAlert,
  Eye,
  Plus,
  Download
} from 'lucide-react';
import { portalService } from '../../services';
import { Certificate } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { IssueCertificateModal } from '../../components/admin/IssueCertificateModal';
import { downloadPdfBlob, generatePdfFromDetails } from '../../services/pdfService';

export const CertificatesPage: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Detail Modal
  const [inspectCert, setInspectCert] = useState<Certificate | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Revoke Modal
  const [revokingCert, setRevokingCert] = useState<Certificate | null>(null);
  const [internalReason, setInternalReason] = useState('');
  const [publicReason, setPublicReason] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);

  // Issue New Single Certificate Modal
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);

  const fetchCertificates = async () => {
    setIsLoading(true);
    try {
      const certs = await portalService.getCertificates();
      setCertificates(certs);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const handleConfirmRevoke = async () => {
    if (!revokingCert || !internalReason.trim()) return;
    setIsRevoking(true);
    try {
      await portalService.revokeCertificate(revokingCert.id, internalReason.trim(), publicReason.trim() || undefined);
      setRevokingCert(null);
      setInternalReason('');
      setPublicReason('');
      if (inspectCert?.id === revokingCert.id) {
        setInspectCert(null);
      }
      await fetchCertificates();
    } catch (err: any) {
      alert(`Revocation failed: ${err.message}`);
    } finally {
      setIsRevoking(false);
    }
  };

  const handleDownloadFromInspect = async () => {
    if (!inspectCert) return;
    setIsDownloadingPdf(true);
    try {
      const details = await portalService.getCertificateDetails(inspectCert.id);
      if (!details) throw new Error('Certificate details snapshot could not be found.');
      const pdfBytes = await generatePdfFromDetails(details);
      downloadPdfBlob(pdfBytes, `${inspectCert.verificationCode}-${inspectCert.recipientName.replace(/\s+/g, '_')}.pdf`);
    } catch (err: any) {
      alert(`Download failed: ${err.message}`);
    } finally {
      setIsDownloadingPdf(false);
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
                              setInternalReason('');
                              setPublicReason('');
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
                <p className="text-xs font-medium">Public reason: {inspectCert.revocationReasonPublic || 'Revoked by authority'}</p>
                <p className="text-[10px] text-neutral-secondary">Internal audit note: {inspectCert.revocationReasonInternal}</p>
              </div>
            )}

            <div className="pt-3 border-t border-neutral-subtle flex items-center justify-between">
              {inspectCert.status === 'issued' ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-rose-700 hover:bg-rose-50 border-rose-200"
                  leftIcon={<ShieldAlert className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setRevokingCert(inspectCert);
                  }}
                >
                  Revoke
                </Button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setInspectCert(null)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  isLoading={isDownloadingPdf}
                  onClick={handleDownloadFromInspect}
                >
                  Download PDF
                </Button>
              </div>
            </div>
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
                Internal Reason (Mandatory Audit Log) <span className="text-[#A52A2A]">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={internalReason}
                onChange={(e) => setInternalReason(e.target.value)}
                placeholder="Internal audit reason (e.g. Identity misattribution, academic integrity violation, test record cleanup)..."
                className="block w-full rounded-md border border-neutral-subtle bg-white p-2.5 text-xs text-neutral-main placeholder:text-neutral-secondary/60 focus-visible:outline-2 focus-visible:outline-[#A52A2A] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-secondary">
                Public Reason (Optional - Displayed on /verify/:code)
              </label>
              <Input
                value={publicReason}
                onChange={(e) => setPublicReason(e.target.value)}
                placeholder="e.g. Certificate revoked due to administrative correction"
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
                disabled={!internalReason.trim()}
                onClick={handleConfirmRevoke}
              >
                Confirm Revocation
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Single Issuance Form Modal */}
      <IssueCertificateModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        onSuccess={async () => {
          await fetchCertificates();
        }}
      />
    </div>
  );
};
