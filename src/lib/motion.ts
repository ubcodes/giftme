// Small, deterministic motion helpers: every value is a pure function of time in seconds.

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))

/** 0..1 progress of t through [a, b]. */
export const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a))

/** Closed-form damped spring from 0 to 1. Lower damping gives a small overshoot. */
export function spring(t: number, k = 170, d = 26) {
  if (t <= 0) return 0
  const w0 = Math.sqrt(k)
  const z = d / (2 * w0)
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z)
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t))
  }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t)
}

export const easeInOut = (x: number) => {
  x = clamp(x)
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}
