# Skylark film · shot-by-shot storyboard

Runtime 5:03.89 at 30 fps. Times come from `src/data/timeline.json`, the single clock that drives the visuals, the subtitles and every sound cue. Regenerate with `python3 production/tools/make_docs.py`.

## A · Hook · 0:02.40 – 0:13.56

**Visual.** Three.js night globe (land dots from the site's own world map). One application arcs from Bengaluru to Berlin and stops at a closed door; an illustrative listing card explains why.

**Camera.** Slow push-in from over the Indian Ocean, pulling back to the full corridor.  
**Transition in.** Fade up from black  
**Music.** Low D drone, air, distant FM bells  
**Sound effects.** Arc launch whoosh, travelling data blips, soft low impact at the door, ember crackle

| Line | Start | End | Narration |
|---:|---:|---:|---|
| 1 | 0:02.40 | 0:08.96 | Somewhere tonight, a software engineer in Bengaluru is sending another application to a company in Berlin. |
| 2 | 0:09.34 | 0:13.56 | She doesn't know it yet, but that job was never open to her. |

## B · Problem · 0:14.50 – 0:44.21

**Visual.** CSS 3D wall of 192 abstract listing cards. Search types, a card is clicked and applied, more fly off; the wall dims by permit / sponsorship while match badges still glow; applications stream out, replies stay empty, 'Your name' burns away.

**Camera.** Tilted plane drifting, then a long pull-back to show the wall's scale, then a push into darkness.  
**Transition in.** Dissolve into typography  
**Music.** Half-time pulse, Dm9-Bb-Gm-A pads, filtered arpeggio; bed drops out after the last line  
**Sound effects.** Typing ticks, clicks, stamp thuds, badge pops, outgoing whooshes, crackle, strike swipe, soft impact

| Line | Start | End | Narration |
|---:|---:|---:|---|
| 3 | 0:14.50 | 0:19.53 | Job boards are built for volume. Search, click, apply, repeat. |
| 4 | 0:19.95 | 0:23.94 | But when you're applying across borders, volume is the problem. |
| 5 | 0:24.45 | 0:33.33 | A listing may need a work permit you don't have. The company may never sponsor a visa. And none of that shows up in the match score. |
| 6 | 0:33.80 | 0:39.55 | So people apply everywhere, hear nothing back, and slowly burn their name with recruiters. |
| 7 | 0:40.06 | 0:44.21 | That isn't a skills problem. It's an information problem. |

## C · Logo reveal · 0:45.56 – 1:00.97

**Visual.** Horizon line of light; the three official mark polygons fly in from 3D, outline-draw, fill, catch a light sweep; the wordmark wipes in; dust converges. Logo rises; three promises reveal in columns.

**Camera.** Subtle push on the logo; logo lifts and scales as the promises appear.  
**Transition in.** Hard cut from silence  
**Music.** Restraint, riser, impact, lift into F-C-Dm-Bb  
**Sound effects.** Riser, three mechanical 'shard lands' thunks, low impact, airy whoosh, ticks per promise

| Line | Start | End | Narration |
|---:|---:|---:|---|
| 8 | 0:45.56 | 0:47.16 | So we built Skylark. |
| 9 | 0:50.76 | 1:00.97 | A job application service that puts you forward only for roles you can actually take, explains every decision, and keeps a human in the loop before anything is sent. |

## D · Product · 1:01.82 – 1:59.94

**Visual.** Real screens from the running app (demo mode, fictional sample data): resume → profile extraction, validation gates (curated taxonomy, Stack Overflow tags, ESCO, email DNS), dashboard spotlights, job detail with seven factor rows, tailoring with a real Accept click (before/after captures), specialist review checklist + submission receipt, tracker and phones.

**Camera.** Floating 3D screens with perspective settles, sheen passes, spotlights and a cursor aimed at captured element boxes.  
**Transition in.** Cross-dissolves between screens with depth  
**Music.** 104 BPM clean groove: soft kick, hats, Dm9-Bbmaj7-Fmaj7-C6 plucks  
**Sound effects.** Screen whooshes, extraction blips, gate chimes, cursor click, receipt printer

| Line | Start | End | Narration |
|---:|---:|---:|---|
| 10 | 1:01.82 | 1:09.36 | It starts with one profile. Upload your resume, and Skylark pulls out your headline, skills and experience. |
| 11 | 1:09.74 | 1:21.59 | Every field is checked on the server. Skills, against a curated taxonomy, Stack Overflow tags and the European ESCO catalogue. Even your email domain is verified. |
| 12 | 1:22.10 | 1:26.84 | Your dashboard shows new matches, active applications and today's progress. |
| 13 | 1:27.22 | 1:34.82 | Open any role, and you see exactly why it fits. Seven factors, each with a score and a sentence you can read. |
| 14 | 1:35.33 | 1:45.37 | When you decide to apply, AI drafts a tailored resume and cover letter. Every change comes with a reason, and nothing is applied until you accept it. |
| 15 | 1:45.88 | 1:54.99 | Then a specialist takes over. They work through a five-point checklist, submit the application, and record the employer's confirmation reference. |
| 16 | 1:55.41 | 1:59.94 | You follow every step on your tracker, from saved, to applied, to interview. |

## E1 · Job pipeline · 2:00.78 – 2:32.02

**Visual.** Three.js pipeline: Arbeitnow and 16 Greenhouse boards emit raw postings (Adzuna, The Muse, Lever shown dim as 'when configured'); a gate turns raw shapes into six-field records; a fingerprint ring merges duplicates; a store drops stale listings; a 24 h ring and the real 'Live job data is unavailable' notice.

**Camera.** Camera dollies station to station along the pipeline.  
**Transition in.** Push into depth  
**Music.** Precision 16th arpeggios, lighter kick, darker harmony  
**Sound effects.** Data blips throughout, field ticks, hash chime, stale-drop thunks, clock ticks

| Line | Start | End | Narration |
|---:|---:|---:|---|
| 17 | 2:00.78 | 2:03.62 | Under the surface, Skylark is a pipeline. |
| 18 | 2:04.05 | 2:12.69 | Listings arrive from public job APIs: Arbeitnow, sixteen Greenhouse company boards, and others when they're configured. |
| 19 | 2:13.10 | 2:20.72 | Each posting is cleaned from raw HTML into a title, seniority, location, salary, sponsorship and skills. |
| 20 | 2:21.14 | 2:32.02 | An SHA-256 fingerprint collapses duplicates. Stale listings are closed, and if nothing has refreshed in twenty-four hours, candidates are told. |

## E2 · Match engine · 2:32.79 – 3:08.79

**Visual.** SVG dial where each arc's WIDTH is its published weight and its DEPTH the factor score; real FACTOR_WEIGHTS code highlights as each is named; README worked example sums to 86, then eligibility and sponsorship block, the sum drops to 64 and the cap takes it to 35; ranking ladder swaps.

**Camera.** Dial scales left for the ladder.  
**Transition in.** Cross-dissolve  
**Music.** Continues; drums drop for the cap  
**Sound effects.** Factor ticks, count-up blips, drain whoosh, impact on 'capped'

| Line | Start | End | Narration |
|---:|---:|---:|---|
| 21 | 2:32.79 | 2:36.46 | Then the match engine scores every role against your profile. |
| 22 | 2:36.88 | 2:50.88 | Skills carry thirty percent. Eligibility, twenty. Experience, eighteen. Location, twelve. Sponsorship, eight. Preferences, seven. And education, five. |
| 23 | 2:51.22 | 2:53.67 | The score is simply their weighted sum. |
| 24 | 2:54.35 | 3:02.85 | Now, here's the rule that matters most. If a role won't sponsor someone who needs it, the score is capped at thirty-five. |
| 25 | 3:03.27 | 3:08.79 | However strong your skills look, a job you can't legally take will never outrank one you can. |

## F · Engineering · 3:09.73 – 4:15.89

**Visual.** CSS 3D exploded stack: Experience (Next.js 16) / Server / Domain services / Repository interface / Data. Supabase slab slides out for the in-memory store. Close-ups: two candidates' rows with an RLS wall a probe cannot cross (PGlite policy tests); AIProvider routing Claude → Zod schema, switching to the rules provider; a queue with idempotency keys, two workers, a failing job backing off to dead-letter.

**Camera.** Slow orbit of the isometric stack, then three framed close-ups.  
**Transition in.** Depth dissolves  
**Music.** Same technical bed  
**Sound effects.** Layer thunks, tile ticks, swap whoosh, block impact, pass chime, glitch, switch click, retry blips

| Line | Start | End | Narration |
|---:|---:|---:|---|
| 26 | 3:09.73 | 3:19.23 | The product itself is one Next.js application: the public website, the candidate app, an operations console and a shared inbox. |
| 27 | 3:19.65 | 3:29.03 | Every service talks to a single repository interface. In production, that's Supabase Postgres, with row level security on every table. |
| 28 | 3:29.45 | 3:38.47 | Without credentials, the same interface runs on a seeded in-memory store. So the whole product works on a laptop, with zero setup. |
| 29 | 3:39.06 | 3:51.09 | Security isn't assumed. It's tested. The test suite applies every migration to a real Postgres engine, and proves that one candidate can never read another's data. |
| 30 | 3:51.68 | 4:04.26 | AI sits behind an interface too. Claude drafts the tailoring, and its output is validated against a schema. If the model is unavailable, a deterministic rules engine takes over. |
| 31 | 4:04.77 | 4:15.89 | Background work runs through a queue. Every task carries an idempotency key, no two workers claim the same job, and failures back off before they're set aside. |

## G · Live today · 4:16.74 – 4:39.77

**Visual.** Screens captured from www.skylarkgo.in (landing, sign-in with Google, rupee pricing) and the demo review queue, with five verified live capabilities; then two roadmap items from the README on a dashed horizon.

**Camera.** Screen swaps synced to each capability.  
**Transition in.** Cross-dissolve  
**Music.** Brighter build: F-C-Dm-Bb, full groove  
**Sound effects.** Item ticks, transition whoosh

| Line | Start | End | Narration |
|---:|---:|---:|---|
| 32 | 4:16.74 | 4:20.31 | Today, Skylark is live at skylarkgo.in. |
| 33 | 4:20.73 | 4:32.54 | Live job listings. Google sign-in. Chat-style onboarding. Subscriptions in rupees through Razorpay. And a specialist review queue with a twenty-four hour target. |
| 34 | 4:33.05 | 4:39.77 | Next, we're adding more job sources for India, and matching every candidate against the entire catalogue. |

## H · Close · 4:40.71 – 4:58.89

**Visual.** Typographic thesis, then three serif lines, then the official logo reassembles with the tagline 'Your next move, already in motion.', the URL, GitHub repo and team credit.

**Camera.** Static, centred; restraint.  
**Transition in.** Fade to black  
**Music.** Drums out, pads and bells, resolves to F(add9) on the logo  
**Sound effects.** Reverse whoosh, riser, shard thunks, final impact

| Line | Start | End | Narration |
|---:|---:|---:|---|
| 35 | 4:40.71 | 4:47.48 | Skylark doesn't try to send more applications. It tries to send the right ones, and to show you why. |
| 36 | 4:48.07 | 4:53.74 | Fewer applications. Better reasons. And a person checking every one. |
| 37 | 4:54.76 | 4:58.89 | Skylark. Your next move, already in motion. |
