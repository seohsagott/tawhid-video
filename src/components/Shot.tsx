/**
 * Shot composition, camera push-in and the three page transitions.
 * Ported from render3.py: `camera()`, `sheet()` and `frame3()`.
 */
import React from "react";
import { Img, staticFile } from "remotion";
import { clamp, eo } from "../engine/ease";
import { TR } from "../engine/constants";
import type { Shot } from "../engine/types";
import { ElementView } from "./Element";

export const Paper: React.FC<{ w: number; h: number }> = ({ w, h }) => (
  <Img
    src={staticFile("el/bg.png")}
    alt=""
    style={{ position: "absolute", left: 0, top: 0, width: w, height: h, objectFit: "cover" }}
  />
);

/** render3.camera: a slow push-in across the shot, ~2.8% (v2 §6: "نحو ٣٪"). */
export const cameraZoom = (shot: Shot, t: number): number =>
  1 + 0.028 * clamp((t - shot.st) / Math.max(1, shot.en - shot.st));

/** One shot drawn on paper, with the camera applied — render3's `lay`. */
export const ShotLayer: React.FC<{ shot: Shot; t: number; n12: number; w: number; h: number }> = ({ shot, t, n12, w, h }) => (
  <div
    style={{
      position: "absolute",
      width: w,
      height: h,
      transform: `scale(${cameraZoom(shot, t)})`,
      transformOrigin: "center center",
    }}
  >
    <Paper w={w} h={h} />
    {shot.els.map((el) => (
      <ElementView key={el.id} el={el} t={t} n12={n12} />
    ))}
  </div>
);

/**
 * render3.sheet: a blank page that slides across for the `wipe` transition,
 * with a soft 60px leading-edge shadow (alpha ramps as (x/60)^2 * 90).
 */
export const Sheet: React.FC<{ x: number; w: number; h: number }> = ({ x, w, h }) => (
  <div style={{ position: "absolute", left: x, top: 0, width: w + 60, height: h }}>
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 60,
        height: h,
        background:
          "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.088) 50%, rgba(0,0,0,0.353) 100%)",
      }}
    />
    <Img
      src={staticFile("el/bg.png")}
      alt=""
      style={{ position: "absolute", left: 60, top: 0, width: w, height: h, objectFit: "cover" }}
    />
  </div>
);

/**
 * render3.frame3 — the whole frame.
 *
 * The two halves of a transition are sequential, not overlapping: the outgoing
 * half belongs to the shot that is ending and uses the *next* shot's `trans`;
 * the incoming half belongs to the shot that is starting and uses its own.
 * Verse shots are always `fade` (v2 §6).
 */
export const Frame: React.FC<{ shots: Shot[]; t: number; n12: number; w: number; h: number }> = ({ shots, t, n12, w, h }) => {
  const W = w;
  const cur = shots.findIndex((s) => s.st <= t && t < s.en);
  if (cur < 0) return <Paper w={w} h={h} />;

  const s = shots[cur];
  const nxt = cur + 1 < shots.length ? shots[cur + 1] : null;
  const lay = <ShotLayer shot={s} t={t} n12={n12} w={w} h={h} />;

  const stage = (children: React.ReactNode, extra?: React.CSSProperties) => (
    <div style={{ position: "absolute", width: w, height: h, overflow: "hidden", ...extra }}>
      {children}
    </div>
  );

  if (nxt && t >= s.en - TR) {
    // outgoing half — uses the incoming shot's transition
    const q = eo((t - (s.en - TR)) / TR);
    if (nxt.trans === "push") {
      return (
        <>
          <Paper w={w} h={h} />
          {stage(<div style={{ transform: `translateX(${-W * q}px)` }}>{lay}</div>)}
        </>
      );
    }
    if (nxt.trans === "fade") {
      return (
        <>
          <Paper w={w} h={h} />
          <div style={{ position: "absolute", opacity: 1 - q }}>{lay}</div>
        </>
      );
    }
    return (
      <>
        {lay}
        <Sheet x={W * (1 - q) - 60} w={w} h={h} />
      </>
    );
  }

  if (cur > 0 && t < s.st + TR) {
    // incoming half
    const q = eo((t - s.st) / TR);
    if (s.trans === "push") {
      return (
        <>
          <Paper w={w} h={h} />
          {stage(<div style={{ transform: `translateX(${W - W * q}px)` }}>{lay}</div>)}
        </>
      );
    }
    if (s.trans === "fade") {
      return (
        <>
          <Paper w={w} h={h} />
          <div style={{ position: "absolute", opacity: q }}>{lay}</div>
        </>
      );
    }
    return (
      <>
        {lay}
        <Sheet x={-W * q - 60} w={w} h={h} />
      </>
    );
  }

  return lay;
};
