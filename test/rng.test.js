import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, randInt, pick, sample } from '../site/js/shared/rng.js';

test('mulberry32 is deterministic and in [0, 1)', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  for (let i = 0; i < 1000; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
});

test('randInt stays in range', () => {
  const rng = mulberry32(1);
  for (let i = 0; i < 1000; i++) {
    const n = randInt(rng, 7);
    assert.ok(Number.isInteger(n) && n >= 0 && n < 7);
  }
});

test('pick returns an element of the array', () => {
  const rng = mulberry32(2);
  const arr = ['a', 'b', 'c'];
  for (let i = 0; i < 100; i++) assert.ok(arr.includes(pick(rng, arr)));
});

test('sample returns n distinct elements and does not mutate input', () => {
  const rng = mulberry32(3);
  const arr = Array.from({ length: 100 }, (_, i) => i);
  const copy = arr.slice();
  const s = sample(rng, arr, 10);
  assert.equal(s.length, 10);
  assert.equal(new Set(s).size, 10);
  for (const x of s) assert.ok(arr.includes(x));
  assert.deepEqual(arr, copy);
});

test('sample returns everything when n exceeds length', () => {
  const s = sample(mulberry32(4), [1, 2, 3], 10);
  assert.deepEqual([...s].sort(), [1, 2, 3]);
});
