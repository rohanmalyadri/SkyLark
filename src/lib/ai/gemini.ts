import "server-only";
import { serverEnv } from "@/lib/env";
import { AppError } from "@/lib/infra/errors";
import { logger } from "@/lib/infra/logger";

/*
 * Minimal Google Gemini client (REST generateContent). Server-only: the key never reaches the
 * browser. Asks for JSON that matches a response schema, and falls back to lighter models when
 * the primary one is overloaded (503) or rate-limited (429).
 */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const FALLBACK_MODELS = ["gemini-flash-lite-latest", "gemini-flash-latest"];
/*
 * A chat reply has to come back in seconds. Each model gets a short try, the whole call has one
 * overall budget, and a fallback isn't started when too little of that budget is left.
 */
const ATTEMPT_MS = [8_000, 5_000, 4_000];
const TOTAL_MS = 14_000;
const MIN_ATTEMPT_MS = 2_500;

/** Gemini 2.5 takes a token budget (0 = no thinking); Gemini 3 and later take a level. */
const thinkingFor = (model: string) => (model.includes("2.5") ? { thinkingBudget: 0 } : { thinkingLevel: "low" });

export interface GeminiTurn {
  role: "user" | "model";
  text: string;
}

/** OpenAPI-subset schema as Gemini's `responseSchema` expects it. */
export type GeminiSchema = Record<string, unknown>;

export async function geminiJson<T>(opts: { system: string; turns: GeminiTurn[]; schema: GeminiSchema; temperature?: number }): Promise<T> {
  const env = serverEnv();
  if (!env.GEMINI_API_KEY) throw new AppError("internal", "The chat assistant isn't configured.");
  const models = [...new Set([env.GEMINI_MODEL, ...FALLBACK_MODELS])];
  const body = (model: string) =>
    JSON.stringify({
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: opts.turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
      generationConfig: {
        temperature: opts.temperature ?? 0.3,
        responseMimeType: "application/json",
        responseSchema: opts.schema,
        maxOutputTokens: 4096,
        thinkingConfig: thinkingFor(model),
      },
    });

  let lastError: unknown = null;
  const started = Date.now();
  for (const [i, model] of models.entries()) {
    const left = TOTAL_MS - (Date.now() - started);
    if (left < MIN_ATTEMPT_MS) break;
    try {
      const res = await fetch(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-goog-api-key": env.GEMINI_API_KEY },
        body: body(model),
        signal: AbortSignal.timeout(Math.min(left, ATTEMPT_MS[Math.min(i, ATTEMPT_MS.length - 1)]!)),
        cache: "no-store",
      });
      if (!res.ok) {
        // e.g. a model that doesn't accept this request shape: try the next one.
        const detail = await res.text().catch(() => "");
        lastError = new Error(`gemini ${model} ${res.status}: ${detail.slice(0, 300)}`);
        logger.info("gemini.retry", { model, status: res.status, ms: Date.now() - started });
        continue;
      }
      const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]; promptFeedback?: { blockReason?: string } };
      const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (!text) {
        lastError = new Error(`gemini ${model} empty (${json.promptFeedback?.blockReason ?? json.candidates?.[0]?.finishReason ?? "no candidates"})`);
        continue;
      }
      const parsed = JSON.parse(text) as T;
      logger.info("gemini.ok", { model, ms: Date.now() - started, fallback: i > 0 });
      return parsed;
    } catch (err) {
      lastError = err;
      logger.info("gemini.retry", { model, ms: Date.now() - started, error: err instanceof Error ? err.name : String(err) });
      // A timeout or malformed JSON on one model is worth one try on the next.
    }
  }
  logger.warn("gemini.failed", { ms: Date.now() - started, error: lastError });
  throw new AppError("internal", "The assistant is busy right now. Try sending that again in a moment, or switch to the form.");
}
