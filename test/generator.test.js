import { test } from 'node:test';
import assert from 'node:assert/strict';
import { train } from '../prep/markov.js';
import { mulberry32 } from '../site/js/shared/rng.js';
import { isBlocked } from '../site/js/blocklist.js';
import { isPlausible, isValidName, generateFake } from '../site/js/generator.js';

const syllables = ['ta', 'ko', 'ri', 'mu', 'zen', 'plot', 'data', 'gg', 'lib', 'fy'];
const names = syllables.flatMap((a) => syllables.map((b) => a + b));
const model = train(names, { order: 2 });
const known = new Set(names);

function localSource(overrides = {}) {
  return { eco: 'cran', model, live: false, verifiedFakes: [], exists: async (n) => known.has(n.toLowerCase()), ...overrides };
}

test('isBlocked catches unambiguous words anywhere and short words as whole segments', () => {
  assert.ok(isBlocked('xfuckx'));
  assert.ok(isBlocked('rape-kit'));
  assert.ok(!isBlocked('scraper'));
  assert.ok(!isBlocked('cockpit'));
  assert.ok(!isBlocked('analysis'));
});

test('isPlausible enforces length, name rules and the blocklist', () => {
  const m = { minLen: 3, maxLen: 10 };
  assert.ok(isPlausible('cran', m, 'ggzen'));
  assert.ok(!isPlausible('cran', m, null));
  assert.ok(!isPlausible('cran', m, 'ab'));
  assert.ok(!isPlausible('cran', m, 'abcdefghijk'));
  assert.ok(!isPlausible('cran', m, '9lives'));
  assert.ok(!isPlausible('cran', m, 'has-dash'));
  assert.ok(isPlausible('npm', m, '@a/b-c'));
  assert.ok(!isPlausible('npm', m, '@ab'));
  assert.ok(!isPlausible('npm', m, 'UpperCase'));
  assert.ok(!isPlausible('cran', m, 'shitplot'));
});

test('isValidName accepts printable ASCII display names for openvsx', () => {
  assert.ok(isValidName('openvsx', 'Git Graph'));
  assert.ok(isValidName('openvsx', 'C/C++ Themes'));
  assert.ok(isValidName('openvsx', 'YAML'));
  assert.ok(!isValidName('openvsx', 'Git Graph汉化版'));
  assert.ok(!isValidName('openvsx', 'Free Repo Agent — AI'));
  assert.ok(!isValidName('openvsx', ' Leading'));
  assert.ok(!isValidName('openvsx', 'Trailing '));
  assert.ok(!isValidName('openvsx', 'Double  Space'));
  assert.ok(!isValidName('openvsx', '(Parens)'));
});

test('isValidName uses the same rule as isPlausible', () => {
  assert.ok(isValidName('cran', 'ggzen'));
  assert.ok(!isValidName('cran', 'has-dash'));
});

test('generateFake returns a plausible name that does not exist', async () => {
  const rng = mulberry32(5);
  for (let i = 0; i < 20; i++) {
    const name = await generateFake(localSource(), rng);
    assert.ok(name, 'expected a name');
    assert.ok(!known.has(name));
    assert.ok(isPlausible('cran', model, name));
  }
});

test('generateFake returns null when every candidate exists', async () => {
  const name = await generateFake(localSource({ exists: async () => true }), mulberry32(1));
  assert.equal(name, null);
});

test('generateFake skips names in avoid', async () => {
  const rng = mulberry32(11);
  const avoid = new Set();
  for (let i = 0; i < 10; i++) {
    const name = await generateFake(localSource(), rng, { avoid, maxTries: 500 });
    assert.ok(!avoid.has(name));
    avoid.add(name);
  }
});

test('live source returns a live-checked name', async () => {
  let calls = 0;
  const src = localSource({ eco: 'npm', live: true, exists: async () => { calls++; return false; } });
  const name = await generateFake(src, mulberry32(2));
  assert.ok(name);
  assert.equal(calls, 1);
});

test('live source falls back to verified fakes when the check throws', async () => {
  const src = localSource({ eco: 'npm', live: true, verifiedFakes: ['zenkofy'], exists: async () => { throw new Error('offline'); } });
  assert.equal(await generateFake(src, mulberry32(2)), 'zenkofy');
});

test('live source stops after maxLiveChecks and falls back', async () => {
  let calls = 0;
  const src = localSource({ eco: 'npm', live: true, verifiedFakes: ['zenkofy'], exists: async () => { calls++; return true; } });
  assert.equal(await generateFake(src, mulberry32(2), { maxLiveChecks: 3 }), 'zenkofy');
  assert.equal(calls, 3);
});

test('live source with no verified fakes returns null on failure', async () => {
  const src = localSource({ eco: 'npm', live: true, exists: async () => { throw new Error('offline'); } });
  assert.equal(await generateFake(src, mulberry32(2)), null);
});

const scopedNames = ['@ab/cd', '@ab/ce', '@ac/cd', '@ac/ce', '@ad/cd', '@ad/ce'];
const scopedModel = train(scopedNames, { order: 2 });

test('live source with a scoped candidate returns a verified scoped fake without calling exists', async () => {
  let calls = 0;
  const src = {
    eco: 'npm', model: scopedModel, live: true,
    verifiedFakes: ['@zz/verified', 'plainfake'],
    exists: async () => { calls++; return false; },
  };
  assert.equal(await generateFake(src, mulberry32(3)), '@zz/verified');
  assert.equal(calls, 0);
});

test('live source with no scoped verified fakes skips scoped candidates without calling exists', async () => {
  let calls = 0;
  const src = {
    eco: 'npm', model: scopedModel, live: true,
    verifiedFakes: ['plainfake'],
    exists: async () => { calls++; return false; },
  };
  assert.equal(await generateFake(src, mulberry32(3)), 'plainfake');
  assert.equal(calls, 0);
});
