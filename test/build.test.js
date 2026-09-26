import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, mkdir, writeFile, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildEcosystem, shorten } from '../prep/build.js';
import { bloomFromBytes, bloomHas } from '../site/js/shared/bloom.js';
import { mulberry32 } from '../site/js/shared/rng.js';

const syllables = ['ta', 'ko', 'ri', 'mu', 'zen', 'plot', 'data', 'gg', 'lib', 'fy'];
const names = syllables.flatMap((a) => syllables.map((b) => a + b));
const quiet = () => {};

function stubSource(id, extra = {}) {
  return {
    id,
    fetchPackages: async () => names.map((name) => ({ name, description: `About\n  ${name}`, url: `https://x/${name}` })),
    describe: async (pkgs) => pkgs,
    ...extra,
  };
}

async function tmp() {
  return mkdtemp(path.join(os.tmpdir(), 'pkg-or-not-'));
}

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));

test('shorten collapses whitespace and truncates', () => {
  assert.equal(shorten('  a\n  b  '), 'a b');
  assert.equal(shorten('x'.repeat(10), 5), 'xxxx…');
  assert.equal(shorten(undefined), '');
});

test('names ecosystem writes model, names and reals', async () => {
  const outDir = await tmp();
  await buildEcosystem(stubSource('cran'), { outDir, rng: mulberry32(1), realCount: 10, log: quiet });
  const dir = path.join(outDir, 'cran');
  assert.deepEqual((await readdir(dir)).sort(), ['model.json', 'names.json', 'reals.json']);
  const model = await readJson(path.join(dir, 'model.json'));
  assert.equal(model.order, 3);
  assert.ok(Object.keys(model.t).length > 0);
  assert.equal((await readJson(path.join(dir, 'names.json'))).length, new Set(names).size);
  const reals = await readJson(path.join(dir, 'reals.json'));
  assert.equal(reals.length, 10);
  assert.match(reals[0].description, /^About \w+$/);
  assert.ok(reals[0].url.startsWith('https://x/'));
});

test('bloom ecosystem writes a filter containing every normalized name', async () => {
  const outDir = await tmp();
  await buildEcosystem(stubSource('pypi'), { outDir, rng: mulberry32(2), realCount: 5, log: quiet });
  const bloom = bloomFromBytes(await readFile(path.join(outDir, 'pypi', 'bloom.bin')));
  for (const n of names) assert.ok(bloomHas(bloom, n));
});

test('names that break the ecosystem name rule stay in the bloom but not in reals or training', async () => {
  const outDir = await tmp();
  const odd = 'Git Graph汉化版';
  const src = stubSource('openvsx', {
    fetchPackages: async () => [...names, odd].map((name) => ({ name, description: 'd', url: 'https://x/' })),
  });
  await buildEcosystem(src, { outDir, rng: mulberry32(8), realCount: 1000, log: quiet });
  const dir = path.join(outDir, 'openvsx');
  const bloom = bloomFromBytes(await readFile(path.join(dir, 'bloom.bin')));
  assert.ok(bloomHas(bloom, 'git graph汉化版'));
  const reals = await readJson(path.join(dir, 'reals.json'));
  assert.equal(reals.length, names.length);
  assert.ok(!reals.some((r) => r.name === odd));
  const model = await readJson(path.join(dir, 'model.json'));
  assert.ok(!Object.values(model.t).some(([chars]) => chars.includes('汉')));
});

test('source options shape the model', async () => {
  const outDir = await tmp();
  const src = stubSource('cran', { order: 2 });
  await buildEcosystem(src, { outDir, rng: mulberry32(3), realCount: 5, log: quiet });
  const model = await readJson(path.join(outDir, 'cran', 'model.json'));
  assert.equal(model.order, 2);
});

test('live ecosystem writes verified fakes that are not real names', async () => {
  const outDir = await tmp();
  const src = stubSource('npm', { liveExists: async () => false });
  await buildEcosystem(src, { outDir, rng: mulberry32(4), realCount: 5, fakeCount: 5, log: quiet });
  const fakes = await readJson(path.join(outDir, 'npm', 'fakes-verified.json'));
  assert.ok(fakes.length > 0 && fakes.length <= 5);
  for (const f of fakes) assert.ok(!names.includes(f));
});

test('a failing source leaves existing files untouched', async () => {
  const outDir = await tmp();
  await mkdir(path.join(outDir, 'cran'), { recursive: true });
  await writeFile(path.join(outDir, 'cran', 'model.json'), 'old');
  const src = stubSource('cran', { fetchPackages: async () => { throw new Error('network down'); } });
  await assert.rejects(buildEcosystem(src, { outDir, rng: mulberry32(5), log: quiet }), /network down/);
  assert.equal(await readFile(path.join(outDir, 'cran', 'model.json'), 'utf8'), 'old');
});

test('an empty package list is an error', async () => {
  const outDir = await tmp();
  const src = stubSource('cran', { fetchPackages: async () => [] });
  await assert.rejects(buildEcosystem(src, { outDir, rng: mulberry32(6), log: quiet }), /no packages/);
});

test('non-https real urls are written as empty strings', async () => {
  const outDir = await tmp();
  const src = stubSource('cran', {
    describe: async () => [
      { name: 'a', description: 'a desc', url: 'javascript:alert(1)' },
      { name: 'b', description: 'b desc', url: 'https://x/a' },
    ],
  });
  await buildEcosystem(src, { outDir, rng: mulberry32(7), realCount: 2, log: quiet });
  const reals = await readJson(path.join(outDir, 'cran', 'reals.json'));
  assert.equal(reals.find((r) => r.name === 'a').url, '');
  assert.equal(reals.find((r) => r.name === 'b').url, 'https://x/a');
});
