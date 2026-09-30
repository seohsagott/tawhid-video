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

Built and verified: **the first chapter of the introduction episode, 0:00 → 1:03**
(`Minute1`), matching the v3 render. The rest of the episode is wired up
(`Episode0-Full`) but has not been reviewed.

## Running

```bash
npm run dev
```

Studio opens with two compositions:

| id | range | frames @24fps |
|---|---|---|
| `Minute1` | 0:00 → 1:03 (shots 0-5) | 1510 |
| `Episode0-Full` | 0:00 → 24:02 | 34625 |

`Minute1` stops at the shot boundary rather than a flat sixty seconds, so it ends
on a complete idea — chapter 1 of `chapters.txt`, "Why did Allah create us?".

## How the port is laid out

```
tools/                     build-time resolvers (Python, run once per content change)
  kit/                     the original tawhid-kit engine, kept for reference
  resolve_scenes.py        scenes.py  -> src/data/scenes.json
  resolve_sfx.py           sfx3.py    -> src/data/sfxEvents.json
  sfx_peaks.py             per-file peak levels for sfx3's normalisation
  bake_particles.py        render3.psprite() -> public/particles/baked/
src/engine/
  constants.ts             palette, fps, fonts, engine.isar
  ease.ts                  render2.py eo / back / bounce / jit
  measure.ts               engine.text_sprite + ar_sprite metrics
  fonts.ts                 font faces (Montserrat variable + Amiri + Amiri Quran)
  duck.ts                  speech-aware ducking built from words.json
  types.ts                 shape of scenes.json
src/components/
  Sprites.tsx              text / arabic / card / tiles / badge / img sprites
  Vfx.tsx                  sparkle, dust, glow, highlighter stroke
  Element.tsx              render2.draw_el + render3's effect passes
  Shot.tsx                 camera push-in, the three transitions, frame assembly
  Sfx.tsx                  the effects bed
  FontGate.tsx             blocks render until fonts are measurable
src/Episode.tsx            timebase + audio
src/Root.tsx               compositions
```

Regenerate the data after changing `tools/kit/scenes.py`:

```bash
npm run data
```

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
| `remotion_version` | `latest` by default — CI has no macOS limit |

The result is a downloadable artifact on the run page.

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
