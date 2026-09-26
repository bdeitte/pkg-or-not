import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { getJson as realGetJson, fetchWithRetry, sleep as realSleep } from '../http.js';
import { npmExists } from '../../site/js/data.js';

const encode = (name) => name.replace('/', '%2f');

async function realDownload(url, file) {
  const res = await fetchWithRetry(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
}

async function realExtractNames(tgz) {
  const dir = path.dirname(tgz);
  await promisify(execFile)('tar', ['-xzf', tgz, '-C', dir, 'package/names.json']);
  return JSON.parse(await readFile(path.join(dir, 'package', 'names.json'), 'utf8'));
}

export function npmSource({ getJson = realGetJson, sleep = realSleep, log = () => {}, download = realDownload, extractNames = realExtractNames } = {}) {
  return {
    id: 'npm',
    async fetchPackages() {
      const meta = await getJson('https://registry.npmjs.org/all-the-package-names/latest');
      const dir = await mkdtemp(path.join(os.tmpdir(), 'npm-names-'));
      const tgz = path.join(dir, 'names.tgz');
      try {
        log(`[npm] downloading ${meta.dist.tarball}`);
        await download(meta.dist.tarball, tgz);
        const names = await extractNames(tgz);
        return names.map((name) => ({ name }));
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
    async describe(pkgs) {
      const out = [];
      for (const { name } of pkgs) {
        try {
          const latest = await getJson(`https://registry.npmjs.org/${encode(name)}/latest`);
          out.push({ name, description: latest.description ?? '', url: `https://www.npmjs.com/package/${name}` });
        } catch (err) {
          log(`[npm] skipping ${name}: ${err.message}`);
        }
        await sleep(100);
      }
      return out;
    },
    liveExists: (name) => npmExists(name, (url, init) => fetchWithRetry(url, { init }), 10000),
  };
}
