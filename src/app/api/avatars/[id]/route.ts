import type { NextRequest } from "next/server";
import { authorize } from "@/lib/auth/dal";
import { errorResponse, notFound } from "@/lib/infra/errors";
import { readAvatar } from "@/lib/storage";

/** Demo-mode photo storage. Signed-in users only; in Supabase mode photos come from the public avatars bucket. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/avatars/[id]">) {
  try {
    await authorize();
    const { id } = await ctx.params;
    const blob = readAvatar(id);
    if (!blob) throw notFound("Photo");
    return new Response(Buffer.from(blob.bytes), {
      headers: { "content-type": blob.mime, "cache-control": "private, max-age=31536000, immutable", "x-content-type-options": "nosniff" },
    });
  } catch (err) {
    return errorResponse(err, "avatar.read");
  }
}
