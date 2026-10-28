import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ShieldAlert,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  EyeOff,
  Eye,
  Info,
  Award,
  Lock,
  Sparkles,
  Download,
  Loader2
} from 'lucide-react';
import { Template, TemplateFieldConfig } from '../../types';
import { CertificateRenderData, pdfEngine, downloadPdfBlob } from '../../services/pdfService';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export interface ProtectedCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: Template;
  renderData: CertificateRenderData;
  isSample?: boolean;
  hideVerificationCode?: boolean;
  onProceedToIssue?: () => void;
}

/**
 * Splits text into lines fitting within maxWidth in Canvas 2D context.
 */
function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [text];
}

/**
 * Protected Certificate Preview Modal
 *
 * Renders sample certificates onto a high-DPI HTML5 raster canvas rather than
 * exposing direct image URLs. Features dual-layer indelible watermarks, code suppression,
 * right-click and keyboard print/save interceptors.
 */
export const ProtectedCertificateModal: React.FC<ProtectedCertificateModalProps> = ({
  isOpen,
  onClose,
  template,
  renderData,
  isSample = true,
  hideVerificationCode: initialHideCode = true,
  onProceedToIssue,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [zoom, setZoom] = useState<number>(100);
  const [hideCode, setHideCode] = useState<boolean>(initialHideCode);
  const [isRendering, setIsRendering] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [securityNotice, setSecurityNotice] = useState<string | null>(null);
  const [containerDims, setContainerDims] = useState<{ width: number; height: number }>({
    width: 800,
    height: 520,
  });

  const handleDownloadOfficialPdf = async () => {
    setIsDownloading(true);
    try {
      const pdfBytes = await pdfEngine.generateCertificatePdf(template, renderData);
      const safeFilename = `${(renderData.recipientName || 'Certificate').replace(/[^a-zA-Z0-9_-]/g, '_')}_${renderData.verificationCode || 'cert'}.pdf`;
      downloadPdfBlob(pdfBytes, safeFilename);
    } catch (err: any) {
      console.error('Failed to download official certificate:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Track container dimensions with ResizeObserver for true aspect-ratio-aware fit
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateDims = () => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        setContainerDims({ width: el.clientWidth, height: el.clientHeight });
      }
    };

    updateDims();
    const ro = new ResizeObserver(updateDims);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen]);

  // Security alert toast timer
  useEffect(() => {
    if (!securityNotice) return;
    const timer = setTimeout(() => setSecurityNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [securityNotice]);

  // Intercept keyboard copy / print / save shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+S, Ctrl+P, Ctrl+C (when no text is highlighted), Cmd+S, Cmd+P
      if (
        isSample &&
        (e.ctrlKey || e.metaKey) &&
        ['s', 'p', 'c', 'u'].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        e.stopPropagation();
        setSecurityNotice('Sample preview is protected against copying, printing, or downloading.');
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, isSample]);

  // Prevent right clicks anywhere inside the preview modal
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (!isSample) return;
    e.preventDefault();
    e.stopPropagation();
    setSecurityNotice('Right-click context menu is disabled to prevent image copying.');
  }, [isSample]);

  // Helper to disambiguate signatory slots: if multiple signatory fields share the same index or are undefined,
  // sort them horizontally (left-to-right by X coordinate) so Left gets index 0 and Right gets index 1.
  const getEffectiveSignatoryIndex = useCallback(
    (field: TemplateFieldConfig, allFields: TemplateFieldConfig[]): number => {
      const sameTypeFields = allFields.filter((f) => f.type === field.type);
      if (sameTypeFields.length <= 1) {
        return field.signatoryIndex || 0;
      }

      // If distinct indices are already explicitly configured on all fields, respect them
      const indices = sameTypeFields.map((f) => f.signatoryIndex);
      const distinct = new Set(indices.filter((idx) => idx !== undefined && idx !== null));
      if (distinct.size === sameTypeFields.length && !indices.includes(undefined)) {
        return field.signatoryIndex || 0;
      }

      // Left-to-right spatial disambiguation
      const sorted = [...sameTypeFields].sort((a, b) => a.x - b.x);
      const positionIndex = sorted.findIndex((f) => f.id === field.id);
      return positionIndex >= 0 ? positionIndex : (field.signatoryIndex || 0);
    },
    []
  );

  // Main Canvas Render Pipeline
  useEffect(() => {
    if (!isOpen || !template) return;

    let isCancelled = false;
    setIsRendering(true);

    const renderCanvas = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Ensure web fonts (Google Fonts) have loaded into document.fonts before rasterizing
      const fields = template.fieldConfiguration || [];
      if (typeof document !== 'undefined' && document.fonts) {
        try {
          await document.fonts.ready;
          const fontNames = Array.from(new Set(fields.map((f) => f.fontFamily).filter(Boolean)));
          for (const fName of fontNames) {
            try {
              await document.fonts.load(`16px "${fName}"`);
              await document.fonts.load(`bold 16px "${fName}"`);
            } catch {
              // Graceful fallback if font is offline
            }
          }
        } catch {
          // Font loading API fallback
        }
      }

      if (isCancelled) return;

      // Canonical scaling for crisp Retina/HiDPI rendering without memory exhaustion
      let targetWidth: number;
      let targetHeight: number;
      let scale: number;

      if (template.pageUnit === 'px' || template.pageWidth > 500) {
        // Template dimensions are in pixels (e.g. 1414x2000 px)
        const maxDim = Math.max(template.pageWidth, template.pageHeight);
        const pxScale = maxDim > 2400 ? 2400 / maxDim : 1;
        targetWidth = Math.round(template.pageWidth * pxScale);
        targetHeight = Math.round(template.pageHeight * pxScale);
        scale = (targetHeight / template.pageHeight) * 2.83;
      } else if (template.pageUnit === 'in') {
        scale = 150;
        targetWidth = Math.round(template.pageWidth * 150);
        targetHeight = Math.round(template.pageHeight * 150);
      } else {
        // mm (default standard A4)
        scale = 5.5;
        targetWidth = Math.round(template.pageWidth * scale);
        targetHeight = Math.round(template.pageHeight * scale);
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // 1. Draw Background Image or Fallback Institutional Ivory Parchment
      let backgroundDrawn = false;

      if (template.backgroundUrl) {
        try {
          const bgImg = new Image();
          bgImg.crossOrigin = 'anonymous';

          await new Promise<void>((resolve, reject) => {
            bgImg.onload = () => resolve();
            bgImg.onerror = () => reject(new Error('Failed to load background image'));
            bgImg.src = template.backgroundUrl;
          });

          if (!isCancelled) {
            ctx.drawImage(bgImg, 0, 0, targetWidth, targetHeight);
            backgroundDrawn = true;
          }
        } catch {
          // Graceful fallback to parchment
        }
      }

      if (!backgroundDrawn && !isCancelled) {
        // Warm Ivory institutional fill (#FAF8F5)
        ctx.fillStyle = '#FAF8F5';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // Gold border (#C49A45)
        const outerInset = Math.round(18 * (scale / 2.83));
        ctx.strokeStyle = '#C49A45';
        ctx.lineWidth = 3;
        ctx.strokeRect(
          outerInset,
          outerInset,
          targetWidth - outerInset * 2,
          targetHeight - outerInset * 2
        );

        // Inner delicate hairline border
        const innerInset = Math.round(24 * (scale / 2.83));
        ctx.lineWidth = 1;
        ctx.strokeRect(
          innerInset,
          innerInset,
          targetWidth - innerInset * 2,
          targetHeight - innerInset * 2
        );
      }

      if (isCancelled) return;

      // 2. Render Template Fields
      for (const field of fields) {
        const x = (field.x / template.pageWidth) * targetWidth;
        const y = (field.y / template.pageHeight) * targetHeight;
        const width = (field.width / template.pageWidth) * targetWidth;
        const height = (field.height / template.pageHeight) * targetHeight;

        // Skip Verification Code if hideCode is true (user requirement: without code to be seen)
        // Verification code handling
        if (field.type === 'verification_code') {
          if (isSample) {
            if (hideCode) {
              // Omit completely
              continue;
            } else {
              // Placeholder text only
              drawCanvasText(ctx, {
                field,
                text: 'SAMPLE-CODE',
                x,
                y,
                width,
                height,
                scale,
                targetHeight,
              });
              continue;
            }
          } else {
            // Official view: render the real verification code
            drawCanvasText(ctx, {
              field,
              text: renderData.verificationCode || '••••••',
              x,
              y,
              width,
              height,
              scale,
              targetHeight,
            });
            continue;
          }
        }

        // Skip QR Code if hideCode is true
        if (field.type === 'qr_code') {
          if (hideCode) {
            // Omit completely
            continue;
          } else {
            // Draw subtle sample QR box placeholder
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.fillRect(x, y, width, height);
            ctx.strokeStyle = '#7760B5';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, width, height);
            ctx.fillStyle = '#5A5266';
            ctx.font = `600 ${Math.max(10, Math.round(12 * (scale / 2.83)))}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('QR CODE', x + width / 2, y + height / 2);
            continue;
          }
        }

        // Render Signatory Signature Image (with smart index disambiguation)
        if (field.type === 'signatory') {
          const sigIndex = getEffectiveSignatoryIndex(field, fields);
          const sig = renderData.signatories?.[sigIndex];

          if (sig?.signatureAssetUrl) {
            try {
              const sigImg = new Image();
              sigImg.crossOrigin = 'anonymous';
              await new Promise<void>((resolve, reject) => {
                sigImg.onload = () => resolve();
                sigImg.onerror = () => reject();
                sigImg.src = sig.signatureAssetUrl!;
              });

              if (!isCancelled) {
                // Preserve aspect ratio
                const imgAspect = sigImg.width / sigImg.height;
                const boxAspect = width / height;
                let drawW = width;
                let drawH = height;
                if (imgAspect > boxAspect) {
                  drawW = width;
                  drawH = width / imgAspect;
                } else {
                  drawH = height;
                  drawW = height * imgAspect;
                }
                const drawX = x + (width - drawW) / 2;
                const drawY = y + (height - drawH) / 2;
                ctx.drawImage(sigImg, drawX, drawY, drawW, drawH);
              }
            } catch {
              // Ignore signature load failure in sample preview
            }
          }
          continue;
        }

        // Resolve text field string
        const textValue = resolveFieldString(field, renderData, fields);
        if (!textValue) continue;

        drawCanvasText(ctx, {
          field,
          text: textValue,
          x,
          y,
          width,
          height,
          scale,
          targetHeight,
        });
      }

      if (isCancelled) return;

      // 3. Render Indelible In-Canvas Watermark (Baked into canvas pixels)
      if (isSample) {
        drawCanvasWatermarks(ctx, targetWidth, targetHeight);
      }

      setIsRendering(false);
    };

    renderCanvas();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, template, renderData, isSample, hideCode, getEffectiveSignatoryIndex]);

  // Resolves field text values with smart signatory disambiguation
  const resolveFieldString = (
    field: TemplateFieldConfig,
    data: CertificateRenderData,
    allFields: TemplateFieldConfig[]
  ): string => {
    switch (field.type) {
      case 'recipient_name':
        return data.recipientName || 'Jane Doe';
      case 'event_name':
        return data.eventName || 'House Competition';
      case 'achievement':
        return data.achievement || 'Winner';
      case 'position':
        return data.position || '1st Place';
      case 'date':
        return data.issueDate || new Date().toISOString().split('T')[0];
      case 'organization_name':
        return data.organizationName || 'Namdapha House, IIT Madras BS Degree';
      case 'signatory_name': {
        const sigIndex = getEffectiveSignatoryIndex(field, allFields);
        const sig = data.signatories?.[sigIndex];
        return sig?.name || 'Authorized Signatory';
      }
      case 'signatory_designation': {
        const sigIndex = getEffectiveSignatoryIndex(field, allFields);
        const sig = data.signatories?.[sigIndex];
        return sig?.designation || 'Signatory Designation';
      }
      case 'static_text':
        return field.staticTextContent || field.name || '';
      default:
        return '';
    }
  };

  // Helper to draw styled canvas text
  const drawCanvasText = (
    ctx: CanvasRenderingContext2D,
    params: {
      field: TemplateFieldConfig;
      text: string;
      x: number;
      y: number;
      width: number;
      height: number;
      scale: number;
      targetHeight: number;
    }
  ) => {
    const { field, text, x, y, width, height, targetHeight } = params;

    // Font size 0 indicates field is muted/hidden
    if (field.fontSize === 0) return;

    // Resolve font family with proper CSS fallback category
    const rawFam = (field.fontFamily || 'Inter').trim();
    let fallbackCategory = 'sans-serif';
    const famLower = rawFam.toLowerCase();
    if (
      famLower.includes('serif') ||
      famLower.includes('playfair') ||
      famLower.includes('cinzel') ||
      famLower.includes('garamond') ||
      famLower.includes('merriweather') ||
      famLower.includes('bodoni') ||
      famLower.includes('lora') ||
      famLower.includes('times')
    ) {
      fallbackCategory = 'serif';
    } else if (
      famLower.includes('script') ||
      famLower.includes('vibes') ||
      famLower.includes('brush') ||
      famLower.includes('pinyon') ||
      famLower.includes('dancing') ||
      famLower.includes('parisienne') ||
      famLower.includes('allura') ||
      famLower.includes('montecarlo')
    ) {
      fallbackCategory = 'cursive, serif';
    } else if (
      famLower.includes('mono') ||
      famLower.includes('courier') ||
      famLower.includes('jetbrains')
    ) {
      fallbackCategory = 'monospace';
    }

    const fontFamily = `"${rawFam}", ${fallbackCategory}`;
    const isBold = field.fontWeight === 'bold' || String(field.fontWeight) === '700';
    const fontWeight = isBold ? '700' : '400';
    const fontStyle = famLower.includes('italic') ? 'italic ' : '';

    // Canvas font size proportional to target canvas height vs template page height
    let fontSize = Math.max(8, Math.round((field.fontSize / template.pageHeight) * targetHeight * 0.95));

    ctx.fillStyle = field.color || '#1B1622';
    ctx.textBaseline = 'middle';

    // Alignment
    ctx.textAlign = (field.alignment as CanvasTextAlign) || 'center';
    let anchorX = x + width / 2;
    if (field.alignment === 'left') anchorX = x;
    if (field.alignment === 'right') anchorX = x + width;

    // Multi-line wrap or font shrink
    ctx.font = `${fontStyle}${fontWeight} ${fontSize}px ${fontFamily}`;
    const shouldWrap =
      field.type === 'achievement' ||
      field.overflowBehavior === 'wrap' ||
      (text.length > 55 && height > fontSize * 1.8);

    if (shouldWrap) {
      let lines = wrapCanvasText(ctx, text, width);
      let lineHeight = fontSize * 1.35;
      let totalH = lines.length * lineHeight;

      while (totalH > height && fontSize > 14) {
        fontSize -= 1;
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        lines = wrapCanvasText(ctx, text, width);
        lineHeight = fontSize * 1.35;
        totalH = lines.length * lineHeight;
      }

      let currentY = y + (height - totalH) / 2 + lineHeight / 2;
      for (const line of lines) {
        ctx.fillText(line, anchorX, currentY);
        currentY += lineHeight;
      }
    } else {
      // Single line shrink-to-fit
      let metrics = ctx.measureText(text);
      while (metrics.width > width && fontSize > 10) {
        fontSize -= 1;
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        metrics = ctx.measureText(text);
      }
      ctx.fillText(text, anchorX, y + height / 2);
    }
  };

  // Helper to burn indelible security watermarks directly into the pixel buffer
  const drawCanvasWatermarks = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    ctx.save();

    // Rotate canvas around center
    ctx.translate(width / 2, height / 2);
    ctx.rotate((-28 * Math.PI) / 180);
    ctx.translate(-width / 2, -height / 2);

    const diagonal = Math.sqrt(width * width + height * height);
    const startX = -diagonal / 2;
    const endX = width + diagonal / 2;
    const startY = -diagonal / 2;
    const endY = height + diagonal / 2;

    const rowSpacing = 160;
    const colSpacing = 420;

    ctx.font = '700 24px Inter, sans-serif';
    ctx.fillStyle = 'rgba(162, 28, 48, 0.16)'; // Institutional Crimson with safe opacity
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let rowIndex = 0;
    for (let y = startY; y < endY; y += rowSpacing) {
      const offsetX = rowIndex % 2 === 0 ? 0 : colSpacing / 2;
      for (let x = startX; x < endX; x += colSpacing) {
        ctx.fillText('SAMPLE CERTIFICATE • PREVIEW ONLY • NOT VALID FOR OFFICIAL USE', x + offsetX, y);
      }
      rowIndex++;
    }

    // Prominent Central Watermark Seal & Banner
    ctx.restore();
    ctx.save();

    ctx.translate(width / 2, height / 2);
    ctx.rotate((-18 * Math.PI) / 180);

    const bannerWidth = Math.min(width * 0.75, 820);
    const bannerHeight = 84;

    // Semi-transparent background plate
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.fillRect(-bannerWidth / 2, -bannerHeight / 2, bannerWidth, bannerHeight);

    // Crimson double security border
    ctx.strokeStyle = 'rgba(162, 28, 48, 0.65)';
    ctx.lineWidth = 3;
    ctx.strokeRect(-bannerWidth / 2, -bannerHeight / 2, bannerWidth, bannerHeight);

    ctx.lineWidth = 1;
    ctx.strokeRect(-bannerWidth / 2 + 5, -bannerHeight / 2 + 5, bannerWidth - 10, bannerHeight - 10);

    // Text in banner
    ctx.fillStyle = '#A21C30';
    ctx.font = '800 26px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SAMPLE PREVIEW • NOT FOR OFFICIAL USE', 0, -10);

    ctx.fillStyle = '#6E6A78';
    ctx.font = '600 13px Inter, sans-serif';
    ctx.fillText('OFFICIAL REGISTRY RECORD & VERIFICATION CODE GENERATED UPON ISSUANCE', 0, 18);

    ctx.restore();
  };

  // Aspect-ratio-aware proportional scale calculation (Phase 1)
  // Guarantees entire certificate fits 100% within viewport without cropping, distortion, or overflow
  const paddingX = 48;
  const paddingY = 48;
  const availW = Math.max(160, containerDims.width - paddingX);
  const availH = Math.max(160, containerDims.height - paddingY);
  const scaleW = availW / template.pageWidth;
  const scaleH = availH / template.pageHeight;
  const fitScale = Math.min(scaleW, scaleH);

  const baseWidth = Math.round(template.pageWidth * fitScale);
  const baseHeight = Math.round(template.pageHeight * fitScale);
  const displayWidth = Math.round(baseWidth * (zoom / 100));
  const displayHeight = Math.round(baseHeight * (zoom / 100));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isSample ? "Protected Certificate Sample Preview" : `Official Certificate Preview • ${renderData.recipientName}`}
      description={isSample ? "Secure on-screen sample preview with anti-copy protection, indelible watermarks, and verification code suppression." : "Authoritative vector-rendered certificate preview preserved at issuance timestamp."}
      maxWidth="5xl"
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2 text-xs text-neutral-secondary">
            <Lock className="w-3.5 h-3.5 text-neutral-secondary shrink-0" />
            <span>
              Format: {template.pageWidth} × {template.pageHeight} {template.pageUnit} • Layout: {template.orientation}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close Preview
            </Button>
            {!isSample && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                onClick={handleDownloadOfficialPdf}
                disabled={isDownloading}
              >
                {isDownloading ? 'Generating PDF...' : 'Download Official PDF'}
              </Button>
            )}
            {onProceedToIssue && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Award className="w-4 h-4" />}
                onClick={() => {
                  onClose();
                  onProceedToIssue();
                }}
              >
                Proceed to Issue
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div
        className="space-y-3 select-none"
        onContextMenu={handleContextMenu}
        onDragStart={(e) => e.preventDefault()}
      >
        {/* Security Alert Toast */}
        {securityNotice && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{securityNotice}</span>
            </div>
            <button
              onClick={() => setSecurityNotice(null)}
              className="text-amber-700 hover:text-amber-900 text-xs font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Studio Controls & Security Badges Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-neutral-surface rounded-lg border border-neutral-subtle text-xs">
          {/* Status Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {isSample ? <Badge variant="pending">Sample Mode</Badge> : <Badge variant="success">Official Certificate</Badge>}
            {isSample && <Badge variant="info">Watermark Protected</Badge>}
            {isSample && (
              <button
                type="button"
                onClick={() => setHideCode((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border transition-colors cursor-pointer"
                style={{
                  backgroundColor: hideCode ? '#F0EDF5' : '#FFF0D7',
                  color: hideCode ? '#2A1B4E' : '#8C5800',
                  borderColor: hideCode ? '#7760B5' : '#D9C7A1',
                }}
                title="Click to toggle code visibility in sample view"
              >
                {hideCode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{hideCode ? 'Code: Hidden (Recommended)' : 'Code: Visible'}</span>
              </button>
            )}
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-neutral-secondary mr-1">Zoom:</span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setZoom((z) => Math.max(50, z - 15))}
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="w-10 text-center font-mono text-[11px] text-neutral-main font-semibold">
              {zoom}%
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setZoom((z) => Math.min(150, z + 15))}
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={() => setZoom(100)}
              title="Reset Zoom to 100%"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          </div>
        </div>

        {/* Protected Certificate Viewport */}
        <div
          ref={containerRef}
          onContextMenu={handleContextMenu}
          className="relative overflow-auto h-[60vh] sm:h-[65vh] min-h-[420px] max-h-[720px] flex items-center justify-center p-3 sm:p-6 bg-neutral-900/10 rounded-lg border border-neutral-subtle select-none cursor-default"
          style={{
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          {isRendering && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-xs z-40 flex flex-col items-center justify-center space-y-2">
              <Sparkles className="w-6 h-6 text-brand-violet animate-spin" />
              <span className="text-xs font-semibold text-neutral-secondary">
                Rendering protected certificate preview...
              </span>
            </div>
          )}

          {/* Canvas Wrapper with Zoom Scaling */}
          <div
            style={{
              width: `${displayWidth}px`,
              height: `${displayHeight}px`,
              aspectRatio: `${template.pageWidth} / ${template.pageHeight}`,
              transition: 'width 0.12s cubic-bezier(0.4, 0, 0.2, 1), height 0.12s cubic-bezier(0.4, 0, 0.2, 1)',
              willChange: 'width, height',
            }}
            className="m-auto relative shadow-2xl rounded-sm overflow-hidden border border-neutral-subtle/80 bg-white select-none shrink-0"
          >
            {/* The Raw Canvas Element */}
            <canvas
              ref={canvasRef}
              className="w-full h-full block object-contain pointer-events-none select-none"
              style={{
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            />

            {/* Top Transparent Protection Shield Overlay */}
            <div
              className="absolute inset-0 z-30 select-none cursor-default"
              onContextMenu={handleContextMenu}
              onDragStart={(e) => e.preventDefault()}
              aria-hidden="true"
            />

            {/* Secondary Floating SVG Watermark Overlay Pattern */}
            {isSample && (
              <div
                className="absolute inset-0 z-20 pointer-events-none select-none opacity-25 overflow-hidden"
                aria-hidden="true"
              >
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern
                      id="sample-watermark-pattern"
                      width="280"
                      height="140"
                      patternUnits="userSpaceOnUse"
                      patternTransform="rotate(-25)"
                    >
                      <text
                        x="20"
                        y="40"
                        fill="#7760B5"
                        fontFamily="Inter, sans-serif"
                        fontSize="14"
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
                  <rect width="100%" height="100%" fill="url(#sample-watermark-pattern)" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Protection & Anti-Copy Institutional Notice */}
        <div className="p-3 bg-brand-violet/5 rounded-lg border border-brand-violet/20 flex items-start gap-2.5 text-xs text-neutral-secondary">
          <Info className="w-4 h-4 text-brand-violet shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-neutral-main block">
              Protected On-Screen View
            </span>
            <p>
              This certificate sample is rendered exclusively on-screen for visual and coordinate verification. Right-clicking, copying, or opening in a new tab is prevented. All official certificates with unique 6-digit verification codes and un-watermarked PDFs are created only upon official issuance.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
