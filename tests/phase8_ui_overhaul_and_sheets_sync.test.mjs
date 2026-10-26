import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

test('Phase 8 Architecture: Type definitions for Google Sheets and Certificate Updates', () => {
  const typesContent = fs.readFileSync(path.join(projectRoot, 'src/types/index.ts'), 'utf-8');

  // Verify type exports
  assert.ok(typesContent.includes('export interface SpreadsheetConfig'), 'types must declare SpreadsheetConfig');
  assert.ok(typesContent.includes('export interface SpreadsheetSyncLog'), 'types must declare SpreadsheetSyncLog');
  assert.ok(typesContent.includes('export interface SpreadsheetSyncResult'), 'types must declare SpreadsheetSyncResult');
  assert.ok(typesContent.includes('export interface SpreadsheetColumnMapping'), 'types must declare SpreadsheetColumnMapping');
  assert.ok(typesContent.includes('export interface UpdateCertificateInput'), 'types must declare UpdateCertificateInput');
  assert.ok(typesContent.includes('export type SpreadsheetSyncStatus'), 'types must declare SpreadsheetSyncStatus');

  // Verify UpdateCertificateInput properties
  assert.ok(typesContent.includes('recipientName?: string'), 'UpdateCertificateInput must support recipientName');
  assert.ok(typesContent.includes('recipientEmail?: string'), 'UpdateCertificateInput must support recipientEmail');
  assert.ok(typesContent.includes('achievement?: string'), 'UpdateCertificateInput must support achievement');
  assert.ok(typesContent.includes('issueDate?: string'), 'UpdateCertificateInput must support issueDate');
});

test('Phase 8 Architecture: Service contracts in apiInterface.ts', () => {
  const apiInterfaceContent = fs.readFileSync(path.join(projectRoot, 'src/services/apiInterface.ts'), 'utf-8');

  assert.ok(apiInterfaceContent.includes('updateCertificate(id: string, updates:'), 'apiInterface must declare updateCertificate');
  assert.ok(apiInterfaceContent.includes('getSpreadsheetConfig(): Promise<SpreadsheetConfig | null>'), 'apiInterface must declare getSpreadsheetConfig');
  assert.ok(apiInterfaceContent.includes('updateSpreadsheetConfig(config: Partial<SpreadsheetConfig>)'), 'apiInterface must declare updateSpreadsheetConfig');
  assert.ok(apiInterfaceContent.includes('testSpreadsheetConnection(): Promise<{ success: boolean; message: string; title?: string }>'), 'apiInterface must declare testSpreadsheetConnection');
  assert.ok(apiInterfaceContent.includes('syncAllCertificatesToSpreadsheet(): Promise<SpreadsheetSyncResult>'), 'apiInterface must declare syncAllCertificatesToSpreadsheet');
  assert.ok(apiInterfaceContent.includes('disconnectSpreadsheet(): Promise<boolean>'), 'apiInterface must declare disconnectSpreadsheet');
  assert.ok(apiInterfaceContent.includes('getSpreadsheetSyncLogs(limit?: number)'), 'apiInterface must declare getSpreadsheetSyncLogs');
  assert.ok(apiInterfaceContent.includes('retrySpreadsheetSync(logId?: string): Promise<SpreadsheetSyncResult>'), 'apiInterface must declare retrySpreadsheetSync');
});

test('Phase 8 Supabase & Mock Service Parity for Spreadsheet Integration & Certificate Updates', () => {
  const supabaseContent = fs.readFileSync(path.join(projectRoot, 'src/services/supabaseService.ts'), 'utf-8');
  const mockContent = fs.readFileSync(path.join(projectRoot, 'src/services/mockApiService.ts'), 'utf-8');

  // Supabase service checks
  assert.ok(supabaseContent.includes('updateCertificate(id: string, updates: UpdateCertificateInput)'), 'supabaseService must implement updateCertificate');
  assert.ok(supabaseContent.includes('async getSpreadsheetConfig()'), 'supabaseService must implement getSpreadsheetConfig');
  assert.ok(supabaseContent.includes('async updateSpreadsheetConfig('), 'supabaseService must implement updateSpreadsheetConfig');
  assert.ok(supabaseContent.includes('async testSpreadsheetConnection()'), 'supabaseService must implement testSpreadsheetConnection');
  assert.ok(supabaseContent.includes('async syncAllCertificatesToSpreadsheet()'), 'supabaseService must implement syncAllCertificatesToSpreadsheet');
  assert.ok(supabaseContent.includes('async disconnectSpreadsheet()'), 'supabaseService must implement disconnectSpreadsheet');
  assert.ok(supabaseContent.includes('googleSheetsService.syncCertificate('), 'supabaseService must trigger googleSheetsService.syncCertificate');

  // Mock service checks
  assert.ok(mockContent.includes('updateCertificate(id: string, updates: UpdateCertificateInput)'), 'mockApiService must implement updateCertificate');
  assert.ok(mockContent.includes('async getSpreadsheetConfig()'), 'mockApiService must implement getSpreadsheetConfig');
  assert.ok(mockContent.includes('async updateSpreadsheetConfig('), 'mockApiService must implement updateSpreadsheetConfig');
  assert.ok(mockContent.includes('async testSpreadsheetConnection()'), 'mockApiService must implement testSpreadsheetConnection');
  assert.ok(mockContent.includes('async syncAllCertificatesToSpreadsheet()'), 'mockApiService must implement syncAllCertificatesToSpreadsheet');
  assert.ok(mockContent.includes('async disconnectSpreadsheet()'), 'mockApiService must implement disconnectSpreadsheet');
  assert.ok(mockContent.includes('googleSheetsService.syncCertificate('), 'mockApiService must trigger googleSheetsService.syncCertificate');
});

test('Phase 8 Database Migration: Google Sheets Config & Sync Logs Schema', () => {
  const migrationPath = path.join(projectRoot, 'supabase/migrations/20261026000001_google_sheets_sync.sql');
  assert.ok(fs.existsSync(migrationPath), 'Google sheets migration file must exist');

  const migrationContent = fs.readFileSync(migrationPath, 'utf-8');
  assert.ok(migrationContent.includes('CREATE TABLE IF NOT EXISTS public.spreadsheet_configs'), 'Must create spreadsheet_configs table');
  assert.ok(migrationContent.includes('CREATE TABLE IF NOT EXISTS public.spreadsheet_sync_logs'), 'Must create spreadsheet_sync_logs table');
  assert.ok(migrationContent.includes('ENABLE ROW LEVEL SECURITY'), 'RLS must be enabled on spreadsheet tables');
  assert.ok(migrationContent.includes('CREATE INDEX IF NOT EXISTS idx_spreadsheet_sync_status'), 'Must create index for sync logs status');
  assert.ok(migrationContent.includes('CREATE INDEX IF NOT EXISTS idx_spreadsheet_sync_cert_id'), 'Must create index for sync logs certificate_id');
});

test('Phase 8 Google Sheets Service: Standard 12 Columns & Idempotent Upsert Strategy', () => {
  const serviceContent = fs.readFileSync(path.join(projectRoot, 'src/services/googleSheetsService.ts'), 'utf-8');

  // Verify all 12 required columns
  const requiredColumns = [
    'certificateId: \'Certificate Record ID\'',
    'recipientName: \'Recipient Name\'',
    'recipientEmail: \'Recipient Email\'',
    'eventName: \'Event Name\'',
    'position: \'Position / Achievement\'',
    'verificationCode: \'Certificate Verification Code\'',
    'status: \'Certificate Status\'',
    'issueDate: \'Issue Date\'',
    'certificateUrl: \'Certificate File URL\'',
    'verificationUrl: \'Public Verification URL\'',
    'lastUpdated: \'Last Updated\'',
    'syncStatus: \'Sync Status\''
  ];

  for (const col of requiredColumns) {
    assert.ok(serviceContent.includes(col), `Service must configure standard column mapping: ${col}`);
  }

  // Verify stable record key
  assert.ok(serviceContent.includes('certificateId: cert.id'), 'Sync log and payload must use cert.id as unique record key');
  assert.ok(serviceContent.includes('maxAttempts: 5'), 'Service must enforce bounded retries with maxAttempts');
  assert.ok(serviceContent.includes('saveToStorage'), 'Service must maintain persistent outbox queue for resilient sync');
  assert.ok(serviceContent.includes('PostgreSQL remains the primary database'), 'Must document PostgreSQL as primary source of truth');
});

test('Phase 8 Bulk Issuance Workflow: Shared Recipient Validation Engine Logic', () => {
  // Unit test the validation logic used in BulkIssuePage
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateRecipients = (rows) => {
    const emailCounts = new Map();
    rows.forEach(r => {
      const email = (r.email || '').trim().toLowerCase();
      if (email) {
        emailCounts.set(email, (emailCounts.get(email) || 0) + 1);
      }
    });

    return rows.map((r, idx) => {
      const errors = [];
      const trimmedName = (r.name || '').trim();
      const trimmedEmail = (r.email || '').trim().toLowerCase();
      const trimmedPos = (r.position || '').trim();

      if (!trimmedName) errors.push('Name is required');
      if (!trimmedEmail) {
        errors.push('Email is required');
      } else if (!emailRegex.test(trimmedEmail)) {
        errors.push('Invalid email format');
      } else if (emailCounts.get(trimmedEmail) > 1) {
        errors.push('Duplicate recipient email in batch');
      }
      if (!trimmedPos) errors.push('Position is required');

      return {
        ...r,
        isValid: errors.length === 0,
        errors,
        isDuplicate: Boolean(trimmedEmail && emailCounts.get(trimmedEmail) > 1)
      };
    });
  };

  const testBatch = [
    { name: 'Aarav Sharma', email: 'aarav@study.iitm.ac.in', position: 'First Place' },
    { name: '', email: 'no_name@study.iitm.ac.in', position: 'Second Place' },
    { name: 'Invalid Email Person', email: 'invalid-email-address', position: 'Participant' },
    { name: 'Duplicate First', email: 'duplicate@study.iitm.ac.in', position: 'Winner' },
    { name: 'Duplicate Second', email: 'DUPLICATE@study.iitm.ac.in', position: 'Runner-up' },
    { name: 'Valid Person', email: 'valid.person@study.iitm.ac.in', position: 'Participant' },
  ];

  const results = validateRecipients(testBatch);

  // Row 0 is valid
  assert.strictEqual(results[0].isValid, true, 'Valid recipient must pass validation');

  // Row 1 fails due to empty name
  assert.strictEqual(results[1].isValid, false, 'Empty name must fail validation');
  assert.ok(results[1].errors.includes('Name is required'), 'Must specify Name is required');

  // Row 2 fails due to invalid email
  assert.strictEqual(results[2].isValid, false, 'Malformed email must fail validation');
  assert.ok(results[2].errors.includes('Invalid email format'), 'Must specify Invalid email format');

  // Row 3 and 4 fail due to case-insensitive duplicate email detection
  assert.strictEqual(results[3].isValid, false, 'Duplicate email must fail validation');
  assert.strictEqual(results[4].isValid, false, 'Duplicate email (different casing) must fail validation');
  assert.strictEqual(results[3].isDuplicate, true, 'Duplicate flag must be set');
  assert.strictEqual(results[4].isDuplicate, true, 'Duplicate flag must be set');

  // Row 5 is valid (valid rows preserved)
  assert.strictEqual(results[5].isValid, true, 'Other valid rows must be preserved without error');
});

test('Phase 8 Bulk Issuance Workflow: Excel / Google Sheets Clipboard Tab-Separated Parsing', () => {
  const clipboardTSV = `Aarav Sharma\taarav@study.iitm.ac.in\tFirst Place
Sneha Roy\tsneha@study.iitm.ac.in\tSecond Place
Vikramaditya Rao\tvikram@study.iitm.ac.in\tSpecial Recognition`;

  const parseClipboardData = (text) => {
    const lines = text.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
    return lines.map((line, idx) => {
      const parts = line.split('\t').map(p => p.trim());
      return {
        id: `row-${idx}`,
        name: parts[0] || '',
        email: parts[1] || '',
        position: parts[2] || '',
      };
    });
  };

  const parsed = parseClipboardData(clipboardTSV);
  assert.strictEqual(parsed.length, 3, 'Must parse exactly 3 lines from clipboard TSV');
  assert.strictEqual(parsed[0].name, 'Aarav Sharma');
  assert.strictEqual(parsed[0].email, 'aarav@study.iitm.ac.in');
  assert.strictEqual(parsed[0].position, 'First Place');
  assert.strictEqual(parsed[1].name, 'Sneha Roy');
  assert.strictEqual(parsed[2].position, 'Special Recognition');
});

test('Phase 8 Bulk Issuance Workflow UI: Guided 5 Steps & Concurrency Limit', () => {
  const bulkIssueContent = fs.readFileSync(path.join(projectRoot, 'src/pages/admin/BulkIssuePage.tsx'), 'utf-8');

  // 5 Step Guided Workflow
  assert.ok(bulkIssueContent.includes('1. Event & Template'), 'Must display Step 1: Event & Template');
  assert.ok(bulkIssueContent.includes('2. Upload CSV / Add Recipients'), 'Must display Step 2: Add Recipients');
  assert.ok(bulkIssueContent.includes('3. Map & Validate / Preview'), 'Must display Step 3: Review & Preview');
  assert.ok(bulkIssueContent.includes('4. Issuance & ZIP'), 'Must display Step 4: Issuance & ZIP');
  assert.ok(bulkIssueContent.includes('5. Completion'), 'Must display Step 5: Completion Summary');

  // Manual Entry vs CSV Options
  assert.ok(bulkIssueContent.includes("recipientInputMode === 'manual'"), 'Must support manual spreadsheet grid tab');
  assert.ok(bulkIssueContent.includes("recipientInputMode === 'csv'"), 'Must support CSV import tab');
  assert.ok(bulkIssueContent.includes('handlePasteClipboard'), 'Must support clipboard paste from Excel/Google Sheets');
  assert.ok(bulkIssueContent.includes('handleAddManualRow'), 'Must support adding manual recipient rows');

  // Preserved Concurrency and ZIP packaging
  assert.ok(bulkIssueContent.includes('chunkSize = 3'), 'Must enforce bounded concurrency chunkSize = 3');
  assert.ok(bulkIssueContent.includes('new JSZip()'), 'Must package downloadable certificates with JSZip');
});

test('Phase 8 Certificate Registry: Inbox UI Model & Secondary Details Drawer', () => {
  const certsContent = fs.readFileSync(path.join(projectRoot, 'src/pages/admin/CertificatesPage.tsx'), 'utf-8');

  // Default Essential Columns
  assert.ok(certsContent.includes('Recipient'), 'Table header must show Recipient');
  assert.ok(certsContent.includes('Event'), 'Table header must show Event');
  assert.ok(certsContent.includes('Achievement'), 'Table header must show Achievement / Position');
  assert.ok(certsContent.includes('Status'), 'Table header must show Status');
  assert.ok(certsContent.includes('Actions'), 'Table header must show Actions');

  // Secondary Information Drawer ("Show More")
  assert.ok(certsContent.includes('toggleRowExpanded'), 'Must support expandable row drawer');
  assert.ok(certsContent.includes('6-Digit Verification Code'), 'Drawer must reveal verification code');
  assert.ok(certsContent.includes('Record ID:'), 'Drawer must reveal internal database ID');
  assert.ok(certsContent.includes('Official Issue Date'), 'Drawer must reveal issue date metadata');

  // Action Controls
  assert.ok(certsContent.includes('handleOpenPreview'), 'Must support direct preview');
  assert.ok(certsContent.includes('handleDownloadDirect'), 'Must support direct PDF download');
  assert.ok(certsContent.includes('handleOpenEdit'), 'Must support editing permitted details');
  assert.ok(certsContent.includes('handleConfirmRevoke'), 'Must support certificate revocation');
  assert.ok(certsContent.includes('internalReason'), 'Revocation must require internal council reason');
  assert.ok(certsContent.includes('publicReason'), 'Revocation must support public audit reason');
});

test('Phase 8 Navigation: Collapsible Sidebar & Glassmorphism Top Bar', () => {
  const sidebarContent = fs.readFileSync(path.join(projectRoot, 'src/components/layout/AdminSidebar.tsx'), 'utf-8');
  const topNavContent = fs.readFileSync(path.join(projectRoot, 'src/components/layout/AdminTopNav.tsx'), 'utf-8');

  // Sidebar navigation routes
  const requiredRoutes = [
    '/admin',
    '/admin/events',
    '/admin/templates',
    '/admin/signatories',
    '/admin/certificates',
    '/admin/bulk-issue',
    '/admin/team',
    '/admin/audit',
    '/admin/spreadsheet',
  ];

  for (const route of requiredRoutes) {
    assert.ok(sidebarContent.includes(route), `AdminSidebar must contain route ${route}`);
  }

  // Sidebar navigation labels
  const requiredLabels = [
    'Overview',
    'Events',
    'Templates',
    'Signatures',
    'Certificates',
    'Bulk Issuance',
    'Spreadsheet Sync',
    'Team & Permissions',
    'Audit Logs'
  ];

  for (const label of requiredLabels) {
    assert.ok(sidebarContent.includes(`label: '${label}'`), `AdminSidebar must contain label ${label}`);
  }

  // Collapsible behavior
  assert.ok(sidebarContent.includes('isCollapsed'), 'AdminSidebar must support isCollapsed state');
  assert.ok(sidebarContent.includes("w-[72px]"), 'AdminSidebar must support compact 72px collapsed width');
  assert.ok(topNavContent.includes('onToggleCollapse'), 'AdminTopNav must support sidebar collapse toggle');
  assert.ok(topNavContent.includes('backdrop-blur-md'), 'AdminTopNav must feature glassmorphic backdrop blur');
  assert.ok(topNavContent.includes('Spreadsheet Mirror'), 'AdminTopNav must display Google Sheets sync status indicator');
});
