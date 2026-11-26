"""Generate the narration with ElevenLabs (RM's own professional voice clone).

Usage: ELEVENLABS_API_KEY=... python tts_elevenlabs.py ../script.json ../voice/lines [ids,comma,separated]
Writes lineNN.mp3 plus lineNN.words.json (word start/duration from ElevenLabs character alignment).
The key is read from the environment only; never commit it.
Optional env: ELEVENLABS_VOICE_ID, ELEVENLABS_MODEL, TTS_CA_BUNDLE (CA file for a TLS-intercepting proxy).
"""
import base64, json, os, sys, time, urllib.request

VOICE = os.environ.get("ELEVENLABS_VOICE_ID", "hdqWMD2zCOHC6cf6IFko")  # "ROHAN MALYADRI", en-Indian
MODEL = os.environ.get("ELEVENLABS_MODEL", "eleven_multilingual_v2")
SETTINGS = {"stability": 0.42, "similarity_boost": 0.85, "style": 0.30, "use_speaker_boost": True, "speed": 1.06}
script = json.load(open(sys.argv[1])); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
only = set(sys.argv[3].split(",")) if len(sys.argv) > 3 else None
ctx = None
if os.environ.get("TTS_CA_BUNDLE"):
    import ssl; ctx = ssl.create_default_context(cafile=os.environ["TTS_CA_BUNDLE"])

def say(i):
    s = script[i]; text = s.get("tts", s["text"])
    body = {"text": text, "model_id": MODEL, "voice_settings": {**SETTINGS, **s.get("voice", {})},
            # neighbouring lines keep intonation continuous across separately generated takes
            "previous_text": script[i - 1].get("tts", script[i - 1]["text"]) if i > 0 else None,
            "next_text": script[i + 1].get("tts", script[i + 1]["text"]) if i + 1 < len(script) else None}
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128",
                                 data=json.dumps(body).encode(), method="POST",
                                 headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"], "Content-Type": "application/json", "User-Agent": "skylark-film/1.0"})
    for attempt in range(int(os.environ.get("TTS_TRIES", 5))):
        try:
            d = json.load(urllib.request.urlopen(req, context=ctx, timeout=120)); break
        except Exception as e:
            print("retry", s["id"], getattr(e, "code", e), (e.read()[:300] if hasattr(e, "read") else ""), file=sys.stderr); time.sleep(3 + attempt * 4)
    else:
        raise SystemExit(f"line {s['id']} failed")
    f = f"{out}/line{s['id']:02d}.mp3"
    open(f, "wb").write(base64.b64decode(d["audio_base64"]))
    al = d["alignment"]; chars, st, en = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    words, cur = [], None
    for c, a, b in zip(chars, st, en):
        if c.isspace():
            if cur: words.append(cur); cur = None
            continue
        if cur is None: cur = {"t": a, "e": b, "w": c}
        else: cur["e"] = b; cur["w"] += c
    if cur: words.append(cur)
    json.dump([{"t": round(w["t"], 3), "d": round(w["e"] - w["t"], 3), "w": w["w"].strip(".,:;!?\"'")} for w in words], open(f[:-4] + ".words.json", "w"))
    print("ok", s["id"], len(text), "chars")

for i, s in enumerate(script):
    if only is None or str(s["id"]) in only: say(i)
