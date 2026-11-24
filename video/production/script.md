# Skylark film · narration script

Final script as narrated. Pronunciation respellings sent to the voice engine are in `script.json` (`tts`).

## A · Hook

Somewhere tonight, a software engineer in Bengaluru is sending another application to a company in Berlin.

She doesn't know it yet, but that job was never open to her.

## B · Problem

Job boards are built for volume. Search, click, apply, repeat.

But when you're applying across borders, volume is the problem.

A listing may need a work permit you don't have. The company may never sponsor a visa. And none of that shows up in the match score.

So people apply everywhere, hear nothing back, and slowly burn their name with recruiters.

That isn't a skills problem. It's an information problem.

## C · Logo reveal

So we built Skylark.

A job application service that puts you forward only for roles you can actually take, explains every decision, and keeps a human in the loop before anything is sent.

## D · Product

It starts with one profile. Upload your resume, and Skylark pulls out your headline, skills and experience.

Every field is checked on the server. Skills, against a curated taxonomy, Stack Overflow tags and the European ESCO catalogue. Even your email domain is verified.

Your dashboard shows new matches, active applications and today's progress.

Open any role, and you see exactly why it fits. Seven factors, each with a score and a sentence you can read.

When you decide to apply, AI drafts a tailored resume and cover letter. Every change comes with a reason, and nothing is applied until you accept it.

Then a specialist takes over. They work through a five-point checklist, submit the application, and record the employer's confirmation reference.

You follow every step on your tracker, from saved, to applied, to interview.

## E1 · Job pipeline

Under the surface, Skylark is a pipeline.

Listings arrive from public job APIs: Arbeitnow, sixteen Greenhouse company boards, and others when they're configured.

Each posting is cleaned from raw HTML into a title, seniority, location, salary, sponsorship and skills.

An SHA-256 fingerprint collapses duplicates. Stale listings are closed, and if nothing has refreshed in twenty-four hours, candidates are told.

## E2 · Match engine

Then the match engine scores every role against your profile.

Skills carry thirty percent. Eligibility, twenty. Experience, eighteen. Location, twelve. Sponsorship, eight. Preferences, seven. And education, five.

The score is simply their weighted sum.

Now, here's the rule that matters most. If a role won't sponsor someone who needs it, the score is capped at thirty-five.

However strong your skills look, a job you can't legally take will never outrank one you can.

## F · Engineering

The product itself is one Next.js application: the public website, the candidate app, an operations console and a shared inbox.

Every service talks to a single repository interface. In production, that's Supabase Postgres, with row level security on every table.

Without credentials, the same interface runs on a seeded in-memory store. So the whole product works on a laptop, with zero setup.

Security isn't assumed. It's tested. The test suite applies every migration to a real Postgres engine, and proves that one candidate can never read another's data.

AI sits behind an interface too. Claude drafts the tailoring, and its output is validated against a schema. If the model is unavailable, a deterministic rules engine takes over.

Background work runs through a queue. Every task carries an idempotency key, no two workers claim the same job, and failures back off before they're set aside.

## G · Live today

Today, Skylark is live at skylarkgo.in.

Live job listings. Google sign-in. Chat-style onboarding. Subscriptions in rupees through Razorpay. And a specialist review queue with a twenty-four hour target.

Next, we're adding more job sources for India, and matching every candidate against the entire catalogue.

## H · Close

Skylark doesn't try to send more applications. It tries to send the right ones, and to show you why.

Fewer applications. Better reasons. And a person checking every one.

Skylark. Your next move, already in motion.
