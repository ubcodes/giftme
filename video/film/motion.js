// Motion primitives for films that are a pure function of time.
// Every export is deterministic: same t in, same value out. No timers, no state.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const mix = (a, b, t) => a + (b - a) * clamp(t);
/** 0..1 progress of t through [a, b] */
export const prog = (t, a, b) => clamp((t - a) / (b - a));

// Closed-form damped spring, 0 → 1. k = stiffness, d = damping.
// d close to 2*sqrt(k) is critical (no overshoot); a little under gives a tiny overshoot.
export function spring(t, k = 170, d = 26) {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(k), z = d / (2 * w0);
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}

// keys: [[time, value], ...] sorted by time. A value with many targets is the sum of one spring per change.
export function track(t, keys, k = 170, d = 26) {
  let v = keys[0][1];
  for (let i = 1; i < keys.length; i++) v += (keys[i][1] - keys[i - 1][1]) * spring(t - keys[i][0], k, d);
  return v;
}

// Tab indicator that stretches: the leading edge is stiffer than the trailing edge.
export function indicator(t, stops, width = 120) {
  const lead = track(t, stops, 320, 30);
  const trail = track(t, stops, 140, 22);
  return { left: Math.min(lead, trail), right: Math.max(lead, trail) + width };
}

// Text inside a morphing box: in after the morph starts, out before the next one.
export function swapAlpha(t, tIn, tOut) {
  return Math.min(clamp((t - tIn - 0.08) / 0.12), clamp((tOut - 0.1 - t) / 0.1));
}

// Classic eases for things that are not physical (wipes, camera dollies).
export const ease = {
  outCubic: (x) => 1 - Math.pow(1 - clamp(x), 3),
  inOutCubic: (x) => ((x = clamp(x)) < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outExpo: (x) => ((x = clamp(x)) === 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inOutExpo: (x) => {
    x = clamp(x);
    if (x === 0 || x === 1) return x;
    return x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2;
  },
  inQuad: (x) => clamp(x) ** 2,
};

// Seeded noise, never Math.random.
export function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Smooth 1D value noise in [-1, 1], deterministic for (x, seed). */
export function noise1(x, seed = 1) {
  const h = (i) => { const r = rng(seed * 7919 + i); return r() * 2 - 1; };
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u);
}

// Cursor along waypoints with eased travel; returns {x, y, press} where press is 0..1 during clicks.
// way: [{t, x, y, click?}] sorted by t.
export function cursorAt(t, way, travel = 0.45) {
  let x = way[0].x, y = way[0].y, press = 0;
  for (let i = 1; i < way.length; i++) {
    const p = ease.inOutCubic((t - (way[i].t - travel)) / travel);
    x += (way[i].x - way[i - 1].x) * p;
    y += (way[i].y - way[i - 1].y) * p;
  }
  for (const w of way) if (w.click) {
    const dt = t - w.t;
    if (dt > 0 && dt < 0.22) press = Math.sin((dt / 0.22) * Math.PI);
  }
  return { x, y, press };
}

// Seamless loop: pin the last frame to the first.
export const loopT = (t, dur) => ((t % dur) + dur) % dur;

// Canvas helpers -----------------------------------------------------------
export function rrect(g, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

/** Typewriter: how many characters of str are visible at t, starting at t0, cps chars/sec. */
export const typed = (str, t, t0, cps = 22) => str.slice(0, Math.max(0, Math.floor((t - t0) * cps)));

/** Load images up front; resolves to {name: HTMLImageElement}. Await before the first seek. */
export async function loadImages(map) {
  const out = {};
  await Promise.all(Object.entries(map).map(([k, src]) => new Promise((res, rej) => {
    const im = new Image(); im.onload = () => { out[k] = im; res(); }; im.onerror = rej; im.src = src;
  })));
  return out;
}
