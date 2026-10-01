import { test } from 'node:test';
import assert from 'node:assert/strict';
import { confettiFor } from '../site/js/confetti.js';

test('confettiFor gives no confetti for a low score', () => {
  for (const s of [0, 1, 2, 3]) assert.equal(confettiFor(s), null, `score ${s}`);
});

test('confettiFor grows with the score band', () => {
  const mid = confettiFor(5);
  const high = confettiFor(8);
  const perfect = confettiFor(10);
  assert.ok(mid.count > 0);
  assert.ok(high.count > mid.count);
  assert.ok(perfect.count > high.count);
});

test('confettiFor fires from the center below 10 and from both corners at 10', () => {
  assert.deepEqual(confettiFor(4).origins, ['center']);
  assert.deepEqual(confettiFor(9).origins, ['center']);
  assert.deepEqual(confettiFor(10).origins, ['left', 'right']);
});

test('confettiFor gives the same settings for every score in a band', () => {
  assert.deepEqual(confettiFor(4), confettiFor(6));
  assert.deepEqual(confettiFor(7), confettiFor(9));
});
