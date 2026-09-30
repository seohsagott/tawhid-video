/**
 * Runtime resolver — turns a content-only project file into the fully
 * resolved `Scenes` the components draw. A port of tools/resolve_scenes.py
 * and tools/resolve_sfx.py (which were themselves ports of render.py,
 * render2.py, render3.py and sfx3.py), and verified to reproduce their baked
 * output exactly: same timeline, same animation assignment, same geometry,
 * bit-identical sparkle/dust draws, identical effects cue list.
 *
 * Values that the Python rounded to 4 decimals are rounded here too, so the
 * 0.14 s effects gate and the cue sort see the same numbers.
 */
import manifest from "../data/elManifest.json";
import sfxBank from "../data/sfxBank.json";
import sfxPeaks from "../data/sfxPeaks.json";
import { Locator, type Words } from "./locate";
import { PyRandom } from "./pyrandom";
import type { Project, ProjectAt, ProjectEl } from "../schema/project";
import type { El, ImgEl, Scenes, Shot } from "./types";
import type { Part } from "../components/Vfx";

const r4 = (x: number): number => Math.round(x * 1e4) / 1e4;
const clamp = (v: number, a = 0, b = 1): number => Math.max(a, Math.min(b, v));

// render2.py / render3.py tables
const SLIDE = new Set(["worship", "scholar", "group", "childlook", "idols", "sheep", "fence", "steps",
  "villages", "cup", "town", "scale", "globe", "blocks", "tsg", "rope", "flowers", "chain"]);
const DROP = new Set(["book", "quran", "pen", "layers", "amulet", "ring", "mirror", "phones", "puzzle"]);
const STARS = ["star_01", "star_02", "star_04", "star_06", "star_07", "spark_01"];
const DUST = ["smoke_01", "smoke_03", "smoke_05", "smoke_07"];
const SPARK = new Set(["lamp", "lantern", "moon", "crown", "markyes", "heart", "globe", "quran"]);
const GLOWK = new Set(["lamp", "lantern", "moon"]);
const STROKE_COLS = new Set(["#B9797A", "#60805A"]); // ROSE, SAGE

const imgGeom = (key: string, box: [number, number, number, number], rot: number) => {
  const dims = (manifest as unknown as Record<string, [number, number]>)[key];
  if (!dims) throw new Error(`unknown image key ${key}`);
  let [iw, ih] = dims;
  if (rot % 180 !== 0) [iw, ih] = [ih, iw];
  const [bx, by, bw, bh] = box;
  const s = Math.min(bw / iw, bh / ih);
  const sw = Math.max(1, Math.trunc(iw * s));
  const sh = Math.max(1, Math.trunc(ih * s));
  return { sw, sh, x: bx + Math.floor((bw - sw) / 2), y: by + Math.floor((bh - sh) / 2) };
};

export const resolveProject = (p: Project, words: Words): Scenes => {
  const loc = new Locator(words);
  const END = words[words.length - 1][2] + p.tailSeconds;

  // ---- timeline (render.py)
  type Work = { anc: string; st: number; en: number; idx: number; els: ProjectEl[] };
  const shots: Work[] = [];
  let pos = 0;
  p.shots.forEach((s, si) => {
    let st = 0;
    let idx = 0;
    if (si > 0) {
      idx = loc.locate(s.anchor, pos);
      st = Math.max(loc.t0(idx) - 0.15, 0);
      pos = idx + 1;
    }
    shots.push({ anc: s.anchor, st, en: 0, idx, els: s.els });
  });
  shots.forEach((s, i) => {
    s.en = i + 1 < shots.length ? shots[i + 1].st : END;
  });
  const rt = (at: ProjectAt, s: Work): number =>
    at.phrase === "" ? s.st + at.offset : loc.t0(loc.locate(at.phrase, s.idx)) - 0.1 + at.offset;

  // ---- elements: timing, anims (render2), geometry
  let eid = 0;
  const out: Shot[] = shots.map((s) => ({
    anc: s.anc,
    st: r4(s.st),
    en: r4(s.en),
    trans: "fade",
    wordIdx: s.idx,
    els: s.els.map((e): El => {
      eid += 1;
      if (e.k === "walk") {
        const kt = e.keys.map((k) => [r4(rt(k.at, s)), k.x] as [number, number]);
        const g = imgGeom("childwalk", [0, 0, 400, e.h], 0);
        return { id: eid, k: "walk", anim: "walk", t: kt[0][0], dur: 0.5, y: e.y, h: e.h, sw: g.sw, sh: g.sh, kt };
      }
      const t = r4(rt(e.at, s));
      if (e.k === "img") {
        const box = e.box as [number, number, number, number];
        const g = imgGeom(e.key, box, e.rot);
        const anim = SLIDE.has(e.key) ? "slide" : DROP.has(e.key) ? "drop" : "pop";
        const el: ImgEl = { id: eid, k: "img", anim, t, dur: 0.6, key: e.key, box, rot: e.rot,
          dir: e.box[0] + e.box[2] / 2 < 960 ? -1 : 1, sw: g.sw, sh: g.sh, x: g.x, y: g.y };
        if (GLOWK.has(e.key)) el.glow = Math.trunc(Math.max(g.sw, g.sh) * 1.5);
        return el;
      }
      if (e.k === "txt") {
        const n = Array.from(e.txt).length;
        const big = e.weight === "Bold" && e.size >= 48;
        const el: El = { id: eid, k: "txt", anim: big ? "type" : e.center ? "rise" : "slideL",
          t, dur: big ? r4(clamp(n * 0.04, 0.45, 1.3)) : 0.5, txt: e.txt, x: e.x, y: e.y, size: e.size,
          col: e.col, weight: e.weight, center: e.center, maxw: e.maxw || null };
        if (big && STROKE_COLS.has(e.col.toUpperCase()) && n < 40) el.stroke = true;
        return el;
      }
      if (e.k === "ar") return { id: eid, k: "ar", anim: "revealR", t, dur: 1.0, txt: e.txt, x: e.x, y: e.y, size: e.size, col: e.col };
      if (e.k === "card") return { id: eid, k: "card", anim: "card", t, dur: 0.7, ar: e.ar, en: e.en, ref: e.ref,
        x: e.x, y: e.y, w: e.w, hl: e.hl, th: r4(rt(e.hlAt, s)) };
      if (e.k === "tiles") return { id: eid, k: "tiles", anim: "pop", t, dur: 0.45, labels: e.labels, x: e.x, y: e.y };
      return { id: eid, k: "badge", anim: "pop", t, dur: 0.45, n: e.n, x: e.x, y: e.y };
    }),
  }));

  // ---- vfx (render3.py) — the Random(11) stream, consumed in exactly this order
  const rnd = new PyRandom(11);
  for (const s of out) {
    for (const e of s.els) {
      if (e.k === "img") {
        const parts: Part[] = [];
        const cx = e.x + e.sw / 2;
        const cy = e.y + e.sh / 2;
        if (SPARK.has(e.key)) {
          for (let j = 0; j < 9; j++) {
            parts.push({ kind: "star", t: r4(e.t + 0.25), cx, cy, ang: r4(rnd.uniform(0, 2 * Math.PI)),
              dist: r4(rnd.uniform(90, 190)), sprite: rnd.choice(STARS), sc: r4(rnd.uniform(0.7, 1.1)) });
          }
        }
        if (e.anim === "drop") {
          const by = e.y + e.sh * 0.82;
          for (let j = 0; j < 4; j++) {
            parts.push({ kind: "dust", t: r4(e.t + 0.36), cx: r4(cx + rnd.uniform(-0.3, 0.3) * e.sw), cy: r4(by),
              ang: rnd.choice([-1, 1]), dist: r4(rnd.uniform(30, 90)), sprite: rnd.choice(DUST), sc: 1 });
          }
        }
        if (parts.length) e.parts = parts;
      }
      if (e.k === "card") {
        e.parts = Array.from({ length: 7 }, () => ({ kind: "star" as const, t: r4(e.th + 0.05),
          fx: r4(rnd.uniform(0.25, 0.75)), fy: 0.62, ang: r4(rnd.uniform(0, 2 * Math.PI)),
          dist: r4(rnd.uniform(60, 140)), sprite: rnd.choice(STARS), sc: 0.8 }));
      }
    }
  }
  out.forEach((s, i) => {
    s.trans = s.els.some((e) => e.k === "card") ? "fade" : (["push", "wipe", "fade"] as const)[i % 3];
  });

  return {
    meta: { width: p.width, height: p.height, fps: p.fps, fps12: 12, end: r4(END), fade: 0.3, app: 0.5, tr: 0.35,
      totalWords: words.length, note: "resolved at runtime by src/engine/resolve.ts" },
    shots: out,
  };
};

/* ------------------------------------------------------------- sfx (sfx3.py) */

export type SfxEvent = { t: number; bank: string; file: string; cue: string; vol: number; dur: number };

const GAIN: Record<string, number> = { page: -7, place: -9, cloth: -12, switch: -8, click: -13, creak: -9, tick: -9,
  stone: -15, wood: -12, metal: -15, foot: -17, scratch: -15, soft: -12, water: -8, wind: -6, flutter: -8 };
const SUBST: Record<string, string> = { water: "soft", wind: "cloth", flutter: "cloth" };
const IMG: Record<string, [string | null, string | null]> = {
  book: ["page", "place"], quran: ["page", "place"], layers: ["page", "place"], pen: [null, "place"],
  amulet: [null, "place"], ring: [null, "place"], mirror: [null, "place"], phones: [null, "place"], puzzle: [null, "place"],
  lamp: ["switch", null], lantern: ["switch", null], moon: ["click", null], crown: ["click", null], heart: ["click", null],
  markyes: ["click", null], markno: ["wood", null], rope: ["creak", null], clock: ["tick", null], idols: ["stone", null],
  fence: ["wood", null], chain: ["metal", null], scale: ["metal", null], steps: ["foot", null], cup: ["water", null],
  wind: ["wind", null], bird: ["flutter", null], sprout: ["soft", null], cloud: ["soft", null], globe: ["soft", null],
};

export const resolveSfx = (scenes: Scenes): SfxEvent[] => {
  const ev: [number, string, number][] = [];
  scenes.shots.forEach((s, i) => {
    if (i > 0) {
      if (s.trans === "push") ev.push([s.st - 0.3, "cloth", -2]);
      else if (s.trans === "wipe") ev.push([s.st - 0.3, "page", -2]);
    }
    for (const e of s.els) {
      if (e.k === "img") {
        const [a, b] = IMG[e.key] ?? ["cloth", null];
        if (a) ev.push([e.t, a, 0]);
        if (b) ev.push([e.t + 0.36, b, 0]);
      } else if (e.k === "badge" || e.k === "tiles") ev.push([e.t, "click", 0]);
      else if (e.k === "card") { ev.push([e.t, "page", 0]); ev.push([e.th, "scratch", 0]); }
      else if (e.k === "txt" && e.stroke) ev.push([e.t + e.dur, "scratch", 0]);
      else if (e.k === "walk") {
        for (let k = 0; k + 1 < e.kt.length; k++) for (let j = 0; j < 4; j++) ev.push([e.kt[k + 1][0] + 0.05 + j * 0.22, "foot", 0]);
      }
    }
  });
  // Python tuple sort: t, then cue name, then gain
  ev.sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0) || a[2] - b[2]);

  const rr = new PyRandom(5);
  const bank = sfxBank as Record<string, string[]>;
  const peaks = sfxPeaks as Record<string, { peak: number; dur: number }>;
  const out: SfxEvent[] = [];
  let last = -9;
  for (const [t, name, g] of ev) {
    if (name !== "foot" && t - last < 0.14) continue;
    const bk = SUBST[name] ?? name;
    const fn = rr.choice(bank[bk]);
    const key = `${bk}/${fn}`;
    const pk = peaks[key].peak || 1;
    const vol = (1 / pk) * 10 ** (-12 / 20) * 10 ** ((GAIN[name] + g) / 20);
    out.push({ t: r4(Math.max(0, t)), bank: bk, file: fn, cue: name, vol: Math.round(vol * 1e6) / 1e6, dur: peaks[key].dur });
    last = t;
  }
  return out;
};
