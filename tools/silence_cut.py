#!/usr/bin/env python3
"""
Automatic silence cutting for narration.

  detect   ffmpeg silencedetect -> speech segments (JSON)
  apply    write a new audio file with the long pauses shortened, plus a
           time map so word timings can be carried across

Pauses shorter than --keep are left alone (they are the narrator's rhythm);
longer ones are shortened to --keep. Defaults: silence below -35 dB lasting
over 0.9 s is a pause; pauses are shortened to 0.6 s.

  ../.venv-align/bin/python tools/silence_cut.py in.flac --out out.flac --map cuts.json
  ../.venv-align/bin/python tools/silence_cut.py in.flac --detect-only
"""
import argparse, json, os, re, subprocess, sys

FF = os.path.expanduser("~/.local/bin/ffmpeg")


def detect(src, db, mindur):
    r = subprocess.run([FF, "-hide_banner", "-nostats", "-i", src, "-af",
                        f"silencedetect=noise={db}dB:d={mindur}", "-f", "null", "-"],
                       capture_output=True, text=True)
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", r.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
    dur = float(re.search(r"Duration: (\d+):(\d+):([\d.]+)", r.stderr).groups()[2]) + \
        60 * int(re.search(r"Duration: (\d+):(\d+)", r.stderr).group(2)) + \
        3600 * int(re.search(r"Duration: (\d+)", r.stderr).group(1))
    sil = list(zip(starts, ends + [dur] * (len(starts) - len(ends))))
    return sil, dur


def plan(sil, dur, keep):
    """Return the kept intervals [(src_start, src_end)] and the time map."""
    kept = []; cur = 0.0; removed = 0.0; tmap = []
    for a, b in sil:
        gap = b - a
        if gap <= keep:
            continue
        cut_from = a + keep / 2; cut_to = b - keep / 2
        kept.append((cur, cut_from)); tmap.append(dict(src=cut_from, removed=round(cut_to - cut_from, 3)))
        removed += cut_to - cut_from; cur = cut_to
    kept.append((cur, dur))
    return kept, tmap, removed


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("--out"); ap.add_argument("--map")
    ap.add_argument("--db", type=float, default=-35); ap.add_argument("--min", type=float, default=0.9)
    ap.add_argument("--keep", type=float, default=0.6); ap.add_argument("--detect-only", action="store_true")
    a = ap.parse_args()
    sil, dur = detect(a.src, a.db, a.min)
    kept, tmap, removed = plan(sil, dur, a.keep)
    print(f"{len(sil)} pauses over {a.min}s; {len(tmap)} shortened; {removed:.1f}s removed of {dur:.1f}s")
    if a.detect_only:
        print(json.dumps(tmap, indent=1)); sys.exit(0)
    if not a.out:
        sys.exit("--out required (or --detect-only)")
    sel = "+".join(f"between(t,{s:.3f},{e:.3f})" for s, e in kept)
    subprocess.run([FF, "-y", "-v", "error", "-i", a.src, "-af", f"aselect='{sel}',asetpts=N/SR/TB", a.out], check=True)
    print("wrote", a.out)
    if a.map:
        json.dump(dict(source=a.src, output=a.out, keep=a.keep, cuts=tmap), open(a.map, "w"), indent=1)
        print("wrote", a.map)
