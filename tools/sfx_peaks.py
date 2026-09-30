#!/usr/bin/env python3
"""
sfx3.py normalises every sample to peak 1.0 before applying its dB gain:

    x /= abs(x).max();  x *= 10 ** (-12/20);  x *= 10 ** ((GAIN[bank] + g)/20)

Remotion's <Audio volume> is a plain linear multiplier on the file as stored,
so to reproduce that balance we need each file's true peak. Decoded here with
PyAV (already in .venv-align) and baked into src/data/sfxPeaks.json.

Run with:  ../../.venv-align/bin/python tools/sfx_peaks.py
"""
import json, os, sys
import numpy as np
import av

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SFX = os.path.join(ROOT, "public", "sfx")

out = {}
for bank in sorted(os.listdir(SFX)):
    d = os.path.join(SFX, bank)
    if not os.path.isdir(d) or bank == "LICENSES":
        continue
    for fn in sorted(os.listdir(d)):
        if not fn.lower().endswith((".ogg", ".wav")):
            continue
        path = os.path.join(d, fn)
        with av.open(path) as c:
            st = c.streams.audio[0]
            peak = 0.0
            nsamp = 0
            for fr in c.decode(st):
                a = fr.to_ndarray().astype(np.float64)
                if a.size == 0:
                    continue
                if np.issubdtype(fr.to_ndarray().dtype, np.integer):
                    a = a / 32768.0
                peak = max(peak, float(np.abs(a).max()))
                nsamp += a.shape[-1]
            dur = nsamp / st.rate if st.rate else 0.0
        out[f"{bank}/{fn}"] = dict(peak=round(peak, 6), dur=round(dur, 4))
        print(f"  {bank}/{fn:26s} peak={peak:.4f} dur={dur:.3f}s")

dst = os.path.join(ROOT, "src", "data", "sfxPeaks.json")
json.dump(out, open(dst, "w"), indent=0, separators=(",", ":"))
print(f"\n{len(out)} files -> {os.path.relpath(dst, ROOT)}")
