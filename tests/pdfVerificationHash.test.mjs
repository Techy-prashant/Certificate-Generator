import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('Hash #pdf Feature: Migration file for public certificate details RPC exists and has SECURITY DEFINER', () => {
  const migrationPath = path.join(
    rootDir,
    'supabase',
    'migrations',
    '20261026000002_public_certificate_details_rpc.sql'
  );
  assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');

  const content = fs.readFileSync(migrationPath, 'utf-8');
  assert.ok(
    content.includes('CREATE OR REPLACE FUNCTION public.get_certificate_public_details'),
    'Must define get_certificate_public_details'
  );
  assert.ok(
    content.includes('SECURITY DEFINER'),
    'Must specify SECURITY DEFINER for anon access'
  );
  assert.ok(
    content.includes("c.status = 'issued'"),
    'Must restrict to issued certificates only'
  );
  assert.ok(
    content.includes('GRANT EXECUTE ON FUNCTION public.get_certificate_public_details(TEXT) TO anon, authenticated'),
    'Must grant execute to anon and authenticated'
  );
});

test('Hash #pdf Feature: apiInterface includes getCertificatePublicDetails', () => {
  const apiPath = path.join(rootDir, 'src', 'services', 'apiInterface.ts');
  const content = fs.readFileSync(apiPath, 'utf-8');
  assert.ok(
    content.includes('getCertificatePublicDetails(code: string): Promise<CertificateDetails | null>'),
    'apiInterface.ts must declare getCertificatePublicDetails'
  );
});

test('Hash #pdf Feature: supabaseService implements getCertificatePublicDetails with fallback', () => {
  const servicePath = path.join(rootDir, 'src', 'services', 'supabaseService.ts');
  const content = fs.readFileSync(servicePath, 'utf-8');
  assert.ok(
    content.includes('async getCertificatePublicDetails(code: string)'),
    'supabaseService.ts must implement getCertificatePublicDetails'
  );
  assert.ok(
    content.includes("client.rpc('get_certificate_public_details'"),
    'supabaseService.ts must call get_certificate_public_details RPC'
  );
  assert.ok(
    content.includes('synthesizePublicCertificateDetails'),
    'supabaseService.ts must synthesize details if remote DB has not yet applied custom RPC'
  );
});

test('Hash #pdf Feature: mockApiService implements getCertificatePublicDetails', () => {
  const mockServicePath = path.join(rootDir, 'src', 'services', 'mockApiService.ts');
  const content = fs.readFileSync(mockServicePath, 'utf-8');
  assert.ok(
    content.includes('async getCertificatePublicDetails(code: string)'),
    'mockApiService.ts must implement getCertificatePublicDetails'
  );
});

test('Hash #pdf Feature: mockData contains verification code 643926', () => {
  const mockDataPath = path.join(rootDir, 'src', 'services', 'mockData.ts');
  const content = fs.readFileSync(mockDataPath, 'utf-8');
  assert.ok(
    content.includes("'643926'"),
    'mockData.ts should contain verification code 643926 for instant testing'
  );
});

test('Hash #pdf Feature: VerifyPage listens to #pdf hash and generates vector PDF with interactive viewer', () => {
  const verifyPagePath = path.join(rootDir, 'src', 'pages', 'public', 'VerifyPage.tsx');
  const content = fs.readFileSync(verifyPagePath, 'utf-8');
  assert.ok(
    content.includes("location.hash.toLowerCase() === '#pdf'"),
    'VerifyPage must detect #pdf hash from URL'
  );
  assert.ok(
    content.includes('generatePdfFromDetails'),
    'VerifyPage must call generatePdfFromDetails'
  );
  assert.ok(
    content.includes('createPdfPreviewUrl'),
    'VerifyPage must generate object URL for embedded preview'
  );
  assert.ok(
    content.includes('<iframe'),
    'VerifyPage must render embedded iframe viewer for the PDF'
  );
  assert.ok(
    content.includes('handleDownloadPdf'),
    'VerifyPage must provide direct download handler'
  );
  assert.ok(
    content.includes('handleOpenInNewTab'),
    'VerifyPage must provide open in new tab handler'
  );
  assert.ok(
    content.includes('replaceState'),
    'VerifyPage must update URL hash smoothly via window.history.replaceState'
  );
});
