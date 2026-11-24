# Skylark: the presentation

A cinematic, browser-based presentation of Skylark: 21 slides, a persistent 3D scene, the real product, and speaker notes for every slide. Everything runs offline from this folder. There are no CDNs, no external APIs and no build step.

## Launch it

| Way | How | Notes |
|---|---|---|
| Local server (recommended) | `node presentation/serve.mjs`, then open http://localhost:4173 | Needs only Node. The presenter view syncs most reliably over http. |
| Double-click | Open `presentation/index.html` in Chrome, Edge or Firefox | Works from `file://`, including fonts, 3D and the recorded demo. |
| One file | `node presentation/tools/build-single.mjs`, then open `presentation/dist/skylark-presentation.html` | About 12 MB, with everything inlined. Easy to email or copy to a USB stick. Use N for notes because the separate presenter window is not part of the single file. |

Present in Chrome or Edge on a machine with a GPU, full screen (F), at any 16:9 resolution. The 1920×1080 stage scales to fit any window.

## Controls

| Key | Action |
|---|---|
| → · Space · PageDown · ↓ · click · swipe left | Next step or slide |
| ← · PageUp · ↑ · swipe right | Previous |
| Home / End | First / last slide |
| Type a number, then Enter | Go to that slide |
| F | Full screen |
| R | Replay the current slide |
| M or O | Overview of all slides (click one to jump) |
| N | Speaker notes panel |
| P | Presenter view in a second window |
| A | Autoplay on or off (8 s per step, or `?autoplay=12`) |
| H | Hide the progress bar and slide number |
| B or . | Black screen |
| Esc | Close the overview, notes or go-to box |
| L / V (demo slide) | Open the live site / play or pause the recording |

Any key skips the 10-second opening sequence. There is no autoplay unless you turn it on.

### Presenter view

Press **P** in the main window. The second window shows the current and next slide, the step within the slide, the speaker notes, an elapsed timer you can reset, and the clock. Its buttons and arrow keys also drive the deck. Put it on your laptop screen and the deck on the projector.

### URL options

- `?nointro` skips the opening sequence. `?autostart` skips the "press space" gate.
- `#7` opens on slide 7.
- `?reduced` forces reduced motion (also turned on by the OS setting).
- `?live=https://…` changes the site the demo slide opens. The default is https://www.skylarkgo.in.
- `?export` renders final states instantly; the export tool uses it.

## Live demo and fallback

The demo slide plays a recorded walkthrough of the real product (`assets/media/demo-recording.mp4`, 1 min 55 s, captured from demo mode with sample data). Press **L** to open the live site in a new window. The site forbids being embedded in a frame, so it never loads inside the deck. If the network fails, keep going with the recording.

## Without WebGL

If WebGL is unavailable, the deck still runs: every slide's text, screenshots, diagrams and animations are DOM and SVG, and the 3D layer is simply left out. Reduced motion shortens or removes movement.

## Backups

All in `presentation/exports/`:

- `Skylark-presentation.pdf`: one page per slide.
- `Skylark-presentation.pptx`: one full-bleed image per slide, with the speaker notes in PowerPoint's notes pane.
- `slides/NN.jpg`: a 1920×1080 screenshot of every slide in its final state.
- `speaker-notes.md`: every slide's notes: what to say, key points, duration, transition and likely questions.

The PDF and PowerPoint are static images, so they show the end state of each slide without animation.

## Editing

| Path | What it holds |
|---|---|
| `index.html` | All 21 slides and their speaker notes (`<aside class="notes" data-duration>`). `data-steps` sets how many clicks a slide has. |
| `css/deck.css` | Design tokens, type, stage, HUD. |
| `css/slides.css` | Per-slide layout. |
| `js/engine.js` | Navigation, keys, overview, notes, presenter sync, autoplay, preload. |
| `js/world.js` | The persistent Three.js scene: logo shards, 9,000-particle formations, globe, architecture stack, bloom. `SCENES` sets the camera and formation per slide. |
| `js/slides.js` | One controller per slide (`Deck.define(id, { enter, state, leave })`). |
| `js/data/brand.js` | The official logo SVG, from `.github/assets/brand`. |
| `presenter.html` | The presenter view. |
| `assets/` | Fonts, GSAP 3.12.5, Three.js r149, logo, README feature art, product screenshots, demo recording, thumbnails. |

After changing slides, regenerate the exports and thumbnails:

```sh
node presentation/serve.mjs &                    # or any static server
CHROMIUM_PATH=/path/to/chrome node presentation/tools/shoot.mjs http://localhost:4173/index.html presentation/tools/.renders 1
python3 presentation/tools/export.py presentation/tools/.renders   # needs Pillow, python-pptx, beautifulsoup4
node presentation/tools/build-single.mjs
```

`tools/capture-product.mjs` re-captures the product screenshots and demo recording from a local `npm run dev` in demo mode. `tools/film.mjs` samples frames during live transitions for checking motion. `tools/make-land.py` rebuilds the globe's land points from `public/art/world-dots.png`.

## What is real

Every number on screen comes from the repository on 24 November 2026: 264 automated tests passing in 24 files, 15 database migrations, 22 merged pull requests between 8 October and 24 November 2026, 16 default Greenhouse boards, and the seven published matching weights in `src/lib/services/matching/engine.ts`. There are no user counts, revenue or benchmarks, because the project has none to report yet. Product screenshots come from demo mode, and the jobs in them are sample listings, labelled as such on the slides. The "wall of listings" on slide 2 is an illustration, not data. The roadmap separates what is implemented from what is planned.
