import type { NextRequest } from "next/server";
import { requestIp } from "@/lib/auth/dal";
import { errorResponse } from "@/lib/infra/errors";
import { rateLimit } from "@/lib/infra/rate-limit";
import { suggestSkills } from "@/lib/skills/verify";

/** GET /api/skills/suggest?q=post — canonical skill names from the curated taxonomy and live vocabularies. */
export async function GET(req: NextRequest) {
  try {
    await rateLimit("lookup", (await requestIp()) ?? "unknown");
    const q = req.nextUrl.searchParams.get("q") ?? "";
    const result = await suggestSkills(q);
    return Response.json(result, { headers: { "cache-control": "private, max-age=300" } });
  } catch (err) {
    return errorResponse(err, "skills.suggest");
  }
}
