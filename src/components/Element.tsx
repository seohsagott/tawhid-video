/**
 * Element rendering — the port of render2.draw_el plus render3.draw_shot3's
 * back/front effect passes.
 *
 * Every entry animation, its duration and its opacity ramp is copied from
 * render2.py. The per-element jitter is applied only once an element has
 * settled (p >= 1) and only to images, exactly as in the Python.
 */
import React, { useMemo } from "react";
import { back, bounce, clamp, eo, jit } from "../engine/ease";
import { F_AMIRI } from "../engine/constants";
import { layoutArabic, layoutText } from "../engine/measure";
import type { El } from "../engine/types";
import {
  ArSprite,
  BadgeSprite,
  CardSprite,
  ImgSprite,
  layoutCard,
  layoutTiles,
  TextSprite,
  TilesSprite,
} from "./Sprites";
import { Glow, glowOpacity, MarkerStroke, Particles } from "./Vfx";

const abs = (left: number, top: number, opacity = 1): React.CSSProperties => ({
  position: "absolute",
  left,
  top,
  opacity,
});

/** render2.draw_el's `walk` branch, ported line for line. */
const walkX = (kt: [number, number][], t: number): { x: number; moving: boolean } => {
  let xx = kt[0][1];
  let moving = false;
  for (let i = 0; i < kt.length - 1; i++) {
    const [t1, x1] = kt[i];
    if (t >= t1) xx = x1;
    if (t1 <= t && t < t1 + 0.9) {
      xx = x1;
      break;
    }
  }
  for (let i = 0; i < kt.length - 1; i++) {
    const [, x1] = kt[i];
    const [t2, x2] = kt[i + 1];
    if (t2 <= t && t < t2 + 0.9) {
      xx = x1 + (x2 - x1) * ((t - t2) / 0.9);
      moving = true;
    } else if (t >= t2 + 0.9) {
      xx = x2;
    }
  }
  return { x: xx, moving };
};

export const ElementView: React.FC<{ el: El; t: number; n12: number }> = ({ el, t, n12 }) => {
  /* ---- layouts (memoised: they only depend on the element, not on time) ---- */
  const txtLay = useMemo(
    () =>
      el.k === "txt"
        ? layoutText({
            txt: el.txt,
            size: el.size,
            weight: el.weight,
            upper: true,
            maxw: el.maxw,
            align: el.center ? "c" : "l",
          })
        : null,
    [el],
  );
  const arLay = useMemo(
    () => (el.k === "ar" ? layoutArabic({ txt: el.txt, size: el.size, family: F_AMIRI }) : null),
    [el],
  );
  const cardGeom = useMemo(
    () => (el.k === "card" ? layoutCard(el.ar, el.en, el.ref, el.w, el.hl) : null),
    [el],
  );
  const tilesGeom = useMemo(() => (el.k === "tiles" ? layoutTiles(el.labels) : null), [el]);

  const dt = t - el.t;
  if (dt < 0) return null;

  /* ------------------------------------------------------------------ walk */
  if (el.k === "walk") {
    const { x, moving } = walkX(el.kt, t);
    const bob = moving ? (n12 % 2 ? -6 : 0) : 0;
    return (
      <div style={abs(x - Math.trunc(el.sw / 2), el.y + bob, eo(dt / 0.5))}>
        <ImgSprite el="childwalk" w={el.sw} h={el.sh} />
      </div>
    );
  }

  const p = dt / el.dur;
  const settled = p >= 1;

  /* --------------------------------------------- sprite box + base position */
  let sw = 0;
  let sh = 0;
  let bx = 0;
  let by = 0;
  if (el.k === "img") {
    sw = el.sw;
    sh = el.sh;
    bx = el.x;
    by = el.y;
  } else if (el.k === "txt" && txtLay) {
    sw = txtLay.wd;
    sh = txtLay.ht;
    bx = el.center ? el.x - Math.trunc(txtLay.wd / 2) : el.x;
    by = el.y;
  } else if (el.k === "ar" && arLay) {
    sw = arLay.wd;
    sh = arLay.ht;
    bx = el.x - Math.trunc(arLay.wd / 2);
    by = el.y;
  } else if (el.k === "card" && cardGeom) {
    sw = cardGeom.w;
    sh = cardGeom.ht;
    bx = el.x;
    by = el.y;
  } else if (el.k === "tiles" && tilesGeom) {
    sw = tilesGeom.total;
    sh = 200;
    bx = el.x - Math.trunc(tilesGeom.total / 2);
    by = el.y;
  } else if (el.k === "badge") {
    sw = 64;
    sh = 64;
    bx = el.x - 32;
    by = el.y - 32;
  }

  /* ------------------------------------------- the sprite itself (no motion) */
  const body = (() => {
    switch (el.k) {
      case "img":
        return <ImgSprite el={el.key} w={el.sw} h={el.sh} rot={el.rot} />;
      case "txt":
        return txtLay ? <TextSprite lay={txtLay} color={el.col} /> : null;
      case "ar":
        return arLay ? <ArSprite lay={arLay} color={el.col} /> : null;
      case "card":
        return cardGeom ? (
          <CardSprite
            g={cardGeom}
            hlOpacity={t >= el.th ? eo((t - el.th) / 0.4) : 0}
          />
        ) : null;
      case "tiles":
        return tilesGeom ? <TilesSprite labels={el.labels} g={tilesGeom} /> : null;
      case "badge":
        return <BadgeSprite n={el.n} />;
      default:
        return null;
    }
  })();

  /* --------------------------------------------------- back pass (behind el) */
  const backPass: React.ReactNode[] = [];
  if (el.k === "img" && el.glow) {
    const o = glowOpacity(t, el.t);
    if (o > 0) {
      backPass.push(
        <Glow
          key="glow"
          id={String(el.id)}
          size={el.glow}
          cx={el.x + el.sw / 2}
          cy={el.y + el.sh / 2}
          opacity={o}
        />,
      );
    }
  }
  if (el.k === "txt" && el.stroke && txtLay) {
    const t0 = el.t + el.dur;
    if (t >= t0) {
      const stW = txtLay.wd + 30;
      const stH = Math.trunc(el.size * 0.62);
      const reveal = Math.trunc(stW * eo((t - t0) / 0.35));
      if (reveal > 2) {
        backPass.push(
          <div key="stroke" style={abs(bx - 15, by + el.size * 0.42)}>
            <MarkerStroke w={stW} h={stH} reveal={reveal} />
          </div>,
        );
      }
    }
  }

  /* ------------------------------------------------------ motion (draw_el) */
  let node: React.ReactNode;
  if (settled) {
    const [jx, jy] = el.k === "img" ? jit(el.id, n12) : [0, 0];
    node = <div style={abs(bx + jx, by + jy)}>{body}</div>;
  } else {
    switch (el.anim) {
      case "pop": {
        const s = 0.25 + 0.75 * back(p, 1.8);
        node = (
          <div
            style={{
              ...abs(bx, by, clamp(p * 3)),
              width: sw,
              height: sh,
              transform: `scale(${s})`,
              transformOrigin: "center center",
            }}
          >
            {body}
          </div>
        );
        break;
      }
      case "drop":
        node = <div style={abs(bx, by - 160 * (1 - bounce(p)), clamp(p * 3))}>{body}</div>;
        break;
      case "slide":
        node = (
          <div
            style={abs(
              bx + (el.k === "img" ? el.dir : 1) * 260 * (1 - back(p, 1.2)),
              by,
              clamp(p * 2.5),
            )}
          >
            {body}
          </div>
        );
        break;
      case "type": {
        const w = Math.trunc(sw * clamp(p * 1.05));
        node = (
          <div style={{ ...abs(bx, by), width: w, height: sh, overflow: "hidden" }}>{body}</div>
        );
        break;
      }
      case "slideL":
        node = <div style={abs(bx - 80 * (1 - eo(p)), by, eo(p))}>{body}</div>;
        break;
      case "rise":
        node = <div style={abs(bx, by + 30 * (1 - eo(p)), eo(p))}>{body}</div>;
        break;
      case "revealR": {
        const w = Math.trunc(sw * eo(p));
        node = (
          <div
            style={{
              ...abs(bx + sw - w, by),
              width: w,
              height: sh,
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", left: -(sw - w), top: 0 }}>{body}</div>
          </div>
        );
        break;
      }
      case "card":
        node = <div style={abs(bx, by + 140 * (1 - back(p, 1.1)), clamp(p * 2.5))}>{body}</div>;
        break;
      default:
        node = <div style={abs(bx, by)}>{body}</div>;
    }
  }

  /* ------------------------------------------------------ strike-through */
  // A rose line wiping across the text over 0.3 s, at the middle of the cap height.
  let strike: React.ReactNode = null;
  if (el.k === "txt" && el.strikeT !== undefined && txtLay && t >= el.strikeT) {
    const wFull = txtLay.wd + 20;
    const wNow = Math.trunc(wFull * eo((t - el.strikeT) / 0.3));
    if (wNow > 2) {
      strike = (
        <div
          style={{
            ...abs(bx - 10, by + el.size * 0.95 - el.size * 0.36),
            width: wNow,
            height: Math.max(3, Math.round(el.size * 0.11)),
            background: "#B9797A",
            borderRadius: 2,
          }}
        />
      );
    }
  }

  /* ------------------------------------------------- front pass (particles) */
  // Card sparkles were baked as fractions of engine's padded sprite (+40 each side).
  const origin =
    el.k === "card" && cardGeom
      ? { x: el.x - 40, y: el.y - 40, w: cardGeom.w + 80, h: cardGeom.ht + 80 }
      : undefined;

  return (
    <>
      {backPass}
      {node}
      {strike}
      {el.parts ? <Particles parts={el.parts} t={t} origin={origin} /> : null}
    </>
  );
};
