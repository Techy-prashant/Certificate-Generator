import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

test('Phase 3 Service Contract: All Methods Defined in apiInterface.ts', () => {
  const apiInterfaceContent = fs.readFileSync(path.join(projectRoot, 'src/services/apiInterface.ts'), 'utf-8');

  const requiredMethods = [
    'getEvents',
    'getEventById',
    'createEvent',
    'updateEvent',
    'archiveEvent',
    'getAwardCategories',
    'createAwardCategory',
    'updateAwardCategory',
    'deleteAwardCategory',
    'getEventSignatories',
    'addEventSignatory',
    'removeEventSignatory',
    'updateEventSignatoryOrder',
    'getTemplates',
    'getTemplateById',
    'createTemplate',
    'updateTemplateStatus',
    'getSignatories',
    'getSignatoryById',
    'createSignatory',
    'updateSignatory',
  ];

  for (const method of requiredMethods) {
    assert.match(
      apiInterfaceContent,
      new RegExp(`\\b${method}\\s*\\(`, 'm'),
      `apiInterface.ts must declare method "${method}"`
    );
  }
});

test('Phase 3 Supabase Implementation: Real Audit Logging and Storage Integration', () => {
  const supabaseServiceContent = fs.readFileSync(path.join(projectRoot, 'src/services/supabaseService.ts'), 'utf-8');

  // Verify audit log emissions
  const expectedAuditActions = [
    'event.created',
    'event.updated',
    'event.archived',
    'award_category.created',
    'award_category.updated',
    'award_category.deleted',
    'event_signatory.assigned',
    'event_signatory.removed',
    'template.created',
    'template.published',
    'signatory.created',
    'signatory.updated',
  ];

  for (const action of expectedAuditActions) {
    const hasAction = supabaseServiceContent.includes(`'${action}'`) || supabaseServiceContent.includes(`"${action}"`);
    assert.ok(hasAction, `supabaseService must log audit action "${action}"`);
  }

  // Storage bucket usage
  assert.match(
    supabaseServiceContent,
    /template-backgrounds/,
    'supabaseService must upload template backgrounds to "template-backgrounds"'
  );
  assert.match(
    supabaseServiceContent,
    /signatory-assets/,
    'supabaseService must upload signature assets to private "signatory-assets" bucket'
  );

  // Private storage boundary: signed URLs for signatures
  assert.match(
    supabaseServiceContent,
    /createSignedUrl\(/,
    'supabaseService must generate signed URLs for private signature assets, not raw public URLs'
  );
});

test('Phase 3 Mock Service Parity: All Admin Operations Implemented in mockApiService.ts', () => {
  const mockServiceContent = fs.readFileSync(path.join(projectRoot, 'src/services/mockApiService.ts'), 'utf-8');

  const methods = [
    'updateEvent',
    'archiveEvent',
    'createAwardCategory',
    'updateAwardCategory',
    'deleteAwardCategory',
    'getEventSignatories',
    'addEventSignatory',
    'removeEventSignatory',
    'updateEventSignatoryOrder',
    'createTemplate',
    'updateTemplateStatus',
    'createSignatory',
    'updateSignatory',
  ];

  for (const method of methods) {
    assert.match(
      mockServiceContent,
      new RegExp(`async\\s+${method}\\s*\\(`),
      `mockApiService must implement async "${method}" for development/testing parity`
    );
  }
});

test('Phase 3 UI Architecture: Dedicated Event Details Route & Component', () => {
  const appContent = fs.readFileSync(path.join(projectRoot, 'src/App.tsx'), 'utf-8');
  assert.match(appContent, /import\s+{\s*EventDetailPage\s*}\s+from/, 'App.tsx must import EventDetailPage');
  assert.match(appContent, /path="events\/:id"/, 'App.tsx must define route path="events/:id"');

  const eventDetailPath = path.join(projectRoot, 'src/pages/admin/EventDetailPage.tsx');
  assert.ok(fs.existsSync(eventDetailPath), 'EventDetailPage.tsx must exist');

  const eventDetailContent = fs.readFileSync(eventDetailPath, 'utf-8');
  assert.match(eventDetailContent, /portalService\.getEventById/, 'EventDetailPage must load event data');
  assert.match(eventDetailContent, /portalService\.getAwardCategories/, 'EventDetailPage must load award categories');
  assert.match(eventDetailContent, /portalService\.getEventSignatories/, 'EventDetailPage must load event signatories');
  assert.match(eventDetailContent, /portalService\.createAwardCategory/, 'EventDetailPage must support adding award categories');
  assert.match(eventDetailContent, /portalService\.addEventSignatory/, 'EventDetailPage must support assigning signatories');
});

test('Phase 3 Template Management: Canva Upload & Lifecycle Preserved', () => {
  const templatesPath = path.join(projectRoot, 'src/pages/admin/TemplatesPage.tsx');
  const templatesContent = fs.readFileSync(templatesPath, 'utf-8');

  assert.match(templatesContent, /portalService\.createTemplate/, 'TemplatesPage must call createTemplate with uploaded file');
  assert.match(templatesContent, /portalService\.updateTemplateStatus/, 'TemplatesPage must manage draft/published/archived lifecycle');
  assert.match(templatesContent, /versionNumber/, 'TemplatesPage must display template version numbers');
  assert.match(templatesContent, /orientation/, 'TemplatesPage must configure template orientation');
  assert.match(templatesContent, /ConfirmDialog/, 'TemplatesPage must guard status changes with ConfirmDialog');
});

test('Phase 3 Signatory Management: Private Storage & Order Management', () => {
  const signatoriesPath = path.join(projectRoot, 'src/pages/admin/SignatoriesPage.tsx');
  const signatoriesContent = fs.readFileSync(signatoriesPath, 'utf-8');

  assert.match(signatoriesContent, /portalService\.createSignatory/, 'SignatoriesPage must call createSignatory with uploaded file');
  assert.match(signatoriesContent, /portalService\.updateSignatory/, 'SignatoriesPage must call updateSignatory');
  assert.match(signatoriesContent, /Protected Storage Asset Boundary/i, 'SignatoriesPage must document private storage boundary');
  assert.match(signatoriesContent, /ConfirmDialog/, 'SignatoriesPage must guard activation/deactivation with ConfirmDialog');
});

test('Default Certificate of Acknowledgement in Every Event & Kavyadhara Judge Category', () => {
  const mockDataContent = fs.readFileSync(path.join(projectRoot, 'src/services/mockData.ts'), 'utf-8');
  const eventsPageContent = fs.readFileSync(path.join(projectRoot, 'src/pages/admin/EventsPage.tsx'), 'utf-8');
  const issueModalContent = fs.readFileSync(path.join(projectRoot, 'src/components/admin/IssueCertificateModal.tsx'), 'utf-8');

  // Verify Kavyadhara event has Certificate of Acknowledgement
  assert.ok(mockDataContent.includes('cat-ack-cul-03'), 'Kavyadhara event must include Certificate of Acknowledgement category');
  assert.ok(mockDataContent.includes('Kavyadhara'), 'Event name must reflect Kavyadhara');

  // Verify EventsPage and IssueCertificateModal have Certificate of Acknowledgement in default categories
  assert.ok(eventsPageContent.includes("'Certificate of Acknowledgement'"), 'EventsPage must include Certificate of Acknowledgement as default');
  assert.ok(issueModalContent.includes("'Certificate of Acknowledgement'"), 'IssueCertificateModal must include Certificate of Acknowledgement as default');
});
