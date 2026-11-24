"""Build subtitle cues from the timeline: script text (not TTS spelling), split at word timings.
Writes src/data/captions.json (used by the subtitled render) and production/subtitles/skylark-film.en.srt."""
import json, pathlib, re
ROOT = pathlib.Path(__file__).resolve().parents[2]
tl = json.load(open(ROOT / "src/data/timeline.json"))
MAX = 46
cues = []
for l in tl["lines"]:
    words = l["text"].split()
    tws = l["words"]
    # Map display words onto TTS word timings proportionally (TTS spellings differ, e.g. "J S").
    n, m = len(words), len(tws)
    def t_at(i):
        j = min(m - 1, round(i * m / n)); return tws[j]["t"]
    chunks, cur = [], []
    for i, w in enumerate(words):
        cur.append((i, w))
        txt = " ".join(x for _, x in cur)
        end_sentence = re.search(r"[.!?:]$", w) is not None
        nxt = len(txt) + 1 + (len(words[i + 1]) if i + 1 < n else 0)
        if (end_sentence and len(txt) > 16) or (w.endswith(",") and len(txt) > MAX - 18) or nxt > MAX:
            chunks.append(cur); cur = []
    if cur: chunks.append(cur)
    # merge a tiny trailing chunk
    if len(chunks) > 1 and len(" ".join(w for _, w in chunks[-1])) < 12:
        chunks[-2] += chunks[-1]; chunks.pop()
    for k, ch in enumerate(chunks):
        start = l["start"] if k == 0 else t_at(ch[0][0]) - 0.05
        end = l["end"] if k == len(chunks) - 1 else t_at(chunks[k + 1][0][0]) - 0.08
        cues.append({"start": round(start, 3), "end": round(end, 3), "text": " ".join(w for _, w in ch)})
json.dump(cues, open(ROOT / "src/data/captions.json", "w"), indent=1)
def ts(x):
    h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60
    return f"{h:02d}:{m:02d}:{int(s):02d},{int(round((s - int(s)) * 1000)):03d}"
out = ROOT / "production/subtitles"; out.mkdir(exist_ok=True, parents=True)
with open(out / "skylark-film.en.srt", "w") as f:
    for i, c in enumerate(cues, 1):
        f.write(f"{i}\n{ts(c['start'])} --> {ts(c['end'])}\n{c['text']}\n\n")
print(len(cues), "cues")
