import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SAYINGS, pickSaying, pickSayingIndex, sayingAt, FAKE_CAUGHT, pickFakeCaught, FAKE_MISSED, pickFakeMissed } from '../site/js/sayings.js';
import { ECOSYSTEM_IDS } from '../site/js/shared/ecosystems.js';
import { mulberry32 } from '../site/js/shared/rng.js';

const BANDS = ['low', 'mid', 'high', 'perfect'];

test('every ecosystem and band has at least two sayings', () => {
  for (const eco of [...ECOSYSTEM_IDS, 'mixed']) {
    for (const band of BANDS) {
      const list = SAYINGS[eco]?.[band];
      assert.ok(Array.isArray(list) && list.length >= 2, `${eco}/${band}`);
      for (const s of list) assert.ok(typeof s === 'string' && s.length > 0);
    }
  }
});

test('pickSaying chooses from the right band', () => {
  const rng = mulberry32(1);
  assert.ok(SAYINGS.npm.perfect.includes(pickSaying('npm', 10, rng)));
  assert.ok(SAYINGS.cran.low.includes(pickSaying('cran', 2, rng)));
  assert.ok(SAYINGS.mixed.mid.includes(pickSaying('mixed', 5, rng)));
});

test('pickSayingIndex returns an index into the right band', () => {
  const rng = mulberry32(2);
  for (let i = 0; i < 20; i++) {
    const idx = pickSayingIndex('pypi', 8, rng);
    assert.ok(Number.isInteger(idx) && idx >= 0 && idx < SAYINGS.pypi.high.length);
  }
});

test('sayingAt returns the saying for an ecosystem, score and index', () => {
  assert.equal(sayingAt('cran', 10, 1), SAYINGS.cran.perfect[1]);
  assert.equal(sayingAt('mixed', 0, 0), SAYINGS.mixed.low[0]);
});

test('sayingAt returns null for an unknown ecosystem or out-of-range index', () => {
  assert.equal(sayingAt('nope', 5, 0), null);
  assert.equal(sayingAt('npm', 5, 999), null);
  assert.equal(sayingAt('npm', 5, -1), null);
  assert.equal(sayingAt('npm', 5, 1.5), null);
});

test('there are 20 distinct lines for correctly spotting a fake', () => {
  assert.equal(FAKE_CAUGHT.length, 20);
  assert.equal(new Set(FAKE_CAUGHT).size, 20);
  for (const s of FAKE_CAUGHT) assert.ok(typeof s === 'string' && s.length > 0);
});

test('pickFakeCaught chooses one of the fake-caught lines', () => {
  const rng = mulberry32(3);
  for (let i = 0; i < 20; i++) assert.ok(FAKE_CAUGHT.includes(pickFakeCaught(rng)));
});

test('there are 20 distinct lines for mistaking a fake for real', () => {
  assert.equal(FAKE_MISSED.length, 20);
  assert.equal(new Set(FAKE_MISSED).size, 20);
  for (const s of FAKE_MISSED) assert.ok(typeof s === 'string' && s.length > 0);
});

test('pickFakeMissed chooses one of the fake-missed lines', () => {
  const rng = mulberry32(4);
  for (let i = 0; i < 20; i++) assert.ok(FAKE_MISSED.includes(pickFakeMissed(rng)));
});
