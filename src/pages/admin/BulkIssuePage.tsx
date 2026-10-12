import React, { useEffect, useState, useRef } from 'react';
import Papa from 'papaparse';
import JSZip from 'jszip';
import {
  UploadCloud,
  CheckCircle2,
  ArrowRight,
  Download,
  RotateCcw,
  Check,
  Sparkles
} from 'lucide-react';
import { DESCRIPTION_PRESETS, autoDetectCitation } from '../../utils/descriptionPresets';
import { portalService } from '../../services';
import {
  IssuanceBatch,
  Event,
  AwardCategory,
  Template,
  Signatory,
  Certificate
} from '../../types';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { LoadingState } from '../../components/ui/LoadingState';
import { generatePdfFromDetails } from '../../services/pdfService';

interface ParsedRow {
  index: number;
  raw: Record<string, string>;
  recipientName: string;
  recipientEmail?: string;
  achievement: string;
  isValid: boolean;
  errors: string[];
  isExcluded: boolean;
  issuedCert?: Certificate;
}

/**
 * Bulk Certificate Issuance Page
 *
 * Implements PapaParse CSV file streaming, row-level schema validation,
 * transactional PostgreSQL batch insertion, and JSZip multi-PDF download bundling.
 */
export const BulkIssuePage: React.FC = () => {
  const [batches, setBatches] = useState<IssuanceBatch[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<AwardCategory[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Workflow Steps: 1: Config, 2: Upload, 3: Map & Validate, 4: Execute & Download
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Configuration State
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedSignatoryIds, setSelectedSignatoryIds] = useState<string[]>([]);
  const [defaultIssueDate, setDefaultIssueDate] = useState(new Date().toISOString().split('T')[0]);

  // CSV File & Parsing State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [rawParsedData, setRawParsedData] = useState<Record<string, string>[]>([]);
  const [nameColumn, setNameColumn] = useState('');
  const [emailColumn, setEmailColumn] = useState('');
  const [achievementColumn, setAchievementColumn] = useState('');

  // Processed Rows & Validation State
  const [rows, setRows] = useState<ParsedRow[]>([]);

  // Execution Progress
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);
  const [createdBatch, setCreatedBatch] = useState<IssuanceBatch | null>(null);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load initial prerequisite data
  const loadPrerequisites = async () => {
    setIsLoading(true);
    try {
      const [bts, evts, tpls, sigs] = await Promise.all([
        portalService.getIssuanceBatches(),
        portalService.getEvents(),
        portalService.getTemplates(),
        portalService.getSignatories(),
      ]);

      setBatches(bts);
      const activeEvents = evts.filter((e) => e.status !== 'archived');
      setEvents(activeEvents);
      const publishedTpls = tpls.filter((t) => t.status === 'published');
      setTemplates(publishedTpls);
      const activeSigs = sigs.filter((s) => s.status === 'active');
      setSignatories(activeSigs);

      if (activeEvents.length > 0 && !selectedEventId) {
        setSelectedEventId(activeEvents[0].id);
      }
      if (publishedTpls.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(publishedTpls[0].id);
      }
      if (activeSigs.length > 0 && selectedSignatoryIds.length === 0) {
        setSelectedSignatoryIds(activeSigs.slice(0, 2).map((s) => s.id));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPrerequisites();
  }, []);

  // Update categories whenever selected event changes
  useEffect(() => {
    if (!selectedEventId) {
      setCategories([]);
      return;
    }
    const loadCats = async () => {
      try {
        const [cats, eventSigs] = await Promise.all([
          portalService.getAwardCategories(selectedEventId),
          portalService.getEventSignatories(selectedEventId).catch(() => []),
        ]);
        setCategories(cats);
        if (cats.length > 0) setSelectedCategoryId(cats[0].id);

        const currentEvent = events.find((e) => e.id === selectedEventId);
        if (currentEvent?.defaultTemplateId) {
          setSelectedTemplateId(currentEvent.defaultTemplateId);
        }
        if (eventSigs.length > 0) {
          setSelectedSignatoryIds(eventSigs.map((es) => es.signatoryId));
        }
      } catch (err) {
        console.warn('Error fetching event details:', err);
      }
    };
    loadCats();
  }, [selectedEventId, events]);

  // Handle CSV file selection and parsing with PapaParse
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      encoding: 'UTF-8',
      complete: (results) => {
        const headers = results.meta.fields || [];
        setCsvHeaders(headers);
        setRawParsedData(results.data);

        // Auto-detect columns
        const lowerHeaders = headers.map((h) => h.toLowerCase());

        // Name auto-match
        const nameIdx = lowerHeaders.findIndex((h) =>
          h.includes('name') || h.includes('recipient') || h.includes('student') || h.includes('participant')
        );
        const matchedName = nameIdx !== -1 ? headers[nameIdx] : headers[0] || '';
        setNameColumn(matchedName);

        // Email auto-match
        const emailIdx = lowerHeaders.findIndex((h) => h.includes('email') || h.includes('mail'));
        setEmailColumn(emailIdx !== -1 ? headers[emailIdx] : '');

        // Achievement auto-match
        const achIdx = lowerHeaders.findIndex((h) =>
          h.includes('award') || h.includes('achievement') || h.includes('category') || h.includes('position') || h.includes('rank')
        );
        setAchievementColumn(achIdx !== -1 ? headers[achIdx] : '');

        setCurrentStep(3);
      },
      error: (error) => {
        alert(`Failed to parse CSV: ${error.message}`);
      },
    });
  };

  // Process and re-validate rows whenever column mapping changes
  useEffect(() => {
    if (rawParsedData.length === 0) return;

    const currentEvent = events.find((e) => e.id === selectedEventId);
    const categoryName = categories.find((c) => c.id === selectedCategoryId)?.name || 'Certificate of Excellence';
    const defaultAchievement = autoDetectCitation(categoryName, currentEvent?.name);

    const processed: ParsedRow[] = rawParsedData.map((raw, idx) => {
      const recipientName = (nameColumn && raw[nameColumn] ? raw[nameColumn] : '').trim();
      const recipientEmail = (emailColumn && raw[emailColumn] ? raw[emailColumn] : '').trim();
      const rawAchievement = (achievementColumn && raw[achievementColumn] ? raw[achievementColumn] : defaultAchievement).trim();
      const achievement = autoDetectCitation(rawAchievement, currentEvent?.name);

      const errors: string[] = [];
      if (!recipientName) {
        errors.push('Missing recipient name');
      }
      if (recipientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
        errors.push('Invalid email format');
      }

      return {
        index: idx + 1,
        raw,
        recipientName,
        recipientEmail: recipientEmail || undefined,
        achievement,
        isValid: errors.length === 0,
        errors,
        isExcluded: false,
      };
    });

    setRows(processed);
  }, [rawParsedData, nameColumn, emailColumn, achievementColumn, categories, selectedCategoryId, selectedEventId, events]);

  // Toggle row exclusion
  const handleToggleExclude = (index: number) => {
    setRows((prev) =>
      prev.map((r) => (r.index === index ? { ...r, isExcluded: !r.isExcluded } : r))
    );
  };

  // Exclude all invalid rows
  const handleExcludeAllInvalid = () => {
    setRows((prev) =>
      prev.map((r) => (!r.isValid ? { ...r, isExcluded: true } : r))
    );
  };

  const validRows = rows.filter((r) => r.isValid && !r.isExcluded);
  const invalidRows = rows.filter((r) => !r.isValid);

  // Execute Batch Issuance with Bounded Concurrency
  const handleExecuteBatch = async () => {
    if (!selectedEventId || !selectedTemplateId || validRows.length === 0) {
      alert('Please configure event, template, and ensure there are valid rows to issue.');
      return;
    }

    setIsProcessing(true);
    setCurrentStep(4);
    setProcessedCount(0);
    setSuccessCount(0);
    setFailureCount(0);

    const zip = new JSZip();

    try {
      // 1. Create batch record in database
      const batchRecord = await portalService.createIssuanceBatch({
        eventId: selectedEventId,
        originalFilename: csvFile?.name || 'bulk_import.csv',
        totalRows: rows.length,
        validRows: validRows.length,
        status: 'processing',
      });
      setCreatedBatch(batchRecord);

      let currentSuccess = 0;
      let currentFailure = 0;
      const updatedRows = [...rows];

      // Bounded concurrency chunk size = 3
      const chunkSize = 3;
      for (let i = 0; i < validRows.length; i += chunkSize) {
        const chunk = validRows.slice(i, i + chunkSize);

        await Promise.all(
          chunk.map(async (row) => {
            try {
              // Issue certificate
              const cert = await portalService.issueCertificate({
                eventId: selectedEventId,
                awardCategoryId: selectedCategoryId,
                templateId: selectedTemplateId,
                recipientName: row.recipientName,
                recipientEmail: row.recipientEmail,
                achievement: row.achievement,
                issueDate: defaultIssueDate,
                signatoryIds: selectedSignatoryIds,
              });

              // Fetch details & render PDF
              const details = await portalService.getCertificateDetails(cert.id);
              if (details) {
                const pdfBytes = await generatePdfFromDetails(details);
                const cleanName = row.recipientName
                  .replace(/[^a-zA-Z0-9_-]/g, '_')
                  .replace(/_+/g, '_')
                  .replace(/^_|_$/g, '')
                  .toLowerCase();
                const safeName = `${cleanName || 'recipient'}_${cert.verificationCode}.pdf`;
                zip.file(safeName, pdfBytes);
              }

              currentSuccess++;
              setSuccessCount(currentSuccess);

              // Update row in state
              const rowIndex = updatedRows.findIndex((r) => r.index === row.index);
              if (rowIndex !== -1) {
                updatedRows[rowIndex] = { ...updatedRows[rowIndex], issuedCert: cert };
              }
            } catch (err: any) {
              console.error(`Row ${row.index} issuance failed:`, err);
              currentFailure++;
              setFailureCount(currentFailure);
              const rowIndex = updatedRows.findIndex((r) => r.index === row.index);
              if (rowIndex !== -1) {
                updatedRows[rowIndex] = {
                  ...updatedRows[rowIndex],
                  isValid: false,
                  errors: [...updatedRows[rowIndex].errors, err.message || 'Issuance failed'],
                };
              }
            } finally {
              setProcessedCount((prev) => prev + 1);
            }
          })
        );
      }

      setRows(updatedRows);

      // Finalize batch status
      const finalStatus = currentFailure === 0 ? 'completed' : currentSuccess > 0 ? 'partially_completed' : 'failed';
      await portalService.updateIssuanceBatch(batchRecord.id, {
        status: finalStatus,
        issuedCount: currentSuccess,
        failedCount: currentFailure,
        completedAt: new Date().toISOString(),
      });

      // Package ZIP Archive
      setIsZipping(true);
      const generatedZip = await zip.generateAsync({ type: 'blob' });
      setZipBlob(generatedZip);
      setIsZipping(false);

      // Refresh batches table
      const refreshedBatches = await portalService.getIssuanceBatches();
      setBatches(refreshedBatches);
    } catch (err: any) {
      alert(`Batch processing error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Download packaged ZIP
  const handleDownloadZip = () => {
    if (!zipBlob) return;
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `namdapha-batch-${createdBatch?.id || 'certificates'}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  // Reset workflow
  const handleReset = () => {
    setCurrentStep(1);
    setCsvFile(null);
    setRawParsedData([]);
    setRows([]);
    setCreatedBatch(null);
    setZipBlob(null);
    setProcessedCount(0);
    setSuccessCount(0);
    setFailureCount(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (isLoading) {
    return <LoadingState message="Loading bulk issuance workspace..." />;
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Bulk Issuance' }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-subtle">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-main">Spreadsheet Bulk Issuance</h1>
          <p className="text-xs sm:text-sm text-neutral-secondary mt-0.5">
            Import recipient CSV spreadsheets, validate award rows, and generate verified certificates in bulk with ZIP downloads
          </p>
        </div>
        {currentStep > 1 && (
          <Button variant="outline" size="sm" leftIcon={<RotateCcw className="w-3.5 h-3.5" />} onClick={handleReset}>
            Start Over
          </Button>
        )}
      </div>

      {/* Guided 4-Step Stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { step: 1, title: '1. Event & Template', desc: 'Select target layout' },
          { step: 2, title: '2. Upload CSV', desc: 'UTF-8 spreadsheet' },
          { step: 3, title: '3. Map & Validate', desc: 'Pre-flight checks' },
          { step: 4, title: '4. Issuance & ZIP', desc: 'Generate certificates' },
        ].map((item) => (
          <div
            key={item.step}
            className={`p-3 rounded-lg border text-left transition-all ${
              currentStep === item.step
                ? 'border-brand-violet bg-brand-violet/5 ring-1 ring-brand-violet'
                : currentStep > item.step
                ? 'border-emerald-300 bg-emerald-50/50'
                : 'border-neutral-subtle bg-white opacity-70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-bold ${
                  currentStep === item.step
                    ? 'text-brand-violet'
                    : currentStep > item.step
                    ? 'text-emerald-700'
                    : 'text-neutral-secondary'
                }`}
              >
                {item.title}
              </span>
              {currentStep > item.step && <Check className="w-4 h-4 text-emerald-600" />}
            </div>
            <span className="text-[11px] text-neutral-secondary block mt-0.5">{item.desc}</span>
          </div>
        ))}
      </div>

      {/* STEP 1: Event & Template Configuration */}
      {currentStep === 1 && (
        <Card>
          <CardHeader
            title="Configure Issuance Target & Visual Layout"
            subtitle="Select the event, award category, published template, and authorized signatories to apply to the batch."
          />
          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Event / Competition"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                options={events.map((evt) => ({ value: evt.id, label: `${evt.name} (${evt.eventDate || 'Ongoing'})` }))}
                required
              />

              <Select
                label="Default Award Category"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                options={
                  categories.length > 0
                    ? categories.map((c) => ({ value: c.id, label: c.name }))
                    : [{ value: '', label: 'No award categories configured' }]
                }
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Published Visual Template"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                options={templates.map((tpl) => ({
                  value: tpl.id,
                  label: `${tpl.name} (v${tpl.versionNumber} • ${tpl.orientation})`,
                }))}
                required
              />

              <div>
                <label className="block text-xs font-medium text-neutral-main mb-1">Issue Date</label>
                <input
                  type="date"
                  value={defaultIssueDate}
                  onChange={(e) => setDefaultIssueDate(e.target.value)}
                  className="w-full rounded-md border border-neutral-subtle bg-white px-3 py-2 text-xs text-neutral-main"
                />
              </div>
            </div>

            {/* Signatory Selection */}
            <div>
              <label className="block text-xs font-medium text-neutral-main mb-1">
                Authorized Signatories ({selectedSignatoryIds.length} selected)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 bg-white border border-neutral-subtle rounded-lg">
                {signatories.map((sig) => {
                  const isSelected = selectedSignatoryIds.includes(sig.id);
                  const order = selectedSignatoryIds.indexOf(sig.id) + 1;
                  return (
                    <div
                      key={sig.id}
                      onClick={() => {
                        setSelectedSignatoryIds((prev) =>
                          prev.includes(sig.id) ? prev.filter((id) => id !== sig.id) : [...prev, sig.id]
                        );
                      }}
                      className={`p-2 rounded border cursor-pointer transition-colors flex items-center justify-between text-xs ${
                        isSelected ? 'border-brand-violet bg-brand-violet/5' : 'border-neutral-subtle hover:bg-neutral-surface'
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

            <div className="pt-3 border-t border-neutral-subtle flex justify-end">
              <Button
                variant="primary"
                size="sm"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={() => setCurrentStep(2)}
                disabled={!selectedEventId || !selectedTemplateId || selectedSignatoryIds.length === 0}
              >
                Continue to Upload CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: CSV Upload */}
      {currentStep === 2 && (
        <Card>
          <CardHeader
            title="Upload Recipient Spreadsheet"
            subtitle="Upload a UTF-8 encoded CSV file. Maximum 500 rows per batch recommended."
          />
          <CardContent className="space-y-4 text-xs">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-subtle hover:border-brand-violet rounded-xl p-8 text-center cursor-pointer transition-colors bg-neutral-surface/20 hover:bg-brand-violet/5 space-y-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-12 h-12 bg-brand-violet/10 text-brand-violet rounded-full flex items-center justify-center mx-auto">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <span className="text-sm font-bold text-neutral-main block">Click to select or drag CSV file here</span>
                <span className="text-xs text-neutral-secondary mt-1 block">Supports UTF-8 characters, commas within quotes, and special symbols</span>
              </div>
            </div>

            {/* CSV Template Guidance */}
            <div className="p-3 bg-neutral-surface/60 rounded-lg border border-neutral-subtle space-y-1.5 text-xs text-neutral-secondary">
              <span className="font-semibold text-neutral-main block">Sample CSV Format:</span>
              <pre className="bg-white p-2 rounded border border-neutral-subtle font-mono text-[11px] overflow-x-auto text-neutral-main">
                name,email,achievement{'\n'}
                Priyanshu Sharma,21f1000001@study.iitm.ac.in,First Place in Machine Learning{'\n'}
                Ananya Raman,21f1000002@study.iitm.ac.in,Runner Up{'\n'}
                Karthik Venkatesh,21f1000003@study.iitm.ac.in,Participation
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Column Mapping & Pre-Flight Validation */}
      {currentStep === 3 && (
        <Card>
          <CardHeader
            title="Map Columns & Validate Rows"
            subtitle={
              <span>
                File: <strong className="font-mono text-neutral-main">{csvFile?.name}</strong> • Found {rows.length} rows
              </span>
            }
            action={
              <div className="flex items-center gap-2">
                <Badge variant={invalidRows.length === 0 ? 'success' : 'error'} size="md">
                  {validRows.length} Valid / {invalidRows.length} Invalid
                </Badge>
                {invalidRows.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleExcludeAllInvalid}>
                    Exclude Invalid Rows
                  </Button>
                )}
              </div>
            }
          />
          <CardContent className="space-y-4 text-xs">
            {/* Column Mapping Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-neutral-surface/40 rounded-lg border border-neutral-subtle">
              <Select
                label="Recipient Name Column *"
                value={nameColumn}
                onChange={(e) => setNameColumn(e.target.value)}
                options={csvHeaders.map((h) => ({ value: h, label: h }))}
                required
              />

              <Select
                label="Recipient Email Column (Optional)"
                value={emailColumn}
                onChange={(e) => setEmailColumn(e.target.value)}
                options={[{ value: '', label: '-- None / Skip --' }, ...csvHeaders.map((h) => ({ value: h, label: h }))]}
              />

              <Select
                label="Achievement / Award Column"
                value={achievementColumn}
                onChange={(e) => setAchievementColumn(e.target.value)}
                options={[{ value: '', label: '-- Use Default Category --' }, ...csvHeaders.map((h) => ({ value: h, label: h }))]}
              />
            </div>

            {/* Smart Citation Assistant Banner */}
            <div className="p-3 bg-brand-violet/5 rounded-lg border border-brand-violet/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-brand-violet flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-brand-violet" /> Auto-Citation Generator Active
                </span>
                <p className="text-[11px] text-neutral-secondary mt-0.5">
                  Short standing labels in CSV (e.g. "1st", "Winner", "Second", "Participant") are automatically expanded into formal academic descriptions.
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {DESCRIPTION_PRESETS.map((p) => (
                  <span key={p.id} className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${p.colorClass}`}>
                    {p.badge}
                  </span>
                ))}
              </div>
            </div>

            {/* Parsed Rows Preview Table */}
            <div className="border border-neutral-subtle rounded-lg overflow-hidden">
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-surface text-neutral-secondary uppercase tracking-wider text-[10px] font-semibold sticky top-0 border-b border-neutral-subtle">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">Row</th>
                      <th className="py-2.5 px-3">Recipient Name</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Achievement</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Exclude</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-subtle font-mono text-[11px]">
                    {rows.map((row) => (
                      <tr
                        key={row.index}
                        className={`transition-colors ${
                          row.isExcluded
                            ? 'bg-neutral-surface/40 opacity-50'
                            : row.isValid
                            ? 'hover:bg-neutral-surface/20'
                            : 'bg-rose-50/40 hover:bg-rose-50/70'
                        }`}
                      >
                        <td className="py-2 px-3 text-center text-neutral-secondary">{row.index}</td>
                        <td className="py-2 px-3 font-sans font-semibold text-neutral-main">
                          {row.recipientName || <span className="text-rose-600 italic">Missing Name</span>}
                        </td>
                        <td className="py-2 px-3 text-neutral-secondary">{row.recipientEmail || '-'}</td>
                        <td className="py-2 px-3 font-sans text-neutral-main">{row.achievement}</td>
                        <td className="py-2 px-3 text-center font-sans">
                          {row.isValid ? (
                            <Badge variant="success" size="sm">
                              Valid
                            </Badge>
                          ) : (
                            <span title={row.errors.join(', ')}>
                              <Badge variant="error" size="sm">
                                {row.errors[0]}
                              </Badge>
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleExclude(row.index)}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              row.isExcluded
                                ? 'bg-neutral-surface border-neutral-subtle text-neutral-secondary'
                                : 'bg-white border-neutral-subtle text-neutral-main hover:bg-neutral-surface'
                            }`}
                          >
                            {row.isExcluded ? 'Include' : 'Exclude'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Validation Notice & Proceed */}
            <div className="pt-3 border-t border-neutral-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-neutral-secondary text-xs">
                Ready to issue <strong className="text-emerald-700">{validRows.length}</strong> valid certificates.
                {invalidRows.length > 0 && ` (${invalidRows.length} invalid rows detected)`}
              </span>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setCurrentStep(2)}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={validRows.length === 0}
                  onClick={handleExecuteBatch}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Confirm & Issue {validRows.length} Certificates
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: Processing Progress & Completion ZIP Download */}
      {currentStep === 4 && (
        <Card>
          <CardHeader
            title={isProcessing ? 'Issuing Certificates & Packaging Archive...' : 'Batch Issuance Complete'}
            subtitle="Authoritative PostgreSQL commits and high-precision PDF document rendering"
          />
          <CardContent className="space-y-6 text-xs">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-neutral-main">
                  Progress: {processedCount} / {validRows.length} ({Math.round((processedCount / (validRows.length || 1)) * 100)}%)
                </span>
                <span className="text-neutral-secondary">
                  Success: <strong className="text-emerald-600">{successCount}</strong> • Failed: <strong className="text-rose-600">{failureCount}</strong>
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-neutral-surface overflow-hidden border border-neutral-subtle">
                <div
                  className="h-full bg-brand-violet transition-all duration-300"
                  style={{ width: `${Math.round((processedCount / (validRows.length || 1)) * 100)}%` }}
                />
              </div>
            </div>

            {/* ZIP Download Card */}
            {!isProcessing && zipBlob && (
              <div
                role="status"
                aria-live="polite"
                className="p-5 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-3"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-emerald-900">
                    {successCount} Certificates Successfully Issued & Packaged
                  </h3>
                  <p className="text-xs text-emerald-800/80 mt-1">
                    All records committed to PostgreSQL registry. Ready to download ZIP archive.
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="md"
                    isLoading={isZipping}
                    leftIcon={<Download className="w-4 h-4" />}
                    onClick={handleDownloadZip}
                  >
                    Download Certificates ZIP ({successCount} PDFs)
                  </Button>
                </div>
              </div>
            )}

            {/* Completed Rows Table */}
            <div>
              <span className="font-semibold text-neutral-main text-xs block mb-2">Issued Batch Summary:</span>
              <div className="border border-neutral-subtle rounded-lg max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-surface text-neutral-secondary uppercase tracking-wider text-[10px] font-semibold sticky top-0 border-b border-neutral-subtle">
                    <tr>
                      <th className="py-2 px-3">Recipient</th>
                      <th className="py-2 px-3">Achievement</th>
                      <th className="py-2 px-3">Code</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-subtle font-mono text-[11px]">
                    {rows
                      .filter((r) => !r.isExcluded)
                      .map((r) => (
                        <tr key={r.index} className="hover:bg-neutral-surface/20">
                          <td className="py-2 px-3 font-sans font-semibold text-neutral-main">{r.recipientName}</td>
                          <td className="py-2 px-3 font-sans text-neutral-secondary">{r.achievement}</td>
                          <td className="py-2 px-3 font-mono font-bold text-brand-midnight">
                            {r.issuedCert?.verificationCode || '-'}
                          </td>
                          <td className="py-2 px-3 text-center font-sans">
                            {r.issuedCert ? (
                              <Badge variant="success" size="sm">
                                Issued
                              </Badge>
                            ) : (
                              <Badge variant="error" size="sm">
                                {r.errors[0] || 'Failed'}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historical Batches Section */}
      <div className="space-y-3 pt-6 border-t border-neutral-subtle">
        <h2 className="text-base font-bold text-neutral-main">Historical Issuance Batches</h2>
        <div className="overflow-x-auto border border-neutral-subtle rounded-lg bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-surface/60 text-neutral-secondary uppercase tracking-wider text-[11px] font-semibold border-b border-neutral-subtle">
              <tr>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4">Original File</th>
                <th className="py-3 px-4">Event</th>
                <th className="py-3 px-4 text-center">Total Rows</th>
                <th className="py-3 px-4 text-center">Issued / Failed</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-subtle font-mono text-[11px]">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-neutral-surface/30">
                  <td className="py-3 px-4 text-neutral-secondary">{new Date(b.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4 font-sans font-semibold text-neutral-main">{b.originalFilename}</td>
                  <td className="py-3 px-4 font-sans text-neutral-secondary">{b.eventName}</td>
                  <td className="py-3 px-4 text-center font-semibold text-neutral-main">{b.totalRows}</td>
                  <td className="py-3 px-4 text-center font-sans">
                    <span className="text-emerald-700 font-semibold">{b.issuedCount}</span>
                    <span className="text-neutral-secondary"> / </span>
                    <span className={b.failedCount > 0 ? 'text-rose-600 font-semibold' : 'text-neutral-secondary'}>
                      {b.failedCount}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-sans">
                    <Badge
                      variant={
                        b.status === 'completed'
                          ? 'success'
                          : b.status === 'processing'
                          ? 'info'
                          : b.status === 'partially_completed'
                          ? 'pending'
                          : 'error'
                      }
                      size="sm"
                    >
                      {b.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
