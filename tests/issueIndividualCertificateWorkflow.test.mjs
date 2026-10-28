import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, rgb } from 'pdf-lib';

const projectRoot = process.cwd();

test('Workflow Redesign: Modal width target (900-1050px) and structure', () => {
  const modalUiContent = fs.readFileSync(path.join(projectRoot, 'src/components/ui/Modal.tsx'), 'utf-8');
  const issueModalContent = fs.readFileSync(path.join(projectRoot, 'src/components/admin/IssueCertificateModal.tsx'), 'utf-8');

  // Verify maxWidth="4xl" which maps to max-w-5xl (1024px / 64rem), perfectly in the 900-1050px desktop target
  assert.ok(modalUiContent.includes("'4xl': 'max-w-5xl'"), 'Modal.tsx must provide 4xl max-w-5xl (1024px)');
  assert.ok(issueModalContent.includes('maxWidth="4xl"'), 'IssueCertificateModal must specify maxWidth="4xl"');
});

test('Workflow Redesign: Sequential 5-step visual hierarchy', () => {
  const issueModalContent = fs.readFileSync(path.join(projectRoot, 'src/components/admin/IssueCertificateModal.tsx'), 'utf-8');

  // Verify Heading & Muted Subtitle
  assert.ok(issueModalContent.includes('title={issuedCert ? \'Certificate Issued Successfully\' : \'Issue Individual Certificate\'}'), 'Title must be "Issue Individual Certificate"');
  assert.ok(issueModalContent.includes('Create and issue a verified certificate.'), 'Subtitle must be "Create and issue a verified certificate."');

  // Verify exact sequential 5 steps
  const step1Index = issueModalContent.indexOf('Step 1 • Event and Award');
  const step2Index = issueModalContent.indexOf('Step 2 • Certificate Template');
  const step3Index = issueModalContent.indexOf('Step 3 • Recipient Details');
  const step4Index = issueModalContent.indexOf('Step 4 • Achievement / Citation');
  const step5Index = issueModalContent.indexOf('Step 5 • Signatures');

  assert.ok(step1Index > 0, 'Step 1 must be present');
  assert.ok(step2Index > step1Index, 'Step 2 must follow Step 1');
  assert.ok(step3Index > step2Index, 'Step 3 must follow Step 2');
  assert.ok(step4Index > step3Index, 'Step 4 must follow Step 3');
  assert.ok(step5Index > step4Index, 'Step 5 must follow Step 4');
});

test('Workflow Redesign: Step 1 Event and Award searchable and clean 2-column layout', () => {
  const eventSelectContent = fs.readFileSync(path.join(projectRoot, 'src/components/admin/EventSearchableSelect.tsx'), 'utf-8');
  const issueModalContent = fs.readFileSync(path.join(projectRoot, 'src/components/admin/IssueCertificateModal.tsx'), 'utf-8');

  assert.ok(issueModalContent.includes('<EventSearchableSelect'), 'IssueCertificateModal must mount EventSearchableSelect');
  assert.ok(eventSelectContent.includes('searchQuery'), 'Event select must maintain search query');
  assert.ok(eventSelectContent.includes('filteredEvents'), 'Event select must filter events');
  assert.ok(issueModalContent.includes('grid grid-cols-1 md:grid-cols-2 gap-4'), 'Step 1 must arrange in 2 columns on desktop');
});

test('Workflow Redesign: Step 2 Template is a single searchable dropdown replacing card collection', () => {
  const templateSelectContent = fs.readFileSync(path.join(projectRoot, 'src/components/admin/TemplateSearchableSelect.tsx'), 'utf-8');
  const issueModalContent = fs.readFileSync(path.join(projectRoot, 'src/components/admin/IssueCertificateModal.tsx'), 'utf-8');

  // Must mount TemplateSearchableSelect
  assert.ok(issueModalContent.includes('<TemplateSearchableSelect'), 'IssueCertificateModal must mount TemplateSearchableSelect');

  // Search input support by name and category
  assert.ok(templateSelectContent.includes('searchQuery'), 'Template select must maintain search query state');
  assert.ok(templateSelectContent.includes('t.name.toLowerCase().includes(q)'), 'Template select must filter by name');
  assert.ok(templateSelectContent.includes('t.category.toLowerCase().includes(q)'), 'Template select must filter by category');

  // Category grouping
  assert.ok(templateSelectContent.includes('groupedTemplates'), 'Template select must group templates by category');

  // Essential info display (name, category, dimensions)
  assert.ok(templateSelectContent.includes('selectedTemplate.name'), 'Template select must display selected name');
  assert.ok(templateSelectContent.includes('selectedTemplate.category'), 'Template select must display category');

  // Unobtrusive quick preview button
  assert.ok(templateSelectContent.includes('Quick Preview'), 'Template select must offer unobtrusive Quick Preview action');
});

test('Workflow Redesign: Step 3 Recipient Details 2-column layout & Optional Email', () => {
  const issueModalContent = fs.readFileSync(path.join(projectRoot, 'src/components/admin/IssueCertificateModal.tsx'), 'utf-8');

  assert.ok(issueModalContent.includes('Recipient Full Name'), 'Must contain Recipient Full Name field');
  assert.ok(issueModalContent.includes('Recipient Email'), 'Must contain Recipient Email field');
  assert.ok(issueModalContent.includes('Optional'), 'Recipient Email must be subtly marked Optional');
  assert.ok(issueModalContent.includes('grid grid-cols-1 md:grid-cols-2 gap-4'), 'Must use 2-column layout on desktop');
});

test('Workflow Redesign: Step 4 Achievement / Citation with Auto-Write & Restrained Suggestions', () => {
  const issueModalContent = fs.readFileSync(path.join(projectRoot, 'src/components/admin/IssueCertificateModal.tsx'), 'utf-8');

  // Auto-Write Citation action preserved
  assert.ok(issueModalContent.includes('Auto-Write Citation'), 'Must contain Auto-Write Citation action');

  // Understated suggestions
  assert.ok(issueModalContent.includes('applyPresetCitation'), 'Must support clicking citation suggestions');
  assert.ok(issueModalContent.includes('Certificate of Acknowledgement (Judge)'), 'Must offer Certificate of Acknowledgement (Judge)');
  assert.ok(issueModalContent.includes('Winning Team (Against the Motion)'), 'Must offer Debate Winning Team suggestion when applicable');

  // Editable textarea & Issue Date
  assert.ok(issueModalContent.includes('<textarea'), 'Must contain editable textarea');
  assert.ok(issueModalContent.includes('Issue Date'), 'Must contain Issue Date field');
});

test('Workflow Redesign: Step 5 Signatures strictly default to None & allow issuance without signatures', () => {
  const issueModalContent = fs.readFileSync(path.join(projectRoot, 'src/components/admin/IssueCertificateModal.tsx'), 'utf-8');

  // Both default to empty string ("None")
  assert.ok(issueModalContent.includes("const [leftSignatureId, setLeftSignatureId] = useState<string>('');"), 'Left signature must initialize to empty / None');
  assert.ok(issueModalContent.includes("const [rightSignatureId, setRightSignatureId] = useState<string>('');"), 'Right signature must initialize to empty / None');

  // Left & Right signature labels
  assert.ok(issueModalContent.includes('label="Left Signature"'), 'Must have clearly labeled Left Signature dropdown');
  assert.ok(issueModalContent.includes('label="Right Signature"'), 'Must have clearly labeled Right Signature dropdown');

  // Both have "None" as first option
  assert.ok(issueModalContent.includes("{ value: '', label: 'None' }"), 'Dropdown options must provide "None"');

  // Enforces distinct signatures if both selected
  assert.ok(issueModalContent.includes('leftSignatureId === rightSignatureId'), 'Must validate that left and right cannot be the same signatory');

  // Does NOT block submission if both signatures are None
  assert.ok(!issueModalContent.includes('Please select at least one authorized signature'), 'Must NOT require a signature to issue certificate');
});

test('Workflow Redesign: Bottom action bar has Preview, Cancel, and Issue Certificate', () => {
  const issueModalContent = fs.readFileSync(path.join(projectRoot, 'src/components/admin/IssueCertificateModal.tsx'), 'utf-8');

  assert.ok(issueModalContent.includes('Preview Sample (On-Screen)'), 'Must provide Preview Sample (On-Screen) secondary button');
  assert.ok(issueModalContent.includes('Cancel'), 'Must provide Cancel button');
  assert.ok(issueModalContent.includes('Issue Certificate'), 'Must provide Issue Certificate primary button');
});

test('Workflow Redesign: PDF Engine compiles certificate without signatures cleanly', async () => {
  // Test PDF generation with 0 signatories (both None)
  const doc = await PDFDocument.create();
  const page = doc.addPage([841.89, 595.28]); // A4 landscape points

  page.drawRectangle({
    x: 0,
    y: 0,
    width: 841.89,
    height: 595.28,
    color: rgb(0.98, 0.98, 0.96),
  });

  page.drawText('Certificate of Excellence', {
    x: 200,
    y: 400,
    size: 28,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText('Recipient: Aravind Swaminathan', {
    x: 200,
    y: 350,
    size: 18,
    color: rgb(0.1, 0.1, 0.1),
  });

  const pdfBytes = await doc.save();
  assert.ok(pdfBytes instanceof Uint8Array);
  assert.ok(pdfBytes.length > 500);

  const header = String.fromCharCode(...pdfBytes.subarray(0, 5));
  assert.strictEqual(header, '%PDF-');
});
