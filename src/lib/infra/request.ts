import "server-only";
import { AppError } from "./errors";

/**
 * Reads a JSON request body defensively: it must say it is JSON, stay under `maxBytes`, and parse.
 * Each failure becomes a plain-language 4xx instead of a stack trace or a confusing "Required".
 */
export async function readJsonBody(req: Request, maxBytes = 16_384): Promise<unknown> {
  const type = req.headers.get("content-type") ?? "";
  if (!/^application\/json\b/i.test(type)) throw new AppError("validation", "Send the request body as JSON (Content-Type: application/json).");
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new AppError("validation", `The request body is too large (limit ${Math.round(maxBytes / 1024)} KB).`);
  const text = await req.text();
  if (Buffer.byteLength(text) > maxBytes) throw new AppError("validation", `The request body is too large (limit ${Math.round(maxBytes / 1024)} KB).`);
  if (!text.trim()) throw new AppError("validation", "The request body is empty.");
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError("validation", "The request body isn't valid JSON.");
  }
}
