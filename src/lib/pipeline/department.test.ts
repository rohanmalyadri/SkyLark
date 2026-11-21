import { describe, expect, it } from "vitest";
import { departmentOf, inferDepartment } from "./department";

describe("inferDepartment", () => {
  it.each([
    ["Senior Software Engineer (m/w/d)", "Engineering"],
    ["Softwareentwickler Java (m/w/d)", "Engineering"],
    ["Senior Data Scientist", "Data"],
    ["DevOps Engineer", "Infrastructure"],
    ["Product Owner E-Commerce", "Product"],
    ["UX/UI Designer", "Design"],
    ["Key Account Manager Vertrieb", "Sales"],
    ["Buchhalter (m/w/d)", "Finance"],
    ["Pflegefachkraft", "Healthcare"],
    ["Airport Operations Lead", "Operations"],
  ])("%s → %s", (title, dept) => expect(inferDepartment(title)).toBe(dept));

  it("falls back to skills, then to Other", () => {
    expect(inferDepartment("Associate", ["SQL", "Python", "Tableau"])).toBe("Data");
    expect(inferDepartment("Associate")).toBe("Other");
  });

  it("keeps a department the source sent", () => {
    expect(departmentOf({ department: "Research", title: "Software Engineer" })).toBe("Research");
    expect(departmentOf({ department: "", title: "Software Engineer" })).toBe("Engineering");
  });
});
