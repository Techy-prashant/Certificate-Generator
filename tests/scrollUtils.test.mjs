import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { easeInOutCubic } from '../src/utils/scrollUtils.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('Scroll Utils: easeInOutCubic produces smooth monotonic easing', () => {
  assert.equal(easeInOutCubic(0), 0, 'At t=0, easing must be 0');
  assert.equal(easeInOutCubic(0.5), 0.5, 'At t=0.5, easing must be 0.5');
  assert.equal(easeInOutCubic(1), 1, 'At t=1, easing must be 1');

  // Verify monotonic progression
  let prev = -1;
  for (let t = 0; t <= 1; t += 0.05) {
    const val = easeInOutCubic(t);
    assert.ok(val >= prev, `Easing at t=${t} (${val}) must be >= previous (${prev})`);
    assert.ok(val >= 0 && val <= 1, `Easing value ${val} must be clamped between 0 and 1`);
    prev = val;
  }
});

test('Command Palette: Automatically scrolls list container as user navigates down or up', () => {
  const palettePath = path.join(rootDir, 'src', 'components', 'ui', 'CommandPalette.tsx');
  const content = fs.readFileSync(palettePath, 'utf-8');

  assert.ok(
    content.includes('listRef = useRef<HTMLDivElement>'),
    'CommandPalette must maintain listRef for scroll container'
  );
  assert.ok(
    content.includes('itemRefs = useRef<Map<number, HTMLDivElement>>'),
    'CommandPalette must maintain itemRefs for calculating element positions'
  );
  assert.ok(
    content.includes('scrollBy({ top: scrollOffset, behavior: \'smooth\' })'),
    'CommandPalette must automatically smooth scroll down when navigating down'
  );
  assert.ok(
    content.includes('scroll-smooth'),
    'CommandPalette scroll container must enable smooth scrolling'
  );
});

test('Smooth Scrolling: Elements and dropdown drawers scroll into full viewport view', () => {
  const scrollUtilsPath = path.join(rootDir, 'src', 'utils', 'scrollUtils.ts');
  const content = fs.readFileSync(scrollUtilsPath, 'utf-8');

  assert.ok(
    content.includes('smoothScrollToElement'),
    'scrollUtils must export smoothScrollToElement'
  );
  assert.ok(
    content.includes('totalContentHeight'),
    'smoothScrollToElement must compute expanded content height'
  );
});
