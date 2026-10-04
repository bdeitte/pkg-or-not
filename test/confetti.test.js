import { test } from 'node:test';
import assert from 'node:assert/strict';
import { confettiFor, makePiece, DECAY } from '../site/js/confetti.js';

test('confettiFor gives no confetti for a low score', () => {
  for (const s of [0, 1, 2, 3]) assert.equal(confettiFor(s), null, `score ${s}`);
});

test('confettiFor grows with the score band', () => {
  const mid = confettiFor(5);
  const high = confettiFor(8);
  const perfect = confettiFor(10);
  assert.ok(mid.count > 0);
  assert.ok(high.count > mid.count);
  assert.ok(perfect.count > high.count);
});

test('confettiFor fires from the center below 10 and from both corners at 10', () => {
  assert.deepEqual(confettiFor(4).origins, ['center']);
  assert.deepEqual(confettiFor(9).origins, ['center']);
  assert.deepEqual(confettiFor(10).origins, ['left', 'right']);
});

test('confettiFor gives the same settings for every score in a band', () => {
  assert.deepEqual(confettiFor(4), confettiFor(6));
  assert.deepEqual(confettiFor(7), confettiFor(9));
});

// How far a piece travels before its launch speed dies out (a geometric series of the decay).
function travel(p) {
  return { dx: p.vx / (1 - DECAY), dy: p.vy / (1 - DECAY) };
}

function farthest(origin, w, h) {
  let left = Infinity, right = -Infinity, top = Infinity;
  for (let i = 0; i < 2000; i++) {
    const p = makePiece(origin, ['#000'], w, h);
    const { dx, dy } = travel(p);
    left = Math.min(left, p.x + dx);
    right = Math.max(right, p.x + dx);
    top = Math.min(top, p.y + dy);
  }
  return { left, right, top };
}

test('a center burst covers most of the width on a wide screen', () => {
  const w = 1600, h = 800;
  const { left, right, top } = farthest('center', w, h);
  assert.ok(left < w * 0.15, `left ${left}`);
  assert.ok(right > w * 0.85, `right ${right}`);
  assert.ok(top < 0, `top ${top}`);
});

test('a corner burst reaches across the screen', () => {
  const w = 1600, h = 800;
  assert.ok(farthest('left', w, h).right > w * 0.9);
  assert.ok(farthest('right', w, h).left < w * 0.1);
});

test('a center burst stays mostly on screen on a narrow phone', () => {
  const w = 375, h = 700;
  const { left, right, top } = farthest('center', w, h);
  assert.ok(left > -w * 0.3 && right < w * 1.3, `left ${left} right ${right}`);
  assert.ok(top < 0, `top ${top}`);
});
