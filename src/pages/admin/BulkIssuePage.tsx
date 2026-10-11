import React, { useEffect, useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  Download
} from 'lucide-react';
import { portalService } from '../../services';
import { IssuanceBatch, Event } from '../../types';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { LoadingState } from '../../components/ui/LoadingState';

export const BulkIssuePage: React.FC = () => {
  const [batches, setBatches] = useState<IssuanceBatch[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Workflow Simulation State
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Simulated parsed CSV rows
  const simulatedRows = [
    { row: 1, name: 'Siddharth Rao', email: 'sid.r@study.iitm.ac.in', category: 'Participation', status: 'valid' },
    { row: 2, name: 'Meera Krishnan', email: 'meera.k@study.iitm.ac.in', category: 'Finalist', status: 'valid' },
    { row: 3, name: 'Tanmay Bhatt', email: 'tanmay@study.iitm.ac.in', category: 'Participation', status: 'valid' },
    { row: 4, name: '', email: 'unknown@study.iitm.ac.in', category: 'Participation', status: 'error', error: 'Missing recipient name' },
    { row: 5, name: 'Rohit Joshi', email: 'rohit.j@study.iitm.ac.in', category: 'InvalidCategory', status: 'error', error: 'Category not recognized' },
  ];

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const [bts, evts] = await Promise.all([
          portalService.getIssuanceBatches(),
          portalService.getEvents(),
        ]);
        if (isMounted) {
          setBatches(bts);
          setEvents(evts);
          if (evts.length > 0) setSelectedEventId(evts[0].id);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSimulateUpload = () => {
    setUploadedFileName('namdapha_participants_batch_april.csv');
    setCurrentStep(2);
  };

  const handleSimulateValidate = () => {
    setCurrentStep(3);
  };

  const handleSimulateConfirm = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setCurrentStep(4);
    }, 800);
  };

  const handleReset = () => {
    setCurrentStep(1);
    setUploadedFileName('');
  };

  if (isLoading) {
    return <LoadingState message="Loading bulk batches..." />;
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Bulk Issuance' }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-subtle">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-main">Spreadsheet Bulk Issuance</h1>
          <p className="text-xs sm:text-sm text-neutral-secondary mt-0.5">
            Import recipient CSV spreadsheets, validate award rows, and generate verified certificates in bulk
          </p>
        </div>
      </div>

      {/* Guided 4-Step Workflow Stepper */}
      <Card>
        <CardContent className="p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-neutral-subtle pb-4 text-xs font-semibold">
            <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-brand-violet' : 'text-neutral-secondary/60'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentStep >= 1 ? 'bg-brand-violet text-white' : 'bg-neutral-surface text-neutral-secondary'}`}>
                1
              </span>
              <span>Upload CSV</span>
            </div>
            <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-brand-violet' : 'text-neutral-secondary/60'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentStep >= 2 ? 'bg-brand-violet text-white' : 'bg-neutral-surface text-neutral-secondary'}`}>
                2
              </span>
              <span>Map & Validate</span>
            </div>
            <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-brand-violet' : 'text-neutral-secondary/60'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentStep >= 3 ? 'bg-brand-violet text-white' : 'bg-neutral-surface text-neutral-secondary'}`}>
                3
              </span>
              <span>Review Batch</span>
            </div>
            <div className={`flex items-center gap-2 ${currentStep === 4 ? 'text-[#17653C]' : 'text-neutral-secondary/60'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentStep === 4 ? 'bg-[#17653C] text-white' : 'bg-neutral-surface text-neutral-secondary'}`}>
                4
              </span>
              <span>Download ZIP</span>
            </div>
          </div>

          {/* STEP 1: UPLOAD */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="max-w-md">
                <Select
                  label="Target Competition / Event"
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  options={events.map((evt) => ({ value: evt.id, label: `${evt.name} (${evt.eventDate})` }))}
                />
              </div>

              <div className="border-2 border-dashed border-neutral-subtle rounded-xl p-8 sm:p-12 text-center bg-neutral-surface/30 space-y-3">
                <FileSpreadsheet className="w-10 h-10 text-brand-violet mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-neutral-main">Upload Recipient Spreadsheet</h3>
                  <p className="text-xs text-neutral-secondary max-w-sm mx-auto">
                    Supported columns: <code>recipient_name</code>, <code>recipient_email</code>, <code>award_category</code>, <code>achievement</code>
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleSimulateUpload}
                    leftIcon={<UploadCloud className="w-4 h-4" />}
                  >
                    Select Sample CSV File
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: MAP & VALIDATE */}
          {currentStep === 2 && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-brand-violet-light/50 border border-brand-violet/20 rounded-md flex items-center justify-between">
                <span className="font-semibold text-brand-midnight">Uploaded File: {uploadedFileName}</span>
                <span className="font-mono text-neutral-secondary">5 rows parsed</span>
              </div>

              <div>
                <h4 className="font-semibold uppercase tracking-wider text-neutral-secondary text-[11px] mb-2">
                  Row Validation Report
                </h4>
                <div className="border border-neutral-subtle rounded-md overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-neutral-surface text-[11px] text-neutral-secondary uppercase border-b border-neutral-subtle">
                      <tr>
                        <th className="py-2 px-3">Row</th>
                        <th className="py-2 px-3">Name</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-subtle">
                      {simulatedRows.map((r) => (
                        <tr key={r.row} className={r.status === 'error' ? 'bg-[#FBE5E5]/30' : ''}>
                          <td className="py-2 px-3 font-mono">{r.row}</td>
                          <td className="py-2 px-3 font-medium">{r.name || '<Empty>'}</td>
                          <td className="py-2 px-3">{r.category}</td>
                          <td className="py-2 px-3">
                            {r.status === 'valid' ? (
                              <Badge variant="success" size="sm">Valid</Badge>
                            ) : (
                              <span className="text-[#A52A2A] font-semibold text-[11px]">{r.error}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Cancel / Re-upload
                </Button>
                <Button variant="primary" size="sm" onClick={handleSimulateValidate} rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Proceed with 3 Valid Rows
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: CONFIRM BATCH */}
          {currentStep === 3 && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-neutral-surface rounded-lg border border-neutral-subtle space-y-2">
                <h4 className="text-sm font-semibold text-neutral-main">Pre-Issuance Confirmation Summary</h4>
                <ul className="space-y-1 text-neutral-secondary list-disc pl-5">
                  <li>3 valid certificates will be allocated unique 6-digit codes.</li>
                  <li>Database records will be committed atomically to Namdapha registry.</li>
                  <li>2 invalid rows will be excluded and logged in the batch report.</li>
                </ul>
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentStep(2)}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={isProcessing}
                  onClick={handleSimulateConfirm}
                >
                  Confirm & Commit 3 Certificates
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: DOWNLOAD RESULTS */}
          {currentStep === 4 && (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#E2F4E9] text-[#17653C] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-neutral-main">Batch Processing Completed</h3>
                <p className="text-xs text-neutral-secondary max-w-sm mx-auto">
                  3 certificates were successfully committed to the database. All PDFs have been packaged.
                </p>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={() => alert('ZIP download demonstration. In Milestone 7, this triggers JSZip creation with all generated certificates.')}
                >
                  Download Certificates (ZIP)
                </Button>
                <Button variant="outline" size="md" onClick={handleReset}>
                  Start Another Batch
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History of Import Batches */}
      <Card>
        <CardHeader
          title="Past Issuance Batches"
          subtitle="Audit ledger of spreadsheet imports and row fulfillment status"
        />
        <div className="divide-y divide-neutral-subtle">
          {batches.map((batch) => (
            <div key={batch.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-sm text-neutral-main">{batch.eventName}</span>
                  <Badge variant={batch.status === 'completed' ? 'success' : 'pending'} size="sm">
                    {batch.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="text-neutral-secondary font-mono flex flex-wrap gap-x-3 text-[11px]">
                  <span>File: {batch.originalFilename}</span>
                  <span>Total: {batch.totalRows}</span>
                  <span>Issued: {batch.issuedCount}</span>
                  {batch.failedCount > 0 && <span className="text-[#A52A2A]">Failed: {batch.failedCount}</span>}
                </div>
              </div>

              <div className="sm:text-right text-neutral-secondary shrink-0">
                <span>By {batch.createdByName}</span>
                <span className="block text-[11px] text-neutral-secondary/80">
                  {new Date(batch.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
