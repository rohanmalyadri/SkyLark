"""Generate the narration takes with Microsoft Edge neural TTS (en-IN-PrabhatNeural).

Usage: python tts.py ../script.json ../voice/lines [ids,comma,separated]
Writes lineNN.mp3 plus lineNN.words.json (word boundaries) for each script line.
Per-line "tts" overrides spelling for pronunciation; per-line "rate" overrides the default pace.
Optional env: TTS_CA_BUNDLE (extra CA file for a TLS-intercepting proxy), HTTPS_PROXY.
"""
import asyncio, json, os, ssl, sys

if os.environ.get("TTS_CA_BUNDLE"):
    _orig = ssl.create_default_context
    ssl.create_default_context = lambda *a, **k: _orig(cafile=os.environ["TTS_CA_BUNDLE"])
import edge_tts

VOICE, RATE, PITCH = "en-IN-PrabhatNeural", "+14%", "+0Hz"
script = json.load(open(sys.argv[1])); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
only = set(sys.argv[3].split(",")) if len(sys.argv) > 3 else None

async def gen(s):
    text = s.get("tts", s["text"]); f = f"{out}/line{s['id']:02d}.mp3"
    for attempt in range(12):  # the service intermittently returns "No audio was received"
        try:
            c = edge_tts.Communicate(text, VOICE, rate=s.get("rate", RATE), pitch=PITCH,
                                     proxy=os.environ.get("HTTPS_PROXY"), boundary="WordBoundary")
            words, audio = [], bytearray()
            async for ch in c.stream():
                if ch["type"] == "audio": audio += ch["data"]
                elif ch["type"] == "WordBoundary": words.append({"t": ch["offset"] / 1e7, "d": ch["duration"] / 1e7, "w": ch["text"]})
            open(f, "wb").write(audio); json.dump(words, open(f[:-4] + ".words.json", "w")); print("ok", s["id"]); return
        except Exception as e:
            print("retry", s["id"], e, file=sys.stderr); await asyncio.sleep(2 + attempt * 3)
    raise SystemExit(f"line {s['id']} failed")

async def main():
    for s in script:
        if only is None or str(s["id"]) in only: await gen(s)

asyncio.run(main())
