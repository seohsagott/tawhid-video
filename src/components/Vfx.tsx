/**
 * Visual effects — ported from tawhid-kit/render3.py.
 * v2 §6: gold sparkle on light sources and on the verse highlight, light dust
 * when books drop, a warm pulsing glow behind light sources, and a highlighter
 * stroke under key terms.
 */
import React from "react";
import { Img, staticFile } from "remotion";
import { eo } from "../engine/ease";

/* --------------------------------------------------------------- particles */

export type Part = {
  kind: "star" | "dust";
  t: number;
  /** star: absolute centre. dust: absolute centre too. */
  cx?: number;
  cy?: number;
  /** card sparkles carry fractions of the padded sprite instead. */
  fx?: number;
  fy?: number;
  ang: number;
  dist: number;
  sprite: string;
  sc: number;
};

const PART_SIZE: Record<string, number> = {
  star_01: 56,
  star_02: 56,
  star_04: 56,
  star_06: 56,
  star_07: 56,
  spark_01: 44,
  smoke_01: 240,
  smoke_03: 240,
  smoke_05: 240,
  smoke_07: 240,
};

/** render3.draw_fx_front */
export const Particles: React.FC<{ parts: Part[]; t: number; origin?: { x: number; y: number; w: number; h: number } }> = ({
  parts,
  t,
  origin,
}) => (
  <>
    {parts.map((p, i) => {
      const dt = t - p.t;
      const size = PART_SIZE[p.sprite] ?? 56;
      const src = staticFile(`particles/baked/${p.sprite}.png`);

      // Card sparkles were stored as fractions of the padded sprite.
      const cx = p.cx ?? (origin ? origin.x + origin.w * (p.fx ?? 0.5) : 0);
      const cy = p.cy ?? (origin ? origin.y + origin.h * (p.fy ?? 0.62) : 0);

      if (p.kind === "star") {
        if (dt < 0 || dt >= 0.9) return null;
        const q = dt / 0.9;
        const d = p.dist * eo(q);
        const x = cx + Math.cos(p.ang) * d;
        const y = cy + Math.sin(p.ang) * d - 20 * q;
        return (
          <Img
            key={i}
            src={src}
            alt=""
            style={{
              position: "absolute",
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              opacity: (1 - q) ** 1.3 * p.sc,
            }}
          />
        );
      }

      if (dt < 0 || dt >= 0.8) return null;
      const q = dt / 0.8;
      const s = 0.6 + 0.9 * eo(q);
      const iw = Math.max(2, Math.trunc(size * s));
      const ih = Math.max(2, Math.trunc(size * s * 0.6));
      return (
        <Img
          key={i}
          src={src}
          alt=""
          style={{
            position: "absolute",
            left: cx + p.ang * p.dist * eo(q) - iw / 2,
            top: cy - ih / 2,
            width: iw,
            height: ih,
            opacity: (1 - q) * 0.9,
          }}
        />
      );
    })}
  </>
);

/* -------------------------------------------------------------------- glow */

/**
 * render3.radial(sz, (245,208,120), 150):  a = clip(1-r,0,1)**2.2 * 150
 * Sampled into SVG gradient stops so the falloff exponent is preserved.
 */
const GLOW_STOPS = Array.from({ length: 17 }, (_, i) => {
  const r = i / 16;
  return { r, o: (Math.max(0, 1 - r) ** 2.2 * 150) / 255 };
});

export const Glow: React.FC<{ size: number; cx: number; cy: number; opacity: number; id: string }> = ({
  size,
  cx,
  cy,
  opacity,
  id,
}) => (
  <svg
    width={size}
    height={size}
    style={{ position: "absolute", left: cx - size / 2, top: cy - size / 2, opacity }}
  >
    <defs>
      <radialGradient id={`glow-${id}`} cx="50%" cy="50%" r="50%">
        {GLOW_STOPS.map((s, i) => (
          <stop key={i} offset={`${s.r * 100}%`} stopColor="rgb(245,208,120)" stopOpacity={s.o} />
        ))}
      </radialGradient>
    </defs>
    <rect width={size} height={size} fill={`url(#glow-${id})`} />
  </svg>
);

/** render3.draw_fx_back glow term — fades in over 0.8s after +0.2s, then pulses on a 2.6s cycle. */
export const glowOpacity = (t: number, elT: number): number => {
  if (t < elT + 0.2) return 0;
  const pulse = 0.75 + 0.25 * Math.sin((2 * Math.PI * (t % 2.6)) / 2.6);
  return eo((t - elT - 0.2) / 0.8) * pulse;
};

/* ---------------------------------------------------------- marker stroke */

/**
 * render3.marker(w, h): a band from 0.18h to 0.92h with a per-column +/-2px
 * wobble, alpha 150 across the middle and 90 in the outer 6px.
 *
 * NOTE (documented deviation): the Python wobble comes from
 * `random.Random(w*31+h).uniform(-2,2)` per pixel column. Reproducing CPython's
 * Mersenne Twister in the browser buys nothing visible, so the same +/-2px
 * wobble is generated here from a deterministic integer hash and sampled every
 * 2px. Band geometry, alphas and the 0.35s left-to-right wipe are unchanged.
 */
const hashNoise = (seed: number, i: number): number => {
  let h = (seed * 374761393 + i * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 4001) / 1000 - 2; // -2 .. +2
};

export const MarkerStroke: React.FC<{ w: number; h: number; reveal: number }> = ({ w, h, reveal }) => {
  const seed = w * 31 + h;
  const step = 2;
  const n = Math.max(2, Math.ceil(w / step));
  const top: number[] = [];
  const bot: number[] = [];
  for (let i = 0; i <= n; i++) {
    const x = Math.min(i * step, w);
    top.push(Math.trunc(h * 0.18 + hashNoise(seed, x)));
    bot.push(Math.trunc(h * 0.92 + hashNoise(seed + 977, x)));
  }
  const pts = (arr: number[], rev: boolean) => {
    const idx = rev ? [...arr.keys()].reverse() : [...arr.keys()];
    return idx.map((i) => `${Math.min(i * step, w)},${arr[i]}`).join(" ");
  };
  const d = `M ${pts(top, false)} L ${pts(bot, true)} Z`;

  const uid = `mk${w}x${h}`;
  return (
    <div style={{ width: reveal, height: h, overflow: "hidden" }}>
      <svg width={w} height={h} style={{ display: "block" }}>
        <defs>
          {/* Python: alpha is 150 for 6 < x < w-6 and 90 otherwise - not additive */}
          <clipPath id={`${uid}-mid`}>
            <rect x={7} y={0} width={Math.max(0, w - 14)} height={h} />
          </clipPath>
          <clipPath id={`${uid}-end`}>
            <rect x={0} y={0} width={7} height={h} />
            <rect x={w - 7} y={0} width={7} height={h} />
          </clipPath>
        </defs>
        <path d={d} fill="rgb(240,212,140)" fillOpacity={150 / 255} clipPath={`url(#${uid}-mid)`} />
        <path d={d} fill="rgb(240,212,140)" fillOpacity={90 / 255} clipPath={`url(#${uid}-end)`} />
      </svg>
    </div>
  );
};
