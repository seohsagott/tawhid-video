# tawhid-video

Remotion port of the `tawhid-kit` Python engine for **شرح كتاب التوحيد**
(channel: The Islamic Upbringing, @TheIslamicUpbringingEN).

The binding rules live in `CLAUDE.md` in the working folder above this repo,
which summarises `Tawhid-Series-Standards-v3.md` and
`Tawhid-Production-Standards-v2.md`. Those three files are **not committed here** —
they are internal editorial standards, and this repository is public.

**This project is a port of the engine, not a rewrite of the content.** No text,
translation, scene order or timing is changed. Any visual difference from
`render3.py`'s output is a porting bug, not a design choice.

---

## Status

Phase 1 (cloud export) and phase 2 (general studio structure) are done. The
first chapter of the introduction episode (`tawhid-ep0-first-chapter`,
0:00 → 1:03) is verified against the v3 render; the rest of the episode is
resolved from the same project file but has not been reviewed shot by shot.

## Editing a video

Every video is a **project file** — `projects/<id>/project.json` — validated by
a Zod schema (`src/schema/project.ts`). It holds content only: texts, anchor
phrases and offsets, positions, colours, image keys. Open the composition in
Studio and the whole file is in the props panel: text areas for text, a
dropdown for the image key, a colour picker for colours, a number for every
offset. Edits preview live. **Press "Save to project.json" on the canvas** to
write them to the file — Remotion's own Save button cannot, because it only
rewrites inline literals in `src/Root.tsx`. Editing the file by hand (or by an
agent) hot-reloads Studio the same way. Both directions are verified.

Everything derived — the timeline, entry animations, sprite geometry, the
sparkle and dust draws, transitions, the effects cue list — is recomputed at
runtime by `src/engine/resolve.ts` and reproduces the original Python pipeline
exactly (0 differences over 385 elements and 250 cues; sparkles bit-identical
through a CPython-compatible Mersenne Twister). Composition durations follow
the resolved timeline, so moving an anchor moves the end.

## Running

```bash
npm run dev
```

Studio opens with two compositions:

| id | what | frames |
|---|---|---|
| `tawhid-ep0` | the whole episode, duration from the timeline | 34625 @24 |
| `tawhid-ep0-first-chapter` | shots 0-5, ends on the shot boundary (1:03) | 1511 @24 |
| `tawhid-ep0-preview-540p` | the episode at half resolution — use this on a weak machine | 34625 @24 |
| `template-shorts-9x16-demo` | Shorts/Reels template with word-by-word captions | 330 @30 |

Compositions are registered per project in `src/Root.tsx` from `src/projects.ts`.

## Layout

```
brands/<id>/brand.json     identity: palette, fonts, element library, effects banks, rules
                           tawhid is complete; seoh and bymorpho are empty skeletons
templates/templates.json   youtube-16x9, shorts-9x16, square-1x1, ad-4x5 — size, fps, safe bands, export preset
projects/<id>/             -> public/projects/<id>/: project.json (content), words.json (timings), media
src/schema/project.ts      the Zod schema behind the props panel
src/engine/
  resolve.ts               project file -> resolved scenes + effects cues (runtime; port of the Python resolvers)
  locate.ts                anchor phrase -> word index (engine.locate + difflib ratio)
  pyrandom.ts              CPython-compatible random.Random (bit-identical sparkle/dust draws)
  measure.ts               text metrics matching PIL (integer glyph advances, no kerning)
  duck.ts                  effects ducking under speech, per narration
  constants.ts ease.ts fonts.ts types.ts
src/components/
  Element.tsx Sprites.tsx  entry animations, typing, verse card + highlight, tiles, badge, walk
  Vfx.tsx                  sparkle, dust, glow, highlighter stroke
  Shot.tsx                 camera push-in, push / wipe / fade transitions
  Sfx.tsx                  the effects bed (Kenney CC0 only, ducked)
  WordCaptions.tsx         word-by-word captions for vertical formats
  StudioSave.tsx           the "Save to project.json" overlay (Studio only)
  FontGate.tsx
src/Episode.tsx            episode / first-chapter / half-res preview
src/ShortsDemo.tsx         the 9:16 template demo
src/projects.ts            project registry (JSON + words imports)
tools/
  transcribe.py            faster-whisper word timings; --script snaps them onto the approved text
  silence_cut.py           shorten long pauses (ffmpeg silencedetect) with a time map
  export.sh                dispatch the cloud export with a template's preset
  encode_audio.py          WAV -> verified-lossless FLAC for the repo
  export_project.py        scenes.py -> project.json (one-time migration of the intro episode)
  tests/                   parity tests against the baked Python output
  kit/                     the original tawhid-kit engine, for reference
```

Installed official packages: `@remotion/transitions`, `lottie`, `motion-blur`,
`noise`, `shapes`, `paths`, `zod-types` (all 4.0.429), plus `lottie-web`.

### Tools

```bash
# word timings for a new episode, spelled as the approved script
../.venv-align/bin/python tools/transcribe.py narration.flac projects/<id>/words.json --script script.txt --model small

# shorten pauses longer than 0.9 s to 0.6 s, keeping a time map
../.venv-align/bin/python tools/silence_cut.py narration.flac --out narration_cut.flac --map cuts.json

# cloud export with a platform preset
tools/export.sh tawhid-ep0-first-chapter youtube-16x9
tools/export.sh tawhid-ep0 youtube-16x9 range 14400 14640 splice <base run id>
```

Run the parity tests after touching the engine:

```bash
npx tsc -p tools/tests/tsconfig.json && node /tmp/tawhid-tests/tools/tests/test_primitives.js && node /tmp/tawhid-tests/tools/tests/test_resolve.js
```

## Fixed constraints, all brands

* **No music.** Sound effects only, and only Kenney CC0.
* Every asset free for commercial use (fonts: SIL OFL; effects and particles: CC0).
* Preview locally at reduced resolution; final export in the cloud.

## Faithfulness notes

* **Timebase.** Export is 24 fps (v2 §6) but animation is stepped on twos, so the
  time handed to every ported function is `floor(frame/2)/12` — exactly the `t`
  that `render3.frame3(n)` used. The 12 fps grain and the per-element jitter are
  the stop-motion character the standards ask for.
* **Anchors.** `tools/resolve_scenes.py` copies `engine.locate()` verbatim, so
  every anchor phrase resolves to the same word index as the Python engine.
  All 77 shots and 385 elements resolve with no timeline warnings.
* **Randomness.** `render3.py` draws sparkle and dust parameters from
  `random.Random(11)` in a fixed order. Those draws are baked into
  `scenes.json` by the resolver rather than reimplemented, so they are identical.
  The same is done for `sfx3.py`'s `random.Random(5)` file picks.
* **Text metrics.** PIL quantises each glyph advance to a whole pixel and sums
  them; Chrome reports fractional advances. Each measured advance is therefore
  rounded, and kerning is disabled on the measuring context, which reproduces
  PIL's numbers and keeps line wrapping identical.
* **Particles.** `render3.psprite()` sets `alpha = alpha * max(r,g,b) / 255`.
  The Kenney particle PNGs are dark greyscale, so a CSS alpha mask would be
  about three times too opaque; the tinted sprites are pre-baked instead.

### Deliberate deviations, and why

1. **Synthesised effects dropped.** `sfx3.py` still synthesised `water`, `wind`
   and `flutter` with numpy for the cup, wind and bird elements. v2 §10 rejects
   programmatically synthesised effects and v2 §6 limits effects to the five
   Kenney CC0 packs, which contain no such sounds. Remapped to the nearest
   non-tonal Kenney sample: cup → `soft`, wind → `cloth`, bird → `cloth`.
   `sfx.py` (the fully synthesised bank) is not used at all.
2. **Tonal samples excluded.** v2 §3 forbids bells, chimes and tones. The
   `switch` bank is Kenney UI-Audio's mechanical relay switches only, not the
   tonal Interface `switch_00x` blips, and `sfx3.py`'s arbitrary `[:12]`
   truncation is dropped. Event times, gains and mapping are unchanged; only
   which file of a bank plays can differ.
3. **Ducking added.** v2 §6 requires the effects bed to drop under the narration
   and return in the pauses. `sfx3.py` never implemented this. It is built in
   `src/engine/duck.ts` from the word-level alignment: −6 dB while speaking,
   80 ms attack, 250 ms release, gaps under 120 ms treated as within a sentence.
   The depth and timings are production choices, not ported values.
4. **Highlighter wobble.** The stroke's ±2 px per-column wobble comes from
   CPython's Mersenne Twister in `render3.marker()`. Reproducing that in the
   browser buys nothing visible, so the same ±2 px wobble is generated from a
   deterministic integer hash, sampled every 2 px. Band geometry, the two
   alpha levels and the 0.35 s wipe are unchanged.
5. **Arabic shaping is now correct.** The reference stills in
   `tools/ref-stills/` were produced by a Pillow without libraqm, so Arabic in
   them is unshaped. The browser shapes it properly via HarfBuzz — the port is
   right and the reference is the one that is wrong, on that point only.

## Environment

* Node 22.11, Remotion **pinned to 4.0.429**.
* Python for the resolvers: system `python3` (3.9). The alignment venv for
  future episodes is `../.venv-align` (faster-whisper 1.0.3, ctranslate2 4.8.2,
  av 12.3.0, plus Pillow/numpy/scipy for reference renders).

### Known limitation on this machine

This Mac runs **macOS 12.7.6 (Intel)**. Remotion's bundled FFmpeg binaries from
4.0.440 onward need a macOS 13 AVFoundation symbol, which is why the project is
pinned to 4.0.429 — but 4.0.429's `ffprobe`/`ffmpeg` still need macOS 13 too.
Consequences:

* Remotion **Studio works fully**, including audio playback. ✅
* `remotion still` works. ✅
* `remotion render` **renders frames but fails when muxing audio**. ❌

So the episode cannot be exported to MP4 on this machine as it stands. Options,
in order of least disruption:

1. Render on a machine with macOS 13+, or in CI / Remotion Lambda.
2. Downgrade further — `ffprobe` from 4.0.140 and 4.0.190 does run here; see
   `tools/probe-macos12.md` for the measured boundary.
3. Upgrade macOS.

## Cloud export

This machine cannot mux audio locally (see below), so MP4s are produced by
GitHub Actions: **Actions → Render → Run workflow**.

| input | meaning |
|---|---|
| `composition` | id from `src/Root.tsx`, e.g. `Minute1` |
| `mode` | `full` or `range` |
| `start_frame` / `end_frame` | range mode, inclusive |
| `splice` | splice the range into an earlier full render |
| `base_run_id` | the Render run holding that full MP4 |
| `crf` | 18 is visually lossless, 23 is the usual default |
| `image_format` | `png` (default) or `jpeg` frame capture before encoding — see below |
| `remotion_version` | `latest` by default — CI has no macOS limit |

The result is a downloadable artifact on the run page.

**Frame capture: PNG by default.** Measured on the first chapter at CRF 18
against lossless local stills: PNG capture was cleaner on every text region
(e.g. card English 3.07 vs 3.40 mean error, Arabic 2.69 vs 3.08) and JPEG
marginally cleaner on plain paper (1.36 vs 1.64) — a few percent either way,
invisible at 3× zoom, because the h264 encode dominates both. PNG costs about
40% more render time (199 s vs 141 s for the chapter). Typography is what this
style lives on, so PNG is the default; pick `jpeg` for quick checks.

**Why a small fix does not cost a whole re-export.** Every render is re-encoded
once with a keyframe every second. A `range` render with `splice=true` snaps the
requested frames outward to those second boundaries, renders only that stretch,
and joins head + new range + tail with `-c copy` — no re-encoding of the parts
that did not change, and no generation loss. Fixing one shot at 12:30 costs
about a second of render, not twenty-four minutes.

## Audio

The narration is committed as **FLAC**, not WAV. GitHub rejects files over
100 MB and the joined WAV is 132 MB. FLAC is lossless — `tools/encode_audio.py`
verifies the decoded samples are bit-identical and refuses to proceed otherwise —
and lands at 50.7 MB. The master WAV stays local and is gitignored.

## Licensing

Sound effects and particle sprites are Kenney CC0 (public domain); the five
upstream licence files are kept in `public/sfx/LICENSES/`.
