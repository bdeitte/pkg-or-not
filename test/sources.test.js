import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fetchP3mPackages, P3M_API } from '../prep/sources/p3m.js';
import { cranSource } from '../prep/sources/cran.js';
import { biocSource, BIOC_VERSION } from '../prep/sources/bioc.js';
import { pypiSource } from '../prep/sources/pypi.js';
import { openvsxSource } from '../prep/sources/openvsx.js';

const noSleep = async () => {};

function pagedJson(pages) {
  const urls = [];
  const getJson = async (url) => {
    urls.push(url);
    const page = Number(new URL(url).searchParams.get('_page'));
    return pages[page - 1] ?? [];
  };
  return { getJson, urls };
}

test('fetchP3mPackages pages until a short page', async () => {
  const { getJson, urls } = pagedJson([[{ name: 'a' }, { name: 'b' }], [{ name: 'c' }]]);
  const pkgs = await fetchP3mPackages('cran', { getJson, sleep: noSleep, pageSize: 2, toPackage: (r) => ({ name: r.name }) });
  assert.deepEqual(pkgs.map((p) => p.name), ['a', 'b', 'c']);
  assert.equal(urls.length, 2);
  assert.equal(urls[0], `${P3M_API}/repos/cran/packages?_limit=2&_page=1`);
});

test('cran source maps title and CRAN url', async () => {
  const { getJson } = pagedJson([[{ name: 'ggplot2', title: 'Create Elegant Plots' }]]);
  const pkgs = await cranSource({ getJson, sleep: noSleep }).fetchPackages();
  assert.deepEqual(pkgs, [{ name: 'ggplot2', description: 'Create Elegant Plots', url: 'https://p3m.dev/client/#/repos/cran/packages/ggplot2/overview' }]);
});

test('bioc source sends bioc_version and maps the Bioconductor url', async () => {
  const { getJson, urls } = pagedJson([[{ name: 'DESeq2', title: 'Differential expression' }]]);
  const pkgs = await biocSource({ getJson, sleep: noSleep }).fetchPackages();
  assert.ok(urls[0].includes(`bioc_version=${BIOC_VERSION}`));
  assert.equal(pkgs[0].url, 'https://p3m.dev/client/#/repos/bioconductor/packages/DESeq2/overview');
});

test('pypi source uses info.summary and tolerates missing info', async () => {
  const { getJson } = pagedJson([[{ name: 'requests', info: { summary: 'HTTP for Humans' } }, { name: 'x', info: null }]]);
  const pkgs = await pypiSource({ getJson, sleep: noSleep }).fetchPackages();
  assert.deepEqual(pkgs[0], { name: 'requests', description: 'HTTP for Humans', url: 'https://p3m.dev/client/#/repos/pypi/packages/requests/overview' });
  assert.equal(pkgs[1].description, '');
});

test('openvsx source uses display names and links to the namespace.name page', async () => {
  const { getJson, urls } = pagedJson([[
    { namespace: 'redhat', name: 'vscode-yaml', display_name: 'YAML', description: 'YAML Language Support' },
    { namespace: 'acme', name: 'tool', display_name: null, description: null },
  ]]);
  const pkgs = await openvsxSource({ getJson, sleep: noSleep }).fetchPackages();
  assert.ok(urls[0].startsWith(`${P3M_API}/repos/openvsx/packages?`));
  assert.deepEqual(pkgs, [
    { name: 'YAML', description: 'YAML Language Support', url: 'https://p3m.dev/client/#/repos/openvsx/packages/redhat.vscode-yaml/overview' },
    { name: 'tool', description: '', url: 'https://p3m.dev/client/#/repos/openvsx/packages/acme.tool/overview' },
  ]);
});

test('p3m sources describe by returning packages unchanged', async () => {
  const pkgs = [{ name: 'a', description: 'b', url: 'c' }];
  assert.deepEqual(await cranSource().describe(pkgs), pkgs);
});

import { cratesSource } from '../prep/sources/crates.js';
import { rubygemsSource } from '../prep/sources/rubygems.js';
import { npmSource } from '../prep/sources/npm.js';
import { SOURCES } from '../prep/sources/index.js';
import { ECOSYSTEM_IDS } from '../site/js/shared/ecosystems.js';

test('crates source follows next_page', async () => {
  const urls = [];
  const pages = {
    'https://crates.io/api/v1/crates?per_page=100&sort=alpha': { crates: [{ name: 'serde', description: 'Serialization' }], meta: { next_page: '?seek=abc' } },
    'https://crates.io/api/v1/crates?seek=abc': { crates: [{ name: 'syn', description: null }], meta: { next_page: null } },
  };
  const getJson = async (url) => { urls.push(url); return pages[url]; };
  const pkgs = await cratesSource({ getJson, sleep: noSleep }).fetchPackages();
  assert.deepEqual(pkgs, [
    { name: 'serde', description: 'Serialization', url: 'https://crates.io/crates/serde' },
    { name: 'syn', description: '', url: 'https://crates.io/crates/syn' },
  ]);
  assert.equal(urls.length, 2);
});

test('rubygems source parses names and skips failed lookups', async () => {
  const getText = async () => '---\nrails\n\nrack\n';
  const getJson = async (url) => {
    if (url.includes('/rack.json')) throw new Error('404');
    return { name: 'rails', info: 'Full-stack web framework', project_uri: 'https://rubygems.org/gems/rails' };
  };
  const src = rubygemsSource({ getJson, getText, sleep: noSleep });
  const pkgs = await src.fetchPackages();
  assert.deepEqual(pkgs.map((p) => p.name), ['rails', 'rack']);
  const reals = await src.describe(pkgs);
  assert.deepEqual(reals, [{ name: 'rails', description: 'Full-stack web framework', url: 'https://rubygems.org/gems/rails' }]);
});

test('npm source reads names from the extracted list', async () => {
  const src = npmSource({
    getJson: async () => ({ dist: { tarball: 'https://t/names.tgz' } }),
    sleep: noSleep,
    download: async (url, file) => { assert.equal(url, 'https://t/names.tgz'); },
    extractNames: async () => ['left-pad', '@types/node'],
  });
  assert.deepEqual(await src.fetchPackages(), [{ name: 'left-pad' }, { name: '@types/node' }]);
});

test('npm source describes via /latest and encodes scopes', async () => {
  const urls = [];
  const getJson = async (url) => {
    urls.push(url);
    if (url.includes('gone')) throw new Error('404');
    return { description: 'Types for Node' };
  };
  const reals = await npmSource({ getJson, sleep: noSleep }).describe([{ name: '@types/node' }, { name: 'gone' }]);
  assert.equal(urls[0], 'https://registry.npmjs.org/@types%2fnode/latest');
  assert.deepEqual(reals, [{ name: '@types/node', description: 'Types for Node', url: 'https://www.npmjs.com/package/@types/node' }]);
});

test('npm source cleans up temp directory after reading names', async () => {
  let tgzPath = null;
  const src = npmSource({
    getJson: async () => ({ dist: { tarball: 'https://t/names.tgz' } }),
    sleep: noSleep,
    download: async (url, file) => { tgzPath = file; },
    extractNames: async () => ['test-pkg'],
  });
  await src.fetchPackages();
  assert.ok(tgzPath !== null);
  assert.equal(existsSync(path.dirname(tgzPath)), false);
});

test('SOURCES covers every ecosystem with matching ids', () => {
  assert.deepEqual(Object.keys(SOURCES).sort(), [...ECOSYSTEM_IDS].sort());
  for (const [id, src] of Object.entries(SOURCES)) assert.equal(src.id, id);
  assert.equal(typeof SOURCES.npm.liveExists, 'function');
});
