"""Composes product-tour frames: screenshot push-in + browser chrome + caption, with crossfades."""
import json
import math
import os
import sys

from PIL import Image, ImageDraw

spec = json.load(open(sys.argv[1]))
W, H, WIN, FPS = spec["W"], spec["H"], spec["WIN"], spec["FPS"]
SCENE, XFADE = spec["SCENE"], spec["XFADE"]
scenes, shots, out = spec["scenes"], spec["shots"], spec["dir"]

VW, VH = WIN["w"], WIN["vh"]
VX, VY = WIN["x"], WIN["y"] + WIN["bar"]

chrome = Image.open(os.path.join(out, "chrome.png")).convert("RGBA")
caps = [Image.open(os.path.join(out, f"cap{k}.png")).convert("RGBA") for k in range(len(scenes))]
imgs = [Image.open(os.path.join(shots, s["shot"] + ".png")).convert("RGB") for s in scenes]

# rounded bottom corners for the viewport
vmask = Image.new("L", (VW, VH), 0)
ImageDraw.Draw(vmask).rounded_rectangle([0, -20, VW - 1, VH - 1], radius=12, fill=255)


def ease(t):  # easeInOutSine: a slow, even camera move
    return -(math.cos(math.pi * t) - 1) / 2


# Each scene holds a still screenshot and brings up a spotlight on the part of the page the
# caption describes: the rest of the page dims and an ember outline settles around the focus.
# Holding the frame still keeps the GIF small; only the spotlight's arrival changes pixels.
SX = VW / 1440


def scene_layers(k):
    base = imgs[k].resize((VW, VH), Image.LANCZOS)
    x0, y0, x1, y1 = [v * SX for v in scenes[k]["focal"]]
    x0, y0 = max(6, x0), max(6, y0)
    x1, y1 = min(VW - 6, x1), min(VH - 6, y1)
    dim = Image.blend(base, Image.new("RGB", base.size, (7, 8, 11)), 0.5)
    hole = Image.new("L", base.size, 0)
    ImageDraw.Draw(hole).rounded_rectangle([x0, y0, x1, y1], radius=10, fill=255)
    lit = dim.copy()
    lit.paste(base, (0, 0), hole)
    ring = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ImageDraw.Draw(ring).rounded_rectangle([x0, y0, x1, y1], radius=10, outline=(249, 81, 53, 255), width=2)
    return base, lit, ring


layers = [scene_layers(k) for k in range(len(scenes))]


def view(k, t):
    base, lit, ring = layers[k]
    full = scenes[k]["push"] <= 0.1  # the landing page shows whole, without a spotlight
    if full:
        return base
    a = 0.0 if t < 0.12 else min(1.0, (t - 0.12) / 0.16)
    a = round(ease(a) * 4) / 4  # quantise the fade to a few steps so frames repeat exactly
    if a <= 0:
        return base
    v = Image.blend(base, lit, a)
    r = ring.copy()
    r.putalpha(r.getchannel("A").point(lambda p: int(p * a)))
    v.paste(r, (0, 0), r)
    return v


def compose(k, t):
    frame = Image.new("RGB", (W, H), (7, 8, 11))
    frame.paste(view(k, t), (VX, VY), vmask)
    frame.paste(chrome, (0, 0), chrome)
    return frame


n_scene = int(SCENE * FPS)
n_x = int(XFADE * FPS)
idx = 0
for k in range(len(scenes)):
    for i in range(n_scene):
        t = i / (n_scene - 1)
        f = compose(k, t)
        f.paste(caps[k], (0, 0), caps[k])
        nk = (k + 1) % len(scenes)
        j = i - (n_scene - n_x)
        if j >= 0:  # crossfade into the next scene (the last one wraps to the first)
            a = (j + 1) / (n_x + 1)
            g = compose(nk, 0.0)
            g.paste(caps[nk], (0, 0), caps[nk])
            f = Image.blend(f, g, a)
        f.save(os.path.join(out, f"f{idx:04d}.png"))
        if idx == int(n_scene * 3 + n_scene * 0.6):
            f.save(os.path.join(out, "poster.png"))
        idx += 1
print(f"  composed {idx} frames")
