import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Award,
  Building2,
  Hash,
  Download,
  Share2,
  ShieldCheck,
  FileText,
  ExternalLink,
  Printer,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { portalService } from '../../services';
import { PublicVerificationResult } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingState } from '../../components/ui/LoadingState';
import { generatePdfFromDetails, createPdfPreviewUrl } from '../../services/pdfService';

export const VerifyPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const location = useLocation();

  const [result, setResult] = useState<PublicVerificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Tab View state: 'pdf' or 'details' (defaults to 'pdf' if #pdf is in the URL hash)
  const [activeTab, setActiveTab] = useState<'details' | 'pdf'>(() => {
    return typeof window !== 'undefined' && window.location.hash.toLowerCase() === '#pdf'
      ? 'pdf'
      : 'details';
  });

  // PDF Generation State
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Keep activeTab in sync with browser URL hash
  useEffect(() => {
    if (location.hash.toLowerCase() === '#pdf') {
      setActiveTab('pdf');
    }
  }, [location.hash]);

  // Clean up object URL on unmount or when URL changes
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  // Fetch certificate verification record
  useEffect(() => {
    let isMounted = true;
    const fetchVerification = async () => {
      if (!code) {
        setIsLoading(false);
        return;
      }

      const cleanCode = code.trim();

      // Client-side rate-limiting check: max 15 lookups per 60 seconds
      try {
        const now = Date.now();
        const historyKey = 'namdapha_verification_lookups';
        const rawHistory = sessionStorage.getItem(historyKey);
        const lookups: number[] = rawHistory ? JSON.parse(rawHistory) : [];
        const recentLookups = lookups.filter((ts) => now - ts < 60000);

        if (recentLookups.length >= 15) {
          if (isMounted) {
            setIsRateLimited(true);
            setIsLoading(false);
          }
          return;
        }

        recentLookups.push(now);
        sessionStorage.setItem(historyKey, JSON.stringify(recentLookups));
      } catch {
        // Fallback gracefully if storage is restricted
      }

      // Input sanitization: must be exactly 6 numeric digits
      if (!/^\d{6}$/.test(cleanCode)) {
        if (isMounted) {
          setResult({ isValid: false, status: 'not_found' });
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const res = await portalService.verifyCertificate(cleanCode);
        if (isMounted) {
          setResult(res);
        }
      } catch {
        if (isMounted) {
          setResult({ isValid: false, status: 'not_found' });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchVerification();
    return () => {
      isMounted = false;
    };
  }, [code]);

  // PDF Generator Callback
  const handleGeneratePdf = useCallback(async () => {
    if (pdfUrl || isGeneratingPdf || !code) return;

    setIsGeneratingPdf(true);
    setPdfError(null);
    try {
      const cleanCode = code.trim();
      const details = await portalService.getCertificatePublicDetails(cleanCode);
      if (!details) {
        throw new Error('Certificate details could not be retrieved from the registry.');
      }

      const bytes = await generatePdfFromDetails(details);
      const url = createPdfPreviewUrl(bytes);
      setPdfUrl(url);
    } catch (err: any) {
      console.error('[VerifyPage] PDF generation error:', err);
      setPdfError(err?.message || 'Could not generate official vector PDF document.');
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [code, isGeneratingPdf, pdfUrl]);

  // Trigger PDF generation when valid certificate is found
  useEffect(() => {
    if (result?.isValid && result.status === 'issued') {
      // If user came via #pdf or switched to PDF tab, generate immediately
      if (activeTab === 'pdf' || location.hash.toLowerCase() === '#pdf') {
        handleGeneratePdf();
      }
    }
  }, [result, activeTab, location.hash, handleGeneratePdf]);

  // Handle Switching View Tabs and Syncing URL Hash
  const handleTabChange = (targetTab: 'details' | 'pdf') => {
    setActiveTab(targetTab);
    const targetHash = targetTab === 'pdf' ? '#pdf' : '';
    const newUrl = `${window.location.pathname}${window.location.search}${targetHash}`;
    window.history.replaceState(null, '', newUrl);

    if (targetTab === 'pdf' && !pdfUrl && !isGeneratingPdf) {
      handleGeneratePdf();
    }
  };

  // Action: Download PDF File
  const handleDownloadPdf = () => {
    if (!pdfUrl) {
      handleGeneratePdf();
      return;
    }
    const safeRecipient = (result?.recipientName || 'Official').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
    const safeCode = result?.verificationCode || code || 'certificate';
    const filename = `Namdapha_Certificate_${safeCode}_${safeRecipient}.pdf`;

    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Action: Open in New Tab
  const handleOpenInNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  // Action: Print Certificate
  const handlePrint = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
        printWindow.print();
        return;
      }
    }
    window.print();
  };

  // Action: Copy #pdf Link
  const handleCopyLink = (includePdfHash = false) => {
    const origin = window.location.origin;
    const url = `${origin}/verify/${code}${includePdfHash ? '#pdf' : ''}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <LoadingState message={`Checking registry record for code "${code}"...`} />
      </div>
    );
  }

  const isIssued = !isRateLimited && result?.isValid && result.status === 'issued';

  return (
    <div className="flex-1 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div
        className={`mx-auto w-full space-y-6 transition-all duration-300 ${
          activeTab === 'pdf' && isIssued ? 'max-w-4xl' : 'max-w-2xl'
        }`}
      >
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-neutral-secondary hover:text-brand-violet transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Search another certificate</span>
          </Link>
          <span className="font-mono text-xs text-neutral-secondary">
            Lookup Code: <strong className="text-neutral-main">{code}</strong>
          </span>
        </div>

        {/* Rate Limited State */}
        {isRateLimited && (
          <div className="bg-amber-50 rounded-xl shadow-md border border-amber-200 p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-amber-900">Verification Rate Limit Reached</h2>
              <p className="text-xs text-amber-800 mt-1 max-w-md mx-auto">
                To protect six-digit certificate verification codes against brute-force enumeration, queries are limited to 15 per minute per client.
              </p>
            </div>
            <p className="text-[11px] text-amber-700">Please wait 60 seconds before submitting further lookup queries.</p>
          </div>
        )}

        {/* Outcome 1: VALID ISSUED CERTIFICATE */}
        {isIssued && (
          <div className="space-y-4">
            {/* View Mode Segmented Tab Switcher */}
            <div className="flex items-center justify-center">
              <div className="inline-flex p-1 bg-white border border-neutral-subtle rounded-xl shadow-xs">
                <button
                  type="button"
                  id="tab-view-pdf"
                  onClick={() => handleTabChange('pdf')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    activeTab === 'pdf'
                      ? 'bg-brand-violet text-white shadow-xs'
                      : 'text-neutral-secondary hover:text-neutral-main hover:bg-neutral-surface/60'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Certificate PDF</span>
                  <span
                    className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded ${
                      activeTab === 'pdf'
                        ? 'bg-white/20 text-white'
                        : 'bg-brand-violet-subtle text-brand-violet'
                    }`}
                  >
                    #pdf
                  </span>
                </button>

                <button
                  type="button"
                  id="tab-view-details"
                  onClick={() => handleTabChange('details')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    activeTab === 'details'
                      ? 'bg-brand-violet text-white shadow-xs'
                      : 'text-neutral-secondary hover:text-neutral-main hover:bg-neutral-surface/60'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verification Record</span>
                </button>
              </div>
            </div>

            {/* TAB 1: EMBEDDED PDF VIEW (#pdf) */}
            {activeTab === 'pdf' && (
              <div
                role="region"
                aria-label="Official Certificate Vector PDF"
                className="bg-white rounded-xl shadow-md border border-neutral-subtle overflow-hidden"
              >
                {/* Status Bar */}
                <div className="bg-[#E2F4E9] border-b border-[#A3D9B8] px-5 py-3.5 sm:px-6 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#17653C] text-white flex items-center justify-center shadow-xs shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-sm sm:text-base font-bold text-[#17653C]">
                          Official Certificate PDF
                        </h1>
                        <Badge variant="success" size="sm">
                          Verified
                        </Badge>
                      </div>
                      <p className="text-xs text-[#17653C]/80 font-medium">
                        Awarded to <strong className="text-[#17653C]">{result.recipientName}</strong> for{' '}
                        {result.eventName}
                      </p>
                    </div>
                  </div>

                  {/* PDF Toolbar Quick Actions */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Download className="w-3.5 h-3.5" />}
                      onClick={handleDownloadPdf}
                      disabled={isGeneratingPdf}
                    >
                      Download PDF
                    </Button>
                    {pdfUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
                        onClick={handleOpenInNewTab}
                        title="Open vector PDF in new browser tab"
                      >
                        New Tab
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Printer className="w-3.5 h-3.5" />}
                      onClick={handlePrint}
                      title="Print certificate"
                    >
                      Print
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={isCopied ? <ShieldCheck className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                      onClick={() => handleCopyLink(true)}
                      title="Copy link with #pdf anchor"
                    >
                      {isCopied ? 'Copied!' : 'Share #pdf'}
                    </Button>
                  </div>
                </div>

                {/* PDF Viewer Canvas Container */}
                <div className="relative bg-neutral-900/5 p-2 sm:p-4 min-h-[500px] flex items-center justify-center">
                  {/* State A: Generating PDF */}
                  {isGeneratingPdf && (
                    <div className="py-24 text-center space-y-4 max-w-md mx-auto">
                      <div className="w-12 h-12 rounded-full bg-brand-violet-subtle text-brand-violet flex items-center justify-center mx-auto animate-spin">
                        <RefreshCw className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-neutral-main flex items-center justify-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-brand-gold animate-pulse" />
                          <span>Generating Official Vector Certificate...</span>
                        </h3>
                        <p className="text-xs text-neutral-secondary">
                          Embedding institutional layout, authoritative signatures, and cryptographic QR code.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* State B: Error Generating PDF */}
                  {!isGeneratingPdf && pdfError && (
                    <div className="py-16 text-center space-y-4 max-w-md mx-auto p-6 bg-red-50/70 rounded-xl border border-red-200">
                      <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-red-900">PDF Compilation Issue</h3>
                        <p className="text-xs text-red-700 mt-1">{pdfError}</p>
                      </div>
                      <div className="pt-2 flex items-center justify-center gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                          onClick={handleGeneratePdf}
                        >
                          Retry Generation
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTabChange('details')}
                        >
                          View Registry Record
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* State C: Embedded PDF Canvas */}
                  {!isGeneratingPdf && pdfUrl && (
                    <div className="w-full flex flex-col items-center">
                      <div className="w-full h-[580px] sm:h-[680px] md:h-[780px] rounded-lg overflow-hidden shadow-md border border-neutral-subtle bg-white">
                        <iframe
                          src={`${pdfUrl}#toolbar=0&navpanes=0`}
                          title={`Official Certificate for ${result.recipientName}`}
                          className="w-full h-full border-0 block"
                        />
                      </div>
                      <div className="w-full pt-3 px-1 flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-secondary gap-2">
                        <span>
                          Direct browser preview. In mobile browsers, use{' '}
                          <button
                            type="button"
                            onClick={handleDownloadPdf}
                            className="text-brand-violet font-semibold underline hover:text-brand-violet-dark"
                          >
                            Download PDF
                          </button>{' '}
                          for the full offline copy.
                        </span>
                        <span className="font-mono text-neutral-muted">Code: {result.verificationCode}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Metadata Summary Banner Below Viewer */}
                <div className="p-4 sm:p-5 bg-neutral-surface/40 border-t border-neutral-subtle">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 rounded bg-white border border-neutral-subtle">
                      <span className="text-[10px] uppercase font-semibold text-neutral-secondary block">
                        Recipient
                      </span>
                      <span className="font-bold text-neutral-main truncate block">
                        {result.recipientName}
                      </span>
                    </div>

                    <div className="p-2.5 rounded bg-white border border-neutral-subtle">
                      <span className="text-[10px] uppercase font-semibold text-neutral-secondary block">
                        Event
                      </span>
                      <span className="font-bold text-neutral-main truncate block">{result.eventName}</span>
                    </div>

                    <div className="p-2.5 rounded bg-white border border-neutral-subtle">
                      <span className="text-[10px] uppercase font-semibold text-neutral-secondary block">
                        Achievement
                      </span>
                      <span className="font-bold text-neutral-main truncate block">
                        {result.achievement}
                      </span>
                    </div>

                    <div className="p-2.5 rounded bg-white border border-neutral-subtle">
                      <span className="text-[10px] uppercase font-semibold text-neutral-secondary block">
                        Date Issued
                      </span>
                      <span className="font-bold text-neutral-main truncate block">{result.issueDate}</span>
                    </div>
                  </div>
                </div>

                {/* Security Footnote */}
                <div className="bg-neutral-surface/60 px-4 py-3 border-t border-neutral-subtle text-center text-xs text-neutral-secondary">
                  <span className="flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#17653C]" />
                    <span>Authoritative document rendered from official Namdapha House registry records</span>
                  </span>
                </div>
              </div>
            )}

            {/* TAB 2: DETAILED RECORD VIEW */}
            {activeTab === 'details' && (
              <div
                role="region"
                aria-label="Verified Certificate Details"
                className="bg-white rounded-xl shadow-md border border-neutral-subtle overflow-hidden"
              >
                {/* Status Header */}
                <div className="bg-[#E2F4E9] border-b border-[#A3D9B8] p-5 sm:p-6 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-[#17653C] text-white flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-[#17653C]">
                      Official Certificate Verified
                    </h1>
                    <p className="text-xs sm:text-sm text-[#17653C]/80 mt-1 font-medium">
                      This document is an authentic record in the Namdapha House Registry.
                    </p>
                  </div>
                </div>

                {/* Banner linking to PDF mode */}
                <div className="bg-brand-violet-subtle/50 border-b border-brand-violet-subtle px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-brand-midnight">
                    <FileText className="w-4 h-4 text-brand-violet shrink-0" />
                    <span>
                      An official vector PDF of this certificate is available for viewing and download.
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    className="shrink-0"
                    leftIcon={<FileText className="w-3.5 h-3.5" />}
                    onClick={() => handleTabChange('pdf')}
                  >
                    View Certificate PDF (#pdf)
                  </Button>
                </div>

                {/* Certificate Metadata Grid */}
                <div className="p-6 sm:p-8 space-y-6">
                  <div className="text-center pb-6 border-b border-neutral-subtle space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-neutral-secondary">
                      Certificate Awarded To
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-bold text-neutral-main">
                      {result.recipientName}
                    </h2>
                    <div className="pt-1">
                      <Badge variant="gold" size="md">
                        {result.achievement}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                    <div className="p-3.5 rounded-lg bg-neutral-surface/40 border border-neutral-subtle space-y-1">
                      <div className="flex items-center space-x-1.5 text-neutral-secondary">
                        <Award className="w-4 h-4 text-brand-violet" />
                        <span className="font-semibold uppercase text-[11px]">Event / Competition</span>
                      </div>
                      <p className="font-medium text-neutral-main text-sm">{result.eventName}</p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-neutral-surface/40 border border-neutral-subtle space-y-1">
                      <div className="flex items-center space-x-1.5 text-neutral-secondary">
                        <Building2 className="w-4 h-4 text-brand-violet" />
                        <span className="font-semibold uppercase text-[11px]">Issuing Authority</span>
                      </div>
                      <p className="font-medium text-neutral-main text-sm">{result.organizationName}</p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-neutral-surface/40 border border-neutral-subtle space-y-1">
                      <div className="flex items-center space-x-1.5 text-neutral-secondary">
                        <Calendar className="w-4 h-4 text-brand-violet" />
                        <span className="font-semibold uppercase text-[11px]">Date of Issuance</span>
                      </div>
                      <p className="font-medium text-neutral-main text-sm">{result.issueDate}</p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-neutral-surface/40 border border-neutral-subtle space-y-1">
                      <div className="flex items-center space-x-1.5 text-neutral-secondary">
                        <Hash className="w-4 h-4 text-brand-violet" />
                        <span className="font-semibold uppercase text-[11px]">Registry Code</span>
                      </div>
                      <p className="font-mono font-bold text-brand-violet text-sm">{result.verificationCode}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="primary"
                      className="flex-1"
                      leftIcon={<FileText className="w-4 h-4" />}
                      onClick={() => handleTabChange('pdf')}
                    >
                      View Certificate PDF
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      leftIcon={<Printer className="w-4 h-4" />}
                      onClick={() => window.print()}
                    >
                      Print Record
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      leftIcon={isCopied ? <ShieldCheck className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                      onClick={() => handleCopyLink(false)}
                    >
                      {isCopied ? 'Link Copied!' : 'Copy Link'}
                    </Button>
                  </div>
                </div>

                <div className="bg-neutral-surface/50 p-4 border-t border-neutral-subtle text-center text-xs text-neutral-secondary">
                  <span className="flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#17653C]" />
                    <span>Digitally confirmed against Namdapha House registry database records</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Outcome 2: REVOKED */}
        {result?.status === 'revoked' && (
          <div className="bg-white rounded-xl shadow-md border border-[#F4AFAF] overflow-hidden">
            <div className="bg-[#FBE5E5] border-b border-[#F4AFAF] p-5 sm:p-6 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#A52A2A] text-white flex items-center justify-center mx-auto shadow-xs">
                <XCircle className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#A52A2A]">
                  Certificate Revoked
                </h1>
                <p className="text-xs sm:text-sm text-[#A52A2A]/90 mt-1 font-medium">
                  This certificate has been revoked by the issuing authority and is no longer valid.
                </p>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-5">
              <div className="p-4 rounded-lg bg-[#FBE5E5]/40 border border-[#F4AFAF] text-xs text-[#A52A2A] space-y-1.5">
                <span className="font-bold uppercase tracking-wider block">Official Revocation Notice:</span>
                <p className="text-sm font-medium">{result.revocationReasonPublic || 'Revoked by authority action.'}</p>
                {result.revocationDate && (
                  <p className="text-[11px] text-neutral-secondary pt-1">
                    Revocation logged at: {new Date(result.revocationDate).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-neutral-surface rounded border border-neutral-subtle">
                  <span className="text-neutral-secondary block">Originally Issued To:</span>
                  <span className="font-semibold text-neutral-main">{result.recipientName}</span>
                </div>
                <div className="p-3 bg-neutral-surface rounded border border-neutral-subtle">
                  <span className="text-neutral-secondary block">Event:</span>
                  <span className="font-semibold text-neutral-main">{result.eventName}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Outcome 3: NOT FOUND */}
        {result?.status === 'not_found' && (
          <div className="bg-white rounded-xl shadow-md border border-neutral-subtle p-8 text-center space-y-5">
            <div className="w-12 h-12 rounded-full bg-neutral-surface text-neutral-secondary flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-neutral-main">
                No Certificate Record Found
              </h1>
              <p className="text-sm text-neutral-secondary max-w-md mx-auto">
                No issued or recorded certificate matches the verification code <span className="font-mono font-bold text-neutral-main">"{code}"</span>.
              </p>
            </div>
            <p className="text-xs text-neutral-secondary/80 max-w-sm mx-auto">
              Please double check the code printed on the physical document or QR code and try again.
            </p>
            <div className="pt-2">
              <Link to="/">
                <Button variant="primary" size="md">
                  Try Another Code
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
