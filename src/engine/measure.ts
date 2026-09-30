/**
 * Text metrics — the port of engine.text_sprite / engine.ar_sprite geometry.
 *
 * engine.py draws character by character:
 *     cw(c) = font.getlength(c) + sp        sp = size * spacing
 *     ww(s) = sum(cw(c) for c in s)
 * CSS `letter-spacing: sp` adds sp after every character including the last, so
 * a run laid out with letter-spacing has exactly the same advance as ww(). The
 * text is emitted as SVG <text> whose `y` is the baseline, matching PIL's
 * anchor='ls' exactly. Kerning and ligatures are disabled so per-character
 * advances stay additive, as they are in PIL.
 */
import { F_AMIRI, F_MONT, isar, TXT_LH, TXT_SPACING, WEIGHT } from "./constants";

let ctx: CanvasRenderingContext2D | null = null;
const getCtx = (): CanvasRenderingContext2D => {
  if (!ctx) {
    const c = document.createElement("canvas");
    const got = c.getContext("2d");
    if (!got) throw new Error("no 2d context for text measurement");
    ctx = got;
    ctx.textBaseline = "alphabetic";
    // PIL sums per-glyph advances, so kerning must be off for the two to agree.
    (ctx as CanvasRenderingContext2D & { fontKerning: string }).fontKerning = "none";
  }
  return ctx;
};

const advCache = new Map<string, number>();

/**
 * Per-glyph advance, matching PIL font.getlength(c) exactly.
 *
 * PIL quantises every glyph advance to a whole pixel and sums them, so the
 * Python engine's widths are integers: at 40px SemiBold it measures
 * h=27 a=24 v=23 e=25, total 99. Chrome reports unhinted fractional advances
 * (99.669 for the same four glyphs), which drifts ~0.4% over a line and can
 * flip a word onto the next line. Rounding each advance reproduces PIL's
 * numbers, so wrapping, sprite widths and centring all agree with the v3
 * render. Kerning is disabled on the context so advances stay additive, which
 * is what PIL does.
 */
const advance = (ch: string, family: string, px: number, weight: number): number => {
  const key = `${family}|${px}|${weight}|${ch}`;
  const hit = advCache.get(key);
  if (hit !== undefined) return hit;
  const c = getCtx();
  c.font = `${weight} ${px}px "${family}"`;
  const w = Math.round(c.measureText(ch).width);
  advCache.set(key, w);
  return w;
};

export type Run = { text: string; ar: boolean };
export type Line = { runs: Run[]; width: number; text: string };
export type TextLayout = {
  lines: Line[];
  /** sprite width — engine: int(max(lineWidths) + 8) */
  wd: number;
  /** sprite height — engine: lhp * nLines + int(size * 0.35) */
  ht: number;
  /** line pitch — engine: int(size * lh) */
  lhp: number;
  /** letter-spacing in px — engine: size * spacing */
  sp: number;
  /** Arabic glyphs are drawn at int(size * 1.1) inside mixed text. */
  arSize: number;
  size: number;
  weight: number;
  align: "l" | "c";
};

/** Split a line into Arabic / non-Arabic runs, preserving order. */
const splitRuns = (s: string): Run[] => {
  const runs: Run[] = [];
  for (const ch of s) {
    const ar = isar(ch);
    const last = runs[runs.length - 1];
    if (last && last.ar === ar) last.text += ch;
    else runs.push({ text: ch, ar });
  }
  return runs;
};

/**
 * Port of engine.text_sprite's layout half.
 * `upper` uppercases non-Arabic characters, exactly as engine.py does.
 */
export const layoutText = (opts: {
  txt: string;
  size: number;
  weight?: string;
  upper?: boolean;
  maxw?: number | null;
  align?: "l" | "c";
  spacing?: number;
  lh?: number;
}): TextLayout => {
  const {
    size,
    weight = "SemiBold",
    upper = true,
    maxw = null,
    align = "l",
    spacing = TXT_SPACING,
    lh = TXT_LH,
  } = opts;

  const txt = upper
    ? Array.from(opts.txt)
        .map((c) => (isar(c) ? c : c.toUpperCase()))
        .join("")
    : opts.txt;

  const wght = WEIGHT[weight] ?? 600;
  const arSize = Math.trunc(size * 1.1);
  const sp = upper ? size * spacing : 0;

  const cw = (c: string): number =>
    (isar(c) ? advance(c, F_AMIRI, arSize, 400) : advance(c, F_MONT, size, wght)) + sp;
  const ww = (s: string): number => Array.from(s).reduce((a, c) => a + cw(c), 0);

  // engine.text_sprite wrapping, including the no-maxw short circuit.
  const raw: string[] = [];
  for (const para of txt.split("\n")) {
    if (!maxw) {
      raw.push(para);
      continue;
    }
    let cur = "";
    for (const word of para.split(" ")) {
      const t = `${cur} ${word}`.trim();
      if (ww(t) <= maxw || !cur) cur = t;
      else {
        raw.push(cur);
        cur = word;
      }
    }
    raw.push(cur);
  }

  const lines: Line[] = raw.map((t) => ({ text: t, runs: splitRuns(t), width: ww(t) }));
  const lhp = Math.trunc(size * lh);
  return {
    lines,
    wd: Math.trunc(Math.max(...lines.map((l) => l.width)) + 8),
    ht: lhp * lines.length + Math.trunc(size * 0.35),
    lhp,
    sp,
    arSize,
    size,
    weight: wght,
    align,
  };
};

export type ArLayout = {
  lines: string[];
  wd: number;
  ht: number;
  lhp: number;
  size: number;
  family: string;
};

/** Port of engine.ar_sprite's layout half (RTL, centred lines). */
export const layoutArabic = (opts: {
  txt: string;
  size: number;
  family: string;
  maxw?: number;
}): ArLayout => {
  const { txt, size, family, maxw = 1600 } = opts;
  const c = getCtx();
  c.font = `400 ${size}px "${family}"`;
  const measure = (s: string): number => c.measureText(s).width;

  const lines: string[] = [];
  let cur = "";
  for (const w of txt.split(" ")) {
    const t = `${cur} ${w}`.trim();
    if (measure(t) <= maxw || !cur) cur = t;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  lines.push(cur);

  const lhp = Math.trunc(size * 1.75);
  return {
    lines,
    wd: Math.trunc(Math.max(...lines.map(measure))) + 20,
    ht: lhp * lines.length + Math.trunc(size * 0.4),
    lhp,
    size,
    family,
  };
};

/**
 * Montserrat advance of a whole string with no letter-spacing — used for the
 * card's English lines and for the tile labels. Summed per glyph so it equals
 * PIL's getlength() on the same string.
 */
export const montWidth = (s: string, size: number, weight = "SemiBold"): number => {
  const wght = WEIGHT[weight] ?? 600;
  let total = 0;
  for (const c of s) total += advance(c, F_MONT, size, wght);
  return total;
};

/**
 * Drop every cached advance. Called once the real fonts are in place so no
 * measurement taken against a fallback face can survive.
 */
export const resetMetricsCache = (): void => {
  advCache.clear();
};
