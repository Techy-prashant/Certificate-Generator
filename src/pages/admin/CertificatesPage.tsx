import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Search,
  ExternalLink,
  ShieldAlert,
  Eye,
  Plus,
  ChevronDown,
  Edit2,
  Copy,
  Check,
  FileSpreadsheet,
  UploadCloud,
  FileText,
  Download,
  Loader2
} from 'lucide-react';
import { portalService } from '../../services';
import { Certificate, Event, Template } from '../../types';
import { smoothScrollToElement } from '../../utils/scrollUtils';
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
import { ProtectedCertificateModal } from '../../components/admin/ProtectedCertificateModal';
import { CertificateRenderData, getVerificationOrigin, pdfEngine, downloadPdfBlob } from '../../services/pdfService';
import { useToast } from '../../contexts/ToastContext';

export const CertificatesPage: React.FC = () => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [eventFilter, setEventFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'>('date-desc');
  const [isLoading, setIsLoading] = useState(true);

  // Expanded row IDs (Set)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Inspect Modal (Preserved for compatibility and deep inspect)
  const [inspectCert, setInspectCert] = useState<Certificate | null>(null);

  // Revoke Modal
  const [revokingCert, setRevokingCert] = useState<Certificate | null>(null);
  const [internalReason, setInternalReason] = useState('');
  const [publicReason, setPublicReason] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);

  // Edit Modal
  const [editingCert, setEditingCert] = useState<Certificate | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAchievement, setEditAchievement] = useState('');
  const [editDate, setEditDate] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Protected Preview Modal
  const [previewCertDetails, setPreviewCertDetails] = useState<{
    template: Template;
    renderData: CertificateRenderData;
  } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Issue New Single Certificate Modal
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);

  // Copy feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchCertificates = async () => {

    setIsLoading(true);
    try {
      const [certs, evts] = await Promise.all([
        portalService.getCertificates(),
        portalService.getEvents().catch(() => []),
      ]);
      setCertificates(certs);
      setEvents(evts);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const toggleRowExpanded = (id: string) => {
    const isCurrentlyExpanded = expandedIds.has(id);
    const willExpand = !isCurrentlyExpanded;

    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

    if (willExpand) {
      // Smoothly and gently scroll to the newly expanded row location
      smoothScrollToElement(`cert-row-${id}`, {
        offset: 85,
        duration: 800,
        delay: 75,
      });
    } else {
      // If collapsing and the row header had scrolled off the top, gently return it into view
      setTimeout(() => {
        const el = document.getElementById(`cert-row-${id}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top < 80) {
            smoothScrollToElement(`cert-row-${id}`, {
              offset: 85,
              duration: 650,
              delay: 30,
            });
          }
        }
      }, 50);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toastSuccess(`Code ${code} copied to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleConfirmRevoke = async () => {
    if (!revokingCert || !internalReason.trim()) return;
    setIsRevoking(true);
    try {
      await portalService.revokeCertificate(
        revokingCert.id,
        internalReason.trim(),
        publicReason.trim() || undefined
      );
      setRevokingCert(null);
      setInternalReason('');
      setPublicReason('');
      if (inspectCert?.id === revokingCert.id) {
        setInspectCert(null);
      }
      await fetchCertificates();
      toastSuccess('Certificate successfully revoked.');
    } catch (err: any) {
      toastError(`Revocation failed: ${err.message}`);
    } finally {
      setIsRevoking(false);
    }
  };

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadDirect = async (cert: Certificate) => {
    setDownloadingId(cert.id);
    try {
      const details = await portalService.getCertificateDetails(cert.id);
      if (!details) throw new Error('Certificate snapshot details could not be loaded.');

      const { templateSnapshot, signatorySnapshot } = details;
      const origin = getVerificationOrigin();
      const verificationUrl = `${origin}/verify/${cert.verificationCode}`;

      const template: Template = {
        id: templateSnapshot.templateId,
        name: templateSnapshot.templateName,
        backgroundUrl: templateSnapshot.backgroundUrl || '',
        backgroundStoragePath: templateSnapshot.backgroundStoragePath,
        pageWidth: templateSnapshot.pageWidth,
        pageHeight: templateSnapshot.pageHeight,
        pageUnit: templateSnapshot.pageUnit,
        orientation: templateSnapshot.orientation,
        fieldConfiguration: templateSnapshot.fieldConfiguration || [],
        versionNumber: templateSnapshot.versionNumber,
        status: 'published',
        createdAt: new Date().toISOString(),
      };

      const renderData: CertificateRenderData = {
        recipientName: cert.recipientName,
        eventName: cert.eventName,
        achievement: cert.achievement,
        issueDate: cert.issueDate,
        organizationName: cert.organizationName || 'Namdapha House, IIT Madras BS Degree',
        verificationCode: cert.verificationCode,
        verificationUrl,
        signatories: (signatorySnapshot || []).map((s) => ({
          name: s.name,
          designation: s.designation,
          signatureAssetUrl: s.signatureAssetUrl,
        })),
      };

      const pdfBytes = await pdfEngine.generateCertificatePdf(template, renderData);
      const safeFilename = `${cert.recipientName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${cert.verificationCode}.pdf`;
      downloadPdfBlob(pdfBytes, safeFilename);
      toastSuccess(`Certificate for ${cert.recipientName} downloaded!`);
    } catch (err: any) {
      toastError(`Failed to download certificate: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadFromInspect = async () => {
    if (!inspectCert) return;
    await handleDownloadDirect(inspectCert);
  };

  const handleOpenPreview = async (cert: Certificate) => {
    setIsPreviewLoading(true);
    try {
      const details = await portalService.getCertificateDetails(cert.id);
      if (!details) throw new Error('Certificate snapshot details could not be loaded.');

      const { templateSnapshot, signatorySnapshot } = details;
      const origin = getVerificationOrigin();
      const verificationUrl = `${origin}/verify/${cert.verificationCode}`;

      const template: Template = {
        id: templateSnapshot.templateId,
        name: templateSnapshot.templateName,
        backgroundUrl: templateSnapshot.backgroundUrl || '',
        backgroundStoragePath: templateSnapshot.backgroundStoragePath,
        pageWidth: templateSnapshot.pageWidth,
        pageHeight: templateSnapshot.pageHeight,
        pageUnit: templateSnapshot.pageUnit,
        orientation: templateSnapshot.orientation,
        fieldConfiguration: templateSnapshot.fieldConfiguration || [],
        versionNumber: templateSnapshot.versionNumber,
        status: 'published',
        createdAt: new Date().toISOString(),
      };

      const renderData: CertificateRenderData = {
        recipientName: cert.recipientName,
        eventName: cert.eventName,
        achievement: cert.achievement,
        issueDate: cert.issueDate,
        organizationName: cert.organizationName,
        verificationCode: cert.verificationCode,
        verificationUrl,
        signatories: (signatorySnapshot || []).map((s) => ({
          name: s.name,
          designation: s.designation,
          signatureAssetUrl: s.signatureAssetUrl,
        })),
      };

      setPreviewCertDetails({ template, renderData });
    } catch (err: any) {
      alert(`Preview failed: ${err.message}`);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleOpenEdit = (cert: Certificate) => {
    setEditingCert(cert);
    setEditName(cert.recipientName);
    setEditEmail(cert.recipientEmail || '');
    setEditAchievement(cert.achievement);
    setEditDate(cert.issueDate);
  };

  const handleSaveEdit = async () => {
    if (!editingCert || !editName.trim() || !editAchievement.trim()) return;
    setIsSavingEdit(true);
    try {
      await portalService.updateCertificate(editingCert.id, {
        recipientName: editName.trim(),
        recipientEmail: editEmail.trim() || undefined,
        achievement: editAchievement.trim(),
        issueDate: editDate,
      });
      setEditingCert(null);
      await fetchCertificates();
      toastSuccess('Certificate details updated.');
    } catch (err: any) {
      toastError(`Update failed: ${err.message}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Filter & Search Logic
  const filteredCerts = certificates
    .filter((c) => {
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !query ||
        c.recipientName.toLowerCase().includes(query) ||
        c.verificationCode.toLowerCase().includes(query) ||
        c.eventName.toLowerCase().includes(query) ||
        (c.recipientEmail && c.recipientEmail.toLowerCase().includes(query));

      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesEvent = eventFilter === 'all' || c.eventId === eventFilter;

      return matchesSearch && matchesStatus && matchesEvent;
    })
    .sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.issueDate || b.issuedAt).getTime() - new Date(a.issueDate || a.issuedAt).getTime();
      }
      if (sortBy === 'date-asc') {
        return new Date(a.issueDate || a.issuedAt).getTime() - new Date(b.issueDate || b.issuedAt).getTime();
      }
      if (sortBy === 'name-asc') {
        return a.recipientName.localeCompare(b.recipientName);
      }
      if (sortBy === 'name-desc') {
        return b.recipientName.localeCompare(a.recipientName);
      }
      return 0;
    });

  // Pagination calculation
  const totalPages = Math.ceil(filteredCerts.length / pageSize) || 1;
  const paginatedCerts = filteredCerts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 w-full min-w-0 pb-12">
      <Breadcrumbs items={[{ label: 'Certificate Registry' }]} />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-neutral-subtle">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-main">Certificate Registry</h1>
          <p className="text-xs sm:text-sm text-neutral-secondary mt-0.5">
            Clean inbox of official Namdapha certificates. Essential details are visible upfront; secondary metadata is available on demand.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link to="/admin/bulk-issue">
            <Button variant="outline" size="sm" leftIcon={<UploadCloud className="w-4 h-4" />}>
              Bulk Issuance
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsIssueModalOpen(true)}
          >
            Issue Single Certificate
          </Button>
        </div>
      </div>

      {/* Search & Filter Controls Bar */}
      <div className="bg-white/90 backdrop-blur-xs p-3.5 rounded-xl border border-neutral-subtle shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="flex-1">
            <Input
              placeholder="Search by recipient name, email, event, or 6-digit verification code..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              leftIcon={<Search className="w-4 h-4 text-neutral-secondary" />}
            />
          </div>

          {/* Event Filter */}
          <div className="w-full md:w-56">
            <Select
              value={eventFilter}
              onChange={(e) => {
                setEventFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                { value: 'all', label: 'All Events' },
                ...events.map((evt) => ({ value: evt.id, label: evt.name })),
              ]}
            />
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-44">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'issued', label: 'Issued (Valid)' },
                { value: 'revoked', label: 'Revoked (Void)' },
              ]}
            />
          </div>

          {/* Sort By */}
          <div className="w-full md:w-48">
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              options={[
                { value: 'date-desc', label: 'Issue Date (Newest)' },
                { value: 'date-asc', label: 'Issue Date (Oldest)' },
                { value: 'name-asc', label: 'Recipient (A-Z)' },
                { value: 'name-desc', label: 'Recipient (Z-A)' },
              ]}
            />
          </div>
        </div>

        {/* Status Count Summary Bar */}
        <div className="flex items-center justify-between text-xs text-neutral-secondary pt-1 border-t border-neutral-subtle/60">
          <span>
            Showing <strong className="text-neutral-main">{filteredCerts.length}</strong> {filteredCerts.length === 1 ? 'certificate' : 'certificates'}
          </span>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{certificates.filter((c) => c.status === 'issued').length} Issued</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>{certificates.filter((c) => c.status === 'revoked').length} Revoked</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Inbox-Style Registry Table */}
      {isLoading ? (
        <LoadingState message="Loading certificate registry records..." />
      ) : filteredCerts.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No certificate records found"
          description={
            searchTerm
              ? `No records match your search query "${searchTerm}".`
              : 'No certificates have been issued yet.'
          }
          actionLabel="Issue Single Certificate"
          onAction={() => setIsIssueModalOpen(true)}
        />
      ) : (
        <Card className="border-neutral-subtle/90 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              {/* Inbox Header */}
              <thead className="bg-neutral-surface/60 text-neutral-secondary uppercase tracking-wider text-[11px] font-semibold border-b border-neutral-subtle">
                <tr>
                  <th className="py-3 px-4 w-8"></th>
                  <th className="py-3 px-4 font-semibold">Recipient Name</th>
                  <th className="py-3 px-4 font-semibold">Event Name</th>
                  <th className="py-3 px-4 font-semibold">Position / Achievement</th>
                  <th className="py-3 px-4 font-semibold text-center w-28">Status</th>
                  <th className="py-3 px-4 text-right font-semibold w-48">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-subtle/80">
                {paginatedCerts.map((cert) => {
                  const isExpanded = expandedIds.has(cert.id);
                  const isIssued = cert.status === 'issued';

                  return (
                    <React.Fragment key={cert.id}>
                      {/* Default Clean Row */}
                      <tr
                        id={`cert-row-${cert.id}`}
                        className={`group transition-colors cursor-pointer select-none ${
                          isExpanded ? 'bg-brand-violet-light/15' : 'hover:bg-neutral-surface/40'
                        }`}
                        onClick={() => toggleRowExpanded(cert.id)}
                      >
                        {/* Expand Chevron Icon */}
                        <td className="py-3 px-4 text-neutral-secondary">
                          <button
                            type="button"
                            data-dropdown-button="true"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRowExpanded(cert.id);
                            }}
                            className={`p-1.5 rounded-lg transition-all duration-200 focus-visible:outline-2 focus-visible:outline-brand-violet ${
                              isExpanded
                                ? 'text-brand-violet bg-brand-violet-light/30 shadow-2xs'
                                : 'text-neutral-secondary hover:text-brand-violet hover:bg-neutral-surface'
                            }`}
                            aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                            title={isExpanded ? 'Collapse certificate details' : 'Expand certificate details'}
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-300 ${
                                isExpanded ? 'rotate-180 text-brand-violet' : 'text-neutral-secondary'
                              }`}
                            />
                          </button>
                        </td>

                        {/* Recipient Name */}
                        <td className="py-3 px-4">
                          <span className="font-semibold text-neutral-main text-xs sm:text-sm block">
                            {cert.recipientName}
                          </span>
                        </td>

                        {/* Event Name */}
                        <td className="py-3 px-4 text-xs font-medium text-neutral-main max-w-[200px] truncate">
                          {cert.eventName}
                        </td>

                        {/* Position / Achievement */}
                        <td className="py-3 px-4 text-xs text-neutral-secondary max-w-[240px] truncate">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-neutral-surface font-medium text-neutral-main border border-neutral-subtle/70">
                            {cert.achievement}
                          </span>
                        </td>

                        {/* Certificate Status */}
                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant={isIssued ? 'success' : 'error'}
                            size="sm"
                          >
                            {isIssued ? 'Issued' : 'Revoked'}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end space-x-1 sm:space-x-1.5">
                            {/* Preview */}
                            <button
                              onClick={() => handleOpenPreview(cert)}
                              disabled={isPreviewLoading}
                              className="p-1.5 rounded-lg text-neutral-secondary hover:text-brand-violet hover:bg-neutral-surface transition-colors disabled:opacity-50"
                              title="Preview Certificate"
                              aria-label="Preview Certificate"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Download PDF */}
                            <button
                              onClick={() => handleDownloadDirect(cert)}
                              disabled={downloadingId === cert.id}
                              className="p-1.5 rounded-lg text-neutral-secondary hover:text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                              title="Download Certificate PDF"
                              aria-label="Download Certificate PDF"
                            >
                              {downloadingId === cert.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                              ) : (
                                <Download className="w-4 h-4 text-emerald-600 hover:text-emerald-700" />
                              )}
                            </button>


                            {/* Edit Permitted Details */}
                            <button
                              onClick={() => handleOpenEdit(cert)}
                              className="p-1.5 rounded-lg text-neutral-secondary hover:text-brand-violet hover:bg-neutral-surface transition-colors"
                              title="Edit permitted details"
                              aria-label="Edit permitted details"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {/* Public Verification Link */}
                            <Link
                              to={`/verify/${cert.verificationCode}`}
                              target="_blank"
                              className="p-1.5 rounded-lg text-neutral-secondary hover:text-brand-violet hover:bg-neutral-surface transition-colors"
                              title="Open Public Verification Link"
                              aria-label="Open Public Verification Link"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>

                            {/* Revoke */}
                            {isIssued && (
                              <button
                                onClick={() => {
                                  setRevokingCert(cert);
                                  setInternalReason('');
                                  setPublicReason('');
                                }}
                                className="p-1.5 rounded-lg text-neutral-secondary hover:text-[#A52A2A] hover:bg-[#FBE5E5]/60 transition-colors"
                                title="Revoke Certificate"
                                aria-label="Revoke Certificate"
                              >
                                <ShieldAlert className="w-4 h-4" />
                              </button>
                            )}

                            {/* Inspect Snapshot (opens modal with handleDownloadFromInspect) */}
                            <button
                              onClick={() => setInspectCert(cert)}
                              className="p-1.5 rounded-lg text-neutral-secondary hover:text-neutral-main hover:bg-neutral-surface transition-colors"
                              title="Inspect Snapshot"
                              aria-label="Inspect Snapshot"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable "Show More" Drawer */}
                      {isExpanded && (
                        <tr className="bg-neutral-surface/30">
                          <td colSpan={6} className="p-0">
                            <div className="p-4 sm:p-5 border-t border-b border-neutral-subtle/80 space-y-4 text-xs animate-in fade-in duration-150">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                {/* Verification Code */}
                                <div className="p-3 bg-white rounded-lg border border-neutral-subtle">
                                  <span className="text-[10px] uppercase font-bold text-neutral-secondary tracking-wider block">
                                    6-Digit Verification Code
                                  </span>
                                  <div className="mt-1 flex items-center justify-between">
                                    <span className="font-mono font-bold text-base text-brand-violet tracking-wider">
                                      {cert.verificationCode}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyCode(cert.verificationCode)}
                                      className="p-1 rounded text-neutral-secondary hover:text-brand-violet transition-colors"
                                      title="Copy verification code"
                                    >
                                      {copiedCode === cert.verificationCode ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Recipient Email */}
                                <div className="p-3 bg-white rounded-lg border border-neutral-subtle">
                                  <span className="text-[10px] uppercase font-bold text-neutral-secondary tracking-wider block">
                                    Recipient Email
                                  </span>
                                  <span className="mt-1 font-mono text-neutral-main block truncate">
                                    {cert.recipientEmail || 'Not provided'}
                                  </span>
                                </div>

                                {/* Issue Date */}
                                <div className="p-3 bg-white rounded-lg border border-neutral-subtle">
                                  <span className="text-[10px] uppercase font-bold text-neutral-secondary tracking-wider block">
                                    Official Issue Date
                                  </span>
                                  <span className="mt-1 font-medium text-neutral-main block">
                                    {cert.issueDate}
                                  </span>
                                </div>

                                {/* Google Sheets Mirror */}
                                <div className="p-3 bg-white rounded-lg border border-neutral-subtle">
                                  <span className="text-[10px] uppercase font-bold text-neutral-secondary tracking-wider block">
                                    Google Sheets Mirror
                                  </span>
                                  <div className="mt-1 flex items-center gap-1.5 font-medium text-emerald-700">
                                    <FileSpreadsheet className="w-3.5 h-3.5" />
                                    <span>Synchronized</span>
                                  </div>
                                </div>
                              </div>

                              {/* Technical Metadata Row */}
                              <div className="p-3 bg-white rounded-lg border border-neutral-subtle flex flex-wrap items-center justify-between gap-3 text-[11px] text-neutral-secondary">
                                <div className="flex flex-wrap items-center gap-4">
                                  <span>
                                    Record ID: <strong className="font-mono text-neutral-main">{cert.id}</strong>
                                  </span>
                                  <span>
                                    Issued by: <strong className="text-neutral-main">{cert.issuedByName}</strong>
                                  </span>
                                  <span>
                                    Template Version: <strong className="font-mono text-neutral-main">v{cert.templateVersion}</strong>
                                  </span>
                                  <span>
                                    Signatures: <strong className="text-neutral-main">{cert.signatoriesCount} signers</strong>
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDownloadDirect(cert)}
                                    disabled={downloadingId === cert.id}
                                    leftIcon={
                                      downloadingId === cert.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                                      ) : (
                                        <Download className="w-3.5 h-3.5 text-emerald-600" />
                                      )
                                    }
                                    className="text-xs"
                                  >
                                    {downloadingId === cert.id ? 'Generating PDF...' : 'Download PDF'}
                                  </Button>
                                  <Link
                                    to={`/verify/${cert.verificationCode}`}
                                    target="_blank"
                                    className="text-brand-violet hover:underline inline-flex items-center gap-1 font-medium"
                                  >
                                    <span>Public Verification Link</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </Link>
                                </div>
                              </div>

                              {/* Revocation notice if voided */}
                              {cert.status === 'revoked' && (
                                <div className="p-3 bg-[#FBE5E5] border border-[#F4AFAF] rounded-lg text-[#A52A2A] space-y-1">
                                  <div className="flex items-center gap-1.5 font-bold uppercase text-[10px]">
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    <span>Official Revocation Notice</span>
                                  </div>
                                  <p className="text-xs font-medium">
                                    Public Reason: {cert.revocationReasonPublic || 'Revoked by authority'}
                                  </p>
                                  {cert.revocationReasonInternal && (
                                    <p className="text-[10px] text-neutral-secondary">
                                      Internal Audit Note: {cert.revocationReasonInternal}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-3.5 bg-neutral-surface/30 border-t border-neutral-subtle flex items-center justify-between text-xs">
              <span className="text-neutral-secondary">
                Page <strong className="text-neutral-main">{currentPage}</strong> of{' '}
                <strong className="text-neutral-main">{totalPages}</strong>
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Inspect Certificate Snapshot Modal (Preserved for compatibility) */}
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
              <Button
                variant="primary"
                size="sm"
                onClick={handleDownloadFromInspect}
                disabled={downloadingId === inspectCert.id}
                leftIcon={
                  downloadingId === inspectCert.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )
                }
              >
                {downloadingId === inspectCert.id ? 'Generating...' : 'Download Official PDF'}
              </Button>
              <Link to={`/verify/${inspectCert.verificationCode}`} target="_blank">
                <Button variant="outline" size="sm" leftIcon={<ExternalLink className="w-3.5 h-3.5" />}>
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
          </div>
        </Modal>
      )}

      {/* Edit Permitted Details Modal */}
      {editingCert && (
        <Modal
          isOpen={!!editingCert}
          onClose={() => setEditingCert(null)}
          title={`Edit Details • ${editingCert.verificationCode}`}
          description="Update permitted recipient and citation information"
          maxWidth="md"
          footer={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingCert(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveEdit}
                disabled={isSavingEdit || !editName.trim() || !editAchievement.trim()}
              >
                {isSavingEdit ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-neutral-main block">Recipient Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Full Recipient Name"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-neutral-main block">Recipient Email</label>
              <Input
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="recipient@example.com (optional)"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-neutral-main block">Achievement / Citation</label>
              <Input
                value={editAchievement}
                onChange={(e) => setEditAchievement(e.target.value)}
                placeholder="e.g., First Place Winner, Distinction, etc."
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-neutral-main block">Issue Date</label>
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Revocation Confirmation Modal */}
      {revokingCert && (
        <Modal
          isOpen={!!revokingCert}
          onClose={() => setRevokingCert(null)}
          title={`Revoke Certificate • ${revokingCert.verificationCode}`}
          description="Revocation permanently invalidates the public verification status"
          maxWidth="md"
          footer={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setRevokingCert(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmRevoke}
                disabled={isRevoking || !internalReason.trim()}
              >
                {isRevoking ? 'Revoking...' : 'Confirm Revocation'}
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-neutral-surface rounded border border-neutral-subtle space-y-1">
              <span className="font-bold text-neutral-main">{revokingCert.recipientName}</span>
              <p className="text-neutral-secondary">{revokingCert.eventName} • {revokingCert.achievement}</p>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-neutral-main block">
                Internal Audit Reason <span className="text-rose-500">*</span>
              </label>
              <Input
                value={internalReason}
                onChange={(e) => setInternalReason(e.target.value)}
                placeholder="Reason recorded in administrative audit trail"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-neutral-main block">
                Public Reason (Optional)
              </label>
              <Input
                value={publicReason}
                onChange={(e) => setPublicReason(e.target.value)}
                placeholder="Notice displayed on the public verification portal"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Protected Sample Preview Modal */}
      {previewCertDetails && (
        <ProtectedCertificateModal
          isOpen={!!previewCertDetails}
          onClose={() => setPreviewCertDetails(null)}
          template={previewCertDetails.template}
          renderData={previewCertDetails.renderData}
          isSample={false}
        />
      )}

      {/* Single Certificate Issuance Modal */}
      <IssueCertificateModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        onSuccess={() => {
          setIsIssueModalOpen(false);
          fetchCertificates();
        }}
      />
    </div>
  );
};
