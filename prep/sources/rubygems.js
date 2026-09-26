import { getJson as realGetJson, getText as realGetText, sleep as realSleep } from '../http.js';

export function rubygemsSource({ getJson = realGetJson, getText = realGetText, sleep = realSleep, log = () => {} } = {}) {
  return {
    id: 'rubygems',
    order: 4,
    minCount: 2,
    async fetchPackages() {
      const text = await getText('https://rubygems.org/names');
      return text.split('\n').map((l) => l.trim()).filter((l) => l && l !== '---').map((name) => ({ name }));
    },
    async describe(pkgs) {
      const out = [];
      for (const { name } of pkgs) {
        try {
          const gem = await getJson(`https://rubygems.org/api/v1/gems/${encodeURIComponent(name)}.json`);
          out.push({ name, description: gem.info ?? '', url: gem.project_uri ?? `https://rubygems.org/gems/${name}` });
        } catch (err) {
          log(`[rubygems] skipping ${name}: ${err.message}`);
        }
        await sleep(150);
      }
      return out;
    },
  };
}
