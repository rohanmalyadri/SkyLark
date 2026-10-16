import { AlertTriangle, ChevronRight, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SearchBox } from "@/components/admin/admin-controls";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { PageHeader, Panel } from "@/components/ui/panel";
import { ScoreBar } from "@/components/ui/score";
import { PageSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { requireStaff } from "@/lib/auth/dal";
import { countryName, VERIFICATION_META } from "@/lib/domain/constants";
import { candidates, parseCandidateFilters, type CandidateFilters } from "@/lib/services/admin";
import { cn, formatDate, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Candidates" };

export default function CandidatesPage({ searchParams }: PageProps<"/admin/candidates">) {
  return (
    <>
      <PageHeader eyebrow="Operations" title="Candidates" description="Review queue and directory. Approve, reject or request changes on candidate profiles; flagged details are checked automatically." />
      <Suspense fallback={<PageSkeleton rows={6} />}>
        <List searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const TABS: { key: CandidateFilters["status"]; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Awaiting review" },
  { key: "flagged", label: "Flagged" },
  { key: "changes_requested", label: "Changes requested" },
  { key: "approved", label: "Verified" },
  { key: "rejected", label: "Rejected" },
];

const SORTS: { key: CandidateFilters["sort"]; label: string }[] = [
  { key: "queue", label: "Review queue" },
  { key: "joined", label: "Newest" },
  { key: "name", label: "Name" },
];

function href(f: CandidateFilters, patch: Partial<CandidateFilters>) {
  const next = { ...f, ...patch };
  const sp = new URLSearchParams();
  if (next.q) sp.set("q", next.q);
  if (next.status !== "all") sp.set("status", next.status);
  if (next.sort !== "queue") sp.set("sort", next.sort);
  const s = sp.toString();
  return `/admin/candidates${s ? `?${s}` : ""}`;
}

async function List({ searchParams }: { searchParams: PageProps<"/admin/candidates">["searchParams"] }) {
  await requireStaff();
  const filters = parseCandidateFilters(await searchParams);
  const { rows, counts } = await candidates(filters);

  return (
    <>
      <nav aria-label="Verification status" className="no-scrollbar -mx-1 mb-4 flex gap-1 overflow-x-auto px-1">
        {TABS.map((t) => {
          const active = filters.status === t.key;
          const n = counts[t.key];
          return (
            <Link key={t.key} href={href(filters, { status: t.key })} aria-current={active ? "page" : undefined} className={cn("inline-flex h-8 shrink-0 items-center gap-2 rounded-md border px-3 text-[13px] transition-colors", active ? "border-line-strong bg-surface-3 text-fg" : "border-transparent text-muted hover:text-fg")}>
              {t.key === "flagged" && <AlertTriangle className="size-3.5 text-warning" aria-hidden />}
              {t.label}
              <span className="tabular text-xs text-subtle">{n}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchBox placeholder="Search name, email, skill or city" />
        <div className="flex items-center gap-1 text-[13px]" role="group" aria-label="Sort">
          <span className="mr-1 text-xs text-subtle">Sort</span>
          {SORTS.map((s) => (
            <Link key={s.key} href={href(filters, { sort: s.key })} aria-current={filters.sort === s.key ? "true" : undefined} className={cn("rounded px-2 py-1 transition-colors", filters.sort === s.key ? "bg-surface-3 text-fg" : "text-muted hover:text-fg")}>
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      <Panel>
        {rows.length === 0 ? (
          <EmptyState icon={<Users />} title="No candidates found" description={filters.q ? `Nothing matches “${filters.q}”.` : filters.status !== "all" ? "No candidates are in this state." : "Candidates appear here after they sign up."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-[13px]">
              <caption className="sr-only">Candidates</caption>
              <thead>
                <tr className="border-b border-line text-xs text-subtle">
                  <th scope="col" className="px-5 py-3 font-medium">Candidate</th>
                  <th scope="col" className="px-5 py-3 font-medium">Verification</th>
                  <th scope="col" className="px-5 py-3 font-medium">Flags</th>
                  <th scope="col" className="px-5 py-3 font-medium">Location</th>
                  <th scope="col" className="px-5 py-3 font-medium">Profile</th>
                  <th scope="col" className="px-5 py-3 font-medium">Applications</th>
                  <th scope="col" className="px-5 py-3 font-medium">Submitted</th>
                  <th scope="col" className="w-8 px-3 py-3"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(({ user, profile, verification, warnings, completeness, applications, active }) => {
                  const meta = verification ? VERIFICATION_META[verification.status] : null;
                  return (
                    <tr key={user.id} className="group relative hover:bg-surface-2/40">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={user.fullName} src={user.avatarUrl} />
                          <div className="min-w-0">
                            <Link href={`/admin/candidates/${user.id}`} className="font-medium text-fg after:absolute after:inset-0 hover:underline">
                              {user.fullName}
                            </Link>
                            <p className="truncate text-xs text-subtle">{profile?.headline || user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">{meta ? <Badge tone={meta.tone} dot>{meta.label}</Badge> : <span className="text-subtle">{profile ? "—" : "Not onboarded"}</span>}</td>
                      <td className="px-5 py-3">
                        {warnings > 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-warning">
                            <AlertTriangle className="size-3.5" aria-hidden /> {warnings} {warnings === 1 ? "warning" : "warnings"}
                          </span>
                        ) : verification?.flags.length ? (
                          <span className="text-xs text-subtle">{verification.flags.length} note{verification.flags.length === 1 ? "" : "s"}</span>
                        ) : (
                          <span className="text-subtle">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted">{profile?.location.country ? [profile.location.city, countryName(profile.location.country)].filter(Boolean).join(", ") : "—"}</td>
                      <td className="w-36 px-5 py-3">
                        <div className="flex items-center gap-2">
                          <ScoreBar value={completeness} tone={completeness >= 80 ? "success" : "accent"} className="w-16" />
                          <span className="tabular text-xs text-muted">{completeness}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 tabular">
                        {applications} <span className="text-xs text-subtle">· {active} active</span>
                      </td>
                      <td className="px-5 py-3 text-muted" title={verification ? new Date(verification.submittedAt).toUTCString() : undefined}>
                        {verification ? timeAgo(verification.submittedAt) : formatDate(user.createdAt, { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-3 py-3 text-subtle">
                        <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
