import type { NextRequest } from "next/server";
import { requestIp } from "@/lib/auth/dal";
import { errorResponse } from "@/lib/infra/errors";
import { rateLimit } from "@/lib/infra/rate-limit";
import { suggestOccupations } from "@/lib/skills/verify";

/** GET /api/roles/suggest?q=data — occupation titles from ESCO. */
export async function GET(req: NextRequest) {
  try {
    await rateLimit("lookup", (await requestIp()) ?? "unknown");
    const result = await suggestOccupations(req.nextUrl.searchParams.get("q") ?? "");
    return Response.json(result, { headers: { "cache-control": "private, max-age=300" } });
  } catch (err) {
    return errorResponse(err, "roles.suggest");
  }
}
