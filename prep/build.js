// Builds site/data/<eco>/ for each ecosystem: Markov model, existence data,
// sampled real names, and (npm only) pre-verified fakes.
// Usage: node prep/build.js [eco ...]

import { mkdir, writeFile, rm, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ECOSYSTEMS } from '../site/js/shared/ecosystems.js';
import { normalize } from '../site/js/shared/normalize.js';
import { createBloom, bloomAdd, bloomToBytes } from '../site/js/shared/bloom.js';
import { mulberry32, sample } from '../site/js/shared/rng.js';
import { generateFake, isValidName } from '../site/js/generator.js';
import { train } from './markov.js';

export const DEFAULT_OUT = fileURLToPath(new URL('../site/data/', import.meta.url));

export function shorten(text, max = 200) {
  const s = (text ?? '').replace(/\s+/g, ' ').trim();
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

async function writeAtomically(dir, files) {
  const tmp = `${dir}.tmp`;
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  for (const [name, content] of Object.entries(files)) await writeFile(path.join(tmp, name), content);
  await rm(dir, { recursive: true, force: true });
  await rename(tmp, dir);
}

async function verifiedFakes(eco, model, keys, liveExists, rng, count, log) {
  const exists = async (name) => keys.has(normalize(eco, name)) || (await liveExists(name));
  const found = new Set();
  for (let attempt = 0; found.size < count && attempt < count * 5; attempt++) {
    try {
      const name = await generateFake({ eco, model, exists, live: false }, rng, { avoid: found });
      if (name) found.add(name);
    } catch (err) {
      log(`[${eco}] live check failed: ${err.message}`);
    }
  }
  return [...found];
}

export async function buildEcosystem(source, {
  outDir = DEFAULT_OUT,
  rng = Math.random,
  realCount = 1000,
  trainCount = 150000,
  fakeCount = 200,
  bloomFpRate = 0.05,
  log = console.log,
} = {}) {
  const eco = source.id;
  const { check } = ECOSYSTEMS[eco];

  log(`[${eco}] fetching packages`);
  const pkgs = await source.fetchPackages();
  if (pkgs.length === 0) throw new Error(`[${eco}] no packages fetched`);
  log(`[${eco}] ${pkgs.length} packages`);

  // Names that break the ecosystem's name rule (for example non-ASCII display
  // names) still count as existing, but are never shown or trained on.
  const shown = pkgs.filter((p) => isValidName(eco, p.name));
  const trainingNames = sample(rng, shown, trainCount).map((p) => p.name);
  const model = train(trainingNames, { order: source.order ?? 3, minCount: source.minCount ?? 1 });
  const files = { 'model.json': JSON.stringify(model) };

  const keys = new Set(pkgs.map((p) => normalize(eco, p.name)));
  if (check === 'names') files['names.json'] = JSON.stringify([...keys].sort());
  if (check === 'bloom') {
    const bloom = createBloom(keys.size, bloomFpRate);
    for (const k of keys) bloomAdd(bloom, k);
    files['bloom.bin'] = bloomToBytes(bloom);
  }

  log(`[${eco}] describing ${Math.min(realCount, shown.length)} real names`);
  const reals = await source.describe(sample(rng, shown, realCount));
  files['reals.json'] = JSON.stringify(reals.map((r) => ({
    name: r.name,
    description: shorten(r.description),
    url: r.url && r.url.startsWith('https://') ? r.url : '',
  })));

  if (check === 'live') {
    log(`[${eco}] verifying ${fakeCount} fakes against the registry`);
    files['fakes-verified.json'] = JSON.stringify(await verifiedFakes(eco, model, keys, source.liveExists, rng, fakeCount, log));
  }

  await writeAtomically(path.join(outDir, eco), files);
  log(`[${eco}] wrote ${Object.keys(files).join(', ')}`);
}

async function main(ids) {
  const { SOURCES } = await import('./sources/index.js');
  const wanted = ids.length ? ids : Object.keys(SOURCES);
  let failed = 0;
  for (const id of wanted) {
    const source = SOURCES[id];
    if (!source) {
      console.error(`Unknown ecosystem: ${id}`);
      failed++;
      continue;
    }
    try {
      await buildEcosystem(source, { rng: mulberry32(Date.now() >>> 0) });
    } catch (err) {
      failed++;
      console.error(`[${id}] FAILED: ${err.stack ?? err}`);
    }
  }
  process.exitCode = failed ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
