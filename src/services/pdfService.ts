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

export class CertificatePdfEngine {
  /**
   * Generates a verifiable, high-precision vector PDF document from a template configuration and certificate payload.
   *
   * @param template - Active template schema including orientation, dimensions, and element coordinates
   * @param data - Recipient, event, 6-digit verification code, and signatory details to stamp
   * @returns Binary Uint8Array representation of the generated PDF document
   * @throws Will throw if font embedding or document creation fails critically
   */
  async generateCertificatePdf(
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
          data,
          unit,
          pageHeightPt,
          fonts: {
            helvetica,
            helveticaBold,
            timesRoman,
            timesRomanBold,
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
   * Renders a single dynamic field based on canonical coordinates and styling.
   */
  private async renderField(params: {
    pdfDoc: PDFDocument;
    page: PDFPage;
    field: TemplateFieldConfig;
    data: CertificateRenderData;
    unit: 'mm' | 'px' | 'in';
    pageHeightPt: number;
    fonts: {
      helvetica: PDFFont;
      helveticaBold: PDFFont;
      timesRoman: PDFFont;
      timesRomanBold: PDFFont;
      courier: PDFFont;
      courierBold: PDFFont;
    };
  }) {
    const { pdfDoc, page, field, data, unit, pageHeightPt, fonts } = params;

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

    // 2. Signatory Signature Image
    if (field.type === 'signatory') {
      const sigIndex = field.signatoryIndex || 0;
      const sig = data.signatories?.[sigIndex];
      if (sig?.signatureAssetUrl) {
        await this.renderSignatureImage(pdfDoc, page, sig.signatureAssetUrl, xPt, pdfBottomY, widthPt, heightPt);
      }
      return;
    }

    // 3. Text Fields
    const textValue = this.resolveFieldValue(field, data);
    if (!textValue) return;

    // Select font family and weight
    const isBold = field.fontWeight === 'bold' || String(field.fontWeight) === '700';
    let font = fonts.helvetica;
    const fam = (field.fontFamily || '').toLowerCase();
    if (fam.includes('times') || fam.includes('serif')) {
      font = isBold ? fonts.timesRomanBold : fonts.timesRoman;
    } else if (fam.includes('courier') || fam.includes('mono')) {
      font = isBold ? fonts.courierBold : fonts.courier;
    } else {
      font = isBold ? fonts.helveticaBold : fonts.helvetica;
    }

    let fontSize = unit === 'px' ? unitToPoints(field.fontSize || 18, 'px') : (field.fontSize || 14);
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
  private resolveFieldValue(field: TemplateFieldConfig, data: CertificateRenderData): string {
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
        const sig = data.signatories?.[field.signatoryIndex || 0];
        return sig?.name || '';
      }
      case 'signatory_designation': {
        const sig = data.signatories?.[field.signatoryIndex || 0];
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
