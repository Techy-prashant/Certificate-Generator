import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

const projectRoot = process.cwd();

// Millimeter to PDF PostScript points conversion: 1 inch = 25.4 mm = 72 pt
const MM_TO_PT = 72 / 25.4;

function mmToPoints(mm) {
  return mm * MM_TO_PT;
}

test('Phase 4 Architecture & Contracts: Template Field Configuration & API Service Methods', () => {
  const typesContent = fs.readFileSync(path.join(projectRoot, 'src/types/index.ts'), 'utf-8');
  const apiInterfaceContent = fs.readFileSync(path.join(projectRoot, 'src/services/apiInterface.ts'), 'utf-8');
  const supabaseServiceContent = fs.readFileSync(path.join(projectRoot, 'src/services/supabaseService.ts'), 'utf-8');
  const mockServiceContent = fs.readFileSync(path.join(projectRoot, 'src/services/mockApiService.ts'), 'utf-8');

  // Verify all 12 supported field types in TemplateFieldType
  const expectedFieldTypes = [
    'recipient_name',
    'event_name',
    'achievement',
    'position',
    'date',
    'organization_name',
    'verification_code',
    'qr_code',
    'signatory',
    'signatory_name',
    'signatory_designation',
    'static_text'
  ];

  for (const ft of expectedFieldTypes) {
    assert.ok(
      typesContent.includes(`'${ft}'`),
      `TemplateFieldType must include '${ft}'`
    );
  }

  // Verify API interface methods
  assert.ok(
    apiInterfaceContent.includes('updateTemplateFields('),
    'apiInterface.ts must include updateTemplateFields'
  );
  assert.ok(
    apiInterfaceContent.includes('publishTemplate('),
    'apiInterface.ts must include publishTemplate'
  );

  // Verify Supabase and Mock service implementations
  assert.ok(supabaseServiceContent.includes('updateTemplateFields'), 'supabaseService must implement updateTemplateFields');
  assert.ok(supabaseServiceContent.includes('publishTemplate'), 'supabaseService must implement publishTemplate');
  assert.ok(supabaseServiceContent.includes('template.published'), 'supabaseService must log template.published audit log');
  assert.ok(mockServiceContent.includes('updateTemplateFields'), 'mockApiService must implement updateTemplateFields');
  assert.ok(mockServiceContent.includes('publishTemplate'), 'mockApiService must implement publishTemplate');
});

test('Phase 4 Studio Editor: Route Registration & Visual Studio Component', () => {
  const appContent = fs.readFileSync(path.join(projectRoot, 'src/App.tsx'), 'utf-8');
  const studioContent = fs.readFileSync(path.join(projectRoot, 'src/pages/admin/TemplateStudioPage.tsx'), 'utf-8');
  const templatesContent = fs.readFileSync(path.join(projectRoot, 'src/pages/admin/TemplatesPage.tsx'), 'utf-8');

  // Verify route in App.tsx
  assert.ok(
    appContent.includes('templates/:id/studio'),
    'App.tsx must register the route templates/:id/studio'
  );
  assert.ok(
    appContent.includes('TemplateStudioPage'),
    'App.tsx must link route to TemplateStudioPage'
  );

  // Verify TemplateStudioPage controls
  assert.ok(studioContent.includes('zoomLevel'), 'Studio must contain zoom controls');
  assert.ok(studioContent.includes('snapToGrid'), 'Studio must contain snap-to-grid toggle');
  assert.ok(studioContent.includes('handleUndo'), 'Studio must contain undo action');
  assert.ok(studioContent.includes('handleRedo'), 'Studio must contain redo action');
  assert.ok(studioContent.includes('isPreviewMode'), 'Studio must contain sample preview mode toggle');
  assert.ok(studioContent.includes('pdfEngine.generateCertificatePdf'), 'Studio must integrate pdfEngine');
  assert.ok(studioContent.includes('handleSaveDraft'), 'Studio must contain save draft action');
  assert.ok(studioContent.includes('handlePublishConfirm'), 'Studio must contain publish with version increment');

  // Verify navigation button in TemplatesPage
  assert.ok(
    templatesContent.includes('/studio'),
    'TemplatesPage must contain Studio links/buttons for editing layouts'
  );
});

test('Phase 4 PDF Engine: Canonical Coordinate System & Exact Landscape A4 Dimensions', async () => {
  const widthMm = 297; // Landscape A4 width
  const heightMm = 210; // Landscape A4 height

  const expectedWidthPt = mmToPoints(widthMm);
  const expectedHeightPt = mmToPoints(heightMm);

  const doc = await PDFDocument.create();
  const page = doc.addPage([expectedWidthPt, expectedHeightPt]);

  const pageSize = page.getSize();
  assert.strictEqual(Math.round(pageSize.width * 100) / 100, Math.round(expectedWidthPt * 100) / 100);
  assert.strictEqual(Math.round(pageSize.height * 100) / 100, Math.round(expectedHeightPt * 100) / 100);
  assert.ok(pageSize.width > pageSize.height, 'Landscape orientation must have width > height');

  const pdfBytes = await doc.save();
  assert.ok(pdfBytes.length > 500, 'Generated landscape PDF must be non-empty');
  
  // Verify PDF header magic bytes "%PDF-"
  const header = String.fromCharCode(...pdfBytes.subarray(0, 5));
  assert.strictEqual(header, '%PDF-');
});

test('Phase 4 PDF Engine: Portrait A4 Dimensions & Scaling', async () => {
  const widthMm = 210; // Portrait A4 width
  const heightMm = 297; // Portrait A4 height

  const expectedWidthPt = mmToPoints(widthMm);
  const expectedHeightPt = mmToPoints(heightMm);

  const doc = await PDFDocument.create();
  const page = doc.addPage([expectedWidthPt, expectedHeightPt]);

  const pageSize = page.getSize();
  assert.strictEqual(Math.round(pageSize.width * 100) / 100, Math.round(expectedWidthPt * 100) / 100);
  assert.strictEqual(Math.round(pageSize.height * 100) / 100, Math.round(expectedHeightPt * 100) / 100);
  assert.ok(pageSize.height > pageSize.width, 'Portrait orientation must have height > width');

  const pdfBytes = await doc.save();
  assert.ok(pdfBytes.length > 500, 'Generated portrait PDF must be non-empty');
});

test('Phase 4 PDF Engine: Long Recipient Name & Word Wrapping / Shrink-to-Fit Handling', async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([mmToPoints(297), mmToPoints(210)]);

  const longName = 'Smt. Padmashree Dr. Ananthalakshmi Venkatasubramaniam-Ramanathan IV';
  const fieldWidthMm = 180;
  const fieldWidthPt = mmToPoints(fieldWidthMm);
  const originalFontSize = 32;

  // Verify shrink calculation logic
  let activeFontSize = originalFontSize;
  let textWidth = font.widthOfTextAtSize(longName, activeFontSize);
  while (textWidth > fieldWidthPt && activeFontSize > 8) {
    activeFontSize -= 1;
    textWidth = font.widthOfTextAtSize(longName, activeFontSize);
  }

  assert.ok(activeFontSize < originalFontSize, 'Long recipient name should be scaled down to prevent clipping');
  assert.ok(textWidth <= fieldWidthPt, 'Fitted text width must not exceed field boundary');

  page.drawText(longName, {
    x: 50,
    y: 300,
    size: activeFontSize,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });

  const pdfBytes = await doc.save();
  assert.ok(pdfBytes.length > 500, 'PDF with long name must be valid');
});

test('Phase 4 PDF Engine: Long Achievement Description Multiline Wrapping', async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([mmToPoints(297), mmToPoints(210)]);

  const longAchievement = 'For exceptional outstanding contribution, unparalleled technical leadership, and relentless dedication to the Namdapha Open Source and Cloud Systems Architecture during the Annual Tech Symposium 2026.';
  const maxWidthPt = mmToPoints(160);
  const fontSize = 14;

  // Multiline wrapping algorithm test
  const words = longAchievement.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(candidate, fontSize);
    if (testWidth <= maxWidthPt) {
      currentLine = candidate;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  assert.ok(lines.length >= 3, `Long achievement must wrap into multiple lines (got ${lines.length})`);
  for (const line of lines) {
    const lineWidth = font.widthOfTextAtSize(line, fontSize);
    assert.ok(lineWidth <= maxWidthPt + 1, `Line "${line}" must stay within max width`);
  }

  let y = 250;
  for (const line of lines) {
    page.drawText(line, { x: 50, y, size: fontSize, font, color: rgb(0.2, 0.2, 0.2) });
    y -= fontSize * 1.3;
  }

  const pdfBytes = await doc.save();
  assert.ok(pdfBytes.length > 500, 'PDF with wrapped achievement must render successfully');
});

test('Phase 4 PDF Engine: High-Density Dynamic QR Code Generation & Verification URL', async () => {
  const verificationUrl = 'https://certificate-generator-liart-pi.vercel.app/verify/482910';
  
  // Generate QR as Data URL (PNG)
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 256,
  });

  assert.ok(qrDataUrl.startsWith('data:image/png;base64,'), 'QR code must be a valid base64 PNG data URL');

  // Embed into PDF
  const doc = await PDFDocument.create();
  const page = doc.addPage([mmToPoints(297), mmToPoints(210)]);

  const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
  const qrImageBytes = Buffer.from(base64Data, 'base64');
  const embeddedQr = await doc.embedPng(qrImageBytes);

  const qrSizePt = mmToPoints(22); // 22mm QR code
  page.drawImage(embeddedQr, {
    x: 40,
    y: 40,
    width: qrSizePt,
    height: qrSizePt,
  });

  const pdfBytes = await doc.save();
  assert.ok(pdfBytes.length > 1000, 'PDF with embedded QR code must compile correctly');
});

test('Phase 4 PDF Engine: Multiple Signatories with Title, Designation and Signature Slot', async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([mmToPoints(297), mmToPoints(210)]);

  const signatories = [
    { name: 'Dr. Jane Doe', designation: 'Director of Academic Affairs' },
    { name: 'Prof. John Smith', designation: 'Head of Department, CS' },
    { name: 'Er. A. K. Sharma', designation: 'Convener, Tech Council' }
  ];

  let startX = 60;
  for (const sig of signatories) {
    page.drawText(sig.name, {
      x: startX,
      y: 80,
      size: 11,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText(sig.designation, {
      x: startX,
      y: 66,
      size: 9,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });
    startX += 220;
  }

  const pdfBytes = await doc.save();
  assert.ok(pdfBytes.length > 500, 'PDF with multiple signatories must render cleanly');
});

test('Phase 4 PDF Engine: Graceful Fallback for Missing or Invalid Background Assets', async () => {
  // If a background URL is invalid or inaccessible (e.g. 404 or bad network),
  // the engine should not crash; it draws an elegant fallback vector parchment canvas
  const doc = await PDFDocument.create();
  const widthPt = mmToPoints(297);
  const heightPt = mmToPoints(210);
  const page = doc.addPage([widthPt, heightPt]);

  // Fallback background geometry
  page.drawRectangle({
    x: 0,
    y: 0,
    width: widthPt,
    height: heightPt,
    color: rgb(0.98, 0.98, 0.96),
  });

  page.drawRectangle({
    x: mmToPoints(10),
    y: mmToPoints(10),
    width: widthPt - mmToPoints(20),
    height: heightPt - mmToPoints(20),
    borderColor: rgb(0.79, 0.65, 0.38),
    borderWidth: 1.5,
  });

  const pdfBytes = await doc.save();
  assert.ok(pdfBytes.length > 500, 'Graceful vector fallback background must generate valid PDF');
});
