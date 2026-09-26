import { getJson as realGetJson, sleep as realSleep } from '../http.js';
import { fetchP3mPackages } from './p3m.js';

export function pypiSource({ getJson = realGetJson, sleep = realSleep, log } = {}) {
  return {
    id: 'pypi',
    fetchPackages: () => fetchP3mPackages('pypi', {
      getJson, sleep, log,
      toPackage: (r) => ({ name: r.name, description: r.info?.summary ?? '', url: `https://p3m.dev/client/#/repos/pypi/packages/${encodeURIComponent(r.name)}/overview` }),
    }),
    describe: async (pkgs) => pkgs,
  };
}
