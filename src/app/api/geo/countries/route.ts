import { listCountries } from "@/lib/geo";

/** Static reference data: safe to cache at the edge and in the browser. */
export async function GET() {
  return Response.json(listCountries(), { headers: { "cache-control": "public, max-age=86400, stale-while-revalidate=604800" } });
}
