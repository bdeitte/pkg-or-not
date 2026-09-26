import { test } from 'node:test';
import assert from 'node:assert/strict';
import { train, percentile } from '../prep/markov.js';
import { sampleName, START, END } from '../site/js/shared/markov-sample.js';
import { mulberry32 } from '../site/js/shared/rng.js';

const syllables = ['ta', 'ko', 'ri', 'mu', 'zen', 'plot', 'data', 'gg', 'lib', 'fy'];
const names = syllables.flatMap((a) => syllables.map((b) => a + b));

test('train counts transitions from padded names', () => {
  const model = train(['abc', 'abd'], { order: 2 });
  assert.equal(model.order, 2);
  assert.deepEqual(model.t[START + START], ['a', [2]]);
  const [chars, weights] = model.t['ab'];
  assert.equal(chars, 'cd');
  assert.deepEqual(weights, [1, 1]);
  assert.deepEqual(model.t['bc'], [END, [1]]);
});

test('train records 10th and 90th percentile lengths', () => {
  const model = train(['a', 'bb', 'ccc', 'dddd', 'eeeee', 'ffffff', 'ggggggg', 'hhhhhhhh', 'iiiiiiiii', 'jjjjjjjjjj', 'kkkkkkkkkkk']);
  assert.equal(model.minLen, 2);
  assert.equal(model.maxLen, 10);
});

test('percentile picks from a sorted list', () => {
  assert.equal(percentile([1, 2, 3, 4, 5], 0), 1);
  assert.equal(percentile([1, 2, 3, 4, 5], 1), 5);
  assert.equal(percentile([], 0.5), 0);
});

test('minCount drops rare transitions', () => {
  const model = train(['aab', 'aab', 'aac'], { order: 1, minCount: 2 });
  assert.deepEqual(model.t['a'], ['ab', [3, 2]]);
});

test('sampled names only use characters seen in training', () => {
  const model = train(names, { order: 2 });
  const alphabet = new Set(names.join(''));
  const rng = mulberry32(7);
  let produced = 0;
  for (let i = 0; i < 200; i++) {
    const s = sampleName(model, rng);
    if (s === null) continue;
    produced++;
    for (const ch of s) assert.ok(alphabet.has(ch), `unexpected ${ch}`);
  }
  assert.ok(produced > 150);
});

test('sampling is deterministic for a seed', () => {
  const model = train(names, { order: 2 });
  const a = mulberry32(9);
  const b = mulberry32(9);
  for (let i = 0; i < 20; i++) assert.equal(sampleName(model, a), sampleName(model, b));
});

test('sampleName returns null past maxChars', () => {
  const model = { order: 1, minLen: 1, maxLen: 5, t: { [START]: ['a', [1]], a: ['a', [1]] } };
  assert.equal(sampleName(model, mulberry32(1), 5), null);
});

test('sampleName returns null on a missing context', () => {
  const model = { order: 1, minLen: 1, maxLen: 5, t: { [START]: ['a', [1]] } };
  assert.equal(sampleName(model, mulberry32(1)), null);
});
