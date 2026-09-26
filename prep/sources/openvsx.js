import { getJson as realGetJson, sleep as realSleep } from '../http.js';
import { fetchP3mPackages } from './p3m.js';

// Players guess display names; the extension id is only used for the link.
export function openvsxSource({ getJson = realGetJson, sleep = realSleep, log } = {}) {
  return {
    id: 'openvsx',
    fetchPackages: () => fetchP3mPackages('openvsx', {
      getJson, sleep, log,
      toPackage: (r) => ({
        name: r.display_name || r.name,
        description: r.description ?? '',
        url: `https://p3m.dev/client/#/repos/openvsx/packages/${encodeURIComponent(`${r.namespace}.${r.name}`)}/overview`,
      }),
    }),
    describe: async (pkgs) => pkgs,
  };
}
