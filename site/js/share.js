// Packs finished-game results into a URL-safe token and back, for shareable result links.
// The token is deflated, XORed with a fixed key and base64url encoded. That keeps it short
// and hides the answers from a casual look, but it is obfuscation, not security.

import { ECOSYSTEMS, ECOSYSTEM_IDS } from './shared/ecosystems.js';
import { ROUNDS, score } from './game.js';
import { sayingAt } from './sayings.js';

const VERSION = 1;
const KEY = new TextEncoder().encode('package-or-not?');
const CHOICES = [...ECOSYSTEM_IDS, 'mixed'];
const GUESSES = ['real', 'fake'];
// Tokens come from untrusted links. Real ones are well under 1 KB, so these limits leave
// plenty of room while stopping huge links and small tokens that inflate enormously.
const MAX_TOKEN_LENGTH = 4096;
const MAX_JSON_BYTES = 32 * 1024;

// Runs bytes through a transform stream, giving up once the output passes maxBytes.
async function pipe(bytes, stream, maxBytes = Infinity) {
  const reader = new Blob([bytes]).stream().pipeThrough(stream).getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error('Payload too large');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

function xor(bytes) {
  return bytes.map((b, i) => b ^ KEY[i % KEY.length]);
}

function toBase64Url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function packPayload(payload) {
  const json = new TextEncoder().encode(JSON.stringify(payload));
  return toBase64Url(xor(await pipe(json, new CompressionStream('deflate-raw'))));
}

async function unpackPayload(token) {
  const bytes = await pipe(xor(fromBase64Url(token)), new DecompressionStream('deflate-raw'), MAX_JSON_BYTES);
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

export function encodeResults({ choice, sayingIndex, rounds }) {
  return packPayload({
    v: VERSION,
    c: choice,
    s: sayingIndex,
    r: rounds.map((r) => [r.eco, r.name, r.isFake ? 1 : 0, r.guess, r.url || '']),
  });
}

function toRound(entry, choice) {
  if (!Array.isArray(entry) || entry.length !== 5) return null;
  const [eco, name, fake, guess, url] = entry;
  if (!ECOSYSTEM_IDS.includes(eco) || (choice !== 'mixed' && eco !== choice)) return null;
  if (typeof name !== 'string' || !name || name.length > 300) return null;
  if (fake !== 0 && fake !== 1) return null;
  if (!GUESSES.includes(guess)) return null;
  // Links must point at the round's own registry, so a crafted token can't add other sites.
  if (typeof url !== 'string' || (url && (fake || !url.startsWith(ECOSYSTEMS[eco].urlPrefix)))) return null;
  return { eco, name, isFake: fake === 1, guess, url: url || undefined };
}

// Returns { choice, sayingIndex, rounds } or null if the token is missing, damaged or invalid.
export async function decodeResults(token) {
  if (typeof token !== 'string' || token.length > MAX_TOKEN_LENGTH || !/^[A-Za-z0-9_-]+$/.test(token)) return null;
  let p;
  try {
    p = await unpackPayload(token);
  } catch {
    return null;
  }
  if (!p || p.v !== VERSION || !CHOICES.includes(p.c)) return null;
  if (!Array.isArray(p.r) || p.r.length !== ROUNDS) return null;
  const rounds = p.r.map((entry) => toRound(entry, p.c));
  if (rounds.includes(null)) return null;
  if (sayingAt(p.c, score(rounds), p.s) === null) return null;
  return { choice: p.c, sayingIndex: p.s, rounds };
}
