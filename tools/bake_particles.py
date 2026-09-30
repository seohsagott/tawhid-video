#!/usr/bin/env python3
"""
Pre-bake the tinted particle sprites exactly as render3.psprite() does.

    al = alpha * (max(r,g,b) / 255) * strength
    rgb = flat tint

The Kenney particle PNGs are dark greyscale (mean RGB ~85), so the max(rgb)
term is not negligible: masking by alpha alone would be roughly three times too
opaque. Baking keeps the browser side a plain <img> draw and bit-exact.

Run with:  ../../.venv-align/bin/python tools/bake_particles.py
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "public", "particles")
DST = os.path.join(SRC, "baked")
os.makedirs(DST, exist_ok=True)

GOLD = (233, 196, 106)          # render3.py GOLD
DUSTC = (150, 132, 110)         # render3.py reassigns DUSTC right before DUST


def psprite(name, size, tint, strength=1.0):
    a = np.asarray(Image.open(os.path.join(SRC, name + ".png")).convert("RGBA")
                   .resize((size, size), Image.LANCZOS)).astype(np.float32)
    al = a[..., 3] * (a[..., :3].max(2) / 255) * strength
    out = np.zeros(a.shape, np.uint8)
    out[..., :3] = tint
    out[..., 3] = np.clip(al, 0, 255)
    return Image.fromarray(out, "RGBA")


jobs = [(n, 56, GOLD) for n in ("star_01", "star_02", "star_04", "star_06", "star_07")]
jobs += [("spark_01", 44, GOLD)]
jobs += [(n, 240, DUSTC) for n in ("smoke_01", "smoke_03", "smoke_05", "smoke_07")]

for name, size, tint in jobs:
    im = psprite(name, size, tint)
    im.save(os.path.join(DST, f"{name}.png"))
    print(f"  {name:10s} {size}px tint={tint}  peak alpha={np.asarray(im)[...,3].max()}")

print(f"\n{len(jobs)} sprites -> public/particles/baked/")
