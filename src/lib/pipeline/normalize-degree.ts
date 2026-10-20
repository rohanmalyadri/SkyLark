import type { Job } from "@/lib/domain/types";

/** Mentions of a formal qualification in a job listing. */
export const DEGREE_RE = /\b(bachelor'?s?|master'?s?|ph\.?d|doctorate|degree|diploma|b\.?sc|m\.?sc|b\.?tech|m\.?tech|mba|studium|hochschulabschluss)\b/i;

/** Degree level a listing asks for, if any (used by the education factor). */
export function requiredDegree(job: Pick<Job, "requirements" | "description">): "doctorate" | "master" | "bachelor" | "any" | null {
  const t = `${job.requirements.join("\n")}\n${job.description}`.toLowerCase();
  if (/\b(ph\.?d|doctorate|doctoral)\b/.test(t) && !/\b(ph\.?d|doctorate)\b[^.\n]{0,40}\b(plus|preferred|bonus|nice)\b/.test(t)) return "doctorate";
  if (/\b(master'?s?|m\.?sc|m\.?tech|mba)\b/.test(t)) return /\b(bachelor'?s?|b\.?sc|b\.?tech)\b/.test(t) ? "bachelor" : "master";
  if (/\b(bachelor'?s?|b\.?sc|b\.?tech|b\.?a\.|university degree|college degree|hochschulabschluss|studium)\b/.test(t)) return "bachelor";
  if (/\bdegree\b/.test(t)) return "any";
  return null;
}
