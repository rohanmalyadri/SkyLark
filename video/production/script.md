# Skylark film · narration script

Final script as narrated. Pronunciation respellings sent to the voice engine are in `script.json` (`tts`).

## 0 · Cold open

This job was never yours.

Not because of your skills.

Because of a visa nobody told you about.

## A · Hook

Bengaluru. Eleven forty-seven at night. A software engineer is sending her best application to Berlin.

It's dead on arrival. That job was never open to her.

## B · Problem

Job boards are built for volume. Search. Click. Apply. Repeat.

But across borders, volume is the problem.

That listing needs a work permit you don't have. The company won't sponsor a visa. And the match score never tells you.

So you apply everywhere. You hear nothing back. And you slowly burn your name with recruiters.

It isn't a skills problem. It's an information problem.

## C · Logo reveal

So we built Skylark.

A job application service that only puts you forward for roles you can actually take. It explains every decision. And a human checks everything before it's sent.

## D · Product

One profile. Upload your resume, and Skylark pulls out your headline, skills and experience.

Every field is checked on the server. Skills against a curated taxonomy, Stack Overflow tags and the European ESCO catalogue. Even your email domain is verified.

Your dashboard: new matches, active applications, today's progress.

Open any role and see exactly why it fits. Seven factors, each with a score and a sentence you can read.

Hit apply, and AI drafts a tailored resume and cover letter. Every change comes with a reason. Nothing is applied until you accept it.

Then a real person takes over. They run a five-point checklist, submit the application, and record the employer's confirmation reference.

And you watch it all on your tracker. Saved. Applied. Interview.

## E1 · Job pipeline

Now, under the hood.

Listings stream in from public job APIs: Arbeitnow, sixteen Greenhouse company boards, and others when they're configured.

Raw HTML becomes clean fields: title, seniority, location, salary, sponsorship and skills.

A SHA-256 fingerprint kills duplicates. Stale listings get closed. And if nothing refreshes for twenty-four hours, candidates are told.

## E2 · Match engine

Then the match engine scores every role against you.

Skills carry thirty percent. Eligibility, twenty. Experience, eighteen. Location, twelve. Sponsorship, eight. Preferences, seven. Education, five.

The score is their weighted sum.

And here's the rule that changes everything. If a role won't sponsor someone who needs it, the score is capped at thirty-five.

However good your skills look, a job you can't legally take will never outrank one you can.

## F · Engineering

The whole product is one Next.js app: the website, the candidate app, an operations console and a shared inbox.

Every service talks to one repository interface. In production, that's Supabase Postgres, with row-level security on every table.

No credentials? The same interface runs on a seeded in-memory store. The whole product works on a laptop, with zero setup.

Security isn't assumed. It's tested. The test suite runs every migration on a real Postgres engine, and proves one candidate can never read another's data.

AI sits behind an interface too. Claude drafts the tailoring, its output is validated against a schema, and if the model is unavailable, a deterministic rules engine takes over.

Background work runs through a queue. Every task carries an idempotency key, no two workers claim the same job, and failures back off before they're set aside.

## G · Live today

And it's live today, at skylarkgo.in.

Live job listings. Google sign-in. Chat-style onboarding. Subscriptions in rupees through Razorpay. And a specialist review queue with a twenty-four hour target.

Next: more job sources for India, and matching every candidate against the entire catalogue.

## H · Close

Skylark doesn't try to send more applications. It tries to send the right ones, and to show you why.

Fewer applications. Better reasons. And a person checking every one.

Skylark. Your next move, already in motion.
