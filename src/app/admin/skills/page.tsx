import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SkillRequestControls } from "@/components/admin/verification-controls";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/panel";
import { PageSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { requireStaff } from "@/lib/auth/dal";
import { skillRequestQueue } from "@/lib/services/skills";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Skill requests" };

export default function SkillRequestsPage() {
  return (
    <>
      <PageHeader eyebrow="Operations" title="Skill requests" description="Skills candidates use that no recognised vocabulary lists. Approving one adds it to the shared skill list for everyone." />
      <Suspense fallback={<PageSkeleton rows={4} />}>
        <Queue />
      </Suspense>
    </>
  );
}

async function Queue() {
  await requireStaff();
  const rows = await skillRequestQueue();
  const pending = rows.filter((r) => r.status === "pending");
  const decided = rows.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6">
      <Panel>
        <PanelHeader title="Awaiting review" description={`${pending.length} pending · oldest first`} />
        {pending.length === 0 ? (
          <EmptyState icon={<Sparkles />} title="Nothing to review" description="New requests appear here when a candidate asks for a skill that isn't in the vocabulary." />
        ) : (
          <ul className="divide-y divide-line">
            {pending.map((r) => (
              <li key={r.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_420px]">
                <div className="min-w-0">
                  <p className="text-[15px] font-medium">{r.name}</p>
                  <p className="mt-0.5 text-xs text-subtle">
                    Requested by{" "}
                    <Link href={`/admin/candidates/${r.userId}`} className="text-muted hover:underline">
                      {r.requesterName}
                    </Link>{" "}
                    · {timeAgo(r.createdAt)}
                  </p>
                  {r.context && <p className="mt-2 text-[13px] text-muted">“{r.context}”</p>}
                  <p className="mt-2 text-xs text-subtle">
                    Check it&apos;s a real, specific skill (a tool, method or domain), not a typo, a job title or a duplicate of an existing skill.
                  </p>
                </div>
                <SkillRequestControls id={r.id} />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {decided.length > 0 && (
        <Panel>
          <PanelHeader title="Decided" />
          <ul className="divide-y divide-line">
            {decided.slice(0, 50).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-[13px]">
                <span className="font-medium">{r.name}</span>
                <Badge tone={r.status === "approved" ? "success" : "danger"}>{r.status === "approved" ? "Approved" : "Rejected"}</Badge>
                <span className="text-xs text-subtle">
                  {r.requesterName} · decided {r.reviewedAt ? timeAgo(r.reviewedAt) : ""}
                  {r.reviewerName ? ` by ${r.reviewerName}` : ""}
                </span>
                {r.note && <span className="w-full text-xs text-muted">{r.note}</span>}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
