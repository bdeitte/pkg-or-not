// Game rules: which rounds are fake, building rounds, and scoring.

import { pick } from './shared/rng.js';
import { generateFake } from './generator.js';

export const ROUNDS = 10;

export function planFakes(rng, { count = ROUNDS, minFakes = 3, maxFakes = 7 } = {}) {
  for (;;) {
    const plan = Array.from({ length: count }, () => rng() < 0.5);
    const fakes = plan.filter(Boolean).length;
    if (fakes >= minFakes && fakes <= maxFakes) return plan;
  }
}

export function createSourcePicker(ecos, load, rng) {
  const remaining = [...ecos];
  const cache = new Map();
  let lastError = new Error('No ecosystems available');
  return async function nextSource() {
    while (remaining.length) {
      const eco = pick(rng, remaining);
      if (!cache.has(eco)) cache.set(eco, load(eco));
      try {
        return await cache.get(eco);
      } catch (err) {
        lastError = err;
        cache.delete(eco);
        remaining.splice(remaining.indexOf(eco), 1);
      }
    }
    throw lastError;
  };
}

function realRound(source, rng, used) {
  const r = pick(rng, source.reals.filter((x) => !used.has(x.name)));
  return { eco: source.eco, name: r.name, isFake: false, description: r.description, url: r.url };
}

export async function buildRounds({ plan, nextSource, rng, makeFake = generateFake }) {
  const used = new Set();
  const rounds = [];
  for (const wantFake of plan) {
    const source = await nextSource();
    let round = null;
    if (wantFake) {
      const name = await makeFake(source, rng, { avoid: used });
      if (name) round = { eco: source.eco, name, isFake: true };
    }
    round ??= realRound(source, rng, used);
    used.add(round.name);
    rounds.push({ ...round, guess: null });
  }
  return rounds;
}

export function isCorrect(round) {
  return round.guess !== null && (round.guess === 'fake') === round.isFake;
}

export function score(rounds) {
  return rounds.filter(isCorrect).length;
}

export function bandFor(s) {
  if (s >= 10) return 'perfect';
  if (s >= 7) return 'high';
  if (s >= 4) return 'mid';
  return 'low';
}
