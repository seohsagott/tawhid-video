#!/usr/bin/env python3
"""
scenes.py  ->  public/projects/<id>/project.json   (CONTENT ONLY)

The project file is what a person edits in Remotion Studio's props panel and
what an agent edits by hand: texts, anchors/timings, positions, colours,
image keys. Nothing derived lives in it. Timeline resolution, entry animation,
sprite geometry, sparkle/dust draws and transitions are all recomputed at
runtime by src/engine/resolve.ts, which is a port of resolve_scenes.py and is
verified to reproduce the baked scenes.json exactly.

Anchor form: every `at` is {phrase, offset}. An empty phrase means "offset
seconds after the shot starts"; a phrase means "0.1 s before that word, plus
offset". That is engine.rt() with one shape the props panel can edit.
"""
import json, os, sys, types

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIT = os.path.join(ROOT, "tools", "kit")
SLATE = (91, 100, 112); ROSE = (185, 121, 122); SAGE = (96, 128, 90); MUTED = (140, 130, 122); GOLD = (185, 145, 63)
HEX = {SLATE: "#5B6470", ROSE: "#B9797A", SAGE: "#60805A", MUTED: "#8C827A", GOLD: "#B9913F"}

stub = types.ModuleType("engine")
for n, v in dict(SLATE=SLATE, ROSE=ROSE, SAGE=SAGE, MUTED=MUTED, GOLD=GOLD, W=1920, H=1080).items():
    setattr(stub, n, v)
sys.modules["engine"] = stub
ns = {}
exec(compile(open(os.path.join(KIT, "scenes.py"), encoding="utf-8").read(), "scenes.py", "exec"), ns)
SHOTS = ns["SHOTS"]


def at(v):
    if isinstance(v, (int, float)):
        return {"phrase": "", "offset": float(v)}
    if isinstance(v, str):
        return {"phrase": v, "offset": 0.0}
    ph, off = v
    return {"phrase": ph, "offset": float(off)}


def col(c):
    return HEX.get(tuple(c), "#%02X%02X%02X" % tuple(c))


def el(e):
    k = e["k"]
    if k == "img":
        return {"k": "img", "key": e["key"], "box": list(e["box"]), "rot": e["rot"], "at": at(e["at"])}
    if k == "txt":
        return {"k": "txt", "txt": e["txt"], "x": e["x"], "y": e["y"], "size": e["size"], "col": col(e["col"]),
                "weight": e["w"], "center": bool(e["c"]), "maxw": e["maxw"] or 0, "at": at(e["at"])}
    if k == "ar":
        return {"k": "ar", "txt": e["txt"], "x": e["x"], "y": e["y"], "size": e["size"], "col": col(e["col"]), "at": at(e["at"])}
    if k == "card":
        return {"k": "card", "ar": e["ar"], "en": e["en"], "ref": e["ref"], "x": e["x"], "y": e["y"], "w": e["w"],
                "hl": e["hl"], "hlAt": at(e["hl_at"]), "at": at(e["at"])}
    if k == "tiles":
        return {"k": "tiles", "labels": list(e["labels"]), "x": e["x"], "y": e["y"], "at": at(e["at"])}
    if k == "badge":
        return {"k": "badge", "n": e["n"], "x": e["x"], "y": e["y"], "at": at(e["at"])}
    if k == "walk":
        return {"k": "walk", "y": e["y"], "h": e["h"], "keys": [{"at": at(a), "x": x} for a, x in e["keys"]]}
    raise ValueError(k)


project = {
    "id": "tawhid-ep0",
    "title": "Kitab at-Tawhid — Episode 0 (Introduction)",
    "brand": "tawhid",
    "template": "youtube-16x9",
    "fps": 24,
    "width": 1920,
    "height": 1080,
    "audio": "audio/ep0_voice_joined.flac",
    "wordsFile": "projects/tawhid-ep0/words.json",
    "tailSeconds": 2.5,
    "shots": [{"anchor": anc, "els": [el(e) for e in els]} for anc, els in SHOTS],
}
out = os.path.join(ROOT, "public", "projects", "tawhid-ep0")
os.makedirs(out, exist_ok=True)
json.dump(project, open(os.path.join(out, "project.json"), "w"), ensure_ascii=False, indent=1)
import shutil
shutil.copy(os.path.join(ROOT, "src", "data", "words.json"), os.path.join(out, "words.json"))
n = sum(len(s["els"]) for s in project["shots"])
print(f"project.json: {len(project['shots'])} shots, {n} elements, {os.path.getsize(os.path.join(out,'project.json'))//1024} KB")
