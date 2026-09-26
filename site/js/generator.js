// Generates fake package names from a Markov model and rejects ones that exist.

import { sampleName } from './shared/markov-sample.js';
import { pick } from './shared/rng.js';
import { isBlocked } from './blocklist.js';

const R_NAME = /^[A-Za-z][A-Za-z0-9.]*[A-Za-z0-9]$/;

const VALID = {
  cran: R_NAME,
  bioc: R_NAME,
  pypi: /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/,
  openvsx: /^[A-Za-z0-9](?:[!-~]| (?! ))*[A-Za-z0-9]$/,
  npm: /^(?:@[a-z0-9~-][a-z0-9._~-]*\/)?[a-z0-9~-][a-z0-9._~-]*$/,
  crates: /^[A-Za-z][A-Za-z0-9_-]*$/,
  rubygems: /^[A-Za-z0-9][A-Za-z0-9._-]*$/,
};

export function isValidName(eco, name) {
  return VALID[eco].test(name);
}

export function isPlausible(eco, model, candidate) {
  if (candidate === null) return false;
  if (candidate.length < model.minLen || candidate.length > model.maxLen) return false;
  if (!isValidName(eco, candidate)) return false;
  return !isBlocked(candidate);
}

function fallback(source, rng, avoid) {
  const unused = (source.verifiedFakes ?? []).filter((n) => !avoid.has(n));
  return unused.length ? pick(rng, unused) : null;
}

export async function generateFake(source, rng, { maxTries = 50, maxLiveChecks = 10, avoid = new Set() } = {}) {
  const { eco, model } = source;
  let liveChecks = 0;
  for (let i = 0; i < maxTries; i++) {
    const name = sampleName(model, rng);
    if (!isPlausible(eco, model, name)) continue;
    if (avoid.has(name)) continue;
    if (source.live && name.startsWith('@')) {
      const unusedScoped = (source.verifiedFakes ?? []).filter((n) => n.startsWith('@') && !avoid.has(n));
      if (unusedScoped.length) return pick(rng, unusedScoped);
      continue;
    }
    if (!source.live) {
      if (!(await source.exists(name))) return name;
      continue;
    }
    if (liveChecks >= maxLiveChecks) break;
    liveChecks++;
    try {
      if (!(await source.exists(name))) return name;
    } catch {
      return fallback(source, rng, avoid);
    }
  }
  return source.live ? fallback(source, rng, avoid) : null;
}
