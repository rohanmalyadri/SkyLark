import type { NextRequest } from "next/server";
import { listCities, listRegions } from "@/lib/geo";

/** GET /api/geo/countries/IN/cities?region=Karnataka — cities for a country, narrowed by state/region. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/geo/countries/[code]/cities">) {
  const { code } = await ctx.params;
  if (!/^[A-Za-z]{2}$/.test(code)) return Response.json({ error: { code: "validation", message: "Use a 2-letter country code" } }, { status: 422 });
  const region = req.nextUrl.searchParams.get("region")?.slice(0, 80) || undefined;
  const regions = listRegions(code);
  if (!regions) return Response.json({ error: { code: "not_found", message: "Unknown country" } }, { status: 404 });
  // Large countries list tens of thousands of places: a region is required where the country has them.
  if (!region && regions.length > 0) return Response.json({ error: { code: "validation", message: "Choose a state or region first" } }, { status: 422 });
  const cities = listCities(code, region);
  if (!cities) return Response.json({ error: { code: "not_found", message: "Unknown state or region" } }, { status: 404 });
  return Response.json(cities.map((name) => ({ code: name, name })), { headers: { "cache-control": "public, max-age=86400, stale-while-revalidate=604800" } });
}
