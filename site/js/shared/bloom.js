// Bloom filter shared by the prep script (build) and the browser (lookup).
// Byte layout: uint32 LE m (bits), uint32 LE k (hashes), then the bit array.

const encoder = new TextEncoder();

function fnv1a(bytes, seed) {
  let h = (0x811c9dc5 ^ seed) >>> 0;
  for (const b of bytes) {
    h ^= b;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

function fmix(h) {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

function positions(bloom, key) {
  const bytes = encoder.encode(key);
  const h1 = fmix(fnv1a(bytes, 0));
  const h2 = fmix(fnv1a(bytes, 0x5bd1e995)) | 1;
  const out = new Array(bloom.k);
  for (let i = 0; i < bloom.k; i++) out[i] = ((h1 + Math.imul(i, h2)) >>> 0) % bloom.m;
  return out;
}

export function createBloom(n, fpRate) {
  const m = Math.max(8, Math.ceil(-(Math.max(n, 1) * Math.log(fpRate)) / (Math.LN2 * Math.LN2)));
  const k = Math.max(1, Math.round((m / Math.max(n, 1)) * Math.LN2));
  return { m, k, bits: new Uint8Array(Math.ceil(m / 8)) };
}

export function bloomAdd(bloom, key) {
  for (const p of positions(bloom, key)) bloom.bits[p >>> 3] |= 1 << (p & 7);
}

export function bloomHas(bloom, key) {
  for (const p of positions(bloom, key)) {
    if ((bloom.bits[p >>> 3] & (1 << (p & 7))) === 0) return false;
  }
  return true;
}

export function bloomToBytes(bloom) {
  const out = new Uint8Array(8 + bloom.bits.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, bloom.m, true);
  view.setUint32(4, bloom.k, true);
  out.set(bloom.bits, 8);
  return out;
}

export function bloomFromBytes(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const m = view.getUint32(0, true);
  const k = view.getUint32(4, true);
  if (u8.byteLength < 8 + Math.ceil(m / 8)) throw new Error('Bloom filter data is truncated');
  return { m, k, bits: u8.subarray(8) };
}
