// Keeps generated fakes from being offensive. Words in ANYWHERE are rejected as
// substrings; words in SEGMENT only when they are a whole part of the name, so
// names like "scraper" and "cockpit" are still allowed.

const ANYWHERE = ['fuck', 'shit', 'cunt', 'nigg', 'fagg', 'whore', 'slut', 'porn', 'pussy', 'bitch', 'retard'];
const SEGMENT = new Set(['rape', 'cock', 'dick', 'spic', 'kike', 'anal', 'sex', 'nazi', 'tits', 'fag']);

export function isBlocked(name) {
  const lower = name.toLowerCase();
  if (ANYWHERE.some((w) => lower.includes(w))) return true;
  return lower.split(/[^a-z0-9]+/).some((part) => SEGMENT.has(part));
}
