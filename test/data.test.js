import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadEcosystem, npmExists } from '../site/js/data.js';
import { createBloom, bloomAdd, bloomToBytes } from '../site/js/shared/bloom.js';

const model = { order: 1, minLen: 1, maxLen: 5, t: {} };
const reals = [{ name: 'ggplot2', description: 'Plots', url: 'https://cran.r-project.org/package=ggplot2' }];

function stubFetch(routes, calls = []) {
  return async (url, init) => {
    calls.push({ url, init });
    const make = routes[url];
    return make ? make() : new Response('', { status: 404 });
  };
}
const json = (x) => () => new Response(JSON.stringify(x));

test('names check normalizes before lookup', async () => {
  const fetchFn = stubFetch({
    'data/cran/model.json': json(model),
    'data/cran/reals.json': json(reals),
    'data/cran/names.json': json(['ggplot2']),
  });
  const src = await loadEcosystem('cran', { fetchFn });
  assert.equal(src.eco, 'cran');
  assert.equal(src.live, false);
  assert.deepEqual(src.reals, reals);
  assert.equal(await src.exists('GGPLOT2'), true);
  assert.equal(await src.exists('ggplot3'), false);
});

test('bloom check uses the shipped filter', async () => {
  const b = createBloom(10, 0.05);
  bloomAdd(b, 'requests');
  const bytes = bloomToBytes(b);
  const fetchFn = stubFetch({
    'data/pypi/model.json': json(model),
    'data/pypi/reals.json': json(reals),
    'data/pypi/bloom.bin': () => new Response(bytes),
  });
  const src = await loadEcosystem('pypi', { fetchFn });
  assert.equal(await src.exists('Requests'), true);
});

test('npm loads verified fakes and checks live', async () => {
  const fetchFn = stubFetch({
    'data/npm/model.json': json(model),
    'data/npm/reals.json': json(reals),
    'data/npm/fakes-verified.json': json(['zenkofy']),
    'https://registry.npmjs.org/left-pad': () => new Response(null, { status: 200 }),
  });
  const src = await loadEcosystem('npm', { fetchFn });
  assert.equal(src.live, true);
  assert.deepEqual(src.verifiedFakes, ['zenkofy']);
  assert.equal(await src.exists('left-pad'), true);
  assert.equal(await src.exists('nope-nope'), false);
});

test('npm check normalizes before lookup', async () => {
  const fetchFn = stubFetch({
    'data/npm/model.json': json(model),
    'data/npm/reals.json': json(reals),
    'data/npm/fakes-verified.json': json([]),
    'https://registry.npmjs.org/left-pad': () => new Response(null, { status: 200 }),
  });
  const src = await loadEcosystem('npm', { fetchFn });
  assert.equal(await src.exists('Left-Pad'), true);
});

test('a failed load throws a clear error', async () => {
  const fetchFn = stubFetch({ 'data/cran/model.json': json(model) });
  await assert.rejects(loadEcosystem('cran', { fetchFn }), /Failed to load cran\/reals.json: 404/);
});

test('npmExists sends HEAD and encodes scopes', async () => {
  const calls = [];
  const fetchFn = stubFetch({ 'https://registry.npmjs.org/@types%2fnode': () => new Response(null, { status: 200 }) }, calls);
  assert.equal(await npmExists('@types/node', fetchFn), true);
  assert.equal(calls[0].init.method, 'HEAD');
});

test('npmExists throws on server errors', async () => {
  const fetchFn = async () => new Response('', { status: 503 });
  await assert.rejects(npmExists('x', fetchFn), /503/);
});
