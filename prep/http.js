// HTTP helpers for the prep script: user agent, retries with backoff.

const contact = process.env.PKG_OR_NOT_CONTACT;
export const USER_AGENT = `pkg-or-not-prep/0.1${contact ? ` (${contact})` : ''}`;

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchWithRetry(url, { retries = 5, baseDelayMs = 1000, fetchFn = fetch, init = {} } = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has('User-Agent')) {
    headers.set('User-Agent', USER_AGENT);
  }

  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetchFn(url, { ...init, headers });
    } catch (err) {
      if (attempt >= retries) throw err;
      await sleep(baseDelayMs * 2 ** attempt);
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= retries) throw new Error(`${url} -> HTTP ${res.status}`);
      await sleep(baseDelayMs * 2 ** attempt);
      continue;
    }
    return res;
  }
}

export async function getJson(url, opts) {
  const res = await fetchWithRetry(url, opts);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

export async function getText(url, opts) {
  const res = await fetchWithRetry(url, opts);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}
