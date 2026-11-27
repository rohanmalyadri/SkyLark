#!/usr/bin/env node
/**
 * Fails if a real-looking key, password or private key sits in any file git tracks.
 * Run it before pushing: `npm run check:secrets`. Add `--history` to scan every past commit too.
 *
 * Secrets belong in `.env.local` (git-ignored) locally and in Vercel's environment settings in
 * production. `.env.example` lists the variable names with empty values and is the only env file
 * the repo should ever contain.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const PATTERNS = [
  ["Supabase secret key", /sb_secret_[A-Za-z0-9_-]{16,}/],
  ["Supabase JWT (anon or service role)", /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/],
  ["Razorpay key", /rzp_(live|test)_[A-Za-z0-9]{10,}/],
  ["Google API key (Gemini)", /AIza[0-9A-Za-z_-]{35}/],
  ["Google OAuth client secret", /GOCSPX-[A-Za-z0-9_-]{20,}/],
  ["Anthropic API key", /sk-ant-[A-Za-z0-9_-]{20,}/],
  ["GitHub token", /\b(ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{30,}/],
  ["Private key", /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  // NAME=value lines for our own secret variables with a value filled in.
  ["Filled-in secret variable", /^[ \t]*(SUPABASE_SERVICE_ROLE_KEY|SESSION_SECRET|CRON_SECRET|RAZORPAY_KEY_SECRET|RAZORPAY_WEBHOOK_SECRET|SMTP_PASSWORD|GOOGLE_CLIENT_SECRET|ANTHROPIC_API_KEY|GEMINI_API_KEY|GITHUB_TOKEN|LIGHTCAST_CLIENT_SECRET|ADZUNA_APP_KEY)[ \t]*=[ \t]*["']?[^\s"'#]{8,}/m],
];

// Big generated or binary files that can't hold a key we wrote.
const SKIP = /(^|\/)(package-lock\.json|.*\.(png|jpe?g|gif|webp|ico|heic|mp4|webm|mov|wav|m4a|mp3|pdf|pptx|woff2?|ttf|otf|glb|ktx2|bin|zip))$/i;

const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 30 });

function scanText(label, text, findings) {
  for (const [name, re] of PATTERNS) {
    const m = text.match(re);
    if (m) findings.push(`${label}: ${name} (${m[0].slice(0, 12)}…)`);
  }
}

const findings = [];
const files = git("ls-files", "-z").split("\0").filter((f) => f && !SKIP.test(f));
const envFiles = files.filter((f) => /(^|\/)\.env(\.|$)/.test(f) && !f.endsWith(".env.example"));
for (const f of envFiles) findings.push(`${f}: env file is tracked by git (only .env.example may be)`);

for (const f of files) {
  let text;
  try {
    text = readFileSync(f, "utf8");
  } catch {
    continue;
  }
  scanText(f, text, findings);
}

if (process.argv.includes("--history")) {
  const commits = git("rev-list", "--all").split("\n").filter(Boolean);
  for (const c of commits) {
    const patch = git("show", "--no-color", "--format=", "--diff-filter=AM", c, "--", ".", ":!package-lock.json", ":!*.png", ":!*.jpg", ":!*.mp4", ":!*.pdf");
    const added = patch.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).join("\n");
    scanText(`commit ${c.slice(0, 7)}`, added, findings);
  }
  console.log(`Scanned ${files.length} tracked files and ${commits.length} commits.`);
} else {
  console.log(`Scanned ${files.length} tracked files.`);
}

if (findings.length) {
  console.error(`\nPossible secrets found (${findings.length}):`);
  for (const f of findings) console.error(`  - ${f}`);
  console.error("\nMove each value into .env.local or Vercel's environment settings, then rotate the key: anything pushed to GitHub should be treated as leaked.");
  process.exit(1);
}
console.log("No secrets found.");
