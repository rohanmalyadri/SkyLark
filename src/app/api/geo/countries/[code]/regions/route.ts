import type { NextRequest } from "next/server";
import { listRegions } from "@/lib/geo";

/** GET /api/geo/countries/IN/regions — states, provinces or regions for a country. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/geo/countries/[code]/regions">) {
  const { code } = await ctx.params;
  if (!/^[A-Za-z]{2}$/.test(code)) return Response.json({ error: { code: "validation", message: "Use a 2-letter country code" } }, { status: 422 });
  const regions = listRegions(code);
  if (!regions) return Response.json({ error: { code: "not_found", message: "Unknown country" } }, { status: 404 });
  return Response.json(regions, { headers: { "cache-control": "public, max-age=86400, stale-while-revalidate=604800" } });
}
