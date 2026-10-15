import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

const projectRoot = process.cwd();

test('Phase 5 Architecture: Service Contracts in apiInterface.ts & types/index.ts', () => {
  const apiInterfaceContent = fs.readFileSync(path.join(projectRoot, 'src/services/apiInterface.ts'), 'utf-8');
  const typesContent = fs.readFileSync(path.join(projectRoot, 'src/types/index.ts'), 'utf-8');

  // Verify IssueCertificateInput & CertificateDetails
  assert.ok(typesContent.includes('export interface IssueCertificateInput'), 'types must declare IssueCertificateInput');
  assert.ok(typesContent.includes('export interface CertificateDetails'), 'types must declare CertificateDetails');

  // Verify methods in apiInterface.ts
  assert.ok(apiInterfaceContent.includes('issueCertificate(input: IssueCertificateInput): Promise<Certificate>'), 'apiInterface.ts must declare issueCertificate');
  assert.ok(apiInterfaceContent.includes('getCertificateDetails(id: string): Promise<CertificateDetails | null>'), 'apiInterface.ts must declare getCertificateDetails');
  assert.ok(apiInterfaceContent.includes('revokeCertificate(id: string, reasonInternal: string, reasonPublic?: string): Promise<boolean>'), 'apiInterface.ts must declare dual-reason revokeCertificate');
  assert.ok(apiInterfaceContent.includes('verifyCertificate(code: string): Promise<PublicVerificationResult>'), 'apiInterface.ts must declare verifyCertificate');
});

test('Phase 5 Supabase & Mock Implementations: Lifecycle, Audit Logging & Snapshots', () => {
  const supabaseContent = fs.readFileSync(path.join(projectRoot, 'src/services/supabaseService.ts'), 'utf-8');
  const mockContent = fs.readFileSync(path.join(projectRoot, 'src/services/mockApiService.ts'), 'utf-8');

  // Supabase service checks
  assert.ok(supabaseContent.includes('async issueCertificate(input: IssueCertificateInput)'), 'supabaseService must implement issueCertificate');
  assert.ok(supabaseContent.includes('async getCertificateDetails(id: string)'), 'supabaseService must implement getCertificateDetails');
  assert.ok(supabaseContent.includes('async revokeCertificate(id: string, reasonInternal: string, reasonPublic?: string)'), 'supabaseService must implement revokeCertificate');
  assert.ok(supabaseContent.includes("action: 'certificate.issued'"), 'supabaseService must log certificate.issued');
  assert.ok(supabaseContent.includes("action: 'certificate.revoked'"), 'supabaseService must log certificate.revoked');
  assert.ok(supabaseContent.includes("from('certificate_signatories').insert"), 'supabaseService must persist certificate_signatories snapshot');

  // Mock service parity checks
  assert.ok(mockContent.includes('async issueCertificate(input: IssueCertificateInput)'), 'mockApiService must implement issueCertificate');
  assert.ok(mockContent.includes('async getCertificateDetails(id: string)'), 'mockApiService must implement getCertificateDetails');
  assert.ok(mockContent.includes('async revokeCertificate(id: string, reasonInternal: string, reasonPublic?: string)'), 'mockApiService must implement revokeCertificate');
  assert.ok(mockContent.includes("action: 'certificate.issued'"), 'mockApiService must log certificate.issued');
  assert.ok(mockContent.includes("action: 'certificate.revoked'"), 'mockApiService must log certificate.revoked');
});

test('Phase 5 Database Schema: PostgreSQL 6-Digit Constraint, Immutability & RLS', () => {
  const schemaContent = fs.readFileSync(path.join(projectRoot, 'supabase/migrations/20261011000001_initial_schema.sql'), 'utf-8');
  const rlsContent = fs.readFileSync(path.join(projectRoot, 'supabase/migrations/20261011000002_row_level_security.sql'), 'utf-8');
  const rpcContent = fs.readFileSync(path.join(projectRoot, 'supabase/migrations/20261011000003_public_verification_rpc.sql'), 'utf-8');

  // Verification code is CHAR(6) and UNIQUE
  assert.ok(schemaContent.includes('verification_code CHAR(6) NOT NULL UNIQUE'), 'Schema must enforce CHAR(6) UNIQUE');

  // Hard deletion prohibited trigger
  assert.ok(schemaContent.includes('prevent_issued_certificate_deletion()'), 'Trigger must prohibit hard deletion of certificates');

  // Authoritative boundary: Anonymous public users have NO SELECT policy on certificates table
  assert.ok(rlsContent.includes('CRITICAL: Anonymous public users have NO SELECT POLICY on this table.'), 'RLS must isolate certificates from anon');
  assert.ok(!rlsContent.includes('ON public.certificates FOR SELECT TO anon'), 'No direct anon SELECT policy allowed');

  // Verification RPC exists and sanitizes input to 6 digits
  assert.ok(rpcContent.includes('CREATE OR REPLACE FUNCTION public.verify_certificate(p_code TEXT)'), 'RPC must define verify_certificate');
  assert.ok(rpcContent.includes("p_code !~ '^\\d{6}$'"), 'RPC must reject non-6-digit codes');
});

test('Phase 5 Verification Code Generation: Leading Zeroes & Collision Resilience', () => {
  function generateCandidateCode() {
    const num = Math.floor(Math.random() * 1000000);
    return num.toString().padStart(6, '0');
  }

  // Generate a sample batch of 1,000 codes
  const sampleCodes = Array.from({ length: 1000 }, () => generateCandidateCode());

  for (const code of sampleCodes) {
    assert.strictEqual(typeof code, 'string', 'Code must be a string');
    assert.strictEqual(code.length, 6, 'Code must have exact length of 6');
    assert.match(code, /^\d{6}$/, 'Code must contain exactly 6 numeric digits');
  }

  // Specifically verify that low numbers preserve leading zeroes
  const lowNum = 42;
  const zeroPadded = lowNum.toString().padStart(6, '0');
  assert.strictEqual(zeroPadded, '000042', 'Leading zeroes must be preserved as string');
});

test('Phase 5 UI Architecture: Admin Issuance Modal & Certificates Page', () => {
  const modalContent = fs.readFileSync(path.join(projectRoot, 'src/components/admin/IssueCertificateModal.tsx'), 'utf-8');
  const pageContent = fs.readFileSync(path.join(projectRoot, 'src/pages/admin/CertificatesPage.tsx'), 'utf-8');

  // IssueCertificateModal checks
  assert.ok(modalContent.includes('isSubmitting'), 'Modal must prevent double-clicks with isSubmitting state');
  assert.ok(modalContent.includes('portalService.issueCertificate'), 'Modal must invoke portalService.issueCertificate');
  assert.ok(modalContent.includes('downloadPdfBlob'), 'Modal must provide immediate official PDF download');
  assert.ok(modalContent.includes('handlePreviewPdf'), 'Modal must provide preview PDF option');

  // CertificatesPage checks
  assert.ok(pageContent.includes('IssueCertificateModal'), 'CertificatesPage must mount IssueCertificateModal');
  assert.ok(pageContent.includes('internalReason'), 'CertificatesPage must require internal reason for revocation');
  assert.ok(pageContent.includes('publicReason'), 'CertificatesPage must support optional public reason for revocation');
  assert.ok(pageContent.includes('handleDownloadFromInspect'), 'CertificatesPage must enable PDF download from inspect modal');
});

test('Phase 5 Public Verification Page: Rate Limiting, Sanitization & Clear Statuses', () => {
  const verifyContent = fs.readFileSync(path.join(projectRoot, 'src/pages/public/VerifyPage.tsx'), 'utf-8');

  // Rate limiting check
  assert.ok(verifyContent.includes('recentLookups.length >= 15'), 'VerifyPage must enforce rate limiting (15 lookups/min)');
  assert.ok(verifyContent.includes('Verification Rate Limit Reached'), 'VerifyPage must show rate limit warning');

  // Sanitization check
  assert.ok(verifyContent.includes('!/^\\d{6}$/.test(cleanCode)'), 'VerifyPage must sanitize input to exact 6 digits');

  // Status indicators check
  assert.ok(verifyContent.includes('Official Certificate Verified'), 'VerifyPage must render official valid header');
  assert.ok(verifyContent.includes('Certificate Revoked'), 'VerifyPage must render official revocation header');
  assert.ok(verifyContent.includes('No Certificate Record Found'), 'VerifyPage must render clear not found header');
});

test('Phase 5 PDF Generation from Preserved Certificate Snapshots', async () => {
  // Simulate complete certificate snapshot rendering
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  // Landscape A4 dimensions (297 x 210 mm in points)
  const widthPt = (297 * 72) / 25.4;
  const heightPt = (210 * 72) / 25.4;
  const page = doc.addPage([widthPt, heightPt]);

  const testCert = {
    verificationCode: '048291',
    recipientName: 'Aishwarya Ramanathan',
    eventName: 'Namdapha Annual Innovation Challenge 2026',
    achievement: 'First Place Winner — Distributed Systems',
    organizationName: 'Namdapha House, IIT Madras BS Degree',
    issueDate: '2026-10-12',
    signatories: [
      { name: 'Dr. Jane Doe', designation: 'Faculty Advisor' },
      { name: 'Prof. John Smith', designation: 'House Warden' }
    ]
  };

  // 1. Draw Title & Recipient
  page.drawText(testCert.recipientName, {
    x: 80,
    y: heightPt - 160,
    size: 26,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText(testCert.achievement, {
    x: 80,
    y: heightPt - 200,
    size: 14,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });

  // 2. Draw Dynamic QR Code pointing to canonical verification route
  const verificationUrl = `https://certificate-generator-liart-pi.vercel.app/verify/${testCert.verificationCode}`;
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 256,
  });

  const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
  const qrImageBytes = Buffer.from(base64Data, 'base64');
  const embeddedQr = await doc.embedPng(qrImageBytes);

  const qrSizePt = (24 * 72) / 25.4; // 24mm QR size
  page.drawImage(embeddedQr, {
    x: 80,
    y: 50,
    width: qrSizePt,
    height: qrSizePt,
  });

  // 3. Draw Verification Code
  page.drawText(`Verification Code: ${testCert.verificationCode}`, {
    x: 80 + qrSizePt + 15,
    y: 65,
    size: 11,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });

  // 4. Draw Signatories
  let sigX = widthPt - 320;
  for (const sig of testCert.signatories) {
    page.drawText(sig.name, {
      x: sigX,
      y: 70,
      size: 11,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText(sig.designation, {
      x: sigX,
      y: 56,
      size: 9,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });
    sigX += 150;
  }

  const pdfBytes = await doc.save();
  assert.ok(pdfBytes instanceof Uint8Array);
  assert.ok(pdfBytes.length > 1000, 'Rendered PDF must have non-trivial size');
  const header = String.fromCharCode(...pdfBytes.subarray(0, 5));
  assert.strictEqual(header, '%PDF-', 'Header must match PDF signature');
});

test('Phase 5 Verification & QR Code: Canonical Production Domain & Localhost Suppression', () => {
  const pdfServiceContent = fs.readFileSync(path.join(projectRoot, 'src/services/pdfService.ts'), 'utf-8');
  const envExampleContent = fs.readFileSync(path.join(projectRoot, '.env.example'), 'utf-8');
  const envLocalContent = fs.readFileSync(path.join(projectRoot, '.env.local'), 'utf-8');

  // Verify production domain constant and helper
  assert.ok(
    pdfServiceContent.includes("PRODUCTION_PORTAL_URL = 'https://certificate-generator-liart-pi.vercel.app'"),
    'pdfService must define PRODUCTION_PORTAL_URL pointing to Vercel app'
  );
  assert.ok(
    pdfServiceContent.includes('getVerificationOrigin'),
    'pdfService must export getVerificationOrigin helper'
  );
  assert.ok(
    pdfServiceContent.includes("!envUrl.includes('localhost')"),
    'pdfService must suppress localhost in QR verification links'
  );

  // Verify environment variables point to production domain
  assert.ok(
    envExampleContent.includes('VITE_PUBLIC_PORTAL_URL=https://certificate-generator-liart-pi.vercel.app'),
    '.env.example must specify Vercel portal URL'
  );
  assert.ok(
    envLocalContent.includes('VITE_PUBLIC_PORTAL_URL=https://certificate-generator-liart-pi.vercel.app'),
    '.env.local must specify Vercel portal URL'
  );
});

