#!/usr/bin/env node
/**
 * Simple load test for Skylark's main API. No dependencies: plain Node 20+ fetch.
 *
 * It runs "virtual users" in steps (10, 25, 50, ... at a time). Each virtual user behaves like a
 * signed-in candidate with the app open: it loads its ranked matches (the main API), its
 * application tracker, a skill suggestion while typing and the health check, pausing about a
 * second between requests. For each step it reports requests per second, response times and
 * errors, then names the largest step that stayed healthy.
 *
 *   Local, demo mode (no Supabase keys), against a production build:
 *     npm run build
 *     SESSION_SECRET=<any 32+ characters> npm start            # terminal 1
 *     SESSION_SECRET=<same value> npm run loadtest             # terminal 2
 *
 *   Options (all optional):
 *     --url http://localhost:3000   Server to test. Anything not on localhost also needs --i-own-this-site.
 *     --steps 10,25,50,100,200      Virtual users per step.
 *     --duration 20                 Seconds per step.
 *     --think 1000                  Average pause between one user's requests, in ms.
 *     --cookie "name=value"         Use one real session cookie instead of minted demo ones.
 *     --spoof-ip                    Give each user its own X-Forwarded-For (local servers only), so
 *                                   per-IP limits treat them as different people, as they would be.
 *     --out docs/engineering/load-test-results.json
 *
 * Healthy means: under 1% server errors or timeouts, and 95% of requests answered within 1 second.
 * 429 "too many requests" answers are counted separately: they are the rate limiter doing its job.
 */
import { createHash, createHmac } from "node:crypto";
import { writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};
const flag = (name) => args.includes(`--${name}`);

const BASE = opt("url", "http://localhost:3000").replace(/\/$/, "");
const STEPS = opt("steps", "10,25,50,100,200").split(",").map(Number).filter((n) => n > 0);
const DURATION_S = Number(opt("duration", "20"));
const THINK_MS = Number(opt("think", "1000"));
const OUT = opt("out", "");
const TIMEOUT_MS = 10_000;
const P95_LIMIT_MS = 1_000;
const ERROR_LIMIT = 0.01;

const local = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(BASE);
if (!local && !flag("i-own-this-site")) {
  console.error(`Refusing to load-test ${BASE}: it isn't localhost. Only test servers you run, and add --i-own-this-site to confirm.`);
  process.exit(2);
}
if (!local && flag("spoof-ip")) {
  console.error("--spoof-ip only makes sense on a local server; hosted platforms overwrite X-Forwarded-For.");
  process.exit(2);
}

/* ---------- sessions ---------- */

// The nine seeded candidates in demo mode (src/lib/seed/people.ts).
const CANDIDATE_KEYS = ["demo", "c-mateo", "c-wei", "c-fatima", "c-daniel", "c-aisha", "c-hiro", "c-priya", "c-lucas"];

/** Same as seedId() in src/lib/seed/ids.ts. */
function seedId(key) {
  const h = createHash("sha1").update(`autoapply:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)}${h.slice(18, 20)}-${h.slice(20, 32)}`;
}

/** Same format as createDemoToken() in src/lib/auth/demo-session.ts. */
function demoCookie(uid, secret) {
  const body = Buffer.from(JSON.stringify({ uid, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `aa_session=${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
}

let cookies;
if (opt("cookie", "")) {
  cookies = [opt("cookie", "")];
} else if (process.env.SESSION_SECRET) {
  cookies = CANDIDATE_KEYS.map((k) => demoCookie(seedId(`user:${k}`), process.env.SESSION_SECRET));
} else {
  console.error("Set SESSION_SECRET (the same value the local server runs with) or pass --cookie.");
  process.exit(2);
}

/* ---------- what one user does ---------- */

const SKILL_QUERIES = ["rea", "pyth", "type", "sql", "dock", "java", "figm", "kube", "prod", "data"];
const MIX = [
  // [weight, name, path builder]
  [60, "GET /api/v1/matches", () => "/api/v1/matches"],
  [20, "GET /api/v1/applications", () => "/api/v1/applications"],
  [10, "GET /api/skills/suggest", () => `/api/skills/suggest?q=${SKILL_QUERIES[Math.floor(Math.random() * SKILL_QUERIES.length)]}`],
  [10, "GET /api/health", () => "/api/health"],
];
const TOTAL_WEIGHT = MIX.reduce((s, [w]) => s + w, 0);
const pick = () => {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const m of MIX) if ((r -= m[0]) < 0) return m;
  return MIX[0];
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function hit(path, cookie, ip) {
  const started = performance.now();
  try {
    const res = await fetch(BASE + path, {
      headers: { cookie, accept: "application/json", ...(ip ? { "x-forwarded-for": ip } : {}) },
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    await res.arrayBuffer();
    return { ms: performance.now() - started, status: res.status };
  } catch {
    return { ms: performance.now() - started, status: 0 };
  }
}

async function virtualUser(n, until, stats) {
  const cookie = cookies[n % cookies.length];
  const ip = flag("spoof-ip") ? `10.${(n >> 16) & 255}.${(n >> 8) & 255}.${n & 255}` : null;
  await sleep(Math.random() * THINK_MS); // don't all start in the same millisecond
  while (performance.now() < until) {
    const [, name, path] = pick();
    const r = await hit(path(), cookie, ip);
    const s = (stats.byEndpoint[name] ??= { count: 0, times: [], errors: 0, limited: 0 });
    s.count++;
    s.times.push(r.ms);
    stats.times.push(r.ms);
    if (r.status === 429) {
      stats.limited++;
      s.limited++;
    } else if (r.status === 0 || r.status >= 500 || r.status === 401) {
      stats.errors++;
      s.errors++;
      stats.statuses[r.status] = (stats.statuses[r.status] ?? 0) + 1;
    }
    await sleep(THINK_MS * (0.5 + Math.random()));
  }
}

/* ---------- report ---------- */

const pct = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] : 0);
const round = (n) => Math.round(n);

function summarize(users, stats, seconds) {
  const sorted = [...stats.times].sort((a, b) => a - b);
  const total = sorted.length;
  const out = {
    users,
    requests: total,
    rps: +(total / seconds).toFixed(1),
    p50: round(pct(sorted, 50)),
    p95: round(pct(sorted, 95)),
    p99: round(pct(sorted, 99)),
    errorRate: total ? +(stats.errors / total).toFixed(4) : 0,
    rateLimited: stats.limited,
    statuses: stats.statuses,
    endpoints: Object.fromEntries(
      Object.entries(stats.byEndpoint).map(([k, v]) => {
        const t = [...v.times].sort((a, b) => a - b);
        return [k, { count: v.count, p50: round(pct(t, 50)), p95: round(pct(t, 95)), errors: v.errors, rateLimited: v.limited }];
      }),
    ),
  };
  out.healthy = out.errorRate < ERROR_LIMIT && out.p95 <= P95_LIMIT_MS;
  return out;
}

// Warm up: the first request to each route compiles and caches it.
for (const [, , path] of MIX) await hit(path(), cookies[0], flag("spoof-ip") ? "10.255.255.1" : null);
const probe = await hit("/api/v1/matches", cookies[0], null);
if (probe.status !== 200) {
  console.error(`Warm-up request to /api/v1/matches answered ${probe.status || "no response"}. Is the server running at ${BASE}, and does SESSION_SECRET match?`);
  process.exit(1);
}

console.log(`Load test against ${BASE}: ${DURATION_S}s per step, ~${THINK_MS}ms between each user's requests.\n`);
console.log("users   req/s    p50     p95     p99   errors  429s  healthy");
const results = [];
for (const users of STEPS) {
  const stats = { times: [], errors: 0, limited: 0, statuses: {}, byEndpoint: {} };
  const started = performance.now();
  const until = started + DURATION_S * 1000;
  await Promise.all(Array.from({ length: users }, (_, i) => virtualUser(i, until, stats)));
  const r = summarize(users, stats, (performance.now() - started) / 1000);
  results.push(r);
  console.log(
    `${String(users).padStart(5)} ${String(r.rps).padStart(7)} ${String(r.p50).padStart(5)}ms ${String(r.p95).padStart(5)}ms ${String(r.p99).padStart(5)}ms ${(r.errorRate * 100).toFixed(1).padStart(6)}% ${String(r.rateLimited).padStart(5)}  ${r.healthy ? "yes" : "NO"}`,
  );
  if (!r.healthy && r.p95 > P95_LIMIT_MS * 5) break; // far past the limit: no point pushing harder
}

const healthy = results.filter((r) => r.healthy);
const best = healthy.length ? healthy[healthy.length - 1] : null;
console.log(
  best
    ? `\nHandled ${best.users} users at once (${best.rps} requests/second) with p95 ${best.p95}ms and ${(best.errorRate * 100).toFixed(1)}% errors.`
    : "\nNo step met the bar (p95 under 1s, under 1% errors).",
);

if (OUT) {
  writeFileSync(OUT, JSON.stringify({ target: BASE, ranAt: new Date().toISOString(), durationPerStepS: DURATION_S, thinkMs: THINK_MS, node: process.version, results, capacityUsers: best?.users ?? 0 }, null, 2) + "\n");
  console.log(`Results written to ${OUT}`);
}
