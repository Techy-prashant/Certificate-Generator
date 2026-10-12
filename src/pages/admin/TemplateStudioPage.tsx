import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Grid,
  Eye,
  EyeOff,
  Download,
  Plus,
  Trash2,
  Layers,
  Sliders,
  Type,
  FileCheck2,
  CheckCircle,
  AlertTriangle,
  QrCode,
  PenTool,
  RefreshCw,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { portalService } from '../../services';
import { Template, TemplateFieldConfig, TemplateFieldType, Signatory } from '../../types';
import { pdfEngine, downloadPdfBlob, createPdfPreviewUrl, CertificateRenderData } from '../../services/pdfService';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingState } from '../../components/ui/LoadingState';
import { ProtectedCertificateModal } from '../../components/admin/ProtectedCertificateModal';

// Standard field presets
const FIELD_PRESETS: Array<{
  type: TemplateFieldType;
  label: string;
  defaultName: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultFontSize: number;
  defaultAlignment: 'left' | 'center' | 'right';
  defaultFontWeight: string;
  icon: any;
}> = [
  {
    type: 'recipient_name',
    label: 'Recipient Name',
    defaultName: 'Recipient Full Name',
    defaultWidth: 180,
    defaultHeight: 18,
    defaultFontSize: 28,
    defaultAlignment: 'center',
    defaultFontWeight: 'bold',
    icon: Type,
  },
  {
    type: 'achievement',
    label: 'Award / Achievement',
    defaultName: 'Achievement or Award Category',
    defaultWidth: 160,
    defaultHeight: 14,
    defaultFontSize: 16,
    defaultAlignment: 'center',
    defaultFontWeight: 'bold',
    icon: Sparkles,
  },
  {
    type: 'event_name',
    label: 'Event Title',
    defaultName: 'Competition / Event Name',
    defaultWidth: 160,
    defaultHeight: 14,
    defaultFontSize: 16,
    defaultAlignment: 'center',
    defaultFontWeight: 'normal',
    icon: Layers,
  },
  {
    type: 'position',
    label: 'Position / Rank',
    defaultName: 'Position or Standing',
    defaultWidth: 80,
    defaultHeight: 12,
    defaultFontSize: 14,
    defaultAlignment: 'center',
    defaultFontWeight: 'bold',
    icon: FileCheck2,
  },
  {
    type: 'date',
    label: 'Issue Date',
    defaultName: 'Certificate Issue Date',
    defaultWidth: 60,
    defaultHeight: 10,
    defaultFontSize: 11,
    defaultAlignment: 'center',
    defaultFontWeight: 'normal',
    icon: FileCheck2,
  },
  {
    type: 'organization_name',
    label: 'Organization',
    defaultName: 'House or Institute Title',
    defaultWidth: 140,
    defaultHeight: 12,
    defaultFontSize: 13,
    defaultAlignment: 'center',
    defaultFontWeight: 'bold',
    icon: Layers,
  },
  {
    type: 'verification_code',
    label: 'Verification Code',
    defaultName: 'Six-Digit Unique Code',
    defaultWidth: 60,
    defaultHeight: 10,
    defaultFontSize: 12,
    defaultAlignment: 'center',
    defaultFontWeight: 'bold',
    icon: ShieldCheck,
  },
  {
    type: 'qr_code',
    label: 'Verification QR',
    defaultName: 'Verification QR Code Box',
    defaultWidth: 26,
    defaultHeight: 26,
    defaultFontSize: 0,
    defaultAlignment: 'center',
    defaultFontWeight: 'normal',
    icon: QrCode,
  },
  {
    type: 'signatory',
    label: 'Signature Image',
    defaultName: 'Authorized Signature Asset',
    defaultWidth: 45,
    defaultHeight: 20,
    defaultFontSize: 0,
    defaultAlignment: 'center',
    defaultFontWeight: 'normal',
    icon: PenTool,
  },
  {
    type: 'signatory_name',
    label: 'Signatory Name',
    defaultName: 'Signatory Printed Name',
    defaultWidth: 60,
    defaultHeight: 9,
    defaultFontSize: 11,
    defaultAlignment: 'center',
    defaultFontWeight: 'bold',
    icon: Type,
  },
  {
    type: 'signatory_designation',
    label: 'Signatory Title',
    defaultName: 'Signatory Designation',
    defaultWidth: 60,
    defaultHeight: 8,
    defaultFontSize: 9,
    defaultAlignment: 'center',
    defaultFontWeight: 'normal',
    icon: Type,
  },
  {
    type: 'static_text',
    label: 'Custom Text',
    defaultName: 'Static Text Label',
    defaultWidth: 100,
    defaultHeight: 12,
    defaultFontSize: 12,
    defaultAlignment: 'center',
    defaultFontWeight: 'normal',
    icon: Type,
  },
];

// Sample data for live studio preview
const SAMPLE_PREVIEW_DATA: CertificateRenderData = {
  recipientName: 'Srikanth Venkatanarayana Ramanujam',
  eventName: 'Namdapha Annual Technology Symposium 2026',
  achievement: 'First Place — Web & Cloud Architecture Track',
  position: 'Winner (1st Place)',
  issueDate: '12 October 2026',
  organizationName: 'Namdapha House, IIT Madras BS Degree',
  verificationCode: '', // Hidden in sample mode as requested
  verificationUrl: '',  // Hidden in sample mode as requested
  signatories: [
    {
      name: 'Dr. K. Ramaswamy',
      designation: 'Faculty Advisor, Namdapha House',
    },
    {
      name: 'Aditya Vardhan',
      designation: 'House Captain, Namdapha House',
    },
  ],
};

export const TemplateStudioPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [template, setTemplate] = useState<Template | null>(null);
  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [fields, setFields] = useState<TemplateFieldConfig[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<number>(100); // Percentage
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Undo / Redo history stack
  const [history, setHistory] = useState<TemplateFieldConfig[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Test PDF generation dialog
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Protected on-screen sample preview dialog
  const [isProtectedPreviewOpen, setIsProtectedPreviewOpen] = useState(false);

  // Publish confirmation modal
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);

  // Canvas DOM ref for calculating mouse positions
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const centerContainerRef = useRef<HTMLDivElement | null>(null);
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const [resizingFieldId, setResizingFieldId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ mouseX: number; mouseY: number; initialX: number; initialY: number; initialW: number; initialH: number } | null>(null);

  // Auto-fit canvas to available center viewport
  const fitToScreen = useCallback(() => {
    if (!centerContainerRef.current || !template) return;
    const isLandscape = template.orientation === 'landscape';
    const baseW = isLandscape ? 840 : 595;
    const baseH = baseW / (template.pageWidth / template.pageHeight);

    const containerW = centerContainerRef.current.clientWidth;
    const containerH = centerContainerRef.current.clientHeight;

    const availW = Math.max(260, containerW - 48);
    const availH = Math.max(260, containerH - 48);

    const scaleW = availW / baseW;
    const scaleH = availH / baseH;
    const fitScale = Math.min(scaleW, scaleH);

    const optimalZoom = Math.min(125, Math.max(35, Math.floor(fitScale * 100)));
    setZoomLevel(optimalZoom);
  }, [template]);

  const fetchTemplateData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [tData, sigsData] = await Promise.all([
        portalService.getTemplateById(id),
        portalService.getSignatories()
      ]);
      if (!tData) {
        navigate('/admin/templates');
        return;
      }
      setTemplate(tData);
      setSignatories(sigsData);
      const initialFields = tData.fieldConfiguration || [];
      setFields(initialFields);
      setHistory([initialFields]);
      setHistoryIndex(0);
      if (initialFields.length > 0) {
        setSelectedFieldId(initialFields[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchTemplateData();
  }, [fetchTemplateData]);

  // Run fitToScreen on template load and window resize
  useEffect(() => {
    if (!template) return;
    const timer = setTimeout(() => {
      fitToScreen();
    }, 120);

    const handleResize = () => {
      fitToScreen();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [template, fitToScreen]);

  // Clean up PDF object URLs
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl && pdfPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  // History record helper
  const pushHistory = useCallback((newFields: TemplateFieldConfig[]) => {
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, newFields];
    });
    setHistoryIndex((prev) => prev + 1);
    setHasUnsavedChanges(true);
  }, [historyIndex]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setFields(history[prevIndex]);
      setHasUnsavedChanges(true);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setFields(history[nextIndex]);
      setHasUnsavedChanges(true);
    }
  };

  // Add field from palette
  const handleAddField = (preset: typeof FIELD_PRESETS[0]) => {
    if (!template) return;
    const pageWidth = template.pageWidth;
    const pageHeight = template.pageHeight;

    // Scale default width and height if template uses pixels
    const unitScale = template.pageUnit === 'px' ? (template.pageWidth / 297) : (template.pageUnit === 'in' ? (template.pageWidth / 11.69) : 1);
    const fieldWidth = Math.round(preset.defaultWidth * unitScale);
    const fieldHeight = Math.round(preset.defaultHeight * unitScale);

    // Center horizontally by default
    const x = Math.max(5, Math.round((pageWidth - fieldWidth) / 2));
    // Stagger y position below previous fields
    const lastField = fields[fields.length - 1];
    let y = lastField ? Math.min(pageHeight - fieldHeight - 10, lastField.y + lastField.height + Math.round(6 * unitScale)) : Math.round(40 * unitScale);
    if (snapToGrid) {
      const snapStep = Math.max(1, Math.round(5 * unitScale));
      y = Math.round(y / snapStep) * snapStep;
    }

    const newField: TemplateFieldConfig = {
      id: `field-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: preset.defaultName,
      type: preset.type,
      x,
      y,
      width: fieldWidth,
      height: fieldHeight,
      fontSize: preset.defaultFontSize,
      fontFamily: 'Helvetica',
      fontWeight: preset.defaultFontWeight,
      color: '#1B1622',
      alignment: preset.defaultAlignment,
      isRequired: true,
      overflowBehavior: 'shrink',
      signatoryIndex: preset.type === 'signatory' || preset.type === 'signatory_name' || preset.type === 'signatory_designation' ? 0 : undefined,
    };

    const updated = [...fields, newField];
    setFields(updated);
    setSelectedFieldId(newField.id);
    pushHistory(updated);
  };

  const handleRemoveField = (fieldId: string) => {
    const updated = fields.filter((f) => f.id !== fieldId);
    setFields(updated);
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(updated[0]?.id || null);
    }
    pushHistory(updated);
  };

  const handleUpdateSelectedField = (updates: Partial<TemplateFieldConfig>) => {
    if (!selectedFieldId) return;
    const updated = fields.map((f) => (f.id === selectedFieldId ? { ...f, ...updates } : f));
    setFields(updated);
    pushHistory(updated);
  };

  // Mouse drag & resize handlers in millimeter space
  const handleMouseDownOnField = (e: React.MouseEvent, field: TemplateFieldConfig, isResize: boolean = false) => {
    if (isPreviewMode) return;
    e.stopPropagation();
    setSelectedFieldId(field.id);

    setDragStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialX: field.x,
      initialY: field.y,
      initialW: field.width,
      initialH: field.height,
    });

    if (isResize) {
      setResizingFieldId(field.id);
      setDraggingFieldId(null);
    } else {
      setDraggingFieldId(field.id);
      setResizingFieldId(null);
    }
  };

  // Window mouse move and mouse up listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStart || !canvasRef.current || !template) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = template.pageWidth / rect.width;
      const scaleY = template.pageHeight / rect.height;

      const deltaX = (e.clientX - dragStart.mouseX) * scaleX;
      const deltaY = (e.clientY - dragStart.mouseY) * scaleY;

      if (draggingFieldId) {
        let newX = dragStart.initialX + deltaX;
        let newY = dragStart.initialY + deltaY;

        if (snapToGrid) {
          newX = Math.round(newX / 2) * 2;
          newY = Math.round(newY / 2) * 2;
        }

        // Keep inside reasonable bounds
        newX = Math.max(0, Math.min(template.pageWidth - 10, newX));
        newY = Math.max(0, Math.min(template.pageHeight - 10, newY));

        setFields((prev) =>
          prev.map((f) => (f.id === draggingFieldId ? { ...f, x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 } : f))
        );
      } else if (resizingFieldId) {
        let newW = dragStart.initialW + deltaX;
        let newH = dragStart.initialH + deltaY;

        if (snapToGrid) {
          newW = Math.round(newW / 2) * 2;
          newH = Math.round(newH / 2) * 2;
        }

        newW = Math.max(10, Math.min(template.pageWidth, newW));
        newH = Math.max(5, Math.min(template.pageHeight, newH));

        setFields((prev) =>
          prev.map((f) => (f.id === resizingFieldId ? { ...f, width: Math.round(newW * 10) / 10, height: Math.round(newH * 10) / 10 } : f))
        );
      }
    };

    const handleMouseUp = () => {
      if (draggingFieldId || resizingFieldId) {
        pushHistory(fields);
        setDraggingFieldId(null);
        setResizingFieldId(null);
        setDragStart(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragStart, draggingFieldId, resizingFieldId, fields, template, snapToGrid, pushHistory]);

  // Save draft
  const handleSaveDraft = async () => {
    if (!template) return;
    setIsSaving(true);
    try {
      const updated = await portalService.updateTemplateFields(template.id, fields);
      setTemplate(updated);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      alert(`Failed to save template: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Publish template with version increment
  const handlePublishConfirm = async () => {
    if (!template) return;
    setIsPublishing(true);
    try {
      // First save fields
      await portalService.updateTemplateFields(template.id, fields);
      // Then publish
      const published = await portalService.publishTemplate(template.id);
      setTemplate(published);
      setHasUnsavedChanges(false);
      setIsPublishConfirmOpen(false);
    } catch (err: any) {
      alert(`Failed to publish template: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  // Test PDF generation dialog
  const handleOpenTestPdf = async () => {
    if (!template) return;
    setIsGeneratingPdf(true);
    setPdfError(null);
    setIsPdfModalOpen(true);

    try {
      // Map signature URLs from active signatories if available
      const sampleWithSigs: CertificateRenderData = {
        ...SAMPLE_PREVIEW_DATA,
        signatories: signatories.slice(0, 2).map((s) => ({
          name: s.name,
          designation: s.designation,
          signatureAssetUrl: s.signatureAssetUrl,
        })),
      };

      const updatedTemplateWithFields: Template = {
        ...template,
        fieldConfiguration: fields,
      };

      const pdfBytes = await pdfEngine.generateCertificatePdf(updatedTemplateWithFields, sampleWithSigs);
      const url = createPdfPreviewUrl(pdfBytes);
      setPdfPreviewUrl(url);
    } catch (err: any) {
      setPdfError(err.message || 'Failed to render PDF document.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadTestPdf = async () => {
    if (!template) return;
    try {
      const updatedTemplateWithFields: Template = {
        ...template,
        fieldConfiguration: fields,
      };
      const pdfBytes = await pdfEngine.generateCertificatePdf(updatedTemplateWithFields, SAMPLE_PREVIEW_DATA);
      downloadPdfBlob(pdfBytes, `${template.name}-test-preview.pdf`);
    } catch (err: any) {
      alert(`PDF download failed: ${err.message}`);
    }
  };

  if (isLoading || !template) {
    return <LoadingState message="Loading Template Studio canvas..." />;
  }

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  // Aspect ratio for the canvas container
  const aspectRatio = `${template.pageWidth} / ${template.pageHeight}`;
  const isLandscape = template.orientation === 'landscape';

  return (
    <div className="flex flex-col flex-1 h-full w-full bg-neutral-surface/40 overflow-hidden select-none relative">
      {/* 1. Studio Top Navigation Bar */}
      <header className="h-14 bg-white border-b border-neutral-subtle px-4 flex items-center justify-between shrink-0 shadow-2xs z-20">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/admin/templates')}
          >
            Templates
          </Button>

          <div className="h-4 w-px bg-neutral-subtle" />

          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-neutral-main truncate max-w-xs">{template.name}</h1>
            <Badge variant={template.status === 'published' ? 'success' : 'pending'} size="sm">
              v{template.versionNumber} • {template.status}
            </Badge>
            {hasUnsavedChanges && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                Unsaved
              </span>
            )}
            <span className="text-[11px] text-neutral-secondary font-mono">
              ({template.pageWidth} × {template.pageHeight} {template.pageUnit} {template.orientation})
            </span>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center bg-neutral-surface rounded-md border border-neutral-subtle p-0.5 text-xs">
            <button
              onClick={() => setZoomLevel((z) => Math.max(35, z - 10))}
              className="p-1 hover:bg-white rounded transition-colors text-neutral-secondary hover:text-neutral-main"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px] text-neutral-main min-w-[36px] text-center">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(200, z + 10))}
              className="p-1 hover:bg-white rounded transition-colors text-neutral-secondary hover:text-neutral-main"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={fitToScreen}
              className="px-1.5 py-0.5 hover:bg-white rounded transition-colors text-[10px] font-semibold text-brand-violet hover:text-brand-midnight border-l border-neutral-subtle/80 ml-0.5"
              title="Fit to Screen (Auto-Scale)"
              aria-label="Fit to Screen"
            >
              Fit
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              className="px-1.5 py-0.5 hover:bg-white rounded transition-colors text-[10px] font-mono text-neutral-secondary hover:text-neutral-main border-l border-neutral-subtle/80 ml-0.5"
              title="Actual 100% Size"
              aria-label="Actual 100% Size"
            >
              100%
            </button>
          </div>

          {/* Grid Snap Toggle */}
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`p-1.5 rounded-md border text-xs flex items-center gap-1 transition-colors ${
              snapToGrid
                ? 'bg-brand-violet/10 border-brand-violet/30 text-brand-violet font-semibold'
                : 'border-neutral-subtle bg-white text-neutral-secondary hover:bg-neutral-surface'
            }`}
            title="Toggle Millimeter Snap Grid"
            aria-label="Toggle Millimeter Snap Grid"
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="text-[11px]">Snap Grid</span>
          </button>

          {/* Undo / Redo */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              aria-label="Undo canvas change"
              className="p-1.5 text-neutral-secondary hover:text-neutral-main disabled:opacity-30 rounded hover:bg-neutral-surface"
              title="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 text-neutral-secondary hover:text-neutral-main disabled:opacity-30 rounded hover:bg-neutral-surface"
              title="Redo"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <div className="h-4 w-px bg-neutral-subtle mx-1" />

          {/* Preview Toggle */}
          <button
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={`px-2.5 py-1.5 rounded-md border text-xs flex items-center gap-1.5 font-medium transition-colors ${
              isPreviewMode
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-white border-neutral-subtle text-neutral-main hover:bg-neutral-surface'
            }`}
          >
            {isPreviewMode ? <EyeOff className="w-3.5 h-3.5 text-emerald-700" /> : <Eye className="w-3.5 h-3.5 text-neutral-secondary" />}
            <span>{isPreviewMode ? 'Exit Preview' : 'Sample Preview'}</span>
          </button>

          {/* Protected On-Screen Sample View */}
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
            onClick={() => setIsProtectedPreviewOpen(true)}
            title="Open protected on-screen sample preview with indelible watermarks and code suppression"
          >
            Protected Sample
          </Button>

          {/* Test PDF Download / Inspect */}
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={handleOpenTestPdf}
          >
            Test PDF
          </Button>

          {/* Save Draft */}
          <Button
            variant={hasUnsavedChanges ? "primary" : "outline"}
            size="sm"
            leftIcon={<Save className="w-3.5 h-3.5" />}
            onClick={handleSaveDraft}
            isLoading={isSaving}
          >
            {hasUnsavedChanges ? 'Save Changes' : 'Saved'}
          </Button>

          {/* Publish Action */}
          <Button
            variant="outline"
            size="sm"
            className="text-emerald-700 hover:bg-emerald-50 border-emerald-300 hover:border-emerald-400 font-semibold"
            leftIcon={<CheckCircle className="w-3.5 h-3.5" />}
            onClick={() => setIsPublishConfirmOpen(true)}
          >
            Publish v{template.status === 'published' ? template.versionNumber + 1 : template.versionNumber}
          </Button>
        </div>
      </header>

      {/* 2. Main Studio Body (Left Palette + Center Canvas + Right Properties) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Floating Left Toggle Button (when panel is collapsed) */}
        {!isLeftPanelOpen && (
          <button
            onClick={() => {
              setIsLeftPanelOpen(true);
              setTimeout(fitToScreen, 50);
            }}
            className="absolute top-3 left-3 z-30 px-2.5 py-1.5 bg-white rounded-md shadow-md border border-neutral-subtle text-xs font-semibold text-brand-violet hover:bg-brand-violet/5 flex items-center gap-1.5 transition-all"
            title="Open Dynamic Fields Palette"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Fields</span>
          </button>
        )}

        {/* Floating Right Toggle Button (when panel is collapsed) */}
        {!isRightPanelOpen && (
          <button
            onClick={() => {
              setIsRightPanelOpen(true);
              setTimeout(fitToScreen, 50);
            }}
            className="absolute top-3 right-3 z-30 px-2.5 py-1.5 bg-white rounded-md shadow-md border border-neutral-subtle text-xs font-semibold text-brand-violet hover:bg-brand-violet/5 flex items-center gap-1.5 transition-all"
            title="Open Field Properties Inspector"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Properties</span>
          </button>
        )}

        {/* Left Sidebar: Fields Palette & Active List */}
        {isLeftPanelOpen && (
          <aside className="w-64 bg-white border-r border-neutral-subtle flex flex-col shrink-0 z-10 animate-in fade-in duration-150">
            <div className="p-3 border-b border-neutral-subtle flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-secondary flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-brand-violet" />
                Add Dynamic Fields
              </h2>
              <button
                onClick={() => {
                  setIsLeftPanelOpen(false);
                  setTimeout(fitToScreen, 50);
                }}
                className="text-neutral-secondary hover:text-neutral-main p-1 rounded hover:bg-neutral-surface text-xs leading-none"
                title="Collapse Sidebar"
              >
                ✕
              </button>
            </div>

            {/* Available Fields Palette */}
            <div className="p-3 overflow-y-auto max-h-60 border-b border-neutral-subtle space-y-1.5">
              {FIELD_PRESETS.map((preset) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.type}
                    onClick={() => handleAddField(preset)}
                    className="w-full text-left p-2 rounded-md hover:bg-brand-violet/5 hover:border-brand-violet/30 border border-transparent text-xs text-neutral-main flex items-center justify-between transition-colors group"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <Icon className="w-3.5 h-3.5 text-brand-violet group-hover:scale-110 transition-transform" />
                      <span>{preset.label}</span>
                    </span>
                    <Plus className="w-3 h-3 text-neutral-secondary group-hover:text-brand-violet" />
                  </button>
                );
              })}
            </div>

            {/* Placed Fields Tree */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-secondary mb-2 flex items-center justify-between">
                <span>Active Fields ({fields.length})</span>
                <span className="text-[10px] font-mono lowercase">z-order</span>
              </h3>

              {fields.length === 0 ? (
                <p className="text-xs text-neutral-secondary italic p-2 text-center my-auto">
                  No fields placed yet. Click a field above to position it on the canvas.
                </p>
              ) : (
                <div className="space-y-1">
                  {fields.map((f, idx) => {
                    const isSelected = f.id === selectedFieldId;
                    const isOutOfBounds =
                      f.x + f.width > template.pageWidth || f.y + f.height > template.pageHeight || f.x < 0 || f.y < 0;

                    return (
                      <div
                        key={f.id}
                        onClick={() => setSelectedFieldId(f.id)}
                        className={`p-2 rounded-md border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'border-brand-violet bg-brand-violet/5 text-brand-midnight font-bold shadow-2xs'
                            : 'border-neutral-subtle/80 hover:bg-neutral-surface text-neutral-main'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-mono text-[10px] text-neutral-secondary">{idx + 1}.</span>
                          <span className="truncate">{f.name}</span>
                          {isOutOfBounds && (
                            <span title="Field extends beyond canvas boundary">
                              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                            </span>
                          )}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveField(f.id);
                          }}
                          className="text-neutral-secondary hover:text-red-600 p-1 rounded"
                          title="Delete Field"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Center Canvas Area: Zoomable, Pan-scrollable container with non-clipped centering */}
        <main
          ref={centerContainerRef}
          className="flex-1 overflow-auto p-4 sm:p-8 flex bg-neutral-surface/60 min-w-0 min-h-0 relative"
        >
          <div
            style={{
              width: isLandscape ? '840px' : '595px',
              aspectRatio,
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'center center',
              transition: 'transform 0.15s ease-out',
            }}
            className="m-auto shrink-0 shadow-2xl rounded-sm overflow-hidden relative border border-neutral-subtle/80 bg-white select-none"
          >
            {/* The Certificate Canvas */}
            <div
              ref={canvasRef}
              className="w-full h-full relative"
            >
              {/* Background Canva Artwork - object-contain ensures ZERO clipping */}
              <img
                src={template.backgroundUrl}
                alt="Certificate Artwork"
                className="w-full h-full object-contain pointer-events-none select-none"
                draggable={false}
              />

              {/* Optional Millimeter Alignment Grid */}
              {snapToGrid && !isPreviewMode && (
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    backgroundImage: `linear-gradient(to right, #938f99 1px, transparent 1px), linear-gradient(to bottom, #938f99 1px, transparent 1px)`,
                    backgroundSize: `${(840 / template.pageWidth) * 10}px ${(840 / template.pageWidth) * 10}px`,
                  }}
                />
              )}

              {/* Watermark Overlay in Studio Sample Preview Mode */}
              {isPreviewMode && (
                <div
                  className="absolute inset-0 pointer-events-none select-none z-10 opacity-30 overflow-hidden"
                  aria-hidden="true"
                >
                  <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern
                        id="studio-sample-watermark"
                        width="300"
                        height="150"
                        patternUnits="userSpaceOnUse"
                        patternTransform="rotate(-25)"
                      >
                        <text
                          x="20"
                          y="40"
                          fill="#7760B5"
                          fontFamily="Inter, sans-serif"
                          fontSize="13"
                          fontWeight="bold"
                        >
                          SAMPLE CERTIFICATE
                        </text>
                        <text
                          x="40"
                          y="100"
                          fill="#A21C30"
                          fontFamily="Inter, sans-serif"
                          fontSize="11"
                          fontWeight="600"
                        >
                          PREVIEW ONLY • NOT ISSUED
                        </text>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#studio-sample-watermark)" />
                  </svg>
                </div>
              )}

              {/* Dynamic Fields Placed on Canvas */}
              {fields.map((field) => {
                const isSelected = field.id === selectedFieldId;
                // Compute percentage-based styles relative to template dimensions (mm)
                const leftPercent = (field.x / template.pageWidth) * 100;
                const topPercent = (field.y / template.pageHeight) * 100;
                const widthPercent = (field.width / template.pageWidth) * 100;
                const heightPercent = (field.height / template.pageHeight) * 100;

                // Value for preview
                let previewText = field.name;
                if (isPreviewMode) {
                  switch (field.type) {
                    case 'recipient_name':
                      previewText = SAMPLE_PREVIEW_DATA.recipientName;
                      break;
                    case 'event_name':
                      previewText = SAMPLE_PREVIEW_DATA.eventName;
                      break;
                    case 'achievement':
                      previewText = SAMPLE_PREVIEW_DATA.achievement;
                      break;
                    case 'position':
                      previewText = SAMPLE_PREVIEW_DATA.position || '1st Place';
                      break;
                    case 'date':
                      previewText = SAMPLE_PREVIEW_DATA.issueDate;
                      break;
                    case 'organization_name':
                      previewText = SAMPLE_PREVIEW_DATA.organizationName;
                      break;
                    case 'verification_code':
                      // User requirement: without code to be seen in sample preview
                      previewText = '';
                      break;
                    case 'signatory_name':
                      previewText = SAMPLE_PREVIEW_DATA.signatories?.[field.signatoryIndex || 0]?.name || 'Dr. K. Ramaswamy';
                      break;
                    case 'signatory_designation':
                      previewText = SAMPLE_PREVIEW_DATA.signatories?.[field.signatoryIndex || 0]?.designation || 'Faculty Advisor';
                      break;
                    case 'static_text':
                      previewText = field.staticTextContent || field.name;
                      break;
                  }
                }

                // Check bounds warning
                const outOfBounds =
                  field.x + field.width > template.pageWidth ||
                  field.y + field.height > template.pageHeight ||
                  field.x < 0 ||
                  field.y < 0;

                return (
                  <div
                    key={field.id}
                    onMouseDown={(e) => handleMouseDownOnField(e, field, false)}
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPercent}%`,
                      width: `${widthPercent}%`,
                      height: `${heightPercent}%`,
                      color: field.color,
                      textAlign: field.alignment,
                      fontFamily: field.fontFamily.includes('Times')
                        ? 'serif'
                        : field.fontFamily.includes('Courier')
                        ? 'monospace'
                        : 'sans-serif',
                      fontSize: `${Math.max(8, field.fontSize * 0.95)}px`,
                      fontWeight: field.fontWeight === 'bold' ? 700 : 400,
                    }}
                    className={`absolute flex items-center ${
                      field.alignment === 'center'
                        ? 'justify-center'
                        : field.alignment === 'right'
                        ? 'justify-end'
                        : 'justify-start'
                    } ${
                      isPreviewMode
                        ? 'cursor-default'
                        : `cursor-move border ${
                            isSelected
                              ? 'border-brand-violet bg-brand-violet/10 ring-2 ring-brand-violet/30'
                              : outOfBounds
                              ? 'border-amber-500 bg-amber-500/10'
                              : 'border-dashed border-brand-violet/50 hover:border-brand-violet hover:bg-brand-violet/5'
                          }`
                    }`}
                  >
                    {/* Render content */}
                    {field.type === 'qr_code' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-white/80 border border-neutral-subtle/80 p-1">
                        {!isPreviewMode ? (
                          <>
                            <QrCode className="w-full h-full text-brand-midnight" />
                            <span className="text-[8px] font-mono text-neutral-secondary">QR CODE</span>
                          </>
                        ) : (
                          <div className="w-full h-full border border-dashed border-neutral-subtle/80 flex items-center justify-center bg-neutral-surface/40 p-1">
                            <span className="text-[7px] font-mono text-neutral-secondary text-center leading-none">NO CODE IN SAMPLE</span>
                          </div>
                        )}
                      </div>
                    ) : field.type === 'signatory' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-1 bg-white/40 border border-dashed border-neutral-subtle/60">
                        {signatories[field.signatoryIndex || 0]?.signatureAssetUrl ? (
                          <img
                            src={signatories[field.signatoryIndex || 0].signatureAssetUrl}
                            alt="Signature"
                            className="max-h-full max-w-full object-contain filter contrast-125"
                          />
                        ) : (
                          <div className="flex flex-col items-center text-neutral-secondary">
                            <PenTool className="w-5 h-5 text-brand-violet" />
                            <span className="text-[8px] font-mono">Signatory { (field.signatoryIndex || 0) + 1 }</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="truncate px-1 leading-tight">{previewText}</span>
                    )}

                    {/* Resize Handle (bottom-right) */}
                    {isSelected && !isPreviewMode && (
                      <div
                        onMouseDown={(e) => handleMouseDownOnField(e, field, true)}
                        className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-brand-violet rounded-full cursor-se-resize border-2 border-white shadow-xs"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        {/* Right Sidebar: Selected Field Property Panel */}
        {isRightPanelOpen && (
          <aside className="w-72 bg-white border-l border-neutral-subtle p-4 flex flex-col shrink-0 overflow-y-auto z-10 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-subtle">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-secondary flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-brand-violet" />
                Field Properties
              </h2>
              <div className="flex items-center gap-1.5">
                {selectedField && (
                  <Badge variant="neutral" size="sm">
                    {selectedField.type}
                  </Badge>
                )}
                <button
                  onClick={() => {
                    setIsRightPanelOpen(false);
                    setTimeout(fitToScreen, 50);
                  }}
                  className="text-neutral-secondary hover:text-neutral-main p-1 rounded hover:bg-neutral-surface text-xs leading-none"
                  title="Collapse Properties Inspector"
                >
                  ✕
                </button>
              </div>
            </div>

          {selectedField ? (
            <div className="space-y-4 text-xs">
              {/* Field Label / Name */}
              <Input
                label="Field Label"
                value={selectedField.name}
                onChange={(e) => handleUpdateSelectedField({ name: e.target.value })}
              />

              {/* Static Text Content if static_text */}
              {selectedField.type === 'static_text' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-secondary">
                    Static Content
                  </label>
                  <textarea
                    rows={2}
                    value={selectedField.staticTextContent || ''}
                    onChange={(e) => handleUpdateSelectedField({ staticTextContent: e.target.value })}
                    className="block w-full rounded-md border border-neutral-subtle bg-white p-2 text-xs text-neutral-main focus-visible:outline-2 focus-visible:outline-brand-violet"
                    placeholder="Enter permanent certificate label..."
                  />
                </div>
              )}

              {/* Signatory Slot Selector */}
              {(selectedField.type === 'signatory' ||
                selectedField.type === 'signatory_name' ||
                selectedField.type === 'signatory_designation') && (
                <Select
                  label="Signatory Slot"
                  value={String(selectedField.signatoryIndex || 0)}
                  onChange={(e) => handleUpdateSelectedField({ signatoryIndex: parseInt(e.target.value) || 0 })}
                  options={[
                    { value: '0', label: '1st Signatory (Primary / Faculty Advisor)' },
                    { value: '1', label: '2nd Signatory (Secondary / House Captain)' },
                    { value: '2', label: '3rd Signatory (Guest / Convener)' },
                  ]}
                />
              )}

              {/* Canonical Coordinates (mm) */}
              <div className="space-y-1.5">
                <span className="font-semibold text-neutral-secondary uppercase tracking-wider text-[10px] block">
                  Canonical Coordinates ({template.pageUnit})
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="X Position"
                    type="number"
                    value={selectedField.x}
                    onChange={(e) => handleUpdateSelectedField({ x: parseFloat(e.target.value) || 0 })}
                  />
                  <Input
                    label="Y Position"
                    type="number"
                    value={selectedField.y}
                    onChange={(e) => handleUpdateSelectedField({ y: parseFloat(e.target.value) || 0 })}
                  />
                  <Input
                    label="Width"
                    type="number"
                    value={selectedField.width}
                    onChange={(e) => handleUpdateSelectedField({ width: Math.max(5, parseFloat(e.target.value) || 5) })}
                  />
                  <Input
                    label="Height"
                    type="number"
                    value={selectedField.height}
                    onChange={(e) => handleUpdateSelectedField({ height: Math.max(3, parseFloat(e.target.value) || 3) })}
                  />
                </div>
              </div>

              {/* Typography Controls for text fields */}
              {selectedField.type !== 'qr_code' && selectedField.type !== 'signatory' && (
                <div className="space-y-3 pt-2 border-t border-neutral-subtle">
                  <span className="font-semibold text-neutral-secondary uppercase tracking-wider text-[10px] block">
                    Typography & Styling
                  </span>

                  <Select
                    label="Font Family"
                    value={selectedField.fontFamily}
                    onChange={(e) => handleUpdateSelectedField({ fontFamily: e.target.value })}
                    options={[
                      { value: 'Helvetica', label: 'Helvetica (Modern Sans-Serif - Matches Teal / Navy)' },
                      { value: 'Times-Roman', label: 'Times Roman (Formal Academic Serif - Matches Gold / Classic)' },
                      { value: 'Courier', label: 'Courier (Monospace - Technical / Code)' },
                    ]}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Font Size (pt)"
                      type="number"
                      value={selectedField.fontSize}
                      onChange={(e) => handleUpdateSelectedField({ fontSize: Math.max(6, parseInt(e.target.value) || 12) })}
                    />
                    <Select
                      label="Weight"
                      value={selectedField.fontWeight || 'normal'}
                      onChange={(e) => handleUpdateSelectedField({ fontWeight: e.target.value })}
                      options={[
                        { value: 'normal', label: 'Regular' },
                        { value: 'bold', label: 'Bold' },
                      ]}
                    />
                  </div>

                  <Select
                    label="Text Alignment"
                    value={selectedField.alignment}
                    onChange={(e) => handleUpdateSelectedField({ alignment: e.target.value as any })}
                    options={[
                      { value: 'center', label: 'Center Aligned' },
                      { value: 'left', label: 'Left Aligned' },
                      { value: 'right', label: 'Right Aligned' },
                    ]}
                  />

                  {/* Curated Color Picker & Theme Swatches */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-secondary">
                        Color & Theme
                      </label>
                      <span className="text-[10px] text-neutral-secondary">Certificate Swatches:</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedField.color || '#1B1622'}
                        onChange={(e) => handleUpdateSelectedField({ color: e.target.value })}
                        className="w-8 h-8 rounded border border-neutral-subtle cursor-pointer"
                      />
                      <Input
                        value={selectedField.color || '#1B1622'}
                        onChange={(e) => handleUpdateSelectedField({ color: e.target.value })}
                        placeholder="#1B1622"
                      />
                    </div>

                    {/* Quick Theme Color Swatches */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {[
                        { label: 'Navy Blue (Template 1)', hex: '#1E3A8A' },
                        { label: 'Deep Midnight', hex: '#0F172A' },
                        { label: 'Royal Gold (Template 2)', hex: '#B45309' },
                        { label: 'Warm Bronze', hex: '#D97706' },
                        { label: 'Deep Teal (Template 3)', hex: '#134E4A' },
                        { label: 'Classic Charcoal', hex: '#1B1622' },
                        { label: 'Muted Slate', hex: '#475569' },
                      ].map((swatch) => (
                        <button
                          key={swatch.hex}
                          type="button"
                          onClick={() => handleUpdateSelectedField({ color: swatch.hex })}
                          className={`w-5 h-5 rounded-full border border-neutral-subtle/80 shadow-2xs hover:scale-125 transition-transform ${
                            selectedField.color?.toLowerCase() === swatch.hex.toLowerCase()
                              ? 'ring-2 ring-brand-violet ring-offset-1'
                              : ''
                          }`}
                          style={{ backgroundColor: swatch.hex }}
                          title={`${swatch.label}: ${swatch.hex}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Overflow / Shrink */}
                  <Select
                    label="Long Text Overflow"
                    value={selectedField.overflowBehavior || 'shrink'}
                    onChange={(e) => handleUpdateSelectedField({ overflowBehavior: e.target.value as any })}
                    options={[
                      { value: 'shrink', label: 'Shrink to Fit Box' },
                      { value: 'wrap', label: 'Wrap to Next Line' },
                      { value: 'clip', label: 'Clip Excess Text' },
                    ]}
                  />
                </div>
              )}

              {/* Delete Field Button */}
              <div className="pt-4 border-t border-neutral-subtle">
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full text-xs"
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={() => handleRemoveField(selectedField.id)}
                >
                  Delete Selected Field
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-neutral-secondary space-y-2">
              <Sliders className="w-8 h-8 text-neutral-secondary/50 mx-auto" />
              <p>Select any field on the canvas or from the active list to modify its coordinates and typography.</p>
            </div>
          )}
        </aside>
        )}
      </div>

      {/* 3. Test PDF Preview Modal */}
      <Modal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        title="Test PDF Document Rendering"
        description="Verify exact coordinate accuracy, font scaling, QR placement, and signature rendering."
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-neutral-secondary font-mono">
              Engine: pdf-lib • Dimensions: {template.pageWidth} × {template.pageHeight} {template.pageUnit}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsPdfModalOpen(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Download className="w-4 h-4" />}
                onClick={handleDownloadTestPdf}
              >
                Download Test PDF
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {pdfError ? (
            <div className="p-4 rounded-md bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{pdfError}</span>
            </div>
          ) : isGeneratingPdf ? (
            <div className="py-24 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-brand-violet animate-spin mx-auto" />
              <p className="text-xs text-neutral-secondary">Compiling PDF document with embedded fonts and assets...</p>
            </div>
          ) : pdfPreviewUrl ? (
            <div className="border border-neutral-subtle rounded-lg overflow-hidden h-[500px] bg-neutral-surface">
              <iframe
                src={pdfPreviewUrl}
                title="Generated Certificate PDF Preview"
                className="w-full h-full border-none"
              />
            </div>
          ) : null}
        </div>
      </Modal>

      {/* 4. Publish Template Confirmation Modal */}
      <ConfirmDialog
        isOpen={isPublishConfirmOpen}
        onClose={() => setIsPublishConfirmOpen(false)}
        onConfirm={handlePublishConfirm}
        title="Publish Template Layout?"
        message={`Publishing will freeze this layout as version ${
          template.status === 'published' ? template.versionNumber + 1 : template.versionNumber
        } and make it available for official certificate issuance. Previously issued certificates will preserve their historical snapshots.`}
        confirmLabel="Publish Layout"
        variant="info"
        isLoading={isPublishing}
      />

      {/* 5. Protected Screen Preview Modal */}
      {template && (
        <ProtectedCertificateModal
          isOpen={isProtectedPreviewOpen}
          onClose={() => setIsProtectedPreviewOpen(false)}
          template={{
            ...template,
            fieldConfiguration: fields,
          }}
          renderData={{
            ...SAMPLE_PREVIEW_DATA,
            signatories: signatories.slice(0, 2).map((s) => ({
              name: s.name,
              designation: s.designation,
              signatureAssetUrl: s.signatureAssetUrl,
            })),
          }}
          isSample={true}
          hideVerificationCode={true}
        />
      )}
    </div>
  );
};
