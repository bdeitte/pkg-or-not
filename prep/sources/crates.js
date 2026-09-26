import { getJson as realGetJson, sleep as realSleep } from '../http.js';

const API = 'https://crates.io/api/v1/crates';

export function cratesSource({ getJson = realGetJson, sleep = realSleep, log = () => {} } = {}) {
  return {
    id: 'crates',
    async fetchPackages() {
      const out = [];
      let next = '?per_page=100&sort=alpha';
      for (let page = 1; next; page++) {
        const data = await getJson(`${API}${next}`);
        for (const c of data.crates) out.push({ name: c.name, description: c.description ?? '', url: `https://crates.io/crates/${c.name}` });
        if (page % 100 === 0) log(`[crates] page ${page}, ${out.length} crates`);
        next = data.meta.next_page;
        if (next) await sleep(1000);
      }
      return out;
    },
    describe: async (pkgs) => pkgs,
  };
}
