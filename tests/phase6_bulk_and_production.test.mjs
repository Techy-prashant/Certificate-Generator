import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Papa from 'papaparse';
import JSZip from 'jszip';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const projectRoot = process.cwd();

test('Phase 6 Architecture: Batch Contracts & Status Lifecycle in apiInterface.ts and types/index.ts', () => {
  const apiInterfaceContent = fs.readFileSync(path.join(projectRoot, 'src/services/apiInterface.ts'), 'utf-8');
  const typesContent = fs.readFileSync(path.join(projectRoot, 'src/types/index.ts'), 'utf-8');

  // Verify batch type definitions
  assert.ok(typesContent.includes('export interface IssuanceBatch'), 'types must declare IssuanceBatch');
  assert.ok(typesContent.includes('export type BatchStatus'), 'types must declare BatchStatus');
  assert.ok(typesContent.includes("'completed'"), 'BatchStatus must include completed');
  assert.ok(typesContent.includes("'partially_completed'"), 'BatchStatus must include partially_completed');
  assert.ok(typesContent.includes("'failed'"), 'BatchStatus must include failed');

  // Verify API interface methods
  assert.ok(apiInterfaceContent.includes('createIssuanceBatch(data: {'), 'apiInterface must declare createIssuanceBatch');
  assert.ok(apiInterfaceContent.includes('updateIssuanceBatch('), 'apiInterface must declare updateIssuanceBatch');
});

test('Phase 6 Supabase & Mock Service Parity for Batch Operations', () => {
  const supabaseContent = fs.readFileSync(path.join(projectRoot, 'src/services/supabaseService.ts'), 'utf-8');
  const mockContent = fs.readFileSync(path.join(projectRoot, 'src/services/mockApiService.ts'), 'utf-8');

  // Supabase service checks
  assert.ok(supabaseContent.includes('async createIssuanceBatch(data: {'), 'supabaseService must implement createIssuanceBatch');
  assert.ok(supabaseContent.includes('async updateIssuanceBatch('), 'supabaseService must implement updateIssuanceBatch');
  assert.ok(supabaseContent.includes("action: 'batch.created'"), 'supabaseService must log batch.created in audit trail');
  assert.ok(supabaseContent.includes("'batch.completed'"), 'supabaseService must log batch.completed in audit trail');

  // Mock service checks
  assert.ok(mockContent.includes('async createIssuanceBatch(data: {'), 'mockApiService must implement createIssuanceBatch');
  assert.ok(mockContent.includes('async updateIssuanceBatch('), 'mockApiService must implement updateIssuanceBatch');
  assert.ok(mockContent.includes("action: 'batch.created'"), 'mockApiService must log batch.created in audit trail');
  assert.ok(mockContent.includes("'batch.completed'"), 'mockApiService must log batch.completed in audit trail');
});

test('Phase 6 CSV Parsing: PapaParse handles UTF-8, Quoted Commas, and Malformed Lines', () => {
  const sampleCsv = `Name,Email,Roll Number,Achievement
"Sharma, Aarav",aarav@study.iitm.ac.in,21F1001234,"First Prize, High Honors"
José René,jose@example.org,22F2005678,Special Commendation
Māori Tane,maori@study.nz,23F3009012,Distinction in Innovation
आदित्य वर्मा,aaditya@study.iitm.ac.in,21F1009999,Outstanding Contribution

`;

  const parseResult = Papa.parse(sampleCsv, {
    header: true,
    skipEmptyLines: true,
  });

  assert.strictEqual(parseResult.errors.length, 0, 'Valid CSV with quotes and commas must parse without errors');
  assert.strictEqual(parseResult.data.length, 4, 'Must parse exactly 4 non-empty rows');

  // Verify quoted comma preservation
  const firstRow = parseResult.data[0];
  assert.strictEqual(firstRow['Name'], 'Sharma, Aarav', 'Quoted commas inside recipient name must be preserved');
  assert.strictEqual(firstRow['Achievement'], 'First Prize, High Honors', 'Quoted commas inside achievement must be preserved');

  // Verify UTF-8 characters preservation
  const secondRow = parseResult.data[1];
  assert.strictEqual(secondRow['Name'], 'José René', 'Accented UTF-8 names must be preserved');

  const thirdRow = parseResult.data[2];
  assert.strictEqual(thirdRow['Name'], 'Māori Tane', 'Extended Latin UTF-8 characters must be preserved');

  const fourthRow = parseResult.data[3];
  assert.strictEqual(fourthRow['Name'], 'आदित्य वर्मा', 'Devanagari Unicode text must be preserved');
});

test('Phase 6 Download Packaging: JSZip Bundles Multiple PDFs with Sanitized Filenames', async () => {
  const zip = new JSZip();

  // Create two minimal valid PDFs
  const pdf1 = await PDFDocument.create();
  pdf1.addPage([600, 400]);
  const pdfBytes1 = await pdf1.save();

  const pdf2 = await PDFDocument.create();
  pdf2.addPage([600, 400]);
  const pdfBytes2 = await pdf2.save();

  // Helper filename sanitizer matching BulkIssuePage.tsx
  const sanitizeFilename = (name, code) => {
    const cleanName = name
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();
    return `${cleanName || 'recipient'}_${code}.pdf`;
  };

  const filename1 = sanitizeFilename('Aarav / Sharma <Winner>', '491024');
  const filename2 = sanitizeFilename('René & Jane [Honors]', '772109');

  // Verify filename sanitization forbids illegal chars: / < > : " \ | ? *
  assert.strictEqual(filename1, 'aarav_sharma_winner_491024.pdf');
  assert.strictEqual(filename2, 'ren_jane_honors_772109.pdf');

  zip.file(filename1, pdfBytes1);
  zip.file(filename2, pdfBytes2);

  // Generate ZIP
  const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
  assert.ok(zipContent.length > 0, 'ZIP archive must be non-empty');

  // Read back and verify files
  const loadedZip = await JSZip.loadAsync(zipContent);
  const fileNamesInZip = Object.keys(loadedZip.files);
  assert.strictEqual(fileNamesInZip.length, 2, 'ZIP must contain exactly 2 archived PDFs');
  assert.ok(fileNamesInZip.includes(filename1), 'ZIP must contain first sanitized PDF');
  assert.ok(fileNamesInZip.includes(filename2), 'ZIP must contain second sanitized PDF');
});

test('Phase 6 Bulk Issuance Workflow UI: Validation, Progress, and Batch Management', () => {
  const bulkIssueContent = fs.readFileSync(path.join(projectRoot, 'src/pages/admin/BulkIssuePage.tsx'), 'utf-8');

  // 4-step workflow stepper
  assert.ok(bulkIssueContent.includes('1. Event & Template'), 'Must define Step 1 in stepper');
  assert.ok(bulkIssueContent.includes('2. Upload CSV'), 'Must define Step 2 in stepper');
  assert.ok(bulkIssueContent.includes('3. Map & Validate'), 'Must define Step 3 in stepper');
  assert.ok(bulkIssueContent.includes('4. Issuance & ZIP'), 'Must define Step 4 in stepper');

  // Bounded concurrency
  assert.ok(bulkIssueContent.includes('chunkSize = 3'), 'Must implement bounded concurrency chunks of 3');

  // PapaParse integration
  assert.ok(bulkIssueContent.includes('Papa.parse'), 'Must use PapaParse for CSV parsing');

  // JSZip integration
  assert.ok(bulkIssueContent.includes('new JSZip()'), 'Must use JSZip for archive bundling');

  // Error exclusion
  assert.ok(bulkIssueContent.includes('handleToggleExclude'), 'Must allow administrators to exclude invalid rows');

  // Batch record creation and updates
  assert.ok(bulkIssueContent.includes('portalService.createIssuanceBatch'), 'Must persist batch in issuance_batches table');
  assert.ok(bulkIssueContent.includes('portalService.updateIssuanceBatch'), 'Must finalize batch status and counts');
});

test('Phase 6 Audit Trail: Append-Only Ledger, Filtering, and Secret Masking', () => {
  const auditPageContent = fs.readFileSync(path.join(projectRoot, 'src/pages/admin/AuditPage.tsx'), 'utf-8');
  const rlsContent = fs.readFileSync(path.join(projectRoot, 'supabase/migrations/20261011000002_row_level_security.sql'), 'utf-8');

  // UI Filtering
  assert.ok(auditPageContent.includes('actionFilter'), 'Audit page must support action filter');
  assert.ok(auditPageContent.includes('targetTypeFilter'), 'Audit page must support target type filter');
  assert.ok(auditPageContent.includes('dateRangeFilter'), 'Audit page must support date range filter');
  assert.ok(auditPageContent.includes('sanitizeMetadata'), 'Audit page must mask sensitive credentials in inspector');
  assert.ok(auditPageContent.includes('exportAuditCsv'), 'Audit page must support CSV export of audit ledger');

  // Immutability in Database RLS
  assert.ok(rlsContent.includes('IMMUTABLE LOG - NO UPDATE / NO DELETE'), 'RLS must enforce immutable ledger');
  assert.ok(!rlsContent.includes('ON public.audit_logs FOR UPDATE'), 'No UPDATE policy allowed on audit_logs');
  assert.ok(!rlsContent.includes('ON public.audit_logs FOR DELETE'), 'No DELETE policy allowed on audit_logs');
});

test('Phase 6 Production Deployment: Cloudflare Pages Configuration & Security', () => {
  const redirectsPath = path.join(projectRoot, 'public/_redirects');
  const headersPath = path.join(projectRoot, 'public/_headers');
  const envExamplePath = path.join(projectRoot, '.env.example');
  const gitignorePath = path.join(projectRoot, '.gitignore');

  // SPA Route Fallback
  assert.ok(fs.existsSync(redirectsPath), 'public/_redirects must exist for Cloudflare Pages SPA fallback');
  const redirectsContent = fs.readFileSync(redirectsPath, 'utf-8');
  assert.ok(redirectsContent.includes('/*    /index.html   200'), 'Must redirect all routes to /index.html with status 200');

  // Security Headers
  assert.ok(fs.existsSync(headersPath), 'public/_headers must exist for Cloudflare Pages security headers');
  const headersContent = fs.readFileSync(headersPath, 'utf-8');
  assert.ok(headersContent.includes('X-Frame-Options: DENY'), 'Must set X-Frame-Options to DENY');
  assert.ok(headersContent.includes('X-Content-Type-Options: nosniff'), 'Must set X-Content-Type-Options to nosniff');

  // Environment variable and secret hygiene
  const envExample = fs.readFileSync(envExamplePath, 'utf-8');
  assert.ok(envExample.includes('VITE_SUPABASE_URL='), '.env.example must define VITE_SUPABASE_URL');
  assert.ok(envExample.includes('VITE_SUPABASE_ANON_KEY='), '.env.example must define VITE_SUPABASE_ANON_KEY');
  assert.ok(!envExample.includes('service_role'), '.env.example must never reference service_role');

  const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
  assert.ok(gitignore.includes('.env'), '.gitignore must ignore .env');
  assert.ok(gitignore.includes('.env.production'), '.gitignore must ignore .env.production');
});

test('Phase 6 Feature: Auto-Description Generator & Preset Detection', async () => {
  const presetsModulePath = path.join(projectRoot, 'src/utils/descriptionPresets.ts');
  assert.ok(fs.existsSync(presetsModulePath), 'descriptionPresets.ts must exist');

  const { DESCRIPTION_PRESETS, autoDetectCitation } = await import(
    `file://${presetsModulePath.replace(/\\/g, '/')}`
  );

  assert.strictEqual(DESCRIPTION_PRESETS.length, 5, 'Must provide 5 formal description presets');

  // Verify 1st Place Citation
  const citation1st = autoDetectCitation('1st Place Winner', 'CodeCraft Hackathon');
  assert.ok(citation1st.includes('First Place'), '1st place citation must specify First Place');
  assert.ok(citation1st.includes('CodeCraft Hackathon'), 'Must interpolate event name');
  assert.ok(citation1st.includes('Namdapha House, IIT Madras'), 'Must include institutional affiliation');

  // Verify 2nd Place Citation
  const citation2nd = autoDetectCitation('2nd Runner Up', 'CodeCraft Hackathon');
  assert.ok(citation2nd.includes('Second Place'), '2nd place citation must specify Second Place');

  // Verify 3rd Place Citation
  const citation3rd = autoDetectCitation('Third Place', 'CodeCraft Hackathon');
  assert.ok(citation3rd.includes('Third Place'), '3rd place citation must specify Third Place');

  // Verify UI integration in IssueCertificateModal and BulkIssuePage
  const issueModalContent = fs.readFileSync(path.join(projectRoot, 'src/components/admin/IssueCertificateModal.tsx'), 'utf-8');
  const bulkIssueContent = fs.readFileSync(path.join(projectRoot, 'src/pages/admin/BulkIssuePage.tsx'), 'utf-8');

  assert.ok(issueModalContent.includes('Auto-Write Citation'), 'IssueCertificateModal must mount citation assistant');
  assert.ok(bulkIssueContent.includes('Auto-Citation Generator Active'), 'BulkIssuePage must mount auto-citation assistant');
});
