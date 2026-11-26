"""Duck, balance and master the film's soundtrack.

Inputs (production/audio): narration.wav, music.wav, sfx.wav, ambience.wav
Outputs: music_ducked.wav (stem as mixed), mix_premaster.wav, master.wav (-14 LUFS, -1 dBTP), master.m4a
"""
import json, pathlib, subprocess
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = pathlib.Path(__file__).resolve().parents[2]
A = ROOT / "production/audio"
SR = 48000

def read(name):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(A / name), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)

def write(name, x):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "pcm_s24le", str(A / name)], input=x.astype(np.float32).tobytes(), check=True)

vo, mu, fx, am = read("narration.wav"), read("music.wav"), read("sfx.wav"), read("ambience.wav")
n = max(len(vo), len(mu), len(fx), len(am))
pad = lambda x: np.pad(x, ((0, n - len(x)), (0, 0)))
vo, mu, fx, am = map(pad, (vo, mu, fx, am))

db = lambda x: 20 * np.log10(x + 1e-12)
def rms_env(x, win=0.05):
    w = int(win * SR); e = np.sqrt(np.convolve((x ** 2).mean(1), np.ones(w) / w, "same")); return e

# Speech activity and its loudness
ve = rms_env(vo)
active = ve > 10 ** (-40 / 20)
vo_rms = np.sqrt((vo[active] ** 2).mean())
mu_rms = np.sqrt((mu[rms_env(mu) > 1e-4] ** 2).mean())

# Balance: music bed 13 dB under speech in the gaps, ducked a further 7 dB under the voice.
mu *= (vo_rms * 10 ** (-13 / 20)) / mu_rms
duck = np.where(active, 10 ** (-7 / 20), 1.0)
# smooth gain: 120 ms attack, 600 ms release (one-pole each way)
g = np.empty(n); cur = 1.0
att, rel = np.exp(-1 / (0.12 * SR)), np.exp(-1 / (0.6 * SR))
# vectorised-ish: iterate in blocks of 48 samples
B = 48
for i in range(0, n, B):
    tgt = duck[i:i + B].min()
    k = att if tgt < cur else rel
    cur = tgt + (cur - tgt) * k ** B
    g[i:i + B] = cur
mu *= g[:, None]
am *= np.where(active, 10 ** (-3 / 20), 1.0)[:, None] * 1.0
# SFX: peaks about 7 dB under voice peaks
fx *= (np.abs(vo).max() * 10 ** (-7 / 20)) / (np.abs(fx).max() + 1e-9)
fx *= (0.55 + 0.45 * g)[:, None]  # effects also step back a little under the voice

write("music_ducked.wav", mu)
mix = vo + mu + fx + am
write("mix_premaster.wav", mix)

def loudnorm(src, dst, extra=[]):
    first = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(A / src), "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
    j = json.loads(first[first.rindex("{"): first.rindex("}") + 1])
    af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:"
          f"measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,alimiter=limit=0.89:level=false,aresample=48000")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(A / src), "-af", af, "-c:a", "pcm_s24le", "-ar", "48000", str(A / dst)] + extra, check=True)

loudnorm("mix_premaster.wav", "master.wav")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(A / "master.wav"), "-c:a", "aac", "-b:a", "320k", str(A / "master.m4a")], check=True)
rep = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(A / "master.wav"), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
print("\n".join(l for l in rep.splitlines()[-14:] if l.strip()))
