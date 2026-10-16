import { countryName, SENIORITY_RANK } from "@/lib/domain/constants";
import { authorizedCountries } from "@/lib/domain/profile";
import type {
  CandidateProfile,
  Company,
  Eligibility,
  FactorRating,
  Job,
  MatchBreakdown,
  MatchFactor,
} from "@/lib/domain/types";
import { requiredDegree } from "@/lib/pipeline/normalize-degree";
import { clamp, normalizeSkill } from "@/lib/utils";

export const MATCH_MODEL_VERSION = "match-v2.0";

/** Published weights: every score is the weighted sum of these factors (capped when ineligible). */
export const FACTOR_WEIGHTS = {
  skills: 0.3,
  experience: 0.18,
  education: 0.05,
  eligibility: 0.2,
  location: 0.12,
  sponsorship: 0.08,
  preferences: 0.07,
} as const;

/** Evidence gathered outside the profile form, e.g. languages seen in public GitHub repositories. Explanatory only. */
export interface MatchContext {
  verifiedSkills?: string[];
}

/** Skills that partially substitute for each other. Half credit when only a sibling is present. */
const SKILL_FAMILIES: string[][] = [
  ["react", "nextjs", "vue", "svelte", "angular"],
  ["typescript", "javascript"],
  ["postgresql", "mysql", "sqlserver", "sql"],
  ["aws", "gcp", "azure"],
  ["python", "go", "java", "kotlin", "scala", "rust"],
  ["kubernetes", "docker", "terraform"],
  ["figma", "sketch", "framer"],
  ["pytorch", "tensorflow", "jax"],
  ["kafka", "rabbitmq", "pubsub"],
  ["productstrategy", "roadmapping", "productdiscovery"],
  ["tableau", "looker", "powerbi"],
];

const FX_TO_USD: Record<string, number> = { USD: 1, EUR: 1.08, GBP: 1.27, CAD: 0.73, AUD: 0.66, SGD: 0.74, CHF: 1.12, AED: 0.27, INR: 0.012 };
const toUSD = (amount: number, currency: string) => amount * (FX_TO_USD[currency] ?? 1);

function rate(score: number): FactorRating {
  if (score >= 80) return "strong";
  if (score >= 60) return "moderate";
  return "weak";
}

function familyOf(skill: string) {
  return SKILL_FAMILIES.find((f) => f.includes(skill));
}

function scoreSkills(profile: CandidateProfile, job: Job, ctx: MatchContext) {
  const owned = new Map(profile.skills.map((s) => [normalizeSkill(s.name), s]));
  const verified = new Set((ctx.verifiedSkills ?? []).map(normalizeSkill));
  const matched: string[] = [];
  const transferable: string[] = [];
  const missing: string[] = [];
  const evidenced: string[] = [];
  let credit = 0;

  for (const raw of job.requiredSkills) {
    const key = normalizeSkill(raw);
    const direct = owned.get(key);
    if (direct) {
      matched.push(raw);
      credit += 0.7 + 0.3 * (direct.level / 5);
      if (verified.has(key)) evidenced.push(raw);
      continue;
    }
    // Skills only seen on GitHub are evidence, not claims: they never add score on their own.
    const sibling = familyOf(key)?.find((k) => k !== key && owned.has(k));
    if (sibling) {
      transferable.push(raw);
      credit += 0.5;
    } else {
      missing.push(raw);
    }
  }

  if (job.requiredSkills.length === 0) {
    // The listing names no specific skills: neutral rather than a perfect or failing score.
    return { factor: factor("skills", "Skills", 60, "moderate", "The listing doesn't name specific skills, so this is a neutral estimate — check the original posting."), matched, transferable, missing, evidenced };
  }

  const niceHits = job.niceToHaveSkills.filter((s) => owned.has(normalizeSkill(s))).length;
  const required = job.requiredSkills.length;
  const base = (credit / required) * 90;
  const bonus = job.niceToHaveSkills.length ? (niceHits / job.niceToHaveSkills.length) * 10 : 5;
  const score = Math.round(clamp(base + bonus, 0, 100));

  let reason =
    missing.length === 0
      ? `Covers all ${required} skills the listing asks for${transferable.length ? `, ${transferable.length} via closely related experience` : ""}.`
      : `Matches ${matched.length} of ${required} skills the listing asks for; missing ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? ` +${missing.length - 3}` : ""}.`;
  if (evidenced.length) reason += ` ${evidenced.slice(0, 3).join(", ")} also ${evidenced.length === 1 ? "appears" : "appear"} in your public GitHub repositories (supporting evidence, not a verified credential).`;

  return { factor: factor("skills", "Skills", score, rate(score), reason), matched, transferable, missing, evidenced };
}

const DEGREE_RANK: Record<string, number> = { "High school": 0, "Certificate or bootcamp": 1, Diploma: 1, Associate: 2, "Bachelor's": 3, "Master's": 4, MBA: 4, Doctorate: 5 };
const REQUIRED_RANK = { any: 2, bachelor: 3, master: 4, doctorate: 5 } as const;
const REQUIRED_LABEL = { any: "a degree", bachelor: "a bachelor's degree", master: "a master's degree", doctorate: "a doctorate" } as const;

function scoreEducation(profile: CandidateProfile, job: Job) {
  const need = requiredDegree(job);
  const thisYear = new Date().getFullYear();
  const completed = profile.education.filter((e) => e.year <= thisYear);
  const best = completed.reduce((m, e) => Math.max(m, DEGREE_RANK[e.degree] ?? 0), -1);
  const bestLabel = completed.find((e) => DEGREE_RANK[e.degree] === best);
  if (!need) {
    return factor("education", "Education", 80, "strong", "The listing doesn't state a degree requirement.");
  }
  if (best < 0) {
    return factor("education", "Education", 40, "weak", `Asks for ${REQUIRED_LABEL[need]}; add your education so this can be checked.`);
  }
  if (best >= REQUIRED_RANK[need]) {
    return factor("education", "Education", 100, "strong", `Asks for ${REQUIRED_LABEL[need]}; you have a ${bestLabel!.degree.toLowerCase()} in ${bestLabel!.field}.`);
  }
  const gap = REQUIRED_RANK[need] - best;
  const score = gap === 1 ? 55 : 30;
  return factor("education", "Education", score, rate(score), `Asks for ${REQUIRED_LABEL[need]}; your highest completed qualification is ${bestLabel!.degree.toLowerCase()}.`);
}

function scoreExperience(profile: CandidateProfile, job: Job) {
  const years = profile.yearsExperience;
  const yearsScore = job.minYears <= 0 ? 100 : clamp((years / job.minYears) * 100, 0, 100);
  const diff = SENIORITY_RANK[profile.seniority] - SENIORITY_RANK[job.seniority];
  const seniorityScore = diff === 0 ? 100 : Math.abs(diff) === 1 ? 72 : 40;
  const score = Math.round(yearsScore * 0.55 + seniorityScore * 0.45);

  let reason: string;
  if (years >= job.minYears && diff === 0) reason = `${years} years of experience at the expected ${job.seniority} level.`;
  else if (years < job.minYears)
    reason = years >= job.minYears * 0.85 ? `${years} of ${job.minYears}+ years required — close to the bar.` : `${years} of ${job.minYears}+ years required — a stretch role.`;
  else if (diff > 0) reason = `More senior than the role (${years} yrs); may be over-qualified.`;
  else reason = `${years} years, but the role is pitched one level above your current scope.`;

  return factor("experience", "Experience", score, rate(score), reason);
}

interface EligibilityResult {
  eligibility: Eligibility;
  eligibilityFactor: MatchFactor;
  sponsorshipFactor: MatchFactor;
}

function jobCountries(job: Job) {
  return job.workMode === "remote" && job.remoteCountries.length > 0
    ? job.remoteCountries
    : job.locations.map((l) => l.country);
}

function scoreEligibility(profile: CandidateProfile, job: Job, company: Company): EligibilityResult {
  const authorized = authorizedCountries(profile);
  const countries = jobCountries(job);
  const globalRemote = job.workMode === "remote" && job.remoteCountries.length === 0;
  const authorizedIn = countries.find((c) => authorized.has(c));

  if (globalRemote || authorizedIn) {
    const where = globalRemote ? "this globally remote role" : countryName(authorizedIn!);
    return {
      eligibility: "eligible",
      eligibilityFactor: factor("eligibility", "Eligibility", 100, "strong", `Authorized to work in ${where} without sponsorship.`),
      sponsorshipFactor: factor("sponsorship", "Sponsorship", 100, "strong", "No visa sponsorship needed for this role."),
    };
  }

  const target = countryName(countries[0] ?? "");
  if (job.visaSponsorship === "no") {
    return {
      eligibility: "ineligible",
      eligibilityFactor: factor("eligibility", "Eligibility", 0, "blocked", `Requires existing work authorization in ${target}.`),
      sponsorshipFactor: factor("sponsorship", "Sponsorship", 0, "blocked", `${company.name} states it does not sponsor visas for this role.`),
    };
  }

  const sponsorScore =
    job.visaSponsorship === "yes" ? 90 : company.sponsorshipHistory === "frequent" ? 68 : company.sponsorshipHistory === "occasional" ? 48 : 30;
  const sponsorReason =
    job.visaSponsorship === "yes"
      ? `Listing explicitly offers visa sponsorship in ${target}.`
      : company.sponsorshipHistory === "frequent"
        ? `Not stated, but ${company.name} sponsors frequently based on public filings.`
        : company.sponsorshipHistory === "occasional"
          ? `Not stated; ${company.name} has sponsored occasionally.`
          : "Sponsorship not stated and no sponsorship history found.";

  return {
    eligibility: "needs_sponsorship",
    eligibilityFactor: factor(
      "eligibility",
      "Eligibility",
      job.visaSponsorship === "yes" ? 75 : 55,
      job.visaSponsorship === "yes" ? "moderate" : "weak",
      `Eligible with an employer-sponsored visa for ${target}.`,
    ),
    sponsorshipFactor: factor("sponsorship", "Sponsorship", sponsorScore, rate(sponsorScore), sponsorReason),
  };
}

function scoreLocation(profile: CandidateProfile, job: Job) {
  const home = profile.location.country;
  const countries = jobCountries(job);
  let score: number;
  let reason: string;

  if (job.workMode === "remote" && (job.remoteCountries.length === 0 || job.remoteCountries.includes(home))) {
    score = 100;
    reason = `Remote role open to candidates in ${countryName(home)}.`;
  } else if (countries.includes(home)) {
    const sameCity = job.locations.some((l) => l.city.toLowerCase() === profile.location.city.toLowerCase());
    score = sameCity ? 100 : 90;
    reason = sameCity ? `Based in ${profile.location.city}, where you live.` : `In ${countryName(home)}, your current country.`;
  } else if (countries.some((c) => profile.preferredCountries.includes(c))) {
    score = profile.willingToRelocate ? 82 : 62;
    reason = `${countryName(countries.find((c) => profile.preferredCountries.includes(c))!)} is one of your target countries.`;
  } else if (profile.willingToRelocate && (profile.relocationCountries.length === 0 || countries.some((c) => profile.relocationCountries.includes(c)))) {
    score = 64;
    reason = `Requires relocation to ${countryName(countries[0]!)}, which you're open to.`;
  } else {
    score = 22;
    reason = `${countryName(countries[0] ?? "")} isn't in your target or relocation countries.`;
  }

  if (profile.remotePreference === "remote" && job.workMode === "onsite") {
    score = Math.max(0, score - 25);
    reason += " Fully on-site, but you prefer remote.";
  }
  return factor("location", "Location", score, rate(score), reason);
}

function scorePreferences(profile: CandidateProfile, job: Job) {
  const titleTokens = new Set(job.title.toLowerCase().split(/[^a-z]+/).filter((t) => t.length > 2));
  const roleHit = profile.preferredRoles.some((r) =>
    r.toLowerCase().split(/[^a-z]+/).filter((t) => t.length > 2).some((t) => titleTokens.has(t)),
  );
  let score = roleHit ? 85 : 45;
  const notes: string[] = [roleHit ? "Title aligns with your preferred roles" : "Title is adjacent to your preferred roles"];

  if (job.salary && profile.salaryExpectation) {
    const jobMax = toUSD(job.salary.max, job.salary.currency);
    const want = toUSD(profile.salaryExpectation.min, profile.salaryExpectation.currency);
    if (jobMax >= want) {
      score += 15;
      notes.push("salary meets your floor");
    } else {
      score -= 20;
      notes.push("salary is below your floor");
    }
  }
  score = Math.round(clamp(score, 0, 100));
  return factor("preferences", "Preferences", score, rate(score), `${notes.join("; ")}.`);
}

function factor(key: MatchFactor["key"], label: string, score: number, rating: FactorRating, reason: string): MatchFactor {
  return { key, label, score, rating, reason, weight: FACTOR_WEIGHTS[key] };
}

export interface MatchResult {
  score: number;
  breakdown: MatchBreakdown;
}

export function scoreMatch(profile: CandidateProfile, job: Job, company: Company, ctx: MatchContext = {}): MatchResult {
  const skills = scoreSkills(profile, job, ctx);
  const experience = scoreExperience(profile, job);
  const education = scoreEducation(profile, job);
  const elig = scoreEligibility(profile, job, company);
  const location = scoreLocation(profile, job);
  const preferences = scorePreferences(profile, job);

  const factors = [skills.factor, experience, education, elig.eligibilityFactor, location, elig.sponsorshipFactor, preferences];
  let score = factors.reduce((acc, f) => acc + f.score * f.weight, 0);
  if (elig.eligibility === "ineligible") score = Math.min(score, 35);
  score = Math.round(clamp(score, 0, 100));

  const strongest = [...factors].sort((a, b) => b.score * b.weight - a.score * a.weight)[0]!;
  const weakest = [...factors].sort((a, b) => a.score - b.score)[0]!;
  const summary =
    elig.eligibility === "ineligible"
      ? `Blocked on eligibility: ${elig.eligibilityFactor.reason}`
      : weakest.score >= 70
        ? `Well-rounded fit, led by ${strongest.label.toLowerCase()}.`
        : `Strong on ${strongest.label.toLowerCase()}; watch ${weakest.label.toLowerCase()} — ${weakest.reason.charAt(0).toLowerCase()}${weakest.reason.slice(1)}`;

  return {
    score,
    breakdown: {
      factors,
      eligibility: elig.eligibility,
      matchedSkills: skills.matched,
      missingSkills: skills.missing,
      transferableSkills: skills.transferable,
      verifiedSkills: skills.evidenced,
      summary,
      modelVersion: MATCH_MODEL_VERSION,
    },
  };
}

/** Rank by score, then favour eligibility and recency. */
export function rankMatches<T extends { score: number; breakdown: MatchBreakdown; job: { postedAt: string } }>(items: T[]) {
  const eligibilityBoost: Record<Eligibility, number> = { eligible: 2, needs_sponsorship: 0, ineligible: -10 };
  return [...items].sort((a, b) => {
    const sa = a.score + eligibilityBoost[a.breakdown.eligibility];
    const sb = b.score + eligibilityBoost[b.breakdown.eligibility];
    if (sb !== sa) return sb - sa;
    return new Date(b.job.postedAt).getTime() - new Date(a.job.postedAt).getTime();
  });
}
