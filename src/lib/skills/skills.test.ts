import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lookupLocal, searchLocal, skillKey } from "./catalog";

describe("skill catalog", () => {
  it("resolves aliases and Stack Overflow tags to canonical names", () => {
    expect(lookupLocal("reactjs")?.name).toBe("React");
    expect(lookupLocal("node js")?.name).toBe("Node.js");
    expect(lookupLocal("Postgres")?.name).toBe("PostgreSQL");
    expect(lookupLocal("golang")?.name).toBe("Go");
    expect(lookupLocal("stakeholder management")?.name).toBe("Stakeholder management");
    expect(lookupLocal("apache-poi")?.source).toBe("stackoverflow");
    expect(lookupLocal("jhfavd")).toBeNull();
  });

  it("ranks prefix matches first", () => {
    const names = searchLocal("post").map((t) => t.name);
    expect(names[0]).toBe("PostgreSQL");
    expect(searchLocal("figm").map((t) => t.name)).toContain("Figma");
  });

  it("folds case, accents and separators", () => {
    expect(skillKey("Node JS")).toBe(skillKey("nodejs"));
    expect(skillKey("Tailwind-CSS")).toBe(skillKey("tailwind css"));
  });
});

describe("live skill verification", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));

  it("accepts curated skills without any network call", async () => {
    const { verifySkill } = await import("./verify");
    expect(await verifySkill("typescript")).toMatchObject({ ok: true, term: { name: "TypeScript" } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects gibberish without calling external APIs", async () => {
    const { verifySkill } = await import("./verify");
    expect(await verifySkill("jhfavd")).toMatchObject({ ok: false, reason: "implausible" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts a long-tail skill confirmed by Stack Overflow", async () => {
    fetchMock.mockImplementation((url: string) => (url.includes("stackexchange") ? json({ items: [{ name: "quarkus", count: 5000 }] }) : json({ _embedded: { results: [] } })));
    const { verifySkill } = await import("./verify");
    expect(await verifySkill("Quarkus")).toMatchObject({ ok: true, term: { source: "stackoverflow", ref: "quarkus" } });
  });

  it("accepts a professional skill confirmed by ESCO", async () => {
    fetchMock.mockImplementation((url: string) => (url.includes("stackexchange") ? json({ items: [] }) : json({ _embedded: { results: [{ title: "conduct financial audits", uri: "http://data.europa.eu/esco/skill/x" }] } })));
    const { verifySkill } = await import("./verify");
    expect(await verifySkill("Conduct financial audits")).toMatchObject({ ok: true, term: { source: "esco" } });
  });

  it("rejects words no vocabulary recognises", async () => {
    fetchMock.mockImplementation((url: string) => (url.includes("stackexchange") ? json({ items: [] }) : json({ _embedded: { results: [] } })));
    const { verifySkill } = await import("./verify");
    expect(await verifySkill("Banana juggling")).toMatchObject({ ok: false, reason: "unrecognised" });
  });

  it("fails closed when every vocabulary is unreachable", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const { verifySkill } = await import("./verify");
    expect(await verifySkill("Quarkus")).toMatchObject({ ok: false, reason: "unavailable" });
  });

  it("reports degraded suggestions instead of failing", async () => {
    fetchMock.mockImplementation((url: string) => (url.includes("stackexchange") ? json({ error: "throttled" }, 429) : json({ _embedded: { results: [{ title: "accounting", uri: "u" }] } })));
    const { suggestSkills } = await import("./verify");
    const res = await suggestSkills("accoun");
    expect(res.degraded).toEqual(["stackexchange"]);
    expect(res.terms.map((t) => t.name)).toContain("Accounting");
  });
});
