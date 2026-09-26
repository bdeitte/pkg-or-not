import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBloom, bloomAdd, bloomHas, bloomToBytes, bloomFromBytes } from '../site/js/shared/bloom.js';

const N = 20000;
const inserted = Array.from({ length: N }, (_, i) => `pkg-${i}`);
const others = Array.from({ length: N }, (_, i) => `other-${i}`);

function filled() {
  const b = createBloom(N, 0.05);
  for (const k of inserted) bloomAdd(b, k);
  return b;
}

test('has no false negatives', () => {
  const b = filled();
  for (const k of inserted) assert.ok(bloomHas(b, k), k);
});

test('false positive rate is near the 5 percent target', () => {
  const b = filled();
  const fp = others.filter((k) => bloomHas(b, k)).length / others.length;
  assert.ok(fp < 0.07, `fp rate ${fp}`);
});

test('round-trips through bytes', () => {
  const b = filled();
  const bytes = bloomToBytes(b);
  const back = bloomFromBytes(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  assert.equal(back.m, b.m);
  assert.equal(back.k, b.k);
  for (const k of inserted) assert.ok(bloomHas(back, k));
  for (const k of others.slice(0, 1000)) assert.equal(bloomHas(back, k), bloomHas(b, k));
});

test('handles non-ASCII keys', () => {
  const b = createBloom(10, 0.05);
  bloomAdd(b, 'café');
  assert.ok(bloomHas(b, 'café'));
});

test('bloomFromBytes throws on truncated data', () => {
  const b = filled();
  const bytes = bloomToBytes(b);
  const truncated = bytes.subarray(0, bytes.length - 1);
  assert.throws(() => bloomFromBytes(truncated), /truncated/);
});
