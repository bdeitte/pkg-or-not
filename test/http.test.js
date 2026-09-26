import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchWithRetry, getJson, USER_AGENT } from '../prep/http.js';

function sequence(...responses) {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({ url, init });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return next;
  };
  return { fetchFn, calls };
}

test('retries on 429 then succeeds', async () => {
  const { fetchFn, calls } = sequence(new Response('', { status: 429 }), new Response('ok'));
  const res = await fetchWithRetry('https://x', { fetchFn, baseDelayMs: 0 });
  assert.equal(await res.text(), 'ok');
  assert.equal(calls.length, 2);
});

test('retries on network errors', async () => {
  const { fetchFn, calls } = sequence(new Error('ECONNRESET'), new Response('ok'));
  await fetchWithRetry('https://x', { fetchFn, baseDelayMs: 0 });
  assert.equal(calls.length, 2);
});

test('gives up after the retry limit', async () => {
  const { fetchFn } = sequence(new Response('', { status: 500 }), new Response('', { status: 500 }));
  await assert.rejects(fetchWithRetry('https://x', { fetchFn, baseDelayMs: 0, retries: 1 }), /HTTP 500/);
});

test('sends the user agent', async () => {
  const { fetchFn, calls } = sequence(new Response('ok'));
  await fetchWithRetry('https://x', { fetchFn, baseDelayMs: 0 });
  assert.equal(calls[0].init.headers.get('User-Agent'), USER_AGENT);
});

test('preserves Headers instance with other headers', async () => {
  const { fetchFn, calls } = sequence(new Response('ok'));
  const headers = new Headers({ Accept: 'application/json' });
  await fetchWithRetry('https://x', { fetchFn, baseDelayMs: 0, init: { headers } });
  assert.equal(calls[0].init.headers.get('Accept'), 'application/json');
  assert.equal(calls[0].init.headers.get('User-Agent'), USER_AGENT);
});

test('preserves array form of headers', async () => {
  const { fetchFn, calls } = sequence(new Response('ok'));
  const headers = [['Accept', 'text/plain']];
  await fetchWithRetry('https://x', { fetchFn, baseDelayMs: 0, init: { headers } });
  assert.equal(calls[0].init.headers.get('Accept'), 'text/plain');
  assert.equal(calls[0].init.headers.get('User-Agent'), USER_AGENT);
});

test('preserves caller-provided User-Agent', async () => {
  const { fetchFn, calls } = sequence(new Response('ok'));
  const headers = { 'User-Agent': 'custom/1.0' };
  await fetchWithRetry('https://x', { fetchFn, baseDelayMs: 0, init: { headers } });
  assert.equal(calls[0].init.headers.get('User-Agent'), 'custom/1.0');
});

test('getJson throws on 404 without retrying', async () => {
  const { fetchFn, calls } = sequence(new Response('', { status: 404 }));
  await assert.rejects(getJson('https://x', { fetchFn, baseDelayMs: 0 }), /https:\/\/x -> HTTP 404/);
  assert.equal(calls.length, 1);
});
