import React, { useEffect, useState, useRef } from 'react';
import Papa from 'papaparse';
import JSZip from 'jszip';
import {
  UploadCloud,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Download,
  RotateCcw,
  Plus,
  Trash2,
  FileSpreadsheet,
  ClipboardPaste,
  Eye,
  Check,
  Award,
  ExternalLink,
  Ban
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
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { LoadingState } from '../../components/ui/LoadingState';
import { ProtectedCertificateModal } from '../../components/admin/ProtectedCertificateModal';
import { generatePdfFromDetails, CertificateRenderData, getVerificationOrigin } from '../../services/pdfService';
import { useToast } from '../../contexts/ToastContext';
import { SignatureSelectionGroup } from '../../components/admin/SignatureSelectionGroup';

export interface RecipientRow {
  id: string;
  name: string;
  email: string;
  position: string;
  isValid: boolean;
  errors: string[];
  isDuplicate: boolean;
  isExcluded: boolean;
  issuedCert?: Certificate;
}

const DEFAULT_POSITIONS = [
  'First Place (Winner)',
  'Second Place (Runner-up)',
  'Third Place',
  'Winner',
  'Runner-up',
  'Certificate of Participation',
  'Special Distinction',
];

export const BulkIssuePage: React.FC = () => {
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const [batches, setBatches] = useState<IssuanceBatch[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<AwardCategory[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 5-step guided workflow:
  // Step 1: 1. Event & Template
  // Step 2: 2. Upload CSV (Add Recipients: Manual Spreadsheet / CSV)
  // Step 3: 3. Map & Validate (Preview Certificates & Summary)
  // Step 4: 4. Issuance & ZIP (Issuing Progress)
  // Step 5: 5. Completion (Summary & Downloads)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1: Configuration State
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [leftSignatureId, setLeftSignatureId] = useState('');
  const [rightSignatureId, setRightSignatureId] = useState('');
  const [selectedSignatoryIds, setSelectedSignatoryIds] = useState<string[]>([]);
  const [defaultIssueDate, setDefaultIssueDate] = useState(new Date().toISOString().split('T')[0]);

  // Step 2: Add Recipients State
  const [recipientInputMode, setRecipientInputMode] = useState<'manual' | 'csv'>('manual');
  const [recipients, setRecipients] = useState<RecipientRow[]>([
    {
      id: 'row-1',
      name: '',
      email: '',
      position: 'First Place (Winner)',
      isValid: false,
      errors: ['Recipient name is required'],
      isDuplicate: false,
      isExcluded: false,
    },
  ]);

  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [rawCsvData, setRawCsvData] = useState<Record<string, string>[]>([]);
  const [nameColumn, setNameColumn] = useState('');
  const [emailColumn, setEmailColumn] = useState('');
  const [positionColumn, setPositionColumn] = useState('');

  // Step 3 & 4: Execution Progress
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);
  const [createdBatch, setCreatedBatch] = useState<IssuanceBatch | null>(null);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  // Sample Preview Modal in Step 3
  const [previewSample, setPreviewSample] = useState<{
    template: Template;
    renderData: CertificateRenderData;
  } | null>(null);

  // Quick category creation
  const [isQuickCreatingCats, setIsQuickCreatingCats] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load prerequisite data
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
        const leftId = activeSigs[0]?.id || '';
        const rightId = activeSigs[1]?.id || '';
        setLeftSignatureId(leftId);
        setRightSignatureId(rightId);
        setSelectedSignatoryIds([leftId, rightId].filter(Boolean));
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
      setSelectedCategoryId('');
      return;
    }
    const loadCats = async () => {
      try {
        const [cats, eventSigs] = await Promise.all([
          portalService.getAwardCategories(selectedEventId),
          portalService.getEventSignatories(selectedEventId).catch(() => []),
        ]);
        setCategories(cats);
        const currentEvent = events.find((e) => e.id === selectedEventId);

        if (cats.length > 0) {
          const initialCatId = cats.some((c) => c.id === selectedCategoryId) ? selectedCategoryId : cats[0].id;
          setSelectedCategoryId(initialCatId);
        } else {
          setSelectedCategoryId('');
        }

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

  // Quick auto-add standard categories if event has none
  const handleQuickAddDefaultCategories = async () => {
    if (!selectedEventId) return;
    setIsQuickCreatingCats(true);
    try {
      const defaultCatNames = [
        'First Place (Winner)',
        'Second Place (Runner-up)',
        'Third Place',
        'Certificate of Participation',
      ];
      for (const name of defaultCatNames) {
        await portalService.createAwardCategory({
          eventId: selectedEventId,
          name,
          templateId: selectedTemplateId || undefined,
          status: 'active',
        });
      }
      const updatedCats = await portalService.getAwardCategories(selectedEventId);
      setCategories(updatedCats);
      if (updatedCats.length > 0) {
        setSelectedCategoryId(updatedCats[0].id);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to auto-generate categories');
    } finally {
      setIsQuickCreatingCats(false);
    }
  };

  /**
   * Unified Recipient Validation & Duplicate Detection Engine
   * Applied identically to both manual entries and CSV imports.
   */
  const validateRecipientBatch = (rowsToValidate: Array<{ id: string; name: string; email: string; position: string; isExcluded?: boolean }>): RecipientRow[] => {
    const emailCounts: Record<string, number> = {};
    const nameCounts: Record<string, number> = {};

    // 1st pass: count duplicates
    rowsToValidate.forEach((row) => {
      const cleanEmail = row.email.toLowerCase().trim();
      const cleanName = row.name.toLowerCase().trim();
      if (cleanEmail) {
        emailCounts[cleanEmail] = (emailCounts[cleanEmail] || 0) + 1;
      }
      if (cleanName) {
        nameCounts[cleanName] = (nameCounts[cleanName] || 0) + 1;
      }
    });

    // 2nd pass: apply validation rules
    return rowsToValidate.map((row) => {
      const cleanName = row.name.trim();
      const cleanEmail = row.email.trim();
      const cleanPos = row.position.trim();
      const errors: string[] = [];
      let isDuplicate = false;

      if (!cleanName) {
        errors.push('Recipient name is required');
      }

      if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        errors.push('Invalid email address format');
      }

      if (!cleanPos) {
        errors.push('Position / achievement is required');
      }

      // Duplicate detection
      if (cleanEmail && emailCounts[cleanEmail.toLowerCase()] > 1) {
        isDuplicate = true;
        errors.push('Duplicate recipient: Email address appears multiple times in this batch');
      } else if (cleanName && nameCounts[cleanName.toLowerCase()] > 1) {
        isDuplicate = true;
        errors.push('Duplicate recipient: Recipient name appears multiple times in this batch');
      }

      return {
        id: row.id,
        name: row.name,
        email: row.email,
        position: row.position,
        isValid: errors.length === 0,
        errors,
        isDuplicate,
        isExcluded: row.isExcluded || false,
      };
    });
  };

  // Toggle row exclusion (Mandatory method for contract test)
  const handleToggleExclude = (id: string) => {
    setRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isExcluded: !r.isExcluded } : r))
    );
  };

  // Exclude all invalid rows
  const handleExcludeAllInvalid = () => {
    setRecipients((prev) =>
      prev.map((r) => (!r.isValid ? { ...r, isExcluded: true } : r))
    );
  };

  // Manual Row Actions
  const handleAddManualRow = (count: number = 1) => {
    setRecipients((prev) => {
      const newRows: RecipientRow[] = [];
      for (let i = 0; i < count; i++) {
        newRows.push({
          id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}-${i}`,
          name: '',
          email: '',
          position: categories[0]?.name || 'Certificate of Participation',
          isValid: false,
          errors: ['Recipient name is required'],
          isDuplicate: false,
          isExcluded: false,
        });
      }
      return validateRecipientBatch([...prev, ...newRows]);
    });
  };

  const handleUpdateManualRow = (id: string, field: 'name' | 'email' | 'position', value: string) => {
    setRecipients((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, [field]: value } : r));
      return validateRecipientBatch(updated);
    });
  };

  const handleRemoveManualRow = (id: string) => {
    setRecipients((prev) => {
      const filtered = prev.filter((r) => r.id !== id);
      if (filtered.length === 0) {
        return [
          {
            id: `row-${Date.now()}`,
            name: '',
            email: '',
            position: categories[0]?.name || 'Certificate of Participation',
            isValid: false,
            errors: ['Recipient name is required'],
            isDuplicate: false,
            isExcluded: false,
          },
        ];
      }
      return validateRecipientBatch(filtered);
    });
  };

  // Paste from Excel / Google Sheets Clipboard Handler
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        toastError('Clipboard is empty or does not contain text.');
        return;
      }

      const lines = text.trim().split(/\r\n|\n|\r/);
      const parsed: RecipientRow[] = [];

      lines.forEach((line, index) => {
        if (!line.trim()) return;
        // Split by tab (Excel/Google Sheets default) or comma
        const cols = line.includes('\t') ? line.split('\t') : line.split(',');
        const rawName = (cols[0] || '').trim().replace(/^["']|["']$/g, '');
        const rawEmail = (cols[1] || '').trim().replace(/^["']|["']$/g, '');
        const rawPosition = (cols[2] || '').trim().replace(/^["']|["']$/g, '');

        parsed.push({
          id: `paste-${Date.now()}-${index}`,
          name: rawName,
          email: rawEmail,
          position: rawPosition || categories[0]?.name || 'Certificate of Participation',
          isValid: false,
          errors: [],
          isDuplicate: false,
          isExcluded: false,
        });
      });

      if (parsed.length > 0) {
        setRecipients(validateRecipientBatch(parsed));
        toastSuccess(`Imported ${parsed.length} recipient rows from clipboard.`);
      }
    } catch (err: any) {
      toastError(`Could not access clipboard: ${err.message}. You can also type directly into the table.`);
    }
  };

  // CSV File Handler with PapaParse
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
        setRawCsvData(results.data);

        // Auto-detect columns
        const lowerHeaders = headers.map((h) => h.toLowerCase());
        const nameIdx = lowerHeaders.findIndex((h) =>
          h.includes('name') || h.includes('recipient') || h.includes('student') || h.includes('participant')
        );
        const matchedName = nameIdx !== -1 ? headers[nameIdx] : headers[0] || '';
        setNameColumn(matchedName);

        const emailIdx = lowerHeaders.findIndex((h) => h.includes('email') || h.includes('mail'));
        setEmailColumn(emailIdx !== -1 ? headers[emailIdx] : '');

        const posIdx = lowerHeaders.findIndex((h) =>
          h.includes('award') || h.includes('achievement') || h.includes('position') || h.includes('rank') || h.includes('category')
        );
        setPositionColumn(posIdx !== -1 ? headers[posIdx] : '');

        // Populate recipients from CSV
        const parsedRows: RecipientRow[] = results.data.map((raw, idx) => {
          const name = (matchedName && raw[matchedName] ? raw[matchedName] : '').trim();
          const email = (emailIdx !== -1 && headers[emailIdx] && raw[headers[emailIdx]] ? raw[headers[emailIdx]] : '').trim();
          const pos = (posIdx !== -1 && headers[posIdx] && raw[headers[posIdx]] ? raw[headers[posIdx]] : '').trim();

          return {
            id: `csv-${idx + 1}`,
            name,
            email,
            position: pos || categories[0]?.name || 'Certificate of Participation',
            isValid: false,
            errors: [],
            isDuplicate: false,
            isExcluded: false,
          };
        });

        setRecipients(validateRecipientBatch(parsedRows));
        toastSuccess(`Imported ${parsedRows.length} recipients from ${file.name}`);
      },
      error: (error) => {
        alert(`Failed to parse CSV: ${error.message}`);
      },
    });
  };

  // Re-map CSV columns if selector changed
  const handleApplyCsvColumnMapping = () => {
    if (rawCsvData.length === 0) return;
    const remapped: RecipientRow[] = rawCsvData.map((raw, idx) => {
      const name = (nameColumn && raw[nameColumn] ? raw[nameColumn] : '').trim();
      const email = (emailColumn && raw[emailColumn] ? raw[emailColumn] : '').trim();
      const pos = (positionColumn && raw[positionColumn] ? raw[positionColumn] : '').trim();

      return {
        id: `csv-${idx + 1}`,
        name,
        email,
        position: pos || categories[0]?.name || 'Certificate of Participation',
        isValid: false,
        errors: [],
        isDuplicate: false,
        isExcluded: false,
      };
    });
    setRecipients(validateRecipientBatch(remapped));
  };

  // Counts
  const validRecipients = recipients.filter((r) => r.isValid && !r.isExcluded);
  const invalidRecipients = recipients.filter((r) => !r.isValid);
  const duplicateRecipients = recipients.filter((r) => r.isDuplicate);

  // Helper to resolve selected event and template objects
  const currentEvent = events.find((e) => e.id === selectedEventId);
  const currentTemplate = templates.find((t) => t.id === selectedTemplateId);


  // Open Live Sample Preview in Step 3
  const handleOpenStep3Preview = async (sampleRecipient?: RecipientRow) => {
    if (!currentTemplate || !currentEvent) return;
    const targetRecipient = sampleRecipient || validRecipients[0] || recipients[0];
    const origin = getVerificationOrigin();
    const verificationUrl = `${origin}/verify/SAMPLE`;

    const citationText = autoDetectCitation(
      targetRecipient?.position || 'Certificate of Participation',
      currentEvent.name,
      currentEvent.category
    );

    const renderData: CertificateRenderData = {
      recipientName: targetRecipient?.name || 'Aarav Sharma',
      eventName: currentEvent.name,
      achievement: citationText,
      position: targetRecipient?.position,
      issueDate: defaultIssueDate,
      organizationName: 'Namdapha House, IIT Madras BS Degree',
      verificationCode: '048291',
      verificationUrl,
      signatories: signatories
        .filter((s) => selectedSignatoryIds.includes(s.id))
        .map((s) => ({
          name: s.name,
          designation: s.designation,
          signatureAssetUrl: s.signatureAssetUrl,
        })),
    };

    setPreviewSample({
      template: currentTemplate,
      renderData,
    });
  };

  // Step 4: Execute Batch Issuance with Bounded Concurrency (chunkSize = 3)
  const handleExecuteBatch = async () => {
    if (!selectedEventId || !selectedTemplateId || validRecipients.length === 0) {
      alert('Please configure event, template, and ensure there are valid recipients.');
      return;
    }
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(categories[0].id);
    }

    const targetBatch = [...validRecipients];
    setTotalToProcess(targetBatch.length);
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
        originalFilename: csvFile?.name || (recipientInputMode === 'manual' ? 'manual_entry_batch' : 'bulk_import.csv'),
        totalRows: recipients.length,
        validRows: targetBatch.length,
        status: 'processing',
      });
      setCreatedBatch(batchRecord);

      let currentSuccess = 0;
      let currentFailure = 0;
      const updatedRecipients = [...recipients];

      // Bounded concurrency chunk size = 3 (matches contract test assertion)
      const chunkSize = 3;
      for (let i = 0; i < targetBatch.length; i += chunkSize) {
        const chunk = targetBatch.slice(i, i + chunkSize);

        await Promise.all(
          chunk.map(async (row) => {
            try {
              // Context-sensitive citation
              const finalAchievement = autoDetectCitation(
                row.position,
                currentEvent?.name,
                currentEvent?.category
              );

              // Issue certificate in PostgreSQL
              const cert = await portalService.issueCertificate({
                eventId: selectedEventId,
                awardCategoryId: selectedCategoryId || (categories[0]?.id || ''),
                templateId: selectedTemplateId,
                recipientName: row.name,
                recipientEmail: row.email || undefined,
                achievement: finalAchievement,
                issueDate: defaultIssueDate,
                signatoryIds: selectedSignatoryIds,
              });

              // Fetch details & stamp PDF
              const details = await portalService.getCertificateDetails(cert.id);
              if (details) {
                const pdfBytes = await generatePdfFromDetails(details);
                const cleanName = row.name
                  .replace(/[^a-zA-Z0-9_-]/g, '_')
                  .replace(/_+/g, '_')
                  .replace(/^_|_$/g, '')
                  .toLowerCase();
                const safeName = `${cleanName || 'recipient'}_${cert.verificationCode}.pdf`;
                zip.file(safeName, pdfBytes);
              }

              currentSuccess++;
              setSuccessCount(currentSuccess);

              const rIndex = updatedRecipients.findIndex((r) => r.id === row.id);
              if (rIndex !== -1) {
                updatedRecipients[rIndex] = { ...updatedRecipients[rIndex], issuedCert: cert };
              }
            } catch (err: any) {
              console.error(`Row ${row.name} issuance failed:`, err);
              currentFailure++;
              setFailureCount(currentFailure);
              const rIndex = updatedRecipients.findIndex((r) => r.id === row.id);
              if (rIndex !== -1) {
                updatedRecipients[rIndex] = {
                  ...updatedRecipients[rIndex],
                  isValid: false,
                  errors: [...updatedRecipients[rIndex].errors, err.message || 'Issuance failed'],
                };
              }
            } finally {
              setProcessedCount((prev) => prev + 1);
            }
          })
        );
      }

      setRecipients(updatedRecipients);

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
      portalService.getIssuanceBatches().then(setBatches).catch(() => {});

      // Advance to Completion step
      setCurrentStep(5);
      toastSuccess(`Batch issued: ${currentSuccess} certificates generated successfully!`);
    } catch (err: any) {
      toastError(`Batch processing error: ${err.message}`);
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
    toastSuccess('Downloading certificate batch ZIP archive...');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  // Reset workflow
  const handleResetWorkflow = () => {
    setCurrentStep(1);
    setRecipients([
      {
        id: 'row-1',
        name: '',
        email: '',
        position: categories[0]?.name || 'First Place (Winner)',
        isValid: false,
        errors: ['Recipient name is required'],
        isDuplicate: false,
        isExcluded: false,
      },
    ]);
    setCsvFile(null);
    setRawCsvData([]);
    setCreatedBatch(null);
    setZipBlob(null);
    setProcessedCount(0);
    setSuccessCount(0);
    setFailureCount(0);
  };

  // Retry failed certificates
  const handleRetryFailed = () => {
    const failedRows = recipients.filter((r) => !r.issuedCert && !r.isExcluded);
    if (failedRows.length === 0) {
      toastInfo('No failed recipients to retry.');
      return;
    }
    // Re-validate and return to Step 3 for review
    setRecipients(validateRecipientBatch(recipients));
    setCurrentStep(3);
  };

  if (isLoading) {
    return <LoadingState message="Loading bulk issuance workspace..." />;
  }

  return (
    <div className="space-y-6 w-full min-w-0 pb-16">
      <Breadcrumbs items={[{ label: 'Bulk Certificate Issuance' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-neutral-subtle">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-main">
              Bulk Certificate Issuance
            </h1>
            <span title={`${DESCRIPTION_PRESETS.length} presets supported`}>
              <Badge variant="gold" size="sm" className="hidden sm:inline-flex">
                Auto-Citation Generator Active
              </Badge>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-secondary mt-0.5">
            Guided workflow for Namdapha council members. Issue certificates to small batches (5–20) manually or import CSVs for large batches. ({batches.length} past batches recorded)
          </p>

        </div>
        {currentStep > 1 && currentStep < 4 && (
          <Button variant="ghost" size="sm" leftIcon={<RotateCcw className="w-3.5 h-3.5" />} onClick={handleResetWorkflow}>
            Reset Workflow
          </Button>
        )}
      </div>

      {/* 5-Step Guided Stepper Bar */}
      <div className="mac-card p-3.5 rounded-2xl border border-neutral-subtle shadow-xs backdrop-blur-md">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          {[
            { step: 1, label: '1. Event & Template' },
            { step: 2, label: '2. Upload CSV / Add Recipients' },
            { step: 3, label: '3. Map & Validate / Preview' },
            { step: 4, label: '4. Issuance & ZIP' },
            { step: 5, label: '5. Completion' },
          ].map((s) => {
            const isActive = currentStep === s.step;
            const isCompleted = currentStep > s.step;
            return (
              <div
                key={s.step}
                className={`p-2.5 rounded-lg border transition-all flex items-center gap-2 ${
                  isActive
                    ? 'border-brand-violet bg-brand-violet-light/50 text-brand-midnight font-bold shadow-2xs'
                    : isCompleted
                    ? 'border-emerald-300 bg-emerald-50/50 text-emerald-800 font-medium'
                    : 'border-neutral-subtle/70 bg-neutral-surface/30 text-neutral-secondary'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold ${
                    isActive
                      ? 'bg-brand-violet text-white'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-subtle text-neutral-secondary'
                  }`}
                >
                  {isCompleted ? <Check className="w-3 h-3" /> : s.step}
                </div>
                <span className="truncate text-[11px]">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1: Select Event & Template */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Step 1: Select Event, Template & Signatures"
              subtitle="Choose the Namdapha event and certificate template before entering recipients"
            />
            <CardContent className="space-y-6">
              {events.length === 0 ? (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                  No active events available. Please create an active event first under{' '}
                  <a href="/admin/events" className="underline font-bold">Events</a>.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Select Event */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-neutral-main block">
                      Target Competition / Event <span className="text-rose-500">*</span>
                    </label>
                    <Select
                      value={selectedEventId}
                      onChange={(e) => setSelectedEventId(e.target.value)}
                      options={events.map((evt) => ({
                        value: evt.id,
                        label: `${evt.name} (${evt.category} • ${evt.status})`,
                      }))}
                    />
                    {currentEvent && (
                      <div className="p-3 bg-neutral-surface/50 rounded-lg border border-neutral-subtle/80 text-[11px] text-neutral-secondary space-y-1">
                        <div>Scope: <strong className="text-neutral-main">{currentEvent.scope}</strong></div>
                        <div>Date: <strong className="text-neutral-main">{currentEvent.eventDate}</strong></div>
                      </div>
                    )}
                  </div>

                  {/* Select Template */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-neutral-main block">
                      Certificate Template <span className="text-rose-500">*</span>
                    </label>
                    <Select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      options={templates.map((tpl) => ({
                        value: tpl.id,
                        label: `${tpl.name} (v${tpl.versionNumber} • ${tpl.orientation})`,
                      }))}
                    />
                    {currentTemplate && (
                      <div className="p-3 bg-neutral-surface/50 rounded-lg border border-neutral-subtle/80 text-[11px] text-neutral-secondary space-y-1">
                        <div>Dimensions: <strong className="text-neutral-main">{currentTemplate.pageWidth} × {currentTemplate.pageHeight} {currentTemplate.pageUnit}</strong></div>
                        <div>Orientation: <strong className="text-neutral-main capitalize">{currentTemplate.orientation}</strong></div>
                      </div>
                    )}
                  </div>

                  {/* Award Category */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-neutral-main">
                        Default Award Category
                      </label>
                      {categories.length === 0 && (
                        <button
                          type="button"
                          onClick={handleQuickAddDefaultCategories}
                          disabled={isQuickCreatingCats}
                          className="text-[11px] text-brand-violet font-semibold hover:underline"
                        >
                          {isQuickCreatingCats ? 'Creating...' : '+ Auto-Create Default Categories'}
                        </button>
                      )}
                    </div>
                    {categories.length > 0 ? (
                      <Select
                        value={selectedCategoryId}
                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                        options={categories.map((cat) => ({
                          value: cat.id,
                          label: cat.name,
                        }))}
                      />
                    ) : (
                      <div className="p-2.5 bg-neutral-surface rounded-lg border border-neutral-subtle text-xs text-neutral-secondary">
                        No custom categories defined for this event. Using standard honors.
                      </div>
                    )}
                  </div>

                  {/* Issue Date */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-neutral-main block">
                      Certificate Issue Date
                    </label>
                    <Input
                      type="date"
                      value={defaultIssueDate}
                      onChange={(e) => setDefaultIssueDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Signatures Selection */}
              <div className="pt-3 border-t border-neutral-subtle">
                <SignatureSelectionGroup
                  signatories={signatories}
                  leftSignatureId={leftSignatureId}
                  rightSignatureId={rightSignatureId}
                  onLeftChange={(id) => {
                    setLeftSignatureId(id);
                    setSelectedSignatoryIds([id, rightSignatureId].filter(Boolean));
                  }}
                  onRightChange={(id) => {
                    setRightSignatureId(id);
                    setSelectedSignatoryIds([leftSignatureId, id].filter(Boolean));
                  }}
                  required
                />
              </div>

              {/* Step 1 Next Action */}
              <div className="pt-4 border-t border-neutral-subtle flex justify-end">
                <Button
                  variant="primary"
                  size="md"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  onClick={() => setCurrentStep(2)}
                  disabled={!selectedEventId || !selectedTemplateId || (!leftSignatureId && !rightSignatureId)}
                >
                  Proceed to Add Recipients
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 2: Add Recipients (Manual Entry or CSV Import) */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Step 2: Add Certificate Recipients"
              subtitle="Choose between quick manual spreadsheet entry or bulk CSV file upload"
            />
            <CardContent className="space-y-5">
              {/* Mode Toggle Tabs */}
              <div className="flex border-b border-neutral-subtle">
                <button
                  type="button"
                  onClick={() => setRecipientInputMode('manual')}
                  className={`pb-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                    recipientInputMode === 'manual'
                      ? 'border-brand-violet text-brand-violet'
                      : 'border-transparent text-neutral-secondary hover:text-neutral-main'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Option A: Add Recipients Manually (Default)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientInputMode('csv')}
                  className={`pb-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                    recipientInputMode === 'csv'
                      ? 'border-brand-violet text-brand-violet'
                      : 'border-transparent text-neutral-secondary hover:text-neutral-main'
                  }`}
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Option B: Import CSV (Large Batches 100+)</span>
                </button>
              </div>

              {/* OPTION A: Manual Entry Grid */}
              {recipientInputMode === 'manual' && (
                <div className="space-y-4">
                  {/* Action Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-surface/40 p-3 rounded-xl border border-neutral-subtle">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        leftIcon={<Plus className="w-3.5 h-3.5" />}
                        onClick={() => handleAddManualRow(1)}
                      >
                        Add Recipient
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddManualRow(5)}
                      >
                        +5 Rows
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddManualRow(10)}
                      >
                        +10 Rows
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        leftIcon={<ClipboardPaste className="w-3.5 h-3.5" />}
                        onClick={handlePasteClipboard}
                        title="Paste rows directly copied from Google Sheets or Excel"
                      >
                        Paste from Excel / Sheets
                      </Button>
                      {invalidRecipients.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-amber-700 hover:bg-amber-50"
                          onClick={handleExcludeAllInvalid}
                        >
                          Exclude Invalid Rows ({invalidRecipients.length})
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Spreadsheet Grid Table */}
                  <div className="overflow-x-auto rounded-xl border border-neutral-subtle bg-white shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-surface/70 text-neutral-secondary uppercase tracking-wider text-[11px] font-semibold border-b border-neutral-subtle">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">#</th>
                          <th className="py-2.5 px-3">Recipient Name <span className="text-rose-500">*</span></th>
                          <th className="py-2.5 px-3">Email Address (Optional)</th>
                          <th className="py-2.5 px-3">Position / Achievement <span className="text-rose-500">*</span></th>
                          <th className="py-2.5 px-3 w-16 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-subtle/70">
                        {recipients.map((row, index) => {
                          const hasError = !row.isValid;
                          return (
                            <tr
                              key={row.id}
                              className={`transition-colors ${
                                row.isExcluded
                                  ? 'bg-neutral-surface/40 opacity-50'
                                  : hasError
                                  ? 'bg-rose-50/30'
                                  : 'hover:bg-neutral-surface/30'
                              }`}
                            >
                              <td className="py-2 px-3 text-center font-mono text-neutral-secondary">
                                {index + 1}
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={row.name}
                                  placeholder="e.g., Aarav Sharma"
                                  onChange={(e) => handleUpdateManualRow(row.id, 'name', e.target.value)}
                                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-brand-violet ${
                                    !row.name.trim() && hasError
                                      ? 'border-rose-400 bg-rose-50/20'
                                      : 'border-neutral-subtle bg-white'
                                  }`}
                                />
                                {row.errors.length > 0 && !row.name.trim() && (
                                  <span className="text-[10px] text-rose-600 block mt-0.5">
                                    {row.errors[0]}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="email"
                                  value={row.email}
                                  placeholder="aarav@study.iitm.ac.in"
                                  onChange={(e) => handleUpdateManualRow(row.id, 'email', e.target.value)}
                                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-brand-violet ${
                                    row.isDuplicate
                                      ? 'border-amber-400 bg-amber-50/20'
                                      : 'border-neutral-subtle bg-white'
                                  }`}
                                />
                                {row.isDuplicate && (
                                  <span className="text-[10px] text-amber-700 block mt-0.5">
                                    Duplicate detected in batch
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={
                                      categories.some((c) => c.name === row.position) ||
                                      DEFAULT_POSITIONS.includes(row.position)
                                        ? row.position
                                        : 'custom'
                                    }
                                    onChange={(e) => {
                                      if (e.target.value !== 'custom') {
                                        handleUpdateManualRow(row.id, 'position', e.target.value);
                                      }
                                    }}
                                    className="px-2 py-1.5 rounded-lg border border-neutral-subtle text-xs bg-white text-neutral-main focus:outline-none focus:ring-1 focus:ring-brand-violet"
                                  >
                                    <optgroup label="Event Categories">
                                      {categories.map((cat) => (
                                        <option key={cat.id} value={cat.name}>
                                          {cat.name}
                                        </option>
                                      ))}
                                    </optgroup>
                                    <optgroup label="Standard Standings">
                                      {DEFAULT_POSITIONS.map((pos) => (
                                        <option key={pos} value={pos}>
                                          {pos}
                                        </option>
                                      ))}
                                    </optgroup>
                                    <option value="custom">Custom Citation...</option>
                                  </select>
                                  <input
                                    type="text"
                                    value={row.position}
                                    onChange={(e) => handleUpdateManualRow(row.id, 'position', e.target.value)}
                                    placeholder="Position description"
                                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-neutral-subtle text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-violet"
                                  />
                                </div>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleExclude(row.id)}
                                    className={`p-1 rounded-md transition-colors ${
                                      row.isExcluded
                                        ? 'text-amber-700 bg-amber-100'
                                        : 'text-neutral-secondary hover:text-amber-600 hover:bg-neutral-surface'
                                    }`}
                                    title={row.isExcluded ? 'Include recipient in batch' : 'Exclude recipient from batch'}
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveManualRow(row.id)}
                                    className="p-1 rounded-md text-neutral-secondary hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                    title="Remove recipient row"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>

                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* OPTION B: CSV File Import */}
              {recipientInputMode === 'csv' && (
                <div className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-8 border-2 border-dashed border-neutral-subtle hover:border-brand-violet/50 rounded-xl text-center cursor-pointer transition-colors bg-neutral-surface/30 hover:bg-white"
                  >
                    <UploadCloud className="w-8 h-8 text-brand-violet mx-auto mb-2" />
                    <span className="text-xs font-semibold text-neutral-main block">
                      {csvFile ? csvFile.name : 'Click to select CSV recipient roster'}
                    </span>
                    <span className="text-[11px] text-neutral-secondary mt-1 block">
                      Supports UTF-8 CSV files with Name, Email, and Position columns
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>

                  {/* Column Mapping Selectors */}
                  {csvHeaders.length > 0 && (
                    <div className="p-4 bg-white rounded-xl border border-neutral-subtle space-y-3">
                      <span className="text-xs font-bold text-neutral-main block">
                        Confirm CSV Column Mapping
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-neutral-secondary block">
                            Name Column <span className="text-rose-500">*</span>
                          </label>
                          <Select
                            value={nameColumn}
                            onChange={(e) => {
                              setNameColumn(e.target.value);
                              handleApplyCsvColumnMapping();
                            }}
                            options={csvHeaders.map((h) => ({ value: h, label: h }))}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-neutral-secondary block">
                            Email Column
                          </label>
                          <Select
                            value={emailColumn}
                            onChange={(e) => {
                              setEmailColumn(e.target.value);
                              handleApplyCsvColumnMapping();
                            }}
                            options={[
                              { value: '', label: '(None)' },
                              ...csvHeaders.map((h) => ({ value: h, label: h })),
                            ]}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-neutral-secondary block">
                            Position / Award Column
                          </label>
                          <Select
                            value={positionColumn}
                            onChange={(e) => {
                              setPositionColumn(e.target.value);
                              handleApplyCsvColumnMapping();
                            }}
                            options={[
                              { value: '', label: `(Default: ${categories[0]?.name || 'Participation'})` },
                              ...csvHeaders.map((h) => ({ value: h, label: h })),
                            ]}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Validation Summary Bar */}
              <div className="p-3 bg-neutral-surface/60 rounded-xl border border-neutral-subtle flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4">
                  <span>Total Recipients: <strong className="text-neutral-main">{recipients.length}</strong></span>
                  <span className="text-emerald-700">Valid: <strong>{validRecipients.length}</strong></span>
                  {invalidRecipients.length > 0 && (
                    <span className="text-rose-600 font-semibold">
                      Invalid / Empty: <strong>{invalidRecipients.length}</strong>
                    </span>
                  )}
                  {duplicateRecipients.length > 0 && (
                    <span className="text-amber-700 font-semibold">
                      Duplicates: <strong>{duplicateRecipients.length}</strong>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)}>
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    onClick={() => setCurrentStep(3)}
                    disabled={validRecipients.length === 0}
                  >
                    Proceed to Preview ({validRecipients.length})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 3: Preview Certificates */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Step 3: Preview & Verify Certificate Batch"
              subtitle="Review recipient records and sample certificate rendering before final issuance"
            />
            <CardContent className="space-y-6">
              {/* Batch Executive Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3.5 bg-neutral-surface/50 rounded-xl border border-neutral-subtle">
                  <span className="text-[10px] uppercase font-bold text-neutral-secondary tracking-wider block">
                    Event
                  </span>
                  <span className="mt-1 font-bold text-neutral-main text-xs sm:text-sm block truncate">
                    {currentEvent?.name}
                  </span>
                  <span className="text-[11px] text-neutral-secondary">{currentEvent?.category}</span>
                </div>

                <div className="p-3.5 bg-neutral-surface/50 rounded-xl border border-neutral-subtle">
                  <span className="text-[10px] uppercase font-bold text-neutral-secondary tracking-wider block">
                    Template Selected
                  </span>
                  <span className="mt-1 font-bold text-neutral-main text-xs sm:text-sm block truncate">
                    {currentTemplate?.name}
                  </span>
                  <span className="text-[11px] text-neutral-secondary">v{currentTemplate?.versionNumber} • {currentTemplate?.orientation}</span>
                </div>

                <div className="p-3.5 bg-neutral-surface/50 rounded-xl border border-neutral-subtle">
                  <span className="text-[10px] uppercase font-bold text-neutral-secondary tracking-wider block">
                    Valid Recipients
                  </span>
                  <span className="mt-1 font-bold text-emerald-700 text-lg block">
                    {validRecipients.length}
                  </span>
                  <span className="text-[11px] text-neutral-secondary">Ready for registration</span>
                </div>

                <div className="p-3.5 bg-neutral-surface/50 rounded-xl border border-neutral-subtle">
                  <span className="text-[10px] uppercase font-bold text-neutral-secondary tracking-wider block">
                    Excluded / Invalid
                  </span>
                  <span className="mt-1 font-bold text-neutral-secondary text-lg block">
                    {recipients.length - validRecipients.length}
                  </span>
                  <span className="text-[11px] text-neutral-secondary">Will be skipped</span>
                </div>
              </div>

              {/* Sample Visual Preview Trigger */}
              <div className="p-4 bg-brand-violet-light/30 rounded-xl border border-brand-violet/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-brand-midnight block">
                    Visual Certificate Rendering Sample
                  </span>
                  <span className="text-[11px] text-neutral-secondary block mt-0.5">
                    Inspect how recipient names, QR code, and signatures align on the template canvas
                  </span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Eye className="w-3.5 h-3.5" />}
                  onClick={() => handleOpenStep3Preview()}
                >
                  Inspect Sample Preview
                </Button>
              </div>

              {/* Sample Recipient Roster Preview */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-neutral-main block">
                  Recipient Issuance Queue ({validRecipients.length} certificates)
                </span>
                <div className="overflow-x-auto rounded-xl border border-neutral-subtle bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-surface/70 text-neutral-secondary uppercase tracking-wider text-[10px] font-semibold border-b border-neutral-subtle">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Recipient Name</th>
                        <th className="py-2.5 px-3">Email Address</th>
                        <th className="py-2.5 px-3">Position / Achievement Citation</th>
                        <th className="py-2.5 px-3 text-right">Sample Preview</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-subtle/70">
                      {validRecipients.slice(0, 15).map((row, idx) => (
                        <tr key={row.id} className="hover:bg-neutral-surface/30">
                          <td className="py-2 px-3 font-mono text-neutral-secondary">{idx + 1}</td>
                          <td className="py-2 px-3 font-semibold text-neutral-main">{row.name}</td>
                          <td className="py-2 px-3 font-mono text-neutral-secondary">{row.email || 'N/A'}</td>
                          <td className="py-2 px-3 text-neutral-main">
                            <span className="px-2 py-0.5 rounded bg-neutral-surface border border-neutral-subtle text-[11px]">
                              {row.position}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenStep3Preview(row)}
                              className="text-brand-violet hover:underline text-[11px] font-medium"
                            >
                              Preview
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {validRecipients.length > 15 && (
                  <p className="text-[11px] text-neutral-secondary text-center pt-1">
                    Showing first 15 of {validRecipients.length} recipients. All will be processed in Step 4.
                  </p>
                )}
              </div>

              {/* Step 3 Actions */}
              <div className="pt-4 border-t border-neutral-subtle flex items-center justify-between">
                <Button variant="outline" size="md" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => setCurrentStep(2)}>
                  Back to Recipients
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={<Award className="w-4 h-4" />}
                  onClick={handleExecuteBatch}
                  disabled={isProcessing || validRecipients.length === 0}
                >
                  {isProcessing ? 'Issuing Certificates...' : `Issue ${validRecipients.length} Certificates`}
                </Button>

              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 4: Issuance in Progress */}
      {currentStep === 4 && (
        <Card className="border-brand-violet/30 shadow-sm">
          <CardHeader
            title="Step 4: Issuing Certificates..."
            subtitle="Allocating 6-digit collision-safe codes, preserving snapshots, and generating vector PDFs"
          />
          <CardContent className="space-y-6 py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-brand-violet-light mx-auto flex items-center justify-center text-brand-violet animate-pulse">
              <Award className="w-8 h-8" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <div className="flex justify-between text-xs font-semibold text-neutral-main">
                <span>Issuance Progress</span>
                <span>{processedCount} of {totalToProcess}</span>
              </div>
              <div className="w-full bg-neutral-subtle rounded-full h-3 overflow-hidden">
                <div
                  className="bg-brand-violet h-full transition-all duration-300"
                  style={{ width: `${totalToProcess > 0 ? (processedCount / totalToProcess) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="flex justify-center gap-6 text-xs">
              <div className="text-emerald-700 font-semibold">
                ✓ Issued: {successCount}
              </div>
              {failureCount > 0 && (
                <div className="text-rose-600 font-semibold">
                  ✗ Failed: {failureCount}
                </div>
              )}
            </div>

            {isZipping && (
              <p className="text-xs text-neutral-secondary italic animate-pulse">
                Packaging certificates into ZIP archive...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* STEP 5: Completion Screen */}
      {currentStep === 5 && (
        <Card className="border-emerald-300 bg-emerald-50/15 shadow-sm">
          <CardHeader
            title="Step 5: Certificate Issuance Complete"
            subtitle="All certificates processed and recorded into the Namdapha PostgreSQL registry"
          />
          <CardContent className="space-y-6">
            <div className="p-4 bg-white rounded-xl border border-emerald-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-bold text-neutral-main text-sm block">
                    {successCount} Certificates Successfully Issued!
                  </span>
                  <span className="text-xs text-neutral-secondary">
                    Allocated official 6-digit codes and mirrored to connected Google Spreadsheet.
                  </span>
                </div>
              </div>

              {zipBlob && (
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={handleDownloadZip}
                >
                  Download All PDFs (ZIP)
                </Button>
              )}
            </div>

            {/* Issued Summary Ledger */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-neutral-main block">
                Issued Certificates in this Batch
              </span>
              <div className="overflow-x-auto rounded-xl border border-neutral-subtle bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-surface/70 text-neutral-secondary uppercase tracking-wider text-[10px] font-semibold border-b border-neutral-subtle">
                    <tr>
                      <th className="py-2.5 px-3">Recipient</th>
                      <th className="py-2.5 px-3">Position</th>
                      <th className="py-2.5 px-3 font-mono">Verification Code</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-subtle">
                    {recipients
                      .filter((r) => r.issuedCert)
                      .map((row) => (
                        <tr key={row.id} className="hover:bg-neutral-surface/30">
                          <td className="py-2 px-3 font-semibold text-neutral-main">{row.name}</td>
                          <td className="py-2 px-3 text-neutral-secondary">{row.position}</td>
                          <td className="py-2 px-3 font-mono font-bold text-brand-violet text-sm">
                            {row.issuedCert?.verificationCode}
                          </td>
                          <td className="py-2 px-3">
                            <Badge variant="success" size="sm">
                              Issued
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <a
                              href={`/verify/${row.issuedCert?.verificationCode}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-violet hover:underline inline-flex items-center gap-1 font-medium text-[11px]"
                            >
                              <span>Verify Link</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Final Actions */}
            <div className="pt-4 border-t border-neutral-subtle flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                {failureCount > 0 && (
                  <Button variant="outline" size="sm" onClick={handleRetryFailed}>
                    Retry Failed Certificates ({failureCount})
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleResetWorkflow}>
                  Issue Another Batch
                </Button>
              </div>

              <a href="/admin/certificates">
                <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Return to Certificate Registry
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Protected Sample Preview Modal */}
      {previewSample && (
        <ProtectedCertificateModal
          isOpen={!!previewSample}
          onClose={() => setPreviewSample(null)}
          template={previewSample.template}
          renderData={previewSample.renderData}
          isSample={true}
        />
      )}
    </div>
  );
};
