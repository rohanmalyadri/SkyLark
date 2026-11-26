"""Assemble the narration and the master timeline.

Reads production/script.json and the per-line TTS takes (lineNN.mp3 + lineNN.words.json from
tts_elevenlabs.py), trims each take's edge silence, processes the voice (high-pass, gentle EQ,
de-essing, light compression), lays lines out with the scripted pauses, and writes:
  production/audio/narration.wav   48 kHz stereo voice stem
  src/data/timeline.json           line/word/scene timings in seconds (the film's single clock)
"""
import json, subprocess, sys, pathlib
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[2]
LINES = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "production/voice/lines"
SR = 48000
LEAD = 0.45         # cold open: first word almost immediately
EXTRA = {8: 0.5}    # extra restraint before a line (seconds)
script = json.load(open(ROOT / "production/script.json"))

def decode(path, filt):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-af", filt, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()

CHAIN = ",".join([
    "highpass=f=75",
    "equalizer=f=170:t=q:w=1.0:g=1.5",     # a little chest
    "equalizer=f=420:t=q:w=1.2:g=-1.5",    # less boxiness
    "equalizer=f=3300:t=q:w=1.3:g=1.2",    # presence
    "deesser=i=0.35:m=0.5:f=0.5",
    "acompressor=threshold=-20dB:ratio=2.2:attack=8:release=120:makeup=2",
])

lines, voice, cursor = [], [], LEAD
for s in script:
    i = s["id"]; f = LINES / f"line{i:02d}.mp3"
    words = json.load(open(LINES / f"line{i:02d}.words.json"))
    a = decode(f, CHAIN)
    env = np.abs(a) > 10 ** (-45 / 20)
    idx = np.nonzero(env)[0]
    head = max(0, idx[0] - int(0.03 * SR)); tail = min(len(a), idx[-1] + int(0.12 * SR))
    a = a[head:tail]
    fade = int(0.012 * SR); a[:fade] *= np.linspace(0, 1, fade); a[-fade:] *= np.linspace(1, 0, fade)
    cursor += EXTRA.get(i, 0)
    dur = len(a) / SR
    # Map TTS word boundaries back to the script's displayed words for subtitles (same count where possible).
    ws = [{"w": w["w"], "t": round(cursor + w["t"] - head / SR, 3), "d": round(w["d"], 3)} for w in words]
    lines.append({"id": i, "scene": s["scene"], "text": s["text"], "start": round(cursor, 3), "end": round(cursor + dur, 3), "words": ws})
    voice.append((cursor, a))
    cursor += dur + s["pause"]

total = cursor + 1.0
buf = np.zeros(int(total * SR) + SR, np.float32)
for t, a in voice:
    o = int(t * SR); buf[o:o + len(a)] += a
# normalise voice stem so its speech peaks sit near -3 dBFS (final loudness is set at mastering)
buf *= 10 ** (-3 / 20) / max(1e-6, np.abs(buf).max())
out = ROOT / "production/audio"; out.mkdir(parents=True, exist_ok=True)
stereo = np.stack([buf, buf], 1)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "pcm_s24le", str(out / "narration.wav")],
               input=stereo.tobytes(), check=True)

scenes = {}
for l in lines:
    sc = scenes.setdefault(l["scene"], {"start": l["start"], "end": l["end"], "lines": []})
    sc["end"] = l["end"]; sc["lines"].append(l["id"])
json.dump({"fps": 30, "total": round(total, 3), "lead": LEAD, "lines": lines, "scenes": scenes},
          open(ROOT / "src/data/timeline.json", "w"), indent=1)
print(f"total {total:.2f}s, {sum(len(l['text'].split()) for l in lines)} words, "
      f"{sum(len(l['text'].split()) for l in lines) / ((sum(l['end']-l['start'] for l in lines))/60):.0f} wpm while speaking")
for k, v in scenes.items(): print(f"  {k:9s} {v['start']:7.2f} – {v['end']:7.2f}")
