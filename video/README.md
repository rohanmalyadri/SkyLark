# Skylark · the product film

A 4:46 cinematic explainer for Skylark, built in code: Remotion for picture, Three.js for the 3D scenes, and a
Python pipeline for narration, score, sound design and mastering. One clock, `src/data/timeline.json`, drives every
visual, subtitle and sound cue, so if you change a narration line, everything re-syncs.

Nothing in this folder touches the Skylark app. The repo root `tsconfig.json` and `eslint.config.mjs` ignore `video/`.

## What's here

| Path | What it is |
|---|---|
| `production/script.md` | Narration script with per-line timing (generated) |
| `production/storyboard.md` | Shot-by-shot storyboard: visual, camera, transitions, music and SFX per scene (generated) |
| `production/script.json` | Source of truth for the narration: text, pronunciation respellings (`tts`), pace (`rate`), pauses |
| `production/voice/lines/` | Final narration takes (`lineNN.mp3`) with word-boundary timings (`lineNN.words.json`) |
| `production/subtitles/skylark-film.en.srt` | English subtitles (109 cues) |
| `production/tools/` | `tts_elevenlabs.py` → `build_timeline.py` → `make_captions.py` → `score.py` → `mix.py`; plus `make_docs.py`, `asr_check.py` |
| `production/LICENSES.md` | Where every asset comes from and under what terms |
| `capture/capture.mjs` | Playwright script that captured the real interface screenshots in `public/shots/` |
| `src/` | Remotion project: `Film.tsx`, nine scenes in `src/scenes/`, the logo animation in `src/components/Logo.tsx` |
| `public/brand/` | Official Skylark logo files (copied unmodified) |

Rendered files (MP4s, WAV stems, master) are git-ignored because of their size. They're delivered separately.

## Structure

| | Scene | Lines | What you see |
|---|---|---|---|
| 0 | Cold open | 101–103 | "This job was never yours." Words slam onto black, a VISA REQUIRED stamp, white-out |
| A | Hook | 1–2 | Crash zoom out of Bengaluru, one application arcing to Berlin and dying at a closed door |
| B | Problem | 3–7 | A wall of 192 listings, applications going out, nothing coming back |
| C | Logo reveal | 8–9 | The official mark assembles from shards, then the three promises |
| D | Product | 10–16 | Real screens: profile, validation, dashboard, match explanation, tailoring, specialist review, tracker |
| E | Pipeline | 17–20 | 3D job pipeline: sources, normalisation, SHA-256 dedupe, the store, daily refresh |
| F | Engine | 21–25 | The seven factor weights as a dial, the eligibility cap at 35 |
| G | Architecture | 26–31 | Exploded layers, RLS policy tests, the AI provider fallback, the review queue |
| H | Results | 32–34 | What's live today, and what's next |
| I | Close | 35–37 | The thesis, the logo, www.skylarkgo.in |

## Reproduce it

Requirements: Node 20+, Python 3.11+ with `numpy scipy` (and `faster-whisper` for QA), ffmpeg, and an ElevenLabs API key for narration.

```bash
cd video
npm ci
npx remotion browser ensure

# 1. Narration (only if you change script.json). Pass ids to redo single lines: ... ../voice/lines 18,20
cd production/tools
ELEVENLABS_API_KEY=... python3 tts_elevenlabs.py ../script.json ../voice/lines

# 2. Timeline, subtitles, score, mix, docs
python3 build_timeline.py      # narration.wav + src/data/timeline.json
python3 make_captions.py       # src/data/captions.json + SRT
python3 score.py               # music.wav, sfx.wav, ambience.wav
python3 mix.py                 # music_ducked.wav, master.wav (-14 LUFS, -1.5 dBTP), master.m4a
python3 make_docs.py           # storyboard.md, script.md
python3 asr_check.py ../audio/master.wav   # optional: transcribe the mix to check intelligibility
cd ../..

# 3. Picture (audio is muxed afterwards, so renders are silent)
npx remotion render SkylarkFilm renders/film-1080p-video.mp4 --gl=swangle --crf=16 --muted
# 4K: render in chunks with low concurrency (concurrency 4 at 4K crashes the browser near the end), then join
npx remotion render SkylarkFilm renders/k4-a.mp4 --gl=swangle --scale=2 --crf=18 --muted --concurrency=2 --frames=0-3899
npx remotion render SkylarkFilm renders/k4-b.mp4 --gl=swangle --scale=2 --crf=18 --muted --concurrency=2 --frames=3900-7799
npx remotion render SkylarkFilm renders/k4-c.mp4 --gl=swangle --scale=2 --crf=18 --muted --concurrency=1 --frames=7800-9116
printf "file 'k4-a.mp4'\nfile 'k4-b.mp4'\nfile 'k4-c.mp4'\n" > renders/k4.txt
ffmpeg -f concat -safe 0 -i renders/k4.txt -c copy renders/film-4k-video.mp4
npx remotion render SkylarkFilmSubtitled renders/film-1080p-sub-video.mp4 --gl=swangle --crf=16 --muted
npx remotion still Thumbnail renders/thumbnail.png --scale=2

# 4. Mux with the master
for f in film-1080p film-4k film-1080p-sub; do
  ffmpeg -i renders/$f-video.mp4 -i production/audio/master.m4a -map 0:v -map 1:a -c copy -shortest -movflags +faststart renders/skylark-$f.mp4
done
```

Preview and tweak interactively with `npm run dev` (Remotion Studio). Audio isn't in the composition, so the studio is silent.

### Recapturing screens

Run the app in demo mode (no Supabase env vars) on port 3100, then:

```bash
BASE_URL=http://localhost:3100 OPS_PATH=<admin panel path> \
CHROMIUM_PATH=<chrome binary> node capture/capture.mjs
```

`OPS_PATH` is read from the environment so the admin URL never lands in the repo or on screen. `SKIP_LIVE=1` skips the
live-site captures. Demo mode only contains fictional sample data; the film labels those screens as such.

## Notes

- **Voice.** The narration is Rohan Malyadri's own ElevenLabs professional voice clone ("ROHAN MALYADRI", en-Indian),
  model `eleven_multilingual_v2`, generated line by line with neighbouring lines as context so the intonation stays
  continuous. The API key is read from the environment and never stored in the repo. A few names are respelled in the
  `tts` field of `script.json` (ESCO, Arbeitnow, SHA-256, Next.js, skylarkgo.in) so they're pronounced correctly.
  `tts.py` (Edge TTS) is kept as a keyless fallback.
- **Pacing.** A cold open in the first second, hard cuts with a punch-in and flash on every scene change
  (`Film.tsx`), and four full-frame pattern interrupts (`src/scenes/Interrupts.tsx`) where the bed drops out.
- **Accuracy.** Every claim in the script maps to code in this repo (the factor weights, the 35-point cap, SHA-256
  dedupe, RLS tests, the AI fallback). Numbers in the engine scene are the README's worked example; anything
  illustrative is labelled on screen.
