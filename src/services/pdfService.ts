import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';
import QRCode from 'qrcode';
import { Template, TemplateFieldConfig, CertificateDetails } from '../types';

export interface CertificateRenderData {
  recipientName: string;
  eventName: string;
  achievement: string;
  position?: string;
  issueDate: string;
  organizationName: string;
  verificationCode: string;
  verificationUrl: string;
  signatories?: Array<{
    name: string;
    designation: string;
    signatureAssetUrl?: string;
  }>;
}

/**
 * Converts a measurement unit to PostScript points (1 pt = 1/72 inch).
 */
export function unitToPoints(val: number, unit: 'mm' | 'px' | 'in'): number {
  switch (unit) {
    case 'mm':
      return (val * 72) / 25.4;
    case 'in':
      return val * 72;
    case 'px':
    default:
      // Assuming 96 DPI for screen CSS pixels to 72 DPI PDF points
      return (val * 72) / 96;
  }
}

/**
 * Converts PostScript points to target measurement unit.
 */
export function pointsToUnit(points: number, unit: 'mm' | 'px' | 'in'): number {
  switch (unit) {
    case 'mm':
      return (points * 25.4) / 72;
    case 'in':
      return points / 72;
    case 'px':
    default:
      return (points * 96) / 72;
  }
}

/**
 * Parses Hex color to pdf-lib rgb(0..1, 0..1, 0..1)
 */
export function parseHexColor(hex: string) {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) / 255;
    const g = parseInt(clean[1] + clean[1], 16) / 255;
    const b = parseInt(clean[2] + clean[2], 16) / 255;
    return rgb(r || 0, g || 0, b || 0);
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    return rgb(r || 0, g || 0, b || 0);
  }
  // Default to Midnight Violet
  return rgb(0.106, 0.086, 0.133);
}

/**
 * Splits text into lines that fit within a specified maximum width.
 */
function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width <= maxWidth) {
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
 * Splits text into lines fitting within maxWidth in Canvas 2D context.
 */
function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const paragraphs = text.split('\n');
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      if (!word) continue;
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
  }

  return lines.length > 0 ? lines : [text];
}

export class CertificatePdfEngine {
  /**
   * Generates a verifiable, high-precision PDF document from a template configuration and certificate payload.
   * In browser environments, renders via 300+ DPI HTML5 Canvas with true Google Fonts (ligatures, calligraphy, and kerning)
   * matching preview fidelity with zero font degradation, accompanied by an invisible selectable text layer.
   * In Node.js environments, falls back to direct vector pdf-lib rendering.
   */
  async generateCertificatePdf(
    template: Template,
    data: CertificateRenderData
  ): Promise<Uint8Array> {
    if (typeof document !== 'undefined') {
      try {
        return await this.generateCertificatePdfFromCanvas(template, data);
      } catch (err) {
        console.warn('[PdfEngine] High-fidelity canvas PDF generation failed, falling back to vector renderer:', err);
      }
    }
    return await this.generateCertificatePdfVector(template, data);
  }

  /**
   * High-fidelity 300 DPI browser-based Canvas to PDF generator.
   * Preloads exact Google Fonts (Great Vibes, Alex Brush, Playfair Display, Cinzel, JetBrains Mono, etc.)
   * and stamps them into an official uncompressed vector PDF wrapper.
   */
  private async generateCertificatePdfFromCanvas(
    template: Template,
    data: CertificateRenderData
  ): Promise<Uint8Array> {
    const unit = template.pageUnit || 'mm';
    const pageWidthPt = unitToPoints(template.pageWidth, unit);
    const pageHeightPt = unitToPoints(template.pageHeight, unit);

    let targetWidth: number;
    let targetHeight: number;

    if (unit === 'px' || template.pageWidth > 500) {
      const maxDim = Math.max(template.pageWidth, template.pageHeight);
      const pxScale = maxDim > 3000 ? 3000 / maxDim : (maxDim < 1400 ? 2500 / maxDim : 2);
      targetWidth = Math.round(template.pageWidth * pxScale);
      targetHeight = Math.round(template.pageHeight * pxScale);
    } else if (unit === 'in') {
      targetWidth = Math.round(template.pageWidth * 300);
      targetHeight = Math.round(template.pageHeight * 300);
    } else {
      // mm (Standard A4: 210 x 297 mm -> 2480 x 3508 px at 300 DPI)
      const pxPerMm = 300 / 25.4;
      targetWidth = Math.round(template.pageWidth * pxPerMm);
      targetHeight = Math.round(template.pageHeight * pxPerMm);
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not initialize 2D canvas context');

    const fields = template.fieldConfiguration || [];

    // 1. Ensure all custom Google Fonts have resolved before rasterization
    if (typeof document !== 'undefined' && document.fonts) {
      try {
        await document.fonts.ready;
        const fontNames = Array.from(
          new Set(fields.map((f) => f.fontFamily).filter(Boolean))
        );
        for (const fName of fontNames) {
          try {
            await document.fonts.load(`16px "${fName}"`);
            await document.fonts.load(`bold 16px "${fName}"`);
            await document.fonts.load(`48px "${fName}"`);
            await document.fonts.load(`bold 48px "${fName}"`);
          } catch {
            // graceful fallback
          }
        }
        await document.fonts.ready;
      } catch (e) {
        // Font loading API fallback
      }
    }

    // 2. Render Background Image or Institutional Warm Ivory Parchment
    let backgroundDrawn = false;
    if (template.backgroundUrl) {
      try {
        const bgImg = await this.loadSafeImage(template.backgroundUrl);
        ctx.drawImage(bgImg, 0, 0, targetWidth, targetHeight);
        backgroundDrawn = true;
      } catch (err) {
        console.warn('[PdfEngine] Failed to load background image for canvas:', err);
      }
    }

    if (!backgroundDrawn) {
      ctx.fillStyle = '#FAF8F5';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      const outerInset = Math.round(18 * (targetHeight / 1000));
      ctx.strokeStyle = '#C49A45';
      ctx.lineWidth = Math.max(2, Math.round(2 * (targetHeight / 1000)));
      ctx.strokeRect(outerInset, outerInset, targetWidth - outerInset * 2, targetHeight - outerInset * 2);

      const innerInset = Math.round(24 * (targetHeight / 1000));
      ctx.lineWidth = Math.max(1, Math.round(0.75 * (targetHeight / 1000)));
      ctx.strokeRect(innerInset, innerInset, targetWidth - innerInset * 2, targetHeight - innerInset * 2);
    }

    // 3. Render Elements with True High-DPI Font Kerning & Script Curves
    const scaleX = targetWidth / template.pageWidth;
    const scaleY = targetHeight / template.pageHeight;

    for (const field of fields) {
      if (field.fontSize === 0 && field.type !== 'qr_code' && field.type !== 'signatory') {
        continue;
      }

      const x = field.x * scaleX;
      const y = field.y * scaleY;
      const width = field.width * scaleX;
      const height = field.height * scaleY;

      // QR Code
      if (field.type === 'qr_code') {
        if (data.verificationUrl) {
          try {
            const qrDataUrl = await QRCode.toDataURL(data.verificationUrl, {
              errorCorrectionLevel: 'M',
              margin: 1,
              width: Math.min(width, height) * 2,
              color: {
                dark: '#1B1622',
                light: '#00000000',
              },
            });
            const qrImg = await this.loadSafeImage(qrDataUrl);
            const size = Math.min(width, height);
            const drawX = x + (width - size) / 2;
            const drawY = y + (height - size) / 2;
            ctx.drawImage(qrImg, drawX, drawY, size, size);
          } catch (err) {
            console.warn('[PdfEngine] Failed to draw QR code on canvas:', err);
          }
        }
        continue;
      }

      // Signatory
      if (field.type === 'signatory') {
        const sigIndex = this.getEffectiveSignatoryIndex(field, fields);
        const sig = data.signatories?.[sigIndex];
        if (sig?.signatureAssetUrl) {
          try {
            const sigImg = await this.loadSafeImage(sig.signatureAssetUrl);
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
          } catch (err) {
            console.warn('[PdfEngine] Failed to draw signature on canvas:', err);
          }
        }
        continue;
      }

      // Text fields
      const textValue = this.resolveFieldValue(field, data, fields);
      if (!textValue) continue;

      this.drawCanvasFieldText(ctx, {
        field,
        text: textValue,
        x,
        y,
        width,
        height,
        targetHeight,
        templatePageHeight: template.pageHeight,
      });
    }

    // 4. Export High-Resolution PNG & Embed into PDF Wrapper
    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!pngBlob) throw new Error('Failed to generate PNG blob from canvas');
    const pngBuffer = await pngBlob.arrayBuffer();
    const pngBytes = new Uint8Array(pngBuffer);

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);
    const embeddedImg = await pdfDoc.embedPng(pngBytes);

    page.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: pageWidthPt,
      height: pageHeightPt,
    });

    // 5. Overlay Invisible Selectable Text Layer (for clipboard copy and PDF accessibility)
    try {
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      for (const field of fields) {
        if (field.fontSize === 0) continue;
        if (field.type === 'qr_code' || field.type === 'signatory') continue;
        const textValue = this.resolveFieldValue(field, data, fields);
        if (!textValue) continue;

        const xPt = unitToPoints(field.x, unit);
        const yPt = unitToPoints(field.y, unit);
        const heightPt = unitToPoints(field.height, unit);
        const pdfBottomY = pageHeightPt - yPt - heightPt;
        const fontSizePt = unit === 'px' ? unitToPoints(field.fontSize ?? 18, 'px') : (field.fontSize ?? 14);

        page.drawText(textValue, {
          x: xPt,
          y: Math.max(0, pdfBottomY + (heightPt - fontSizePt) / 2),
          size: Math.max(4, Math.min(fontSizePt, 36)),
          font: helvetica,
          opacity: 0,
        });
      }
    } catch {
      // Non-critical invisible layer fallback
    }

    return await pdfDoc.save();
  }

  /**
   * Safe image loader that eliminates CORS canvas-tainting issues.
   */
  private async loadSafeImage(url: string): Promise<HTMLImageElement> {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    let srcToUse = url;
    let objectUrlToRevoke: string | null = null;

    try {
      if (
        !url.startsWith('data:') &&
        !url.startsWith('blob:') &&
        (url.startsWith('http:') || url.startsWith('https:'))
      ) {
        const resp = await fetch(url);
        if (resp.ok) {
          const blob = await resp.blob();
          srcToUse = URL.createObjectURL(blob);
          objectUrlToRevoke = srcToUse;
        }
      }
    } catch {
      // Fallback directly to url
    }

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (err) => reject(err);
      img.src = srcToUse;
    });

    if (objectUrlToRevoke) {
      setTimeout(() => URL.revokeObjectURL(objectUrlToRevoke!), 2000);
    }

    return img;
  }

  /**
   * Renders styled canvas text with exact typography, fallback categories, and line wrapping.
   */
  private drawCanvasFieldText(
    ctx: CanvasRenderingContext2D,
    params: {
      field: TemplateFieldConfig;
      text: string;
      x: number;
      y: number;
      width: number;
      height: number;
      targetHeight: number;
      templatePageHeight: number;
    }
  ) {
    const { field, text, x, y, width, height, targetHeight, templatePageHeight } = params;
    if (field.fontSize === 0) return;

    const rawFam = (field.fontFamily || 'Inter').trim();
    const famLower = rawFam.toLowerCase();
    let fallbackCategory = 'sans-serif';
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
      fallbackCategory = 'Georgia, serif';
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
    let fontSize = Math.max(8, Math.round((field.fontSize / templatePageHeight) * targetHeight * 0.95));

    ctx.fillStyle = field.color || '#1B1622';
    ctx.textBaseline = 'middle';
    ctx.textAlign = (field.alignment as CanvasTextAlign) || 'center';

    let anchorX = x + width / 2;
    if (field.alignment === 'left') anchorX = x;
    if (field.alignment === 'right') anchorX = x + width;

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
        ctx.font = `${fontStyle}${fontWeight} ${fontSize}px ${fontFamily}`;
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
      let metrics = ctx.measureText(text);
      while (metrics.width > width && fontSize > 10) {
        fontSize -= 1;
        ctx.font = `${fontStyle}${fontWeight} ${fontSize}px ${fontFamily}`;
        metrics = ctx.measureText(text);
      }
      ctx.fillText(text, anchorX, y + height / 2);
    }
  }

  /**
   * Fallback pure vector pdf-lib renderer for non-browser / headless execution.
   */
  async generateCertificatePdfVector(
    template: Template,
    data: CertificateRenderData
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();

    // Standard A4 dimensions or custom
    const unit = template.pageUnit || 'mm';
    const pageWidthPt = unitToPoints(template.pageWidth, unit);
    const pageHeightPt = unitToPoints(template.pageHeight, unit);

    const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);

    // Embed fonts
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const timesRomanItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
    const courier = await pdfDoc.embedFont(StandardFonts.Courier);
    const courierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

    // 1. Render Background
    await this.renderBackground(pdfDoc, page, template.backgroundUrl, pageWidthPt, pageHeightPt);

    // 2. Render Dynamic Fields
    const fields = template.fieldConfiguration || [];
    for (const field of fields) {
      try {
        await this.renderField({
          pdfDoc,
          page,
          field,
          allFields: fields,
          data,
          unit,
          pageHeightPt,
          fonts: {
            helvetica,
            helveticaBold,
            timesRoman,
            timesRomanBold,
            timesRomanItalic,
            courier,
            courierBold,
          },
        });
      } catch (err) {
        console.warn(`[PdfEngine] Error rendering field "${field.name}":`, err);
      }
    }

    return await pdfDoc.save();
  }

  /**
   * Fetches and embeds background artwork with graceful fallback.
   */
  private async renderBackground(
    pdfDoc: PDFDocument,
    page: PDFPage,
    backgroundUrl: string,
    widthPt: number,
    heightPt: number
  ) {
    let backgroundLoaded = false;

    if (backgroundUrl) {
      try {
        const urlToFetch = backgroundUrl.startsWith('data:') ? backgroundUrl : encodeURI(backgroundUrl);
        const response = await fetch(urlToFetch);
        if (response.ok) {
          const imageBytes = await response.arrayBuffer();
          const isPng =
            backgroundUrl.toLowerCase().includes('.png') ||
            new Uint8Array(imageBytes.slice(0, 8)).every((b, i) => [137, 80, 78, 71, 13, 10, 26, 10][i] === b);

          let embeddedImage;
          if (isPng) {
            embeddedImage = await pdfDoc.embedPng(imageBytes);
          } else {
            embeddedImage = await pdfDoc.embedJpg(imageBytes);
          }

          page.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: widthPt,
            height: heightPt,
          });
          backgroundLoaded = true;
        }
      } catch (err) {
        console.warn('[PdfEngine] Could not load background image from URL, falling back to institutional canvas:', err);
      }
    }

    // Fallback dignified Warm Ivory parchment background with gold border
    if (!backgroundLoaded) {
      // Warm Ivory fill
      page.drawRectangle({
        x: 0,
        y: 0,
        width: widthPt,
        height: heightPt,
        color: rgb(0.976, 0.969, 0.957), // #F9F7F4
      });

      // Gold border
      const inset = 18;
      page.drawRectangle({
        x: inset,
        y: inset,
        width: widthPt - inset * 2,
        height: heightPt - inset * 2,
        borderColor: rgb(0.635, 0.482, 0.173), // #A27B2C
        borderWidth: 2,
      });

      // Thin inner border
      const innerInset = 24;
      page.drawRectangle({
        x: innerInset,
        y: innerInset,
        width: widthPt - innerInset * 2,
        height: heightPt - innerInset * 2,
        borderColor: rgb(0.635, 0.482, 0.173),
        borderWidth: 0.5,
      });
    }
  }

  /**
   * Helper to disambiguate signatory slots if multiple signatory fields share index 0 / undefined.
   */
  private getEffectiveSignatoryIndex(
    field: TemplateFieldConfig,
    allFields?: TemplateFieldConfig[]
  ): number {
    if (!allFields) return field.signatoryIndex || 0;
    const sameTypeFields = allFields.filter((f) => f.type === field.type);
    if (sameTypeFields.length <= 1) {
      return field.signatoryIndex || 0;
    }

    const indices = sameTypeFields.map((f) => f.signatoryIndex);
    const distinct = new Set(indices.filter((idx) => idx !== undefined && idx !== null));
    if (distinct.size === sameTypeFields.length && !indices.includes(undefined)) {
      return field.signatoryIndex || 0;
    }

    const sorted = [...sameTypeFields].sort((a, b) => a.x - b.x);
    const positionIndex = sorted.findIndex((f) => f.id === field.id);
    return positionIndex >= 0 ? positionIndex : (field.signatoryIndex || 0);
  }

  /**
   * Renders a single dynamic field based on canonical coordinates and styling.
   */
  private async renderField(params: {
    pdfDoc: PDFDocument;
    page: PDFPage;
    field: TemplateFieldConfig;
    allFields?: TemplateFieldConfig[];
    data: CertificateRenderData;
    unit: 'mm' | 'px' | 'in';
    pageHeightPt: number;
    fonts: {
      helvetica: PDFFont;
      helveticaBold: PDFFont;
      timesRoman: PDFFont;
      timesRomanBold: PDFFont;
      timesRomanItalic: PDFFont;
      courier: PDFFont;
      courierBold: PDFFont;
    };
  }) {
    const { pdfDoc, page, field, allFields, data, unit, pageHeightPt, fonts } = params;

    const xPt = unitToPoints(field.x, unit);
    const yPt = unitToPoints(field.y, unit);
    const widthPt = unitToPoints(field.width, unit);
    const heightPt = unitToPoints(field.height, unit);

    // In PDF coordinates, origin (0, 0) is at bottom-left
    const pdfBottomY = pageHeightPt - yPt - heightPt;

    // 1. QR Code
    if (field.type === 'qr_code') {
      await this.renderQrCode(pdfDoc, page, data.verificationUrl, xPt, pdfBottomY, widthPt, heightPt);
      return;
    }

    // 2. Signatory Signature Image (with smart disambiguation)
    if (field.type === 'signatory') {
      const sigIndex = this.getEffectiveSignatoryIndex(field, allFields);
      const sig = data.signatories?.[sigIndex];
      if (sig?.signatureAssetUrl) {
        await this.renderSignatureImage(pdfDoc, page, sig.signatureAssetUrl, xPt, pdfBottomY, widthPt, heightPt);
      }
      return;
    }

    // 3. Text Fields
    const textValue = this.resolveFieldValue(field, data, allFields);
    if (!textValue) return;

    // If font size is 0, do not draw text (allows hiding or muting field)
    if (field.fontSize === 0) return;

    // Select font family and weight
    const isBold = field.fontWeight === 'bold' || String(field.fontWeight) === '700';
    let font = fonts.helvetica;
    const fam = (field.fontFamily || '').toLowerCase();
    if (
      fam.includes('times') ||
      fam.includes('serif') ||
      fam.includes('playfair') ||
      fam.includes('cinzel') ||
      fam.includes('garamond') ||
      fam.includes('merriweather') ||
      fam.includes('bodoni') ||
      fam.includes('lora')
    ) {
      font = isBold ? fonts.timesRomanBold : fonts.timesRoman;
    } else if (
      fam.includes('script') ||
      fam.includes('vibes') ||
      fam.includes('brush') ||
      fam.includes('pinyon') ||
      fam.includes('dancing') ||
      fam.includes('parisienne') ||
      fam.includes('allura') ||
      fam.includes('montecarlo')
    ) {
      font = fonts.timesRomanItalic;
    } else if (
      fam.includes('courier') ||
      fam.includes('mono') ||
      fam.includes('jetbrains')
    ) {
      font = isBold ? fonts.courierBold : fonts.courier;
    } else {
      font = isBold ? fonts.helveticaBold : fonts.helvetica;
    }

    let fontSize = unit === 'px' ? unitToPoints(field.fontSize ?? 18, 'px') : (field.fontSize ?? 14);
    if (fontSize <= 0) return;
    const textColor = parseHexColor(field.color || '#1B1622');

    // For achievement, long descriptions, or wrap overflow behavior: wrap lines!
    const shouldWrap =
      field.type === 'achievement' ||
      field.overflowBehavior === 'wrap' ||
      (textValue.length > 55 && heightPt > fontSize * 1.8);

    if (shouldWrap) {
      // Multiline wrapping with graceful font scaling
      let currentFontSize = fontSize;
      let lines = wrapText(textValue, font, currentFontSize, widthPt);
      let lineHeight = currentFontSize * 1.35;
      let totalHeight = lines.length * lineHeight;

      // If text block exceeds heightPt, scale font size down smoothly
      while (totalHeight > heightPt && currentFontSize > 9) {
        currentFontSize -= 0.5;
        lines = wrapText(textValue, font, currentFontSize, widthPt);
        lineHeight = currentFontSize * 1.35;
        totalHeight = lines.length * lineHeight;
      }

      // Vertical center in bounding box
      let currentY = pdfBottomY + heightPt - (heightPt - totalHeight) / 2 - currentFontSize + 2;

      for (const line of lines) {
        const lineWidth = font.widthOfTextAtSize(line, currentFontSize);
        let drawX = xPt;
        if (field.alignment === 'center') {
          drawX = xPt + (widthPt - lineWidth) / 2;
        } else if (field.alignment === 'right') {
          drawX = xPt + widthPt - lineWidth;
        }

        page.drawText(line, {
          x: drawX,
          y: currentY,
          size: currentFontSize,
          font,
          color: textColor,
        });

        currentY -= lineHeight;
      }
    } else {
      // Single line with shrink behavior
      const initialWidth = font.widthOfTextAtSize(textValue, fontSize);
      if (initialWidth > widthPt && initialWidth > 0) {
        fontSize = Math.max(8, Math.floor((widthPt / initialWidth) * fontSize));
      }
      const finalWidth = font.widthOfTextAtSize(textValue, fontSize);
      let drawX = xPt;
      if (field.alignment === 'center') {
        drawX = xPt + (widthPt - finalWidth) / 2;
      } else if (field.alignment === 'right') {
        drawX = xPt + widthPt - finalWidth;
      }

      // Vertical center alignment in box
      const drawY = pdfBottomY + (heightPt - fontSize) / 2 + 2;
      page.drawText(textValue, {
        x: drawX,
        y: drawY,
        size: fontSize,
        font,
        color: textColor,
      });
    }
  }

  /**
   * Resolves field string representation.
   */
  private resolveFieldValue(
    field: TemplateFieldConfig,
    data: CertificateRenderData,
    allFields?: TemplateFieldConfig[]
  ): string {
    switch (field.type) {
      case 'recipient_name':
        return data.recipientName || '';
      case 'event_name':
        return data.eventName || '';
      case 'achievement':
        return data.achievement || '';
      case 'position':
        return data.position || '';
      case 'date':
        return data.issueDate || '';
      case 'organization_name':
        return data.organizationName || '';
      case 'verification_code':
        return data.verificationCode || '';
      case 'signatory_name': {
        const sigIndex = this.getEffectiveSignatoryIndex(field, allFields);
        const sig = data.signatories?.[sigIndex];
        return sig?.name || '';
      }
      case 'signatory_designation': {
        const sigIndex = this.getEffectiveSignatoryIndex(field, allFields);
        const sig = data.signatories?.[sigIndex];
        return sig?.designation || '';
      }
      case 'static_text':
        return field.staticTextContent || field.name || '';
      default:
        return '';
    }
  }

  /**
   * Renders verification QR Code image.
   */
  private async renderQrCode(
    pdfDoc: PDFDocument,
    page: PDFPage,
    verificationUrl: string,
    xPt: number,
    pdfBottomY: number,
    widthPt: number,
    heightPt: number
  ) {
    if (!verificationUrl) return;

    try {
      const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 300,
        color: {
          dark: '#1B1622',
          light: '#00000000', // transparent background
        },
      });

      const qrBytes = await (await fetch(qrDataUrl)).arrayBuffer();
      const qrImage = await pdfDoc.embedPng(qrBytes);

      // Preserve square aspect ratio inside box
      const size = Math.min(widthPt, heightPt);
      const drawX = xPt + (widthPt - size) / 2;
      const drawY = pdfBottomY + (heightPt - size) / 2;

      page.drawImage(qrImage, {
        x: drawX,
        y: drawY,
        width: size,
        height: size,
      });
    } catch (err) {
      console.warn('[PdfEngine] Failed to generate QR code in PDF:', err);
    }
  }

  /**
   * Renders signature image preserving aspect ratio.
   */
  private async renderSignatureImage(
    pdfDoc: PDFDocument,
    page: PDFPage,
    signatureUrl: string,
    xPt: number,
    pdfBottomY: number,
    widthPt: number,
    heightPt: number
  ) {
    try {
      const urlToFetch = signatureUrl.startsWith('data:') ? signatureUrl : encodeURI(signatureUrl);
      const response = await fetch(urlToFetch);
      if (!response.ok) return;

      const bytes = await response.arrayBuffer();
      const isPng =
        signatureUrl.toLowerCase().includes('.png') ||
        new Uint8Array(bytes.slice(0, 8)).every((b, i) => [137, 80, 78, 71, 13, 10, 26, 10][i] === b);

      let image;
      if (isPng) {
        image = await pdfDoc.embedPng(bytes);
      } else {
        image = await pdfDoc.embedJpg(bytes);
      }

      // Calculate aspect-ratio fit
      const imgAspect = image.width / image.height;
      const boxAspect = widthPt / heightPt;

      let drawWidth = widthPt;
      let drawHeight = heightPt;

      if (imgAspect > boxAspect) {
        drawWidth = widthPt;
        drawHeight = widthPt / imgAspect;
      } else {
        drawHeight = heightPt;
        drawWidth = heightPt * imgAspect;
      }

      const drawX = xPt + (widthPt - drawWidth) / 2;
      const drawY = pdfBottomY + (heightPt - drawHeight) / 2;

      page.drawImage(image, {
        x: drawX,
        y: drawY,
        width: drawWidth,
        height: drawHeight,
      });
    } catch (err) {
      console.warn('[PdfEngine] Failed to render signature image in PDF:', err);
    }
  }
}

export const pdfEngine = new CertificatePdfEngine();

/**
 * Triggers a browser file download of the generated PDF.
 */
export function downloadPdfBlob(pdfBytes: Uint8Array, filename: string) {
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Creates an object URL for previewing the PDF in an iframe or viewer.
 */
export function createPdfPreviewUrl(pdfBytes: Uint8Array): string {
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
}

export const PRODUCTION_PORTAL_URL = 'https://certificate-generator-liart-pi.vercel.app';

/**
 * Resolves the public portal base URL used for certificate verification links and QR codes.
 * Ensures localhost / 127.0.0.1 is not baked into verification QR codes on generated certificates.
 */
export function getVerificationOrigin(customOrigin?: string): string {
  if (customOrigin && customOrigin.trim()) {
    return customOrigin.trim().replace(/\/+$/, '');
  }

  // 1. Explicit environment variable configuration
  const envUrl = (import.meta.env.VITE_PUBLIC_PORTAL_URL || '').trim().replace(/\/+$/, '');
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }

  // 2. Current window origin if running on a live public domain
  if (typeof window !== 'undefined' && window.location.origin) {
    const windowOrigin = window.location.origin.trim().replace(/\/+$/, '');
    if (!windowOrigin.includes('localhost') && !windowOrigin.includes('127.0.0.1')) {
      return windowOrigin;
    }
  }

  // 3. Fallback to production Vercel portal
  return PRODUCTION_PORTAL_URL;
}

/**
 * Generates a full PDF binary from a persisted certificate snapshot details object.
 */
export async function generatePdfFromDetails(
  details: CertificateDetails,
  verificationOrigin?: string
): Promise<Uint8Array> {
  const { certificate, templateSnapshot, signatorySnapshot } = details;
  const origin = getVerificationOrigin(verificationOrigin);
  const verificationUrl = `${origin}/verify/${certificate.verificationCode}`;

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
    recipientName: certificate.recipientName,
    eventName: certificate.eventName,
    achievement: certificate.achievement,
    issueDate: certificate.issueDate,
    organizationName: certificate.organizationName,
    verificationCode: certificate.verificationCode,
    verificationUrl,
    signatories: (signatorySnapshot || []).map((s) => ({
      name: s.name,
      designation: s.designation,
      signatureAssetUrl: s.signatureAssetUrl,
    })),
  };

  return await pdfEngine.generateCertificatePdf(template, renderData);
}
