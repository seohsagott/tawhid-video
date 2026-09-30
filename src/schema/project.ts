/**
 * The project file schema — what a person edits in Remotion Studio's props
 * panel and what an agent edits by hand. Content only: texts, anchors and
 * offsets, positions, colours, image keys. Everything derived (timeline,
 * entry animation, geometry, sparkles, transitions, effects cues) is computed
 * at runtime by src/engine/resolve.ts.
 */
import { z } from "zod";
import { zColor, zTextarea } from "@remotion/zod-types";
import manifest from "../data/elManifest.json";

export const EL_KEYS = Object.keys(manifest).filter((k) => k !== "bg") as [string, ...string[]];

/** engine.rt(): empty phrase = seconds after the shot starts; a phrase = 0.1 s before that word, plus offset. */
export const At = z.object({
  phrase: z.string().describe("anchor phrase in the narration (empty = offset from shot start)"),
  offset: z.number().describe("seconds added to the anchor"),
});

const Img = z.object({
  k: z.literal("img"),
  key: z.enum(EL_KEYS),
  box: z.tuple([z.number(), z.number(), z.number(), z.number()]).describe("x, y, w, h — the image is fitted inside"),
  rot: z.number(),
  at: At,
});
const Txt = z.object({
  k: z.literal("txt"),
  txt: zTextarea(),
  x: z.number(),
  y: z.number(),
  size: z.number(),
  col: zColor(),
  weight: z.enum(["Medium", "SemiBold", "Bold"]),
  center: z.boolean(),
  maxw: z.number().describe("wrap width, 0 = no wrap"),
  at: At,
  strikeAt: At.optional().describe("when set, a rose line strikes the text through at this anchor"),
});
const Ar = z.object({
  k: z.literal("ar"),
  txt: zTextarea(),
  x: z.number(),
  y: z.number(),
  size: z.number(),
  col: zColor(),
  at: At,
});
const Card = z.object({
  k: z.literal("card"),
  ar: zTextarea().describe("verse, 'uthmani script"),
  en: zTextarea().describe("translation of the meaning — Dar al-Fikr wording only (v3 §3)"),
  ref: z.string().describe("surah name and surah:ayah, e.g. An-Nahl 16:36"),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  hl: z.string().describe("phrase of the translation to light up"),
  hlAt: At,
  at: At,
});
const Tiles = z.object({ k: z.literal("tiles"), labels: z.array(z.string()), x: z.number(), y: z.number(), at: At });
const Badge = z.object({ k: z.literal("badge"), n: z.string(), x: z.number(), y: z.number(), at: At });
const Walk = z.object({
  k: z.literal("walk"),
  y: z.number(),
  h: z.number(),
  keys: z.array(z.object({ at: At, x: z.number() })),
});

export const ElSchema = z.discriminatedUnion("k", [Img, Txt, Ar, Card, Tiles, Badge, Walk]);
export const ShotSchema = z.object({
  anchor: z.string().describe("phrase that starts this shot (shot 0: empty)"),
  els: z.array(ElSchema),
});

export const ProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  brand: z.string(),
  template: z.string(),
  fps: z.number(),
  width: z.number(),
  height: z.number(),
  audio: z.string().describe("path under public/"),
  wordsFile: z.string().describe("word timings, path under public/"),
  tailSeconds: z.number().describe("paper held after the last word"),
  captions: z
    .object({
      enabled: z.boolean(),
      yFrac: z.number().describe("vertical centre as a fraction of the height"),
      size: z.number(),
      color: zColor(),
      activeColor: zColor(),
    })
    .optional()
    .describe("word-by-word captions (vertical formats, v2 §7)"),
  shots: z.array(ShotSchema),
});

export type Project = z.infer<typeof ProjectSchema>;
export type ProjectEl = z.infer<typeof ElSchema>;
export type ProjectAt = z.infer<typeof At>;
