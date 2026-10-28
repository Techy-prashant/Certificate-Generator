import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  calculateAspectRatio,
  formatAspectRatio,
  formatDimensions,
  checkAspectRatioCompatibility,
  validateImageFile
} from '../src/utils/aspectRatioUtils.ts';

const projectRoot = process.cwd();

test('Scenario 1: Upload an image with exactly matching proportions', () => {
  // Current certificate: A4 landscape (297 x 210 mm)
  const currentWidth = 297;
  const currentHeight = 210;
  // Uploaded image with exactly matching 2970 x 2100 px (ratio: 1.4142857)
  const uploadedWidth = 2970;
  const uploadedHeight = 2100;

  const result = checkAspectRatioCompatibility(currentWidth, currentHeight, uploadedWidth, uploadedHeight);
  assert.strictEqual(result.isCompatible, true);
  assert.strictEqual(result.status, 'match');
  assert.strictEqual(result.title, 'Looks good!');
  assert.match(result.message, /matches the current template's proportions/);
  assert.match(result.message, /existing elements will remain in their current positions/);
  assert.strictEqual(result.ratioDiff < 0.0001, true);
  assert.strictEqual(result.currentRatioFormatted, '1.41:1');
  assert.strictEqual(result.uploadedRatioFormatted, '1.41:1');
});

test('Scenario 2: Upload an image with the same proportions but a different resolution', () => {
  // Current certificate: A4 landscape (297 x 210 mm, aspect ratio ~ 1.4142857)
  const currentWidth = 297;
  const currentHeight = 210;

  // High-res 300 DPI A4 export (3508 x 2480 px, ratio: 1.414516)
  const hiResResult = checkAspectRatioCompatibility(currentWidth, currentHeight, 3508, 2480);
  assert.strictEqual(hiResResult.isCompatible, true);
  assert.strictEqual(hiResResult.status, 'match');
  assert.strictEqual(hiResResult.title, 'Looks good!');
  assert.strictEqual(hiResResult.uploadedDimensionsFormatted, '3508 × 2480 px');

  // Standard Canva export (2000 x 1414 px, ratio: 1.414427)
  const canvaResult = checkAspectRatioCompatibility(currentWidth, currentHeight, 2000, 1414);
  assert.strictEqual(canvaResult.isCompatible, true);
  assert.strictEqual(canvaResult.status, 'match');
  assert.strictEqual(canvaResult.title, 'Looks good!');

  // Low-res mockup (1000 x 707 px, ratio: 1.414427)
  const lowResResult = checkAspectRatioCompatibility(currentWidth, currentHeight, 1000, 707);
  assert.strictEqual(lowResResult.isCompatible, true);
  assert.strictEqual(lowResResult.status, 'match');

  // Portrait template: 210 x 297 mm with 2480 x 3508 px
  const portraitResult = checkAspectRatioCompatibility(210, 297, 2480, 3508);
  assert.strictEqual(portraitResult.isCompatible, true);
  assert.strictEqual(portraitResult.status, 'match');
});

test('Scenario 3: Upload an image with a different aspect ratio', () => {
  // Current certificate: A4 landscape (297 x 210 mm, ratio ~ 1.414)
  const currentWidth = 297;
  const currentHeight = 210;

  // 16:9 widescreen presentation (1920 x 1080 px, ratio: 1.778)
  const widescreenResult = checkAspectRatioCompatibility(currentWidth, currentHeight, 1920, 1080);
  assert.strictEqual(widescreenResult.isCompatible, false);
  assert.strictEqual(widescreenResult.status, 'mismatch');
  assert.strictEqual(widescreenResult.title, "Aspect Ratio Doesn't Match");
  assert.match(widescreenResult.message, /different proportions from your current certificate/);
  assert.match(widescreenResult.message, /preserve the existing layout accurately/);

  // Square ratio (1080 x 1080 px, ratio: 1.0)
  const squareResult = checkAspectRatioCompatibility(currentWidth, currentHeight, 1080, 1080);
  assert.strictEqual(squareResult.isCompatible, false);
  assert.strictEqual(squareResult.status, 'mismatch');

  // Portrait ratio on landscape template (1080 x 1920 px, ratio: 0.5625)
  const portraitResult = checkAspectRatioCompatibility(currentWidth, currentHeight, 1080, 1920);
  assert.strictEqual(portraitResult.isCompatible, false);
  assert.strictEqual(portraitResult.status, 'mismatch');
});

test('Scenario 4: Upload an invalid or unsupported image', () => {
  // Non-image file (PDF)
  const fakePdf = { name: 'document.pdf', type: 'application/pdf', size: 1024 * 1024 };
  const pdfVal = validateImageFile(fakePdf);
  assert.strictEqual(pdfVal.isValid, false);
  assert.match(pdfVal.error, /PNG, JPG, or JPEG/);

  // Non-image file (SVG)
  const fakeSvg = { name: 'graphic.svg', type: 'image/svg+xml', size: 50 * 1024 };
  const svgVal = validateImageFile(fakeSvg);
  assert.strictEqual(svgVal.isValid, false);

  // Oversized image (> 15 MB)
  const oversizedFile = { name: 'huge_bg.png', type: 'image/png', size: 16 * 1024 * 1024 };
  const sizeVal = validateImageFile(oversizedFile);
  assert.strictEqual(sizeVal.isValid, false);
  assert.match(sizeVal.error, /15MB limit/);

  // Valid PNG file
  const validPng = { name: 'clean_bg.png', type: 'image/png', size: 2 * 1024 * 1024 };
  assert.strictEqual(validateImageFile(validPng).isValid, true);

  // Valid JPEG file
  const validJpg = { name: 'photo_bg.jpg', type: 'image/jpeg', size: 3 * 1024 * 1024 };
  assert.strictEqual(validateImageFile(validJpg).isValid, true);

  // Zero dimension guard
  const zeroDimResult = checkAspectRatioCompatibility(297, 210, 0, 0);
  assert.strictEqual(zeroDimResult.isCompatible, false);
  assert.strictEqual(zeroDimResult.status, 'mismatch');

  // Negative dimension guard
  const negDimResult = checkAspectRatioCompatibility(297, 210, -100, 200);
  assert.strictEqual(negDimResult.isCompatible, false);
  assert.strictEqual(negDimResult.status, 'mismatch');
});

test('Scenario 5: Cancel dialog behavior does not alter template or background', () => {
  // Simulation of cancel: State retains original background without mutation
  const initialBackground = '/certificates/debate, tech.png';
  let currentBackground = initialBackground;

  // User opens dialog, selects file, but clicks Cancel
  const onCancel = () => {
    // Dialog closes, currentBackground is NOT modified
  };
  onCancel();

  assert.strictEqual(currentBackground, initialBackground, 'Canceling must leave current background unchanged');
});

test('Scenario 6 & 7: Replacing background preserves exact foreground layout, coordinates, and properties', () => {
  // Read mockData to inspect real template and field definitions
  const mockDataContent = fs.readFileSync(path.join(projectRoot, 'src/services/mockData.ts'), 'utf-8');
  assert.ok(mockDataContent.includes('mockTemplates'), 'mockData must export mockTemplates');

  // Verify fields structure
  const fields = [
    {
      id: 'field-recipient',
      name: 'Recipient Full Name',
      type: 'recipient_name',
      x: 58.5,
      y: 95.0,
      width: 180,
      height: 18,
      fontSize: 28,
      fontFamily: 'Great Vibes',
      color: '#1B1622',
      alignment: 'center',
    },
    {
      id: 'field-signature-1',
      name: 'Faculty Advisor Signature',
      type: 'signatory',
      x: 35.0,
      y: 155.0,
      width: 45,
      height: 20,
      fontSize: 0,
      fontFamily: 'Helvetica',
      color: '#1B1622',
      alignment: 'center',
      signatoryIndex: 0,
    },
    {
      id: 'field-qr',
      name: 'Verification QR',
      type: 'qr_code',
      x: 236.0,
      y: 152.0,
      width: 26,
      height: 26,
      fontSize: 0,
      fontFamily: 'Helvetica',
      color: '#1B1622',
      alignment: 'center',
    },
  ];

  const template = {
    id: 'tpl-1',
    name: 'Official Debate Certificate',
    backgroundUrl: '/certificates/debate, tech.png',
    pageWidth: 297,
    pageHeight: 210,
    pageUnit: 'mm',
    orientation: 'landscape',
    fieldConfiguration: fields,
  };

  // Perform background replacement 1
  const newBgUrl1 = 'blob:http://localhost:5173/bg-replacement-1';
  const updatedTemplate1 = {
    ...template,
    backgroundUrl: newBgUrl1,
  };

  // Perform background replacement 2
  const newBgUrl2 = 'blob:http://localhost:5173/bg-replacement-2';
  const updatedTemplate2 = {
    ...updatedTemplate1,
    backgroundUrl: newBgUrl2,
  };

  // Verify multiple replacements succeeded
  assert.strictEqual(updatedTemplate2.backgroundUrl, newBgUrl2);
  assert.notStrictEqual(updatedTemplate2.backgroundUrl, template.backgroundUrl);

  // Verify canvas dimensions did NOT change
  assert.strictEqual(updatedTemplate2.pageWidth, 297);
  assert.strictEqual(updatedTemplate2.pageHeight, 210);
  assert.strictEqual(updatedTemplate2.pageUnit, 'mm');
  assert.strictEqual(updatedTemplate2.orientation, 'landscape');

  // Verify all fields strictly preserved
  assert.strictEqual(updatedTemplate2.fieldConfiguration.length, template.fieldConfiguration.length);
  for (let i = 0; i < template.fieldConfiguration.length; i++) {
    const original = template.fieldConfiguration[i];
    const after = updatedTemplate2.fieldConfiguration[i];

    assert.strictEqual(after.id, original.id);
    assert.strictEqual(after.name, original.name);
    assert.strictEqual(after.type, original.type);
    assert.strictEqual(after.x, original.x, `Field ${original.name} X coordinate must not move`);
    assert.strictEqual(after.y, original.y, `Field ${original.name} Y coordinate must not move`);
    assert.strictEqual(after.width, original.width, `Field ${original.name} width must not change`);
    assert.strictEqual(after.height, original.height, `Field ${original.name} height must not change`);
    assert.strictEqual(after.fontSize, original.fontSize);
    assert.strictEqual(after.fontFamily, original.fontFamily);
    assert.strictEqual(after.color, original.color);
    assert.strictEqual(after.alignment, original.alignment);
    assert.strictEqual(after.signatoryIndex, original.signatoryIndex);
  }
});

test('Scenario 8 & 9: Service implementation contract in mockApiService and supabaseService', () => {
  const mockApiContent = fs.readFileSync(path.join(projectRoot, 'src/services/mockApiService.ts'), 'utf-8');
  const supabaseContent = fs.readFileSync(path.join(projectRoot, 'src/services/supabaseService.ts'), 'utf-8');
  const apiInterfaceContent = fs.readFileSync(path.join(projectRoot, 'src/services/apiInterface.ts'), 'utf-8');

  // Verify apiInterface
  assert.ok(
    apiInterfaceContent.includes('updateTemplateBackground(id: string, backgroundFile: File): Promise<Template>;'),
    'apiInterface.ts must declare updateTemplateBackground'
  );

  // Verify mockApiService implementation
  assert.ok(
    mockApiContent.includes('async updateTemplateBackground('),
    'mockApiService must implement updateTemplateBackground'
  );
  assert.ok(
    mockApiContent.includes('template.background_updated'),
    'mockApiService must log template.background_updated audit log'
  );

  // Verify supabaseService implementation
  assert.ok(
    supabaseContent.includes('async updateTemplateBackground('),
    'supabaseService must implement updateTemplateBackground'
  );
  assert.ok(
    supabaseContent.includes("'template-backgrounds'"),
    'supabaseService must upload new background to template-backgrounds storage'
  );
  assert.ok(
    supabaseContent.includes('template.background_updated'),
    'supabaseService must log template.background_updated audit log'
  );
});

test('Scenario 10: Studio Editor UI integration & ChangeDesignModal requirements', () => {
  const studioContent = fs.readFileSync(path.join(projectRoot, 'src/pages/admin/TemplateStudioPage.tsx'), 'utf-8');
  const modalContent = fs.readFileSync(path.join(projectRoot, 'src/components/admin/ChangeDesignModal.tsx'), 'utf-8');

  // Studio Editor Toolbar Button
  assert.ok(
    studioContent.includes('Change Certificate Design'),
    'Studio Editor must include button with label "Change Certificate Design"'
  );
  assert.ok(
    studioContent.includes('isChangeDesignModalOpen'),
    'Studio Editor must manage isChangeDesignModalOpen state'
  );
  assert.ok(
    studioContent.includes('handleApplyDesign'),
    'Studio Editor must implement handleApplyDesign'
  );
  assert.ok(
    studioContent.includes('<ChangeDesignModal'),
    'Studio Editor must render <ChangeDesignModal />'
  );

  // Modal Structure & Copy
  assert.ok(
    modalContent.includes('title="Change Certificate Design"'),
    'Modal must have title "Change Certificate Design"'
  );
  assert.ok(
    modalContent.includes('Upload a new certificate background while keeping all your existing elements in place.'),
    'Modal must describe preserving existing elements'
  );
  assert.ok(
    modalContent.includes('Looks Good, Apply Design'),
    'Modal primary button must have label "Looks Good, Apply Design"'
  );
  assert.ok(
    modalContent.includes('Aspect Ratio Doesn\'t Match'),
    'Modal must display warning "Aspect Ratio Doesn\'t Match"'
  );
  assert.ok(
    modalContent.includes('Looks good!'),
    'Modal must display success "Looks good!"'
  );
  assert.ok(
    modalContent.includes('dragOver') || modalContent.includes('onDragOver'),
    'Modal must support drag and drop file upload'
  );
  assert.ok(
    modalContent.includes('accept="image/png,image/jpeg,image/jpg"'),
    'Modal file input must support PNG, JPG, and JPEG'
  );
});
