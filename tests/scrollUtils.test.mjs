import test from 'node:test';
import assert from 'node:assert/strict';
import { easeInOutCubic } from '../src/utils/scrollUtils.ts';

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
