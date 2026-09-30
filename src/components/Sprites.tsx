/**
 * Sprite renderers — the drawing half of tawhid-kit/engine.py.
 *
 * Each sprite reproduces the Python sprite's box exactly: same width/height
 * formula, same baselines, same centring. Text is SVG <text> so `y` is the
 * baseline, matching PIL's anchor='ls' / anchor='ms'.
 */
import React from "react";
import { Img, staticFile } from "remotion";
import {
  CARD_FILL,
  F_AMIRI,
  F_MONT,
  F_QURAN,
  MUTED,
  ROSE,
  SLATE,
  WEIGHT,
} from "../engine/constants";
import {
  ArLayout,
  layoutArabic,
  layoutText,
  montWidth,
  TextLayout,
} from "../engine/measure";

/* ------------------------------------------------------------------ helpers */

/** engine.shadowed: a blurred rounded-rect drop shadow, offset 10px down. */
const shadow = (blurRadius: number): string =>
  `drop-shadow(0 10px ${blurRadius}px rgba(70,55,40,0.235))`;

const noKern: React.CSSProperties = {
  fontKerning: "none",
  fontVariantLigatures: "none",
  whiteSpace: "pre",
};

/* ------------------------------------------------------------- text sprite */

export const TextSprite: React.FC<{ lay: TextLayout; color: string }> = ({ lay, color }) => (
  <svg
    width={lay.wd}
    height={lay.ht}
    viewBox={`0 0 ${lay.wd} ${lay.ht}`}
    style={{ display: "block", overflow: "visible" }}
  >
    {lay.lines.map((ln, i) => (
      <text
        key={i}
        x={lay.align === "c" ? (lay.wd - ln.width) / 2 : 0}
        y={i * lay.lhp + lay.size * 0.95}
        fill={color}
        style={{ ...noKern, letterSpacing: `${lay.sp}px` }}
      >
        {ln.runs.map((r, j) => (
          <tspan
            key={j}
            fontFamily={r.ar ? F_AMIRI : F_MONT}
            fontSize={r.ar ? lay.arSize : lay.size}
            fontWeight={r.ar ? 400 : lay.weight}
          >
            {r.text}
          </tspan>
        ))}
      </text>
    ))}
  </svg>
);

/* ----------------------------------------------------------- arabic sprite */

export const ArSprite: React.FC<{ lay: ArLayout; color: string }> = ({ lay, color }) => (
  <svg
    width={lay.wd}
    height={lay.ht}
    viewBox={`0 0 ${lay.wd} ${lay.ht}`}
    style={{ display: "block", overflow: "visible" }}
  >
    {lay.lines.map((l, i) => (
      <text
        key={i}
        x={lay.wd / 2}
        y={i * lay.lhp + lay.size * 1.15}
        fill={color}
        textAnchor="middle"
        direction="rtl"
        fontFamily={lay.family}
        fontSize={lay.size}
        fontWeight={400}
        style={{ whiteSpace: "pre" }}
      >
        {l}
      </text>
    ))}
  </svg>
);

/* ------------------------------------------------------------ card sprite */

export type CardGeom = {
  w: number;
  ht: number;
  A: ArLayout;
  lab: TextLayout;
  R: TextLayout;
  enLines: string[][];
  hlw: Set<number>;
  yA: number;
  yLab: number;
  yEn: number;
  yRef: number;
};

const CARD_PAD = 48;
const CARD_EN_SIZE = 40;
const CARD_EN_LH = 56;

/** Port of engine.card_sprites' layout. */
export const layoutCard = (ar: string, en: string, ref: string, w: number, hl: string): CardGeom => {
  const inner = w - 2 * CARD_PAD;
  const A = layoutArabic({ txt: ar, size: 54, family: F_QURAN, maxw: inner });
  const lab = layoutText({
    txt: "Translation of the meaning",
    size: 22,
    weight: "Medium",
    upper: true,
    maxw: null,
    align: "c",
    spacing: 0.14,
  });
  const R = layoutText({
    txt: ref,
    size: 26,
    weight: "SemiBold",
    upper: true,
    maxw: null,
    align: "c",
    spacing: 0.12,
  });

  // engine: wrap the English into lines of whole words at 40px SemiBold.
  const words = en.split(" ");
  const enLines: string[][] = [];
  let cur: string[] = [];
  for (const wd of words) {
    const t = [...cur, wd].join(" ");
    if (montWidth(t, CARD_EN_SIZE) <= inner || cur.length === 0) cur.push(wd);
    else {
      enLines.push(cur);
      cur = [wd];
    }
  }
  enLines.push(cur);

  // engine: highlighted word index range, found by substring position.
  const hlw = new Set<number>();
  const ew = words.join(" ");
  const k = hl ? ew.indexOf(hl) : -1;
  if (k >= 0) {
    const st = ew.slice(0, k).split(" ").filter((x) => x !== "").length;
    for (let i = 0; i < hl.split(" ").length; i++) hlw.add(st + i);
  }

  const eh = CARD_EN_LH * enLines.length + 14;
  const yA = CARD_PAD;
  const yLab = yA + A.ht + 18;
  const yEn = yLab + lab.ht + 8;
  const yRef = yEn + eh + 22;
  const ht = yRef + R.ht + CARD_PAD;
  return { w, ht, A, lab, R, enLines, hlw, yA, yLab, yEn, yRef };
};

/**
 * `hlOpacity` crossfades the highlight in, reproducing engine's two-variant
 * sprite pair: the base card is drawn with every word slate, then the
 * highlighted words are drawn again in rose on top at the given opacity.
 */
export const CardSprite: React.FC<{ g: CardGeom; hlOpacity: number }> = ({ g, hlOpacity }) => {
  const enWeight = WEIGHT.SemiBold;
  let idx = 0;
  const lines = g.enLines.map((ln, i) => {
    const lwid = montWidth(ln.join(" "), CARD_EN_SIZE);
    let x = (g.w - lwid) / 2;
    const y = g.yEn + i * CARD_EN_LH + 40;
    const out = ln.map((wd) => {
      const item = { wd, x, y, hl: g.hlw.has(idx) };
      // engine advances by getlength(word + ' ')
      x += montWidth(`${wd} `, CARD_EN_SIZE);
      idx += 1;
      return item;
    });
    return out;
  });
  const flat = lines.flat();

  return (
    <div style={{ width: g.w, height: g.ht, filter: shadow(26) }}>
      <svg
        width={g.w}
        height={g.ht}
        viewBox={`0 0 ${g.w} ${g.ht}`}
        style={{ display: "block", overflow: "visible" }}
      >
        <rect x={0} y={0} width={g.w - 1} height={g.ht - 1} rx={20} ry={20} fill={CARD_FILL} />

        {/* 'uthmani verse text */}
        <g transform={`translate(${Math.trunc((g.w - g.A.wd) / 2)},${g.yA})`}>
          {g.A.lines.map((l, i) => (
            <text
              key={i}
              x={g.A.wd / 2}
              y={i * g.A.lhp + g.A.size * 1.15}
              fill={ROSE}
              textAnchor="middle"
              direction="rtl"
              fontFamily={F_QURAN}
              fontSize={g.A.size}
              style={{ whiteSpace: "pre" }}
            >
              {l}
            </text>
          ))}
        </g>

        {/* the fixed label required by v3 §7 */}
        <g transform={`translate(${Math.trunc((g.w - g.lab.wd) / 2)},${g.yLab})`}>
          {g.lab.lines.map((l, i) => (
            <text
              key={i}
              x={(g.lab.wd - l.width) / 2}
              y={i * g.lab.lhp + g.lab.size * 0.95}
              fill={MUTED}
              fontFamily={F_MONT}
              fontSize={g.lab.size}
              fontWeight={g.lab.weight}
              style={{ ...noKern, letterSpacing: `${g.lab.sp}px` }}
            >
              {l.text}
            </text>
          ))}
        </g>

        {/* translation of the meaning */}
        {flat.map((it, i) => (
          <text
            key={`b${i}`}
            x={it.x}
            y={it.y}
            fill={SLATE}
            fontFamily={F_MONT}
            fontSize={CARD_EN_SIZE}
            fontWeight={enWeight}
            style={{ ...noKern }}
          >
            {it.wd}
          </text>
        ))}
        {hlOpacity > 0 &&
          flat
            .filter((it) => it.hl)
            .map((it, i) => (
              <text
                key={`h${i}`}
                x={it.x}
                y={it.y}
                fill={ROSE}
                opacity={hlOpacity}
                fontFamily={F_MONT}
                fontSize={CARD_EN_SIZE}
                fontWeight={enWeight}
                style={{ ...noKern }}
              >
                {it.wd}
              </text>
            ))}

        {/* reference — surah name, surah:ayah (v3 §8) */}
        <g transform={`translate(${Math.trunc((g.w - g.R.wd) / 2)},${g.yRef})`}>
          {g.R.lines.map((l, i) => (
            <text
              key={i}
              x={(g.R.wd - l.width) / 2}
              y={i * g.R.lhp + g.R.size * 0.95}
              fill={ROSE}
              fontFamily={F_MONT}
              fontSize={g.R.size}
              fontWeight={g.R.weight}
              style={{ ...noKern, letterSpacing: `${g.R.sp}px` }}
            >
              {l.text}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
};

/* ----------------------------------------------------------- tiles sprite */

export type TilesGeom = { widths: number[]; total: number };

/** engine.tiles_sprite: 44px Bold labels, min tile width 96, 16px gaps, 40px pad. */
export const layoutTiles = (labels: string[]): TilesGeom => {
  const widths = labels.map((l) => Math.max(96, Math.trunc(montWidth(l, 44, "Bold")) + 36));
  const gap = 16;
  return { widths, total: widths.reduce((a, b) => a + b, 0) + gap * (labels.length - 1) + 80 };
};

export const TilesSprite: React.FC<{ labels: string[]; g: TilesGeom }> = ({ labels, g }) => {
  let x = 40;
  const tiles = labels.map((l, i) => {
    const item = { l, x, w: g.widths[i] };
    x += g.widths[i] + 16;
    return item;
  });
  return (
    <div style={{ width: g.total, height: 200, position: "relative" }}>
      {tiles.map((t, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: t.x,
            top: 40,
            width: t.w,
            height: 116,
            borderRadius: 10,
            background: CARD_FILL,
            filter: shadow(16),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: F_MONT,
            fontSize: 44,
            fontWeight: WEIGHT.Bold,
            color: SLATE,
            lineHeight: 1,
          }}
        >
          {t.l}
        </div>
      ))}
    </div>
  );
};

/* ----------------------------------------------------------- badge sprite */

/** engine.badge_sprite: 64px rose disc, white 32px Bold numeral. */
export const BadgeSprite: React.FC<{ n: string }> = ({ n }) => (
  <svg width={64} height={64} viewBox="0 0 64 64" style={{ display: "block" }}>
    <circle cx={32} cy={32} r={32} fill={ROSE} />
    <text
      x={32}
      y={33}
      fill="#FFFFFF"
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily={F_MONT}
      fontSize={32}
      fontWeight={WEIGHT.Bold}
    >
      {n}
    </text>
  </svg>
);

/* ------------------------------------------------------------ img sprite */

export const ImgSprite: React.FC<{ el: string; w: number; h: number; rot?: number }> = ({
  el,
  w,
  h,
  rot = 0,
}) => (
  <Img
    src={staticFile(`el/${el}.png`)}
    width={w}
    height={h}
    style={{
      display: "block",
      width: w,
      height: h,
      transform: rot ? `rotate(${rot}deg)` : undefined,
    }}
    alt=""
  />
);
