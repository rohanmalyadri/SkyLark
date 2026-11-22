import type { CandidateProfile } from "./types";

/*
 * Chat-style onboarding: the topics the assistant walks through, in order. Shared by the
 * browser (progress, opening question) and the server (which topic to ask next).
 */

export type IntakeDraft = Omit<CandidateProfile, "userId" | "updatedAt">;

export const INTAKE_TOPICS = [
  "headline",
  "location",
  "experience_level",
  "authorization",
  "relocation",
  "roles",
  "countries",
  "work_mode",
  "salary",
  "skills",
  "recent_role",
  "education",
  "links",
  "summary",
] as const;
export type IntakeTopic = (typeof INTAKE_TOPICS)[number];

/** Topics the profile can't be saved without. The rest are asked once and can be skipped. */
export const REQUIRED_TOPICS: IntakeTopic[] = ["headline", "location", "authorization", "roles", "countries", "skills"];

export const TOPIC_LABEL: Record<IntakeTopic, string> = {
  headline: "Headline",
  location: "Where you live",
  experience_level: "Experience level",
  authorization: "Work authorization",
  relocation: "Relocation",
  roles: "Roles you want",
  countries: "Target countries",
  work_mode: "Work mode",
  salary: "Salary",
  skills: "Skills",
  recent_role: "Most recent role",
  education: "Education",
  links: "Links",
  summary: "Summary",
};

/** The question asked when the assistant has nothing better to say (also the opening line). */
export const TOPIC_QUESTION: Record<IntakeTopic, string> = {
  headline: "What's your current job title, or the headline you'd like employers to see? For example, “Senior Full-Stack Engineer”.",
  location: "Where do you live right now? Tell me your city, state or region, and country.",
  experience_level: "How many years of professional experience do you have, and how would you describe your level (entry, mid, senior, lead or executive)?",
  authorization:
    "Which countries are you already allowed to work in, and on what basis (citizen, permanent resident, work visa or student visa)? Also tell me if you'll need visa sponsorship to work elsewhere.",
  relocation: "Are you open to relocating? If so, to which countries, or anywhere?",
  roles: "What job titles are you looking for? You can name up to eight.",
  countries: "Which countries would you like to work in?",
  work_mode: "Do you prefer remote, hybrid or on-site work, or are you open to all three?",
  salary: "What's the minimum annual salary you'd accept, and in which currency? You can say “skip” if you'd rather not say.",
  skills: "What are your main skills? List at least three, and if you can, how many years you've used each and how strong you are at it.",
  recent_role: "Tell me about your most recent job: the title, the company, when you started (and finished, if you've left), and one or two things you achieved there. Say “skip” if you don't have one yet.",
  education: "What's your highest qualification? Tell me the school, the degree, the field of study and the graduation year, or say “skip”.",
  links: "Do you have a LinkedIn, GitHub or portfolio link you'd like to add? Paste them, or say “skip”.",
  summary: "Last one: in a sentence or two, what do you do best and what are you looking for next? Or say “skip”.",
};

export function topicFilled(d: IntakeDraft, topic: IntakeTopic): boolean {
  switch (topic) {
    case "headline":
      return d.headline.trim().length > 0;
    case "location":
      return !!d.location.country && d.location.city.trim().length > 0;
    case "authorization":
      return d.workAuthorizations.length > 0 || d.requiresSponsorship;
    case "roles":
      return d.preferredRoles.length > 0;
    case "countries":
      return d.preferredCountries.length > 0;
    case "skills":
      return d.skills.length >= 3;
    case "experience_level":
      return d.yearsExperience > 0;
    case "recent_role":
      return d.experience.some((e) => e.company.trim() && e.title.trim() && e.startDate);
    case "education":
      return d.education.length > 0;
    case "salary":
      return !!d.salaryExpectation;
    case "links":
      return !!(d.links.linkedin || d.links.github || d.links.portfolio);
    case "summary":
      return d.summary.trim().length > 0;
    case "relocation":
      return d.willingToRelocate;
    case "work_mode":
      return d.remotePreference !== "any";
  }
}

/** Topics still open: required ones until filled, optional ones until asked once. */
export function pendingTopics(d: IntakeDraft, asked: readonly IntakeTopic[]): IntakeTopic[] {
  return INTAKE_TOPICS.filter((t) => !topicFilled(d, t) && (REQUIRED_TOPICS.includes(t) || !asked.includes(t)));
}

export function intakeProgress(d: IntakeDraft, asked: readonly IntakeTopic[]) {
  // The question on screen hasn't been answered yet, so it still counts as open.
  const pending = pendingTopics(d, asked.slice(0, -1)).length;
  return { done: INTAKE_TOPICS.length - pending, total: INTAKE_TOPICS.length };
}

export interface IntakeMessage {
  role: "assistant" | "user";
  text: string;
}

export interface IntakeTurnResult {
  draft: IntakeDraft;
  asked: IntakeTopic[];
  reply: string;
  /** Short labels of what this answer filled in, shown under the user's message. */
  saved: string[];
  /** Topic the reply asks about; null once everything is covered. */
  topic: IntakeTopic | null;
  complete: boolean;
}
