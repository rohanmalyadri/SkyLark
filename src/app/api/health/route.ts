import { connection } from "next/server";
import { systemRepo } from "@/lib/data";

/** Unauthenticated liveness/readiness probe for uptime checks. Says up or down and nothing else; details live on the admin health page. */
export async function GET() {
  await connection();
  try {
    await systemRepo().listPlans();
    return Response.json({ status: "ok" }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ status: "degraded" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
