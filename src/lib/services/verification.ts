import "server-only";
import { systemRepo } from "@/lib/data";
import type { ProfileInput } from "@/lib/domain/schemas";
import type { CandidateProfile, GithubEnrichment, ProfileFlag, ProfileVerification, Skill, User } from "@/lib/domain/types";
import { serverEnv } from "@/lib/env";
import { findCity, findRegion, isValidCountry, listCities, listRegions } from "@/lib/geo";
import { fieldErrors } from "@/lib/infra/errors";
import { logger } from "@/lib/infra/logger";
import { rateLimit } from "@/lib/infra/rate-limit";
import { fetchGithubProfile } from "@/lib/integrations/github";
import { lookupLocal, skillKey } from "@/lib/skills/catalog";
import { verifySkills } from "@/lib/skills/verify";
import { checkGithub } from "@/lib/validation/links";

/* ---------- Reference data checks (server-side, authoritative) ---------- */

/**
 * Validates everything the browser can't: countries, regions and cities against the location
 * dataset, and every skill against the recognised vocabularies. Skill names are replaced with
 * their canonical spelling. Throws field-level errors.
 */
export async function checkReferenceData(data: ProfileInput, opts: { requireLocation: boolean }): Promise<ProfileInput> {
  const errors: Record<string, string> = {};
  const { country, region, city } = data.location;

  if (country && !isValidCountry(country)) errors["location.country"] = "Choose a country from the list";
  else if (country) {
    const regions = listRegions(country) ?? [];
    const regionMatch = region ? findRegion(country, region) : null;
    if (region && !regionMatch) errors["location.region"] = "Choose a state or region from the list";
    else if (!region && regions.length > 0 && (opts.requireLocation || city)) errors["location.region"] = "Choose your state or region";
    if (city && !errors["location.region"]) {
      const known = listCities(country, regionMatch?.name);
      // A handful of regions have no cities in the dataset; there the typed name is kept as entered.
      if (known && known.length > 0) {
        const match = findCity(country, regionMatch?.name ?? "", city);
        if (!match) errors["location.city"] = "Choose a city from the list";
        else data.location.city = match;
      }
    }
    if (regionMatch) data.location.region = regionMatch.name;
  }
  if (opts.requireLocation) {
    if (!country) errors["location.country"] = "Choose your country";
    if (!city) errors["location.city"] ??= "Choose your city";
  }

  const countryLists: [string, string[]][] = [
    ["citizenship", data.citizenship],
    ["relocationCountries", data.relocationCountries],
    ["preferredCountries", data.preferredCountries],
    ["workAuthorizations", data.workAuthorizations.map((a) => a.country)],
  ];
  for (const [key, list] of countryLists) {
    if (list.some((c) => !isValidCountry(c))) errors[key] = "Contains an unknown country";
  }

  // Skills: the profile list plus every "skills used" tag on experience entries.
  const names = [...new Set([...data.skills.map((s) => s.name), ...data.experience.flatMap((e) => e.skills)].map((n) => n.trim()))];
  const verdicts = await verifySkills(names);
  const canonical = new Map<string, string>();
  const problems = new Map<string, string>();
  names.forEach((n, i) => {
    const v = verdicts[i]!;
    if (v.ok) canonical.set(n, v.term.name);
    else problems.set(n, v.message);
  });
  data.skills.forEach((s, i) => {
    const p = problems.get(s.name.trim());
    if (p) errors[`skills.${i}.name`] = p;
  });
  data.experience.forEach((e, i) => {
    const bad = e.skills.find((s) => problems.has(s.trim()));
    if (bad) errors[`experience.${i}.skills`] = problems.get(bad.trim())!;
  });

  if (Object.keys(errors).length) {
    const skillIssue = Object.keys(errors).some((k) => k.startsWith("skills.") || k.endsWith(".skills"));
    throw fieldErrors(errors, skillIssue ? "Some skills couldn't be verified — pick them from the suggestions." : "Please fix the highlighted fields.");
  }

  // Merge skills that resolve to the same canonical name, keeping the stronger rating.
  const merged = new Map<string, Skill>();
  for (const s of data.skills) {
    const name = canonical.get(s.name.trim()) ?? s.name.trim();
    const prev = merged.get(skillKey(name));
    if (!prev || s.level > prev.level || (s.level === prev.level && s.years > prev.years)) merged.set(skillKey(name), { ...s, name });
  }
  data.skills = [...merged.values()];
  data.experience = data.experience.map((e) => ({ ...e, skills: [...new Set(e.skills.map((s) => canonical.get(s.trim()) ?? s.trim()))] }));
  return data;
}

/* ---------- GitHub enrichment ---------- */

const ENRICHMENT_TTL_MS = 24 * 3600_000;

/**
 * Confirms the GitHub account through the official API and collects public evidence (languages,
 * repositories). A username that doesn't exist is rejected on the field; an API outage keeps the
 * link but flags it for a reviewer.
 */
export async function resolveGithub(user: User, githubUrl: string | undefined, previous: GithubEnrichment | undefined, opts: { force?: boolean } = {}): Promise<GithubEnrichment | undefined> {
  if (!githubUrl) return undefined;
  const parsed = checkGithub(githubUrl);
  if (!parsed.ok || !parsed.handle) throw fieldErrors({ "links.github": parsed.ok ? "That isn't a valid GitHub username" : parsed.error });
  const fresh = previous && previous.username.toLowerCase() === parsed.handle.toLowerCase() && previous.status === "verified" && Date.now() - new Date(previous.fetchedAt).getTime() < ENRICHMENT_TTL_MS;
  if (fresh && !opts.force) return previous;
  try {
    await rateLimit("enrich", user.id);
  } catch {
    return previous && previous.username.toLowerCase() === parsed.handle.toLowerCase() ? previous : { ...emptyGithub(parsed.handle), error: "Verification paused — too many GitHub lookups this hour" };
  }
  const result = await fetchGithubProfile(parsed.handle);
  if (result.status === "not_found") throw fieldErrors({ "links.github": `There's no GitHub account named “${parsed.handle}”` });
  if (result.status === "unavailable") logger.warn("github.enrich.unavailable", { userId: user.id, error: result.error });
  return result;
}

function emptyGithub(username: string): GithubEnrichment {
  return { status: "unavailable", username, profileUrl: `https://github.com/${username}`, name: null, bio: null, publicRepos: 0, followers: 0, accountCreatedAt: null, languages: [], verifiedSkills: [], projects: [], fetchedAt: new Date().toISOString() };
}

/* ---------- Automatic flags for reviewers ---------- */

const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const monthsBetween = (a: string, b: string) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + (Number(b.slice(5, 7)) - Number(a.slice(5, 7)));

/** Consistency checks a human should look at. None of them block the candidate on their own. */
export function computeFlags(profile: CandidateProfile, user: Pick<User, "fullName">, github: GithubEnrichment | undefined, ctx: { hasResume: boolean; emailConfirmed: boolean }): ProfileFlag[] {
  const flags: ProfileFlag[] = [];
  const now = new Date().toISOString().slice(0, 7);

  if (github?.status === "unavailable") flags.push({ code: "github_unverified", severity: "warning", field: "links.github", message: `GitHub account couldn't be confirmed yet (${github.error ?? "GitHub unavailable"}).` });
  if (github?.status === "verified") {
    if (github.name) {
      const a = new Set(fold(github.name).split(/[^\p{L}]+/u).filter((t) => t.length >= 2));
      const shared = fold(user.fullName).split(/[^\p{L}]+/u).some((t) => t.length >= 2 && a.has(t));
      if (!shared) flags.push({ code: "github_name_mismatch", severity: "warning", field: "links.github", message: `GitHub profile name “${github.name}” doesn't match the account name.` });
    }
    const expertTech = profile.skills.filter((s) => s.level >= 4 && lookupLocal(s.name)?.ref).map((s) => s.name);
    const unsupported = expertTech.filter((n) => !github.verifiedSkills.includes(n));
    if (github.publicRepos > 0 && expertTech.length >= 3 && unsupported.length === expertTech.length) {
      flags.push({ code: "skills_not_on_github", severity: "info", field: "skills", message: `Rated advanced in ${unsupported.slice(0, 4).join(", ")}, but none of these appear in their public GitHub repositories.` });
    }
  }
  if (profile.links.linkedin) flags.push({ code: "linkedin_self_reported", severity: "info", field: "links.linkedin", message: "LinkedIn link is self-reported. LinkedIn has no public profile API, so open it to confirm it belongs to this person." });

  const starts = profile.experience.map((e) => e.startDate).filter(Boolean).sort();
  if (starts.length) {
    const spanYears = Math.max(0, monthsBetween(starts[0]!, now) / 12);
    if (profile.yearsExperience > spanYears + 3) flags.push({ code: "experience_years_mismatch", severity: "warning", field: "yearsExperience", message: `Claims ${profile.yearsExperience} years of experience, but listed roles start in ${starts[0]!.slice(0, 4)} (about ${Math.round(spanYears)} years).` });
  }
  const current = profile.experience.filter((e) => !e.endDate);
  if (current.length >= 3) flags.push({ code: "many_current_roles", severity: "info", field: "experience", message: `${current.length} roles are marked as current at the same time.` });
  const inflated = profile.skills.filter((s) => s.years > profile.yearsExperience + 2);
  if (inflated.length) flags.push({ code: "skill_years_exceed_experience", severity: "warning", field: "skills", message: `${inflated.slice(0, 3).map((s) => `${s.name} (${s.years} yrs)`).join(", ")} exceed the ${profile.yearsExperience} years of total experience claimed.` });
  if ((profile.seniority === "executive" && profile.yearsExperience < 6) || (profile.seniority === "lead" && profile.yearsExperience < 4) || (profile.seniority === "senior" && profile.yearsExperience < 2)) {
    flags.push({ code: "seniority_years_mismatch", severity: "info", field: "seniority", message: `Seniority “${profile.seniority}” with ${profile.yearsExperience} years of experience.` });
  }
  if (profile.education.some((e) => e.year > new Date().getFullYear())) flags.push({ code: "education_in_progress", severity: "info", field: "education", message: "Education includes a qualification that hasn't been completed yet." });
  if (!ctx.hasResume) flags.push({ code: "no_resume", severity: "info", message: "No resume uploaded." });
  if (!ctx.emailConfirmed) flags.push({ code: "email_unconfirmed", severity: "info", message: "Email ownership hasn't been confirmed (email confirmation needs Supabase Auth)." });
  return flags;
}

/* ---------- Status transitions on candidate saves ---------- */

/**
 * Records the result of a candidate saving their profile: refreshed enrichment and flags, and the
 * review state. Profiles needing changes go back into the queue once edited; an approved profile
 * returns to review only if the edit raised a new warning. Rejections stand until staff reopen them.
 */
export async function recordSubmission(user: User, profile: CandidateProfile, github: GithubEnrichment | undefined, ctx: { hasResume: boolean }): Promise<ProfileVerification> {
  const repo = systemRepo();
  const prev = await repo.getVerification(user.id);
  const flags = computeFlags(profile, user, github, { hasResume: ctx.hasResume, emailConfirmed: serverEnv().dataMode === "supabase" });
  const now = new Date().toISOString();
  const enrichment = { ...(prev?.enrichment ?? {}), github };
  if (!github) delete enrichment.github;

  if (!prev) return repo.upsertVerification({ userId: user.id, status: "pending", note: "", flags, enrichment, submittedAt: now, reviewedBy: null, reviewedAt: null, approvedSnapshot: null });

  const prevWarnings = new Set(prev.flags.filter((f) => f.severity === "warning").map((f) => f.code));
  const newWarning = flags.some((f) => f.severity === "warning" && !prevWarnings.has(f.code));
  const backToQueue = prev.status === "changes_requested" || (prev.status === "approved" && newWarning);
  return repo.upsertVerification({
    ...prev,
    flags,
    enrichment,
    ...(backToQueue ? { status: "pending" as const, submittedAt: now, reviewedBy: null, reviewedAt: null } : {}),
  });
}
