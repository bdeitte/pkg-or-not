import { getJson as realGetJson, sleep as realSleep } from '../http.js';
import { fetchP3mPackages } from './p3m.js';

export function cranSource({ getJson = realGetJson, sleep = realSleep, log } = {}) {
  return {
    id: 'cran',
    fetchPackages: () => fetchP3mPackages('cran', {
      getJson, sleep, log,
      toPackage: (r) => ({ name: r.name, description: r.title ?? '', url: `https://p3m.dev/client/#/repos/cran/packages/${encodeURIComponent(r.name)}/overview` }),
    }),
    describe: async (pkgs) => pkgs,
  };
}
