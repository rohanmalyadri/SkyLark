/**
 * Plausibility checks for free text people type into the product (names, headlines, roles,
 * companies, schools). They reject keyboard mashing such as "jhfavd" or "asdfgh" while leaving
 * real words, names and technical jargon alone. Runs identically in the browser and on the server.
 *
 * Letter pairs below are ones that almost never occur inside English words. The list was derived
 * from the letter-pair frequencies of ~6,800 distinct words in English technical documentation
 * ("^" marks the start of a word, "$" the end).
 */
const RARE_BIGRAMS = new Set(
  "aq bg bk bq bw bx bz cf cg cv cw cx dq dx dz fb fd fg fh fj fk fm fp fq fv fw fx fz gb gd gf gj gk gq gx hc hf hj hq hv hx hz jb jc jd jf jg jh jj jk jl jm jn jq jr jt jv jx jy jz kc kj kk kq kv kx kz lq lx lz mq mx nq pj pq pw px pz qa qb qc qd qe qf qg qh qi qj qk qm qn qo qp qq qr qs qt qv qw qx qy qz rx rz sj uq uw vb vd vf vh vj vk vm vn vp vq vt vv vw vx vz wq wx wz xb xd xf xg xj xk xn xq xr xs xv xw xx xz yq yx zb zc zd zf zg zj zk zm zp zq zr zv zw zx".split(" "),
);

const KEYBOARD_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890"];
const VOWELS = /[aeiouy]/;

export interface TokenVerdict {
  token: string;
  reason: "no_vowels" | "keyboard" | "repeated" | "unlikely";
}

/** Judges a single lowercase a–z token. Returns why it looks like mashing, or null. */
function judgeToken(token: string, strict: boolean): TokenVerdict["reason"] | null {
  if (token.length < 4) return null;
  if (/(.)\1{3,}/.test(token)) return "repeated";
  if (KEYBOARD_ROWS.some((row) => row.includes(token) || [...row].reverse().join("").includes(token))) return "keyboard";
  if (!VOWELS.test(token) && token.length >= 5) return "no_vowels";
  const framed = `^${token}$`;
  let rare = 0;
  for (let i = 0; i < framed.length - 1; i++) if (RARE_BIGRAMS.has(framed.slice(i, i + 2))) rare++;
  const ratio = rare / (framed.length - 1);
  const consonantRun = Math.max(0, ...(token.match(/[^aeiouy]+/g) ?? [""]).map((r) => r.length));
  if (strict) {
    if (rare >= 2 && ratio >= 0.25) return "unlikely";
    if (consonantRun >= 5 && rare >= 2) return "unlikely";
    if (consonantRun >= 7) return "unlikely";
  } else if (rare >= 3 && ratio >= 0.35) {
    return "unlikely";
  }
  return null;
}

/**
 * Words that look like random typing. Only plain a–z words are judged; accented and non-Latin
 * words, short words and all-caps acronyms (SRE, HTML) are always accepted.
 */
export function implausibleTokens(text: string, { strict = true }: { strict?: boolean } = {}): TokenVerdict[] {
  const out: TokenVerdict[] = [];
  for (const raw of text.split(/[^\p{L}\p{N}]+/u)) {
    if (!raw || !/^[A-Za-z]+$/.test(raw)) continue;
    if (raw.length <= 6 && raw === raw.toUpperCase()) continue;
    const reason = judgeToken(raw.toLowerCase(), strict);
    if (reason) out.push({ token: raw, reason });
  }
  return out;
}

export const looksLikeGibberish = (text: string, opts?: { strict?: boolean }) => implausibleTokens(text, opts).length > 0;

/** Returns an error message for implausible free text, or null when it reads as real words. */
export function textProblem(text: string, what: string): string | null {
  const t = text.trim();
  if (!t) return null;
  if (!/\p{L}/u.test(t)) return `${what} should contain words`;
  const bad = implausibleTokens(t);
  if (bad.length) return `“${bad[0]!.token}” doesn't look like a real word — check ${what.toLowerCase()} for typos`;
  return null;
}

/* ---------- People's names ---------- */

// Letters in any script, combining marks, and the separators real names use.
const NAME_CHARS = /^[\p{L}\p{M}][\p{L}\p{M}' .\-‘’]*$/u;

/** Validates a person's full name. Deliberately permissive about structure: mononyms and any script are fine. */
export function nameProblem(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2) return "Enter your full name";
  if (name.length > 80) return "Use 80 characters or fewer";
  if (/\d/.test(name)) return "Names can't contain numbers";
  if (!NAME_CHARS.test(name)) return "Use letters, spaces, hyphens and apostrophes only";
  if ((name.match(/\p{L}/gu) ?? []).length < 2) return "Enter your full name";
  if (/(.)\1{2,}/u.test(name.toLowerCase())) return "That doesn't look like a real name";
  if (/[.'\-‘’]{2,}/.test(name)) return "Check the punctuation in your name";
  if (implausibleTokens(name, { strict: false }).length) return "That doesn't look like a real name — check for typos";
  return null;
}

/** Tidies spacing and capitalises all-lowercase or all-uppercase names ("ada LOVELACE" stays as typed). */
export function tidyName(raw: string) {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name !== name.toLowerCase() && name !== name.toUpperCase()) return name;
  return name.toLowerCase().replace(/(^|[\s\-'])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}
