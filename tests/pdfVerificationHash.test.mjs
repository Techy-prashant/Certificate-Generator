import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('Public Verification: Migration file for public certificate details RPC exists and has SECURITY DEFINER', () => {
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

test('Public Verification: apiInterface includes getCertificatePublicDetails', () => {
  const apiPath = path.join(rootDir, 'src', 'services', 'apiInterface.ts');
  const content = fs.readFileSync(apiPath, 'utf-8');
  assert.ok(
    content.includes('getCertificatePublicDetails(code: string): Promise<CertificateDetails | null>'),
    'apiInterface.ts must declare getCertificatePublicDetails'
  );
});

test('Public Verification: supabaseService implements getCertificatePublicDetails with fallback', () => {
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

test('Public Verification: mockApiService implements getCertificatePublicDetails', () => {
  const mockServicePath = path.join(rootDir, 'src', 'services', 'mockApiService.ts');
  const content = fs.readFileSync(mockServicePath, 'utf-8');
  assert.ok(
    content.includes('async getCertificatePublicDetails(code: string)'),
    'mockApiService.ts must implement getCertificatePublicDetails'
  );
});

test('Public Verification: mockData contains verification code 643926', () => {
  const mockDataPath = path.join(rootDir, 'src', 'services', 'mockData.ts');
  const content = fs.readFileSync(mockDataPath, 'utf-8');
  assert.ok(
    content.includes("'643926'"),
    'mockData.ts should contain verification code 643926 for instant testing'
  );
});

test('Security & Verification: VerifyPage presents pure authoritative record without vulnerable PDF viewer or downloads', () => {
  const verifyPagePath = path.join(rootDir, 'src', 'pages', 'public', 'VerifyPage.tsx');
  const content = fs.readFileSync(verifyPagePath, 'utf-8');
  assert.ok(
    !content.includes('<iframe'),
    'VerifyPage must NOT render embedded iframe viewer to prevent PDF injection'
  );
  assert.ok(
    !content.includes('handleDownloadPdf'),
    'VerifyPage must NOT include PDF download handler to prevent forgery vulnerabilities'
  );
  assert.ok(
    content.includes('Official Certificate Verified'),
    'VerifyPage must render official verified status banner'
  );
  assert.ok(
    content.includes('result.recipientName'),
    'VerifyPage must render recipient name'
  );
  assert.ok(
    content.includes('handlePrint'),
    'VerifyPage must support printing/saving the official verification record'
  );
});

test('Automatic Google Sheets Sync: Syncs row without #pdf hash and handles browser CORS redirect', () => {
  const sheetsServicePath = path.join(rootDir, 'src', 'services', 'googleSheetsService.ts');
  const content = fs.readFileSync(sheetsServicePath, 'utf-8');

  assert.ok(
    !content.includes('#pdf'),
    'googleSheetsService must not append #pdf to spreadsheet mirror URLs'
  );
  assert.ok(
    content.includes("mode: 'no-cors'"),
    'googleSheetsService must include no-cors fallback for browser Google Apps Script redirects'
  );
  assert.ok(
    content.includes('AKfycbwIpX-Jk5umjawv0kz_acjOf3R2vocOzI_4rr-Lt0l7Zd5_sKaUmJBBDufvCpL-8Zh0tA'),
    'googleSheetsService must configure official locked Apps Script webhook URL'
  );
});

test('Automatic Google Sheets Sync: supabaseService and mockApiService await sync on issuance', () => {
  const supabasePath = path.join(rootDir, 'src', 'services', 'supabaseService.ts');
  const mockPath = path.join(rootDir, 'src', 'services', 'mockApiService.ts');

  const supabaseContent = fs.readFileSync(supabasePath, 'utf-8');
  const mockContent = fs.readFileSync(mockPath, 'utf-8');

  assert.ok(
    supabaseContent.includes("googleSheetsService.syncCertificate(certResult, 'insert')"),
    'supabaseService must sync certificate on issue'
  );
  assert.ok(
    mockContent.includes("googleSheetsService.syncCertificate(newCert, 'insert')"),
    'mockApiService must sync certificate on issue'
  );
});
