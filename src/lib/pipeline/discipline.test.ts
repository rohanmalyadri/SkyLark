import { describe, expect, it } from "vitest";
import { jobDiscipline, OTHER_DISCIPLINE } from "./discipline";

describe("jobDiscipline", () => {
  it.each([
    ["Senior Full Stack Engineer (F# / ASP.NET Core / ReactJS)", "Software Engineering"],
    ["Java Entwickler / Product Engineer", "Software Engineering"],
    ["Senior Data Scientist - Research EU/UK (m/f/x)", "Data & AI"],
    ["DevOps Engineer (m/w/d) – Cloud & AI Infrastructure", "IT & Infrastructure"],
    ["Senior DevSecOps Engineer (m/w/d)", "Security"],
    ["Senior Product Manager (Enterprise)", "Product"],
    ["Product Designer, AI Models", "Design"],
    ["Contract Talent Acquisition Sourcer, Sales (APJ)", "People & HR"],
    ["Commercial Account Executive - Australia", "Sales & Business Development"],
    ["Technischer Vertrieb Klimatechnik (m/w/d)", "Sales & Business Development"],
    ["Mitarbeiter im Kundenservice m/w/d Homeoffice Teilzeit", "Customer Success & Support"],
    ["Controller (m/w/d) - Dresden", "Finance"],
    ["Senior Data Scientist, Personalization", "Data & AI"],
    ["Senior Recruiter / Personalberater Recruiting (w|m|d)", "People & HR"],
    ["Bauingenieur (Tiefbau, Kanalbau, Straßenbau) (m/w/d)", "Industrial Engineering"],
  ])("%s → %s", (title, expected) => {
    expect(jobDiscipline({ title })).toBe(expected);
  });

  it("falls back to the source department, then to Other", () => {
    expect(jobDiscipline({ title: "Team Lead", department: "Engineering - Platform" })).toBe("Software Engineering");
    expect(jobDiscipline({ title: "Stagiair", department: "" })).toBe(OTHER_DISCIPLINE);
  });
});
