import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeResults, decodeResults, packPayload } from '../site/js/share.js';
import { mulberry32 } from '../site/js/shared/rng.js';

function sample(overrides = {}) {
  const rounds = [];
  for (let i = 0; i < 10; i++) {
    const isFake = i % 3 === 0;
    rounds.push({
      eco: 'cran',
      name: `pkgname${i}`,
      isFake,
      guess: i % 2 === 0 ? 'real' : 'fake',
      url: isFake ? undefined : `https://p3m.dev/client/#/repos/cran/packages/pkgname${i}/overview`,
    });
  }
  return { choice: 'cran', sayingIndex: 1, rounds, ...overrides };
}

test('encodeResults and decodeResults round trip', async () => {
  const results = sample();
  const token = await encodeResults(results);
  assert.deepEqual(await decodeResults(token), results);
});

test('round trip works for mixed games with several ecosystems', async () => {
  const results = sample({ choice: 'mixed' });
  results.rounds[2].eco = 'npm';
  results.rounds[2].url = 'https://www.npmjs.com/package/pkgname2';
  results.rounds[4].eco = 'openvsx';
  results.rounds[4].url = 'https://p3m.dev/client/#/repos/openvsx/packages/pub.ext/overview';
  assert.deepEqual(await decodeResults(await encodeResults(results)), results);
});

test('round trip keeps non-ASCII names', async () => {
  const results = sample();
  results.rounds[1].name = 'Dot Star DX Studio ✓';
  assert.deepEqual(await decodeResults(await encodeResults(results)), results);
});

test('token is URL safe', async () => {
  const token = await encodeResults(sample());
  assert.match(token, /^[A-Za-z0-9_-]+$/);
});

test('token hides names, even after a plain base64 decode', async () => {
  const token = await encodeResults(sample());
  assert.ok(!token.includes('pkgname'));
  const b64 = token.replace(/-/g, '+').replace(/_/g, '/');
  const decoded = Buffer.from(b64, 'base64').toString('latin1');
  assert.ok(!decoded.includes('pkgname'));
  assert.ok(!decoded.includes('cran'));
});

test('decodeResults returns null for garbage, empty or truncated tokens', async () => {
  const token = await encodeResults(sample());
  assert.equal(await decodeResults(''), null);
  assert.equal(await decodeResults('not a token!'), null);
  assert.equal(await decodeResults('AAAA'), null);
  assert.equal(await decodeResults(token.slice(0, token.length - 8)), null);
  assert.equal(await decodeResults(null), null);
});

test('decodeResults rejects a wrong version', async () => {
  const token = await packPayload({ v: 99, c: 'cran', s: 0, r: [] });
  assert.equal(await decodeResults(token), null);
});

// A valid payload plus an unused pad field, which the decoder would otherwise ignore.
function paddedToken(pad) {
  const { choice, sayingIndex, rounds } = sample();
  const r = rounds.map((x) => [x.eco, x.name, x.isFake ? 1 : 0, x.guess, x.url || '']);
  return packPayload({ v: 1, c: choice, s: sayingIndex, r, pad });
}

test('padded tokens decode when they are small', async () => {
  assert.deepEqual(await decodeResults(await paddedToken('x')), sample());
});

test('decodeResults rejects an overlong token even when its contents are valid', async () => {
  const rng = mulberry32(7);
  let pad = '';
  while (pad.length < 6000) pad += Math.floor(rng() * 36).toString(36);
  const token = await paddedToken(pad);
  assert.ok(token.length > 4096, `token is only ${token.length} chars`);
  assert.equal(await decodeResults(token), null);
});

test('decodeResults rejects a small token that inflates to a huge payload', async () => {
  const token = await paddedToken('a'.repeat(2_000_000));
  assert.ok(token.length < 4096, `bomb token is ${token.length} chars`);
  assert.equal(await decodeResults(token), null);
});

test('decodeResults rejects a javascript: url', async () => {
  const results = sample();
  results.rounds[1].url = 'javascript:alert(1)';
  assert.equal(await decodeResults(await encodeResults(results)), null);
});

test('decodeResults rejects a url outside the registry sites', async () => {
  const results = sample();
  results.rounds[1].url = 'https://evil.example/cran/pkgname1';
  assert.equal(await decodeResults(await encodeResults(results)), null);
});

test("decodeResults rejects a url from another ecosystem's registry", async () => {
  const results = sample({ choice: 'mixed' });
  results.rounds[1].eco = 'npm';
  assert.equal(await decodeResults(await encodeResults(results)), null);
});

test('decodeResults rejects an unknown ecosystem or wrong round count', async () => {
  assert.equal(await decodeResults(await encodeResults(sample({ choice: 'nope' }))), null);
  const short = sample();
  short.rounds.pop();
  assert.equal(await decodeResults(await encodeResults(short)), null);
  const wrongEco = sample();
  wrongEco.rounds[0].eco = 'npm';
  assert.equal(await decodeResults(await encodeResults(wrongEco)), null);
});

test('decodeResults rejects a bad guess or saying index', async () => {
  const badGuess = sample();
  badGuess.rounds[0].guess = 'maybe';
  assert.equal(await decodeResults(await encodeResults(badGuess)), null);
  assert.equal(await decodeResults(await encodeResults(sample({ sayingIndex: 999 }))), null);
});
