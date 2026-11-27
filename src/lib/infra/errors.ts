import { randomBytes } from "node:crypto";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { logger } from "./logger";

export type ErrorCode = "unauthorized" | "forbidden" | "not_found" | "validation" | "conflict" | "rate_limited" | "plan_limit" | "internal";

const STATUS: Record<ErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  validation: 422,
  conflict: 409,
  rate_limited: 429,
  plan_limit: 402,
  internal: 500,
};

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
  get status() {
    return STATUS[this.code];
  }
}

/** Validation failure tied to specific form fields, e.g. { "skills.2.name": ["Not a recognised skill"] }. */
export function fieldErrors(errors: Record<string, string | string[]>, message = "Please fix the highlighted fields.") {
  const normalized = Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, Array.isArray(v) ? v : [v]]));
  return new AppError("validation", message, { fieldErrors: normalized });
}

export const notFound = (what: string) => new AppError("not_found", `${what} not found`);
export const forbidden = (msg = "You don't have access to this resource") => new AppError("forbidden", msg);

/** Result shape every Server Action returns, so the client can render success and failure states uniformly. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; code: ErrorCode; fieldErrors?: Record<string, string[]>; reason?: string };

/** Turns Zod issues into { "field.path": ["message"] } so every caller shows the same clean shape. */
export function zodFieldErrors(err: z.ZodError) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

/**
 * A short code shown to the person next to "something went wrong" and written to the log with the
 * real error, so a support message can be matched to the exact failure without exposing its details.
 */
export const errorReference = () => randomBytes(4).toString("hex").toUpperCase();

export function toActionError(err: unknown, context: string): Extract<ActionResult, { ok: false }> {
  if (err instanceof AppError) {
    const fieldErrors = err.details?.fieldErrors as Record<string, string[]> | undefined;
    // A machine-readable reason lets the browser react (e.g. open the email verification popup).
    const reason = typeof err.details?.reason === "string" ? err.details.reason : undefined;
    return { ok: false, error: err.message, code: err.code, ...(fieldErrors ? { fieldErrors } : {}), ...(reason ? { reason } : {}) };
  }
  if (err instanceof z.ZodError) {
    return { ok: false, error: "Please fix the highlighted fields.", code: "validation", fieldErrors: zodFieldErrors(err) };
  }
  // Next.js uses thrown errors for redirect()/notFound(); never swallow them.
  unstable_rethrow(err);
  const ref = errorReference();
  logger.error("action.failed", { context, ref, error: err });
  return { ok: false, error: `Something went wrong on our side. Please try again. If it keeps happening, send us this code: ${ref}.`, code: "internal" };
}

export function errorResponse(err: unknown, context: string) {
  unstable_rethrow(err);
  const noStore: Record<string, string> = { "cache-control": "no-store" };
  if (err instanceof AppError) {
    if (err.code !== "not_found") logger.warn("route.rejected", { context, code: err.code });
    const retryAfter: Record<string, string> = err.code === "rate_limited" ? { "retry-after": "60" } : {};
    return Response.json(
      { error: { code: err.code, message: err.message, ...(err.details?.fieldErrors ? { fieldErrors: err.details.fieldErrors } : {}) } },
      { status: err.status, headers: { ...noStore, ...retryAfter } },
    );
  }
  if (err instanceof z.ZodError) {
    // Field names and messages only: raw Zod issues echo the submitted values back.
    return Response.json({ error: { code: "validation", message: "Please check the request and try again.", fieldErrors: zodFieldErrors(err) } }, { status: 422, headers: noStore });
  }
  const ref = errorReference();
  logger.error("route.failed", { context, ref, error: err });
  return Response.json({ error: { code: "internal", message: "Something went wrong on our side. Please try again.", ref } }, { status: 500, headers: noStore });
}
