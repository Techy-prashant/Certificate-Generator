import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Eye,
  Copy,
  Check,
  Sparkles,
  Download,
  Loader2
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
import { LoadingState } from '../ui/LoadingState';
import { getVerificationOrigin, CertificateRenderData, pdfEngine, downloadPdfBlob } from '../../services/pdfService';
import { ProtectedCertificateModal } from './ProtectedCertificateModal';
import { TemplateSearchableSelect } from './TemplateSearchableSelect';
import { EventSearchableSelect } from './EventSearchableSelect';

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
  
  // Signatures default strictly to "None"
  const [leftSignatureId, setLeftSignatureId] = useState<string>('');
  const [rightSignatureId, setRightSignatureId] = useState<string>('');

  // Active citation preset tracking
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQuickCreatingCats, setIsQuickCreatingCats] = useState(false);
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
  const [isDownloadingIssuedPdf, setIsDownloadingIssuedPdf] = useState(false);

  // Fetch initial data when modal opens
  useEffect(() => {
    if (!isOpen) {
      // Reset form state on close
      setIssuedCert(null);
      setErrorMsg(null);
      setLeftSignatureId('');
      setRightSignatureId('');
      setActivePresetId(null);
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

        // Filter out archived and completed events
        const activeEvents = evts.filter((e) => e.status !== 'archived' && e.status !== 'completed');
        setEvents(activeEvents);

        // Published templates only
        const publishedTpls = tpls.filter((t) => t.status === 'published');
        setTemplates(publishedTpls);

        // Active signatories only
        const activeSigs = sigs.filter((s) => s.status === 'active');
        setSignatories(activeSigs);

        // Set default event
        const validDefault = defaultEventId && activeEvents.some((e) => e.id === defaultEventId);
        const initialEventId = (validDefault ? defaultEventId : '') || activeEvents[0]?.id || '';
        setSelectedEventId(initialEventId);

        if (defaultEventId && !validDefault) {
          const isCompleted = evts.some((e) => e.id === defaultEventId && e.status === 'completed');
          if (isCompleted) {
            setErrorMsg('The selected event is marked as completed. Certificates cannot be issued for completed events.');
          }
        }

        // Both Left and Right signature dropdowns strictly default to "None"
        setLeftSignatureId('');
        setRightSignatureId('');
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
        const cats = await portalService.getAwardCategories(selectedEventId);
        setCategories(cats);

        const currentEvent = events.find((e) => e.id === selectedEventId);
        if (cats.length > 0) {
          setSelectedCategoryId(cats[0].id);
          // Auto achievement text with smart citation
          const defaultCitation = autoDetectCitation(cats[0].name, currentEvent?.name, currentEvent?.category);
          setAchievement(defaultCitation);
          if (cats[0].templateId && templates.some((t) => t.id === cats[0].templateId)) {
            setSelectedTemplateId(cats[0].templateId);
          } else if (currentEvent?.defaultTemplateId && templates.some((t) => t.id === currentEvent.defaultTemplateId)) {
            setSelectedTemplateId(currentEvent.defaultTemplateId);
          } else if (templates.length > 0) {
            setSelectedTemplateId(templates[0].id);
          }
        } else {
          setSelectedCategoryId('');
          setAchievement(autoDetectCitation('Participation', currentEvent?.name, currentEvent?.category));
          if (currentEvent?.defaultTemplateId && templates.some((t) => t.id === currentEvent.defaultTemplateId)) {
            setSelectedTemplateId(currentEvent.defaultTemplateId);
          } else if (templates.length > 0) {
            setSelectedTemplateId(templates[0].id);
          }
        }
      } catch (err: any) {
        console.warn('Error loading event specifics:', err);
      }
    };

    loadEventSpecifics();
  }, [selectedEventId, events, templates]);

  // Handle Quick Add standard categories if event has none
  const handleQuickAddDefaultCategories = async () => {
    if (!selectedEventId) return;
    setIsQuickCreatingCats(true);
    try {
      const defaultCategories = [
        { name: 'First Place', description: 'Awarded to the 1st place winner' },
        { name: 'Second Place', description: 'Awarded to the 2nd place runner-up' },
        { name: 'Third Place', description: 'Awarded to the 3rd place runner-up' },
        { name: 'Participation Certificate', description: 'Awarded to all verified active participants' },
        { name: 'Certificate of Acknowledgement', description: 'Awarded to event judges, jury members, evaluators, and distinguished guests' },
      ];
      for (const cat of defaultCategories) {
        await portalService.createAwardCategory({
          eventId: selectedEventId,
          name: cat.name,
          description: cat.description,
          templateId: selectedTemplateId || undefined,
          status: 'active',
        });
      }
      const updatedCats = await portalService.getAwardCategories(selectedEventId);
      setCategories(updatedCats);
      if (updatedCats.length > 0) {
        setSelectedCategoryId(updatedCats[0].id);
        const currentEvent = events.find((ev) => ev.id === selectedEventId);
        setAchievement(autoDetectCitation(updatedCats[0].name, currentEvent?.name));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to auto-generate categories');
    } finally {
      setIsQuickCreatingCats(false);
    }
  };

  // Auto-Write Citation assistant
  const handleAutoWriteCitation = () => {
    const cat = categories.find((c) => c.id === selectedCategoryId);
    const currentEvent = events.find((e) => e.id === selectedEventId);
    const generated = autoDetectCitation(cat?.name || 'Achievement', currentEvent?.name, currentEvent?.category);
    setAchievement(generated);
    setActivePresetId(null);
  };

  // Citation suggestion buttons
  const applyPresetCitation = (presetId: string, textGenerator: () => string) => {
    setActivePresetId(presetId);
    setAchievement(textGenerator());
  };

  // Build distinct signatories for rendering
  const getRenderSignatories = () => {
    const leftSig = signatories.find((s) => s.id === leftSignatureId);
    const rightSig = signatories.find((s) => s.id === rightSignatureId);

    const sigArray: Array<{ name: string; designation: string; signatureAssetUrl?: string }> = [];
    if (leftSig) {
      sigArray[0] = {
        name: leftSig.name,
        designation: leftSig.designation,
        signatureAssetUrl: leftSig.signatureAssetUrl,
      };
    }
    if (rightSig) {
      sigArray[1] = {
        name: rightSig.name,
        designation: rightSig.designation,
        signatureAssetUrl: rightSig.signatureAssetUrl,
      };
    }
    return sigArray;
  };

  // Live Certificate Preview Generator (On-Screen Protected Sample View)
  const handlePreviewPdf = async () => {
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (!tpl) {
      setErrorMsg('Please select a certificate template to preview.');
      return;
    }
    setErrorMsg(null);
    setIsGeneratingPreviewPdf(true);
    try {
      const previewData: CertificateRenderData = {
        recipientName: recipientName.trim() || 'Jane Doe',
        eventName: events.find((e) => e.id === selectedEventId)?.name || 'Namdapha Event',
        achievement: achievement.trim() || 'First Place — Technical Excellence',
        position: categories.find((c) => c.id === selectedCategoryId)?.name || '1st Place',
        issueDate: issueDate || new Date().toISOString().split('T')[0],
        organizationName: 'Namdapha House, IIT Madras BS Degree',
        verificationCode: '', // Suppressed in sample preview ("without code to be seen")
        verificationUrl: '',  // Suppressed in sample preview ("without code to be seen")
        signatories: getRenderSignatories(),
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
    if (!selectedEventId) {
      setErrorMsg('Please select an event.');
      return;
    }
    if (!selectedCategoryId) {
      setErrorMsg('Please select an award category.');
      return;
    }
    if (!selectedTemplateId) {
      setErrorMsg('Please select a published certificate template.');
      return;
    }
    if (!recipientName.trim()) {
      setErrorMsg('Recipient name is required.');
      return;
    }
    if (!achievement.trim()) {
      setErrorMsg('Achievement citation description is required.');
      return;
    }
    // Prevent duplicate selection of same signatory on both left and right
    if (leftSignatureId && rightSignatureId && leftSignatureId === rightSignatureId) {
      setErrorMsg('A signatory cannot be assigned to both left and right positions simultaneously.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    // Signatures are optional; both can be None
    const signatoryIds = [leftSignatureId, rightSignatureId].filter(Boolean);

    const input: IssueCertificateInput = {
      eventId: selectedEventId,
      awardCategoryId: selectedCategoryId,
      templateId: selectedTemplateId,
      recipientName: recipientName.trim(),
      recipientEmail: recipientEmail.trim() || undefined,
      achievement: achievement.trim(),
      issueDate,
      signatoryIds,
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
  const handleDownloadIssuedPdf = async () => {
    if (!issuedCert) return;
    setIsDownloadingIssuedPdf(true);
    try {
      const details = await portalService.getCertificateDetails(issuedCert.id).catch(() => null);
      let tpl: Template | undefined;
      let renderData: CertificateRenderData;

      const origin = getVerificationOrigin();
      const verificationUrl = `${origin}/verify/${issuedCert.verificationCode}`;

      if (details?.templateSnapshot) {
        const snap = details.templateSnapshot;
        tpl = {
          id: snap.templateId,
          name: snap.templateName,
          backgroundUrl: snap.backgroundUrl || '',
          backgroundStoragePath: snap.backgroundStoragePath,
          pageWidth: snap.pageWidth,
          pageHeight: snap.pageHeight,
          pageUnit: snap.pageUnit,
          orientation: snap.orientation,
          fieldConfiguration: snap.fieldConfiguration || [],
          versionNumber: snap.versionNumber,
          status: 'published',
          createdAt: new Date().toISOString(),
        };
        renderData = {
          recipientName: issuedCert.recipientName,
          eventName: issuedCert.eventName,
          achievement: issuedCert.achievement,
          position: categories.find((c) => c.id === selectedCategoryId)?.name,
          issueDate: issuedCert.issueDate,
          organizationName: issuedCert.organizationName || 'Namdapha House, IIT Madras BS Degree',
          verificationCode: issuedCert.verificationCode,
          verificationUrl,
          signatories: (details.signatorySnapshot || []).map((s) => ({
            name: s.name,
            designation: s.designation,
            signatureAssetUrl: s.signatureAssetUrl,
          })),
        };
      } else {
        tpl = templates.find((t) => t.id === selectedTemplateId);
        if (!tpl) throw new Error('Selected template not found.');
        renderData = {
          recipientName: issuedCert.recipientName,
          eventName: issuedCert.eventName,
          achievement: issuedCert.achievement,
          position: categories.find((c) => c.id === selectedCategoryId)?.name,
          issueDate: issuedCert.issueDate,
          organizationName: issuedCert.organizationName || 'Namdapha House, IIT Madras BS Degree',
          verificationCode: issuedCert.verificationCode,
          verificationUrl,
          signatories: getRenderSignatories(),
        };
      }

      const pdfBytes = await pdfEngine.generateCertificatePdf(tpl, renderData);
      const safeFilename = `${issuedCert.recipientName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${issuedCert.verificationCode}.pdf`;
      downloadPdfBlob(pdfBytes, safeFilename);
    } catch (err: any) {
      console.error('Download error:', err);
      alert(`Failed to download certificate: ${err.message}`);
    } finally {
      setIsDownloadingIssuedPdf(false);
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

  // Signatory options filtering
  const activeSignatories = signatories.filter((s) => s.status === 'active');
  const leftOptions = [
    { value: '', label: 'None' },
    ...activeSignatories
      .filter((s) => s.id !== rightSignatureId)
      .map((s) => ({ value: s.id, label: `${s.name} (${s.designation})` })),
  ];
  const rightOptions = [
    { value: '', label: 'None' },
    ...activeSignatories
      .filter((s) => s.id !== leftSignatureId)
      .map((s) => ({ value: s.id, label: `${s.name} (${s.designation})` })),
  ];

  const leftSignatory = activeSignatories.find((s) => s.id === leftSignatureId);
  const rightSignatory = activeSignatories.find((s) => s.id === rightSignatureId);
  const currentEvent = events.find((e) => e.id === selectedEventId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={issuedCert ? 'Certificate Issued Successfully' : 'Issue Individual Certificate'}
      description={
        issuedCert
          ? 'Official record committed to PostgreSQL ledger with immutable snapshots.'
          : 'Create and issue a verified certificate.'
      }
      maxWidth="4xl"
      footer={
        !isLoadingData && !issuedCert ? (
          <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3">
            {/* Secondary Action: Preview Certificate */}
            <Button
              variant="outline"
              size="sm"
              type="button"
              leftIcon={<Eye className="w-3.5 h-3.5 text-neutral-secondary" />}
              isLoading={isGeneratingPreviewPdf}
              onClick={handlePreviewPdf}
              disabled={!selectedTemplateId}
              title="View on-screen sample preview with anti-copy protection and watermarks"
            >
              Preview Sample (On-Screen)
            </Button>

            {/* Right Group: Cancel & Primary Issue */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                form="issue-individual-certificate-form"
                isLoading={isSubmitting}
                leftIcon={<Award className="w-4 h-4" />}
              >
                Issue Certificate
              </Button>
            </div>
          </div>
        ) : undefined
      }
    >
      {isLoadingData ? (
        <div className="py-16">
          <LoadingState message="Loading events, templates, and signatories..." />
        </div>
      ) : issuedCert ? (
        /* SUCCESS VIEW */
        <div className="space-y-6 py-2 text-xs">
          <div className="p-6 bg-emerald-50/80 rounded-2xl border border-emerald-200/80 text-center space-y-3.5">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-950">Official Certificate Issued</h3>
              <p className="text-xs text-emerald-800/80 mt-0.5">
                Record committed with status <span className="font-semibold uppercase tracking-wider">ISSUED</span>.
              </p>
            </div>

            {/* 6-digit Code Showcase */}
            <div className="inline-flex items-center gap-3 bg-white px-5 py-2.5 rounded-xl border border-emerald-300/80 shadow-xs">
              <span className="text-xs text-neutral-secondary font-medium">Verification Code:</span>
              <span className="font-mono text-xl font-bold tracking-widest text-brand-midnight">
                {issuedCert.verificationCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-1 hover:bg-neutral-surface rounded text-neutral-secondary hover:text-neutral-main transition-colors"
                title="Copy verification code"
                aria-label="Copy verification code"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 bg-neutral-surface/40 rounded-xl border border-neutral-subtle text-xs">
            <div>
              <span className="text-neutral-secondary text-[11px] block">Recipient</span>
              <span className="font-semibold text-neutral-main text-sm">{issuedCert.recipientName}</span>
            </div>
            <div>
              <span className="text-neutral-secondary text-[11px] block">Event</span>
              <span className="font-semibold text-neutral-main text-sm">{issuedCert.eventName}</span>
            </div>
            <div>
              <span className="text-neutral-secondary text-[11px] block">Achievement</span>
              <span className="font-semibold text-neutral-main">{issuedCert.achievement}</span>
            </div>
            <div>
              <span className="text-neutral-secondary text-[11px] block">Issue Date</span>
              <span className="font-semibold text-neutral-main font-mono">{issuedCert.issueDate}</span>
            </div>
          </div>

          {/* Verification link info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-brand-violet/5 rounded-xl border border-brand-violet/20 text-xs gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
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
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-secondary hover:text-neutral-main hover:bg-white px-2.5 py-1 rounded-md border border-neutral-subtle bg-white/70 transition-colors"
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

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-4 border-t border-neutral-subtle">
            <Button
              variant="primary"
              size="sm"
              leftIcon={
                isDownloadingIssuedPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )
              }
              onClick={handleDownloadIssuedPdf}
              disabled={isDownloadingIssuedPdf}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isDownloadingIssuedPdf ? 'Generating PDF...' : 'Download Certificate (PDF)'}
            </Button>
            <a
              href={`${getVerificationOrigin()}/verify/${issuedCert.verificationCode}`}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="outline" size="sm" leftIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                Open Public Record
              </Button>
            </a>
            <Button variant="outline" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        /* FIVE-STEP WORKFLOW FORM */
        <form
          id="issue-individual-certificate-form"
          onSubmit={handleSubmit}
          className="space-y-6 text-xs py-1"
        >
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-rose-800 text-xs animate-in fade-in duration-150">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="flex-1 leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: EVENT AND AWARD */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-neutral-secondary">
                Step 1 • Event and Award
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EventSearchableSelect
                events={events}
                selectedEventId={selectedEventId}
                onSelectEvent={(eventId) => setSelectedEventId(eventId)}
                disabled={isSubmitting}
              />

              <div className="space-y-1.5">
                <Select
                  label="Award Category"
                  value={selectedCategoryId}
                  onChange={(e) => {
                    const newCatId = e.target.value;
                    setSelectedCategoryId(newCatId);
                    const cat = categories.find((c) => c.id === newCatId);
                    if (cat) {
                      setAchievement(autoDetectCitation(cat.name, currentEvent?.name, currentEvent?.category));
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
                  disabled={isSubmitting || categories.length === 0}
                />
              </div>
            </div>

            {categories.length === 0 && selectedEventId && (
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <p className="font-semibold text-amber-950">No Award Categories Configured for this Event</p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Certificates must belong to an award category (e.g. <em>1st Winner</em>, <em>2nd Place</em>, <em>Participation</em>).
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleQuickAddDefaultCategories}
                      disabled={isQuickCreatingCats}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-200/80 hover:bg-amber-300 text-amber-950 font-semibold text-[11px] transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {isQuickCreatingCats
                          ? 'Generating Categories...'
                          : 'Auto-Generate Standard 5 Categories (1st, 2nd, 3rd, Participation, Acknowledgement)'}
                      </span>
                    </button>
                    <a
                      href={`/admin/events/${selectedEventId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-violet underline hover:text-brand-midnight"
                    >
                      <span>Open Event Details</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* STEP 2: CERTIFICATE TEMPLATE */}
          <section className="space-y-3 pt-4 border-t border-neutral-subtle/80">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-neutral-secondary">
                Step 2 • Certificate Template
              </span>
            </div>

            <TemplateSearchableSelect
              templates={templates}
              selectedTemplateId={selectedTemplateId}
              onSelectTemplate={(tplId) => setSelectedTemplateId(tplId)}
              onPreviewTemplate={(tpl) => {
                setSamplePreviewData({
                  template: tpl,
                  renderData: {
                    recipientName: recipientName.trim() || 'Jane Doe',
                    eventName: currentEvent?.name || 'Competition Event',
                    achievement: achievement.trim() || 'Sample Achievement',
                    position: categories.find((c) => c.id === selectedCategoryId)?.name || '1st Place',
                    issueDate,
                    organizationName: 'Namdapha House, IIT Madras BS Degree',
                    verificationCode: '',
                    verificationUrl: '',
                    signatories: getRenderSignatories(),
                  },
                });
                setIsSamplePreviewOpen(true);
              }}
              disabled={isSubmitting}
            />
          </section>

          {/* STEP 3: RECIPIENT DETAILS */}
          <section className="space-y-3 pt-4 border-t border-neutral-subtle/80">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-neutral-secondary">
                Step 3 • Recipient Details
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Recipient Full Name"
                placeholder="e.g. Priyanshu Sharma"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                required
                disabled={isSubmitting}
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-main flex items-center justify-between">
                  <span>Recipient Email</span>
                  <span className="text-[10px] font-mono font-normal text-neutral-secondary">Optional</span>
                </label>
                <Input
                  type="email"
                  placeholder="e.g. 21f1000000@study.iitm.ac.in"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </section>

          {/* STEP 4: ACHIEVEMENT / CITATION */}
          <section className="space-y-3 pt-4 border-t border-neutral-subtle/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-neutral-secondary">
                Step 4 • Achievement / Citation
              </span>
              <button
                type="button"
                onClick={handleAutoWriteCitation}
                className="inline-flex items-center gap-1.5 text-xs text-brand-violet hover:text-brand-midnight font-medium transition-colors"
                title="Auto-detect citation from selected award category"
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-violet" />
                <span>Auto-Write Citation</span>
              </button>
            </div>

            {/* Restrained Citation Suggestions */}
            <div className="flex flex-wrap gap-1.5 p-1 bg-neutral-surface/40 rounded-lg border border-neutral-subtle">
              {DESCRIPTION_PRESETS.map((preset) => {
                const isActive = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      applyPresetCitation(preset.id, () =>
                        preset.generateText(currentEvent?.name, currentEvent?.category)
                      )
                    }
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      isActive
                        ? 'bg-brand-violet/10 border-brand-violet/40 text-brand-violet font-semibold'
                        : 'border-neutral-subtle bg-white hover:bg-neutral-surface text-neutral-main hover:border-neutral-secondary/40'
                    }`}
                  >
                    {preset.title.replace(' Winner', '')}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() =>
                  applyPresetCitation('judge', () =>
                    `Presented with deep gratitude and respectful acknowledgment for serving as an esteemed Judge and evaluating the participants with exceptional expertise, discernment, and scholarly guidance at ${currentEvent?.name || 'the event'}, organized by Namdapha House, IIT Madras.`
                  )
                }
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                  activePresetId === 'judge'
                    ? 'bg-brand-violet/10 border-brand-violet/40 text-brand-violet font-semibold'
                    : 'border-neutral-subtle bg-white hover:bg-neutral-surface text-neutral-main hover:border-neutral-secondary/40'
                }`}
              >
                Certificate of Acknowledgement (Judge)
              </button>

              {currentEvent?.category === 'Impact' && (
                <button
                  type="button"
                  onClick={() =>
                    applyPresetCitation('debate-team', () =>
                      `Winning Team (Against the Motion) - First Place in ${currentEvent?.name || 'the Debate'}, organized by Namdapha House, IIT Madras.`
                    )
                  }
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                    activePresetId === 'debate-team'
                      ? 'bg-brand-violet/10 border-brand-violet/40 text-brand-violet font-semibold'
                      : 'border-neutral-subtle bg-white hover:bg-neutral-surface text-neutral-main hover:border-neutral-secondary/40'
                  }`}
                >
                  Winning Team (Against the Motion)
                </button>
              )}
            </div>

            {/* Editable Text Area */}
            <div className="space-y-1.5">
              <textarea
                rows={3}
                className="block w-full rounded-lg border border-neutral-subtle bg-white p-3 text-xs text-neutral-main placeholder:text-neutral-secondary/60 focus-visible:outline-none focus-visible:border-brand-violet focus-visible:ring-1 focus-visible:ring-brand-violet transition-colors resize-y leading-relaxed"
                placeholder="Enter formal citation description..."
                value={achievement}
                onChange={(e) => {
                  setAchievement(e.target.value);
                  setActivePresetId(null);
                }}
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Issue Date */}
            <div className="max-w-xs">
              <Input
                label="Issue Date"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
          </section>

          {/* STEP 5: SIGNATURES */}
          <section className="space-y-3 pt-4 border-t border-neutral-subtle/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-neutral-secondary">
                Step 5 • Signatures
              </span>
              <span className="text-[11px] text-neutral-secondary font-mono">Optional</span>
            </div>

            {activeSignatories.length === 0 ? (
              <p className="text-[11px] text-neutral-secondary italic">
                No active signatories configured. Certificates can be issued without signatures.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Signature */}
                <div className="space-y-1.5">
                  <Select
                    label="Left Signature"
                    value={leftSignatureId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setLeftSignatureId(newId);
                      if (newId && newId === rightSignatureId) {
                        setRightSignatureId('');
                      }
                    }}
                    options={leftOptions}
                    disabled={isSubmitting}
                  />

                  {leftSignatory ? (
                    <div className="p-2 rounded-lg border border-neutral-subtle bg-neutral-surface/40 flex items-center gap-2.5 animate-in fade-in duration-150">
                      {leftSignatory.signatureAssetUrl ? (
                        <div className="w-14 h-8 bg-white rounded border border-neutral-subtle flex items-center justify-center p-1 shrink-0">
                          <img
                            src={leftSignatory.signatureAssetUrl}
                            alt={leftSignatory.name}
                            className="max-h-full max-w-full object-contain pointer-events-none"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-8 bg-neutral-surface rounded border border-neutral-subtle flex items-center justify-center text-[9px] text-neutral-secondary shrink-0 font-mono">
                          No Asset
                        </div>
                      )}
                      <div className="min-w-0 flex-1 text-xs">
                        <p className="font-semibold text-neutral-main truncate">{leftSignatory.name}</p>
                        <p className="text-[11px] text-neutral-secondary truncate">{leftSignatory.designation}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-neutral-secondary/70 font-mono px-0.5">
                      None assigned to left position.
                    </p>
                  )}
                </div>

                {/* Right Signature */}
                <div className="space-y-1.5">
                  <Select
                    label="Right Signature"
                    value={rightSignatureId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setRightSignatureId(newId);
                      if (newId && newId === leftSignatureId) {
                        setLeftSignatureId('');
                      }
                    }}
                    options={rightOptions}
                    disabled={isSubmitting}
                  />

                  {rightSignatory ? (
                    <div className="p-2 rounded-lg border border-neutral-subtle bg-neutral-surface/40 flex items-center gap-2.5 animate-in fade-in duration-150">
                      {rightSignatory.signatureAssetUrl ? (
                        <div className="w-14 h-8 bg-white rounded border border-neutral-subtle flex items-center justify-center p-1 shrink-0">
                          <img
                            src={rightSignatory.signatureAssetUrl}
                            alt={rightSignatory.name}
                            className="max-h-full max-w-full object-contain pointer-events-none"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-8 bg-neutral-surface rounded border border-neutral-subtle flex items-center justify-center text-[9px] text-neutral-secondary shrink-0 font-mono">
                          No Asset
                        </div>
                      )}
                      <div className="min-w-0 flex-1 text-xs">
                        <p className="font-semibold text-neutral-main truncate">{rightSignatory.name}</p>
                        <p className="text-[11px] text-neutral-secondary truncate">{rightSignatory.designation}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-neutral-secondary/70 font-mono px-0.5">
                      None assigned to right position.
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>
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
