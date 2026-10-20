import { NextResponse, type NextRequest } from "next/server";
import { authorize, isStaff } from "@/lib/auth/dal";
import { systemRepo, userRepo } from "@/lib/data";
import { errorResponse, notFound } from "@/lib/infra/errors";
import { rateLimit } from "@/lib/infra/rate-limit";
import { readDocument } from "@/lib/storage";
import { audit } from "@/lib/services/audit";

/**
 * Owner download, plus staff access for profile verification (?owner=<candidate id>).
 * Supabase: redirect to a 60-second signed URL. Demo: stream from memory.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/resumes/[id]">) {
  try {
    const user = await authorize();
    await rateLimit("api", user.id);
    const { id } = await ctx.params;
    const owner = req.nextUrl.searchParams.get("owner");
    const staffAccess = !!owner && owner !== user.id && isStaff(user);
    const resume = staffAccess ? await systemRepo().getResume(owner, id) : await (await userRepo()).getResume(user.id, id);
    if (!resume) throw notFound("Resume");

    const doc = await readDocument(resume.storagePath);
    if (!doc) {
      return new NextResponse("This file isn't available — seeded demo resumes have no stored file. Upload your own to download it.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
    }
    await audit(user, staffAccess ? "resume.downloaded_by_staff" : "resume.downloaded", "resume", id, staffAccess ? { owner } : {});
    if ("url" in doc) return NextResponse.redirect(doc.url);
    return new NextResponse(Buffer.from(doc.bytes), {
      headers: {
        "content-type": doc.mime,
        "content-disposition": `attachment; filename="${resume.fileName.replace(/"/g, "")}"`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (err) {
    return errorResponse(err, "resume.download");
  }
}
