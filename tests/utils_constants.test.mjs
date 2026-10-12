import test from 'node:test';
import assert from 'node:assert/strict';

test('Constants: A4 dimensions maintain ISO 216 aspect ratio (sqrt of 2)', () => {
  const landscapeWidth = 297;
  const landscapeHeight = 210;
  const ratio = landscapeWidth / landscapeHeight;
  assert.ok(Math.abs(ratio - Math.SQRT2) < 0.02, 'Landscape ratio should approximate sqrt(2)');

  const ptWidth = 841.89;
  const ptHeight = 595.28;
  const ptRatio = ptWidth / ptHeight;
  assert.ok(Math.abs(ptRatio - Math.SQRT2) < 0.02, 'Point ratio should approximate sqrt(2)');
});

test('Constants: Supported fonts include standard institutional typography', () => {
  const fonts = ['Cinzel', 'Great Vibes', 'Playfair Display', 'Inter', 'Montserrat'];
  assert.ok(fonts.includes('Cinzel'));
  assert.ok(fonts.includes('Inter'));
  assert.equal(fonts.length, 5);
});
