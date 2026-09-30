/** Shape of src/data/scenes.json, produced by tools/resolve_scenes.py. */
import type { Part } from "../components/Vfx";

export type Anim =
  | "pop"
  | "drop"
  | "slide"
  | "type"
  | "slideL"
  | "rise"
  | "revealR"
  | "card"
  | "walk";

type Base = { id: number; t: number; dur: number; anim: Anim; parts?: Part[] };

export type ImgEl = Base & {
  k: "img";
  key: string;
  box: [number, number, number, number];
  rot: number;
  dir: number;
  sw: number;
  sh: number;
  x: number;
  y: number;
  glow?: number;
};
export type TxtEl = Base & {
  k: "txt";
  txt: string;
  x: number;
  y: number;
  size: number;
  col: string;
  weight: string;
  center: boolean;
  maxw: number | null;
  stroke?: boolean;
};
export type ArEl = Base & {
  k: "ar";
  txt: string;
  x: number;
  y: number;
  size: number;
  col: string;
};
export type CardEl = Base & {
  k: "card";
  ar: string;
  en: string;
  ref: string;
  x: number;
  y: number;
  w: number;
  hl: string;
  th: number;
};
export type TilesEl = Base & { k: "tiles"; labels: string[]; x: number; y: number };
export type BadgeEl = Base & { k: "badge"; n: string; x: number; y: number };
export type WalkEl = Base & {
  k: "walk";
  y: number;
  h: number;
  sw: number;
  sh: number;
  kt: [number, number][];
};

export type El = ImgEl | TxtEl | ArEl | CardEl | TilesEl | BadgeEl | WalkEl;

export type Shot = {
  anc: string;
  st: number;
  en: number;
  trans: "push" | "wipe" | "fade";
  wordIdx: number;
  els: El[];
};

export type Scenes = {
  meta: {
    width: number;
    height: number;
    fps: number;
    fps12: number;
    end: number;
    fade: number;
    app: number;
    tr: number;
    totalWords: number;
    note: string;
  };
  shots: Shot[];
};
