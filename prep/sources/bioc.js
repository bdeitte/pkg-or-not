import { getJson as realGetJson, sleep as realSleep } from '../http.js';
import { fetchP3mPackages } from './p3m.js';

export const BIOC_VERSION = process.env.BIOC_VERSION ?? '3.23';

export function biocSource({ getJson = realGetJson, sleep = realSleep, log } = {}) {
  return {
    id: 'bioc',
    fetchPackages: () => fetchP3mPackages('bioconductor', {
      getJson, sleep, log,
      extraQuery: `&bioc_version=${BIOC_VERSION}`,
      toPackage: (r) => ({ name: r.name, description: r.title ?? '', url: `https://p3m.dev/client/#/repos/bioconductor/packages/${encodeURIComponent(r.name)}/overview` }),
    }),
    describe: async (pkgs) => pkgs,
  };
}
