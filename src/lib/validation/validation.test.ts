import { describe, expect, it } from "vitest";
import { ProfileSchema, SignUpSchema, VerificationDecisionSchema } from "@/lib/domain/schemas";
import { checkGithub, checkLinkedin, checkPortfolio } from "./links";
import { implausibleTokens, nameProblem, textProblem, tidyName } from "./text";

const baseProfile = {
  headline: "Backend Engineer",
  summary: "",
  location: { city: "Bengaluru", region: "Karnataka", country: "IN" },
  citizenship: [],
  workAuthorizations: [{ country: "IN", status: "citizen" }],
  requiresSponsorship: true,
  willingToRelocate: false,
  relocationCountries: [],
  remotePreference: "any",
  preferredRoles: ["Software Engineer"],
  preferredCountries: ["DE"],
  seniority: "mid",
  yearsExperience: 4,
  skills: [{ name: "Python", level: 4, years: 3 }],
  experience: [],
  education: [],
  salaryExpectation: null,
  links: {},
};
const issues = (input: unknown) => {
  const r = ProfileSchema.safeParse(input);
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path.join("."), i.message]));
};

describe("gibberish detection", () => {
  it("rejects keyboard mashing", () => {
    for (const t of ["jhfavd", "asdfgh", "qwerty", "zzzzz", "bcdfgh", "sdfsdf"]) expect(implausibleTokens(t), t).not.toHaveLength(0);
  });

  it("accepts real words, names, places and technical terms", () => {
    for (const t of ["Kubernetes", "PostgreSQL", "Ljubljana", "Bydgoszcz", "Strengths", "Nginx", "Tchaikovsky", "Softwareentwickler", "Hirschfeld", "SRE", "Xiaomi", "Qualtrics", "Fähigkeiten"]) {
      expect(implausibleTokens(t), t).toHaveLength(0);
    }
  });

  it("explains the problem with the offending word", () => {
    expect(textProblem("Senior jhfavd engineer", "Headline")).toMatch(/jhfavd/);
    expect(textProblem("Senior Data Engineer", "Headline")).toBeNull();
    expect(textProblem("12345", "Role")).toMatch(/words/);
  });
});

describe("person names", () => {
  it("accepts names in any script and common punctuation", () => {
    for (const n of ["Rohan Malyadri", "Meda Abhiram", "Xu Li", "O'Neil", "Jean-Luc Picard", "李小龙", "José Álvarez", "Siobhán Ní Bhriain", "Ng"]) expect(nameProblem(n), n).toBeNull();
  });

  it("rejects fabricated or malformed names", () => {
    expect(nameProblem("jhfavd")).not.toBeNull();
    expect(nameProblem("John123")).toMatch(/numbers/);
    expect(nameProblem("Aaa Bbb")).not.toBeNull();
    expect(nameProblem("a")).not.toBeNull();
    expect(nameProblem("Jane -- Doe")).not.toBeNull();
    expect(nameProblem("<script>")).not.toBeNull();
  });

  it("tidies casing only when the whole name is one case", () => {
    expect(tidyName("  rohan   malyadri ")).toBe("Rohan Malyadri");
    expect(tidyName("JEAN-LUC PICARD")).toBe("Jean-Luc Picard");
    expect(tidyName("Ada McLovelace")).toBe("Ada McLovelace");
  });
});

describe("profile links", () => {
  it("normalises GitHub usernames and profile URLs", () => {
    expect(checkGithub("octocat")).toMatchObject({ ok: true, value: "https://github.com/octocat", handle: "octocat" });
    expect(checkGithub("https://github.com/octocat/")).toMatchObject({ ok: true, handle: "octocat" });
    expect(checkGithub("github.com/octocat/hello-world").ok).toBe(false);
    expect(checkGithub("https://gitlab.com/octocat").ok).toBe(false);
    expect(checkGithub("-bad-").ok).toBe(false);
    expect(checkGithub("settings").ok).toBe(false);
  });

  it("accepts only personal LinkedIn profile URLs", () => {
    expect(checkLinkedin("linkedin.com/in/jane-doe")).toMatchObject({ ok: true, value: "https://www.linkedin.com/in/jane-doe" });
    expect(checkLinkedin("https://uk.linkedin.com/in/jane-doe").ok).toBe(true);
    expect(checkLinkedin("https://www.linkedin.com/company/acme").ok).toBe(false);
    expect(checkLinkedin("https://linkedin.evil.com/in/x").ok).toBe(false);
  });

  it("requires public websites for portfolios", () => {
    expect(checkPortfolio("rohanmalyadri.in")).toMatchObject({ ok: true, value: "https://rohanmalyadri.in" });
    expect(checkPortfolio("http://localhost:3000").ok).toBe(false);
    expect(checkPortfolio("http://192.168.1.1").ok).toBe(false);
    expect(checkPortfolio("javascript:alert(1)").ok).toBe(false);
  });
});

describe("sign-up schema", () => {
  it("validates and tidies input", () => {
    const r = SignUpSchema.parse({ fullName: "rohan malyadri", email: "Rohan@Example.org", password: "correct horse 42" });
    expect(r).toMatchObject({ fullName: "Rohan Malyadri", email: "rohan@example.org" });
  });

  it("rejects gibberish names, bad emails and weak passwords", () => {
    const r = SignUpSchema.safeParse({ fullName: "jhfavd", email: "not-an-email", password: "short" });
    expect(r.success).toBe(false);
    const paths = r.success ? [] : r.error.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["fullName", "email", "password"]));
  });

  it("rejects passwords that contain the email address", () => {
    const r = SignUpSchema.safeParse({ fullName: "Jane Doe", email: "janedoe@example.org", password: "janedoe12345" });
    expect(r.success).toBe(false);
  });
});

describe("profile schema", () => {
  it("accepts a valid profile", () => {
    expect(issues(baseProfile)).toEqual({});
  });

  it("rejects gibberish headlines and roles", () => {
    const e = issues({ ...baseProfile, headline: "jhfavd", preferredRoles: ["asdfgh"] });
    expect(e.headline).toBeDefined();
    expect(e["preferredRoles.0"]).toBeDefined();
  });

  it("checks experience dates", () => {
    const future = `${new Date().getFullYear() + 1}-01`;
    const e = issues({
      ...baseProfile,
      experience: [
        { id: "a", company: "Acme", title: "Engineer", startDate: future, endDate: null, description: "", highlights: [], skills: [] },
        { id: "b", company: "Acme", title: "Engineer", startDate: "2022-05", endDate: "2021-01", description: "", highlights: [], skills: [] },
      ],
    });
    expect(e["experience.0.startDate"]).toMatch(/future/);
    expect(e["experience.1.endDate"]).toMatch(/after the start/);
  });

  it("validates education fields", () => {
    const e = issues({ ...baseProfile, education: [{ id: "e", school: "qwerty", degree: "Wizard", field: "Computer Science", year: 1900 }] });
    expect(e["education.0.school"]).toBeDefined();
    expect(e["education.0.degree"]).toBeDefined();
    expect(e["education.0.year"]).toBeDefined();
  });

  it("normalises valid links and rejects invalid ones", () => {
    const ok = ProfileSchema.parse({ ...baseProfile, links: { github: "github.com/octocat", linkedin: "linkedin.com/in/jane-doe" } });
    expect(ok.links).toEqual({ github: "https://github.com/octocat", linkedin: "https://www.linkedin.com/in/jane-doe", portfolio: undefined });
    expect(issues({ ...baseProfile, links: { linkedin: "https://linkedin.com/company/x" } })["links.linkedin"]).toBeDefined();
  });

  it("rejects duplicate skills", () => {
    const e = issues({ ...baseProfile, skills: [{ name: "Python", level: 4, years: 3 }, { name: "python", level: 2, years: 1 }] });
    expect(e["skills.1.name"]).toMatch(/twice/);
  });
});

describe("verification decisions", () => {
  it("requires a note for rejections and change requests", () => {
    expect(VerificationDecisionSchema.safeParse({ decision: "approved", note: "" }).success).toBe(true);
    expect(VerificationDecisionSchema.safeParse({ decision: "rejected", note: "" }).success).toBe(false);
    expect(VerificationDecisionSchema.safeParse({ decision: "changes_requested", note: "Please fix your GitHub link." }).success).toBe(true);
  });
});
