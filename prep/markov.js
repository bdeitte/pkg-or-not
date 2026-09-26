// Trains a character-level Markov model on package names.

import { START, END } from '../site/js/shared/markov-sample.js';

export function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))];
}

export function train(names, { order = 3, minCount = 1 } = {}) {
  const counts = new Map();
  for (const name of names) {
    const padded = START.repeat(order) + name + END;
    for (let i = order; i < padded.length; i++) {
      const ctx = padded.slice(i - order, i);
      let next = counts.get(ctx);
      if (!next) counts.set(ctx, (next = new Map()));
      next.set(padded[i], (next.get(padded[i]) ?? 0) + 1);
    }
  }
  const t = {};
  for (const [ctx, next] of counts) {
    const kept = [...next].filter(([, c]) => c >= minCount);
    if (kept.length) t[ctx] = [kept.map(([ch]) => ch).join(''), kept.map(([, c]) => c)];
  }
  const lengths = names.map((n) => n.length).sort((a, b) => a - b);
  return { order, minLen: percentile(lengths, 0.1), maxLen: percentile(lengths, 0.9), t };
}
