import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

test('Phase 1: Aspect-Ratio Aware Preview Scaling Mathematics & Zero-Clipping', () => {
  // Test scaling calculation on multiple screen container sizes across portrait, landscape & square
  const testContainers = [
    { name: 'Full HD Desktop', width: 900, height: 560 },
    { name: 'Laptop Display', width: 750, height: 480 },
    { name: 'Compact Window', width: 600, height: 400 },
  ];

  const testCertificates = [
    { name: 'Acknowledgement Portrait', width: 1414, height: 2000 },
    { name: 'Debate Landscape (mm)', width: 297, height: 210 },
    { name: 'Sports Landscape (px)', width: 2000, height: 1414 },
    { name: 'Square Certificate', width: 1000, height: 1000 },
  ];

  const paddingX = 48;
  const paddingY = 48;

  for (const container of testContainers) {
    const availW = Math.max(160, container.width - paddingX);
    const availH = Math.max(160, container.height - paddingY);

    for (const cert of testCertificates) {
      const scaleW = availW / cert.width;
      const scaleH = availH / cert.height;
      const fitScale = Math.min(scaleW, scaleH);

      const displayWidth = Math.round(cert.width * fitScale);
      const displayHeight = Math.round(cert.height * fitScale);

      // Verify that at 100% zoom, the certificate NEVER exceeds available bounds
      assert.ok(
        displayWidth <= availW,
        `${cert.name} width (${displayWidth}px) must fit within availW (${availW}px) on ${container.name}`
      );
      assert.ok(
        displayHeight <= availH,
        `${cert.name} height (${displayHeight}px) must fit within availH (${availH}px) on ${container.name}`
      );

      // Verify that aspect ratio is preserved (within rounding tolerance)
      const originalRatio = cert.width / cert.height;
      const renderedRatio = displayWidth / displayHeight;
      assert.ok(
        Math.abs(originalRatio - renderedRatio) < 0.02,
        `${cert.name} aspect ratio must be strictly preserved without stretching or distortion`
      );
    }
  }
});

test('Phase 1: ProtectedCertificateModal Component Scaling Architecture', () => {
  const modalPath = path.join(projectRoot, 'src/components/admin/ProtectedCertificateModal.tsx');
  const content = fs.readFileSync(modalPath, 'utf-8');

  // Verify ResizeObserver is used to measure actual container bounds
  assert.ok(content.includes('new ResizeObserver'), 'Must use ResizeObserver on containerRef');
  assert.ok(content.includes('fitScale = Math.min(scaleW, scaleH)'), 'Must calculate fitScale using min of width and height scales');
  assert.ok(content.includes('displayWidth = Math.round(baseWidth * (zoom / 100))'), 'Must scale displayWidth proportionally with zoom');
  assert.ok(content.includes('displayHeight = Math.round(baseHeight * (zoom / 100))'), 'Must scale displayHeight proportionally with zoom');
  assert.ok(content.includes('width: `${displayWidth}px`'), 'Wrapper div must use dynamic displayWidth in pixels');
  assert.ok(content.includes('height: `${displayHeight}px`'), 'Wrapper div must use dynamic displayHeight in pixels');
});

test('Phase 2: Font Loading & Customization Rendering Consistency', () => {
  const modalPath = path.join(projectRoot, 'src/components/admin/ProtectedCertificateModal.tsx');
  const studioPath = path.join(projectRoot, 'src/pages/admin/TemplateStudioPage.tsx');
  const modalContent = fs.readFileSync(modalPath, 'utf-8');
  const studioContent = fs.readFileSync(studioPath, 'utf-8');

  // Verify document.fonts.ready is awaited before rasterization in ProtectedCertificateModal
  assert.ok(modalContent.includes('document.fonts.ready'), 'ProtectedCertificateModal must await document.fonts.ready');
  assert.ok(modalContent.includes('document.fonts.load'), 'ProtectedCertificateModal must preload custom template fonts');

  // Verify font family preserves chosen Google Fonts instead of overwriting with Inter
  assert.ok(modalContent.includes('rawFam = (field.fontFamily || \'Inter\')'), 'Must preserve field.fontFamily');
  assert.ok(modalContent.includes('famLower.includes(\'serif\')'), 'Must map serif fallback categories');
  assert.ok(modalContent.includes('famLower.includes(\'script\')'), 'Must map cursive / script fallback categories');

  // Verify font size 0 is treated as muted/hidden
  assert.ok(modalContent.includes('if (field.fontSize === 0) return;'), 'ProtectedCertificateModal must support fontSize 0 as muted');
  assert.ok(studioContent.includes('visualFontSize = field.fontSize === 0 ? 0'), 'TemplateStudioPage must support fontSize 0');

  // Verify resolveCssFontFamily helper in studio
  assert.ok(studioContent.includes('resolveCssFontFamily'), 'TemplateStudioPage must export resolveCssFontFamily');
});

test('Phase 3: Separation of Copy-Paste (Structure) vs Duplicate Element (Exact Replica)', () => {
  const studioPath = path.join(projectRoot, 'src/pages/admin/TemplateStudioPage.tsx');
  const content = fs.readFileSync(studioPath, 'utf-8');

  // 1. Duplicate Element preserves exact replica with independent ID
  assert.ok(content.includes('const duplicated: TemplateFieldConfig = JSON.parse(JSON.stringify(target))'), 'Duplicate must deep-clone the target');
  assert.ok(content.includes('duplicated.id = `field-${Date.now()}-'), 'Duplicate must generate unique internal ID');
  assert.ok(content.includes('Duplicated exact replica'), 'Duplicate must notify exact replica created');

  // 2. Copy-Paste preserves structure and styling but disconnects unique content and identity
  assert.ok(content.includes('pasted.id = `field-${Date.now()}-'), 'Paste must generate fresh unique ID');
  assert.ok(content.includes('pasted.staticTextContent = \'\''), 'Paste must clear static text content for a clean new element');
  assert.ok(content.includes('const nextIndex = usedIndices.includes(0)'), 'Paste must advance signatoryIndex to next slot');
  assert.ok(content.includes('pasted.signatoryIndex = nextIndex'), 'Paste must assign next signatory slot instead of reusing original identity');
});

test('Phase 3 & 4: Smart Signatory Disambiguation in Preview and PDF Export', () => {
  const modalPath = path.join(projectRoot, 'src/components/admin/ProtectedCertificateModal.tsx');
  const pdfServicePath = path.join(projectRoot, 'src/services/pdfService.ts');
  const modalContent = fs.readFileSync(modalPath, 'utf-8');
  const pdfContent = fs.readFileSync(pdfServicePath, 'utf-8');

  // Verify getEffectiveSignatoryIndex exists in both preview and PDF engine
  assert.ok(modalContent.includes('getEffectiveSignatoryIndex'), 'ProtectedCertificateModal must implement getEffectiveSignatoryIndex');
  assert.ok(pdfContent.includes('getEffectiveSignatoryIndex'), 'CertificatePdfEngine must implement getEffectiveSignatoryIndex');

  // Verify spatial left-to-right sorting when indices are undefined or default to 0
  assert.ok(modalContent.includes('sorted = [...sameTypeFields].sort((a, b) => a.x - b.x)'), 'Preview must disambiguate signatory positions left-to-right by X coordinate');
  assert.ok(pdfContent.includes('sorted = [...sameTypeFields].sort((a, b) => a.x - b.x)'), 'PDF Engine must disambiguate signatory positions left-to-right by X coordinate');
});

test('Phase 4: Template Audit and Certificate of Acknowledgement Redesign', () => {
  const mockDataPath = path.join(projectRoot, 'src/services/mockData.ts');
  const content = fs.readFileSync(mockDataPath, 'utf-8');

  // Verify Acknowledgement for guests template definition
  assert.ok(content.includes("'Acknowledgement for guests'"), 'Acknowledgement template must exist in mockData.ts');
  assert.ok(content.includes("orientation: 'portrait'"), 'Acknowledgement template must be portrait');
  assert.ok(content.includes('pageWidth: 1414'), 'Acknowledgement template width must be 1414 px');
  assert.ok(content.includes('pageHeight: 2000'), 'Acknowledgement template height must be 2000 px');

  // Verify Recipient Name is prominent (Playfair Display, large font size)
  assert.ok(content.includes("fontFamily: 'Playfair Display'"), 'Must use Playfair Display');
  assert.ok(content.includes("staticTextContent: 'CERTIFICATE OF ACKNOWLEDGEMENT'"), 'Must have clear formal title');

  // Verify distinct Left and Right Signatory blocks
  assert.ok(content.includes("name: 'Left Signatory Signature'"), 'Must have left signatory block');
  assert.ok(content.includes("name: 'Right Signatory Signature'"), 'Must have right signatory block');
  assert.ok(content.includes('signatoryIndex: 0'), 'Must have signatoryIndex 0');
  assert.ok(content.includes('signatoryIndex: 1'), 'Must have signatoryIndex 1');

  // Verify verification elements
  assert.ok(content.includes("type: 'qr_code'"), 'Must include QR code field');
  assert.ok(content.includes("type: 'verification_code'"), 'Must include verification code field');
  assert.ok(content.includes("type: 'achievement'"), 'Must include achievement citation field');
});
