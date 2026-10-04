import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ECOSYSTEMS, ECOSYSTEM_IDS } from '../site/js/shared/ecosystems.js';

test('has the seven ecosystems in picker order', () => {
  assert.deepEqual(ECOSYSTEM_IDS, ['cran', 'bioc', 'pypi', 'openvsx', 'npm', 'crates', 'rubygems']);
});

test('every ecosystem has a label, check kind and teaser', () => {
  for (const id of ECOSYSTEM_IDS) {
    const e = ECOSYSTEMS[id];
    assert.ok(e.label && e.teaser, id);
    assert.ok(['names', 'bloom', 'live'].includes(e.check), id);
  }
});

test('check kinds match the spec', () => {
  const checks = Object.fromEntries(ECOSYSTEM_IDS.map((id) => [id, ECOSYSTEMS[id].check]));
  assert.deepEqual(checks, {
    cran: 'names', bioc: 'names', pypi: 'bloom', openvsx: 'bloom', npm: 'live',
    crates: 'bloom', rubygems: 'bloom',
  });
});

test('mixed exists with no check kind', () => {
  assert.equal(ECOSYSTEMS.mixed.check, null);
  assert.ok(ECOSYSTEMS.mixed.label && ECOSYSTEMS.mixed.teaser);
});

test('linkLabel names the site each ecosystem links to', () => {
  const linkLabels = Object.fromEntries(ECOSYSTEM_IDS.map((id) => [id, ECOSYSTEMS[id].linkLabel]));
  assert.deepEqual(linkLabels, {
    cran: 'p3m.dev', bioc: 'p3m.dev', pypi: 'p3m.dev', openvsx: 'p3m.dev', npm: 'npm',
    crates: 'crates.io', rubygems: 'RubyGems',
  });
  assert.equal(ECOSYSTEMS.mixed.linkLabel, null);
});

test('every committed real package url starts with its ecosystem urlPrefix', () => {
  for (const id of ECOSYSTEM_IDS) {
    const prefix = ECOSYSTEMS[id].urlPrefix;
    assert.ok(typeof prefix === 'string' && prefix.startsWith('https://'), id);
    const reals = JSON.parse(readFileSync(new URL(`../site/data/${id}/reals.json`, import.meta.url)));
    for (const r of reals) if (r.url) assert.ok(r.url.startsWith(prefix), `${id}: ${r.url}`);
  }
  assert.equal(ECOSYSTEMS.mixed.urlPrefix, null);
});

test('index.html has a picker card per ecosystem plus mixed, matching ecosystems.js', () => {
  const html = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
  const cardRe = /<button class="eco-card" data-eco="([^"]+)"><span class="eco-label">([^<]+) <kbd>(\d)<\/kbd><\/span><span class="eco-teaser">([^<]+)<\/span><\/button>/g;
  const cards = [...html.matchAll(cardRe)].map(([, id, label, key, teaser]) => ({ id, label, key, teaser }));
  const expected = [...ECOSYSTEM_IDS, 'mixed'].map((id, i) => ({
    id, label: ECOSYSTEMS[id].label, key: String(i + 1), teaser: ECOSYSTEMS[id].teaser,
  }));
  assert.deepEqual(cards, expected);
});
