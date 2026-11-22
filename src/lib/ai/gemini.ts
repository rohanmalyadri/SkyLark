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
const FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-flash-lite-latest"];
// The primary model gets a little longer; fallbacks are faster models.
const TIMEOUT_MS = [15_000, 12_000, 10_000];

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
    try {
      const res = await fetch(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-goog-api-key": env.GEMINI_API_KEY },
        body: body(model),
        signal: AbortSignal.timeout(TIMEOUT_MS[Math.min(i, TIMEOUT_MS.length - 1)]!),
        cache: "no-store",
      });
      if (!res.ok) {
        // e.g. a model that doesn't accept this request shape: try the next one.
        const detail = await res.text().catch(() => "");
        lastError = new Error(`gemini ${model} ${res.status}: ${detail.slice(0, 300)}`);
        logger.debug("gemini.retry", { model, status: res.status });
        continue;
      }
      const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]; promptFeedback?: { blockReason?: string } };
      const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (!text) {
        lastError = new Error(`gemini ${model} empty (${json.promptFeedback?.blockReason ?? json.candidates?.[0]?.finishReason ?? "no candidates"})`);
        continue;
      }
      const parsed = JSON.parse(text) as T;
      logger.debug("gemini.ok", { model, ms: Date.now() - started, fallback: i > 0 });
      return parsed;
    } catch (err) {
      lastError = err;
      logger.debug("gemini.retry", { model, error: err });
      // A timeout or malformed JSON on one model is worth one try on the next.
    }
  }
  logger.warn("gemini.failed", { error: lastError });
  throw new AppError("internal", "The assistant is busy right now. Try sending that again in a moment, or switch to the form.");
}
