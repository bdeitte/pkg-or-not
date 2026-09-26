// Prints 15 generated fakes and 15 real names from built data, to judge fake quality.
// Usage: node prep/preview.js <eco>

import { readFile } from 'node:fs/promises';
import { loadEcosystem } from '../site/js/data.js';
import { generateFake } from '../site/js/generator.js';
import { mulberry32, sample } from '../site/js/shared/rng.js';

const eco = process.argv[2];
const dataDir = new URL('../site/data/', import.meta.url);

async function fetchFn(url, init) {
  if (url.startsWith('http')) return fetch(url, init);
  try {
    return new Response(await readFile(new URL(url, dataDir)));
  } catch {
    return new Response('', { status: 404 });
  }
}

const source = await loadEcosystem(eco, { base: '.', fetchFn });
const rng = mulberry32(Date.now() >>> 0);
const avoid = new Set();
const fakes = [];
for (let i = 0; i < 15; i++) {
  const name = await generateFake(source, rng, { avoid });
  if (name) {
    avoid.add(name);
    fakes.push(name);
  }
}
console.log(`FAKE (${fakes.length}):\n  ${fakes.join('\n  ')}`);
console.log(`REAL:\n  ${sample(rng, source.reals, 15).map((r) => r.name).join('\n  ')}`);
