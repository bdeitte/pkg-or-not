// Samples a name from a character-level Markov model built by prep/markov.js.

export const START = '\u0002';
export const END = '\u0003';

export function sampleName(model, rng, maxChars = 64) {
  let ctx = START.repeat(model.order);
  let out = '';
  while (out.length <= maxChars) {
    const entry = model.t[ctx];
    if (!entry) return null;
    const [chars, weights] = entry;
    let total = 0;
    for (const w of weights) total += w;
    let r = rng() * total;
    let i = 0;
    while (i < weights.length - 1 && r >= weights[i]) {
      r -= weights[i];
      i++;
    }
    const ch = chars[i];
    if (ch === END) return out;
    out += ch;
    ctx = (ctx + ch).slice(-model.order);
  }
  return null;
}
