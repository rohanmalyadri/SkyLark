import { describe, expect, it } from "vitest";
import { SITE_URL, siteUrl } from "./site";

describe("siteUrl", () => {
  it("uses the public domain in production, even when the old Vercel URL is configured", () => {
    expect(siteUrl("https://skylark-ten-mu.vercel.app", true)).toBe(SITE_URL);
    expect(siteUrl("https://skylarkgo.in/", true)).toBe(SITE_URL);
    expect(siteUrl(undefined, true)).toBe(SITE_URL);
  });
  it("keeps a local or custom URL", () => {
    expect(siteUrl("http://localhost:3000", false)).toBe("http://localhost:3000");
    expect(siteUrl(undefined, false)).toBe("http://localhost:3000");
    expect(siteUrl("https://staging.example.org/", true)).toBe("https://staging.example.org");
  });
});
