/**
 * Easing ported verbatim from tawhid-kit/render2.py, plus the deterministic
 * per-element jitter that gives the hand-moved-paper feel (v2 §6).
 */

export const clamp = (v: number, a = 0, b = 1): number => Math.max(a, Math.min(b, v));

/** render2.py `eo` — ease-out cubic. */
export const eo = (p: number): number => {
  const q = clamp(p);
  return 1 - (1 - q) ** 3;
};

/** render2.py `back` — overshoot. */
export const back = (p: number, c = 1.5): number => {
  const q = clamp(p);
  return 1 + (c + 1) * (q - 1) ** 3 + c * (q - 1) ** 2;
};

/** render2.py `bounce` — squash then a single settle. */
export const bounce = (p: number): number => {
  const q = clamp(p);
  if (q < 0.6) return (q / 0.6) ** 2;
  const r = (q - 0.6) / 0.4;
  return 1 - 0.12 * Math.sin(Math.PI * r);
};

/**
 * render2.py `jit(e, n)` — integer-only, so this is bit-identical to Python.
 * `n` is the 12 fps frame index; the jitter re-rolls every 2 of those frames.
 */
export const jit = (id: number, n12: number): [number, number] => {
  const h = (id * 7919 + Math.floor(n12 / 2) * 104729) % 1000;
  return [((h % 7) - 3) * 0.5, ((Math.floor(h / 7) % 7) - 3) * 0.5];
};
