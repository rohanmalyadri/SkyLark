import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it.each([
    ["/dashboard", "/dashboard"],
    ["/jobs/abc?tab=fit#score", "/jobs/abc?tab=fit#score"],
    ["/obscuron-nexus-92vX7q/clients", "/obscuron-nexus-92vX7q/clients"],
  ])("keeps same-site path %s", (input, expected) => {
    expect(safeRedirectPath(input, "/fallback")).toBe(expected);
  });

  it.each([
    "//evil.com",
    "/\\evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "/\r\n/evil.com",
    "\t//evil.com",
    "https://evil.com",
    "evil.com",
    "javascript:alert(1)",
    "",
    "/%09/evil.com/".replace("%09", "\t"),
  ])("rejects %j", (input) => {
    expect(safeRedirectPath(input, "/fallback")).toBe("/fallback");
  });

  it("rejects non-strings", () => {
    expect(safeRedirectPath(null, "/f")).toBe("/f");
    expect(safeRedirectPath(undefined, "/f")).toBe("/f");
    expect(safeRedirectPath(42, "/f")).toBe("/f");
  });
});
