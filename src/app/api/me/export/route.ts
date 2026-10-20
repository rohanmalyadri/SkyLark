import { authorize } from "@/lib/auth/dal";
import { errorResponse } from "@/lib/infra/errors";
import { exportMyData } from "@/lib/services/privacy";

/** GET /api/me/export — the signed-in person's data as a JSON download. */
export async function GET() {
  try {
    const user = await authorize();
    const data = await exportMyData(user);
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="skylark-data-${new Date().toISOString().slice(0, 10)}.json"`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (err) {
    return errorResponse(err, "privacy.export");
  }
}
