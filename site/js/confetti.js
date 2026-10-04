// Confetti for the results screen, drawn on a temporary full-screen canvas.

import { bandFor } from './game.js';

const SETTINGS = {
  low: null,
  mid: { count: 70, origins: ['center'] },
  high: { count: 180, origins: ['center'] },
  perfect: { count: 320, origins: ['left', 'right'] },
};

// Burst settings for a score, or null for no confetti.
export function confettiFor(score) {
  return SETTINGS[bandFor(score)];
}

// The launch speed decays quickly, then each piece drifts down at its own steady fall speed.
// Speeds are in screen heights per frame, so the burst looks the same on any screen size.
export const DECAY = 0.92;
const FRAME_MS = 1000 / 60;

let current = null; // { canvas, frame, onResize }

export function stopConfetti() {
  if (!current) return;
  cancelAnimationFrame(current.frame);
  window.removeEventListener('resize', current.onResize);
  current.canvas.remove();
  current = null;
}

function palette() {
  const css = getComputedStyle(document.documentElement);
  const vars = ['--accent', '--real', '--fake'].map((v) => css.getPropertyValue(v).trim()).filter(Boolean);
  return [...vars, '#f5c400', '#e84393'];
}

// Angle (radians, 0 is straight up) and spread for each origin. Reach scales the sideways
// speed, which is in screen widths, so a burst fans out across wide and narrow screens alike.
const AIM = {
  center: { x: 0.5, angle: 0, spread: 0.9, reach: 0.5 },
  left: { x: 0, angle: 0.6, spread: 0.5, reach: 0.9 },
  right: { x: 1, angle: -0.6, spread: 0.5, reach: 0.9 },
};

export function makePiece(origin, colors, w, h) {
  const aim = AIM[origin];
  const angle = aim.angle + (Math.random() - 0.5) * 2 * aim.spread;
  const speed = 0.075 + Math.random() * 0.035;
  return {
    x: aim.x * w,
    y: h,
    vx: Math.sin(angle) * speed * w * aim.reach,
    vy: -Math.cos(angle) * speed * h,
    fall: h * (0.0025 + Math.random() * 0.0015),
    size: 6 + Math.random() * 6,
    round: Math.random() < 0.3,
    color: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.3,
    wobble: Math.random() * Math.PI * 2,
  };
}

export function launchConfetti(settings) {
  stopConfetti();
  if (!settings || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'confetti';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');

  let w = 0;
  let h = 0;
  let dpr = 1;
  const onResize = () => {
    dpr = window.devicePixelRatio || 1;
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  };
  onResize();
  window.addEventListener('resize', onResize);

  const colors = palette();
  const pieces = [];
  for (const origin of settings.origins) {
    for (let i = 0; i < settings.count / settings.origins.length; i++) pieces.push(makePiece(origin, colors, w, h));
  }

  let last = performance.now();
  const tick = (now) => {
    // The first frame time can be slightly before launch, so keep dt from going negative.
    const dt = Math.min(Math.max((now - last) / FRAME_MS, 0), 3);
    last = now;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = 0;
    for (const p of pieces) {
      p.vx *= DECAY ** dt;
      p.vy *= DECAY ** dt;
      p.wobble += 0.1 * dt;
      p.x += (p.vx + Math.sin(p.wobble) * 0.6) * dt;
      p.y += (p.vy + p.fall) * dt;
      p.rot += p.spin * dt;
      // Pieces start at the bottom edge, so only count one as gone once it is falling.
      if (p.y > h + p.size && p.vy + p.fall > 0) continue;
      alive++;
      // One transform per piece for position, rotation and pixel ratio is cheaper than save and restore.
      const cos = Math.cos(p.rot) * dpr;
      const sin = Math.sin(p.rot) * dpr;
      ctx.setTransform(cos, sin, -sin, cos, p.x * dpr, p.y * dpr);
      ctx.fillStyle = p.color;
      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Scaling the height by the wobble makes the strip look like it is flipping.
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, (p.size / 2) * Math.cos(p.wobble));
      }
    }
    if (alive === 0) stopConfetti();
    else current.frame = requestAnimationFrame(tick);
  };
  current = { canvas, frame: requestAnimationFrame(tick), onResize };
}
