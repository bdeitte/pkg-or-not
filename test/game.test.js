import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../site/js/shared/rng.js';
import { ROUNDS, planFakes, createSourcePicker, buildRounds, isCorrect, score, bandFor } from '../site/js/game.js';

const reals = Array.from({ length: 20 }, (_, i) => ({ name: `real${i}`, description: `Real ${i}`, url: `https://x/${i}` }));
const source = { eco: 'cran', reals };

test('planFakes has 10 rounds with 3 to 7 fakes', () => {
  for (let seed = 0; seed < 200; seed++) {
    const plan = planFakes(mulberry32(seed));
    assert.equal(plan.length, ROUNDS);
    const fakes = plan.filter(Boolean).length;
    assert.ok(fakes >= 3 && fakes <= 7, `seed ${seed}: ${fakes}`);
  }
});

test('buildRounds follows the plan and never repeats a name', async () => {
  let n = 0;
  const makeFake = async () => `fake${n++}`;
  const plan = [true, false, true, false, false, true, false, false, true, false];
  const rounds = await buildRounds({ plan, nextSource: async () => source, rng: mulberry32(1), makeFake });
  assert.equal(rounds.length, 10);
  rounds.forEach((r, i) => assert.equal(r.isFake, plan[i]));
  assert.equal(new Set(rounds.map((r) => r.name)).size, 10);
  for (const r of rounds) {
    assert.equal(r.guess, null);
    assert.equal(r.eco, 'cran');
    if (!r.isFake) assert.ok(r.description && r.url);
  }
});

test('buildRounds passes used names to makeFake as avoid', async () => {
  const seen = [];
  const makeFake = async (src, rng, { avoid }) => { seen.push(avoid.size); return `fake${avoid.size}`; };
  await buildRounds({ plan: [false, true, true], nextSource: async () => source, rng: mulberry32(2), makeFake });
  assert.deepEqual(seen, [1, 2]);
});

test('buildRounds uses a real name when no fake can be made', async () => {
  const rounds = await buildRounds({ plan: [true, true, true], nextSource: async () => source, rng: mulberry32(3), makeFake: async () => null });
  assert.ok(rounds.every((r) => !r.isFake));
});

test('createSourcePicker loads each ecosystem once', async () => {
  const loads = [];
  const next = createSourcePicker(['cran', 'pypi'], async (eco) => { loads.push(eco); return { eco }; }, mulberry32(4));
  for (let i = 0; i < 20; i++) await next();
  assert.deepEqual([...loads].sort(), ['cran', 'pypi']);
});

test('createSourcePicker drops ecosystems that fail to load', async () => {
  const next = createSourcePicker(['cran', 'pypi'], async (eco) => { if (eco === 'pypi') throw new Error('boom'); return { eco }; }, mulberry32(5));
  for (let i = 0; i < 20; i++) assert.equal((await next()).eco, 'cran');
});

test('createSourcePicker throws when every ecosystem fails', async () => {
  const next = createSourcePicker(['cran'], async () => { throw new Error('boom'); }, mulberry32(6));
  await assert.rejects(next(), /boom/);
});

test('isCorrect and score', () => {
  const rounds = [
    { isFake: true, guess: 'fake' },
    { isFake: false, guess: 'real' },
    { isFake: true, guess: 'real' },
    { isFake: false, guess: null },
  ];
  assert.deepEqual(rounds.map(isCorrect), [true, true, false, false]);
  assert.equal(score(rounds), 2);
});

test('bandFor boundaries', () => {
  assert.deepEqual([0, 3, 4, 6, 7, 9, 10].map(bandFor), ['low', 'low', 'mid', 'mid', 'high', 'high', 'perfect']);
});
