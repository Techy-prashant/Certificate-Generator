import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  Download,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Eye,
  Copy,
  Check,
  Sparkles
} from 'lucide-react';
import { DESCRIPTION_PRESETS, autoDetectCitation } from '../../utils/descriptionPresets';
import { portalService } from '../../services';
import {
  Event,
  AwardCategory,
  Template,
  Signatory,
  Certificate,
  IssueCertificateInput
} from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { LoadingState } from '../ui/LoadingState';
import { downloadPdfBlob, generatePdfFromDetails, getVerificationOrigin, CertificateRenderData } from '../../services/pdfService';
import { ProtectedCertificateModal } from './ProtectedCertificateModal';

interface IssueCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (certificate: Certificate) => void;
  defaultEventId?: string;
}

export const IssueCertificateModal: React.FC<IssueCertificateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultEventId,
}) => {
  // Data lists
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<AwardCategory[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [signatories, setSignatories] = useState<Signatory[]>([]);

  // Form state
  const [selectedEventId, setSelectedEventId] = useState<string>(defaultEventId || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [achievement, setAchievement] = useState<string>('');
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedSignatoryIds, setSelectedSignatoryIds] = useState<string[]>([]);

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isGeneratingPreviewPdf, setIsGeneratingPreviewPdf] = useState(false);
  const [isSamplePreviewOpen, setIsSamplePreviewOpen] = useState(false);
  const [samplePreviewData, setSamplePreviewData] = useState<{
    template: Template;
    renderData: CertificateRenderData;
  } | null>(null);

  // Success state
  const [issuedCert, setIssuedCert] = useState<Certificate | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isUrlCopied, setIsUrlCopied] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Fetch initial data when opened
  useEffect(() => {
    if (!isOpen) {
      // Reset form on close
      setIssuedCert(null);
      setErrorMsg(null);
      return;
    }

    const loadData = async () => {
      setIsLoadingData(true);
      setErrorMsg(null);
      try {
        const [evts, tpls, sigs] = await Promise.all([
          portalService.getEvents(),
          portalService.getTemplates(),
          portalService.getSignatories(),
        ]);

        // Filter out archived events
        const activeEvents = evts.filter((e) => e.status !== 'archived');
        setEvents(activeEvents);

        // Published templates only
        const publishedTpls = tpls.filter((t) => t.status === 'published');
        setTemplates(publishedTpls);

        // Active signatories only
        const activeSigs = sigs.filter((s) => s.status === 'active');
        setSignatories(activeSigs);

        // Set default event
        const initialEventId = defaultEventId || activeEvents[0]?.id || '';
        setSelectedEventId(initialEventId);

        // Pre-select signatories (first 2 by default)
        if (activeSigs.length > 0) {
          setSelectedSignatoryIds(activeSigs.slice(0, 2).map((s) => s.id));
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load issuance prerequisite data.');
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [isOpen, defaultEventId]);

  // Load categories and default template whenever selected event changes
  useEffect(() => {
    if (!selectedEventId) {
      setCategories([]);
      return;
    }

    const loadEventSpecifics = async () => {
      try {
        const [cats, eventSigs] = await Promise.all([
          portalService.getAwardCategories(selectedEventId),
          portalService.getEventSignatories(selectedEventId).catch(() => []),
        ]);
        setCategories(cats);

        const currentEvent = events.find((e) => e.id === selectedEventId);
        if (cats.length > 0) {
          setSelectedCategoryId(cats[0].id);
          // Auto achievement text with smart citation
          setAchievement(autoDetectCitation(cats[0].name, currentEvent?.name));
          if (cats[0].templateId && templates.some((t) => t.id === cats[0].templateId)) {
            setSelectedTemplateId(cats[0].templateId);
          } else if (currentEvent?.defaultTemplateId && templates.some((t) => t.id === currentEvent.defaultTemplateId)) {
            setSelectedTemplateId(currentEvent.defaultTemplateId);
          } else if (templates.length > 0) {
            setSelectedTemplateId(templates[0].id);
          }
        } else {
          setSelectedCategoryId('');
          setAchievement(autoDetectCitation('Participation', currentEvent?.name));
          if (currentEvent?.defaultTemplateId && templates.some((t) => t.id === currentEvent.defaultTemplateId)) {
            setSelectedTemplateId(currentEvent.defaultTemplateId);
          } else if (templates.length > 0) {
            setSelectedTemplateId(templates[0].id);
          }
        }

        // If event has specific signatories assigned, pre-select those
        if (eventSigs.length > 0) {
          setSelectedSignatoryIds(eventSigs.map((es) => es.signatoryId));
        }
      } catch (err: any) {
        console.warn('Error loading event specifics:', err);
      }
    };

    loadEventSpecifics();
  }, [selectedEventId, events, templates]);

  // Toggle signatory selection
  const handleToggleSignatory = (sigId: string) => {
    setSelectedSignatoryIds((prev) =>
      prev.includes(sigId) ? prev.filter((id) => id !== sigId) : [...prev, sigId]
    );
  };

  // Live Certificate Preview Generator (On-Screen Protected Sample View)
  const handlePreviewPdf = async () => {
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (!tpl) {
      setErrorMsg('Please select a template to preview.');
      return;
    }
    setErrorMsg(null);
    setIsGeneratingPreviewPdf(true);
    try {
      const selectedSigs = selectedSignatoryIds
        .map((id) => signatories.find((s) => s.id === id))
        .filter(Boolean) as Signatory[];

      const previewData: CertificateRenderData = {
        recipientName: recipientName.trim() || 'Jane Doe',
        eventName: events.find((e) => e.id === selectedEventId)?.name || 'House Competition',
        achievement: achievement.trim() || 'Winner',
        position: categories.find((c) => c.id === selectedCategoryId)?.name || '1st Place',
        issueDate: issueDate || new Date().toISOString().split('T')[0],
        organizationName: 'Namdapha House, IIT Madras BS Degree',
        verificationCode: '', // Suppressed in sample preview ("without code to be seen")
        verificationUrl: '',  // Suppressed in sample preview ("without code to be seen")
        signatories: selectedSigs.map((s) => ({
          name: s.name,
          designation: s.designation,
          signatureAssetUrl: s.signatureAssetUrl,
        })),
      };

      setSamplePreviewData({
        template: tpl,
        renderData: previewData,
      });
      setIsSamplePreviewOpen(true);
    } catch (err: any) {
      setErrorMsg(`Preview generation failed: ${err.message}`);
    } finally {
      setIsGeneratingPreviewPdf(false);
    }
  };

  // Form Submit: Issue Certificate
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim()) {
      setErrorMsg('Recipient name is required.');
      return;
    }
    if (!selectedEventId) {
      setErrorMsg('Please select an event.');
      return;
    }
    if (!selectedCategoryId) {
      setErrorMsg('Please select an award category.');
      return;
    }
    if (!selectedTemplateId) {
      setErrorMsg('Please select a published template.');
      return;
    }
    if (selectedSignatoryIds.length === 0) {
      setErrorMsg('Please select at least one authorized signatory.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const input: IssueCertificateInput = {
      eventId: selectedEventId,
      awardCategoryId: selectedCategoryId,
      templateId: selectedTemplateId,
      recipientName: recipientName.trim(),
      recipientEmail: recipientEmail.trim() || undefined,
      achievement: achievement.trim(),
      issueDate,
      signatoryIds: selectedSignatoryIds,
    };

    try {
      const cert = await portalService.issueCertificate(input);
      setIssuedCert(cert);
      onSuccess(cert);
    } catch (err: any) {
      setErrorMsg(err.message || 'Certificate issuance failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download official PDF for newly issued certificate
  const handleDownloadOfficialPdf = async () => {
    if (!issuedCert) return;
    setIsDownloadingPdf(true);
    try {
      const details = await portalService.getCertificateDetails(issuedCert.id);
      if (!details) throw new Error('Could not retrieve certificate snapshot details.');

      const pdfBytes = await generatePdfFromDetails(details);
      downloadPdfBlob(pdfBytes, `${issuedCert.verificationCode}-${issuedCert.recipientName.replace(/\s+/g, '_')}.pdf`);
    } catch (err: any) {
      alert(`PDF generation failed: ${err.message}`);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleCopyCode = () => {
    if (!issuedCert) return;
    navigator.clipboard.writeText(issuedCert.verificationCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCopyVerificationUrl = () => {
    if (!issuedCert) return;
    const fullUrl = `${getVerificationOrigin()}/verify/${issuedCert.verificationCode}`;
    navigator.clipboard.writeText(fullUrl);
    setIsUrlCopied(true);
    setTimeout(() => setIsUrlCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={issuedCert ? 'Certificate Issued Successfully' : 'Issue Individual Certificate'}
      description={
        issuedCert
          ? 'Official record committed to PostgreSQL ledger with immutable snapshots.'
          : 'Issue an authentic credential with collision-safe 6-digit verification code.'
      }
      maxWidth="lg"
    >
      {isLoadingData ? (
        <div className="py-12">
          <LoadingState message="Loading events, templates, and signatories..." />
        </div>
      ) : issuedCert ? (
        <div className="space-y-6 py-2 text-xs">
          <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-900">Official Certificate Issued</h3>
              <p className="text-xs text-emerald-800/80 mt-0.5">
                Record committed with status <span className="font-semibold uppercase tracking-wider">ISSUED</span>.
              </p>
            </div>

            {/* 6-digit Code Showcase */}
            <div className="inline-flex items-center gap-3 bg-white px-4 py-2.5 rounded-lg border border-emerald-300 shadow-xs">
              <span className="text-xs text-neutral-secondary font-medium">Verification Code:</span>
              <span className="font-mono text-xl font-bold tracking-widest text-brand-midnight">
                {issuedCert.verificationCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="p-1 hover:bg-neutral-surface rounded text-neutral-secondary hover:text-neutral-main transition-colors"
                title="Copy verification code"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-neutral-surface/60 rounded-lg border border-neutral-subtle text-xs">
            <div>
              <span className="text-neutral-secondary text-[11px] block">Recipient:</span>
              <span className="font-semibold text-neutral-main">{issuedCert.recipientName}</span>
            </div>
            <div>
              <span className="text-neutral-secondary text-[11px] block">Event:</span>
              <span className="font-semibold text-neutral-main">{issuedCert.eventName}</span>
            </div>
            <div>
              <span className="text-neutral-secondary text-[11px] block">Achievement:</span>
              <span className="font-semibold text-neutral-main">{issuedCert.achievement}</span>
            </div>
            <div>
              <span className="text-neutral-secondary text-[11px] block">Issue Date:</span>
              <span className="font-semibold text-neutral-main">{issuedCert.issueDate}</span>
            </div>
          </div>

          {/* Verification link info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-brand-violet/5 rounded-lg border border-brand-violet/20 text-xs gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-brand-violet shrink-0" />
              <span className="text-neutral-main truncate">
                Public verification URL:{' '}
                <strong className="font-mono text-brand-violet">
                  {getVerificationOrigin()}/verify/{issuedCert.verificationCode}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyVerificationUrl}
                className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-secondary hover:text-neutral-main hover:bg-white/80 px-2 py-1 rounded border border-neutral-subtle/80 transition-colors"
                title="Copy public verification link"
              >
                {isUrlCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isUrlCopied ? 'Copied' : 'Copy Link'}</span>
              </button>
              <a
                href={`${getVerificationOrigin()}/verify/${issuedCert.verificationCode}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-violet hover:underline px-2 py-1"
              >
                <span>Test Link</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-subtle">
            <Button variant="outline" size="sm" onClick={onClose}>
              Done
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
              isLoading={isDownloadingPdf}
              onClick={handleDownloadOfficialPdf}
            >
              Download Generated PDF
            </Button>
          </div>
        </div>
      ) : (
        /* FORM VIEW */
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-800 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Event & Award Category */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="1. Event / Competition"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                options={events.map((evt) => ({
                  value: evt.id,
                  label: `${evt.name} (${evt.eventDate || 'Ongoing'})`,
                }))}
                required
              />

              <Select
                label="2. Award Category"
                value={selectedCategoryId}
                onChange={(e) => {
                  const newCatId = e.target.value;
                  setSelectedCategoryId(newCatId);
                  const cat = categories.find((c) => c.id === newCatId);
                  const currentEvent = events.find((ev) => ev.id === selectedEventId);
                  if (cat) {
                    setAchievement(autoDetectCitation(cat.name, currentEvent?.name));
                    if (cat.templateId && templates.some((t) => t.id === cat.templateId)) {
                      setSelectedTemplateId(cat.templateId);
                    }
                  }
                }}
                options={
                  categories.length > 0
                    ? categories.map((c) => ({ value: c.id, label: c.name }))
                    : [{ value: '', label: 'No categories configured' }]
                }
                required
              />
            </div>

            {categories.length === 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2.5 shadow-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-950">No Award Categories Configured for this Event</p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Certificates must belong to an award category (e.g. <em>1st Winner</em>, <em>2nd Place</em>, <em>Participation</em>).
                  </p>
                  {selectedEventId && (
                    <a
                      href={`/admin/events/${selectedEventId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-violet underline pt-0.5 hover:text-brand-midnight"
                    >
                      <span>Open Event Settings to Add Categories</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. Template Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-neutral-main">
                3. Visual Certificate Template
              </label>
              {templates.length > 0 && (
                <span className="text-[11px] text-neutral-secondary">
                  {templates.length} published template{templates.length > 1 ? 's' : ''} available
                </span>
              )}
            </div>

            {templates.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2.5 shadow-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-950">No Published Templates Available</p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Only templates with <strong>Published</strong> status can be used for official certificates. If your templates are still in Draft mode, publish them in the Template Studio.
                  </p>
                  <a
                    href="/admin/templates"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-violet underline pt-0.5 hover:text-brand-midnight"
                  >
                    <span>Go to Templates & Studio</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between ${
                      selectedTemplateId === tpl.id
                        ? 'border-brand-violet bg-brand-violet/5 ring-1 ring-brand-violet'
                        : 'border-neutral-subtle bg-white hover:border-neutral-secondary/40'
                    }`}
                  >
                    <div className="truncate">
                      <span className="font-semibold text-neutral-main block truncate">{tpl.name}</span>
                      <span className="text-[10px] text-neutral-secondary">
                        v{tpl.versionNumber} • {tpl.orientation} ({tpl.pageWidth}×{tpl.pageHeight}mm)
                      </span>
                    </div>
                    {selectedTemplateId === tpl.id && (
                      <Badge variant="info" size="sm">
                        Selected
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Recipient Details */}
          <div className="p-3 bg-neutral-surface/40 rounded-lg border border-neutral-subtle space-y-3">
            <span className="font-semibold text-neutral-main text-xs block">4. Recipient Details</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Recipient Full Name"
                placeholder="e.g. Priyanshu Sharma"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                required
              />

              <Input
                label="Recipient Email (Optional)"
                placeholder="e.g. 21f1000000@study.iitm.ac.in"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-secondary">
                  Achievement / Citation Description <span className="text-[#A52A2A]">*</span>
                </label>
                <span className="text-[11px] text-brand-violet font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-brand-violet" /> Auto-Write Citation:
                </span>
              </div>

              {/* Quick Description Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 p-1.5 bg-neutral-surface/60 rounded-lg border border-neutral-subtle">
                {DESCRIPTION_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      const evtName = events.find((e) => e.id === selectedEventId)?.name;
                      setAchievement(preset.generateText(evtName));
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-all shadow-2xs ${preset.colorClass}`}
                    title={`Auto-generate ${preset.title}`}
                  >
                    {preset.badge}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                className="block w-full rounded-md border border-neutral-subtle bg-white p-2.5 text-xs text-neutral-main placeholder:text-neutral-secondary/60 focus-visible:outline-2 focus-visible:outline-brand-violet transition-colors duration-150 resize-y"
                placeholder="Formal citation description..."
                value={achievement}
                onChange={(e) => setAchievement(e.target.value)}
                required
              />
            </div>

            <div>
              <Input
                label="Issue Date"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* 4. Authorized Signatories Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-neutral-main">
                5. Authorized Signatories ({selectedSignatoryIds.length} selected)
              </label>
              <span className="text-[10px] text-neutral-secondary">
                Select signatories permitted to sign this certificate
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 bg-white border border-neutral-subtle rounded-lg">
              {signatories.map((sig) => {
                const isSelected = selectedSignatoryIds.includes(sig.id);
                const order = selectedSignatoryIds.indexOf(sig.id) + 1;
                return (
                  <div
                    key={sig.id}
                    onClick={() => handleToggleSignatory(sig.id)}
                    className={`p-2 rounded border cursor-pointer transition-colors flex items-center justify-between text-xs ${
                      isSelected
                        ? 'border-brand-violet bg-brand-violet/5'
                        : 'border-neutral-subtle hover:bg-neutral-surface'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <span className="font-semibold text-neutral-main block truncate">{sig.name}</span>
                      <span className="text-[10px] text-neutral-secondary truncate block">{sig.designation}</span>
                    </div>
                    {isSelected ? (
                      <span className="w-5 h-5 rounded-full bg-brand-violet text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {order}
                      </span>
                    ) : (
                      <div className="w-4 h-4 rounded border border-neutral-subtle shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-neutral-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              type="button"
              leftIcon={<Eye className="w-3.5 h-3.5" />}
              isLoading={isGeneratingPreviewPdf}
              onClick={handlePreviewPdf}
              title="View on-screen sample preview with anti-copy protection and watermarks"
            >
              Preview Sample (On-Screen)
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={isSubmitting}
                leftIcon={<Award className="w-4 h-4" />}
              >
                Issue Certificate
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* On-Screen Protected Sample Certificate Preview Modal */}
      {samplePreviewData && (
        <ProtectedCertificateModal
          isOpen={isSamplePreviewOpen}
          onClose={() => setIsSamplePreviewOpen(false)}
          template={samplePreviewData.template}
          renderData={samplePreviewData.renderData}
          isSample={true}
          hideVerificationCode={true}
        />
      )}
    </Modal>
  );
};
