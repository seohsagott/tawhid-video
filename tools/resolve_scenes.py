#!/usr/bin/env python3
"""
Resolve tawhid-kit/scenes.py into src/data/scenes.json for the Remotion port.

Faithfulness contract (CLAUDE.md §0 — this is a port, not a rewrite):

  * `locate()` is copied verbatim from tawhid-kit/engine.py, so every anchor
    phrase resolves to the same word index as the Python engine did.
  * The timeline maths (shot start -0.15s, element -0.10s, APP/FADE/END) is
    copied from render.py.
  * The animation assignment (anim / dur / dir) is copied from render2.py.
  * The transition assignment and the VFX assignment are copied from render3.py,
    *including the exact consumption order of `random.Random(11)`*, so the
    sparkle/dust parameters are bit-identical to the v3 stills.
  * `img` geometry is computed from the PNG header alone (same min-fit maths as
    engine.img_sprite), so it needs no PIL and is exact.
  * Text/card/tiles/badge geometry is NOT computed here: it depends on font
    metrics and is measured in the browser by the TS port of engine.text_sprite.
    Only the random *fractions* for card sparkles are baked, so they can be
    applied to the measured card size on the other side.

Usage:  python3 tools/resolve_scenes.py [--check]
"""
import json, math, os, random, re, difflib, struct, sys, types

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
KIT = os.environ.get("TAWHID_KIT", os.path.join(ROOT, "tools", "kit"))
EL = os.path.join(ROOT, "public", "el")

W, H = 1920, 1080
# engine.py palette
SLATE = (91, 100, 112); ROSE = (185, 121, 122); SAGE = (96, 128, 90)
MUTED = (140, 130, 122); GOLD = (185, 145, 63)
HEX = {SLATE: "#5B6470", ROSE: "#B9797A", SAGE: "#60805A",
       MUTED: "#8C827A", GOLD: "#B9913F"}

# ---------------------------------------------------------------- words / locate
WORDS = json.load(open(os.path.join(ROOT, "src", "data", "words.json")))
NORM = [re.sub(r"[^\w]", "", w[0]).lower() for w in WORDS]


def locate(phrase, start):
    """Verbatim from engine.py."""
    q = [re.sub(r"[^\w]", "", x).lower() for x in phrase.split()]
    q = [x for x in q if x]
    L = len(q)
    for i in range(start, len(NORM) - L + 1):
        if NORM[i:i + L] == q:
            return i
    best = (0, None); qs = " ".join(q)
    for i in range(start, min(len(NORM) - L + 1, start + 2500)):
        r = difflib.SequenceMatcher(None, qs, " ".join(NORM[i:i + L])).ratio()
        if r > best[0]:
            best = (r, i)
    if best[0] >= 0.8:
        return best[1]
    raise ValueError(f"anchor not found: {phrase!r} after word {start}")


def T0(i):
    return WORDS[i][1]


# ---------------------------------------------------------------- load scenes.py
def load_shots():
    """exec scenes.py against a stub `engine` module (scenes.py only needs colours)."""
    stub = types.ModuleType("engine")
    for n, v in dict(SLATE=SLATE, ROSE=ROSE, SAGE=SAGE, MUTED=MUTED, GOLD=GOLD,
                     W=W, H=H).items():
        setattr(stub, n, v)
    sys.modules["engine"] = stub
    ns = {}
    src = open(os.path.join(KIT, "scenes.py"), encoding="utf-8").read()
    exec(compile(src, "scenes.py", "exec"), ns)
    return ns["SHOTS"]


# ---------------------------------------------------------------- png size only
_png = {}


def png_size(key):
    if key not in _png:
        with open(os.path.join(EL, key + ".png"), "rb") as f:
            head = f.read(33)
        assert head[:8] == b"\x89PNG\r\n\x1a\n", key
        _png[key] = struct.unpack(">II", head[16:24])
    return _png[key]


def img_geom(key, box, rot):
    """engine.img_sprite: optional rotate(expand) then min-fit into box, then centre."""
    iw, ih = png_size(key)
    if rot % 180 != 0:                      # expand=True swaps for 90/270
        iw, ih = ih, iw
    bx, by, bw, bh = box
    s = min(bw / iw, bh / ih)
    sw = max(1, int(iw * s)); sh = max(1, int(ih * s))
    return sw, sh, bx + (bw - sw) // 2, by + (bh - sh) // 2


# ---------------------------------------------------------------- timeline (render.py)
FADE = 0.3
APP = 0.5
TR = 0.35          # render3.py overrides render2.py's 0.30
FPS12 = 12         # animation grain  (v2 §6: twelve frames per second)
FPS = 24           # export fps       (v2 §6: 1080 / 24 fps)
END = WORDS[-1][2] + 2.5

SHOTS = load_shots()
shots = []
pos = 0
for si, (anc, els) in enumerate(SHOTS):
    if si == 0:
        st = 0.0; idx = 0
    else:
        idx = locate(anc, pos); st = max(T0(idx) - 0.15, 0); pos = idx + 1
    shots.append(dict(st=st, idx=idx, els=els, anc=anc))
for i, s in enumerate(shots):
    s["en"] = shots[i + 1]["st"] if i + 1 < len(shots) else END


def rt(at, s):
    """render.py: numbers are offsets from shot start; phrases are word anchors -0.1s."""
    if isinstance(at, (int, float)):
        return s["st"] + at
    ph, off = (at, 0) if isinstance(at, str) else at
    i = locate(ph, s["idx"])
    return T0(i) - 0.1 + off


warn = []
for s in shots:
    for e in s["els"]:
        if e["k"] == "walk":
            e["kt"] = [(rt(a, s), x) for a, x in e["keys"]]
            e["t"] = e["kt"][0][0]
        else:
            e["t"] = rt(e["at"], s)
        if e["k"] == "card":
            e["th"] = rt(e["hl_at"], s)
        if e["t"] > s["en"] - 0.2:
            warn.append("late element in shot %r: %s t=%.1f end=%.1f"
                        % (s["anc"], e.get("txt", e.get("key", e["k"])), e["t"], s["en"]))

# ---------------------------------------------------------------- anims (render2.py)
SLIDE = {"worship", "scholar", "group", "childlook", "idols", "sheep", "fence", "steps",
         "villages", "cup", "town", "scale", "globe", "blocks", "tsg", "rope", "flowers", "chain"}
DROP = {"book", "quran", "pen", "layers", "amulet", "ring", "mirror", "phones", "puzzle"}


def clamp(v, a=0.0, b=1.0):
    return max(a, min(b, v))


eid = 0
for si, s in enumerate(shots):
    for e in s["els"]:
        eid += 1; e["id"] = eid; k = e["k"]
        if k == "img":
            e["anim"] = "slide" if e["key"] in SLIDE else ("drop" if e["key"] in DROP else "pop")
            cx = e["box"][0] + e["box"][2] / 2
            e["dir"] = -1 if cx < 960 else 1
            e["dur"] = 0.6
            sw, sh, x, y = img_geom(e["key"], e["box"], e["rot"])
            e["sw"], e["sh"], e["x0"], e["y0"] = sw, sh, x, y
        elif k == "txt":
            big = e["w"] == "Bold" and e["size"] >= 48
            e["anim"] = "type" if big else ("slideL" if not e["c"] else "rise")
            e["dur"] = clamp(len(e["txt"]) * 0.04, 0.45, 1.3) if big else 0.5
        elif k == "ar":
            e["anim"] = "revealR"; e["dur"] = 1.0
        elif k == "card":
            e["anim"] = "card"; e["dur"] = 0.7
        elif k in ("badge", "tiles"):
            e["anim"] = "pop"; e["dur"] = 0.45
        elif k == "walk":
            e["anim"] = "walk"; e["dur"] = 0.5
            # render.py: img_sprite('childwalk', (0, 0, 400, e['h']))
            sw, sh, _, _ = img_geom("childwalk", (0, 0, 400, e["h"]), 0)
            e["sw"], e["sh"] = sw, sh

# ---------------------------------------------------------------- vfx (render3.py)
# NOTE: the STARS / DUST lists and the rnd draw order below are copied exactly,
# so the baked values match the v3 render.
STARS = ["star_01", "star_02", "star_04", "star_06", "star_07", "spark_01"]
DUST = ["smoke_01", "smoke_03", "smoke_05", "smoke_07"]
SPARK = {"lamp", "lantern", "moon", "crown", "markyes", "heart", "globe", "quran"}
GLOWK = {"lamp", "lantern", "moon"}

rnd = random.Random(11)
for s in shots:
    for e in s["els"]:
        if e["k"] == "img":
            e["parts"] = []
            cx = e["x0"] + e["sw"] / 2
            cy = e["y0"] + e["sh"] / 2
            if e["key"] in SPARK:
                for _ in range(9):
                    e["parts"].append(dict(kind="star", t=e["t"] + 0.25, cx=cx, cy=cy,
                                           ang=rnd.uniform(0, 2 * math.pi),
                                           dist=rnd.uniform(90, 190),
                                           sprite=rnd.choice(STARS),
                                           sc=rnd.uniform(0.7, 1.1)))
            if e["anim"] == "drop":
                by = e["y0"] + e["sh"] * 0.82
                for _ in range(4):
                    e["parts"].append(dict(kind="dust", t=e["t"] + 0.36,
                                           cx=cx + rnd.uniform(-0.3, 0.3) * e["sw"],
                                           cy=by, ang=rnd.choice([-1, 1]),
                                           dist=rnd.uniform(30, 90),
                                           sprite=rnd.choice(DUST), sc=1))
            if e["key"] in GLOWK:
                e["glow"] = int(max(e["sw"], e["sh"]) * 1.5)
        if (e["k"] == "txt" and e["w"] == "Bold" and e["size"] >= 48
                and e["col"] in (ROSE, SAGE) and len(e["txt"]) < 40):
            e["stroke"] = True          # geometry derives from the measured sprite
        if e["k"] == "card":
            # list comprehension: fraction, angle, dist, sprite — per iteration
            e["parts"] = [dict(kind="star", t=e["th"] + 0.05,
                               fx=rnd.uniform(0.25, 0.75), fy=0.62,
                               ang=rnd.uniform(0, 2 * math.pi),
                               dist=rnd.uniform(60, 140),
                               sprite=rnd.choice(STARS), sc=0.8) for _ in range(7)]

# transitions — render3.py overrides render2.py
for i, s in enumerate(shots):
    s["trans"] = "fade" if any(e["k"] == "card" for e in s["els"]) \
        else ("push", "wipe", "fade")[i % 3]

# ---------------------------------------------------------------- emit
def col(c):
    return HEX.get(tuple(c), "#%02X%02X%02X" % tuple(c))


def el_out(e):
    o = dict(id=e["id"], k=e["k"], anim=e["anim"], t=round(e["t"], 4),
             dur=round(e["dur"], 4))
    k = e["k"]
    if k == "img":
        o.update(key=e["key"], box=list(e["box"]), rot=e["rot"], dir=e["dir"],
                 sw=e["sw"], sh=e["sh"], x=e["x0"], y=e["y0"])
        if "glow" in e:
            o["glow"] = e["glow"]
    elif k == "txt":
        o.update(txt=e["txt"], x=e["x"], y=e["y"], size=e["size"], col=col(e["col"]),
                 weight=e["w"], center=bool(e["c"]), maxw=e["maxw"])
        if e.get("stroke"):
            o["stroke"] = True
    elif k == "ar":
        o.update(txt=e["txt"], x=e["x"], y=e["y"], size=e["size"], col=col(e["col"]))
    elif k == "card":
        o.update(ar=e["ar"], en=e["en"], ref=e["ref"], x=e["x"], y=e["y"],
                 w=e["w"], hl=e["hl"], th=round(e["th"], 4))
    elif k == "tiles":
        o.update(labels=e["labels"], x=e["x"], y=e["y"])
    elif k == "badge":
        o.update(n=e["n"], x=e["x"], y=e["y"])
    elif k == "walk":
        o.update(y=e["y"], h=e["h"], sw=e["sw"], sh=e["sh"],
                 kt=[[round(t, 4), x] for t, x in e["kt"]])
    if e.get("parts"):
        o["parts"] = [{kk: (round(vv, 4) if isinstance(vv, float) else vv)
                       for kk, vv in p.items()} for p in e["parts"]]
    return o


out = dict(
    meta=dict(
        width=W, height=H, fps=FPS, fps12=FPS12,
        end=round(END, 4), fade=FADE, app=APP, tr=TR,
        totalWords=len(WORDS),
        note="Generated by tools/resolve_scenes.py from tawhid-kit/scenes.py. "
             "Do not hand-edit: regenerate.",
    ),
    shots=[dict(anc=s["anc"], st=round(s["st"], 4), en=round(s["en"], 4),
                trans=s["trans"], wordIdx=s["idx"],
                els=[el_out(e) for e in s["els"]]) for s in shots],
)

dst = os.path.join(ROOT, "src", "data", "scenes.json")
json.dump(out, open(dst, "w"), ensure_ascii=False, separators=(",", ":"))
print("shots %d   elements %d   end %.2fs (%s)"
      % (len(shots), eid, END, "%d:%02d" % divmod(int(END), 60)))
print("wrote", os.path.relpath(dst, ROOT), os.path.getsize(dst), "bytes")
if warn:
    print("\n-- timeline warnings (%d) --" % len(warn))
    print("\n".join(warn))
else:
    print("no timeline warnings")

if "--check" in sys.argv:
    print("\n-- first 90 seconds --")
    for i, s in enumerate(shots):
        if s["st"] < 90:
            print("  %2d  %7.2f → %7.2f  %-6s  %-34s  %d els"
                  % (i, s["st"], s["en"], s["trans"], s["anc"][:34], len(s["els"])))
