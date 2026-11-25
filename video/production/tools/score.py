"""Original score and sound design for the Skylark film, synthesised from scratch (no samples).

Every musical section and sound effect is placed from src/data/timeline.json, the same clock the
visuals use, so hits land on the frame where the animation happens.

Writes 48 kHz stereo stems to production/audio/:
  music.wav  sfx.wav  ambience.wav   (un-ducked, un-mastered)
Run mix.py afterwards to duck, sum with narration.wav and master.
"""
import json, pathlib, subprocess
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

ROOT = pathlib.Path(__file__).resolve().parents[2]
SR = 48000
TL = json.load(open(ROOT / "src/data/timeline.json"))
T = TL["total"]
N = int(T * SR) + SR
R = np.random.default_rng(1234)

lines = {l["id"]: l for l in TL["lines"]}
def L0(i): return lines[i]["start"]
def L1(i): return lines[i]["end"]
def norm(s): return "".join(c for c in s.lower() if c.isalnum())
def W(i, w, nth=0):
    ws = [x for x in lines[i]["words"] if norm(x["w"]) == norm(w)]
    return (ws[nth] if nth < len(ws) else ws[-1])["t"] if ws else lines[i]["start"]

def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def lp(x, f, o=2): return sosfilt(butter(o, f, "low", fs=SR, output="sos"), x, axis=0)
def hp(x, f, o=2): return sosfilt(butter(o, f, "high", fs=SR, output="sos"), x, axis=0)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], "band", fs=SR, output="sos"), x, axis=0)

def env_adsr(n, a, d, s, r, sustain_len=None):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    hold = max(0, n - a - d - r) if sustain_len is None else int(sustain_len * SR)
    e = np.concatenate([np.linspace(0, 1, max(a, 1)), np.linspace(1, s, max(d, 1)), np.full(hold, s), np.linspace(s, 0, max(r, 1))])
    return np.pad(e, (0, max(0, n - len(e))))[:n]

def place(buf, x, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= len(buf) or i + len(x) <= 0: return
    if x.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        x = np.stack([x * l * 1.414, x * r * 1.414], 1)
    if i < 0: x = x[-i:]; i = 0
    n = min(len(x), len(buf) - i)
    buf[i:i + n] += x[:n] * gain

def ir(seconds=3.2, damp=5000, seed=3):
    rg = np.random.default_rng(seed)
    n = int(seconds * SR); t = np.arange(n) / SR
    e = np.exp(-t * 6.9 / seconds)
    x = rg.standard_normal((n, 2)) * e[:, None]
    x = lp(x, damp, 1)
    x[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))[:, None]
    return x / np.sqrt((x ** 2).sum(0))

def reverb(x, wet=0.3, seconds=3.2, damp=5000):
    h = ir(seconds, damp)
    y = np.stack([fftconvolve(x[:, 0], h[:, 0])[: len(x)], fftconvolve(x[:, 1], h[:, 1])[: len(x)]], 1)
    return x * (1 - wet) + y * wet * 1.6

# ------------------------------------------------------------------ instruments
def saw(f, n, ph=0.0):
    return 2 * ((np.arange(n) * f / SR + ph) % 1.0) - 1

def pad_note(m, dur, bright=1800, a=1.2, r=1.8, amp=0.12):
    n = int((dur + r) * SR); f = mtof(m)
    x = np.zeros((n, 2))
    for k, det in enumerate([-0.11, 0.0, 0.09]):
        ff = f * 2 ** (det / 12)
        s = saw(ff, n, R.random())
        x[:, k % 2] += s; x[:, (k + 1) % 2] += s * 0.6
    x = lp(x, bright, 2)
    x *= env_adsr(n, a, 0.6, 0.85, r, sustain_len=max(0, dur - a - 0.6))[:, None]
    return x * amp

def bell(m, dur=3.5, amp=0.08, ratio=3.5, idx=2.2):
    n = int(dur * SR); t = np.arange(n) / SR; f = mtof(m)
    e = np.exp(-t * 2.2)
    x = np.sin(2 * np.pi * f * t + idx * np.exp(-t * 4) * np.sin(2 * np.pi * f * ratio * t)) * e
    x[: 96] *= np.linspace(0, 1, 96)
    return x * amp

def pluck(m, dur=0.6, amp=0.07, cutoff=2600):
    n = int(dur * SR); t = np.arange(n) / SR; f = mtof(m)
    x = np.sin(2 * np.pi * f * t + 1.2 * np.exp(-t * 18) * np.sin(2 * np.pi * f * t)) * np.exp(-t * 7)
    x += 0.3 * saw(f, n) * np.exp(-t * 14)
    x = lp(x, cutoff, 2); x[:48] *= np.linspace(0, 1, 48)
    return x * amp

def kick(amp=0.5, dec=0.38):
    n = int(0.6 * SR); t = np.arange(n) / SR
    f = 44 + 80 * np.exp(-t * 28)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / dec * 3)
    x += 0.15 * lp(R.standard_normal(n), 900) * np.exp(-t * 80)
    return np.tanh(x * 1.4) * amp

def hat(amp=0.05, dec=0.04):
    n = int(0.12 * SR); t = np.arange(n) / SR
    return hp(R.standard_normal(n), 7500) * np.exp(-t / dec) * amp

def sub(m, dur, amp=0.16):
    n = int(dur * SR); t = np.arange(n) / SR; f = mtof(m)
    x = np.tanh(1.3 * np.sin(2 * np.pi * f * t)) * env_adsr(n, 0.02, 0.15, 0.8, 0.25)
    return lp(x, 220) * amp

# ------------------------------------------------------------------ sound effects
def whoosh(dur=0.9, amp=0.12, lo=300, hi=5000, up=True):
    n = int(dur * SR); t = np.linspace(0, 1, n)
    x = R.standard_normal(n)
    out = np.zeros(n); seg = 1024
    for s in range(0, n, seg):
        k = t[s] if up else 1 - t[s]
        fc = lo * (hi / lo) ** (np.sin(np.pi * k * 0.5) if up else k)
        out[s:s + seg] = bp(x[s:s + seg], max(40, fc * 0.6), min(20000, fc * 1.4), 1)
    e = np.sin(np.pi * t) ** 1.6
    pan = np.linspace(-0.6, 0.6, n)
    st = np.stack([out * e * np.cos((pan + 1) * np.pi / 4), out * e * np.sin((pan + 1) * np.pi / 4)], 1) * 1.4
    return st * amp

def riser(dur=2.0, amp=0.1):
    n = int(dur * SR); t = np.linspace(0, 1, n)
    x = R.standard_normal(n); out = np.zeros(n); seg = 1024
    for s in range(0, n, seg):
        fc = 400 * (9000 / 400) ** (t[s] ** 2)
        out[s:s + seg] = bp(x[s:s + seg], fc * 0.7, min(20000, fc * 1.3), 1)
    tone = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (t * 2)) / SR) * 0.25
    e = t ** 2.2
    return (out + tone) * e * amp

def impact(amp=0.5, low=48, tail=1.6):
    n = int(tail * SR); t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(low + 40 * np.exp(-t * 20)) / SR) * np.exp(-t * 2.4)
    burst = lp(R.standard_normal(n), 2500) * np.exp(-t * 14) * 0.5
    return np.tanh((boom + burst) * 1.2) * amp

def click(amp=0.08, f=2400):
    n = int(0.03 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 300) + hp(R.standard_normal(n), 3000) * np.exp(-t * 600) * 0.4
    return x * amp

def blip(amp=0.05, f=1600, dur=0.09):
    n = int(dur * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 40) * amp

def thunk(amp=0.14, f=110):
    n = int(0.25 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 22) + lp(R.standard_normal(n), 1800) * np.exp(-t * 60) * 0.5
    return x * amp

def chime(amp=0.06, m=86):
    return bell(m, 1.8, amp, ratio=2.0, idx=1.2)

def crackle(dur=1.6, amp=0.05):
    n = int(dur * SR); x = np.zeros(n)
    for _ in range(int(dur * 70)):
        i = R.integers(0, n - 200); x[i:i + 60] += hp(R.standard_normal(60), 2000) * R.random()
    return x * np.sin(np.linspace(0, np.pi, n)) * amp

def glitch(amp=0.06, dur=0.35):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.sign(np.sin(2 * np.pi * 180 * t)) * (R.random(n) > 0.4) * np.exp(-t * 8)
    return lp(x, 3000) * amp

def printer(dur=1.2, amp=0.05):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.zeros(n)
    for k in range(int(dur * 28)):
        i = int(k / 28 * SR); x[i:i + 300] += np.sin(2 * np.pi * 900 * np.arange(300) / SR) * np.exp(-np.arange(300) / 60)
    return lp(x + 0.05 * R.standard_normal(n), 4000) * amp

# ------------------------------------------------------------------ music
BPM = 112
BEAT = 60 / BPM
BAR = BEAT * 4
music = np.zeros((N, 2))
drums = np.zeros((N, 2))
bells = np.zeros((N, 2))

sc = {k: (v["start"], v["end"]) for k, v in TL["scenes"].items()}
reveal0 = L1(8) - 0.15
impact_t = reveal0 + 1.75
close_logo = L1(36) + 0.15
close_hit = close_logo + 1.75 / 1.25

D = 50  # D3
chords = {
    "dark": [[D - 12, D, D + 3, D + 7, D + 14], [D - 16, D - 4, D + 2, D + 5, D + 12], [D - 19, D - 7, D + 3, D + 5, D + 10], [D - 17, D - 5, D + 2, D + 7, D + 11]],  # Dm9 Bb Gm A
    "lift": [[D - 9, D + 3, D + 7, D + 12, D + 16], [D - 14, D + 2, D + 5, D + 10, D + 14], [D - 12, D, D + 5, D + 9, D + 12], [D - 16, D + 2, D + 5, D + 9, D + 14]],  # F C Dm Bb
    "drive": [[D - 12, D + 3, D + 7, D + 12, D + 14], [D - 16, D + 2, D + 5, D + 9, D + 12], [D - 9, D + 3, D + 7, D + 10, D + 16], [D - 14, D + 2, D + 7, D + 9, D + 14]],  # Dm9 Bbmaj7 Fmaj7 C6
}

def pads(t0, t1, prog, bars_per=1, bright=1800, amp=0.1):
    t = t0; k = 0
    while t < t1:
        ch = chords[prog][k % 4]; dur = min(BAR * bars_per, t1 - t) + 0.3
        for m in ch: place(music, pad_note(m, dur, bright, a=0.9, r=1.6, amp=amp / len(ch) * 2.2), t)
        t += BAR * bars_per; k += 1

def bass(t0, t1, prog, bars_per=1, pattern=(0, 1.5, 2.5), amp=0.18):
    t = t0; k = 0
    while t < t1 - 0.1:
        root = chords[prog][k % 4][0]
        for b in pattern:
            tt = t + b * BEAT
            if tt < t1: place(music, sub(root, BEAT * 0.9, amp), tt)
        t += BAR * bars_per; k += 1

def arp(t0, t1, prog, div=2, amp=0.05, cutoff=2600, bars_per=1, oct=12):
    step = BEAT / div; t = t0; i = 0
    while t < t1:
        bar_i = int((t - t0) / (BAR * bars_per))
        ch = chords[prog][bar_i % 4]
        seq = [ch[1] + oct, ch[2] + oct, ch[3] + oct, ch[4] + oct, ch[3] + oct, ch[2] + oct]
        place(music, pluck(seq[i % len(seq)], 0.5, amp, cutoff), t, pan=0.35 * np.sin(i * 0.7))
        t += step; i += 1

def beat(t0, t1, kick_on=(0, 2), hats=True, amp=1.0, hat_div=2):
    t = t0
    while t < t1:
        for b in kick_on:
            if t + b * BEAT < t1: place(drums, kick(0.42 * amp), t + b * BEAT)
        if hats:
            for h in range(4 * hat_div):
                tt = t + h * BEAT / hat_div
                if tt < t1: place(drums, hat(0.035 * amp * (1.3 if h % 2 else 0.8)), tt, pan=0.25)
        t += BAR

def grid(t):  # snap to the next beat on the global grid
    return np.ceil(t / BEAT) * BEAT

# Cold open: no music, only a sub drone under the slams (the hits live in the SFX layer).
cut_t = L0(1) - 0.45           # white-out into the hook (Cold.tsx)
hook0 = L0(1) - 0.35
place(music, sub(D - 24, cut_t - 0.3, 0.10), 0.3)
# Hook: a low drone, air and distant bells.
pads(hook0, sc["problem"][0] + 0.5, "dark", bars_per=2, bright=700, amp=0.11)
for k, m in enumerate([74, 81, 77, 86]):
    place(bells, bell(m, 4.0, 0.05), hook0 + 0.4 + k * 2.6, pan=-0.4 + k * 0.25)
# Problem: restrained half-time pulse, tension builds to the line "information problem".
p0 = grid(sc["problem"][0] - 0.6)
p_end = L1(7) + 0.2
pads(p0, p_end, "dark", bars_per=1, bright=1100, amp=0.1)
bass(grid(W(4, "volume")), p_end - 0.2, "dark", pattern=(0, 2), amp=0.14)
beat(grid(W(3, "Search")), L1(6), kick_on=(0,), hats=True, amp=0.7)
arp(grid(W(5, "listing")), L1(6), "dark", div=2, amp=0.03, cutoff=1500)
# (silence before the reveal; the riser is in the SFX layer)
# Reveal: lift into major after the logo lands.
pads(impact_t - 0.1, sc["product"][0] + 1.0, "lift", bars_per=1, bright=2200, amp=0.12)
for k, m in enumerate([81, 86, 88, 93]):
    place(bells, bell(m, 4.0, 0.045), impact_t + 0.05 + k * 0.11, pan=-0.5 + k * 0.33)
bass(grid(L0(9)), sc["product"][0] - 0.3, "lift", pattern=(0,), amp=0.12)
# Product: clean modern groove.
g0 = grid(sc["product"][0] - 0.4)
g1 = sc["pipeline"][0] - 0.6
pads(g0, g1 + 0.6, "drive", bars_per=1, bright=2000, amp=0.085)
bass(g0, g1, "drive", amp=0.16)
beat(g0, g1, kick_on=(0, 2), amp=0.85)
arp(g0, g1, "drive", div=2, amp=0.04, cutoff=3000)
# Technical: precise 16th arpeggios, lighter kick, darker harmony.
h0 = grid(sc["pipeline"][0] - 0.5)
h1 = sc["results"][0] - 0.6
cap_t = W(24, "capped")
pads(h0, h1 + 0.6, "dark", bars_per=2, bright=1500, amp=0.08)
bass(h0, h1, "dark", bars_per=2, pattern=(0, 3, 4, 7), amp=0.13)
beat(h0, cap_t - 0.6, kick_on=(0,), amp=0.6, hat_div=4)
beat(grid(cap_t + 1.5), h1, kick_on=(0,), amp=0.6, hat_div=4)
arp(h0, h1, "dark", div=4, amp=0.028, cutoff=2200, bars_per=2)
# Results: brighter build.
r0 = grid(sc["results"][0] - 0.5)
r1 = sc["close"][0] - 0.7
pads(r0, r1 + 0.8, "lift", bars_per=1, bright=2600, amp=0.1)
bass(r0, r1, "lift", amp=0.16)
beat(r0, r1, kick_on=(0, 2), amp=0.9)
arp(r0, r1, "lift", div=2, amp=0.04, cutoff=3400)
# Close: drums out, pads and bells; resolve on the logo.
c0 = sc["close"][0] - 0.7
pads(c0, close_hit, "lift", bars_per=1, bright=1600, amp=0.09)
for k, w in enumerate(["Fewer", "Better", "person"]):
    place(bells, bell([77, 81, 84][k], 3.5, 0.05), W(36, w), pan=[-0.3, 0.3, 0][k])
final = [D - 14, D - 2, D + 5, D + 9, D + 12, D + 16]
for m in final: place(music, pad_note(m, T - close_hit, 2400, a=0.4, r=3.0, amp=0.05), close_hit)
for k, m in enumerate([86, 89, 93, 98]):
    place(bells, bell(m, 5.0, 0.04), close_hit + k * 0.13, pan=-0.45 + k * 0.3)

music = reverb(music, 0.32, 3.5, 4500) + reverb(bells, 0.55, 4.5, 6000) + reverb(drums, 0.12, 1.2, 7000)

# gentle overall fades
fade = np.ones(N); fi = int(0.3 * SR); fade[:fi] = np.linspace(0, 1, fi) ** 2
fo0 = int((T - 3.5) * SR); fade[fo0:] = np.linspace(1, 0, N - fo0) ** 1.5
music *= fade[:, None]
# restraint: duck the bed hard just before the reveal and the closing logo
# pattern interrupts (Interrupts.tsx): the bed drops out while the card holds the frame
INTER = [(L0(17) - 0.12, L1(17) + 0.28), (W(24, "rule") - 0.08, W(24, "everything") + 0.22),
         (L0(29) - 0.08, W(29, "tested") + 0.3), (L0(32) - 0.1, W(32, "at") + 0.05)]
for t0, t1 in [(L1(7) + 0.3, reveal0 + 1.6)] + [(a, b) for a, b in INTER]:
    g = np.ones(N); a, b = int(t0 * SR), int(t1 * SR)
    g[a:b] = 0.12; g = lp(g, 3, 1)
    music *= g[:, None]

# ------------------------------------------------------------------ sound effects
sfx = np.zeros((N, 2))
def S(x, t, g=1.0, pan=0.0): place(sfx, x, t, g, pan)

# Cold open: every word is a hit
for k, w in enumerate(lines[101]["words"]):
    S(kick(0.55, 0.3), w["t"]); S(impact(0.10 + 0.04 * k, 52, 0.5), w["t"])
S(impact(0.35, 40, 1.8), W(101, "yours"))
S(glitch(0.09, 0.3), L0(102) - 0.03)
for w in lines[102]["words"]: S(kick(0.45, 0.25), w["t"])
S(whoosh(0.5, 0.08, 3000, 9000), L1(102) - 0.05)        # the strike-through
S(glitch(0.09, 0.3), L0(103) - 0.03)
S(impact(0.6, 36, 2.2), W(103, "visa")); S(thunk(0.3, 70), W(103, "visa")); S(crackle(1.2, 0.06), W(103, "visa") + 0.05)
S(riser(cut_t - W(103, "nobody"), 0.12), W(103, "nobody"))
S(whoosh(0.5, 0.14, 300, 12000), cut_t - 0.25)
S(impact(0.45, 45, 1.6), hook0)
# Hook
S(whoosh(1.6, 0.07, 200, 2400), W(1, "sending") - 0.3)
for k in range(10): S(blip(0.012, 1400 + k * 120, 0.05), W(1, "sending") + k * 0.3, pan=-0.3 + k * 0.06)
S(click(0.06, 1800), W(1, "Berlin") + 0.4)
S(impact(0.22, 40, 2.0), W(2, "never"))
S(crackle(1.0, 0.04), W(2, "never") + 0.15)
# Problem
for k in range(10): S(click(0.025, 3200), W(3, "Search") + k * 0.07)
S(click(0.09), W(3, "click")); S(click(0.1, 2000), W(3, "apply"))
for k in range(6): S(whoosh(0.35, 0.05, 800, 6000), W(3, "repeat") + k * 0.18, pan=0.4)
S(whoosh(1.5, 0.1, 150, 1500, up=False), W(4, "volume") - 0.4)
S(thunk(0.14, 90), W(5, "permit")); S(thunk(0.14, 80), W(5, "sponsor"))
for k in range(8): S(blip(0.03, 1800 + k * 90, 0.06), W(5, "score") + k * 0.05, pan=-0.5 + k * 0.13)
for k in range(5): S(whoosh(0.6, 0.05, 600, 7000), W(6, "everywhere") + k * 0.22, pan=0.5)
S(crackle(2.2, 0.06), W(6, "burn") - 0.2)
S(whoosh(0.4, 0.06, 1500, 8000), W(7, "skills") + 0.3)
S(impact(0.12, 55, 1.2), W(7, "information"))
# Reveal
S(riser(2.6, 0.09), reveal0 - 0.9)
for k in range(3): S(thunk(0.09, 160 + 30 * k), reveal0 + 1.0 + k * 0.16, pan=-0.3 + 0.3 * k)
S(impact(0.42, 44, 2.6), impact_t)
S(whoosh(1.0, 0.05, 2000, 12000), impact_t + 0.05)
for w in ["actually", "explains", "human"]: S(click(0.05, 2600), W(9, w))
# Product
for i in [11, 12, 13, 14, 15, 16]: S(whoosh(0.9, 0.05, 250, 3500), L0(i) - 0.5)
for w in ["headline", "skills", "experience"]: S(blip(0.04, 1500), W(10, w))
for k, w in enumerate(["taxonomy", "Overflow", "Esko"]): S(chime(0.035, 84 + k * 3), W(11, w))
S(chime(0.04, 93), W(11, "verified"))
S(click(0.05), W(12, "new")); S(click(0.05), W(12, "today's"))
S(click(0.04), W(13, "why"))
for k in range(7): S(click(0.025, 2200 + k * 100), W(13, "Seven") + k * (W(13, "read") + 0.2 - W(13, "Seven")) / 7)
S(click(0.12, 1900), W(14, "accept") - 0.15)
S(printer(1.4, 0.05), W(15, "submit"))
S(whoosh(0.8, 0.06, 300, 4000), W(16, "applied") + 0.2)
# Pipeline
S(whoosh(1.8, 0.08, 120, 1800), L0(17) - 0.8)
for k in range(int((L1(20) - L0(17)) * 6)):
    S(blip(0.006, float(R.choice([1300, 1600, 2000, 2400])), 0.05), L0(17) + k / 6 + R.random() * 0.1, pan=float(R.uniform(-0.6, 0.6)))
S(whoosh(1.2, 0.05, 200, 2000), L0(18) + 0.1); S(whoosh(1.2, 0.05, 200, 2000), L0(19) + 0.3); S(whoosh(1.2, 0.05, 200, 2000), L0(20) + 0.2)
for k, f in enumerate(["title", "seniority", "location", "salary", "sponsorship", "skills"]): S(click(0.035, 1700 + k * 150), W(19, f))
S(chime(0.04, 91), W(20, "fingerprint"))
for k in range(4): S(thunk(0.06, 120 - 10 * k), W(20, "Stale") + 0.2 + k * 0.25)
for k in range(8): S(click(0.02, 3000), W(20, "nothing") + k * 0.2)
S(blip(0.05, 1100, 0.15), W(20, "told"))
# Engine
for f in ["Skills", "Eligibility", "Experience", "Location", "Sponsorship", "Preferences", "education"]: S(click(0.025, 2300), W(22, f) - 0.14)
for k in range(12): S(blip(0.02, 900 + k * 90, 0.05), W(23, "weighted") + k * 0.1)
S(whoosh(1.0, 0.06, 2000, 200, up=False), W(24, "won't"))
S(impact(0.28, 46, 1.6), cap_t)
S(whoosh(0.9, 0.07, 300, 3000), W(25, "never") - 0.1)
# Architecture
a0 = L0(26) - 0.7
for k in range(5): S(thunk(0.08, 140 - k * 12), a0 + 0.3 + k * 0.18)
S(whoosh(2.0, 0.07, 120, 1600), L0(26) - 0.2)
for w in ["website", "candidate", "operations", "inbox"]: S(click(0.035, 2100), W(26, w))
S(thunk(0.08, 100), W(27, "repository")); S(chime(0.03, 79), W(27, "security"))
S(whoosh(1.0, 0.07, 300, 3500), W(28, "seeded") - 0.3)
S(whoosh(1.2, 0.06, 200, 2400), L0(29) - 0.4)
hit_t = W(29, "proves") - 0.2 + 0.62 * (W(29, "read") + 0.4 - W(29, "proves"))
S(impact(0.16, 70, 0.8), hit_t); S(chime(0.04, 88), W(29, "data"))
S(whoosh(1.2, 0.06, 200, 2400), L0(30) - 0.4)
S(glitch(0.05), W(30, "unavailable")); S(click(0.08, 1500), W(30, "deterministic"))
S(chime(0.03, 86), W(30, "validated"))
S(whoosh(1.2, 0.06, 200, 2400), L0(31) - 0.4)
for k in range(6): S(click(0.025, 1900), W(31, "workers") + k * 0.3)
S(glitch(0.04, 0.25), W(31, "failures") - 0.2)
for k, d in enumerate([0.0, 0.6, 1.5]): S(blip(0.03, 700, 0.1), W(31, "failures") + 0.3 + d)
S(thunk(0.1, 70), W(31, "aside"))
# Results
S(whoosh(1.6, 0.08, 150, 2500), L0(32) - 0.8)
for w in ["Live", "Google", "Chat-style", "Subscriptions", "specialist"]: S(click(0.04, 2400), W(33, w))
S(whoosh(1.0, 0.05, 400, 3000), L0(34) - 0.3)
# Interrupt cards: slam in, whoosh out into the punch-in
for a, b in INTER:
    S(impact(0.32, 42, 1.0), a + 0.02); S(glitch(0.07, 0.22), a); S(whoosh(0.45, 0.09, 400, 9000), b - 0.3)
# Scene cuts (Film.tsx punch-in): a short thump and air on every cut
PRE = {"cold": 0.45, "hook": 0.35, "problem": 0.35, "reveal": 0.2, "product": 0.4, "pipeline": 0.45, "engine": 0.4, "arch": 0.45, "results": 0.4, "close": 0.5}
for name in ["problem", "product", "engine", "arch", "close"]:
    ct = TL["scenes"][name]["start"] - PRE[name] + 0.05
    S(kick(0.3, 0.25), ct); S(whoosh(0.5, 0.05, 600, 8000), ct - 0.35)
# Close
S(whoosh(1.4, 0.06, 2000, 200, up=False), L0(35) - 0.8)
S(riser(2.2, 0.08), close_hit - 2.2)
for k in range(3): S(thunk(0.08, 160 + 30 * k), close_logo + (1.0 + k * 0.16) / 1.25)
S(impact(0.4, 42, 3.0), close_hit)
sfx = reverb(sfx, 0.18, 1.6, 7000)

# ------------------------------------------------------------------ ambience: air and room tone
amb = R.standard_normal((N, 2))
amb = lp(hp(amb, 120), 1800) * 0.012
slow = lp(R.standard_normal(N), 0.3, 1); slow = 0.6 + 0.4 * slow / (np.abs(slow).max() + 1e-9)
amb *= slow[:, None] * fade[:, None]

out = ROOT / "production/audio"
def write(name, x):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "pcm_s24le", str(out / name)],
                   input=x.astype(np.float32).tobytes(), check=True)
for name, x in [("music.wav", music), ("sfx.wav", sfx), ("ambience.wav", amb)]:
    write(name, x[: int(T * SR)])
    print(name, f"peak {20*np.log10(np.abs(x).max()+1e-9):.1f} dBFS")
