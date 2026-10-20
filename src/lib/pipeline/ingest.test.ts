import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractSkills, htmlToText, normalizePosting, parseLocation, splitSections, type RawPosting } from "./normalize";
import { requiredDegree } from "./normalize-degree";

const ESCAPED_HTML =
  "&lt;p&gt;We build rockets.&lt;/p&gt;&lt;h3&gt;Your tasks&lt;/h3&gt;&lt;ul&gt;&lt;li&gt;Design TypeScript services&lt;/li&gt;&lt;li&gt;Run Kubernetes clusters&lt;/li&gt;&lt;/ul&gt;&lt;h3&gt;Your profile&lt;/h3&gt;&lt;ul&gt;&lt;li&gt;5+ years with Python and PostgreSQL&lt;/li&gt;&lt;li&gt;Bachelor&#39;s degree in Computer Science&lt;/li&gt;&lt;/ul&gt;&lt;h3&gt;Nice to have&lt;/h3&gt;&lt;ul&gt;&lt;li&gt;Experience with Kafka&lt;/li&gt;&lt;/ul&gt;";

const posting = (patch: Partial<RawPosting> = {}): RawPosting => ({
  source: "arbeitnow",
  externalId: "rocket-engineer-1",
  url: "https://www.arbeitnow.com/jobs/companies/acme/rocket-engineer-1",
  company: { name: "Acme Rockets" },
  title: "Senior Platform Engineer (m/w/d)",
  location: "Munich",
  description: ESCAPED_HTML,
  postedAt: new Date().toISOString(),
  countryHints: ["DE", "GB", "FR"],
  ...patch,
});

describe("job text normalization", () => {
  it("unescapes and flattens board HTML into sections", () => {
    const text = htmlToText(ESCAPED_HTML);
    expect(text).not.toMatch(/&lt;|<p>/);
    const s = splitSections(text);
    expect(s.intro).toEqual(["We build rockets."]);
    expect(s.responsibilities).toEqual(["Design TypeScript services", "Run Kubernetes clusters"]);
    expect(s.requirements[0]).toMatch(/Python and PostgreSQL/);
    expect(s.nice).toEqual(["Experience with Kafka"]);
  });

  it("resolves bare city names using the board's markets", () => {
    expect(parseLocation("Munich", { countryHints: ["DE", "GB"] }).places).toEqual([{ city: "Munich", country: "DE" }]);
    expect(parseLocation("London", { countryHints: ["DE", "GB"] }).places).toEqual([{ city: "London", country: "GB" }]);
    expect(parseLocation("Netherlands").places).toEqual([{ city: "", country: "NL" }]);
    expect(parseLocation("The Hague - hybrid", { countryHints: ["NL"] })).toMatchObject({ workMode: "hybrid", places: [{ city: "The Hague", country: "NL" }] });
    expect(parseLocation("Remote, worldwide", { remote: true })).toMatchObject({ workMode: "remote", global: true, remoteCountries: [] });
  });

  it("doesn't mistake ordinary words for skills", () => {
    expect(extractSkills("Go to market with us and express yourself in a swift, agile team")).not.toEqual(expect.arrayContaining(["Go", "Express", "Swift"]));
    expect(extractSkills("Backend services in Golang, Node.js and React")).toEqual(expect.arrayContaining(["Go", "Node.js", "React"]));
  });

  it("normalizes a real-shaped posting without inventing fields", () => {
    const job = normalizePosting(posting(), "company-1", new Date().toISOString())!;
    expect(job.title).toBe("Senior Platform Engineer");
    expect(job.seniority).toBe("senior");
    expect(job.locations).toEqual([{ city: "Munich", country: "DE" }]);
    expect(job.requiredSkills).toEqual(expect.arrayContaining(["Python", "PostgreSQL"]));
    expect(job.niceToHaveSkills).toEqual(["Kafka"]);
    expect(job.minYears).toBe(5);
    expect(job.salary).toBeNull();
    expect(job.visaSponsorship).toBe("unknown");
    expect(job.requirements.some((r) => /Production experience with/.test(r))).toBe(false);
    expect(requiredDegree(job)).toBe("bachelor");
  });

  it("drops postings it can't place or that are malformed", () => {
    const now = new Date().toISOString();
    expect(normalizePosting(posting({ location: "" }), "c", now)).toBeNull();
    expect(normalizePosting(posting({ location: "Remote", remote: true }), "c", now)).toBeNull();
    expect(normalizePosting(posting({ postedAt: "not a date" }), "c", now)).toBeNull();
    expect(normalizePosting(posting({ url: "javascript:alert(1)" }), "c", now)).toBeNull();
  });
});

/* ---------- Ingestion against the in-memory store with a mocked Arbeitnow API ---------- */

const page = (items: { slug: string; title: string; location?: string; created?: number }[], next: string | null = null) => ({
  data: items.map((i) => ({
    slug: i.slug,
    company_name: "Acme Rockets",
    title: i.title,
    description: ESCAPED_HTML,
    remote: false,
    url: `https://www.arbeitnow.com/jobs/companies/acme/${i.slug}`,
    tags: [],
    job_types: [],
    location: i.location ?? "Berlin",
    created_at: i.created ?? Math.floor(Date.now() / 1000) - 3600,
  })),
  links: { next },
});

describe("ingestion pipeline", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.resetModules();
    delete (globalThis as { __autoapplyStore?: unknown }).__autoapplyStore;
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  const respond = (body: unknown) => fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));

  it("inserts, de-duplicates and expires listings", async () => {
    const { runIngestion } = await import("./ingest");
    const { systemRepo } = await import("@/lib/data");
    const repo = systemRepo();

    respond(page([
      { slug: "a", title: "Data Engineer" },
      { slug: "b", title: "Frontend Engineer (m/f/d)" },
      { slug: "b-dup", title: "Frontend Engineer" },
      { slug: "old", title: "Ancient Role", created: Math.floor(Date.now() / 1000) - 400 * 86400 },
      { slug: "nowhere", title: "Mystery Role", location: "" },
    ]));
    const first = await runIngestion("arbeitnow");
    expect(first).toMatchObject({ fetched: 5, inserted: 2 });
    const live = () => repo.listJobs({ status: "active", limit: 5000 }).then((j) => j.filter((x) => x.source === "arbeitnow"));
    expect((await live()).map((j) => j.title).sort()).toEqual(["Data Engineer", "Frontend Engineer"]);

    // Second run: the frontend role is gone from the board, so it is closed; nothing is duplicated.
    respond(page([{ slug: "a", title: "Data Engineer" }]));
    const second = await runIngestion("arbeitnow");
    expect(second).toMatchObject({ inserted: 0, closed: 1 });
    expect((await live()).map((j) => j.title)).toEqual(["Data Engineer"]);
  });

  it("records a failed run and leaves stored listings alone when the API is down", async () => {
    const { runIngestion } = await import("./ingest");
    const { systemRepo } = await import("@/lib/data");
    const repo = systemRepo();
    respond(page([{ slug: "a", title: "Data Engineer" }]));
    await runIngestion("arbeitnow");

    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response("upstream down", { status: 503 }));
    await expect(runIngestion("arbeitnow")).rejects.toThrow(/503/);
    const runs = await repo.listIngestionRuns(5);
    expect(runs[0]).toMatchObject({ source: "arbeitnow", status: "failed" });
    expect((await repo.listJobs({ status: "active", limit: 5000 })).some((j) => j.title === "Data Engineer")).toBe(true);

    const { catalogStatus } = await import("@/lib/services/catalog");
    const status = await catalogStatus();
    expect(status.live).toBe(true);
  }, 30_000);

  it("reports live data as unavailable when no source has ever succeeded", async () => {
    fetchMock.mockResolvedValue(new Response("nope", { status: 500 }));
    const { runIngestion } = await import("./ingest");
    await expect(runIngestion("arbeitnow")).rejects.toThrow();
    const { catalogStatus } = await import("@/lib/services/catalog");
    const status = await catalogStatus();
    expect(status.live).toBe(false);
    expect(status.problem).toMatch(/couldn't be reached/);
    expect(status.activeSampleJobs).toBeGreaterThan(0);
  }, 30_000);
});

describe("skill extraction precision", () => {
  it("ignores everyday words that double as skill aliases", () => {
    const prose = "Next steps: our security team reviews performance and documentation. Cloud-first culture with great analytics and embedded teams. ML is a plus.";
    expect(extractSkills(prose)).toEqual([]);
    expect(extractSkills("Experience with Next.js, AWS Lambda and Machine Learning")).toEqual(expect.arrayContaining(["Next.js", "AWS", "Machine Learning"]));
  });
});

describe("mixed board markup", () => {
  it("handles raw tags wrapping escaped HTML", () => {
    const t = htmlToText("<h3>About</h3>&lt;p&gt;Team &amp;amp; product&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Go services&lt;/li&gt;&lt;/ul&gt;");
    expect(t).not.toMatch(/<|&lt;|&amp;/);
    expect(t).toContain("• Go services");
  });
});
