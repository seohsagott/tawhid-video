#!/usr/bin/env python3
"""
Convert a narration WAV to FLAC for the repository.

GitHub rejects any file over 100 MB, and the joined intro narration is a 132 MB
mono 48 kHz WAV. FLAC is lossless -- verified bit-identical, sample for sample --
and lands at about 37% of the size, so the repo carries no quality loss and no
Git LFS quota. Chrome plays FLAC natively, so Studio is unaffected, and the
renderer's FFmpeg reads it directly.

Usage:  ../.venv-align/bin/python tools/encode_audio.py <in.wav> <out.flac>
"""
import os, sys
import numpy as np
import av


def decode(path):
    out, rate = [], None
    with av.open(path) as c:
        st = c.streams.audio[0]
        rate = st.rate
        for fr in c.decode(st):
            out.append(fr.to_ndarray().reshape(-1))
    return np.concatenate(out), rate


def encode_flac(src, dst):
    with av.open(src) as i:
        ist = i.streams.audio[0]
        with av.open(dst, "w") as o:
            ost = o.add_stream("flac", rate=ist.rate)
            ost.layout = "mono" if ist.layout.name == "mono" else ist.layout.name
            for fr in i.decode(ist):
                fr.pts = None
                for p in ost.encode(fr):
                    o.mux(p)
            for p in ost.encode():
                o.mux(p)


if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]
    encode_flac(src, dst)
    a, ra = decode(src)
    b, rb = decode(dst)
    n = min(len(a), len(b))
    diff = int(np.abs(a[:n].astype(np.int64) - b[:n].astype(np.int64)).max())
    same_len = len(a) == len(b)
    print(f"  {src}: {os.path.getsize(src)/1e6:.1f} MB, {len(a)/ra:.3f}s")
    print(f"  {dst}: {os.path.getsize(dst)/1e6:.1f} MB, {len(b)/rb:.3f}s")
    print(f"  max sample difference: {diff}  |  same length: {same_len}")
    if diff != 0 or not same_len:
        sys.exit("FLAC is not bit-identical -- refusing to use it")
    print("  verified lossless")
