import { beforeEach, describe, expect, it, vi } from "vitest";

const gemini = vi.hoisted(() => ({ next: null as unknown }));
vi.mock("@/lib/ai/gemini", () => ({ geminiJson: vi.fn(async () => gemini.next) }));
vi.mock("@/lib/infra/rate-limit", () => ({ rateLimit: vi.fn(async () => undefined) }));

import { emptyProfile } from "@/lib/ai/heuristic";
import { pendingTopics, type IntakeDraft, type IntakeTopic } from "@/lib/domain/intake";
import type { User } from "@/lib/domain/types";
import { intakeTurn } from "./intake";

const user: User = { id: "u1", email: "a@b.co", fullName: "Asha Rao", role: "candidate", avatarUrl: null, onboardedAt: null, createdAt: "2026-01-01T00:00:00Z" };

function freshDraft(): IntakeDraft {
  const { userId: _u, updatedAt: _t, ...d } = emptyProfile("u1", "2026-01-01T00:00:00Z");
  void _u;
  void _t;
  return { ...d, requiresSponsorship: false, willingToRelocate: false };
}

const ask = (draft: IntakeDraft, asked: IntakeTopic[], message: string) => intakeTurn(user, { draft, asked, history: [{ role: "assistant", text: "Hi" }], message });

describe("chat intake turn", () => {
  beforeEach(() => {
    gemini.next = null;
  });

  it("applies valid extractions and moves to the next pending topic", async () => {
    gemini.next = { updates: { headline: "Backend Engineer", country: "IN", city: "Hyderabad" }, reply: "Nice to meet you! How many years have you worked?", nextTopic: "experience_level" };
    const r = await ask(freshDraft(), ["headline"], "I'm a backend engineer living in Hyderabad, India");
    expect(r.draft.headline).toBe("Backend Engineer");
    // Region is inferred from the city when only one region has it.
    expect(r.draft.location).toEqual({ country: "IN", region: "Telangana", city: "Hyderabad" });
    expect(r.saved).toEqual(["Headline", "Where you live"]);
    expect(r.topic).toBe("experience_level");
    expect(r.reply).toContain("years");
    expect(r.asked).toContain("experience_level");
  });

  it("rejects an unknown city and asks again instead of saving it", async () => {
    gemini.next = { updates: { country: "IN", region: "Telangana", city: "Qwzxtown" }, reply: "Thanks!", nextTopic: "experience_level" };
    const r = await ask(freshDraft(), ["location"], "Qwzxtown, Telangana");
    expect(r.draft.location.city).toBe("");
    expect(r.topic).toBe("location");
    expect(r.reply).toMatch(/couldn't find/i);
  });

  it("drops invalid countries and gibberish roles", async () => {
    gemini.next = { updates: { preferredRoles: ["Data Engineer", "xkqjzvw"], preferredCountries: ["DE", "ZZ"] }, reply: "Great.", nextTopic: "work_mode" };
    const r = await ask(freshDraft(), ["roles"], "data engineer, xkqjzvw in Germany and Zedland");
    expect(r.draft.preferredRoles).toEqual(["Data Engineer"]);
    expect(r.draft.preferredCountries).toEqual(["DE"]);
    expect(r.topic).toBe("roles");
  });

  it("canonicalises skills and clamps levels", async () => {
    gemini.next = { updates: { skills: [{ name: "typescript", level: 9, years: 3 }, { name: "React" }, { name: "PostgreSQL", level: 2, years: 1.3 }] }, reply: "Thanks.", nextTopic: "recent_role" };
    const r = await ask(freshDraft(), ["skills"], "TypeScript 3 years, React, Postgres");
    expect(r.draft.skills.map((s) => s.name)).toEqual(["TypeScript", "React", "PostgreSQL"]);
    expect(r.draft.skills[0]!.level).toBe(5);
    expect(r.draft.skills[2]!.years).toBe(1.5);
  });

  it("keeps a partial role and asks for what's missing", async () => {
    gemini.next = { updates: { recentRole: { title: "Software Engineer", company: "Infosys" } }, reply: "Thanks.", nextTopic: "education" };
    const r = await ask(freshDraft(), ["recent_role"], "Software engineer at Infosys");
    expect(r.draft.experience[0]).toMatchObject({ title: "Software Engineer", company: "Infosys" });
    expect(r.topic).toBe("recent_role");
    expect(r.reply).toMatch(/started/);
  });

  it("marks declined optional topics as covered and finishes when nothing is pending", async () => {
    const d: IntakeDraft = {
      ...freshDraft(),
      headline: "Backend Engineer",
      location: { country: "IN", region: "Telangana", city: "Hyderabad" },
      workAuthorizations: [{ country: "IN", status: "citizen" }],
      preferredRoles: ["Backend Engineer"],
      preferredCountries: ["DE"],
      skills: [
        { name: "Go", level: 3, years: 2 },
        { name: "Python", level: 3, years: 2 },
        { name: "SQL", level: 3, years: 2 },
      ],
    };
    const asked: IntakeTopic[] = ["experience_level", "relocation", "work_mode", "salary", "recent_role", "education", "links", "summary"];
    expect(pendingTopics(d, asked.slice(0, -1))).toEqual(["summary"]);
    gemini.next = { updates: {}, declinedTopics: ["summary"], reply: "All set! Your profile is ready to review.", nextTopic: "none" };
    const r = await ask(d, asked, "skip");
    expect(r.complete).toBe(true);
    expect(r.topic).toBeNull();
  });

  it("never lets the model skip a required topic", async () => {
    gemini.next = { updates: {}, declinedTopics: ["skills"], reply: "Sure, skipping.", nextTopic: "recent_role" };
    const r = await ask(freshDraft(), ["headline"], "skip");
    expect(r.asked).not.toContain("skills");
    expect(r.topic).toBe("headline");
  });

  it("validates links through the same checkers as the form", async () => {
    gemini.next = { updates: { github: "github.com/octocat", linkedin: "not a link" }, reply: "Thanks.", nextTopic: "summary" };
    const r = await ask(freshDraft(), ["links"], "github.com/octocat and my linkedin is not a link");
    expect(r.draft.links.github).toBe("https://github.com/octocat");
    expect(r.draft.links.linkedin).toBeUndefined();
    expect(r.topic).toBe("links");
  });
});

describe("chat intake fallbacks when the model under-extracts", () => {
  it("recovers the country from the message text", async () => {
    gemini.next = { updates: { city: "Pune", country: null }, reply: "Thanks!", nextTopic: "experience_level" };
    const r = await ask(freshDraft(), ["location"], "I want to work in Germany but I live in pune, india");
    expect(r.draft.location).toEqual({ country: "IN", region: "Maharashtra", city: "Pune" });
  });

  it("accepts country names where codes were expected", async () => {
    gemini.next = { updates: { preferredCountries: ["Germany", "Netherlands"], workAuthorizations: [{ country: "India", status: "citizen" }] }, reply: "Thanks!", nextTopic: "work_mode" };
    const r = await ask(freshDraft(), ["countries"], "germany and netherlands, I am an Indian citizen");
    expect(r.draft.preferredCountries).toEqual(["DE", "NL"]);
    expect(r.draft.workAuthorizations).toEqual([{ country: "IN", status: "citizen" }]);
  });

  it("reads LPA salaries as INR lakhs", async () => {
    gemini.next = { updates: { salaryMin: 25, salaryCurrency: null }, reply: "Thanks!", nextTopic: "skills" };
    const r = await ask(freshDraft(), ["salary"], "atleast 25 LPA");
    expect(r.draft.salaryExpectation).toEqual({ min: 2_500_000, currency: "INR" });
  });

  it("ignores null and default-looking values instead of reporting them as saved", async () => {
    gemini.next = { updates: { headline: "Data Analyst", seniority: "mid", yearsExperience: 0, salaryMin: 0, summary: "", skills: [] }, reply: "Thanks!", nextTopic: "location" };
    const r = await ask(freshDraft(), ["headline"], "data analyst");
    expect(r.saved).toEqual(["Headline"]);
    expect(r.draft.salaryExpectation).toBeNull();
  });
});

describe("chat intake city recovery", () => {
  it("finds the city in the message when the model only returns the country", async () => {
    gemini.next = { updates: { headline: "Full Stack Developer", country: "IN" }, reply: "Thanks!", nextTopic: "location" };
    const r = await ask(freshDraft(), ["headline"], "I'm a full stack developer living in Hyderabad, India");
    expect(r.draft.location).toEqual({ country: "IN", region: "Telangana", city: "Hyderabad" });
    expect(r.topic).toBe("experience_level");
  });

  it("asks for the city when only a country was given", async () => {
    gemini.next = { updates: { country: "DE" }, reply: "Thanks!", nextTopic: "experience_level" };
    const r = await ask(freshDraft(), ["location"], "germany");
    expect(r.topic).toBe("location");
    expect(r.reply).toContain("Which city in Germany");
  });
});

describe("chat intake guards", () => {
  it("drops work authorization the candidate never mentioned", async () => {
    gemini.next = { updates: { headline: "Designer", workAuthorizations: [{ country: "IN", status: "citizen" }], yearsExperience: 3 }, reply: "Thanks!", nextTopic: "location" };
    const r = await ask(freshDraft(), ["headline"], "Product designer");
    expect(r.draft.workAuthorizations).toEqual([]);
    expect(r.draft.yearsExperience).toBe(0);
    expect(r.saved).toEqual(["Headline"]);
  });
});

describe("chat intake location fallback", () => {
  it("picks up a location the model ignored", async () => {
    gemini.next = { updates: { headline: "Full Stack Developer" }, reply: "Thanks!", nextTopic: "location" };
    const r = await ask(freshDraft(), ["headline"], "I'm a full stack developer living in Hyderabad, India");
    expect(r.draft.location).toEqual({ country: "IN", region: "Telangana", city: "Hyderabad" });
  });
});

describe("chat intake reads sponsorship and relocation directly when the model misses them", () => {
  it("sets sponsorship from the wording", async () => {
    gemini.next = { updates: { workAuthorizations: [{ country: "IN", status: "citizen" }] }, reply: "Thanks!", nextTopic: "relocation" };
    const yes = await ask(freshDraft(), ["authorization"], "I'm an Indian citizen and would need visa sponsorship abroad");
    expect(yes.draft.requiresSponsorship).toBe(true);
    const no = await ask(freshDraft(), ["authorization"], "Indian citizen, I don't need sponsorship");
    expect(no.draft.requiresSponsorship).toBe(false);
  });

  it("takes relocation countries from the answer", async () => {
    gemini.next = { updates: { willingToRelocate: true }, reply: "Thanks!", nextTopic: "roles" };
    const r = await ask(freshDraft(), ["relocation"], "Yes, Germany or the Netherlands");
    expect(r.draft.willingToRelocate).toBe(true);
    expect(r.draft.relocationCountries.sort()).toEqual(["DE", "NL"]);
  });
});

describe("chat intake education follow-up", () => {
  it("keeps a qualification missing its year and completes it from a follow-up", async () => {
    gemini.next = { updates: { education: [{ school: "SRM University AP", degree: "Bachelor's", field: "Computer Science" }] }, reply: "Thanks!", nextTopic: "education" };
    const first = await ask(freshDraft(), ["education"], "B.Tech CSE at SRM University AP, 2nd year");
    expect(first.draft.education).toEqual([]);
    expect(first.topic).toBe("education");
    expect(first.reply).toContain("graduation year");
    expect(first.partialEducation).toMatchObject({ school: "SRM University AP", degree: "Bachelor's", field: "Computer Science" });

    gemini.next = { updates: {}, reply: "Thanks!", nextTopic: "links" };
    const second = await intakeTurn(user, { draft: first.draft, asked: first.asked, history: [{ role: "assistant", text: first.reply }], message: "2029", partialEducation: first.partialEducation });
    expect(second.draft.education).toHaveLength(1);
    expect(second.draft.education[0]).toMatchObject({ school: "SRM University AP", degree: "Bachelor's", field: "Computer Science", year: 2029 });
    expect(second.saved).toEqual(["Education"]);
    expect(second.partialEducation).toBeNull();
  });
});
