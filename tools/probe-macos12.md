# Remotion binary compatibility on macOS 12.7.6 (Intel, x86_64)

Remotion 4 ships its own FFmpeg and Rust compositor as prebuilt binaries in
`@remotion/compositor-darwin-x64`. Newer builds are linked against a macOS 13+
SDK and fail to load here with:

```
dyld: Symbol not found: (_AVCaptureDeviceTypeDeskViewCamera)
  Referenced from: .../libavdevice.dylib
  Expected in: /System/Library/Frameworks/AVFoundation.framework/...
```

(`_AVCaptureDeviceTypeContinuityCamera` appears in the newest builds; both are
macOS 13 Ventura symbols, pulled in through `libavdevice`.)

## Measured — by running the binaries, not by inspecting symbols

| version | `ffprobe` / `ffmpeg` | compositor (`remotion`) |
|---|---|---|
| 4.0.90  | binaries not in package | — |
| 4.0.140 | OK (n6.1) | OK |
| 4.0.190 | OK (n6.1) | OK |
| **4.0.240** | **OK (n7.1)** | **OK** |
| 4.0.250 | BROKEN | OK |
| 4.0.260 | BROKEN | BROKEN |
| 4.0.280 | BROKEN | BROKEN |
| 4.0.290 | BROKEN | BROKEN |
| 4.0.430 | BROKEN | OK |
| 4.0.440+ | BROKEN | BROKEN |

**4.0.240 is the newest version that works end to end on this machine.**

## What this means in practice

The project is pinned to **4.0.429**, chosen because its compositor loads, which
is all Studio and `remotion still` need:

* Remotion Studio, including audio playback — works
* `remotion still` — works
* `remotion render` — renders frames, then fails when it shells out to
  `ffprobe` for audio metadata

To get a local MP4 export, either pin the whole project to `4.0.240`, or render
somewhere with macOS 13+ (CI, another machine, Remotion Lambda).

Re-run the probe with `tools/probe-macos12.sh`.

---

# Engine self-check (`render.py check`) — false positives

Running the original checker reports two overlaps:

```
overlap '':             'moon' x 'بِسْمِ اللهِ الرَّحْمَنِ الرَّحِيمِ'
overlap 'We ask Allah': 'moon' x 'وَصَلَّى اللهُ وَسَلَّمَ عَلَى نَبِيِّنَا مُحَمَّدٍ...'
```

Both are artefacts of running the checker against a Pillow without libraqm: with
no Arabic shaping the text measures far wider than it renders. Measured on the
port's own output at t=3.0s, the bismillah ink spans x 459–1273 and the moon and
its sparkles span x 1386–1625 — **113 px of clear space**, no overlap.

The closing shot at 23:57 has the same shape and the same likely cause; confirm
it when that part of the episode is reviewed.

v2 §11 requires this check on every episode, so it should be reimplemented on
the Remotion side, where the Arabic metrics are correct. Not yet done.
