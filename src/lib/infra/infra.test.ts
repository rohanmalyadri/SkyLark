import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AppError, errorResponse, toActionError } from "./errors";
import { readJsonBody } from "./request";

const jsonRequest = (body: string, headers: Record<string, string> = { "content-type": "application/json" }) =>
  new Request("http://localhost/api/v1/applications", { method: "POST", body, headers });

describe("errorResponse", () => {
  afterEach(() => vi.restoreAllMocks());

  it("turns a validation failure into field messages without echoing the input", async () => {
    const parsed = z.object({ jobId: z.string().min(1, "Send the jobId") }).safeParse({ jobId: "" });
    const res = errorResponse(parsed.error, "test");
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("validation");
    expect(body.error.fieldErrors).toEqual({ jobId: ["Send the jobId"] });
    expect(JSON.stringify(body)).not.toContain("issues");
  });

  it("hides unexpected errors behind a reference code that is also logged", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = errorResponse(new Error("relation \"users\" does not exist"), "test");
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.message).not.toContain("relation");
    expect(body.error.ref).toMatch(/^[0-9A-F]{8}$/);
    expect(log.mock.calls[0]?.[0]).toContain(body.error.ref);
  });

  it("tells a rate-limited client when to come back", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = errorResponse(new AppError("rate_limited", "Slow down"), "test");
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
  });
});

describe("toActionError", () => {
  it("gives the person a reference code for unexpected failures", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = toActionError(new TypeError("cannot read properties of undefined"), "test");
    expect(r.code).toBe("internal");
    expect(r.error).toMatch(/send us this code: [0-9A-F]{8}\.$/);
    expect(r.error).not.toContain("undefined");
  });
});

describe("readJsonBody", () => {
  it("parses a JSON body", async () => {
    await expect(readJsonBody(jsonRequest('{"jobId":"abc"}'))).resolves.toEqual({ jobId: "abc" });
  });

  it("rejects a body that isn't JSON", async () => {
    await expect(readJsonBody(jsonRequest("jobId=abc", { "content-type": "application/x-www-form-urlencoded" }))).rejects.toThrow(/as JSON/);
    await expect(readJsonBody(jsonRequest("{nope"))).rejects.toThrow(/isn't valid JSON/);
    await expect(readJsonBody(jsonRequest("  "))).rejects.toThrow(/empty/);
  });

  it("rejects an oversized body", async () => {
    await expect(readJsonBody(jsonRequest(JSON.stringify({ x: "a".repeat(5_000) })), 4_096)).rejects.toThrow(/too large/);
  });
});
