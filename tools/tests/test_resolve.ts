/* resolveProject(project.json) must reproduce the baked scenes.json; resolveSfx the baked sfxEvents.json. */
import { resolveProject, resolveSfx } from "../../src/engine/resolve";
import project from "../../public/projects/tawhid-ep0/project.json";
import words from "../../public/projects/tawhid-ep0/words.json";
import baked from "../../src/data/scenes.json";
import bakedSfx from "../../src/data/sfxEvents.json";

const got = resolveProject(project as any, words as any);
let diffs = 0;
const report = (where: string, a: unknown, b: unknown) => { diffs++; if (diffs <= 12) console.log("DIFF", where, JSON.stringify(a), "!=", JSON.stringify(b)); };
const near = (a: any, b: any) => typeof a === "number" && typeof b === "number" ? Math.abs(a - b) <= 1.5e-4 : a === b;
const cmp = (where: string, a: any, b: any) => {
  if (Array.isArray(a) || Array.isArray(b)) { if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return report(where + ".len", a?.length, b?.length); a.forEach((x, i) => cmp(`${where}[${i}]`, x, b[i])); return; }
  if (a && b && typeof a === "object" && typeof b === "object") { const keys = new Set([...Object.keys(a), ...Object.keys(b)]); for (const k of keys) { if (k === "box" && where.includes("els")) { if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) report(where + "." + k, a[k], b[k]); continue; } cmp(where + "." + k, a[k], b[k]); } return; }
  if (!near(a, b)) report(where, a, b);
};
if (got.shots.length !== baked.shots.length) console.log("shot count", got.shots.length, baked.shots.length);
got.shots.forEach((s, i) => cmp(`shot${i}`, s, (baked as any).shots[i]));
cmp("meta.end", got.meta.end, (baked as any).meta.end);
console.log(`resolveProject vs scenes.json: ${diffs} differences over ${got.shots.reduce((n, s) => n + s.els.length, 0)} elements`);

const sfx = resolveSfx(got);
let sd = 0;
if (sfx.length !== (bakedSfx as any).events.length) { console.log("sfx count", sfx.length, (bakedSfx as any).events.length); sd++; }
sfx.forEach((e, i) => { const b = (bakedSfx as any).events[i]; if (!b) return; for (const k of ["t", "bank", "file", "cue", "vol", "dur"] as const) if (!near((e as any)[k], b[k])) { sd++; if (sd <= 8) console.log("SFX DIFF", i, k, (e as any)[k], b[k]); } });
console.log(`resolveSfx vs sfxEvents.json: ${sd} differences over ${sfx.length} cues`);
process.exit(diffs + sd ? 1 : 0);
