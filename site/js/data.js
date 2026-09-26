// Loads one ecosystem's generated data and builds its existence check.

import { normalize } from './shared/normalize.js';
import { ECOSYSTEMS } from './shared/ecosystems.js';
import { bloomFromBytes, bloomHas } from './shared/bloom.js';

const defaultFetch = (...args) => fetch(...args);

export async function npmExists(name, fetchFn = defaultFetch, timeoutMs = 3000) {
  const url = `https://registry.npmjs.org/${name.replace('/', '%2f')}`;
  const res = await fetchFn(url, { method: 'HEAD', signal: AbortSignal.timeout(timeoutMs) });
  if (res.status === 404) return false;
  if (res.ok) return true;
  throw new Error(`npm registry returned ${res.status}`);
}

export async function loadEcosystem(eco, { base = 'data', fetchFn = defaultFetch } = {}) {
  async function get(file, as = 'json') {
    const res = await fetchFn(`${base}/${eco}/${file}`);
    if (!res.ok) throw new Error(`Failed to load ${eco}/${file}: ${res.status}`);
    return as === 'json' ? res.json() : new Uint8Array(await res.arrayBuffer());
  }

  const model = await get('model.json');
  const reals = await get('reals.json');
  const source = { eco, model, reals, live: false, verifiedFakes: [] };

  switch (ECOSYSTEMS[eco].check) {
    case 'names': {
      const names = new Set(await get('names.json'));
      source.exists = async (name) => names.has(normalize(eco, name));
      break;
    }
    case 'bloom': {
      const bloom = bloomFromBytes(await get('bloom.bin', 'bytes'));
      source.exists = async (name) => bloomHas(bloom, normalize(eco, name));
      break;
    }
    case 'live':
      source.live = true;
      source.verifiedFakes = await get('fakes-verified.json');
      source.exists = (name) => npmExists(normalize(eco, name), fetchFn);
      break;
    default:
      throw new Error(`No data for ecosystem: ${eco}`);
  }
  return source;
}
