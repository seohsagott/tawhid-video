/* Bit-exactness tests for the ported primitives, against the Python-baked data. */
import { PyRandom } from "../../src/engine/pyrandom";
import { Locator } from "../../src/engine/locate";
import scenes from "../../src/data/scenes.json";
import words from "../../src/data/words.json";

let fails = 0;
const eq = (a: number, b: number, tol = 5e-5) => Math.abs(a - b) <= tol;

/* --- 1. PyRandom(11): replay render3.py's consumption order, compare every draw --- */
const STARS = ["star_01", "star_02", "star_04", "star_06", "star_07", "spark_01"];
const DUST = ["smoke_01", "smoke_03", "smoke_05", "smoke_07"];
const SPARK = new Set(["lamp", "lantern", "moon", "crown", "markyes", "heart", "globe", "quran"]);
const rnd = new PyRandom(11);
let checked = 0;
for (const s of scenes.shots as any[]) {
  for (const e of s.els) {
    if (e.k === "img") {
      const parts: any[] = e.parts ?? [];
      let pi = 0;
      if (SPARK.has(e.key)) {
        for (let j = 0; j < 9; j++) {
          const ang = rnd.uniform(0, 2 * Math.PI), dist = rnd.uniform(90, 190), sp = rnd.choice(STARS), sc = rnd.uniform(0.7, 1.1);
          const p = parts[pi++];
          if (!p || !eq(p.ang, ang, 1e-4) || !eq(p.dist, dist, 1e-3) || p.sprite !== sp || !eq(p.sc, sc, 1e-4)) { fails++; if (fails < 5) console.log("STAR MISMATCH", e.key, p, { ang, dist, sp, sc }); }
          checked++;
        }
      }
      if (e.anim === "drop") {
        for (let j = 0; j < 4; j++) {
          const fx = rnd.uniform(-0.3, 0.3), dir = rnd.choice([-1, 1]), dist = rnd.uniform(30, 90), sp = rnd.choice(DUST);
          const p = parts[pi++];
          const cx = e.x + e.sw / 2 + fx * e.sw;
          if (!p || !eq(p.cx, cx, 1e-3) || p.ang !== dir || !eq(p.dist, dist, 1e-3) || p.sprite !== sp) { fails++; if (fails < 5) console.log("DUST MISMATCH", e.key, p, { cx, dir, dist, sp }); }
          checked++;
        }
      }
    }
    if (e.k === "card") {
      for (let j = 0; j < 7; j++) {
        const fx = rnd.uniform(0.25, 0.75), ang = rnd.uniform(0, 2 * Math.PI), dist = rnd.uniform(60, 140), sp = rnd.choice(STARS);
        const p = e.parts[j];
        if (!eq(p.fx, fx, 1e-4) || !eq(p.ang, ang, 1e-4) || !eq(p.dist, dist, 1e-3) || p.sprite !== sp) { fails++; if (fails < 5) console.log("CARD MISMATCH", p, { fx, ang, dist, sp }); }
        checked++;
      }
    }
  }
}
console.log(`PyRandom(11): ${checked} draws compared, ${fails} mismatches`);

/* --- 2. Locator: every shot anchor must land on the baked wordIdx --- */
const loc = new Locator(words as any);
let pos = 0, lf = 0, n = 0;
for (let si = 1; si < scenes.shots.length; si++) {
  const s = scenes.shots[si] as any;
  const idx = loc.locate(s.anc, pos);
  n++;
  if (idx !== s.wordIdx) { lf++; console.log("LOCATE MISMATCH", s.anc, idx, s.wordIdx); }
  pos = idx + 1;
}
console.log(`Locator: ${n} shot anchors compared, ${lf} mismatches`);
if (fails + lf) process.exit(1);
