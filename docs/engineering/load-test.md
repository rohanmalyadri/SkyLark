# Load test: how many users the backend handles

**Short answer:** one copy of the Skylark server handled **600 people using the app at the same
moment**, each making a request every second (about **420 requests a second**), with no errors and
95% of answers inside one second. It started to slow down past that and failed at 1,200. Vercel
runs more copies automatically when traffic grows, so in production the limit is the database, not
this number. See "What this means for the live site" below.

## What was tested

`scripts/load-test.mjs` (`npm run loadtest`) starts a number of "virtual users" at once. Each one
acts like a signed-in candidate with the app open and, about once a second:

| Share | Request | Why |
|---|---|---|
| 60% | `GET /api/v1/matches` | The main API: ranked matches with reasons. The heaviest read. |
| 20% | `GET /api/v1/applications` | The tracker. |
| 10% | `GET /api/skills/suggest?q=...` | Typing a skill. |
| 10% | `GET /api/health` | One database read. |

It runs each step (50 users, 100, 200 ...) for 20 seconds and records how long every request takes.
A step is **healthy** when fewer than 1% of requests fail and 95% finish within 1 second.

## Results (27 November 2026)

Production build (`npm run build` then `npm start`), demo mode, one Node.js process on a 4-core
cloud machine. The load generator ran on the same machine, so it was competing for the same CPU;
the server on its own would do a little better.

| Users at once | Requests / second | Typical (p50) | p95 | p99 | Errors | Healthy |
|---:|---:|---:|---:|---:|---:|:---:|
| 50 | 46 | 6 ms | 129 ms | 155 ms | 0% | yes |
| 100 | 93 | 4 ms | 122 ms | 142 ms | 0% | yes |
| 200 | 183 | 5 ms | 126 ms | 151 ms | 0% | yes |
| 400 | 355 | 18 ms | 200 ms | 422 ms | 0% | yes |
| 500 | 414 | 63 ms | 415 ms | 1,263 ms | 0% | yes |
| **600** | **424** | **217 ms** | **936 ms** | 2,368 ms | **0%** | **yes** |
| 800 | 432 | 372 ms | 3,297 ms | 6,543 ms | 0% | no |
| 1,200 | 390 | 706 ms | 10,000 ms | 10,005 ms | 8.5% | no |

What the numbers say:

- Up to 400 users, almost every answer came back in well under a quarter of a second.
- The server tops out at roughly **430 requests a second**. Past that, extra users just wait in
  line: at 800 nothing failed, but some people waited over 3 seconds.
- At 1,200 users requests began timing out after 10 seconds. That is the breaking point for one
  copy of the server.
- `/api/skills/suggest` was the slowest endpoint at every step (about 130 ms) because it asks two
  outside services (ESCO and Stack Overflow) for suggestions. In this test
  environment those outside calls were slow, so treat that figure as an upper bound. Everything else answered in single-digit milliseconds until
  the CPU filled up.

Raw numbers, per endpoint and per step: [load-test-results.json](load-test-results.json).

### The rate limiter also works under load

The demo data has only nine candidate accounts, so for the capacity run above each account's
per-user limit was raised in a local build (never committed) to let nine accounts stand in for
hundreds of different people. A second run kept the real limits: at 200 users, 1,342 requests (about
18%) got "429 Too many requests" because 22 virtual users were sharing each account, which is the
limiter doing its job. Real users each have their own account, so normal use never hits it.

## What this means for the live site

- **Real users are much lighter than virtual ones.** A virtual user makes a request every second; a
  real person reading their matches makes one every 10 to 30 seconds. On that basis one server copy
  covers several thousand people online at the same time.
- **Vercel adds copies automatically**, so the Next.js server is not the bottleneck.
- **The database is.** This test used demo mode (data in memory). On the live site every request
  also makes one to three trips to Supabase in Sydney, which adds roughly 10 to 50 ms each, and the
  Supabase free plan allows a limited number of connections at once. Upgrade Supabase before
  Vercel if traffic grows.
- **Match lists are bigger in production.** A demo candidate has 27 matches; a live one can have
  up to 2,000 out of about 11,500 jobs. `/api/v1/matches` returns the whole list in one response,
  so on the live site it is slower and heavier than here. Paging that response is the first fix if
  this endpoint gets real traffic.

## Run it yourself

```bash
npm run build
SESSION_SECRET=any-32-character-or-longer-value npm start                     # terminal 1
SESSION_SECRET=same-value npm run loadtest -- --spoof-ip --out results.json   # terminal 2
```

Options: `--steps 10,25,50`, `--duration 30` (seconds per step), `--think 1000` (ms between one
user's requests), `--cookie "name=value"` to use a real session instead of the demo accounts.

The script refuses to run against anything except localhost unless you add `--i-own-this-site`.
Don't point it at www.skylarkgo.in without planning it first: it would slow the site for real
users, count against Vercel and Supabase usage, and trip the rate limiter.
