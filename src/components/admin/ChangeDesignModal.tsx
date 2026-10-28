import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Sparkles,
  FileImage,
  Info
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Template } from '../../types';
import {
  checkAspectRatioCompatibility,
  validateImageFile,
  AspectRatioCheckResult
} from '../../utils/aspectRatioUtils';

export interface ChangeDesignModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTemplate: Template | null;
  onApplyDesign: (file: File) => Promise<void>;
}

export const ChangeDesignModal: React.FC<ChangeDesignModalProps> = ({
  isOpen,
  onClose,
  currentTemplate,
  onApplyDesign,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [detectedDimensions, setDetectedDimensions] = useState<{ width: number; height: number } | null>(null);
  const [compatibilityResult, setCompatibilityResult] = useState<AspectRatioCheckResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Revoke preview object URL on cleanup
  const cleanupPreviewUrl = useCallback(() => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  // Reset dialog state when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      cleanupPreviewUrl();
      setSelectedFile(null);
      setPreviewUrl(null);
      setDetectedDimensions(null);
      setCompatibilityResult(null);
      setErrorMessage(null);
      setIsDragging(false);
      setIsApplying(false);
    }
  }, [isOpen, cleanupPreviewUrl]);

  // Handle file inspection
  const processFile = useCallback(
    (file: File) => {
      setErrorMessage(null);
      cleanupPreviewUrl();

      // 1. Validate file format and size
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        setErrorMessage(validation.error || 'Invalid image format.');
        setSelectedFile(null);
        setPreviewUrl(null);
        setDetectedDimensions(null);
        setCompatibilityResult(null);
        return;
      }

      if (!currentTemplate) {
        setErrorMessage('Current certificate template information is not available.');
        return;
      }

      // 2. Create object URL for preview and dimension inspection
      const objectUrl = URL.createObjectURL(file);
      setSelectedFile(file);
      setPreviewUrl(objectUrl);

      // 3. Inspect actual natural pixel dimensions using HTML Image object
      const img = new Image();
      img.onload = () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;

        if (width <= 0 || height <= 0) {
          setErrorMessage('Unable to decode image dimensions. Please select a valid image file.');
          setDetectedDimensions(null);
          setCompatibilityResult(null);
          return;
        }

        setDetectedDimensions({ width, height });

        // Compare aspect ratio against current certificate's canvas dimensions
        const result = checkAspectRatioCompatibility(
          currentTemplate.pageWidth,
          currentTemplate.pageHeight,
          width,
          height,
          0.015,
          currentTemplate.pageUnit || 'mm'
        );
        setCompatibilityResult(result);
      };

      img.onerror = () => {
        setErrorMessage('Failed to decode the image file. It may be corrupted or unsupported.');
        setDetectedDimensions(null);
        setCompatibilityResult(null);
      };

      img.src = objectUrl;
    },
    [currentTemplate, cleanupPreviewUrl]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset file input value so re-selecting same file triggers change
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleApply = async () => {
    if (!selectedFile || !compatibilityResult?.isCompatible) return;
    setIsApplying(true);
    try {
      await onApplyDesign(selectedFile);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to apply certificate background design.');
    } finally {
      setIsApplying(false);
    }
  };

  if (!currentTemplate) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Certificate Design"
      description="Upload a new certificate background while keeping all your existing elements in place."
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-[11px] text-neutral-secondary font-mono flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-neutral-secondary shrink-0" />
            <span>Preserves all text, signatures, QR codes, and exact coordinates.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isApplying}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Sparkles className="w-4 h-4" />}
              onClick={handleApply}
              disabled={!selectedFile || !compatibilityResult?.isCompatible || isApplying}
              isLoading={isApplying}
            >
              Looks Good, Apply Design
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          className="hidden"
          onChange={handleFileInputChange}
        />

        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (!selectedFile) {
              fileInputRef.current?.click();
            }
          }}
          className={`relative rounded-xl border-2 border-dashed p-4 transition-all duration-150 ${
            isDragging
              ? 'border-brand-violet bg-brand-violet/10 ring-2 ring-brand-violet/20'
              : selectedFile
              ? 'border-neutral-subtle bg-white hover:border-neutral-secondary/40'
              : 'border-neutral-subtle bg-neutral-surface/50 hover:bg-neutral-surface hover:border-brand-violet/50 cursor-pointer text-center'
          }`}
        >
          {previewUrl && selectedFile ? (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Preview Thumbnail */}
              <div className="relative w-44 h-32 rounded-lg overflow-hidden border border-neutral-subtle bg-neutral-surface shrink-0 flex items-center justify-center p-1 shadow-2xs">
                <img
                  src={previewUrl}
                  alt="Selected Background Preview"
                  className="w-full h-full object-contain pointer-events-none select-none"
                />
              </div>

              {/* Uploaded File Details & Actions */}
              <div className="flex-1 min-w-0 space-y-1.5 text-left w-full sm:w-auto">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <FileImage className="w-4 h-4 text-brand-violet shrink-0" />
                    <span className="font-semibold text-xs text-neutral-main truncate">
                      {selectedFile.name}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-neutral-secondary shrink-0">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>

                {detectedDimensions && (
                  <p className="text-xs text-neutral-secondary font-mono">
                    Resolution: <span className="font-semibold text-neutral-main">{detectedDimensions.width} × {detectedDimensions.height} px</span>
                  </p>
                )}

                <div className="pt-2 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs py-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                  >
                    Select Different Image
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center justify-center space-y-2 text-center">
              <div className="p-3 rounded-full bg-brand-violet/10 text-brand-violet mb-1">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-main">
                  Drag & drop your new certificate design here
                </p>
                <p className="text-xs text-neutral-secondary mt-0.5">
                  or browse your computer for a PNG, JPG, or JPEG file
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="mt-2 text-xs"
                leftIcon={<ImageIcon className="w-3.5 h-3.5" />}
              >
                Browse Image
              </Button>
              <p className="text-[11px] text-neutral-secondary/80 font-mono mt-1">
                Supports PNG, JPG, JPEG • Max file size: 15MB
              </p>
            </div>
          )}
        </div>

        {/* Error State Banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <div className="space-y-0.5 flex-1">
              <p className="font-bold">Image Error</p>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Aspect Ratio Analysis & Comparison */}
        {compatibilityResult && detectedDimensions && (
          <div className="space-y-3">
            {/* Dimensions & Ratio Comparison Metrics */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-surface/60 rounded-lg border border-neutral-subtle text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-secondary block mb-1">
                  Current Certificate Template
                </span>
                <p className="font-mono font-semibold text-neutral-main text-xs">
                  {currentTemplate.pageWidth} × {currentTemplate.pageHeight} {currentTemplate.pageUnit}
                </p>
                <p className="text-[11px] text-neutral-secondary font-mono mt-0.5">
                  Aspect Ratio: <span className="font-bold text-neutral-main">{compatibilityResult.currentRatioFormatted}</span>
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-secondary block mb-1">
                  Uploaded New Design
                </span>
                <p className="font-mono font-semibold text-neutral-main text-xs">
                  {detectedDimensions.width} × {detectedDimensions.height} px
                </p>
                <p className="text-[11px] text-neutral-secondary font-mono mt-0.5">
                  Aspect Ratio: <span className="font-bold text-neutral-main">{compatibilityResult.uploadedRatioFormatted}</span>
                </p>
              </div>
            </div>

            {/* Scenario A: Matching Aspect Ratios (Success State) */}
            {compatibilityResult.isCompatible ? (
              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3 animate-in fade-in duration-150">
                <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-emerald-950 text-sm">Looks good!</p>
                    <Badge variant="success" size="sm">Proportions Match</Badge>
                  </div>
                  <p className="text-emerald-800 leading-relaxed">
                    Your new certificate design matches the current template's proportions. All existing elements will remain in their current positions.
                  </p>
                </div>
              </div>
            ) : (
              /* Scenario B: Different Aspect Ratios (Warning State) */
              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3 animate-in fade-in duration-150">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-amber-950 text-sm">Aspect Ratio Doesn't Match</p>
                    <Badge variant="pending" size="sm">Proportion Mismatch</Badge>
                  </div>
                  <p className="text-amber-800 leading-relaxed">
                    The new image has different proportions from your current certificate. Upload an image with matching proportions to preserve the existing layout accurately.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

