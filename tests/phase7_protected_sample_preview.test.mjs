import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

test('Protected Sample Preview: ProtectedCertificateModal Component Architecture', () => {
  const modalPath = path.join(projectRoot, 'src/components/admin/ProtectedCertificateModal.tsx');
  assert.ok(fs.existsSync(modalPath), 'ProtectedCertificateModal.tsx must exist');

  const content = fs.readFileSync(modalPath, 'utf-8');

  // 1. Anti-Copy and Screenshot Protection Requirements
  assert.ok(
    content.includes('onContextMenu={handleContextMenu}'),
    'Modal must intercept contextmenu to prevent right-click and save/open in new tab'
  );
  assert.ok(
    content.includes("userSelect: 'none'"),
    'Modal must prevent text and asset selection'
  );
  assert.ok(
    content.includes('onDragStart='),
    'Modal must prevent drag-out of rendered certificate'
  );
  assert.ok(
    content.includes('<canvas'),
    'Modal must render to HTML5 Canvas element (not an openable img tag)'
  );
  assert.ok(
    content.includes('Top Transparent Protection Shield Overlay') || content.includes('z-30 select-none cursor-default'),
    'Modal must provide a protective shield overlay blocking direct media interaction'
  );

  // 2. Keyboard Shortcut Interception
  assert.ok(
    content.includes("['s', 'p', 'c', 'u'].includes(e.key.toLowerCase())"),
    'Modal must trap Ctrl+S, Ctrl+P, and other copy/save keyboard shortcuts'
  );

  // 3. Watermark Protection Requirements
  assert.ok(
    content.includes('drawCanvasWatermarks'),
    'Modal must burn indelible security watermarks directly into the canvas pixels'
  );
  assert.ok(
    content.includes('SAMPLE CERTIFICATE • PREVIEW ONLY • NOT VALID FOR OFFICIAL USE'),
    'Modal must stamp repeated diagonal security watermarks'
  );
  assert.ok(
    content.includes('SAMPLE PREVIEW • NOT FOR OFFICIAL USE'),
    'Modal must draw prominent central watermark banner'
  );
  assert.ok(
    content.includes('sample-watermark-pattern'),
    'Modal must provide secondary floating SVG watermark overlay pattern'
  );

  // 4. "Without Code to be Seen" Requirement
  assert.ok(
    content.includes("field.type === 'verification_code'"),
    'Modal must inspect verification_code field'
  );
  assert.ok(
    content.includes('if (hideCode) {') && content.includes('continue;'),
    'Modal must suppress verification code when hideCode is true'
  );
  assert.ok(
    content.includes("field.type === 'qr_code'"),
    'Modal must inspect qr_code field'
  );
});

test('Protected Sample Preview: IssueCertificateModal Integration without Forced PDF Download', () => {
  const modalPath = path.join(projectRoot, 'src/components/admin/IssueCertificateModal.tsx');
  const content = fs.readFileSync(modalPath, 'utf-8');

  // Verify import of ProtectedCertificateModal
  assert.ok(
    content.includes('ProtectedCertificateModal'),
    'IssueCertificateModal must import ProtectedCertificateModal'
  );

  // Verify that handlePreviewPdf opens on-screen modal instead of downloading PDF
  assert.ok(
    content.includes('setIsSamplePreviewOpen(true)'),
    'handlePreviewPdf must open on-screen sample preview'
  );
  assert.ok(
    content.includes("verificationCode: ''"),
    'Sample preview data must suppress verification code ("without code to be seen")'
  );

  // Official PDF download must still be preserved for issued certificates
  assert.ok(
    content.includes('downloadPdfBlob(pdfBytes,'),
    'Official PDF download must remain present when certificate is successfully issued'
  );

  // Button label informs user of on-screen preview
  assert.ok(
    content.includes('Preview Sample (On-Screen)'),
    'Button label must indicate on-screen preview'
  );
});

test('Protected Sample Preview: TemplateStudioPage Parity and Security', () => {
  const studioPath = path.join(projectRoot, 'src/pages/admin/TemplateStudioPage.tsx');
  const content = fs.readFileSync(studioPath, 'utf-8');

  // Verify import of ProtectedCertificateModal in Studio
  assert.ok(
    content.includes('ProtectedCertificateModal'),
    'TemplateStudioPage must import ProtectedCertificateModal'
  );

  // Verify Protected Sample button in toolbar
  assert.ok(
    content.includes('Protected Sample'),
    'TemplateStudioPage must include Protected Sample button in toolbar'
  );

  // Verify watermarks and code suppression in studio sample preview mode
  assert.ok(
    content.includes('studio-sample-watermark'),
    'Studio preview mode must render security watermark pattern'
  );
  assert.ok(
    content.includes("case 'verification_code':") && content.includes("previewText = '';"),
    'Studio preview mode must suppress verification code ("without code to be seen")'
  );
});
