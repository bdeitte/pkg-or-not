// Pages through a p3m.dev repository's package list.

export const P3M_API = 'https://p3m.dev/__api__';

export async function fetchP3mPackages(repo, { toPackage, getJson, sleep, extraQuery = '', pageSize = 1000, delayMs = 200, log = () => {} }) {
  const out = [];
  for (let page = 1; ; page++) {
    const rows = await getJson(`${P3M_API}/repos/${repo}/packages?_limit=${pageSize}&_page=${page}${extraQuery}`);
    for (const row of rows) out.push(toPackage(row));
    if (page % 50 === 0) log(`[${repo}] page ${page}, ${out.length} packages`);
    if (rows.length < pageSize) return out;
    await sleep(delayMs);
  }
}
